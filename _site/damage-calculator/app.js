const API_ROOT = "https://tibiatools.io/api/v1";
const STORAGE_KEY = "tibiapalDamageBuildV2";
const LEGACY_STORAGE_KEY = "tibiapalDamageBuildV1";
// Everyone starts with these base values; wheel/proficiency/stance bonuses are added on top by the perks the calculator sends.
const BASE_CRIT_CHANCE = 10;
const BASE_CRIT_DAMAGE = 50;
const DEFAULT_PALADIN_MAGIC_LEVEL = 35;
const META_RESOURCES = ["vocations", "stances", "weapons", "ammo", "shields", "perks", "spells", "creatures", "charms"];
const FANDOM_ICON_ALIASES = { "exec-throw": "executioner-s-throw", "hells-core": "hell-s-core" };

// Stances the damage API marks non-selectable ("only selectable stances affect damage"),
// but whose skill/magic-level boost we can apply client-side to the stat we already send.
// These ids are applied locally and are NOT forwarded to the API as stanceIds.
// `multiplier` scales the stance's own stat; `addFromStat`/`addFactor` add a share of a
// different stat on top (e.g. Divine Defiance turning distance fighting into magic level).
const LOCAL_STANCE_MODS = {
  1: { stat: "skill", multiplier: 1.30, note: "+30% skill" },        // Blood Rage (knight)
  3: { stat: "skill", multiplier: 1.32, note: "+32% distance" },     // Sharpshooter (paladin)
  4: { stat: "magicLevel", addFromStat: "skill", addFactor: 0.06, note: "+6% distance as holy magic level" }, // Divine Defiance (paladin)
  10: { stat: "magicLevel", multiplier: 1.10, note: "+10% magic level" }, // Elemental Synthesis (druid)
};

// Burst/beam spells are returned by the API as one card per tier (No Bonus, Stage 1-3).
// Which tier is live depends on the governing wheel revelation perk, so only that tier is shown.
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
const metadata = {};
let plannerCloseTimer = null;
let activeBuildKey = null;
let activeTabKey = "a";
let compareInFlight = null;
let compareSignature = null;

const defaultState = () => ({
  stats: {
    vocation: "knight", level: 1000, bonus: 0, skill: 120, magicLevel: 13,
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
  return candidates.find((candidate) => normalized(candidate.name) === query)
    ?? candidates.find((candidate) => normalized(candidate.name).startsWith(query))
    ?? null;
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

function setDatalist(id, items) {
  const list = document.querySelector(`#${id}`);
  if (!list) return;
  list.replaceChildren(...items.map((entry) => option(entry.name, entry.name)));
}

function encodeBuild(build) {
  const bytes = new TextEncoder().encode(JSON.stringify(build));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function decodeBuild(token) {
  const padded = token.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(token.length / 4) * 4, "=");
  const binary = atob(padded);
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0))));
}

function sanitizeState(candidate) {
  const fallback = defaultState();
  if (!candidate || typeof candidate !== "object") return fallback;
  const stats = { ...fallback.stats, ...(candidate.stats && typeof candidate.stats === "object" ? candidate.stats : {}) };
  stats.vocation = typeof stats.vocation === "string" ? stats.vocation : fallback.stats.vocation;
  stats.stanceIds = Array.isArray(stats.stanceIds) ? stats.stanceIds.map(Number).filter(Number.isInteger) : [];
  stats.critChance = BASE_CRIT_CHANCE;
  stats.critDamage = BASE_CRIT_DAMAGE;
  if (stats.vocation === "paladin" && candidate.stats?.magicLevel == null) stats.magicLevel = DEFAULT_PALADIN_MAGIC_LEVEL;
  const rows = (key, defaults) => Array.isArray(candidate[key])
    ? candidate[key].filter((row) => row && Number.isInteger(Number(row.id))).map((row) => ({ ...defaults, ...row, id: Number(row.id) }))
    : [];
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
    rotation: rows("rotation", { targets: 1, ratio: 1 }),
    targets: rows("targets", { ratio: 1, charmId: null, charmTier: 1 }),
  };
}

function words(value) {
  const ignored = new Set(["a", "an", "and", "as", "at", "for", "from", "of", "the", "this", "to", "your", "aug", "augmented"]);
  return normalized(value).replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter((word) => word && !ignored.has(word) && !/^\d+$/.test(word));
}

function effectText(effect) {
  return [effect.name, effect.value, effect.detail, effect.label].filter(Boolean).join(" ");
}

