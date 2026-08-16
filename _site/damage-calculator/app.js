const API_ROOT = "https://tibiatools.io/api/v1";
const STORAGE_KEY = "tibiapalDamageBuildV2";
const LEGACY_STORAGE_KEY = "tibiapalDamageBuildV1";
const BUILD_META_KEY = "tibiapalDamageBuildMetaV1";
const METADATA_CACHE_KEY = "tibiapalDamageMetadataCacheV1";
// Vocations/weapons/spells/etc. barely change - refetching all 9 endpoints on every single
// page view was hammering the TibiaTools API for no reason. Cache them for a while instead.
const METADATA_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
// Everyone starts with these base values; wheel/proficiency/stance bonuses are added on top by the perks the calculator sends.
const BASE_CRIT_CHANCE = 10;
const BASE_CRIT_DAMAGE = 50;
const DEFAULT_PALADIN_MAGIC_LEVEL = 35;
const DEFAULT_CASTER_MAGIC_LEVEL = 120;
// Default skill for a fresh build, pre-filled to a value that already includes
// that vocation's pure +skill stance bonus (Blood Rage / Sharpshooter / Virtue of Justice).
const DEFAULT_SKILL_BY_VOCATION = { knight: 160, paladin: 180, monk: 140 };
const META_RESOURCES = ["vocations", "stances", "weapons", "ammo", "shields", "perks", "spells", "creatures", "charms"];
const FANDOM_ICON_ALIASES = { "exec-throw": "executioner-s-throw", "hells-core": "hell-s-core" };

// Elemental attack imbuements (Scorch/Frost/Electrify/Venom/Reap) convert a share of a weapon's
// physical damage into an element, which is what makes them matter against creature resistances.
// Both values are enums the damage API validates, so anything outside these lists is dropped
// rather than sent - an unknown/invalid stats field 400s the whole calculation.
// The API only applies them to physical single-target weapons; a natively elemental weapon
// (e.g. Amber Axe, which is pure ice) ignores the conversion server-side.
const IMBUEMENT_ELEMENTS = ["fire", "ice", "energy", "earth", "death"];
const IMBUEMENT_VALUES = [0.1, 0.25, 0.5]; // Basic / Intricate / Powerful
const DEFAULT_IMBUEMENT_VALUE = 0.5;

// Stances the damage API marks non-selectable ("only selectable stances affect damage"),
// but whose skill/magic-level boost we can apply client-side to the stat we already send.
// These ids are applied locally and are NOT forwarded to the API as stanceIds.
// `multiplier` scales the stance's own stat; `addFromStat`/`addFactor` add a share of a
// different stat on top (e.g. Divine Defiance turning distance fighting into magic level).
const LOCAL_STANCE_MODS = {
  4: { stat: "magicLevel", addFromStat: "skill", addFactor: 0.06, note: "+6% distance as holy magic level" }, // Divine Defiance (paladin)
  10: { stat: "magicLevel", multiplier: 1.10, note: "+10% magic level for ice/earth spells" }, // Elemental Synthesis (druid)
};

// Pure +skill stances (a flat % boost to the same skill the calculator already asks for)
// aren't shown as a toggle at all - the user is expected to type their skill value with
// the bonus already baked in, same as any other passive skill increase.
const PURE_SKILL_STANCE_IDS = new Set([
  1,  // Blood Rage (knight, +30% skill)
  3,  // Sharpshooter (paladin, +32% distance)
  12, // Virtue of Justice (monk, +8% fist fighting)
]);

// Stances the API marks selectable but which are purely defensive and never affect damage output.
const NON_DAMAGE_STANCE_IDS = new Set([
  14, // Virtue of Sustain (monk, healing/defense stance)
]);

// Planner effects that only ever affect healing. They have to be recognised explicitly because
// their wording is one word away from the damage version ("+200% of your Magic Level as extra
// healing for your spells" vs "% magic level as extra damage for spells"), which is close
// enough for mapPlannerEffect's fuzzy name match to treat a Sanguine bow's healing scaling as
// a triple-damage spell perk. The same guard drops the wheel's "Healing Magic Level" row,
// which was otherwise counted as plain "+ magic level".
const HEALING_ONLY_PROFICIENCY_TYPES = new Set([27]); // Combat skill scaling for healing
const HEALING_SPELL_AUGMENT_TYPE = 3; // Type 5 (Spell augmentation) variant "+X% healing for <spell>"

function isHealingOnlyEffect(effect) {
  const type = Number(effect.type);
  if (HEALING_ONLY_PROFICIENCY_TYPES.has(type)) return true;
  if (type === 5 && Number(effect.augmentType) === HEALING_SPELL_AUGMENT_TYPE) return true;
  const text = normalized(effectText(effect));
  return /healing/.test(text) && !/damage/.test(text);
}

// Flat +skill / +magic level bonuses a planner grants unconditionally - the wheel's dedication
// perks and gem basic mods, the weapon proficiency's skill boosts - are deliberately treated as
// dead perks: the calculator asks for the skill straight off the character sheet, which already
// shows those bonuses, so mapping them would count them twice. Same reasoning as
// PURE_SKILL_STANCE_IDS above.
// Two things deliberately stay live: element-scoped magic level (e.g. "+3 holy magic level"),
// which is a hidden per-element stat the character sheet never shows, and the situational
// skill perks (Battle Instinct, Positional Tactics), which only apply while their condition
// holds and so can't be baked into a typed-in skill value - those never reach mapPlannerEffect.
const CHARACTER_SHEET_SKILL_BONUS_TYPES = new Set([
  "axe-fighting", "club-fighting", "sword-fighting", "fist-fighting", "distance-fighting", "magic-level",
]);

function isCharacterSheetSkillPerk(perk) {
  return perk?.valueType === "flat" && perk?.scope === "all" && CHARACTER_SHEET_SKILL_BONUS_TYPES.has(perk.bonusType);
}

// Wheel conviction perks whose live bonus depends on a situational condition. The planner
// reports every one of them as a summary row with an empty value (FormatType
// "NoEffectDisplay"), so they used to sync as an inert "unmapped" chip. Each option names the
// API perks it becomes: `weaponSkill: true` resolves to the equipped weapon's fighting skill,
// otherwise `bonusType` (+ `scope` when the bonus type is shared by several perks) is looked
// up directly. Keyed by the effect name exactly as the planner reports it, lower-cased.
const PLANNER_EFFECT_CHOICES = {
  "positional tactics": {
    options: [
      // Listed first = the default, and for hunting builds a monster is nearly always adjacent.
      // The perk's third part (+3 healing magic level) has no damage effect, so it is ignored.
      { id: "holy", label: "+3 holy magic level (monster within 1 square)", perks: [{ bonusType: "magic-level", scope: "holy", value: 3 }] },
      { id: "distance", label: "+3 distance fighting (no monster adjacent)", perks: [{ bonusType: "distance-fighting", value: 3 }] },
    ],
  },
  // +6 shielding and +1 weapon skill per adjacent creature from the 5th, capped at 8. Only the
  // skill half is modelled - the calculator has no shielding stat to raise. Defaults to "off"
  // so a build that syncs the perk isn't silently credited with a crowd it may not have.
  "battle instinct": {
    options: [
      { id: "off", label: "Under 5 adjacent creatures (no bonus)", perks: [] },
      { id: "5", label: "5 adjacent creatures (+1 weapon skill)", perks: [{ weaponSkill: true, value: 1 }] },
      { id: "6", label: "6 adjacent creatures (+2 weapon skill)", perks: [{ weaponSkill: true, value: 2 }] },
      { id: "7", label: "7 adjacent creatures (+3 weapon skill)", perks: [{ weaponSkill: true, value: 3 }] },
      { id: "8", label: "8 adjacent creatures (+4 weapon skill)", perks: [{ weaponSkill: true, value: 4 }] },
    ],
  },
  // "+35% damage to your next damage spell after a focus spell" - the API models this as the
  // single spellId-valued perk "Focus mastery", so the options are the rotation's own spells.
  "focus mastery": { spellChoice: true },
};

// The focus spell is what triggers the buff, so it is never the spell that receives it -
// it stays out of the Focus Mastery dropdown. Compared punctuation-insensitively (plainName).
const FOCUS_MASTERY_TRIGGER_SPELLS = new Set(["hell s core"]);

// Situational perks whose branch is decided by the build rather than by the user: Ballistic
// Mastery does one thing with a crossbow and another with a bow, and the weapon is already
// synced from the proficiency planner. Resolved on every render, so swapping weapons updates it.
const PLANNER_EFFECT_AUTO = {
  "ballistic mastery": (weapon) => {
    if (weapon?.ammoType === "bolts") {
      return { note: "Crossbow: +10% critical extra damage for auto-attacks", perks: [{ bonusType: "crit-damage", scope: "auto-attack", value: 10 }] };
    }
    if (weapon?.ammoType === "arrows") {
      // "your attacks and spells have +4% physical and holy pierce". The API's "(regular)" and
      // "(weapon)" pierce perks are NOT different scopes - both apply to auto-attacks and to
      // spells of that element, and the API just sums them. Sending both variants therefore
      // credited the build with 8% instead of 4%, so only one variant is sent per element.
      return {
        note: "Bow: +4% physical and holy pierce",
        perks: [
          { bonusType: "physical-pierce-regular", value: 4 },
          { bonusType: "holy-pierce-regular", value: 4 },
        ],
      };
    }
    return { note: "No bow or crossbow equipped", perks: [] };
  },
};

function plannerEffectChoices(effect) {
  return PLANNER_EFFECT_CHOICES[normalized(effect?.name)] ?? null;
}

function plannerEffectAuto(effect) {
  return PLANNER_EFFECT_AUTO[normalized(effect?.name)] ?? null;
}

// Burst/beam spells are returned by the API as one card per tier (No Bonus, Stage 1-3).
// Which tier is live depends on the governing wheel revelation perk, so only that tier is shown.
// Values are the revelation perk's name exactly as the wheel planner reports it - see
// activeSpellStages(), which matches its summary row to read the unlocked stage.
const STAGED_SCOPE_PERK = {
  "exec-throw": "executioner's throw",
  "divine-grenade": "divine grenade",
  "great-energy-beam": "beam mastery",
  "great-death-beam": "beam mastery",
  "energy-beam": "beam mastery",
  "ice-burst": "twin bursts",
  "terra-burst": "twin bursts",
  "spiritual-outburst": "spiritual outburst",
};

const appRoot = document.querySelector("#damageCalculator");
const metadataStatus = document.querySelector("#metadataStatus");
const damageForm = document.querySelector("#damageForm");
const plannerModal = document.querySelector("#plannerModal");
const compareStatus = document.querySelector("#compareStatus");
const resultsLoading = document.querySelector("#resultsLoading");
const resultsContent = document.querySelector("#resultsContent");
const metadata = {};

// Per-vocation common rotations, edited in _data/rotation-presets/<vocation>.json and
// embedded into the page at build time so this can stay a static, no-fetch lookup.
const ROTATION_PRESETS = (() => {
  try { return JSON.parse(document.querySelector("#rotationPresetsData")?.textContent || "{}"); }
  catch { return {}; }
})();

// Average number of targets each spell/rune hits, edited in _data/spell-average-hits.json and
// embedded into the page at build time. Used to pre-populate the "Average targets" field
// whenever a spell is added to the rotation, whether via a preset or manually.
const SPELL_AVERAGE_HITS = (() => {
  try { return JSON.parse(document.querySelector("#spellAverageHitsData")?.textContent || "{}"); }
  catch { return {}; }
})();

const SPELL_AVERAGE_HITS_BY_KEY = Object.fromEntries(
  Object.values(SPELL_AVERAGE_HITS).flatMap((category) => Object.entries(category))
    .map(([name, value]) => [normalized(name), value])
);

// Staged cards (Ice Burst, the beam spells, ...) carry a "(No Bonus)"/"(Stage 2)" suffix in
// their API name — split it off so both the average-hits lookup and the rotation row display
// can work off the plain spell name, with the tier available separately when it's useful.
function spellNameParts(name) {
  const match = String(name ?? "").match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  return match ? { base: match[1], suffix: match[2] } : { base: String(name ?? ""), suffix: null };
}

function averageHitsFor(spellName) {
  return numberOrZero(SPELL_AVERAGE_HITS_BY_KEY[normalized(spellNameParts(spellName).base)]) || 1;
}

let plannerCloseTimer = null;
const plannerLoadingTimers = { wheel: null, proficiency: null };
const plannerLoadingShownAt = { wheel: 0, proficiency: 0 };
// Even when a frame doesn't need to navigate, reopening the modal can still show a brief
// flash of whatever's behind/underneath it before the frame's own content settles back in.
// Keep the spinner up for at least this long so that flash never has a gap to show through.
const PLANNER_LOADING_MIN_MS = 220;
let activeBuildKey = null;
let activeTabKey = "a";
let compareInFlight = null;
let compareSignature = null;
// Only the active build's planner state is live in the shared modal iframes at boot - the
// other build's wheel code / proficiency token would otherwise sit un-decoded (and so
// contribute zero bonus) until its editor happens to be opened. These two hidden iframes
// resolve it once in the background instead. See hydrateInactiveBuild().
let wheelHydrateKey = null;
let proficiencyHydrateKey = null;

const defaultState = () => ({
  stats: {
    vocation: "knight", level: 1000, bonus: 0, skill: DEFAULT_SKILL_BY_VOCATION.knight, magicLevel: 13,
    critChance: BASE_CRIT_CHANCE, critDamage: BASE_CRIT_DAMAGE, fatalChance: 0, transcendenceChance: 0,
    hitPoints: 0, manaPoints: 0, baseMagicLevel: 0, axe: 0, club: 0,
    sword: 0, fist: 0, distance: 0, shielding: 0, fishing: 0,
    imbuementElement: "", imbuementValue: 0, stanceIds: [],
  },
  weapon: { id: 1, ammoId: null, shieldId: null },
  wheelPlanner: { code: "", vocation: "knight", promotionPoints: 0, bonus: 0, effects: [], gemGrades: {} },
  proficiencyPlanner: { token: "", weaponName: "", weaponSprite: "", vocation: "knight", effects: [] },
  wheelPerks: [],
  proficiencyPerks: [],
  manualPerks: [],
  // Which option of a PLANNER_EFFECT_CHOICES perk this build models, keyed by effect name.
  effectChoices: {},
  rotation: [{ id: 1, targets: 1, ratio: 1 }],
  targets: [],
});

function item(resource, id) {
  return metadata[resource]?.find((candidate) => String(candidate.id) === String(id));
}

// Weapon id 1 ("Fists") is the API's placeholder for "no weapon selected" — it has no
// proficiency tree of its own, so show it as "No Weapon" instead of its literal name.
function weaponDisplayName(weapon) {
  return weapon && weapon.id !== 1 ? weapon.name : "No Weapon";
}

const DEFAULT_AMMO_NAME_BY_TYPE = { arrows: "Diamond Arrow", bolts: "Spectral Bolt" };

function defaultAmmoId(weapon) {
  const name = DEFAULT_AMMO_NAME_BY_TYPE[weapon?.ammoType];
  return name ? metadata.ammo.find((entry) => entry.name === name)?.id ?? null : null;
}

function normalized(value) {
  return String(value ?? "").trim().toLocaleLowerCase().replaceAll("‑", "-");
}

function matchByName(resource, value, allowed = () => true) {
  const query = normalized(value);
  if (!query) return null;
  const candidates = metadata[resource].filter(allowed);
  // The base-name pass lets a plain "Divine Grenade" / "Ice Burst" match the API's suffixed
  // card ("... (Stage 1)", "... (No Bonus)"), which is what both the spell datalist and the
  // rotation presets now spell out. Base names are unique among selectable spells, and for
  // unsuffixed names it's the same comparison as the exact pass above, so it's a no-op there.
  return candidates.find((candidate) => normalized(candidate.name) === query)
    ?? candidates.find((candidate) => normalized(spellNameParts(candidate.name).base) === query)
    ?? candidates.find((candidate) => normalized(candidate.name).startsWith(query))
    ?? null;
}

// Parses the "Killed Monsters:" block out of a pasted Tibia Hunt Analyser session
// log, e.g. "  6x cave rat" -> { name: "cave rat", count: 6 }. Returns null when the
// text doesn't look like a hunt log at all, so callers can tell "not a log" from "no kills".
function parseHuntAnalyserKills(text) {
  const startMarker = "Killed Monsters:";
  const startIndex = String(text ?? "").indexOf(startMarker);
  if (startIndex === -1) return null;
  const afterStart = text.slice(startIndex + startMarker.length);
  const endMatch = afterStart.match(/\n\s*Looted Items:/i);
  const section = endMatch ? afterStart.slice(0, endMatch.index) : afterStart;
  const kills = [];
  section.split(/\r?\n/).forEach((line) => {
    const match = line.trim().match(/^(\d[\d,]*)\s*[x×]\s*(.+)$/i);
    if (match) kills.push({ name: match[2].trim(), count: Number(match[1].replaceAll(",", "")) });
  });
  return kills;
}

function numberOrZero(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function option(value, label, selected = false) {
  const element = document.createElement("option");
  element.value = value;
  element.textContent = label;
  element.selected = selected;
  return element;
}

function setDatalist(id, items, label = (entry) => entry.name) {
  const list = document.querySelector(`#${id}`);
  if (!list) return;
  list.replaceChildren(...items.map((entry) => option(label(entry), label(entry))));
}

function bytesToBase64Url(bytes) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlToBytes(token) {
  const padded = token.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(token.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function encodeBuild(build) {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(build)));
}

function decodeBuild(token) {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(token)));
}

// ---------------------------------------------------------------------------
// Share links.
//
// A link used to be plain base64url of the whole shareableBuild() JSON, which ran to ~1800
// characters for an A/B comparison - long enough that chat clients wrapped it over several lines
// and linkified only part of it. The payload is now rewritten as positional arrays (no repeated
// key names, defaults trimmed off the end) and deflated before base64url, which gets that same
// comparison down to ~280 characters.
//
// The first character of the token says which format it is. Legacy tokens are base64 of a string
// starting `{"`, so they always begin "ey" and can never collide with these markers. Links posted
// to Discord and forums long ago still have to open, so that branch stays for good.
const SHARE_FORMAT_DEFLATE = "3";
const SHARE_FORMAT_PLAIN = "2"; // positional but uncompressed, for browsers without CompressionStream
// Append-only: a vocation's index here is baked into every link ever shared with it, so new
// vocations go on the end. Anything not listed falls back to its literal name.
const SHARE_VOCATIONS = ["knight", "paladin", "druid", "sorcerer", "monk"];

async function deflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function inflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// Empty strings/arrays/objects mean "default" on the way back in, so they're worth no characters.
function blank(value) {
  if (value == null || value === "") return null;
  if (Array.isArray(value)) return value.length ? value : null;
  if (typeof value === "object") return Object.keys(value).length ? value : null;
  return value;
}

function trimTrailingBlanks(values) {
  let end = values.length;
  while (end > 0 && values[end - 1] == null) end -= 1;
  return values.slice(0, end);
}

// The proficiency planner hands us its own base64url-of-JSON token, so a share link would
// otherwise carry base64 nested inside base64: ~47 characters per build that deflate can't
// compress and that don't dedupe between Build A and Build B. Unpack it to the underlying
// {w,p,s} arrays here and re-encode on the way back out. Anything that doesn't parse to that
// shape is carried through verbatim, so a later change to the token format can't break links.
function compactProficiencyToken(token) {
  if (!token) return null;
  try {
    const decoded = decodeBuild(token);
    if (decoded && typeof decoded === "object" && Array.isArray(decoded.p) && Array.isArray(decoded.s)) {
      return [decoded.w ?? null, decoded.p, decoded.s];
    }
  } catch { /* not a token we recognise - keep it as-is below */ }
  return token;
}

function expandProficiencyToken(value) {
  if (Array.isArray(value)) return encodeBuild({ w: value[0], p: value[1] ?? [], s: value[2] ?? [] });
  return typeof value === "string" ? value : "";
}

// Positional form of one shareableBuild(). Append-only: every index below is baked into links
// that are already public, so new fields go on the END and nothing ever moves.
//   0 vocation (index into SHARE_VOCATIONS, or the literal name)   8 wheel code
//   1 level      2 skill      3 magicLevel      4 stanceIds        9 wheel gemGrades
//   5 weapon id  6 ammoId     7 shieldId                          10 proficiency [w,p,s]
//  11 manualPerks [[id,value]]        12 effectChoices            13 rotation [[id,targets,ratio]]
//  14 targets [[id,ratio,charmId,charmTier]]   15/16 imbuement element+value (knight-only)
function compactBuild(build) {
  const stats = build.stats ?? {};
  const weapon = build.weapon ?? {};
  const vocationIndex = SHARE_VOCATIONS.indexOf(stats.vocation);
  return trimTrailingBlanks([
    vocationIndex === -1 ? blank(stats.vocation) : vocationIndex,
    stats.level ?? null,
    stats.skill ?? null,
    stats.magicLevel ?? null,
    blank(stats.stanceIds),
    weapon.id ?? null,
    weapon.ammoId ?? null,
    weapon.shieldId ?? null,
    blank(build.wheelPlanner?.code),
    blank(build.wheelPlanner?.gemGrades),
    compactProficiencyToken(build.proficiencyPlanner?.token),
    blank((build.manualPerks ?? []).map((row) => [row.id, row.value])),
    blank(build.effectChoices),
    blank((build.rotation ?? []).map((row) => [row.id, row.targets, row.ratio])),
    blank((build.targets ?? []).map((row) => [row.id, row.ratio, row.charmId, row.charmTier])),
    blank(stats.imbuementElement),
    stats.imbuementElement ? stats.imbuementValue ?? null : null,
  ]);
}

// Rebuilds the shareableBuild() shape. No validation happens here on purpose - the result goes
// straight to sanitizeState(), which already merges over defaultState(), drops unknown enums and
// re-derives magicLevel for paladins/casters. Absent keys therefore have to stay absent rather
// than become null, or they'd override those defaults.
function expandBuild(compact) {
  const row = Array.isArray(compact) ? compact : [];
  const at = (index) => row[index] ?? null;
  const stats = {};
  const vocation = typeof at(0) === "number" ? SHARE_VOCATIONS[at(0)] : at(0);
  if (vocation != null) stats.vocation = vocation;
  if (at(1) != null) stats.level = at(1);
  if (at(2) != null) stats.skill = at(2);
  if (at(3) != null) stats.magicLevel = at(3);
  if (Array.isArray(at(4))) stats.stanceIds = at(4);
  if (at(15) != null) {
    stats.imbuementElement = at(15);
    stats.imbuementValue = at(16);
  }
  const weapon = {};
  if (at(5) != null) weapon.id = at(5);
  if (at(6) != null) weapon.ammoId = at(6);
  if (at(7) != null) weapon.shieldId = at(7);
  const list = (index, map) => (Array.isArray(at(index)) ? at(index).map(map) : []);
  return {
    stats,
    weapon,
    wheelPlanner: { code: at(8) ?? "", gemGrades: at(9) ?? {} },
    proficiencyPlanner: { token: expandProficiencyToken(at(10)) },
    manualPerks: list(11, ([id, value]) => ({ id, value })),
    effectChoices: at(12) ?? {},
    rotation: list(13, ([id, targets, ratio]) => ({ id, targets, ratio })),
    targets: list(14, ([id, ratio, charmId, charmTier]) => ({ id, ratio, charmId, charmTier })),
  };
}

async function encodeShareToken(shared) {
  const compact = [compactBuild(shared.a), compactBuild(shared.b)];
  // Most links only customise Build A, so drop an untouched Build B rather than spend a few
  // hundred characters restating the defaults.
  if (JSON.stringify(compact[1]) === JSON.stringify(compactBuild(shareableFromState(defaultState())))) compact.pop();
  const bytes = new TextEncoder().encode(JSON.stringify(compact));
  if (typeof CompressionStream === "undefined") return SHARE_FORMAT_PLAIN + bytesToBase64Url(bytes);
  return SHARE_FORMAT_DEFLATE + bytesToBase64Url(await deflateRaw(bytes));
}

// Returns { a, b } in shareableBuild() shape, with b === null when the link only carries one
// build. Throws on anything malformed; the caller falls back to stored builds.
async function decodeShareToken(token) {
  const marker = token.slice(0, 1);
  if (marker === SHARE_FORMAT_DEFLATE || marker === SHARE_FORMAT_PLAIN) {
    const bytes = base64UrlToBytes(token.slice(1));
    const json = new TextDecoder().decode(marker === SHARE_FORMAT_DEFLATE ? await inflateRaw(bytes) : bytes);
    const compact = JSON.parse(json);
    if (!Array.isArray(compact) || !compact.length) throw new Error("Malformed share payload.");
    return { a: expandBuild(compact[0]), b: compact.length > 1 ? expandBuild(compact[1]) : null };
  }
  const decoded = decodeBuild(token);
  if (!decoded || typeof decoded !== "object") throw new Error("Malformed share payload.");
  // Old single-build share links carry the build itself rather than an { a, b } envelope.
  return decoded.a || decoded.b ? { a: decoded.a, b: decoded.b ?? null } : { a: decoded, b: null };
}

function sanitizeState(candidate) {
  const fallback = defaultState();
  if (!candidate || typeof candidate !== "object") return fallback;
  const stats = { ...fallback.stats, ...(candidate.stats && typeof candidate.stats === "object" ? candidate.stats : {}) };
  stats.vocation = typeof stats.vocation === "string" ? stats.vocation : fallback.stats.vocation;
  stats.stanceIds = Array.isArray(stats.stanceIds) ? stats.stanceIds.map(Number).filter((id) => Number.isInteger(id) && !PURE_SKILL_STANCE_IDS.has(id) && !NON_DAMAGE_STANCE_IDS.has(id)) : [];
  stats.critChance = BASE_CRIT_CHANCE;
  stats.critDamage = BASE_CRIT_DAMAGE;
  if (stats.vocation === "paladin" && candidate.stats?.magicLevel == null) stats.magicLevel = DEFAULT_PALADIN_MAGIC_LEVEL;
  if ((stats.vocation === "druid" || stats.vocation === "sorcerer") && candidate.stats?.magicLevel == null) stats.magicLevel = DEFAULT_CASTER_MAGIC_LEVEL;
  // Restored state can come from an old localStorage entry or a hand-edited share link; an
  // imbuement outside the API's enums would 400 the whole calculation, so drop it here.
  if (stats.vocation !== "knight" || !IMBUEMENT_ELEMENTS.includes(stats.imbuementElement)) stats.imbuementElement = "";
  if (!stats.imbuementElement || !IMBUEMENT_VALUES.includes(Number(stats.imbuementValue))) stats.imbuementValue = 0;
  else stats.imbuementValue = Number(stats.imbuementValue);
  const rows = (key, defaults) => Array.isArray(candidate[key])
    ? candidate[key].filter((row) => row && Number.isInteger(Number(row.id))).map((row) => ({ ...defaults, ...row, id: Number(row.id) }))
    : [];
  // Only known effects and known option ids survive: a stale or hand-edited entry would
  // otherwise silently fall back to the default option anyway.
  const effectChoices = {};
  if (candidate.effectChoices && typeof candidate.effectChoices === "object" && !Array.isArray(candidate.effectChoices)) {
    Object.entries(candidate.effectChoices).forEach(([name, choice]) => {
      const choices = PLANNER_EFFECT_CHOICES[name];
      if (!choices || typeof choice !== "string") return;
      // A spellChoice's options are the build's own rotation, so only the shape can be checked
      // here - a spell that is no longer in the rotation falls back to "no spell boosted".
      if (choices.spellChoice ? /^\d*$/.test(choice) : choices.options.some((option) => option.id === choice)) effectChoices[name] = choice;
    });
  }
  const wheelPlanner = { ...fallback.wheelPlanner, ...(candidate.wheelPlanner && typeof candidate.wheelPlanner === "object" ? candidate.wheelPlanner : {}) };
  wheelPlanner.gemGrades = wheelPlanner.gemGrades && typeof wheelPlanner.gemGrades === "object" && !Array.isArray(wheelPlanner.gemGrades) ? wheelPlanner.gemGrades : {};
  return {
    stats,
    weapon: { ...fallback.weapon, ...(candidate.weapon && typeof candidate.weapon === "object" ? candidate.weapon : {}) },
    wheelPlanner,
    proficiencyPlanner: { ...fallback.proficiencyPlanner, ...(candidate.proficiencyPlanner && typeof candidate.proficiencyPlanner === "object" ? candidate.proficiencyPlanner : {}) },
    wheelPerks: rows("wheelPerks", { value: 0 }),
    proficiencyPerks: rows("proficiencyPerks", { value: 0 }),
    manualPerks: rows("manualPerks", { value: 0 }),
    effectChoices,
    rotation: rows("rotation", { targets: 1, ratio: 1 }),
    targets: rows("targets", { ratio: 1, charmId: null, charmTier: 1 }),
  };
}

// The subset of a build that travels in share links and named presets: everything the calculator
// can't re-derive on its own. Notably absent are wheelPerks/proficiencyPerks and the planners'
// `effects` - those are recomputed from the wheel code and proficiency token by the hidden
// planner iframes (see hydrateInactiveBuild).
function shareableFromState(state) {
  const s = state.stats;
  const stats = { vocation: s.vocation, level: s.level, skill: s.skill, magicLevel: s.magicLevel };
  if (s.stanceIds?.length) stats.stanceIds = s.stanceIds;
  // Only carried when actually set, to keep share links short. sanitizeState() re-validates
  // both on the way back in, so a tampered link can't smuggle a bad enum into the request.
  if (IMBUEMENT_ELEMENTS.includes(s.imbuementElement) && IMBUEMENT_VALUES.includes(Number(s.imbuementValue))) {
    stats.imbuementElement = s.imbuementElement;
    stats.imbuementValue = Number(s.imbuementValue);
  }
  return {
    stats,
    weapon: state.weapon,
    wheelPlanner: { code: state.wheelPlanner.code, gemGrades: state.wheelPlanner.gemGrades },
    proficiencyPlanner: { token: state.proficiencyPlanner.token },
    manualPerks: state.manualPerks,
    effectChoices: state.effectChoices,
    rotation: state.rotation,
    targets: state.targets,
  };
}

function words(value) {
  const ignored = new Set(["a", "an", "and", "as", "at", "for", "from", "of", "the", "this", "to", "your", "aug", "augmented"]);
  return normalized(value).replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter((word) => word && !ignored.has(word) && !/^\d+$/.test(word));
}

function effectText(effect) {
  return [effect.name, effect.value, effect.detail, effect.label].filter(Boolean).join(" ");
}

function plainName(value) {
  return normalized(value).replace(/[^a-z0-9]+/g, " ").trim();
}

// Revelation perks are reported by the wheel planner as "Stage N" (LargePerkLevelNames), but
// roman numerals show up in other places the same text can come from, so accept both.
function revelationStage(text) {
  const value = String(text ?? "");
  const staged = value.match(/stage\s*([0-3])/i)?.[1];
  if (staged != null) return Number(staged);
  const roman = value.match(/\b(III|II|I)\b/i)?.[1]?.toUpperCase();
  return roman ? ({ I: 1, II: 2, III: 3 })[roman] : 0;
}

function effectNumber(effect, perk) {
  const text = [effect.detail, effect.label, effect.value].filter(Boolean).join(" ").replace(",", ".");
  if (perk.valueType === "stage") {
    const stage = revelationStage(text);
    if (stage) return stage;
    if (/stage\s*0/i.test(text)) return 0;
  }
  if (perk.valueType === "ignored") return 0;
  if (perk.valueType === "spellId") return null;
  const displayed = text.match(/[-+]?\d+(?:\.\d+)?/)?.[0];
  if (displayed != null) return Math.abs(Number(displayed));
  const raw = Number(effect.rawValue ?? effect.value);
  if (!Number.isFinite(raw)) return 0;
  return perk.valueType === "percent" && Math.abs(raw) <= 2 ? Math.abs(raw * 100) : Math.abs(raw);
}

function effectSpell(effect) {
  if (effect.spellId != null) {
    const byId = item("spells", effect.spellId);
    if (byId) return byId;
  }
  const text = normalized([effect.name, effect.label].filter(Boolean).join(" "));
  return metadata.spells
    .filter((spell) => spell.spellType !== "rune" && text.includes(normalized(spell.name.replace(/\s*\([^)]*\)\s*$/, ""))))
    .sort((left, right) => right.name.length - left.name.length)[0] ?? null;
}

function formatDamage(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "—";
}

function spellMetric(spell, group, key) {
  return spell?.[group]?.[key];
}

function resultIcon(spell, spellMeta) {
  const icon = document.createElement("span");
  icon.className = "dc-result-icon";
  const image = document.createElement("img");
  image.alt = "";
  const scope = spellMeta?.scope ?? normalized(spell.name).replace(/[^a-z0-9]+/g, "-");
  if (spellMeta?.spellType === "auto") {
    icon.classList.add("fallback");
    return icon;
  }
  image.src = `/images/damage-calculator/${FANDOM_ICON_ALIASES[scope] ?? scope}.gif`;
  image.addEventListener("error", () => { image.remove(); icon.classList.add("fallback"); }, { once: true });
  icon.append(image);
  return icon;
}