function effectNumber(effect, perk) {
  const text = [effect.detail, effect.label, effect.value].filter(Boolean).join(" ").replace(",", ".");
  if (perk.valueType === "stage") {
    const stage = text.match(/stage\s*([0-3])/i)?.[1];
    if (stage != null) return Number(stage);
    const roman = text.match(/\b(III|II|I)\b/i)?.[1]?.toUpperCase();
    if (roman) return ({ I: 1, II: 2, III: 3 })[roman];
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

function formatDamageDelta(value) {
  const number = numberOrZero(value);
  return `${number >= 0 ? "+" : "−"}${formatDamage(Math.abs(number))}`;
}

function perkAppliesToResult(perk, spell) {
  if (!perk || !spell) return true;
  if (perk.scope === spell.scope) return true;
  if (["all", "character"].includes(perk.scope)) return true;
  if (perk.scope === "spell") return spell.spellType === "spell";
  if (perk.scope === "rune") return spell.spellType === "rune";
  if (perk.scope === "auto-attack") return spell.spellType === "auto";
  if (["melee", "distance", "magic"].includes(perk.scope)) return spell.scalesWith === perk.scope;
  if (["physical", "earth", "energy", "fire", "ice", "holy", "death"].includes(perk.scope)) return spell.element === perk.scope;
  return !perk.appliesToSpell;
}

function boostBreakdown(values) {
  return [
    { source: "wheel", value: numberOrZero(values.wheel) - numberOrZero(values.base) },
    { source: "proficiency", value: numberOrZero(values.proficiency) - numberOrZero(values.wheel) },
    { source: "manual", value: numberOrZero(values.full) - numberOrZero(values.proficiency) },
  ].filter((entry) => Math.abs(entry.value) >= 0.05);
}

function renderDamageValue(container, values, sourceDetails) {
  const number = document.createElement("strong");
  number.className = "dc-damage-number";
  number.textContent = formatDamage(values.full);
  container.append(number);
  const boosts = boostBreakdown(values);
  if (!boosts.length) return;
  number.classList.add("boosted");
  const list = document.createElement("span");
  list.className = "dc-boost-list";
  boosts.forEach(({ source, value }) => {
    const boost = document.createElement("span");
    boost.className = `dc-boost dc-boost-${source}`;
    boost.tabIndex = 0;
    boost.textContent = formatDamageDelta(value);
    const sourceName = source === "wheel" ? "Wheel of Destiny" : source === "proficiency" ? "Weapon Proficiency" : "Additional API perks";
    const details = sourceDetails[source].length ? `\n\n${sourceDetails[source].join("\n")}` : "";
    boost.title = `${sourceName} contribution: ${formatDamageDelta(value)}${details}`;
    boost.setAttribute("aria-label", boost.title.replaceAll("\n", ". "));
    list.append(boost);
  });
  container.append(list);
}

function resultSpell(result, spell) {
  return result?.spells?.find((candidate) => candidate.id === spell.id)
    ?? result?.spells?.find((candidate) => candidate.name === spell.name);
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
  input.step = "0.01";
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
  const rounded = Math.round(pct * 10) / 10;
  badge.textContent = `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}%`;
  badge.classList.add(rounded > 0.05 ? "dc-diff-up" : rounded < -0.05 ? "dc-diff-down" : "dc-diff-flat");
  return badge;
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
  let lastStages = null;
  let requestController = null;
  let savedName = null;
  let dirty = false;

  function markSaved(name) {
    savedName = name;
    dirty = false;
    updateBuildHeading(key);
  }

  function vocationAllows(entry) {
    return Boolean(entry) && (!Array.isArray(entry.vocations) || entry.vocations.includes(state.stats.vocation));
  }

  function populateStaticControls() {
    const vocation = $("vocation");
    vocation.replaceChildren(...metadata.vocations.map((entry) => option(entry.id, entry.name, entry.id === state.stats.vocation)));
    setDatalist(`perkOptions-${key}`, metadata.perks.filter((entry) => entry.selectable !== false && vocationAllows(entry)));
    setDatalist(`spellOptions-${key}`, metadata.spells.filter((entry) => entry.selectable !== false && vocationAllows(entry)));
    setDatalist(`creatureOptions-${key}`, metadata.creatures);
    renderStatControls();
    renderStances();
    renderEquipment();
    renderSyncedEffects("wheel");
    renderSyncedEffects("proficiency");
    renderPerks();
    renderRotation();
    renderTargets();
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
      control.value = state.stats[statKey] ?? "";
    });
  }

  function renderStances() {
    const fieldset = $("stanceChoices");
    const choices = metadata.stances.filter((stance) => (stance.selectable || LOCAL_STANCE_MODS[stance.id]) && stance.vocation === state.stats.vocation);
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
    shieldSelect.replaceChildren(option("", "None"), ...metadata.shields.map((entry) => option(entry.id, `${entry.name} · ${entry.defense} def`, entry.id === Number(state.weapon.shieldId))));
    shieldSelect.disabled = !canUseShield;
    if (!canUseShield) state.weapon.shieldId = null;
  }

  function skillBoostPerk(effect) {
    const name = normalized(effect.name ?? effect.label);
    let bonusType = null;
    if (name.includes("distance skill boost")) bonusType = "distance-fighting";
    else if (name.includes("magic skill boost")) bonusType = "magic-level";
    else if (name.includes("fist fighting skill boost")) bonusType = "fist-fighting";
    else if (name.includes("weapon skill boost")) {
      const skill = item("weapons", state.weapon.id)?.skill;
      bonusType = skill === "magic" ? "magic-level" : skill ? `${skill}-fighting` : null;
    }
    return bonusType ? metadata.perks.find((perk) => perk.bonusType === bonusType && perk.selectable !== false) : null;
  }

  function typedProficiencyPerk(effect) {
    let bonusType = null;
    if (Number(effect.type) === 28) bonusType = "alpha-strike";
    if (Number(effect.type) === 29) bonusType = "omega-strike";
    if (Number(effect.type) === 30) bonusType = "armor-penetration";
    if (Number(effect.type) === 31) {
      const element = ({ 1: "physical", 8: "energy", 16: "earth", 32: "fire", 64: "ice", 128: "holy", 256: "death" })[Number(effect.elementId)];
      if (element) bonusType = `${element}-pierce-weapon`;
    }
    return bonusType ? metadata.perks.find((perk) => perk.bonusType === bonusType && perk.selectable !== false) : null;
  }

  function mapPlannerEffect(effect) {
    const text = normalized(effectText(effect));
    if (!text || /damage and healing/.test(text)) return null;
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
      const mapped = mapPlannerEffect(effect);
      if (!mapped) return;
      const perk = item("perks", mapped.id);
      const previous = grouped.get(mapped.id);
      const value = perk?.valueType === "stage" ? Math.max(previous?.value ?? 0, mapped.value) : (previous?.value ?? 0) + mapped.value;
      grouped.set(mapped.id, { id: mapped.id, value, apiName: mapped.apiName });
    });
    return [...grouped.values()];
  }

  function renderSyncedEffects(source) {
    const planner = source === "wheel" ? state.wheelPlanner : state.proficiencyPlanner;
    const container = $(source === "wheel" ? "wheelSyncedEffects" : "proficiencySyncedEffects");
    const countEl = $(source === "wheel" ? "wheelEffectsCount" : "proficiencyEffectsCount");
    const effectCount = planner.effects?.length ?? 0;
    if (countEl) { countEl.textContent = String(effectCount); countEl.hidden = effectCount === 0; }
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
      const mapped = (details.length ? details.map((detail) => mapPlannerEffect({ ...effect, detail })) : [mapPlannerEffect(effect)]).some(Boolean);
      const chip = document.createElement("span");
      chip.className = `dc-synced-effect ${mapped ? "mapped" : "unmapped"}${details.length ? " has-details" : ""}`;
      const label = document.createElement("strong");
      label.textContent = effect.label ?? `${effect.name}${effect.value ? ` ${effect.value}` : ""}`;
      chip.append(label);
      if (details.length) {
        const description = document.createElement("small");
        description.textContent = details.join(" · ");
        chip.append(description);
      }
      chip.title = mapped ? "Included in damage calculation" : "Informational or not supported by the damage API";
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
      control.step = perk.valueType === "stage" ? "1" : "0.01";
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
      title.textContent = spell.name;
      const hint = document.createElement("small");
      hint.textContent = [spell.spellType, spell.element, spell.targetsLabel].filter(Boolean).join(" · ");
      identity.append(title, hint);
      const targets = numericRowInput(row, "targets", 0, "Average targets", changed);
      const ratio = numericRowInput(row, "ratio", 0, "Cast ratio", changed);
      if (row.id === 1) { ratio.value = "Every turn"; ratio.type = "text"; ratio.disabled = true; }
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
    const spell = matchByName("spells", input.value, (entry) => entry.selectable !== false && vocationAllows(entry));
    if (!spell) { input.setCustomValidity("Choose a spell from the list."); input.reportValidity(); return; }
    input.setCustomValidity("");
    if (!state.rotation.some((row) => row.id === spell.id)) state.rotation.push({ id: spell.id, targets: 1, ratio: 1 });
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

  function aggregatePerks(groups = [state.wheelPerks, state.proficiencyPerks, state.manualPerks]) {
    const totals = new Map();
    groups.flat().forEach((row) => {
      const perk = item("perks", row.id);
      const previous = totals.get(row.id);
      if (perk?.valueType === "stage") totals.set(row.id, Math.max(previous ?? 0, numberOrZero(row.value)));
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
      if (Number.isFinite(value)) stats[key] = (statMultipliers[key] ? value * statMultipliers[key] : value) + (statAdders[key] ?? 0);
    });
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
    }
  }

  function mappedEffectLabels(source, spell = null) {
    const planner = source === "wheel" ? state.wheelPlanner : state.proficiencyPlanner;
    return (planner.effects ?? []).flatMap((effect) => {
      const details = (Array.isArray(effect.details) ? effect.details : []).filter((detail) => {
        const mapped = mapPlannerEffect({ ...effect, detail });
        return mapped && perkAppliesToResult(item("perks", mapped.id), spell);
      });
      const label = effect.label ?? `${effect.name ?? "Effect"}${effect.value ? ` ${effect.value}` : ""}`;
      if (details.length) return [`${label}: ${details.join(" · ")}`];
      const mapped = mapPlannerEffect(effect);
      return mapped && perkAppliesToResult(item("perks", mapped.id), spell) ? [label] : [];
    });
  }

  function boostSourceDetails(spell = null) {
    const wheel = mappedEffectLabels("wheel", spell);
    if (numberOrZero(state.stats.bonus)) wheel.unshift(`Damage and Healing +${numberOrZero(state.stats.bonus)}`);
    return {
      wheel,
      proficiency: mappedEffectLabels("proficiency", spell),
      manual: state.manualPerks.filter((row) => perkAppliesToResult(item("perks", row.id), spell)).map((row) => {
        const perk = item("perks", row.id);
        return `${perk?.name ?? `Perk ${row.id}`} ${numberOrZero(row.value)}`;
      }),
    };
  }

  function resultCard(spell, stages) {
    const spellMeta = item("spells", spell.id) ?? metadata.spells.find((candidate) => candidate.name === spell.name);
    const card = document.createElement("article");
    card.className = `dc-result-card${spellMeta?.spellType === "rune" ? " dc-result-card-rune" : ""}`;
    card.dataset.filterText = normalized([spell.name, spellMeta?.name, spellMeta?.spellType, spellMeta?.element].filter(Boolean).join(" "));
    card.dataset.spellId = String(spell.id ?? normalized(spell.name));
    const identity = document.createElement("div");
    identity.className = "dc-result-identity";
    const name = document.createElement("strong"); name.textContent = spell.name;
    const kind = document.createElement("small");
    kind.textContent = spellMeta?.spellType === "rune" ? "Rune" : spellMeta?.spellType === "auto" ? "Attack" : "Spell";
    identity.append(resultIcon(spell, spellMeta), name, kind);
    const metrics = document.createElement("div");
    metrics.className = "dc-result-metrics";
    const stageSpells = Object.fromEntries(Object.entries(stages).map(([stageKey, stage]) => [stageKey, resultSpell(stage, spell)]));
    [
      ["Effective avg", "effective", "avg"], ["Raw min", "raw", "min"],
      ["Raw avg", "raw", "avg"], ["Raw max", "raw", "max"],
    ].forEach(([label, group, metricKey]) => {
      const metric = document.createElement("div");
      metric.className = "dc-result-metric";
      const heading = document.createElement("span"); heading.textContent = label;
      metric.append(heading);
      renderDamageValue(metric, {
        base: spellMetric(stageSpells.base, group, metricKey), wheel: spellMetric(stageSpells.wheel, group, metricKey),
        proficiency: spellMetric(stageSpells.proficiency, group, metricKey), full: spellMetric(spell, group, metricKey),
      }, boostSourceDetails(spellMeta));
      metrics.append(metric);
    });
    card.append(identity, metrics);
    return card;
  }

  function resultGroup(title, spells, stages) {
    const section = document.createElement("section");
    section.className = "dc-result-group";
    const heading = document.createElement("header");
    heading.className = "dc-result-group-heading";
    const name = document.createElement("strong"); name.textContent = title;
    const count = document.createElement("span"); count.dataset.resultCount = ""; count.textContent = `${spells.length} result${spells.length === 1 ? "" : "s"}`;
    const grid = document.createElement("div"); grid.className = "dc-result-grid";
    grid.append(...spells.map((spell) => resultCard(spell, stages)));
    heading.append(name, count); section.append(heading, grid);
    return section;
  }

  function activeSpellStages() {
    const effects = state.wheelPlanner.effects ?? [];
    const result = {};
    Object.entries(STAGED_SCOPE_PERK).forEach(([scope, perkName]) => {
      const effect = effects.find((entry) => normalized(entry.name).startsWith(perkName));
      const match = effect ? `${effect.name ?? ""} ${effect.value ?? ""}`.match(/stage\s*([0-3])/i) : null;
      result[scope] = match ? Number(match[1]) : 0;
    });
    return result;
  }

  function visibleResultSpells(spells) {
    const stages = activeSpellStages();
    const rotationIds = new Set(state.rotation.flatMap((row) => {
      const meta = item("spells", row.id);
      return meta?.bundledSpellIds?.length ? meta.bundledSpellIds : [row.id];
    }));
    return spells.filter((spell) => {
      if (rotationIds.has(spell.id)) return true;
      const meta = item("spells", spell.id);
      const scope = meta?.scope;
      if (!scope || !(scope in STAGED_SCOPE_PERK)) return true;
      const active = stages[scope] ?? 0;
      return active > 0 && (meta.stage ?? 0) === active;
    });
  }

  function renderResults(result, stages = { base: result, wheel: result, proficiency: result, full: result }) {
    const sourceDetails = boostSourceDetails();
    const values = [result.summary?.effectiveDamagePerTurn, result.summary?.effectiveDamagePerHit, result.summary?.damageFromCharms];
    const summaryKeys = ["effectiveDamagePerTurn", "effectiveDamagePerHit", "damageFromCharms"];
    document.querySelectorAll(`#summaryCards-${key} article`).forEach((article, index) => {
      article.querySelectorAll("strong, .dc-boost-list, .dc-diff-badge").forEach((element) => element.remove());
      const summaryKey = summaryKeys[index];
      renderDamageValue(article, {
        base: stages.base.summary?.[summaryKey], wheel: stages.wheel.summary?.[summaryKey],
        proficiency: stages.proficiency.summary?.[summaryKey], full: values[index],
      }, sourceDetails);
    });
    const results = $("spellResults");
    results.replaceChildren();
    if (!result.spells?.length) {
      const empty = document.createElement("p");
      empty.className = "dc-empty"; empty.textContent = "No spell results returned.";
      results.append(empty); return;
    }
    const shown = visibleResultSpells(result.spells);
    const runes = shown.filter((spell) => item("spells", spell.id)?.spellType === "rune");
    const spells = shown.filter((spell) => item("spells", spell.id)?.spellType !== "rune");
    if (spells.length) results.append(resultGroup("Spells & attacks", spells, stages));
    if (runes.length) results.append(resultGroup("Runes", runes, stages));
    const filterEmpty = document.createElement("p");
    filterEmpty.id = `resultFilterEmpty-${key}`;
    filterEmpty.className = "dc-filter-empty";
    filterEmpty.textContent = "No attacks match this filter.";
    filterEmpty.hidden = true;
    results.append(filterEmpty);
    filterResultCards(normalized(document.querySelector("#resultFilterCompare")?.value ?? ""));
  }

  async function calculate() {
    requestController?.abort();
    requestController = new AbortController();
    const requests = {
      base: damageRequest({ wheel: false, proficiency: false, manual: false }),
      wheel: damageRequest({ wheel: true, proficiency: false, manual: false }),
      proficiency: damageRequest({ wheel: true, proficiency: true, manual: false }),
      full: damageRequest(),
    };
    const pending = new Map();
    const stages = Object.fromEntries(await Promise.all(Object.entries(requests).map(async ([stageKey, request]) => {
      const signature = JSON.stringify(request);
      if (!pending.has(signature)) pending.set(signature, fetchDamage(request, requestController.signal));
      return [stageKey, await pending.get(signature)];
    })));
    renderResults(stages.full, stages);
    lastResult = stages.full;
    lastStages = stages;
    hasCalculated = true;
  }

  function saveState() {
    saveAllState();
  }

  function shareableBuild() {
    const s = state.stats;
    const stats = { vocation: s.vocation, level: s.level, skill: s.skill, magicLevel: s.magicLevel };
    if (s.stanceIds?.length) stats.stanceIds = s.stanceIds;
    return {
      stats,
      weapon: state.weapon,
      wheelPlanner: { code: state.wheelPlanner.code, gemGrades: state.wheelPlanner.gemGrades },
      proficiencyPlanner: { token: state.proficiencyPlanner.token },
      manualPerks: state.manualPerks,
      rotation: state.rotation,
      targets: state.targets,
    };
  }

  function replaceState(nextState) {
    state = nextState;
    hasCalculated = false;
    lastResult = null;
    lastStages = null;
    savedName = null;
    dirty = false;
    saveState();
    populateStaticControls();
    renderResults({ summary: {}, spells: [] });
    updateBuildHeading(key);
  }

  function reset() {
    replaceState(defaultState());
  }

  function wireEvents() {
    root.querySelectorAll("[data-stat]").forEach((control) => {
      control.addEventListener("input", () => {
        const statKey = control.dataset.stat;
        state.stats[statKey] = control.tagName === "SELECT" || statKey === "imbuementElement" ? control.value : numberOrZero(control.value);
        if (statKey === "vocation") {
          state.stats.stanceIds = [];
          state.stats.bonus = 0;
          if (state.stats.vocation === "paladin") state.stats.magicLevel = DEFAULT_PALADIN_MAGIC_LEVEL;
          state.wheelPlanner = { code: "", vocation: state.stats.vocation, promotionPoints: 0, bonus: 0, effects: [], gemGrades: {} };
          state.proficiencyPlanner = { token: "", weaponName: "", weaponSprite: "", vocation: state.stats.vocation, effects: [] };
          state.manualPerks = state.manualPerks.filter((row) => vocationAllows(item("perks", row.id)));
          state.rotation = state.rotation.filter((row) => vocationAllows(item("spells", row.id)));
          state.wheelPerks = mappedPlannerPerks("wheel");
          state.proficiencyPerks = mappedPlannerPerks("proficiency");
          populateStaticControls();
        }
        changed();
      });
    });
    root.querySelectorAll("[data-add-perk]").forEach((button) => button.addEventListener("click", addPerk));
    $("addSpell").addEventListener("click", addSpell);
    $("addTarget").addEventListener("click", addTarget);
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
    get lastStages() { return lastStages; },
    get savedName() { return savedName; },
    get dirty() { return dirty; },
    markSaved,
    vocationAllows,
    populateStaticControls,
    renderStatControls,
    renderSyncedEffects,
    renderEquipment,
    mappedPlannerPerks,
    visibleResultSpells,
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

function restoreBuilds() {
  const shared = new URLSearchParams(window.location.search).get("build");
  if (shared) {
    try {
      const decoded = decodeBuild(shared);
      if (decoded && typeof decoded === "object" && (decoded.a || decoded.b)) {
        return { a: sanitizeState(decoded.a), b: sanitizeState(decoded.b) };
      }
      // Old single-build share links: load into Build A, leave Build B default.
      return { a: sanitizeState(decoded), b: defaultState() };
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
      const left = Math.max(10, Math.min(rect.right - width, window.innerWidth - width - 10));
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
function setPlannerFrameSrc(frame, url) {
  if (frame.getAttribute("src") !== url) frame.dataset.pendingNav = "1";
  frame.src = url;
}

function initializePlannerFrames(build) {
  setPlannerFrameSrc(document.querySelector("#wheelPlannerFrame"), plannerUrl("/wheel-planner.html", { embed: "damage", v: "20260805-8", vocation: build.state.stats.vocation, code: build.state.wheelPlanner.code }));
  setPlannerFrameSrc(document.querySelector("#proficiencyPlannerFrame"), plannerUrl("/weapon-proficiency.html", { embed: "damage", v: "20260806-2", vocation: build.state.stats.vocation, build: build.state.proficiencyPlanner.token }));
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
  const name = window.prompt("Name this wheel preset:")?.trim();
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

const PROFICIENCY_PRESETS_KEY = "tibiapalProficiencyPresetsV1";
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

function loadProficiencyPresets() {
  try { const stored = JSON.parse(localStorage.getItem(PROFICIENCY_PRESETS_KEY)); return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {}; }
  catch { return {}; }
}

function proficiencyPresetsFor(vocation) {
  const list = loadProficiencyPresets()[vocation];
  return Array.isArray(list) ? list.filter((entry) => entry && typeof entry.name === "string" && typeof entry.token === "string") : [];
}

function refreshProficiencyPresetOptions(build, selectedName = "") {
  const select = document.querySelector("#proficiencyPresetSelect");
  if (!select) return;
  const presets = proficiencyPresetsFor(build.state.stats.vocation);
  select.replaceChildren(option("", presets.length ? "Choose a saved weapon…" : "No saved weapons"), ...presets.map((preset) => option(preset.name, preset.name)));
  select.value = selectedName;
  document.querySelector("#proficiencyPresetLoad").disabled = !presets.length;
  document.querySelector("#proficiencyPresetDelete").disabled = !presets.length;
}

function saveCurrentProficiencyPreset(build) {
  const token = String(build.state.proficiencyPlanner.token ?? "").trim();
  if (!PROFICIENCY_TOKEN_PATTERN.test(token)) { setProficiencyImportError("Open the proficiency planner and choose a weapon before saving a preset."); return; }
  const name = window.prompt("Name this proficiency preset:", build.state.proficiencyPlanner.weaponName || "")?.trim();
  if (!name) return;
  const vocation = build.state.stats.vocation;
  const all = loadProficiencyPresets();
  const list = proficiencyPresetsFor(vocation);
  const index = list.findIndex((preset) => preset.name.toLowerCase() === name.toLowerCase());
  const entry = { name, token, weaponName: build.state.proficiencyPlanner.weaponName || "" };
  if (index >= 0) list[index] = entry; else list.push(entry);
  all[vocation] = list;
  localStorage.setItem(PROFICIENCY_PRESETS_KEY, JSON.stringify(all));
  refreshProficiencyPresetOptions(build, name);
}

function loadSelectedProficiencyPreset(build) {
  const name = document.querySelector("#proficiencyPresetSelect").value;
  if (!name) return;
  const preset = proficiencyPresetsFor(build.state.stats.vocation).find((entry) => entry.name === name);
  if (preset) importProficiencyBuild(build, preset.token);
}

function deleteSelectedProficiencyPreset(build) {
  const name = document.querySelector("#proficiencyPresetSelect").value;
  if (!name || !window.confirm(`Delete saved weapon "${name}"?`)) return;
  const all = loadProficiencyPresets();
  all[build.state.stats.vocation] = proficiencyPresetsFor(build.state.stats.vocation).filter((preset) => preset.name !== name);
  localStorage.setItem(PROFICIENCY_PRESETS_KEY, JSON.stringify(all));
  refreshProficiencyPresetOptions(build);
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
  if (name === "proficiency") { setProficiencyImportError(""); refreshProficiencyPresetOptions(build); }
  window.clearTimeout(plannerCloseTimer);
  plannerModal.classList.remove("dc-closing");
  plannerModal.hidden = false;
  document.body.style.overflow = "hidden";
  const previousWheelSrc = wheel.getAttribute("src");
  const previousProficiencySrc = proficiency.getAttribute("src");
  initializePlannerFrames(build);
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

function receiveWheelBuild(build, payload) {
  if (!payload || typeof payload !== "object") return;
  const state = build.state;
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
  build.renderStatControls();
  build.renderSyncedEffects("wheel");
  document.querySelector("#plannerModalPoints strong").textContent = Number(payload.promotionPoints ?? 0).toLocaleString("en-US");
  build.changed();
}

function receiveProficiencyBuild(build, payload) {
  if (!payload || typeof payload !== "object") return;
  const state = build.state;
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
  build.changed();
}

function filterResultCards(query) {
  ["a", "b"].forEach((key) => {
    let visibleTotal = 0;
    let cardTotal = 0;
    document.querySelectorAll(`#spellResults-${key} .dc-result-group`).forEach((group) => {
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
    const empty = document.querySelector(`#resultFilterEmpty-${key}`);
    if (empty) empty.hidden = cardTotal === 0 || visibleTotal > 0;
  });
}

function annotateDiffs() {
  const a = builds.a.lastResult;
  const b = builds.b.lastResult;
  if (!a || !b) return;

  const summaryKeys = ["effectiveDamagePerTurn", "effectiveDamagePerHit", "damageFromCharms"];
  const summaryPct = summaryKeys.map((key) => percentDiff(Number(a.summary?.[key]), Number(b.summary?.[key])));
  document.querySelectorAll("#summaryCards-a article").forEach((article, index) => {
    const pct = summaryPct[index];
    article.append(diffBadgeEl(pct == null ? null : -pct));
  });
  document.querySelectorAll("#summaryCards-b article").forEach((article, index) => {
    article.append(diffBadgeEl(summaryPct[index]));
  });

  function findSpellPair(card) {
    const spellId = card.dataset.spellId;
    if (!spellId) return null;
    const aSpell = a.spells?.find((spell) => String(spell.id ?? normalized(spell.name)) === spellId);
    const bSpell = b.spells?.find((spell) => String(spell.id ?? normalized(spell.name)) === spellId);
    return aSpell && bSpell ? { aSpell, bSpell } : null;
  }

  document.querySelectorAll("#spellResults-a .dc-result-card").forEach((card) => {
    const pair = findSpellPair(card);
    const metric = card.querySelector(".dc-result-metric");
    if (!pair || !metric) return;
    const pct = percentDiff(Number(spellMetric(pair.aSpell, "effective", "avg")), Number(spellMetric(pair.bSpell, "effective", "avg")));
    metric.append(diffBadgeEl(pct == null ? null : -pct));
  });
  document.querySelectorAll("#spellResults-b .dc-result-card").forEach((card) => {
    const pair = findSpellPair(card);
    const metric = card.querySelector(".dc-result-metric");
    if (!pair || !metric) return;
    const pct = percentDiff(Number(spellMetric(pair.aSpell, "effective", "avg")), Number(spellMetric(pair.bSpell, "effective", "avg")));
    metric.append(diffBadgeEl(pct));
  });
}

// --- "Save image" export: a side-by-side comparison of both builds ---

function exportStatSubtitle(build) {
  const stats = build.state.stats;
  const usesMagicLevel = stats.vocation === "druid" || stats.vocation === "sorcerer";
  const vocationName = item("vocations", stats.vocation)?.name ?? stats.vocation;
  const skillLabel = usesMagicLevel
    ? `ML ${numberOrZero(stats.magicLevel)}`
    : `${numberOrZero(stats.skill)} ${stats.vocation === "paladin" ? "dist" : stats.vocation === "monk" ? "fist" : "skill"}`;
  const subtitle = document.createElement("p");
  const highlight = (text) => { const span = document.createElement("span"); span.className = "dc-export-hl"; span.textContent = text; return span; };
  subtitle.append(
    highlight(vocationName),
    document.createTextNode("  ·  Level "),
    highlight(String(numberOrZero(stats.level))),
    document.createTextNode(`  ·  ${skillLabel}  ·  Crit ${numberOrZero(stats.critChance)}% / ${numberOrZero(stats.critDamage)}%  ·  Wheel +${numberOrZero(stats.bonus)}`),
  );
  return subtitle;
}

function exportSpellTile(spell) {
  const meta = item("spells", spell.id) ?? metadata.spells.find((entry) => entry.name === spell.name);
  const tile = document.createElement("article");
  tile.className = "dc-export-tile";
  const head = document.createElement("div");
  head.className = "dc-export-tile-head";
  head.append(exportSpellIcon(spell, meta));
  const name = document.createElement("strong");
  name.textContent = spell.name;
  head.append(name);
  const effective = document.createElement("div");
  effective.className = "dc-export-tile-value";
  effective.textContent = formatDamage(spellMetric(spell, "effective", "avg"));
  const effectiveLabel = document.createElement("span");
  effectiveLabel.className = "dc-export-tile-label";
  effectiveLabel.textContent = "Effective / hit";
  const raw = document.createElement("div");
  raw.className = "dc-export-tile-raw";
  raw.textContent = `min ${formatDamage(spellMetric(spell, "raw", "min"))} · avg ${formatDamage(spellMetric(spell, "raw", "avg"))} · max ${formatDamage(spellMetric(spell, "raw", "max"))}`;
  tile.append(head, effectiveLabel, effective, raw);
  return tile;
}

function buildExportColumn(build, label, result, pctForKey) {
  const column = document.createElement("div");
  column.className = "dc-export-column";

  const chip = document.createElement("span");
  chip.className = "dc-export-column-label";
  chip.textContent = label;
  column.append(chip);

  const head = document.createElement("header");
  head.className = "dc-export-header";
  const headerText = document.createElement("div");
  headerText.className = "dc-export-header-text";
  const title = document.createElement("h2");
  title.textContent = build.state.proficiencyPlanner.weaponName || weaponDisplayName(item("weapons", build.state.weapon.id));
  headerText.append(title, exportStatSubtitle(build));
  head.append(headerText);
  const weaponSprite = String(build.state.proficiencyPlanner.weaponSprite ?? "").trim();
  if (weaponSprite) {
    const weaponImg = document.createElement("img");
    weaponImg.className = "dc-export-weapon";
    weaponImg.src = `/${weaponSprite.replace(/^\/+/, "")}`;
    weaponImg.alt = "";
    head.append(weaponImg);
  }
  column.append(head);

  const summary = document.createElement("div");
  summary.className = "dc-export-summary";
  [["Effective / turn", "effectiveDamagePerTurn"], ["Effective / hit", "effectiveDamagePerHit"], ["Charm damage", "damageFromCharms"]].forEach(([label2, key]) => {
    const block = document.createElement("div");
    const span = document.createElement("span");
    span.textContent = label2;
    const strong = document.createElement("strong");
    strong.textContent = formatDamage(result.summary?.[key]);
    block.append(span, strong, diffBadgeEl(pctForKey(key)));
    summary.append(block);
  });
  column.append(summary);

  const gridTitle = document.createElement("div");
  gridTitle.className = "dc-export-grid-title";
  gridTitle.textContent = "Top hits";
  const grid = document.createElement("div");
  grid.className = "dc-export-grid";
  // Druids and sorcerers lean on wave spells; keep single-target strikes from crowding them out.
  const demoteStrikes = build.state.stats.vocation === "druid" || build.state.stats.vocation === "sorcerer";
  const strikeRank = (spell) => (demoteStrikes && /\bstrike\b/.test(normalized(item("spells", spell.id)?.name ?? spell.name)) ? 1 : 0);
  const topSpells = build.visibleResultSpells(result.spells ?? [])
    .filter((spell) => Number.isFinite(Number(spellMetric(spell, "effective", "avg"))))
    .sort((a, b) => strikeRank(a) - strikeRank(b) || Number(spellMetric(b, "effective", "avg")) - Number(spellMetric(a, "effective", "avg")))
    .slice(0, 4);
  grid.append(...topSpells.map(exportSpellTile));
  column.append(gridTitle, grid);

  const gems = (build.state.wheelPlanner.effects ?? []).filter((effect) => effect.group === "gem");
  if (gems.length) {
    const gemTitle = document.createElement("div");
    gemTitle.className = "dc-export-grid-title dc-export-gem-title";
    gemTitle.textContent = "Wheel gems";
    const gemList = document.createElement("div");
    gemList.className = "dc-export-gems";
    gems.forEach((effect) => {
      const gemChip = document.createElement("span");
      gemChip.className = "dc-export-gem";
      gemChip.textContent = effect.label ?? `${effect.name}${effect.value ? ` ${effect.value}` : ""}`;
      gemList.append(gemChip);
    });
    column.append(gemTitle, gemList);
  }

  return column;
}

function buildComparisonExportCard() {
  const a = builds.a.lastResult;
  const b = builds.b.lastResult;

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
  title.textContent = "Build A vs Build B";
  headerText.append(kicker, title);
  header.append(logo, headerText);

  const summaryKeys = ["effectiveDamagePerTurn", "effectiveDamagePerHit", "damageFromCharms"];
  const pctByKey = Object.fromEntries(summaryKeys.map((key) => [key, percentDiff(Number(a.summary?.[key]), Number(b.summary?.[key]))]));

  const columns = document.createElement("div");
  columns.className = "dc-export-columns";
  columns.append(
    buildExportColumn(builds.a, "Build A", a, (key) => { const pct = pctByKey[key]; return pct == null ? null : -pct; }),
    buildExportColumn(builds.b, "Build B", b, (key) => pctByKey[key]),
  );

  const footer = document.createElement("div");
  footer.className = "dc-export-footer";
  footer.textContent = `${window.location.host}/damage-calculator`;

  card.append(header, columns, footer);
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

async function triggerCompare(force = false) {
  const signature = buildSignature();
  if (!force && signature === compareSignature && builds.a.lastResult && builds.b.lastResult) return;
  if (compareInFlight) return compareInFlight;
  compareSignature = signature;
  compareStatus.classList.remove("error");
  compareStatus.textContent = "Calculating both builds…";
  compareInFlight = (async () => {
    try {
      await Promise.all([builds.a.calculate(), builds.b.calculate()]);
      annotateDiffs();
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
  document.querySelectorAll("#damageTabs .tablinks").forEach((button) => {
    button.addEventListener("click", () => {
      const tabKey = button.dataset.dcTab;
      activeTabKey = tabKey;
      resetButton.hidden = tabKey === "results" || tabKey === "howto";
      if (tabKey === "results") triggerCompare();
    });
  });
  activeTabKey = "a";
  resetButton.hidden = false;
}

function wireGlobalEvents() {
  document.querySelector("#wheelImportBtn").addEventListener("click", importWheelFromInput);
  document.querySelector("#wheelImportInput").addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); importWheelFromInput(); } });
  document.querySelector("#wheelPresetLoad").addEventListener("click", () => { const build = builds[activeBuildKey]; if (build) loadSelectedWheelPreset(build); });
  document.querySelector("#wheelPresetSave").addEventListener("click", () => { const build = builds[activeBuildKey]; if (build) saveCurrentWheelPreset(build); });
  document.querySelector("#wheelPresetDelete").addEventListener("click", () => { const build = builds[activeBuildKey]; if (build) deleteSelectedWheelPreset(build); });
  document.querySelector("#proficiencyImportBtn").addEventListener("click", importProficiencyFromInput);
  document.querySelector("#proficiencyImportInput").addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); importProficiencyFromInput(); } });
  document.querySelector("#proficiencyPresetLoad").addEventListener("click", () => { const build = builds[activeBuildKey]; if (build) loadSelectedProficiencyPreset(build); });
  document.querySelector("#proficiencyPresetSave").addEventListener("click", () => { const build = builds[activeBuildKey]; if (build) saveCurrentProficiencyPreset(build); });
  document.querySelector("#proficiencyPresetDelete").addEventListener("click", () => { const build = builds[activeBuildKey]; if (build) deleteSelectedProficiencyPreset(build); });
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
  setupEffectsInfo();
  document.querySelector("#closePlannerModal").addEventListener("click", closePlanner);
  document.querySelector("#donePlannerModal").addEventListener("click", closePlanner);
  plannerModal.addEventListener("click", (event) => { if (event.target === plannerModal) closePlanner(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !plannerModal.hidden) closePlanner(); });
  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) return;
    const build = builds[activeBuildKey];
    if (!build) return;
    const wheelFrame = document.querySelector("#wheelPlannerFrame");
    const proficiencyFrame = document.querySelector("#proficiencyPlannerFrame");
    if (event.source === wheelFrame.contentWindow && event.data?.type === "tibiapal:wheel-build" && !wheelFrame.dataset.pendingNav) receiveWheelBuild(build, event.data.payload);
    if (event.source === proficiencyFrame.contentWindow && event.data?.type === "tibiapal:proficiency-build" && !proficiencyFrame.dataset.pendingNav) receiveProficiencyBuild(build, event.data.payload);
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
    url.searchParams.set("build", encodeBuild(shareableBuilds()));
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

async function loadMetadata() {
  try {
    const responses = await Promise.all(META_RESOURCES.map((resource) => fetch(`${API_ROOT}/meta/${resource}`, { headers: { Accept: "application/json" } })));
    const failed = responses.find((response) => !response.ok);
    if (failed) throw new Error(`TibiaTools metadata returned HTTP ${failed.status}.`);
    const bodies = await Promise.all(responses.map((response) => response.json()));
    bodies.forEach((body) => { metadata[body.resource] = body.items; });

    const restored = restoreBuilds();
    builds.a.state = restored.a;
    builds.b.state = restored.b;
    ["a", "b"].forEach((key) => {
      const build = builds[key];
      if (!item("vocations", build.state.stats.vocation)) build.state.stats.vocation = "knight";
      build.wireEvents();
      build.populateStaticControls();
    });
    initializePlannerFrames(builds.a);
    // Build A's iframe is the one live at boot, so route its self-reported build there;
    // Build B's wheel/proficiency perks hydrate the first time its own planner is opened.
    activeBuildKey = "a";
    wireGlobalEvents();
    wireTabs();
    saveAllState();
    refreshAllSavedBuildOptions();
    updateBuildHeading("a");
    updateBuildHeading("b");

    metadataStatus.hidden = true;
    document.querySelector("#damageTabs").hidden = false;
    damageForm.hidden = false;
    appRoot.setAttribute("aria-busy", "false");
  } catch (error) {
    metadataStatus.classList.add("dc-error");
    metadataStatus.replaceChildren(document.createTextNode(`${error.message} Please reload to try again.`));
    appRoot.setAttribute("aria-busy", "false");
  }
}

loadMetadata();