function removeButton(callback) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "dc-remove";
  button.setAttribute("aria-label", "Remove");
  button.textContent = "×";
  button.addEventListener("click", callback);
  return button;
}

function numericRowInput(row, key, minimum, label, onChange) {
  const input = document.createElement("input");
  input.type = "number";
  input.min = String(minimum);
  input.step = "0.1";
  input.value = row[key];
  input.setAttribute("aria-label", label);
  input.addEventListener("input", () => { row[key] = numberOrZero(input.value); onChange(); });
  return input;
}

async function fetchDamage(request, signal) {
  const response = await fetch(`${API_ROOT}/damage`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(request),
    signal,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const issues = body.error?.issues?.map((issue) => `${issue.field}: ${issue.message}`).join(" · ");
    throw new Error(issues || body.error?.message || `TibiaTools returned HTTP ${response.status}.`);
  }
  return body;
}

function plannerUrl(path, values) {
  const url = new URL(path, window.location.origin);
  Object.entries(values).forEach(([key, value]) => { if (value) url.searchParams.set(key, value); });
  return `${url.pathname}${url.search}`;
}

function loadHtml2Canvas() {
  if (window.html2canvas) return Promise.resolve(window.html2canvas);
  loadHtml2Canvas.promise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/damage-calculator/html2canvas.min.js?v=1.4.1";
    script.onload = () => resolve(window.html2canvas);
    script.onerror = () => reject(new Error("Could not load the image exporter."));
    document.head.append(script);
  });
  return loadHtml2Canvas.promise;
}

function exportSpellIcon(spell, meta) {
  const icon = document.createElement("span");
  icon.className = "dc-result-icon";
  // html2canvas can't render the CSS background-image sprite crop that the live tab's
  // .fallback icon uses (it comes out as a blank box), so auto-attack needs its own
  // glyph fallback here rather than matching the live markup exactly.
  if (meta?.spellType === "auto") {
    icon.classList.add("dc-export-icon-glyph");
    icon.textContent = "⚔";
    return icon;
  }
  const image = document.createElement("img");
  image.alt = "";
  const scope = meta?.scope ?? normalized(spell.name).replace(/[^a-z0-9]+/g, "-");
  image.src = `/images/damage-calculator/${FANDOM_ICON_ALIASES[scope] ?? scope}.gif`;
  image.addEventListener("error", () => { image.remove(); icon.classList.add("dc-export-icon-glyph"); icon.textContent = "✦"; }, { once: true });
  icon.append(image);
  return icon;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function withBusyButton(button, busyLabel, task) {
  const label = button.textContent;
  button.disabled = true;
  button.textContent = busyLabel;
  try { await task(); }
  finally { button.disabled = false; button.textContent = label; }
}

function percentDiff(base, next) {
  if (!Number.isFinite(base) || !Number.isFinite(next)) return null;
  if (base === 0) return next === 0 ? 0 : null;
  return ((next - base) / Math.abs(base)) * 100;
}

function diffBadgeEl(pct) {
  const badge = document.createElement("span");
  badge.className = "dc-diff-badge";
  if (pct == null) { badge.classList.add("dc-diff-na"); badge.textContent = "N/A"; return badge; }
  const rounded = Math.round(pct * 100) / 100;
  badge.textContent = `${rounded > 0 ? "+" : ""}${rounded.toFixed(2)}%`;
  badge.classList.add(rounded > 0.05 ? "dc-diff-up" : rounded < -0.05 ? "dc-diff-down" : "dc-diff-flat");
  return badge;
}

// Green-chips the better of the two values in a comparison row, so the winning build is
// readable at a glance instead of only via the sign of the % badge. Takes the raw values
// rather than the badge's percentage so that a build having a spell the other one lacks
// still counts as a win (percentDiff can't express that - it returns null). Ties use the
// same +/-0.05% dead zone as diffBadgeEl() so a row shown as "0.00%" claims no winner.
// Pass a non-finite value (NaN/null) for a build that doesn't have the attack at all.
// Toggles rather than adds because the summary rows are live markup re-rendered in place.
function applyWinnerHighlight(aEl, bEl, aValue, bValue) {
  const aHas = Number.isFinite(aValue);
  const bHas = Number.isFinite(bValue);
  let aWins = aHas && !bHas;
  let bWins = bHas && !aHas;
  if (aHas && bHas) {
    // Note the argument order: percentDiff(bValue, aValue) is A relative to B, so a
    // positive percentage means A is ahead - same convention as the badge next to it.
    const pct = percentDiff(bValue, aValue);
    const rounded = pct == null ? null : Math.round(pct * 100) / 100;
    // pct is null when B is 0 and A isn't (no meaningful percentage) - still a clear win.
    aWins = rounded == null ? aValue > bValue : rounded > 0.05;
    bWins = rounded == null ? bValue > aValue : rounded < -0.05;
  }
  aEl.classList.toggle("dc-cmp-win", aWins);
  bEl.classList.toggle("dc-cmp-win", bWins);
  aEl.classList.toggle("dc-cmp-lose", bWins);
  bEl.classList.toggle("dc-cmp-lose", aWins);
}

// ---------------------------------------------------------------------------
// Per-build module: everything that reads/writes a single build's state and
// its own half of the page. Instantiated once per build slot ("a" and "b").
// ---------------------------------------------------------------------------
function createBuild(key) {
  const root = document.querySelector(`#build-${key}`);
  const $ = (id) => document.querySelector(`#${id}-${key}`);
  let state = defaultState();
  let hasCalculated = false;
  let lastResult = null;
  let requestController = null;
  let savedName = null;
  let dirty = false;

  function markSaved(name) {
    savedName = name;
    dirty = false;
    updateBuildHeading(key);
    saveBuildMeta();
    renderComparisonColumnLabels();
  }

  function restoreMeta(meta) {
    savedName = typeof meta?.savedName === "string" ? meta.savedName : null;
    dirty = Boolean(meta?.dirty) && savedName != null;
  }

  function vocationAllows(entry) {
    return Boolean(entry) && (!Array.isArray(entry.vocations) || entry.vocations.includes(state.stats.vocation));
  }

  function populateStaticControls() {
    const vocation = $("vocation");
    vocation.replaceChildren(...metadata.vocations.map((entry) => option(entry.id, entry.name, entry.id === state.stats.vocation)));
    setDatalist(`perkOptions-${key}`, metadata.perks.filter((entry) => entry.selectable !== false && vocationAllows(entry)));
    // Staged spells are listed under their plain name: the selectable card's suffix is an
    // artifact of which tier the API happens to expose ("(No Bonus)", "(Central)", and for
    // Divine Grenade "(Stage 1)", since it has no stage-0 card), never a choice the user
    // makes - the live tier comes from the wheel via resolveStagedSpell().
    setDatalist(`spellOptions-${key}`, metadata.spells.filter((entry) => entry.selectable !== false && vocationAllows(entry)),
      (entry) => spellNameParts(entry.name).base);
    setDatalist(`creatureOptions-${key}`, metadata.creatures);
    renderStatControls();
    renderStances();
    renderEquipment();
    renderSyncedEffects("wheel");
    renderSyncedEffects("proficiency");
    renderPerks();
    renderRotation();
    renderRotationPresets();
    renderTargets();
  }

  function renderRotationPresets() {
    const select = $("rotationPresetSelect");
    if (!select) return;
    const presets = ROTATION_PRESETS[state.stats.vocation] ?? [];
    const previous = select.value;
    select.replaceChildren(option("", "Choose a preset…"), ...presets.map((preset) => option(preset.name, preset.name)));
    if (presets.some((preset) => preset.name === previous)) select.value = previous;
  }

  function applyRotationPreset() {
    const select = $("rotationPresetSelect");
    const preset = (ROTATION_PRESETS[state.stats.vocation] ?? []).find((entry) => entry.name === select.value);
    if (!preset) return;
    const rows = [{ id: 1, targets: state.stats.vocation === "paladin" ? 6 : 1, ratio: 1 }];
    preset.spells.forEach((entry) => {
      const matched = matchByName("spells", entry.name, (candidate) => candidate.selectable !== false && vocationAllows(candidate));
      const spell = resolveStagedSpell(matched);
      if (spell && !rows.some((row) => row.id === spell.id)) rows.push({ id: spell.id, targets: averageHitsFor(spell.name), ratio: numberOrZero(entry.ratio) || 1 });
    });
    state.rotation = rows;
    renderRotation();
    renderPerks();
    changed();
  }

  function renderStatControls() {
    state.stats.critChance = BASE_CRIT_CHANCE;
    state.stats.critDamage = BASE_CRIT_DAMAGE;
    const usesMagicLevel = state.stats.vocation === "druid" || state.stats.vocation === "sorcerer";
    const skillField = $("skillField");
    const magicLevelField = $("magicLevelField");
    skillField.hidden = usesMagicLevel;
    magicLevelField.hidden = !usesMagicLevel && state.stats.vocation !== "paladin";
    $("skillFieldLabel").textContent = state.stats.vocation === "paladin"
      ? "Distance fighting"
      : state.stats.vocation === "monk"
        ? "Fist fighting"
        : "Main skill";
    root.querySelectorAll("[data-stat]").forEach((control) => {
      const statKey = control.dataset.stat;
      const value = state.stats[statKey] ?? "";
      if ("value" in control) control.value = value;
      else control.textContent = value;
    });
    // Must come after the loop above: it writes imbuementValue 0 (the "no imbuement" sentinel)
    // straight onto the tier <select>, which matches no option and would blank it out.
    renderImbuement();
  }

  function renderStances() {
    const fieldset = $("stanceChoices");
    const choices = metadata.stances.filter((stance) => !PURE_SKILL_STANCE_IDS.has(stance.id) && !NON_DAMAGE_STANCE_IDS.has(stance.id) && (stance.selectable || LOCAL_STANCE_MODS[stance.id]) && stance.vocation === state.stats.vocation);
    const legend = document.createElement("legend");
    legend.textContent = "Active stances";
    fieldset.replaceChildren(legend);
    if (!choices.length) {
      const message = document.createElement("span");
      message.className = "dc-no-options";
      message.textContent = "No selectable stance for this vocation.";
      fieldset.append(message);
      return;
    }
    choices.forEach((stance) => {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = stance.id;
      input.checked = state.stats.stanceIds.includes(stance.id);
      input.addEventListener("change", () => {
        state.stats.stanceIds = choices.filter((choice) => fieldset.querySelector(`input[value="${choice.id}"]`)?.checked).map((choice) => choice.id);
        changed();
      });
      label.append(input, document.createTextNode(stance.name));
      const mod = LOCAL_STANCE_MODS[stance.id];
      if (mod) {
        const note = document.createElement("small");
        note.className = "dc-stance-note";
        note.textContent = mod.note;
        label.append(note);
      }
      fieldset.append(label);
    });
  }

  function renderEquipment() {
    let weapon = item("weapons", state.weapon.id);
    if (!weapon || !vocationAllows(weapon)) weapon = metadata.weapons.find((entry) => entry.id === 1);
    state.weapon.id = weapon?.id ?? 1;
    const weaponInput = $("weaponSearch");
    weaponInput.value = weaponDisplayName(weapon);
    const details = [weapon?.skill, weapon?.hands ? `${weapon.hands}-handed` : null, weapon?.attack != null ? `${weapon.attack} atk` : null, weapon?.damage != null ? `${weapon.damage} ${weapon.damageType ?? ""} damage` : null].filter(Boolean);
    $("weaponMeta").textContent = details.join(" · ");

    const ammoField = $("ammoField");
    const ammoSelect = $("ammoSelect");
    const showAmmo = state.stats.vocation === "paladin";
    ammoField.hidden = !showAmmo;
    const ammo = metadata.ammo.filter((entry) => weapon?.ammoType && entry.type === weapon.ammoType);
    ammoSelect.replaceChildren(option("", "None"), ...ammo.map((entry) => option(entry.id, `${entry.name} · ${entry.attack} atk`, entry.id === Number(state.weapon.ammoId))));
    ammoSelect.disabled = !ammo.length;
    if (!showAmmo || !ammo.some((entry) => entry.id === Number(state.weapon.ammoId))) state.weapon.ammoId = null;

    const shieldField = $("shieldField");
    const shieldSelect = $("shieldSelect");
    const showShield = state.stats.vocation === "knight";
    shieldField.hidden = !showShield;
    const canUseShield = showShield && weapon?.hands === "one";
    const sortedShields = [...metadata.shields].sort((a, b) => b.defense - a.defense);
    shieldSelect.replaceChildren(option("", "None"), ...sortedShields.map((entry) => option(entry.id, `${entry.name} · ${entry.defense} def`, entry.id === Number(state.weapon.shieldId))));
    shieldSelect.disabled = !canUseShield;
    if (!canUseShield) state.weapon.shieldId = null;

    renderImbuement();
  }

  // Elemental imbuements are a knight-only control here. Kept in its own function because the
  // element/tier pair also has to be re-synced from the change handler, without re-running the
  // whole equipment render.
  function renderImbuement() {
    const showImbuement = state.stats.vocation === "knight";
    $("imbuementField").hidden = !showImbuement;
    $("imbuementTierField").hidden = !showImbuement;
    if (!showImbuement) {
      state.stats.imbuementElement = "";
      state.stats.imbuementValue = 0;
    }
    const tierSelect = $("imbuementTierSelect");
    tierSelect.disabled = !state.stats.imbuementElement;
    tierSelect.value = IMBUEMENT_VALUES.includes(Number(state.stats.imbuementValue))
      ? String(state.stats.imbuementValue)
      : String(DEFAULT_IMBUEMENT_VALUE);
  }

  // The bonus type of the equipped weapon's own skill, for perks that say "weapon skill"
  // instead of naming one (the Weapon Skill Boost conviction perk, Battle Instinct).
  function weaponSkillBonusType() {
    const skill = item("weapons", state.weapon.id)?.skill;
    return skill === "magic" ? "magic-level" : skill ? `${skill}-fighting` : null;
  }

  function skillBoostPerk(effect) {
    const name = normalized(effect.name ?? effect.label);
    let bonusType = null;
    if (name.includes("distance skill boost")) bonusType = "distance-fighting";
    else if (name.includes("magic skill boost")) bonusType = "magic-level";
    else if (name.includes("fist fighting skill boost")) bonusType = "fist-fighting";
    else if (name.includes("weapon skill boost")) bonusType = weaponSkillBonusType();
    return bonusType ? metadata.perks.find((perk) => perk.bonusType === bonusType && perk.selectable !== false) : null;
  }

  function typedProficiencyPerk(effect) {
    const type = Number(effect.type);
    if (type === 25 || type === 26) {
      const skill = item("weapons", state.weapon.id)?.skill;
      const prefix = skill === "magic" ? "magic-level" : skill;
      const scope = type === 25 ? "auto-attack" : "spell";
      return prefix ? metadata.perks.find((perk) => perk.bonusType === `${prefix}-percent-extra` && perk.scope === scope && perk.selectable !== false) ?? null : null;
    }
    let bonusType = null;
    if (type === 28) bonusType = "alpha-strike";
    if (type === 29) bonusType = "omega-strike";
    if (type === 30) bonusType = "armor-penetration";
    if (type === 31) {
      const element = ({ 1: "physical", 8: "energy", 16: "earth", 32: "fire", 64: "ice", 128: "holy", 256: "death" })[Number(effect.elementId)];
      if (element) bonusType = `${element}-pierce-weapon`;
    }
    return bonusType ? metadata.perks.find((perk) => perk.bonusType === bonusType && perk.selectable !== false) : null;
  }

  // Focus Mastery boosts one spell of the rotation, so its options are the rotation itself.
  // Auto-attack is excluded (the perk only applies to a damage spell), and so is the focus
  // spell that triggers it.
  function effectChoiceOptions(choices) {
    if (!choices.spellChoice) return choices.options;
    return [
      { id: "", label: "No spell boosted", perks: [] },
      ...state.rotation.flatMap((row) => {
        const spell = row.id === 1 ? null : item("spells", row.id);
        const name = spell ? spellNameParts(spell.name).base : "";
        if (!spell || FOCUS_MASTERY_TRIGGER_SPELLS.has(plainName(name))) return [];
        return [{ id: String(spell.id), label: name, perks: [{ bonusType: "focus-mastery", value: spell.id }] }];
      }),
    ];
  }

  function activeEffectChoice(effect, choices) {
    const options = effectChoiceOptions(choices);
    return options.find((entry) => entry.id === state.effectChoices?.[normalized(effect.name)]) ?? options[0];
  }

  function perkFromSpec(spec) {
    const bonusType = spec.weaponSkill ? weaponSkillBonusType() : spec.bonusType;
    const perk = bonusType && metadata.perks.find((candidate) => candidate.bonusType === bonusType
      && (!spec.scope || candidate.scope === spec.scope)
      && candidate.selectable !== false && vocationAllows(candidate));
    return perk ? { id: perk.id, value: spec.value, apiName: perk.name } : null;
  }

  // A situational perk carries no value of its own: either the option the user picked in
  // renderEffectChoices or - for PLANNER_EFFECT_AUTO - the equipped weapon decides which API
  // perks it becomes. Returns a list because one perk can map onto several (Ballistic Mastery).
  function situationalPerks(effect) {
    const auto = plannerEffectAuto(effect);
    if (auto) return auto(item("weapons", state.weapon.id)).perks.map(perkFromSpec).filter(Boolean);
    const choices = plannerEffectChoices(effect);
    if (!choices) return null;
    return (activeEffectChoice(effect, choices).perks ?? []).map(perkFromSpec).filter(Boolean);
  }

  // Every mapping path funnels through here so a single effect can contribute more than one perk.
  // `keepSkillBonuses` is only for the synced-effect chips, which need to know whether a row was
  // dropped as an already-on-the-character-sheet skill bonus or genuinely didn't map to anything.
  function mapPlannerEffectPerks(effect, { keepSkillBonuses = false } = {}) {
    const situational = situationalPerks(effect);
    if (situational) return situational;
    const mapped = mapPlannerEffect(effect, { keepSkillBonuses });
    return mapped ? [mapped] : [];
  }

  function mapPlannerEffect(effect, { keepSkillBonuses = false } = {}) {
    const text = normalized(effectText(effect));
    if (!text || /damage and healing/.test(text) || isHealingOnlyEffect(effect)) return null;
    const scopedSpell = effectSpell(effect);
    let perk = typedProficiencyPerk(effect) ?? skillBoostPerk(effect);
    if (!perk) {
      const name = normalized(effect.name ?? "");
      perk = metadata.perks.find((candidate) => normalized(candidate.name) === name && candidate.selectable !== false);
    }
    if (!perk) {
      const candidates = metadata.perks.filter((candidate) => candidate.selectable !== false && vocationAllows(candidate)
        && (!scopedSpell || candidate.scope === scopedSpell.scope)).map((candidate) => {
        const tokens = words(candidate.name);
        const matches = tokens.filter((token) => text.includes(token)).length;
        return { candidate, matches, coverage: tokens.length ? matches / tokens.length : 0 };
      }).filter((entry) => entry.matches >= 1 && entry.coverage >= .72)
        .sort((left, right) => right.coverage - left.coverage || right.matches - left.matches);
      perk = candidates[0]?.candidate ?? null;
    }
    if (!perk) return null;
    // See CHARACTER_SHEET_SKILL_BONUS_TYPES: a planner's flat skill rows are already part of the
    // skill the user types in the character section, so they map to nothing.
    if (!keepSkillBonuses && isCharacterSheetSkillPerk(perk)) return null;
    const value = effectNumber(effect, perk);
    if (value == null || !Number.isFinite(value)) return null;
    return { id: perk.id, value, apiName: perk.name, sourceLabel: effect.label ?? `${effect.name}${effect.value ? ` ${effect.value}` : ""}` };
  }

  function expandedEffects(source) {
    const effects = source === "wheel" ? state.wheelPlanner.effects : state.proficiencyPlanner.effects;
    return effects.flatMap((effect) => effect.details?.length
      ? effect.details.map((detail) => ({ ...effect, detail, label: `${effect.name}: ${detail}` }))
      : [{ ...effect, rawValue: effect.rawValue ?? effect.value }]);
  }

  function mappedPlannerPerks(source) {
    const grouped = new Map();
    expandedEffects(source).forEach((effect) => {
      mapPlannerEffectPerks(effect).forEach((mapped) => {
        const perk = item("perks", mapped.id);
        const previous = grouped.get(mapped.id);
        // A spellId perk (Focus mastery) names a spell rather than carrying an amount, so the
        // last one wins - adding two spell ids together would point at an unrelated spell.
        const value = perk?.valueType === "stage" ? Math.max(previous?.value ?? 0, mapped.value)
          : perk?.valueType === "spellId" ? mapped.value
            : (previous?.value ?? 0) + mapped.value;
        grouped.set(mapped.id, { id: mapped.id, value, apiName: mapped.apiName });
      });
    });
    return [...grouped.values()];
  }

  // Situational perks can't be read off the planner - which half of Positional Tactics is live
  // depends on where the character is standing - so they get a real dropdown in the planner's
  // own section, appearing only while the synced build actually contains the perk.
  function renderEffectChoices(source) {
    const container = $(source === "wheel" ? "wheelEffectChoices" : "proficiencyEffectChoices");
    if (!container) return;
    const effects = (source === "wheel" ? state.wheelPlanner.effects : state.proficiencyPlanner.effects) ?? [];
    const rows = effects.flatMap((effect) => {
      const choices = plannerEffectChoices(effect);
      return choices ? [{ effect, choices }] : [];
    });
    container.replaceChildren();
    container.hidden = rows.length === 0;
    rows.forEach(({ effect, choices }) => {
      const key = normalized(effect.name);
      const label = document.createElement("label");
      label.append(document.createTextNode(effect.name));
      const select = document.createElement("select");
      select.setAttribute("aria-label", `${effect.name} active bonus`);
      const active = activeEffectChoice(effect, choices);
      select.replaceChildren(...effectChoiceOptions(choices).map((entry) => option(entry.id, entry.label, entry.id === active.id)));
      select.addEventListener("change", () => {
        state.effectChoices = { ...state.effectChoices, [key]: select.value };
        state.wheelPerks = mappedPlannerPerks("wheel");
        state.proficiencyPerks = mappedPlannerPerks("proficiency");
        renderSyncedEffects(source);
        changed();
      });
      label.append(select);
      container.append(label);
    });
  }

  function renderSyncedEffects(source) {
    const planner = source === "wheel" ? state.wheelPlanner : state.proficiencyPlanner;
    const container = $(source === "wheel" ? "wheelSyncedEffects" : "proficiencySyncedEffects");
    const countEl = $(source === "wheel" ? "wheelEffectsCount" : "proficiencyEffectsCount");
    const effectCount = planner.effects?.length ?? 0;
    if (countEl) { countEl.textContent = String(effectCount); countEl.hidden = effectCount === 0; }
    renderEffectChoices(source);
    container.replaceChildren();
    if (!planner.effects?.length) {
      const empty = document.createElement("div");
      empty.className = "dc-empty-row";
      empty.textContent = `Open the ${source === "wheel" ? "Wheel" : "Proficiency"} planner to choose this part of the build.`;
      container.append(empty);
      return;
    }
    planner.effects.forEach((effect) => {
      const details = [...new Set((Array.isArray(effect.details) ? effect.details : []).map((detail) => String(detail).trim()).filter(Boolean))];
      const perksOf = (options) => (details.length
        ? details.flatMap((detail) => mapPlannerEffectPerks({ ...effect, detail }, options))
        : mapPlannerEffectPerks(effect, options));
      const mapped = perksOf().length > 0;
      // Situational perks report which branch is live; the user picks it in the planner
      // section's own dropdown (renderEffectChoices), not in this hover popover.
      const choices = plannerEffectChoices(effect);
      const auto = plannerEffectAuto(effect);
      const chosen = choices ? activeEffectChoice(effect, choices) : null;
      const situationalNote = auto ? auto(item("weapons", state.weapon.id)).note
        : chosen ? (choices.spellChoice && chosen.id ? `Boosts ${chosen.label}` : chosen.label) : null;
      const chip = document.createElement("span");
      chip.className = `dc-synced-effect ${mapped ? "mapped" : "unmapped"}${details.length || situationalNote ? " has-details" : ""}`;
      const label = document.createElement("strong");
      label.textContent = effect.label ?? `${effect.name}${effect.value ? ` ${effect.value}` : ""}`;
      chip.append(label);
      if (situationalNote) {
        const description = document.createElement("small");
        description.textContent = situationalNote;
        chip.append(description);
      }
      if (details.length) {
        const description = document.createElement("small");
        description.textContent = details.join(" · ");
        chip.append(description);
      }
      // A flat-skill row does map to a real API perk - it is dropped on purpose (see
      // CHARACTER_SHEET_SKILL_BONUS_TYPES), so say that rather than calling it unsupported.
      const bakedIntoSkill = !mapped && perksOf({ keepSkillBonuses: true }).length > 0;
      chip.title = mapped ? "Included in damage calculation"
        : bakedIntoSkill ? "Already part of the skill you enter in the character section - not added again"
          : "Informational or not supported by the damage API";
      container.append(chip);
    });
  }

  function valueControl(perk, row) {
    const control = perk.valueType === "spellId" ? document.createElement("select") : document.createElement("input");
    if (perk.valueType === "spellId") {
      const spells = metadata.spells.filter((spell) => state.rotation.some((entry) => entry.id === spell.id));
      control.replaceChildren(option("", "Choose spell"), ...spells.map((spell) => option(spell.id, spell.name, spell.id === Number(row.value))));
    } else {
      control.type = "number";
      control.step = perk.valueType === "stage" ? "1" : "0.1";
      control.min = "0";
      if (perk.valueType === "stage") control.max = "3";
      control.value = perk.valueType === "ignored" ? "0" : row.value;
      control.disabled = perk.valueType === "ignored";
    }
    control.setAttribute("aria-label", `${perk.name} value`);
    control.addEventListener("change", () => {
      row.value = numberOrZero(control.value);
      changed();
    });
    return control;
  }

  function renderPerks() {
    const container = $("manualPerks");
    container.replaceChildren();
    if (!state.manualPerks.length) {
      const empty = document.createElement("div");
      empty.className = "dc-empty-row";
      empty.textContent = "No additional API perks added.";
      container.append(empty);
      return;
    }
    state.manualPerks.forEach((row) => {
      const perk = item("perks", row.id);
      if (!perk) return;
      const element = document.createElement("div");
      element.className = "dc-data-row dc-perk-row";
      const identity = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = perk.name;
      const hint = document.createElement("small");
      hint.textContent = perk.valueType === "ignored" ? "Enabled" : perk.valueDescription;
      identity.append(title, hint);
      const remove = removeButton(() => {
        state.manualPerks = state.manualPerks.filter((candidate) => candidate !== row);
        renderPerks();
        changed();
      });
      element.append(identity, valueControl(perk, row), remove);
      container.append(element);
    });
  }

  function renderRotation() {
    const container = $("rotationRows");
    container.replaceChildren();
    state.rotation = state.rotation.filter((row) => item("spells", row.id));
    // Focus Mastery's dropdown lists the rotation's spells, so it follows every rotation edit.
    renderEffectChoices("wheel");
    if (!state.rotation.length) {
      const empty = document.createElement("div");
      empty.className = "dc-empty-row";
      empty.textContent = "Add auto-attack and the spells used in your rotation.";
      container.append(empty);
      return;
    }
    state.rotation.forEach((row) => {
      const spell = item("spells", row.id);
      const element = document.createElement("div");
      element.className = "dc-data-row dc-rotation-row";
      const identity = document.createElement("div");
      const title = document.createElement("strong");
      const { base: spellName, suffix: spellTier } = spellNameParts(spell.name);
      title.textContent = spellName;
      const hint = document.createElement("small");
      hint.textContent = [spell.spellType, spell.element, spell.targetsLabel, spellTier].filter(Boolean).join(" · ");
      identity.append(title, hint);
      const targets = numericRowInput(row, "targets", 0, "Average targets", changed);
      const ratio = numericRowInput(row, "ratio", 0, "Cast ratio", changed);
      if (row.id === 1) { ratio.type = "text"; ratio.value = "N/A"; ratio.disabled = true; }
      element.append(identity, targets, ratio, removeButton(() => {
        state.rotation = state.rotation.filter((candidate) => candidate !== row);
        renderRotation();
        renderPerks();
        changed();
      }));
      container.append(element);
    });
  }

  function renderTargets() {
    const container = $("targetRows");
    container.replaceChildren();
    state.targets = state.targets.filter((row) => item("creatures", row.id));
    if (!state.targets.length) {
      const empty = document.createElement("div");
      empty.className = "dc-empty-row";
      empty.textContent = "No targets: results will show raw damage without creature defenses.";
      container.append(empty);
      return;
    }
    state.targets.forEach((row) => {
      const creature = item("creatures", row.id);
      const element = document.createElement("div");
      element.className = "dc-data-row dc-target-row";
      const identity = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = creature.name;
      const hint = document.createElement("small");
      hint.textContent = `${Number(creature.hitpoints).toLocaleString()} HP · ${creature.bestiaryClass ?? "Creature"}`;
      identity.append(title, hint);
      const ratio = numericRowInput(row, "ratio", 0, "Kill ratio", changed);
      const charm = document.createElement("select");
      charm.setAttribute("aria-label", `${creature.name} charm`);
      charm.replaceChildren(option("", "No charm"), ...metadata.charms.map((entry) => option(entry.id, entry.name, entry.id === Number(row.charmId))));
      const tier = document.createElement("select");
      tier.setAttribute("aria-label", `${creature.name} charm tier`);
      tier.replaceChildren(...[1, 2, 3].map((value) => option(value, `T${value}`, value === Number(row.charmTier))));
      tier.disabled = !row.charmId;
      charm.addEventListener("change", () => { row.charmId = charm.value ? Number(charm.value) : null; tier.disabled = !row.charmId; changed(); });
      tier.addEventListener("change", () => { row.charmTier = Number(tier.value); changed(); });
      element.append(identity, ratio, charm, tier, removeButton(() => {
        state.targets = state.targets.filter((candidate) => candidate !== row);
        renderTargets();
        changed();
      }));
      container.append(element);
    });
  }

  function addPerk() {
    const input = $("manualPerkSearch");
    const perk = matchByName("perks", input.value, (entry) => entry.selectable !== false && vocationAllows(entry));
    if (!perk) { input.setCustomValidity("Choose a perk from the list."); input.reportValidity(); return; }
    input.setCustomValidity("");
    if (!state.manualPerks.some((row) => row.id === perk.id)) state.manualPerks.push({ id: perk.id, value: perk.valueType === "stage" ? 1 : 0 });
    input.value = "";
    renderPerks();
    changed();
  }

  function addSpell() {
    const input = $("spellSearch");
    const matched = matchByName("spells", input.value, (entry) => entry.selectable !== false && vocationAllows(entry));
    if (!matched) { input.setCustomValidity("Choose a spell from the list."); input.reportValidity(); return; }
    input.setCustomValidity("");
    const spell = resolveStagedSpell(matched);
    if (!state.rotation.some((row) => row.id === spell.id)) state.rotation.push({ id: spell.id, targets: averageHitsFor(spell.name), ratio: 1 });
    input.value = "";
    renderRotation();
    renderPerks();
    changed();
  }

  function addTarget() {
    const input = $("creatureSearch");
    const creature = matchByName("creatures", input.value);
    if (!creature) { input.setCustomValidity("Choose a creature from the list."); input.reportValidity(); return; }
    input.setCustomValidity("");
    if (!state.targets.some((row) => row.id === creature.id)) state.targets.push({ id: creature.id, ratio: 1, charmId: null, charmTier: 1 });
    input.value = "";
    renderTargets();
    changed();
  }

  function setHuntLogStatus(message, isError) {
    const status = $("huntLogStatus");
    status.textContent = message;
    status.classList.toggle("dc-hunt-import-error", Boolean(isError));
  }

  function importHuntLog() {
    const input = $("huntAnalyserLog");
    const kills = parseHuntAnalyserKills(input.value);
    if (!kills) { setHuntLogStatus("Couldn't find a \"Killed Monsters\" section — paste the full session log.", true); return; }
    if (!kills.length) { setHuntLogStatus("No creatures found in that log.", true); return; }
    const total = kills.reduce((sum, kill) => sum + kill.count, 0);
    const unmatched = [];
    let added = 0;
    kills.forEach(({ name, count }) => {
      const creature = matchByName("creatures", name);
      if (!creature) { unmatched.push(name); return; }
      const ratio = Math.round((count / total) * 100) / 100;
      const existing = state.targets.find((row) => row.id === creature.id);
      if (existing) existing.ratio = ratio; else state.targets.push({ id: creature.id, ratio, charmId: null, charmTier: 1 });
      added++;
    });
    if (!added) { setHuntLogStatus(`Couldn't match any creatures from the log: ${unmatched.join(", ")}.`, true); return; }
    setHuntLogStatus(
      unmatched.length
        ? `Added ${added} target${added === 1 ? "" : "s"} with kill ratios. Couldn't match: ${unmatched.join(", ")}.`
        : `Added ${added} target${added === 1 ? "" : "s"} with kill ratios from the log.`,
      false,
    );
    input.value = "";
    renderTargets();
    changed();
  }

  function aggregatePerks(groups = [state.wheelPerks, state.proficiencyPerks, state.manualPerks]) {
    const totals = new Map();
    groups.flat().forEach((row) => {
      const perk = item("perks", row.id);
      const previous = totals.get(row.id);
      if (perk?.valueType === "stage") totals.set(row.id, Math.max(previous ?? 0, numberOrZero(row.value)));
      // Same as in mappedPlannerPerks: a spellId value is an id, not an amount to add up.
      else if (perk?.valueType === "spellId") totals.set(row.id, numberOrZero(row.value));
      else totals.set(row.id, (previous ?? 0) + numberOrZero(row.value));
    });
    return [...totals].map(([id, value]) => ({ id, value }));
  }

  function damageRequest({ wheel = true, proficiency = true, manual = true } = {}) {
    const stats = { vocation: state.stats.vocation };
    const usesMagicLevel = state.stats.vocation === "druid" || state.stats.vocation === "sorcerer";
    const apiStanceIds = [];
    const statMultipliers = {};
    const statAdders = {};
    state.stats.stanceIds.forEach((id) => {
      const mod = LOCAL_STANCE_MODS[id];
      if (!mod) { apiStanceIds.push(id); return; }
      if (mod.multiplier) statMultipliers[mod.stat] = (statMultipliers[mod.stat] ?? 1) * mod.multiplier;
      if (mod.addFromStat) statAdders[mod.stat] = (statAdders[mod.stat] ?? 0) + numberOrZero(state.stats[mod.addFromStat]) * mod.addFactor;
    });
    const statKeys = ["level", "bonus", "critChance", "critDamage", usesMagicLevel ? "magicLevel" : "skill"];
    if (state.stats.vocation === "paladin") statKeys.push("magicLevel");
    statKeys.forEach((key) => {
      const value = key === "bonus" && !wheel ? 0 : Number(state.stats[key]);
      if (!Number.isFinite(value)) return;
      const boosted = (statMultipliers[key] ? value * statMultipliers[key] : value) + (statAdders[key] ?? 0);
      // Skills and magic level are whole numbers in game, so a stance that adds a share of
      // another stat (Divine Defiance: 6% of distance fighting) or scales its own (Elemental
      // Synthesis) rounds to the nearest integer rather than handing the formula a fractional
      // magic level - which is what made otherwise-correct paladin builds come out slightly off.
      stats[key] = boosted === value ? value : Math.round(boosted);
    });
    const imbuementValue = Number(state.stats.imbuementValue);
    if (state.stats.vocation === "knight" && IMBUEMENT_ELEMENTS.includes(state.stats.imbuementElement) && IMBUEMENT_VALUES.includes(imbuementValue)) {
      stats.imbuementElement = state.stats.imbuementElement;
      stats.imbuementValue = imbuementValue;
    }
    if (apiStanceIds.length) stats.stanceIds = apiStanceIds;
    const weapon = { id: Number(state.weapon.id) || 1 };
    if (state.weapon.ammoId) weapon.ammoId = Number(state.weapon.ammoId);
    if (state.weapon.shieldId) weapon.shieldId = Number(state.weapon.shieldId);
    const rotation = state.rotation.flatMap((row) => {
      const spell = item("spells", row.id);
      const ids = spell?.bundledSpellIds?.length ? spell.bundledSpellIds : [row.id];
      return ids.map((id) => ({ id, targets: Math.max(0, numberOrZero(row.targets)), ...(id === 1 ? {} : { ratio: Math.max(0, numberOrZero(row.ratio)) }) }));
    });
    const targets = state.targets.map((row) => ({
      id: row.id,
      ratio: Math.max(0, numberOrZero(row.ratio)),
      ...(row.charmId ? { charmId: Number(row.charmId), charmTier: Number(row.charmTier) || 1 } : {}),
    }));
    const perkGroups = [];
    if (wheel) perkGroups.push(state.wheelPerks);
    if (proficiency) perkGroups.push(state.proficiencyPerks);
    if (manual) perkGroups.push(state.manualPerks);
    return { stats, weapon, perks: aggregatePerks(perkGroups), rotation, targets };
  }

  function changed() {
    saveState();
    if (savedName && !dirty) {
      dirty = true;
      updateBuildHeading(key);
      saveBuildMeta();
    }
  }

  // The stage of a staged spell comes from the wheel's *revelation* perk ("Spiritual Outburst",
  // "Twin Bursts", "Beam Mastery", ...), which the planner reports as its own summary row with a
  // "Stage N" value. It is read straight off those rows because state.wheelPerks can't carry it:
  // the damage API has no perk for the revelation itself, only percent perks named
  // "<Spell> base damage" / "... critical hit damage", so mappedPlannerPerks drops the revelation
  // row entirely. Matching those percent perks by name prefix instead (the previous approach) read
  // an augment's percentage as a stage, so a monk with Spiritual Outburst III but no Augmented
  // Spiritual Outburst scored stage 0 and lost the whole repeat hit, while any augment at all
  // pinned it to stage 3.
  function activeSpellStages() {
    const effects = state.wheelPlanner.effects ?? [];
    const result = {};
    Object.entries(STAGED_SCOPE_PERK).forEach(([scope, perkName]) => {
      // Older saved builds predate the planner's `group` field, so only reject a wrong group.
      // Names are compared punctuation-insensitively: the planner renders "Executioner's Throw"
      // with whichever apostrophe the client string uses.
      const effect = effects.find((entry) => (entry.group ?? "revelation") === "revelation"
        && plainName(entry.name) === plainName(perkName));
      result[scope] = effect ? revelationStage(effectText(effect)) : 0;
    });
    return result;
  }

  // The tier-matched card for a staged scope (Ice Burst, Terra Burst, the beam spells, ...) at
  // whatever stage the wheel currently has unlocked - "No Bonus" when the perk isn't active yet.
  // The stage 1-3 sibling cards are marked selectable:false (they're hidden from the spell
  // search so users can't add them directly) but that's exactly the card we need here, so
  // selectability isn't part of this match - only the search step (addSpell) should filter on it.
  function stagedSpellFor(scope) {
    const stage = activeSpellStages()[scope] ?? 0;
    return metadata.spells.find((candidate) => candidate.scope === scope && (candidate.stage ?? 0) === stage
      && vocationAllows(candidate));
  }

  // Swaps a matched spell for its wheel-stage-correct sibling card, so picking "Ice Burst" always
  // lands on the tier that matches the character's current Twin Bursts (etc.) stage.
  function resolveStagedSpell(spell) {
    if (!spell?.scope || !(spell.scope in STAGED_SCOPE_PERK)) return spell;
    return stagedSpellFor(spell.scope) ?? spell;
  }

  // Called whenever the wheel changes: re-points existing rotation rows at the sibling card for
  // their scope's new stage, so a rotation built before a wheel edit doesn't keep scoring the
  // stale tier.
  function syncStagedRotationStages() {
    let mutated = false;
    state.rotation = state.rotation.map((row) => {
      const spell = item("spells", row.id);
      if (!spell?.scope || !(spell.scope in STAGED_SCOPE_PERK)) return row;
      const staged = stagedSpellFor(spell.scope);
      if (!staged || staged.id === row.id) return row;
      mutated = true;
      return { ...row, id: staged.id };
    });
    if (mutated) renderRotation();
    return mutated;
  }

  function visibleResultSpells(spells) {
    // The API returns every vocation spell regardless of what's in the rotation request, so
    // this filter is what actually narrows the results down to the rotation the user built -
    // plus, for staged beam/burst spells, the tier-matched companion card (e.g. the "Sides"
    // hit of Great Energy Beam) even though only the "Central" id was added to the rotation.
    const stages = activeSpellStages();
    const rotationIds = new Set(state.rotation.flatMap((row) => {
      const meta = item("spells", row.id);
      return meta?.bundledSpellIds?.length ? meta.bundledSpellIds : [row.id];
    }));
    const rotationScopes = new Set(state.rotation.map((row) => item("spells", row.id)?.scope).filter(Boolean));
    return spells.filter((spell) => {
      if (rotationIds.has(spell.id)) return true;
      const meta = item("spells", spell.id);
      const scope = meta?.scope;
      if (!scope || !rotationScopes.has(scope) || !(scope in STAGED_SCOPE_PERK)) return false;
      const active = stages[scope] ?? 0;
      return active > 0 && (meta.stage ?? 0) === active;
    });
  }

  async function calculate() {
    requestController?.abort();
    requestController = new AbortController();
    lastResult = await fetchDamage(damageRequest(), requestController.signal);
    hasCalculated = true;
  }

  function saveState() {
    saveAllState();
  }

  function shareableBuild() {
    return shareableFromState(state);
  }

  function replaceState(nextState) {
    state = nextState;
    hasCalculated = false;
    lastResult = null;
    savedName = null;
    dirty = false;
    saveState();
    saveBuildMeta();
    populateStaticControls();
    updateBuildHeading(key);
    renderComparisonColumnLabels();
  }

  function reset() {
    replaceState(defaultState());
  }

  function wireEvents() {
    root.querySelectorAll("[data-stat]").forEach((control) => {
      control.addEventListener("input", () => {
        const statKey = control.dataset.stat;
        // imbuementValue is a <select>, so it would arrive as a string ("0.5") - the API wants a
        // number, and this is the single place that coercion happens.
        state.stats[statKey] = statKey === "imbuementValue"
          ? numberOrZero(control.value)
          : control.tagName === "SELECT" || statKey === "imbuementElement" ? control.value : numberOrZero(control.value);
        if (statKey === "imbuementElement") {
          // Picking an element with no tier yet lands on Powerful, the tier most builds run;
          // clearing the element clears the tier so nothing stale is ever sent.
          if (!state.stats.imbuementElement) state.stats.imbuementValue = 0;
          else if (!IMBUEMENT_VALUES.includes(Number(state.stats.imbuementValue))) state.stats.imbuementValue = DEFAULT_IMBUEMENT_VALUE;
          renderImbuement();
        }
        if (statKey === "vocation") {
          state.stats.stanceIds = [];
          state.stats.bonus = 0;
          state.stats.imbuementElement = "";
          state.stats.imbuementValue = 0;
          if (state.stats.vocation === "paladin") state.stats.magicLevel = DEFAULT_PALADIN_MAGIC_LEVEL;
          if (state.stats.vocation === "druid" || state.stats.vocation === "sorcerer") state.stats.magicLevel = DEFAULT_CASTER_MAGIC_LEVEL;
          if (DEFAULT_SKILL_BY_VOCATION[state.stats.vocation]) state.stats.skill = DEFAULT_SKILL_BY_VOCATION[state.stats.vocation];
          state.wheelPlanner = { code: "", vocation: state.stats.vocation, promotionPoints: 0, bonus: 0, effects: [], gemGrades: {} };
          state.proficiencyPlanner = { token: "", weaponName: "", weaponSprite: "", vocation: state.stats.vocation, effects: [] };
          state.manualPerks = state.manualPerks.filter((row) => vocationAllows(item("perks", row.id)));
          state.rotation = state.rotation.filter((row) => vocationAllows(item("spells", row.id)));
          const autoAttackRow = state.rotation.find((row) => row.id === 1);
          if (autoAttackRow) autoAttackRow.targets = state.stats.vocation === "paladin" ? 6 : 1;
          state.wheelPerks = mappedPlannerPerks("wheel");
          state.proficiencyPerks = mappedPlannerPerks("proficiency");
          populateStaticControls();
        }
        changed();
      });
    });
    root.querySelectorAll("[data-add-perk]").forEach((button) => button.addEventListener("click", addPerk));
    $("addSpell").addEventListener("click", addSpell);
    $("rotationPresetSelect").addEventListener("change", applyRotationPreset);
    $("addTarget").addEventListener("click", addTarget);
    $("importHuntLog").addEventListener("click", importHuntLog);
    $("manualPerkSearch").addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); addPerk(); } });
    $("spellSearch").addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); addSpell(); } });
    $("creatureSearch").addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); addTarget(); } });
    $("ammoSelect").addEventListener("change", (event) => { state.weapon.ammoId = event.target.value ? Number(event.target.value) : null; changed(); });
    $("shieldSelect").addEventListener("change", (event) => { state.weapon.shieldId = event.target.value ? Number(event.target.value) : null; changed(); });
    root.querySelectorAll("[data-open-planner]").forEach((button) => button.addEventListener("click", () => openPlanner(build, button.dataset.openPlanner)));
  }

  const build = {
    key,
    root,
    $,
    get state() { return state; },
    set state(value) { state = value; },
    get hasCalculated() { return hasCalculated; },
    get lastResult() { return lastResult; },
    get savedName() { return savedName; },
    get dirty() { return dirty; },
    markSaved,
    restoreMeta,
    vocationAllows,
    populateStaticControls,
    renderStatControls,
    renderSyncedEffects,
    renderEquipment,
    mappedPlannerPerks,
    visibleResultSpells,
    syncStagedRotationStages,
    wireEvents,
    changed,
    calculate,
    replaceState,
    reset,
    shareableBuild,
  };
  return build;
}

// ---------------------------------------------------------------------------
// Shared state that spans both builds: combined save/share, the planner
// modal (a singleton editing whichever build is "active"), tab switching
// and the Results-tab comparison.
// ---------------------------------------------------------------------------

const builds = { a: createBuild("a"), b: createBuild("b") };

function saveAllState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ a: builds.a.state, b: builds.b.state }));
  syncBuildUrl();
}

// Keeps the address bar in step with the builds, the way /weapon-proficiency.html already does.
// "Copy build link" always encodes the live state, so it was never stale - but someone who opened
// a link, tweaked it, then copied the URL straight out of the browser would have re-shared the
// ORIGINAL build without noticing. This closes that gap, and incidentally rewrites an old-format
// link to the short one as soon as the page settles.
const SHARE_TOKEN_KEY = "tibiapalDamageShareTokenV1";
// Long enough that typing a level doesn't deflate a payload per keystroke, short enough that the
// URL is current by the time anyone reaches for the address bar.
const URL_SYNC_DEBOUNCE_MS = 500;
let urlSyncReady = false;
let urlSyncTimer = null;
let urlSyncSequence = 0;

// sessionStorage throws outright in some privacy modes rather than just failing to persist.
function sessionStorageItem(key) {
  try { return sessionStorage.getItem(key); } catch { return null; }
}

function syncBuildUrl() {
  // Boot calls saveAllState() while the builds are still being wired up; nothing goes into the
  // URL until the page is actually ready (see the tail of loadMetadata).
  if (!urlSyncReady) return;
  window.clearTimeout(urlSyncTimer);
  urlSyncTimer = window.setTimeout(async () => {
    const sequence = ++urlSyncSequence;
    let token = null;
    // An untouched calculator gets a clean URL rather than a token describing nothing; resetting
    // both builds takes the param back off again.
    if (!buildsAreDefault()) {
      try {
        token = await encodeShareToken(shareableBuilds());
      } catch (error) {
        console.warn("Could not mirror the build into the URL", error);
        return;
      }
      // Encoding is async (deflate), so a slow earlier run must not land on top of a newer one.
      if (sequence !== urlSyncSequence) return;
    }
    const url = new URL(window.location.href);
    if ((url.searchParams.get("build") ?? null) === token) return;
    if (token === null) url.searchParams.delete("build");
    else url.searchParams.set("build", token);
    // replaceState, never pushState: every edit would otherwise become a Back-button step.
    window.history.replaceState(null, "", url.href);
    // Remember what we wrote so a refresh can tell our own mirror from a link the user was
    // genuinely sent — see isSharedLink in loadMetadata. sessionStorage is per-tab, so two tabs
    // editing different builds don't confuse each other.
    try { sessionStorage.setItem(SHARE_TOKEN_KEY, token ?? ""); } catch { /* private mode - not important */ }
  }, URL_SYNC_DEBOUNCE_MS);
}

function buildsAreDefault() {
  const fallback = JSON.stringify(compactBuild(shareableFromState(defaultState())));
  return ["a", "b"].every((key) => JSON.stringify(compactBuild(builds[key].shareableBuild())) === fallback);
}

// Which named saved build (if any) each tab currently reflects, so a refresh reopens the same
// preset instead of a generically-labeled "Build A/B" — even though the draft content in
// STORAGE_KEY already survives a refresh on its own.
function saveBuildMeta() {
  localStorage.setItem(BUILD_META_KEY, JSON.stringify({
    a: { savedName: builds.a.savedName, dirty: builds.a.dirty },
    b: { savedName: builds.b.savedName, dirty: builds.b.dirty },
  }));
}

function loadBuildMeta() {
  try {
    const stored = JSON.parse(localStorage.getItem(BUILD_META_KEY));
    return stored && typeof stored === "object" ? stored : {};
  } catch { return {}; }
}

function shareableBuilds() {
  return { a: builds.a.shareableBuild(), b: builds.b.shareableBuild() };
}

function loadStoredBuilds() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored && typeof stored === "object") return { a: sanitizeState(stored.a), b: sanitizeState(stored.b) };
  } catch { /* ignore malformed storage */ }
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY));
    if (legacy) return { a: sanitizeState(legacy), b: defaultState() };
  } catch { /* ignore malformed storage */ }
  return { a: defaultState(), b: defaultState() };
}

async function restoreBuilds() {
  const shared = new URLSearchParams(window.location.search).get("build");
  if (shared) {
    try {
      const decoded = await decodeShareToken(shared);
      // A link that only carries Build A leaves Build B on its defaults.
      return { a: sanitizeState(decoded.a), b: decoded.b ? sanitizeState(decoded.b) : defaultState() };
    } catch (error) { console.warn("Ignored invalid shared damage build", error); }
  }
  return loadStoredBuilds();
}

function setupEffectsInfo() {
  document.querySelectorAll(".dc-info").forEach((info) => {
    const toggle = info.querySelector(".dc-info-toggle");
    const popover = info.querySelector(".dc-info-popover");
    let hideTimer = null;
    const place = () => {
      const rect = toggle.getBoundingClientRect();
      const width = popover.offsetWidth;
      const left = Math.max(10, Math.min(rect.left, window.innerWidth - width - 10));
      popover.style.top = `${rect.bottom + 8}px`;
      popover.style.left = `${left}px`;
    };
    const open = () => { window.clearTimeout(hideTimer); info.classList.add("open"); toggle.setAttribute("aria-expanded", "true"); place(); };
    const close = () => { info.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); };
    toggle.addEventListener("click", (event) => { event.stopPropagation(); info.classList.contains("open") ? close() : open(); });
    info.addEventListener("mouseenter", open);
    info.addEventListener("mouseleave", () => { hideTimer = window.setTimeout(close, 160); });
    popover.addEventListener("mouseenter", () => window.clearTimeout(hideTimer));
    document.addEventListener("click", (event) => { if (!info.contains(event.target)) close(); });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") close(); });
    window.addEventListener("scroll", () => { if (info.classList.contains("open")) place(); }, true);
    window.addEventListener("resize", () => { if (info.classList.contains("open")) place(); });
  });
}

// Setting an iframe's src to a new URL doesn't tear down its current document immediately —
// the outgoing document keeps running (and can still fetch/postMessage) until the new one
// finishes loading. Both embedded planners publish their state proactively (not just in reply
// to a request), so a slow-loading outgoing document can report its stale vocation/build after
// we've already moved on. Mark a frame "pending" whenever we point it at a new URL so the
// message handler can ignore anything that arrives before the matching "load" event confirms
// the new document is the one actually talking to us.

// The embedded planner pages re-fetch their own data and re-render in a couple of visible
// steps as they boot (default weapon, then the actual saved build), which otherwise reads as
// the window "flashing" a few times right after it opens. Cover the frame with a spinner
// while a navigation is in flight and only lift it once the frame's settled build has been
// received, so the user sees a single loading state instead of that flicker.
function setPlannerLoading(name, loading) {
  const overlay = document.querySelector(`#${name}PlannerLoading`);
  window.clearTimeout(plannerLoadingTimers[name]);
  if (loading) {
    plannerLoadingShownAt[name] = Date.now();
    if (overlay) overlay.hidden = false;
    // Safety net: if the frame never reports back (e.g. a network hiccup), don't leave the
    // user staring at a spinner forever.
    plannerLoadingTimers[name] = window.setTimeout(() => setPlannerLoading(name, false), 8000);
    return;
  }
  const remaining = PLANNER_LOADING_MIN_MS - (Date.now() - plannerLoadingShownAt[name]);
  if (remaining > 0) plannerLoadingTimers[name] = window.setTimeout(() => { if (overlay) overlay.hidden = true; }, remaining);
  else if (overlay) overlay.hidden = true;
}

function setPlannerFrameSrc(frame, url) {
  if (frame.getAttribute("src") !== url) frame.dataset.pendingNav = "1";
  frame.src = url;
}

function initializePlannerFrames(build) {
  setPlannerFrameSrc(document.querySelector("#wheelPlannerFrame"), plannerUrl("/wheel-planner.html", { embed: "damage", v: "20260815-2", vocation: build.state.stats.vocation, code: build.state.wheelPlanner.code }));
  setPlannerFrameSrc(document.querySelector("#proficiencyPlannerFrame"), plannerUrl("/weapon-proficiency.html", { embed: "damage", v: "20260815-1", vocation: build.state.stats.vocation, build: build.state.proficiencyPlanner.token }));
}

// Silently resolves a build's wheel code / proficiency token into perks via the hidden
// hydrate iframes, for whichever build isn't backed by the live modal iframes (see the
// module-level comment above wheelHydrateKey). No-ops for a build with nothing to resolve
// or whose effects are already populated (e.g. its editor has already been opened).
function hydrateInactiveBuild(build) {
  if (build.state.wheelPlanner.code && !build.state.wheelPlanner.effects.length) {
    wheelHydrateKey = build.key;
    document.querySelector("#wheelHydrateFrame").src = plannerUrl("/wheel-planner.html", { embed: "damage", v: "20260815-2", vocation: build.state.stats.vocation, code: build.state.wheelPlanner.code });
  }
  if (build.state.proficiencyPlanner.token && !build.state.proficiencyPlanner.effects.length) {
    proficiencyHydrateKey = build.key;
    document.querySelector("#proficiencyHydrateFrame").src = plannerUrl("/weapon-proficiency.html", { embed: "damage", v: "20260815-1", vocation: build.state.stats.vocation, build: build.state.proficiencyPlanner.token });
  }
}

function syncWheelGrades(build) {
  document.querySelector("#wheelPlannerFrame").contentWindow?.postMessage({
    type: "tibiapal:set-wheel-grades",
    grades: build.state.wheelPlanner.gemGrades,
  }, window.location.origin);
}

function syncPlannerVocation(build, target = "both") {
  const message = { type: "tibiapal:set-vocation", vocation: build.state.stats.vocation };
  if (target !== "proficiency") document.querySelector("#wheelPlannerFrame").contentWindow?.postMessage(message, window.location.origin);
  if (target !== "wheel") document.querySelector("#proficiencyPlannerFrame").contentWindow?.postMessage(message, window.location.origin);
}

const WHEEL_PRESETS_KEY = "tibiapalWheelPresetsV1";
const WHEEL_CODE_PATTERN = /^[-_.~a-zA-Z0-9]{3,90}$/;

function resetWheelPlanner() {
  document.querySelector("#wheelPlannerFrame").contentWindow?.postMessage({ type: "tibiapal:reset-wheel" }, window.location.origin);
}

function parseWheelCode(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  try { const parsed = new URL(trimmed).searchParams.get("code"); if (parsed) return parsed.trim(); } catch { /* not a full URL */ }
  const match = trimmed.match(/[?&]code=([^&\s]+)/i);
  return match ? decodeURIComponent(match[1]).trim() : trimmed;
}

function setWheelImportError(message) {
  const element = document.querySelector("#wheelImportError");
  if (!element) return;
  element.textContent = message ?? "";
  element.hidden = !message;
}

function importWheelCode(build, value) {
  const code = parseWheelCode(value);
  if (!WHEEL_CODE_PATTERN.test(code)) { setWheelImportError("Enter a valid wheel link or code."); return false; }
  setWheelImportError("");
  build.state.wheelPlanner.code = code;
  document.querySelector("#wheelPlannerFrame").contentWindow?.postMessage({ type: "tibiapal:import-wheel-code", code }, window.location.origin);
  return true;
}

function importWheelFromInput() {
  const build = builds[activeBuildKey];
  if (!build) return;
  const input = document.querySelector("#wheelImportInput");
  if (importWheelCode(build, input.value)) input.value = "";
}

function loadWheelPresets() {
  try { const stored = JSON.parse(localStorage.getItem(WHEEL_PRESETS_KEY)); return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {}; }
  catch { return {}; }
}

function wheelPresetsFor(vocation) {
  const list = loadWheelPresets()[vocation];
  return Array.isArray(list) ? list.filter((entry) => entry && typeof entry.name === "string" && typeof entry.code === "string") : [];
}

function refreshWheelPresetOptions(build, selectedName = "") {
  const select = document.querySelector("#wheelPresetSelect");
  if (!select) return;
  const presets = wheelPresetsFor(build.state.stats.vocation);
  select.replaceChildren(option("", presets.length ? "Choose a saved wheel…" : "No saved wheels"), ...presets.map((preset) => option(preset.name, preset.name)));
  select.value = selectedName;
  document.querySelector("#wheelPresetLoad").disabled = !presets.length;
  document.querySelector("#wheelPresetDelete").disabled = !presets.length;
}

function saveCurrentWheelPreset(build) {
  const code = String(build.state.wheelPlanner.code ?? "").trim();
  if (!WHEEL_CODE_PATTERN.test(code)) { setWheelImportError("Build or import a wheel before saving it as a preset."); return; }
  const selectedName = document.querySelector("#wheelPresetSelect")?.value ?? "";
  const name = window.prompt("Name this wheel preset:", selectedName)?.trim();
  if (!name) return;
  const vocation = build.state.stats.vocation;
  const all = loadWheelPresets();
  const list = wheelPresetsFor(vocation);
  const index = list.findIndex((preset) => preset.name.toLowerCase() === name.toLowerCase());
  if (index >= 0) list[index] = { name, code }; else list.push({ name, code });
  all[vocation] = list;
  localStorage.setItem(WHEEL_PRESETS_KEY, JSON.stringify(all));
  refreshWheelPresetOptions(build, name);
}

function loadSelectedWheelPreset(build) {
  const name = document.querySelector("#wheelPresetSelect").value;
  if (!name) return;
  const preset = wheelPresetsFor(build.state.stats.vocation).find((entry) => entry.name === name);
  if (preset) importWheelCode(build, preset.code);
}

function deleteSelectedWheelPreset(build) {
  const name = document.querySelector("#wheelPresetSelect").value;
  if (!name || !window.confirm(`Delete saved wheel "${name}"?`)) return;
  const all = loadWheelPresets();
  all[build.state.stats.vocation] = wheelPresetsFor(build.state.stats.vocation).filter((preset) => preset.name !== name);
  localStorage.setItem(WHEEL_PRESETS_KEY, JSON.stringify(all));
  refreshWheelPresetOptions(build);
}

const PROFICIENCY_TOKEN_PATTERN = /^[-_A-Za-z0-9]{4,}$/;

function parseProficiencyToken(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  try { const parsed = new URL(trimmed).searchParams.get("build"); if (parsed) return parsed.trim(); } catch { /* not a full URL */ }
  const match = trimmed.match(/[?&]build=([^&\s]+)/i);
  return match ? decodeURIComponent(match[1]).trim() : trimmed;
}

function setProficiencyImportError(message) {
  const element = document.querySelector("#proficiencyImportError");
  if (!element) return;
  element.textContent = message ?? "";
  element.hidden = !message;
}

function importProficiencyBuild(build, value) {
  const token = parseProficiencyToken(value);
  if (!PROFICIENCY_TOKEN_PATTERN.test(token)) { setProficiencyImportError("Enter a valid proficiency link or code."); return false; }
  setProficiencyImportError("");
  build.state.proficiencyPlanner.token = token;
  document.querySelector("#proficiencyPlannerFrame").contentWindow?.postMessage({ type: "tibiapal:load-proficiency-build", token }, window.location.origin);
  return true;
}

function importProficiencyFromInput() {
  const build = builds[activeBuildKey];
  if (!build) return;
  const input = document.querySelector("#proficiencyImportInput");
  if (importProficiencyBuild(build, input.value)) input.value = "";
}

// ---------------------------------------------------------------------------
// Named saved builds: a shared library (not tied to Build A or B specifically)
// that can be saved from, and loaded into, either tab. Unlike the STORAGE_KEY
// draft above, these only ever change when the user explicitly saves.
// ---------------------------------------------------------------------------

const SAVED_BUILDS_KEY = "tibiapalSavedBuildsV1";

function loadSavedBuilds() {
  try {
    const stored = JSON.parse(localStorage.getItem(SAVED_BUILDS_KEY));
    return Array.isArray(stored) ? stored.filter((entry) => entry && typeof entry.name === "string" && entry.state && typeof entry.state === "object") : [];
  } catch { return []; }
}

function persistSavedBuilds(list) {
  localStorage.setItem(SAVED_BUILDS_KEY, JSON.stringify(list));
}

function refreshSavedBuildOptions(key, selectedName = "") {
  const select = document.querySelector(`#savedBuildSelect-${key}`);
  if (!select) return;
  const savedList = loadSavedBuilds();
  select.replaceChildren(option("", savedList.length ? "Choose a saved build…" : "No saved builds"), ...savedList.map((entry) => option(entry.name, entry.name)));
  select.value = selectedName;
  document.querySelector(`#savedBuildDelete-${key}`).disabled = !savedList.length;
}

function refreshAllSavedBuildOptions() {
  refreshSavedBuildOptions("a", builds.a.savedName ?? "");
  refreshSavedBuildOptions("b", builds.b.savedName ?? "");
}

function updateBuildHeading(key) {
  const build = builds[key];
  if (!build) return;
  const defaultLabel = `Build ${key.toUpperCase()}`;
  const label = build.savedName ?? defaultLabel;
  const tabButton = document.querySelector(`#damageTabs [data-dc-tab="${key}"]`);
  const resultHeading = document.querySelector(`#buildHeading-${key}`);
  [tabButton, resultHeading].forEach((element) => {
    if (!element) return;
    element.textContent = label;
    if (build.dirty) {
      const marker = document.createElement("span");
      marker.className = "dc-unsaved-marker";
      marker.title = "Unsaved changes";
      marker.textContent = " •";
      element.append(marker);
    }
  });
}

function saveCurrentBuild(build) {
  const name = window.prompt("Name this build:", build.savedName ?? "")?.trim();
  if (!name) return;
  const list = loadSavedBuilds();
  const index = list.findIndex((entry) => entry.name.toLowerCase() === name.toLowerCase());
  const entry = { name, state: build.shareableBuild(), savedAt: Date.now() };
  if (index >= 0) list[index] = entry; else list.push(entry);
  persistSavedBuilds(list);
  build.markSaved(name);
  refreshAllSavedBuildOptions();
}

function loadSelectedSavedBuild(build) {
  const select = document.querySelector(`#savedBuildSelect-${build.key}`);
  const name = select.value;
  if (!name) return;
  const entry = loadSavedBuilds().find((candidate) => candidate.name === name);
  if (!entry) return;
  if (build.dirty) {
    const current = build.savedName ?? `Build ${build.key.toUpperCase()}`;
    if (!window.confirm(`Discard unsaved changes to "${current}" and load "${name}"?`)) {
      select.value = build.savedName ?? "";
      return;
    }
  }
  build.replaceState(sanitizeState(entry.state));
  build.markSaved(entry.name);
  refreshSavedBuildOptions(build.key, entry.name);
}

function deleteSelectedSavedBuild(key) {
  const select = document.querySelector(`#savedBuildSelect-${key}`);
  const name = select?.value;
  if (!name || !window.confirm(`Delete saved build "${name}"?`)) return;
  persistSavedBuilds(loadSavedBuilds().filter((entry) => entry.name !== name));
  ["a", "b"].forEach((buildKey) => {
    if (builds[buildKey].savedName === name) builds[buildKey].markSaved(null);
  });
  refreshAllSavedBuildOptions();
}

function openPlanner(build, name) {
  activeBuildKey = build.key;
  const wheel = document.querySelector("#wheelPlannerFrame");
  const proficiency = document.querySelector("#proficiencyPlannerFrame");
  wheel.hidden = name !== "wheel";
  proficiency.hidden = name !== "proficiency";
  document.querySelector("#plannerModalTitle").textContent = `${name === "wheel" ? "Edit Wheel of Destiny" : "Edit Weapon Proficiency"} — Build ${build.key.toUpperCase()}`;
  plannerModal.dataset.planner = name;
  const points = document.querySelector("#plannerModalPoints");
  points.hidden = name !== "wheel";
  points.querySelector("strong").textContent = Number(build.state.wheelPlanner.promotionPoints ?? 0).toLocaleString("en-US");
  document.querySelector("#wheelToolbar").hidden = name !== "wheel";
  document.querySelector("#proficiencyToolbar").hidden = name !== "proficiency";
  if (name === "wheel") { setWheelImportError(""); refreshWheelPresetOptions(build); }
  if (name === "proficiency") setProficiencyImportError("");
  window.clearTimeout(plannerCloseTimer);
  plannerModal.classList.remove("dc-closing");
  plannerModal.hidden = false;
  document.body.style.overflow = "hidden";
  const previousWheelSrc = wheel.getAttribute("src");
  const previousProficiencySrc = proficiency.getAttribute("src");
  initializePlannerFrames(build);
  // Only the planner actually on screen needs a spinner — the other one navigates silently
  // in the background (its content isn't visible either way). Show it even when the frame
  // isn't navigating: the modal is still animating/settling into view at this point, and the
  // spinner is cheaper cover for that than trying to guarantee the frame underneath never
  // shows a stray frame of its own.
  setPlannerLoading("wheel", name === "wheel");
  setPlannerLoading("proficiency", name === "proficiency");
  if (name === "wheel") {
    syncWheelGrades(build);
    // If the src didn't change, the iframe won't navigate and no "load" event will fire to
    // request a fresh build — safe to ask immediately since no navigation is racing us. If it
    // did change, wait for the "load" listener below: requesting now can hit the outgoing
    // (stale) document mid-navigation, which reports its old vocation and corrupts our state.
    if (wheel.getAttribute("src") === previousWheelSrc) {
      wheel.contentWindow?.postMessage({ type: "tibiapal:request-wheel-build" }, window.location.origin);
    }
  }
  if (name === "proficiency" && proficiency.getAttribute("src") === previousProficiencySrc) {
    proficiency.contentWindow?.postMessage({ type: "tibiapal:request-proficiency-build" }, window.location.origin);
  }
}

function closePlanner() {
  if (plannerModal.hidden || plannerModal.classList.contains("dc-closing")) return;
  plannerModal.classList.add("dc-closing");
  window.clearTimeout(plannerCloseTimer);
  plannerCloseTimer = window.setTimeout(() => {
    plannerModal.hidden = true;
    plannerModal.classList.remove("dc-closing");
    document.body.style.overflow = "";
    activeBuildKey = null;
  }, 280);
}

// Both planner iframes proactively push their current build on every "load" (not just in
// response to an actual edit) — including the boot-time hydration right after a saved build
// restores. Diff against the pre-sync snapshot so that harmless echoes of state we already
// have don't flip a freshly-loaded (or freshly-saved) build to "unsaved changes".
function receiveWheelBuild(build, payload) {
  if (!payload || typeof payload !== "object") return;
  const state = build.state;
  // wheelPerks is a pure derivative of wheelPlanner.effects (already covered below) recomputed
  // via mappedPlannerPerks(), so it's left out here — after a restore its key order differs from
  // a value restored through sanitizeState's rows() helper even when the content is identical.
  const before = JSON.stringify({ wheelPlanner: state.wheelPlanner, bonus: state.stats.bonus, vocation: state.stats.vocation });
  const { gemGrades, gradesHydrated, ...plannerPayload } = payload;
  state.wheelPlanner = { ...state.wheelPlanner, ...plannerPayload, effects: Array.isArray(payload.effects) ? payload.effects : [] };
  if (gradesHydrated && gemGrades && typeof gemGrades === "object" && !Array.isArray(gemGrades)) state.wheelPlanner.gemGrades = gemGrades;
  state.stats.bonus = numberOrZero(payload.bonus);
  if (metadata.vocations.some((entry) => entry.id === payload.vocation) && state.stats.vocation !== payload.vocation) {
    state.stats.vocation = payload.vocation;
    state.stats.stanceIds = [];
    state.rotation = state.rotation.filter((row) => build.vocationAllows(item("spells", row.id)));
    state.manualPerks = state.manualPerks.filter((row) => build.vocationAllows(item("perks", row.id)));
    build.populateStaticControls();
    syncPlannerVocation(build, "proficiency");
  }
  state.wheelPerks = build.mappedPlannerPerks("wheel");
  build.syncStagedRotationStages();
  build.renderStatControls();
  build.renderSyncedEffects("wheel");
  document.querySelector("#plannerModalPoints strong").textContent = Number(payload.promotionPoints ?? 0).toLocaleString("en-US");
  const after = JSON.stringify({ wheelPlanner: state.wheelPlanner, bonus: state.stats.bonus, vocation: state.stats.vocation });
  if (before !== after) build.changed();
}

function receiveProficiencyBuild(build, payload) {
  if (!payload || typeof payload !== "object") return;
  const state = build.state;
  // proficiencyPerks is likewise a pure derivative of proficiencyPlanner.effects — left out for
  // the same reason as wheelPerks above.
  const before = JSON.stringify({ proficiencyPlanner: state.proficiencyPlanner, weapon: state.weapon });
  const previousWeapon = Number(state.weapon.id);
  state.proficiencyPlanner = { ...state.proficiencyPlanner, ...payload, effects: Array.isArray(payload.effects) ? payload.effects : [] };
  const weapon = metadata.weapons.find((candidate) => normalized(candidate.name) === normalized(payload.weaponName));
  if (weapon) {
    state.weapon.id = weapon.id;
    if (previousWeapon !== weapon.id) { state.weapon.ammoId = defaultAmmoId(weapon); state.weapon.shieldId = null; }
  }
  state.wheelPerks = build.mappedPlannerPerks("wheel");
  state.proficiencyPerks = build.mappedPlannerPerks("proficiency");
  build.renderEquipment();
  build.renderSyncedEffects("proficiency");
  // Wheel perks can depend on the weapon too (Ballistic Mastery's bow/crossbow branch,
  // Battle Instinct's weapon skill), so their chips and dropdowns refresh with it.
  build.renderSyncedEffects("wheel");
  const after = JSON.stringify({ proficiencyPlanner: state.proficiencyPlanner, weapon: state.weapon });
  if (before !== after) build.changed();
}

function filterResultCards(query) {
  let visibleTotal = 0;
  let cardTotal = 0;
  document.querySelectorAll("#compareResults .dc-result-group").forEach((group) => {
    let visible = 0;
    const cards = [...group.querySelectorAll(".dc-result-card")];
    cardTotal += cards.length;
    cards.forEach((card) => {
      const matches = !query || card.dataset.filterText.includes(query);
      card.hidden = !matches;
      if (matches) visible += 1;
    });
    group.hidden = visible === 0;
    const count = group.querySelector("[data-result-count]");
    if (count) count.textContent = `${visible} result${visible === 1 ? "" : "s"}`;
    visibleTotal += visible;
  });
  const empty = document.querySelector("#resultFilterEmpty");
  if (empty) empty.hidden = cardTotal === 0 || visibleTotal > 0;
}

function renderComparisonColumnLabels() {
  document.querySelector("#compareColLabel-a").textContent = builds.a.savedName ?? "Build A";
  document.querySelector("#compareColLabel-b").textContent = builds.b.savedName ?? "Build B";
}

function renderComparisonSummary(a, b) {
  document.querySelectorAll("#compareSummary .dc-cmp-row").forEach((row) => {
    const summaryKey = row.dataset.summaryKey;
    const aValue = Number(a.summary?.[summaryKey]);
    const bValue = Number(b.summary?.[summaryKey]);
    const aEl = row.querySelector(".dc-cmp-value-a");
    const bEl = row.querySelector(".dc-cmp-value-b");
    aEl.textContent = formatDamage(aValue);
    bEl.textContent = formatDamage(bValue);
    const pct = percentDiff(bValue, aValue);
    row.querySelector(".dc-diff-badge-slot").replaceChildren(diffBadgeEl(pct));
    applyWinnerHighlight(aEl, bEl, aValue, bValue);
  });
}

// A single row per spell, showing both builds' values side by side - instead of two
// independent A/B lists, which duplicated every icon/name and made the tab twice as tall.
// iconFn is swappable because the "Save image" export reuses this same row layout but needs
// html2canvas-safe icons (see exportSpellIcon) instead of the CSS sprite-sheet fallback.
function comparisonResultRow(name, spellMeta, aSpell, bSpell, iconFn = resultIcon) {
  const row = document.createElement("article");
  row.className = `dc-result-card dc-cmp-row${spellMeta?.spellType === "rune" ? " dc-result-card-rune" : ""}`;
  row.dataset.filterText = normalized([name, spellMeta?.name, spellMeta?.spellType, spellMeta?.element].filter(Boolean).join(" "));
  const identity = document.createElement("div");
  identity.className = "dc-result-identity";
  const nameEl = document.createElement("strong"); nameEl.textContent = name;
  // The row is a single number covering every hit of the cast, so name them on hover rather than
  // splitting the row - see mergeStagedResults().
  const hitLabels = aSpell?.hitLabels ?? bSpell?.hitLabels;
  if (hitLabels?.length > 1) nameEl.title = `${hitLabels.length} hits per cast: ${hitLabels.join(" + ")}`;
  identity.append(iconFn({ name }, spellMeta), nameEl);
  const aValue = Number(spellMetric(aSpell, "effective", "avg"));
  const bValue = Number(spellMetric(bSpell, "effective", "avg"));
  const aEl = document.createElement("span"); aEl.className = "dc-cmp-value dc-cmp-value-a"; aEl.textContent = aSpell ? formatDamage(aValue) : "—";
  const bEl = document.createElement("span"); bEl.className = "dc-cmp-value dc-cmp-value-b"; bEl.textContent = bSpell ? formatDamage(bValue) : "—";
  const pct = aSpell && bSpell ? percentDiff(bValue, aValue) : null;
  applyWinnerHighlight(aEl, bEl, aSpell ? aValue : NaN, bSpell ? bValue : NaN);
  row.append(identity, aEl, diffBadgeEl(pct), bEl);
  return row;
}

function comparisonResultGroup(title, entries, iconFn = resultIcon) {
  const section = document.createElement("section");
  section.className = "dc-result-group";
  const heading = document.createElement("header");
  heading.className = "dc-result-group-heading";
  const name = document.createElement("strong"); name.textContent = title;
  const count = document.createElement("span"); count.dataset.resultCount = ""; count.textContent = `${entries.length} result${entries.length === 1 ? "" : "s"}`;
  const grid = document.createElement("div"); grid.className = "dc-result-grid";
  grid.append(...entries.map((entry) => comparisonResultRow(entry.name, entry.meta, entry.aSpell, entry.bSpell, iconFn)));
  heading.append(name, count); section.append(heading, grid);
  return section;
}

// A staged scope's wheel-unlocked extra hit (Spiritual Outburst's Repeat, the beams' Sides,
// Ice/Terra Burst's Green HP, Executioner's Throw's Red HP) is its own API card, but it always
// lands on the same cast as the base card and is sent with the same target count - so the two are
// folded into one row here. Reading them as separate same-named rows made a working Repeat hit
// look like it wasn't counted at all, and the API's own per-turn total already sums them.
function mergeStagedResults(spells) {
  const sum = (left, right) => {
    const total = Number(left) + Number(right);
    return Number.isFinite(total) ? total : null;
  };
  const byId = new Map(spells.map((spell) => [String(spell.id), spell]));
  const combined = new Map();
  const absorbed = new Set();
  spells.forEach((spell) => {
    const meta = item("spells", spell.id);
    if (!meta?.isExtra) return;
    const baseId = (meta.bundledSpellIds ?? []).map(String).find((id) => id !== String(meta.id));
    const base = baseId ? byId.get(baseId) : null;
    if (!base) return;
    const into = combined.get(baseId) ?? { ...base, hitLabels: [item("spells", base.id)?.targetsLabel].filter(Boolean) };
    combined.set(baseId, {
      ...into,
      raw: { min: sum(into.raw?.min, spell.raw?.min), avg: sum(into.raw?.avg, spell.raw?.avg), max: sum(into.raw?.max, spell.raw?.max) },
      effective: { ...into.effective, avg: sum(into.effective?.avg, spell.effective?.avg) },
      hitLabels: [...into.hitLabels, meta.targetsLabel].filter(Boolean),
    });
    absorbed.add(String(spell.id));
  });
  return spells.filter((spell) => !absorbed.has(String(spell.id)))
    .map((spell) => combined.get(String(spell.id)) ?? spell);
}

// Merged rows carry the plain spell name; only a lone extra card (its base somehow missing from
// the results) keeps the API's role label, so it can't show up as an unexplained duplicate.
function resultSpellName(spell, meta) {
  const base = spellNameParts(spell.name).base;
  const label = meta?.targetsLabel;
  return meta?.isExtra && label ? `${base} · ${label}` : base;
}

// Union of both builds' visible spells, each carrying whichever side(s) it appears on -
// shared by the live results list and the "Save image" export so both stay in sync.
function comparisonEntries(a, b) {
  const aSpells = mergeStagedResults(builds.a.visibleResultSpells(a.spells ?? []));
  const bSpells = mergeStagedResults(builds.b.visibleResultSpells(b.spells ?? []));
  const idOf = (spell) => String(spell.id ?? normalized(spell.name));
  const entries = new Map();
  const order = [];
  [aSpells, bSpells].forEach((list) => list.forEach((spell) => {
    const id = idOf(spell);
    if (!entries.has(id)) {
      const meta = item("spells", spell.id) ?? metadata.spells.find((candidate) => candidate.name === spell.name);
      entries.set(id, { id, name: resultSpellName(spell, meta), meta });
      order.push(id);
    }
  }));
  order.forEach((id) => {
    const entry = entries.get(id);
    entry.aSpell = aSpells.find((spell) => idOf(spell) === id) ?? null;
    entry.bSpell = bSpells.find((spell) => idOf(spell) === id) ?? null;
  });
  const all = order.map((id) => entries.get(id));
  return {
    spells: all.filter((entry) => entry.meta?.spellType !== "rune"),
    runes: all.filter((entry) => entry.meta?.spellType === "rune"),
  };
}

function renderComparisonResults(a, b) {
  const container = document.querySelector("#compareResults");
  container.replaceChildren();
  const { spells, runes } = comparisonEntries(a, b);
  if (!spells.length && !runes.length) {
    const empty = document.createElement("p");
    empty.className = "dc-empty"; empty.textContent = "No spell results returned.";
    container.append(empty); return;
  }
  if (spells.length) container.append(comparisonResultGroup("Spells & Attacks Breakdown", spells));
  if (runes.length) container.append(comparisonResultGroup("Runes", runes));
  const filterEmpty = document.createElement("p");
  filterEmpty.id = "resultFilterEmpty";
  filterEmpty.className = "dc-filter-empty";
  filterEmpty.textContent = "No attacks match this filter.";
  filterEmpty.hidden = true;
  container.append(filterEmpty);
  filterResultCards(normalized(document.querySelector("#resultFilterCompare")?.value ?? ""));
}

function renderComparison() {
  const a = builds.a.lastResult;
  const b = builds.b.lastResult;
  if (!a || !b) return;
  renderComparisonColumnLabels();
  renderComparisonSummary(a, b);
  renderComparisonResults(a, b);
}

// --- "Save image" export: a side-by-side comparison of both builds ---

// These three mirror the live #compareResults markup exactly (dc-cmp-columns-header,
// dc-result-group summary, comparisonResultGroup) so the exported image matches the tab.
function exportColumnsHeader(nameA, nameB) {
  const header = document.createElement("div");
  header.className = "dc-cmp-row dc-cmp-columns-header";
  const labelA = document.createElement("span"); labelA.className = "dc-cmp-col-label dc-cmp-col-a"; labelA.textContent = nameA;
  const labelB = document.createElement("span"); labelB.className = "dc-cmp-col-label dc-cmp-col-b"; labelB.textContent = nameB;
  header.append(document.createElement("span"), labelA, document.createElement("span"), labelB);
  return header;
}

function exportSummarySection(a, b) {
  const section = document.createElement("section");
  section.className = "dc-result-group";
  const heading = document.createElement("header");
  heading.className = "dc-result-group-heading";
  const title = document.createElement("strong"); title.textContent = "Damage Comparison Summary";
  heading.append(title);
  const summary = document.createElement("div");
  summary.className = "dc-compare-summary";
  [["effectiveDamagePerTurn", "Effective / turn"], ["effectiveDamagePerHit", "Effective / hit"], ["damageFromCharms", "Charm damage"]].forEach(([summaryKey, label]) => {
    const row = document.createElement("div");
    row.className = "dc-cmp-row";
    const labelEl = document.createElement("span"); labelEl.className = "dc-cmp-row-label"; labelEl.textContent = label;
    const aValue = Number(a.summary?.[summaryKey]);
    const bValue = Number(b.summary?.[summaryKey]);
    const aEl = document.createElement("span"); aEl.className = "dc-cmp-value dc-cmp-value-a"; aEl.textContent = formatDamage(aValue);
    const bEl = document.createElement("span"); bEl.className = "dc-cmp-value dc-cmp-value-b"; bEl.textContent = formatDamage(bValue);
    const pct = percentDiff(bValue, aValue);
    applyWinnerHighlight(aEl, bEl, aValue, bValue);
    row.append(labelEl, aEl, diffBadgeEl(pct), bEl);
    summary.append(row);
  });
  section.append(heading, summary);
  return section;
}

function buildComparisonExportCard() {
  const a = builds.a.lastResult;
  const b = builds.b.lastResult;
  const nameA = builds.a.savedName ?? "Build A";
  const nameB = builds.b.savedName ?? "Build B";

  const card = document.createElement("div");
  card.className = "dc-export-comparison";

  const header = document.createElement("header");
  header.className = "dc-export-comparison-header";
  const logo = document.createElement("img");
  logo.className = "dc-export-logo";
  logo.src = "/images/mainlogo.png";
  logo.alt = "TibiaPal";
  const headerText = document.createElement("div");
  headerText.className = "dc-export-header-text";
  const kicker = document.createElement("span");
  kicker.className = "dc-export-kicker";
  kicker.textContent = "TIBIAPAL · BUILD COMPARISON";
  const title = document.createElement("h2");
  title.textContent = `${nameA} vs ${nameB}`;
  headerText.append(kicker, title);
  const statsA = builds.a.state.stats;
  const statsB = builds.b.state.stats;
  if (statsA.vocation === statsB.vocation && numberOrZero(statsA.level) === numberOrZero(statsB.level)) {
    const shared = document.createElement("p");
    shared.className = "dc-export-shared-meta";
    shared.textContent = `${item("vocations", statsA.vocation)?.name ?? statsA.vocation} · Level ${numberOrZero(statsA.level)}`;
    headerText.append(shared);
  }
  // The logo comes after the text (not before) so headerText's left edge lines up with the
  // comparison table below instead of being pushed right by the logo's width.
  header.append(headerText, logo);

  const comparison = document.createElement("div");
  comparison.className = "dc-comparison";
  comparison.append(exportColumnsHeader(nameA, nameB), exportSummarySection(a, b));
  const { spells, runes } = comparisonEntries(a, b);
  if (spells.length) comparison.append(comparisonResultGroup("Spells & Attacks Breakdown", spells, exportSpellIcon));
  if (runes.length) comparison.append(comparisonResultGroup("Runes", runes, exportSpellIcon));

  const footer = document.createElement("div");
  footer.className = "dc-export-footer";
  footer.textContent = `${window.location.host}/damage-calculator`;

  card.append(header, comparison, footer);
  return card;
}

function comparisonIsReady(message) {
  if (builds.a.hasCalculated && builds.a.lastResult && builds.b.hasCalculated && builds.b.lastResult) return true;
  compareStatus.classList.remove("error");
  compareStatus.classList.add("dc-status-stale");
  compareStatus.textContent = message;
  return false;
}

function comparisonImageFilename() {
  return `tibiapal-build-comparison-${builds.a.state.stats.vocation}-vs-${builds.b.state.stats.vocation}.png`;
}

async function renderComparisonImageBlob() {
  const card = buildComparisonExportCard();
  const stage = document.createElement("div");
  stage.className = "dc-export-stage";
  stage.append(card);
  document.body.append(stage);
  try {
    const html2canvas = await loadHtml2Canvas();
    const canvas = await html2canvas(card, { backgroundColor: null, scale: 2, useCORS: true, logging: false });
    return await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  } finally {
    stage.remove();
  }
}

async function saveComparisonImage() {
  if (!comparisonIsReady("Switch to the Results tab and let both builds calculate first, then save the comparison as an image.")) return;
  await withBusyButton(document.querySelector("#saveBuildImage"), "Rendering…", async () => {
    try { downloadBlob(await renderComparisonImageBlob(), comparisonImageFilename()); }
    catch (error) { compareStatus.classList.add("error"); compareStatus.textContent = error.message || "Could not save the comparison image."; }
  });
}

function buildSignature() {
  return `${JSON.stringify(builds.a.state)}|${JSON.stringify(builds.b.state)}`;
}

function setResultsLoading(isLoading) {
  resultsLoading.hidden = !isLoading;
  resultsContent.hidden = isLoading;
}

async function triggerCompare(force = false) {
  const signature = buildSignature();
  if (!force && signature === compareSignature && builds.a.lastResult && builds.b.lastResult) return;
  if (compareInFlight) return compareInFlight;
  compareSignature = signature;
  compareStatus.classList.remove("error");
  compareStatus.textContent = "Calculating both builds…";
  setResultsLoading(true);
  compareInFlight = (async () => {
    try {
      await Promise.all([builds.a.calculate(), builds.b.calculate()]);
      renderComparison();
      document.querySelector("#saveBuildImage").disabled = !(builds.a.hasCalculated && builds.b.hasCalculated);
      compareStatus.classList.remove("error");
      compareStatus.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`;
    } catch (error) {
      if (error.name !== "AbortError") {
        compareStatus.classList.add("error");
        compareStatus.textContent = error.message || "Could not calculate one or both builds.";
      }
    } finally {
      compareInFlight = null;
      setResultsLoading(false);
    }
  })();
  return compareInFlight;
}

// Showing/hiding the tab panels themselves is handled by the site-wide
// .tablinks/.tabcontent system (scripts/onload.js's show_tab, wired via the
// inline onclick on each button, and initial_show_tab on page load) so this
// page's tabs match every other tool. This just layers on the two bits that
// are specific to the damage calculator: hiding Reset outside Build A/B, and
// kicking off the comparison when the Results tab is opened.
function wireTabs() {
  const resetButton = document.querySelector("#resetBuild");
  const activateTab = (tabKey) => {
    activeTabKey = tabKey;
    resetButton.hidden = tabKey === "results" || tabKey === "howto";
    if (tabKey === "results") triggerCompare();
  };
  document.querySelectorAll("#damageTabs .tablinks").forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.dcTab));
  });
  // onload.js's enable_default_tabs() already shows the right panel for a "#results" deep
  // link (it matches the hash to a .tabcontent id directly), but it only flips CSS display -
  // it doesn't know about the dc-tab click handler above, so the comparison never actually
  // ran. Mirror that same activation here so a shared link's Results tab isn't stuck on "-".
  if (location.hash.slice(1) === "results") activateTab("results");
  else { activeTabKey = "a"; resetButton.hidden = false; }
}

function wireGlobalEvents() {
  document.querySelector("#wheelImportBtn").addEventListener("click", importWheelFromInput);
  document.querySelector("#wheelImportInput").addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); importWheelFromInput(); } });
  document.querySelector("#wheelPresetLoad").addEventListener("click", () => { const build = builds[activeBuildKey]; if (build) loadSelectedWheelPreset(build); });
  document.querySelector("#wheelPresetSave").addEventListener("click", () => { const build = builds[activeBuildKey]; if (build) saveCurrentWheelPreset(build); });
  document.querySelector("#wheelPresetDelete").addEventListener("click", () => { const build = builds[activeBuildKey]; if (build) deleteSelectedWheelPreset(build); });
  document.querySelector("#proficiencyImportBtn").addEventListener("click", importProficiencyFromInput);
  document.querySelector("#proficiencyImportInput").addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); importProficiencyFromInput(); } });
  ["a", "b"].forEach((key) => {
    document.querySelector(`#savedBuildSave-${key}`).addEventListener("click", () => saveCurrentBuild(builds[key]));
    document.querySelector(`#savedBuildSelect-${key}`).addEventListener("change", () => loadSelectedSavedBuild(builds[key]));
    document.querySelector(`#savedBuildDelete-${key}`).addEventListener("click", () => deleteSelectedSavedBuild(key));
  });
  document.querySelector("#wheelPlannerFrame").addEventListener("load", (event) => {
    delete event.currentTarget.dataset.pendingNav;
    const build = builds[activeBuildKey];
    if (!build) return;
    syncPlannerVocation(build, "wheel");
    syncWheelGrades(build);
    document.querySelector("#wheelPlannerFrame").contentWindow?.postMessage({ type: "tibiapal:request-wheel-build" }, window.location.origin);
  });
  document.querySelector("#proficiencyPlannerFrame").addEventListener("load", (event) => {
    delete event.currentTarget.dataset.pendingNav;
    const build = builds[activeBuildKey];
    if (!build) return;
    syncPlannerVocation(build, "proficiency");
    document.querySelector("#proficiencyPlannerFrame").contentWindow?.postMessage({ type: "tibiapal:request-proficiency-build" }, window.location.origin);
  });
  document.querySelector("#wheelHydrateFrame").addEventListener("load", (event) => {
    const build = builds[wheelHydrateKey];
    if (!build) return;
    syncWheelGrades(build);
    event.currentTarget.contentWindow?.postMessage({ type: "tibiapal:request-wheel-build" }, window.location.origin);
  });
  document.querySelector("#proficiencyHydrateFrame").addEventListener("load", (event) => {
    if (!builds[proficiencyHydrateKey]) return;
    event.currentTarget.contentWindow?.postMessage({ type: "tibiapal:request-proficiency-build" }, window.location.origin);
  });
  setupEffectsInfo();
  document.querySelector("#closePlannerModal").addEventListener("click", closePlanner);
  document.querySelector("#donePlannerModal").addEventListener("click", closePlanner);
  plannerModal.addEventListener("click", (event) => { if (event.target === plannerModal) closePlanner(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !plannerModal.hidden) closePlanner(); });
  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) return;
    const wheelFrame = document.querySelector("#wheelPlannerFrame");
    const proficiencyFrame = document.querySelector("#proficiencyPlannerFrame");
    const wheelHydrateFrame = document.querySelector("#wheelHydrateFrame");
    const proficiencyHydrateFrame = document.querySelector("#proficiencyHydrateFrame");
    const build = builds[activeBuildKey];
    if (build) {
      if (event.source === wheelFrame.contentWindow && event.data?.type === "tibiapal:wheel-build" && !wheelFrame.dataset.pendingNav) { receiveWheelBuild(build, event.data.payload); setPlannerLoading("wheel", false); }
      if (event.source === proficiencyFrame.contentWindow && event.data?.type === "tibiapal:proficiency-build" && !proficiencyFrame.dataset.pendingNav) { receiveProficiencyBuild(build, event.data.payload); setPlannerLoading("proficiency", false); }
    }
    // A "#results" deep link kicks off triggerCompare() before this background hydration can
    // possibly finish (it's a cross-frame round trip) - recompute once it lands so the Results
    // tab doesn't stick with Build B's pre-hydration (zero-bonus) numbers. Chained after
    // whatever compare is already in flight, rather than called directly, since triggerCompare
    // treats an in-flight call as a no-op and would otherwise ignore the forced recompute.
    const recomputeResultsIfNeeded = () => { if (activeTabKey === "results") Promise.resolve(compareInFlight).finally(() => triggerCompare(true)); };
    if (event.source === wheelHydrateFrame.contentWindow && event.data?.type === "tibiapal:wheel-build") {
      const target = builds[wheelHydrateKey];
      wheelHydrateKey = null;
      if (target) { receiveWheelBuild(target, event.data.payload); recomputeResultsIfNeeded(); }
    }
    if (event.source === proficiencyHydrateFrame.contentWindow && event.data?.type === "tibiapal:proficiency-build") {
      const target = builds[proficiencyHydrateKey];
      proficiencyHydrateKey = null;
      if (target) { receiveProficiencyBuild(target, event.data.payload); recomputeResultsIfNeeded(); }
    }
  });
  document.querySelector("#resetBuild").addEventListener("click", () => {
    const build = builds[activeTabKey];
    if (!build) return;
    if (!window.confirm(`Reset every field in Build ${activeTabKey.toUpperCase()}?`)) return;
    build.reset();
  });
  document.querySelector("#shareBuild").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    const url = new URL(window.location.href);
    url.searchParams.set("build", await encodeShareToken(shareableBuilds()));
    try {
      await navigator.clipboard.writeText(url.href);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = url.href;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    button.textContent = "Link copied!";
    window.setTimeout(() => { button.textContent = "Copy build link"; }, 1500);
  });
  document.querySelector("#saveBuildImage").addEventListener("click", saveComparisonImage);
  document.querySelector("#importBuildA").addEventListener("click", () => {
    if (!window.confirm("Replace Build B with a copy of Build A?")) return;
    builds.b.replaceState(structuredClone(builds.a.state));
  });
  document.querySelector("#importBuildB").addEventListener("click", () => {
    if (!window.confirm("Replace Build A with a copy of Build B?")) return;
    builds.a.replaceState(structuredClone(builds.b.state));
  });
  document.querySelector("#recalculateBoth").addEventListener("click", () => triggerCompare(true));
  document.querySelector("#resultFilterCompare").addEventListener("input", (event) => filterResultCards(normalized(event.target.value)));
}

function loadCachedMetadata() {
  try {
    const cached = JSON.parse(localStorage.getItem(METADATA_CACHE_KEY));
    if (!cached || typeof cached !== "object" || !cached.data) return null;
    if (Date.now() - cached.savedAt > METADATA_CACHE_TTL_MS) return null;
    if (META_RESOURCES.some((resource) => !(resource in cached.data))) return null;
    return cached.data;
  } catch { return null; }
}

function saveCachedMetadata(data) {
  try { localStorage.setItem(METADATA_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data })); }
  catch { /* storage full/unavailable - just skip caching */ }
}

async function loadMetadata() {
  try {
    const cached = loadCachedMetadata();
    if (cached) {
      Object.assign(metadata, cached);
    } else {
      const responses = await Promise.all(META_RESOURCES.map((resource) => fetch(`${API_ROOT}/meta/${resource}`, { headers: { Accept: "application/json" } })));
      const failed = responses.find((response) => !response.ok);
      if (failed) throw new Error(`TibiaTools metadata returned HTTP ${failed.status}.`);
      const bodies = await Promise.all(responses.map((response) => response.json()));
      bodies.forEach((body) => { metadata[body.resource] = body.items; });
      saveCachedMetadata(metadata);
    }

    const restored = await restoreBuilds();
    builds.a.state = restored.a;
    builds.b.state = restored.b;
    // A shared "?build=" link describes an ad-hoc build, not the user's own saved presets —
    // don't relabel it with whichever preset name happened to be active before. The calculator
    // now mirrors its own state into that same param (syncBuildUrl), so a refresh would otherwise
    // look like an incoming shared link and drop the preset name; a token this tab wrote itself
    // doesn't count.
    const shared = new URLSearchParams(window.location.search).get("build");
    const isSharedLink = Boolean(shared) && shared !== sessionStorageItem(SHARE_TOKEN_KEY);
    const meta = isSharedLink ? {} : loadBuildMeta();
    ["a", "b"].forEach((key) => {
      const build = builds[key];
      if (!item("vocations", build.state.stats.vocation)) build.state.stats.vocation = "knight";
      build.restoreMeta(meta[key]);
      build.wireEvents();
      build.populateStaticControls();
    });
    initializePlannerFrames(builds.a);
    // Build A's iframe is the one live at boot, so route its self-reported build there;
    // Build B's wheel/proficiency perks additionally hydrate in the background right away
    // (see hydrateInactiveBuild) so a shared A/B link calculates correctly even if Build B's
    // own planner is never opened.
    activeBuildKey = "a";
    wireGlobalEvents();
    hydrateInactiveBuild(builds.b);
    wireTabs();
    saveAllState();
    refreshAllSavedBuildOptions();
    updateBuildHeading("a");
    updateBuildHeading("b");

    metadataStatus.hidden = true;
    document.querySelector("#damageTabs").hidden = false;
    damageForm.hidden = false;
    appRoot.setAttribute("aria-busy", "false");
    // From here on every saveAllState() also mirrors the builds into the address bar. The first
    // run rewrites a legacy or hand-trimmed "?build=" into the current short format.
    urlSyncReady = true;
    syncBuildUrl();
  } catch (error) {
    metadataStatus.classList.add("dc-error");
    metadataStatus.replaceChildren(document.createTextNode(`${error.message} Please reload to try again.`));
    appRoot.setAttribute("aria-busy", "false");
  }
}

loadMetadata();
