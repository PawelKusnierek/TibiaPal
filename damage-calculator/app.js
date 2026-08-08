const API_ROOT = "https://tibiatools.io/api/v1";
const STORAGE_KEY = "tibiapalDamageBuildV1";
const META_RESOURCES = ["vocations", "stances", "weapons", "ammo", "shields", "perks", "spells", "creatures", "charms"];
const FANDOM_ICON_ALIASES = { "exec-throw": "executioner-s-throw", "hells-core": "hell-s-core" };

// Stances the damage API marks non-selectable ("only selectable stances affect damage"),
// but whose skill/magic-level boost we can apply client-side to the stat we already send.
// These ids are applied locally and are NOT forwarded to the API as stanceIds.
const LOCAL_STANCE_MODS = {
  1: { stat: "skill", multiplier: 1.30, note: "+30% skill" },        // Blood Rage (knight)
  3: { stat: "skill", multiplier: 1.32, note: "+32% distance" },     // Sharpshooter (paladin)
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

const root = document.querySelector("#damageCalculator");
const form = document.querySelector("#damageForm");
const metadataStatus = document.querySelector("#metadataStatus");
const calculationStatus = document.querySelector("#calculationStatus");
const plannerModal = document.querySelector("#plannerModal");
const metadata = {};
let calculateTimer = null;
let requestController = null;
let hasCalculated = false;
let plannerCloseTimer = null;
let lastResult = null;

const defaultState = () => ({
  stats: {
    vocation: "knight", level: 1000, bonus: 0, skill: 120, magicLevel: 13,
    critChance: 10, critDamage: 50, fatalChance: 0, transcendenceChance: 0,
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

let state = defaultState();

function item(resource, id) {
  return metadata[resource]?.find((candidate) => String(candidate.id) === String(id));
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

function restoreState() {
  const shared = new URLSearchParams(window.location.search).get("build");
  if (shared) {
    try { return sanitizeState(decodeBuild(shared)); }
    catch (error) { console.warn("Ignored invalid shared damage build", error); }
  }
  try { return sanitizeState(JSON.parse(localStorage.getItem(STORAGE_KEY))); }
  catch { return defaultState(); }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Only the raw inputs — the wheel code, proficiency token, stats and hand-entered rows.
// The planners recompute effects/perks/bonus/weapon name from the code+token on load, so
// keeping them out of the shared link keeps it short.
function shareableBuild() {
  const s = state.stats;
  const stats = { vocation: s.vocation, level: s.level, skill: s.skill, magicLevel: s.magicLevel, critChance: s.critChance, critDamage: s.critDamage };
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

function vocationAllows(entry) {
  return Boolean(entry) && (!Array.isArray(entry.vocations) || entry.vocations.includes(state.stats.vocation));
}

function populateStaticControls() {
  const vocation = document.querySelector("#vocation");
  vocation.replaceChildren(...metadata.vocations.map((entry) => option(entry.id, entry.name, entry.id === state.stats.vocation)));
  setDatalist("perkOptions", metadata.perks.filter((entry) => entry.selectable !== false && vocationAllows(entry)));
  setDatalist("spellOptions", metadata.spells.filter((entry) => entry.selectable !== false && vocationAllows(entry)));
  setDatalist("creatureOptions", metadata.creatures);
  renderStatControls();
  renderStances();
  renderEquipment();
  renderSyncedEffects("wheel");
  renderSyncedEffects("proficiency");
  renderPerks("manual");
  renderRotation();
  renderTargets();
}

function renderStatControls() {
  const usesMagicLevel = state.stats.vocation === "druid" || state.stats.vocation === "sorcerer";
  const skillField = document.querySelector("#skillField");
  const magicLevelField = document.querySelector("#magicLevelField");
  skillField.hidden = usesMagicLevel;
  magicLevelField.hidden = !usesMagicLevel;
  document.querySelector("#skillFieldLabel").textContent = state.stats.vocation === "paladin"
    ? "Distance fighting"
    : state.stats.vocation === "monk"
      ? "Fist fighting"
      : "Main skill";
  root.querySelectorAll("[data-stat]").forEach((control) => {
    const key = control.dataset.stat;
    control.value = state.stats[key] ?? "";
  });
}

function renderStances() {
  const fieldset = document.querySelector("#stanceChoices");
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
  const weaponInput = document.querySelector("#weaponSearch");
  weaponInput.value = weapon?.name ?? "Fists";
  const details = [weapon?.skill, weapon?.hands ? `${weapon.hands}-handed` : null, weapon?.attack != null ? `${weapon.attack} atk` : null, weapon?.damage != null ? `${weapon.damage} ${weapon.damageType ?? ""} damage` : null].filter(Boolean);
  document.querySelector("#weaponMeta").textContent = details.join(" · ");

  const ammoSelect = document.querySelector("#ammoSelect");
  const ammo = metadata.ammo.filter((entry) => weapon?.ammoType && entry.type === weapon.ammoType);
  ammoSelect.replaceChildren(option("", "None"), ...ammo.map((entry) => option(entry.id, `${entry.name} · ${entry.attack} atk`, entry.id === Number(state.weapon.ammoId))));
  ammoSelect.disabled = !ammo.length;
  if (!ammo.some((entry) => entry.id === Number(state.weapon.ammoId))) state.weapon.ammoId = null;

  const shieldSelect = document.querySelector("#shieldSelect");
  const canUseShield = weapon?.hands === "one";
  shieldSelect.replaceChildren(option("", "None"), ...metadata.shields.map((entry) => option(entry.id, `${entry.name} · ${entry.defense} def`, entry.id === Number(state.weapon.shieldId))));
  shieldSelect.disabled = !canUseShield;
  if (!canUseShield) state.weapon.shieldId = null;
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
  const container = document.querySelector(source === "wheel" ? "#wheelSyncedEffects" : "#proficiencySyncedEffects");
  const countEl = document.querySelector(source === "wheel" ? "#wheelEffectsCount" : "#proficiencyEffectsCount");
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

function plannerUrl(path, values) {
  const url = new URL(path, window.location.origin);
  Object.entries(values).forEach(([key, value]) => { if (value) url.searchParams.set(key, value); });
  return `${url.pathname}${url.search}`;
}

function initializePlannerFrames() {
  document.querySelector("#wheelPlannerFrame").src = plannerUrl("/wheel-planner.html", { embed: "damage", v: "20260805-8", vocation: state.stats.vocation, code: state.wheelPlanner.code });
  document.querySelector("#proficiencyPlannerFrame").src = plannerUrl("/weapon-proficiency.html", { embed: "damage", v: "20260806-2", vocation: state.stats.vocation, build: state.proficiencyPlanner.token });
}

function syncWheelGrades() {
  document.querySelector("#wheelPlannerFrame").contentWindow?.postMessage({
    type: "tibiapal:set-wheel-grades",
    grades: state.wheelPlanner.gemGrades,
  }, window.location.origin);
}

function syncPlannerVocation(target = "both") {
  const message = { type: "tibiapal:set-vocation", vocation: state.stats.vocation };
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

function importWheelCode(value) {
  const code = parseWheelCode(value);
  if (!WHEEL_CODE_PATTERN.test(code)) { setWheelImportError("Enter a valid wheel link or code."); return false; }
  setWheelImportError("");
  state.wheelPlanner.code = code;
  document.querySelector("#wheelPlannerFrame").contentWindow?.postMessage({ type: "tibiapal:import-wheel-code", code }, window.location.origin);
  return true;
}

function importWheelFromInput() {
  const input = document.querySelector("#wheelImportInput");
  if (importWheelCode(input.value)) input.value = "";
}

function loadWheelPresets() {
  try { const stored = JSON.parse(localStorage.getItem(WHEEL_PRESETS_KEY)); return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {}; }
  catch { return {}; }
}

function wheelPresetsFor(vocation) {
  const list = loadWheelPresets()[vocation];
  return Array.isArray(list) ? list.filter((entry) => entry && typeof entry.name === "string" && typeof entry.code === "string") : [];
}

function refreshWheelPresetOptions(selectedName = "") {
  const select = document.querySelector("#wheelPresetSelect");
  if (!select) return;
  const presets = wheelPresetsFor(state.stats.vocation);
  select.replaceChildren(option("", presets.length ? "Choose a saved wheel…" : "No saved wheels"), ...presets.map((preset) => option(preset.name, preset.name)));
  select.value = selectedName;
  document.querySelector("#wheelPresetLoad").disabled = !presets.length;
  document.querySelector("#wheelPresetDelete").disabled = !presets.length;
}

function saveCurrentWheelPreset() {
  const code = String(state.wheelPlanner.code ?? "").trim();
  if (!WHEEL_CODE_PATTERN.test(code)) { setWheelImportError("Build or import a wheel before saving it as a preset."); return; }
  const name = window.prompt("Name this wheel preset:")?.trim();
  if (!name) return;
  const vocation = state.stats.vocation;
  const all = loadWheelPresets();
  const list = wheelPresetsFor(vocation);
  const index = list.findIndex((preset) => preset.name.toLowerCase() === name.toLowerCase());
  if (index >= 0) list[index] = { name, code }; else list.push({ name, code });
  all[vocation] = list;
  localStorage.setItem(WHEEL_PRESETS_KEY, JSON.stringify(all));
  refreshWheelPresetOptions(name);
}

function loadSelectedWheelPreset() {
  const name = document.querySelector("#wheelPresetSelect").value;
  if (!name) return;
  const preset = wheelPresetsFor(state.stats.vocation).find((entry) => entry.name === name);
  if (preset) importWheelCode(preset.code);
}

function deleteSelectedWheelPreset() {
  const name = document.querySelector("#wheelPresetSelect").value;
  if (!name || !window.confirm(`Delete saved wheel "${name}"?`)) return;
  const all = loadWheelPresets();
  all[state.stats.vocation] = wheelPresetsFor(state.stats.vocation).filter((preset) => preset.name !== name);
  localStorage.setItem(WHEEL_PRESETS_KEY, JSON.stringify(all));
  refreshWheelPresetOptions();
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

function importProficiencyBuild(value) {
  const token = parseProficiencyToken(value);
  if (!PROFICIENCY_TOKEN_PATTERN.test(token)) { setProficiencyImportError("Enter a valid proficiency link or code."); return false; }
  setProficiencyImportError("");
  state.proficiencyPlanner.token = token;
  document.querySelector("#proficiencyPlannerFrame").contentWindow?.postMessage({ type: "tibiapal:load-proficiency-build", token }, window.location.origin);
  return true;
}

function importProficiencyFromInput() {
  const input = document.querySelector("#proficiencyImportInput");
  if (importProficiencyBuild(input.value)) input.value = "";
}

function loadProficiencyPresets() {
  try { const stored = JSON.parse(localStorage.getItem(PROFICIENCY_PRESETS_KEY)); return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {}; }
  catch { return {}; }
}

function proficiencyPresetsFor(vocation) {
  const list = loadProficiencyPresets()[vocation];
  return Array.isArray(list) ? list.filter((entry) => entry && typeof entry.name === "string" && typeof entry.token === "string") : [];
}

function refreshProficiencyPresetOptions(selectedName = "") {
  const select = document.querySelector("#proficiencyPresetSelect");
  if (!select) return;
  const presets = proficiencyPresetsFor(state.stats.vocation);
  select.replaceChildren(option("", presets.length ? "Choose a saved weapon…" : "No saved weapons"), ...presets.map((preset) => option(preset.name, preset.name)));
  select.value = selectedName;
  document.querySelector("#proficiencyPresetLoad").disabled = !presets.length;
  document.querySelector("#proficiencyPresetDelete").disabled = !presets.length;
}

function saveCurrentProficiencyPreset() {
  const token = String(state.proficiencyPlanner.token ?? "").trim();
  if (!PROFICIENCY_TOKEN_PATTERN.test(token)) { setProficiencyImportError("Open the proficiency planner and choose a weapon before saving a preset."); return; }
  const name = window.prompt("Name this proficiency preset:", state.proficiencyPlanner.weaponName || "")?.trim();
  if (!name) return;
  const vocation = state.stats.vocation;
  const all = loadProficiencyPresets();
  const list = proficiencyPresetsFor(vocation);
  const index = list.findIndex((preset) => preset.name.toLowerCase() === name.toLowerCase());
  const entry = { name, token, weaponName: state.proficiencyPlanner.weaponName || "" };
  if (index >= 0) list[index] = entry; else list.push(entry);
  all[vocation] = list;
  localStorage.setItem(PROFICIENCY_PRESETS_KEY, JSON.stringify(all));
  refreshProficiencyPresetOptions(name);
}

function loadSelectedProficiencyPreset() {
  const name = document.querySelector("#proficiencyPresetSelect").value;
  if (!name) return;
  const preset = proficiencyPresetsFor(state.stats.vocation).find((entry) => entry.name === name);
  if (preset) importProficiencyBuild(preset.token);
}

function deleteSelectedProficiencyPreset() {
  const name = document.querySelector("#proficiencyPresetSelect").value;
  if (!name || !window.confirm(`Delete saved weapon "${name}"?`)) return;
  const all = loadProficiencyPresets();
  all[state.stats.vocation] = proficiencyPresetsFor(state.stats.vocation).filter((preset) => preset.name !== name);
  localStorage.setItem(PROFICIENCY_PRESETS_KEY, JSON.stringify(all));
  refreshProficiencyPresetOptions();
}

function openPlanner(name) {
  const wheel = document.querySelector("#wheelPlannerFrame");
  const proficiency = document.querySelector("#proficiencyPlannerFrame");
  wheel.hidden = name !== "wheel";
  proficiency.hidden = name !== "proficiency";
  document.querySelector("#plannerModalTitle").textContent = name === "wheel" ? "Edit Wheel of Destiny" : "Edit Weapon Proficiency";
  plannerModal.dataset.planner = name;
  const points = document.querySelector("#plannerModalPoints");
  points.hidden = name !== "wheel";
  points.querySelector("strong").textContent = Number(state.wheelPlanner.promotionPoints ?? 0).toLocaleString("en-US");
  document.querySelector("#wheelToolbar").hidden = name !== "wheel";
  document.querySelector("#proficiencyToolbar").hidden = name !== "proficiency";
  if (name === "wheel") { setWheelImportError(""); refreshWheelPresetOptions(); }
  if (name === "proficiency") { setProficiencyImportError(""); refreshProficiencyPresetOptions(); }
  window.clearTimeout(plannerCloseTimer);
  plannerModal.classList.remove("dc-closing");
  plannerModal.hidden = false;
  document.body.style.overflow = "hidden";
  if (name === "wheel") {
    syncWheelGrades();
    wheel.contentWindow?.postMessage({ type: "tibiapal:request-wheel-build" }, window.location.origin);
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
  }, 280);
}

function receiveWheelBuild(payload) {
  if (!payload || typeof payload !== "object") return;
  const { gemGrades, gradesHydrated, ...plannerPayload } = payload;
  state.wheelPlanner = { ...state.wheelPlanner, ...plannerPayload, effects: Array.isArray(payload.effects) ? payload.effects : [] };
  if (gradesHydrated && gemGrades && typeof gemGrades === "object" && !Array.isArray(gemGrades)) state.wheelPlanner.gemGrades = gemGrades;
  state.stats.bonus = numberOrZero(payload.bonus);
  if (metadata.vocations.some((entry) => entry.id === payload.vocation) && state.stats.vocation !== payload.vocation) {
    state.stats.vocation = payload.vocation;
    state.stats.stanceIds = [];
    state.rotation = state.rotation.filter((row) => vocationAllows(item("spells", row.id)));
    state.manualPerks = state.manualPerks.filter((row) => vocationAllows(item("perks", row.id)));
    populateStaticControls();
    syncPlannerVocation("proficiency");
  }
  state.wheelPerks = mappedPlannerPerks("wheel");
  renderStatControls();
  renderSyncedEffects("wheel");
  const wheelStatus = document.querySelector("#wheelPlannerStatus");
  if (wheelStatus) wheelStatus.textContent = `${payload.promotionPoints ?? 0} points · ${state.wheelPerks.length} damage effect${state.wheelPerks.length === 1 ? "" : "s"}`;
  document.querySelector("#plannerModalPoints strong").textContent = Number(payload.promotionPoints ?? 0).toLocaleString("en-US");
  changed();
}

function receiveProficiencyBuild(payload) {
  if (!payload || typeof payload !== "object") return;
  const previousWeapon = Number(state.weapon.id);
  state.proficiencyPlanner = { ...state.proficiencyPlanner, ...payload, effects: Array.isArray(payload.effects) ? payload.effects : [] };
  const weapon = metadata.weapons.find((candidate) => normalized(candidate.name) === normalized(payload.weaponName));
  if (weapon) {
    state.weapon.id = weapon.id;
    if (previousWeapon !== weapon.id) { state.weapon.ammoId = null; state.weapon.shieldId = null; }
  }
  state.wheelPerks = mappedPlannerPerks("wheel");
  state.proficiencyPerks = mappedPlannerPerks("proficiency");
  renderEquipment();
  renderSyncedEffects("proficiency");
  const mappedLabel = `${state.proficiencyPerks.length} damage effect${state.proficiencyPerks.length === 1 ? "" : "s"}`;
  const proficiencyStatus = document.querySelector("#proficiencyPlannerStatus");
  if (proficiencyStatus) proficiencyStatus.textContent = `${payload.weaponName ?? "Weapon"} · ${mappedLabel}`;
  changed();
}

function valueControl(perk, row, source) {
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

function renderPerks(source) {
  const key = "manualPerks";
  const container = document.querySelector("#manualPerks");
  container.replaceChildren();
  if (!state[key].length) {
    const empty = document.createElement("div");
    empty.className = "dc-empty-row";
    empty.textContent = "No additional API perks added.";
    container.append(empty);
    return;
  }
  state[key].forEach((row) => {
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
      state[key] = state[key].filter((candidate) => candidate !== row);
      renderPerks(source);
      changed();
    });
    element.append(identity, valueControl(perk, row, source), remove);
    container.append(element);
  });
}

function renderRotation() {
  const container = document.querySelector("#rotationRows");
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
    const targets = numericRowInput(row, "targets", 0, "Average targets");
    const ratio = numericRowInput(row, "ratio", 0, "Cast ratio");
    if (row.id === 1) { ratio.value = "Every turn"; ratio.type = "text"; ratio.disabled = true; }
    element.append(identity, targets, ratio, removeButton(() => {
      state.rotation = state.rotation.filter((candidate) => candidate !== row);
      renderRotation();
      renderPerks("manual");
      changed();
    }));
    container.append(element);
  });
}

function renderTargets() {
  const container = document.querySelector("#targetRows");
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
    const ratio = numericRowInput(row, "ratio", 0, "Kill ratio");
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

function numericRowInput(row, key, minimum, label) {
  const input = document.createElement("input");
  input.type = "number";
  input.min = String(minimum);
  input.step = "0.01";
  input.value = row[key];
  input.setAttribute("aria-label", label);
  input.addEventListener("input", () => { row[key] = numberOrZero(input.value); changed(); });
  return input;
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

function addPerk() {
  const input = document.querySelector("#manualPerkSearch");
  const perk = matchByName("perks", input.value, (entry) => entry.selectable !== false && vocationAllows(entry));
  if (!perk) { input.setCustomValidity("Choose a perk from the list."); input.reportValidity(); return; }
  input.setCustomValidity("");
  const key = "manualPerks";
  if (!state[key].some((row) => row.id === perk.id)) state[key].push({ id: perk.id, value: perk.valueType === "stage" ? 1 : 0 });
  input.value = "";
  renderPerks("manual");
  changed();
}

function addSpell() {
  const input = document.querySelector("#spellSearch");
  const spell = matchByName("spells", input.value, (entry) => entry.selectable !== false && vocationAllows(entry));
  if (!spell) { input.setCustomValidity("Choose a spell from the list."); input.reportValidity(); return; }
  input.setCustomValidity("");
  if (!state.rotation.some((row) => row.id === spell.id)) state.rotation.push({ id: spell.id, targets: 1, ratio: 1 });
  input.value = "";
  renderRotation();
  renderPerks("manual");
  changed();
}

function addTarget() {
  const input = document.querySelector("#creatureSearch");
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
  state.stats.stanceIds.forEach((id) => {
    const mod = LOCAL_STANCE_MODS[id];
    if (mod) statMultipliers[mod.stat] = (statMultipliers[mod.stat] ?? 1) * mod.multiplier;
    else apiStanceIds.push(id);
  });
  const statKeys = ["level", "bonus", "critChance", "critDamage", usesMagicLevel ? "magicLevel" : "skill"];
  statKeys.forEach((key) => {
    const value = key === "bonus" && !wheel ? 0 : Number(state.stats[key]);
    if (Number.isFinite(value)) stats[key] = statMultipliers[key] ? value * statMultipliers[key] : value;
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
  if (!hasCalculated) return;
  clearTimeout(calculateTimer);
  const button = document.querySelector("#calculateDamage");
  // Restart the pulse each change so the button visibly flashes again.
  button.classList.remove("dc-button-stale");
  void button.offsetWidth;
  button.classList.add("dc-button-stale");
  calculationStatus.classList.remove("error");
  calculationStatus.classList.add("dc-status-stale");
  calculationStatus.textContent = "Build changed — press Calculate to update the results.";
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

function resultCard(spell, stages) {
  const spellMeta = item("spells", spell.id) ?? metadata.spells.find((candidate) => candidate.name === spell.name);
  const card = document.createElement("article");
  card.className = `dc-result-card${spellMeta?.spellType === "rune" ? " dc-result-card-rune" : ""}`;
  card.dataset.filterText = normalized([spell.name, spellMeta?.name, spellMeta?.spellType, spellMeta?.element].filter(Boolean).join(" "));
  const identity = document.createElement("div");
  identity.className = "dc-result-identity";
  const name = document.createElement("strong"); name.textContent = spell.name;
  const kind = document.createElement("small");
  kind.textContent = spellMeta?.spellType === "rune" ? "Rune" : spellMeta?.spellType === "auto" ? "Attack" : "Spell";
  identity.append(resultIcon(spell, spellMeta), name, kind);
  const metrics = document.createElement("div");
  metrics.className = "dc-result-metrics";
  const stageSpells = Object.fromEntries(Object.entries(stages).map(([key, stage]) => [key, resultSpell(stage, spell)]));
  [
    ["Effective avg", "effective", "avg"], ["Raw min", "raw", "min"],
    ["Raw avg", "raw", "avg"], ["Raw max", "raw", "max"],
  ].forEach(([label, group, key]) => {
    const metric = document.createElement("div");
    metric.className = "dc-result-metric";
    const heading = document.createElement("span"); heading.textContent = label;
    metric.append(heading);
    renderDamageValue(metric, {
      base: spellMetric(stageSpells.base, group, key), wheel: spellMetric(stageSpells.wheel, group, key),
      proficiency: spellMetric(stageSpells.proficiency, group, key), full: spellMetric(spell, group, key),
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

function filterResultCards() {
  const query = normalized(document.querySelector("#resultFilter").value);
  let visibleTotal = 0;
  let cardTotal = 0;
  document.querySelectorAll("#spellResults .dc-result-group").forEach((group) => {
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
  document.querySelectorAll("#summaryCards article").forEach((article, index) => {
    article.querySelectorAll("strong, .dc-boost-list").forEach((element) => element.remove());
    const key = summaryKeys[index];
    renderDamageValue(article, {
      base: stages.base.summary?.[key], wheel: stages.wheel.summary?.[key],
      proficiency: stages.proficiency.summary?.[key], full: values[index],
    }, sourceDetails);
  });
  const results = document.querySelector("#spellResults");
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
  filterEmpty.id = "resultFilterEmpty";
  filterEmpty.className = "dc-filter-empty";
  filterEmpty.textContent = "No attacks match this filter.";
  filterEmpty.hidden = true;
  results.append(filterEmpty);
  filterResultCards();
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

async function calculate() {
  clearTimeout(calculateTimer);
  requestController?.abort();
  requestController = new AbortController();
  const button = document.querySelector("#calculateDamage");
  button.disabled = true;
  button.classList.remove("dc-button-stale");
  calculationStatus.classList.remove("error", "dc-status-stale");
  calculationStatus.textContent = "Calculating damage and boost breakdown…";
  try {
    const requests = {
      base: damageRequest({ wheel: false, proficiency: false, manual: false }),
      wheel: damageRequest({ wheel: true, proficiency: false, manual: false }),
      proficiency: damageRequest({ wheel: true, proficiency: true, manual: false }),
      full: damageRequest(),
    };
    const pending = new Map();
    const stages = Object.fromEntries(await Promise.all(Object.entries(requests).map(async ([key, request]) => {
      const signature = JSON.stringify(request);
      if (!pending.has(signature)) pending.set(signature, fetchDamage(request, requestController.signal));
      return [key, await pending.get(signature)];
    })));
    renderResults(stages.full, stages);
    lastResult = stages.full;
    hasCalculated = true;
    document.querySelector("#saveBuildImage").disabled = false;
    calculationStatus.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`;
  } catch (error) {
    if (error.name === "AbortError") return;
    calculationStatus.classList.add("error");
    calculationStatus.textContent = error.message || "Could not calculate this build.";
  } finally {
    button.disabled = false;
  }
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

function exportStatSubtitle() {
  const stats = state.stats;
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

function buildExportCard(result) {
  const card = document.createElement("div");
  card.className = "dc-export-card";

  const header = document.createElement("header");
  header.className = "dc-export-header";
  const logo = document.createElement("img");
  logo.className = "dc-export-logo";
  logo.src = "/images/mainlogo.png";
  logo.alt = "TibiaPal";
  const headerText = document.createElement("div");
  headerText.className = "dc-export-header-text";
  const kicker = document.createElement("span");
  kicker.className = "dc-export-kicker";
  kicker.textContent = "TIBIAPAL · DAMAGE BUILD";
  const title = document.createElement("h2");
  title.textContent = state.proficiencyPlanner.weaponName || item("weapons", state.weapon.id)?.name || "Damage build";
  headerText.append(kicker, title, exportStatSubtitle());
  header.append(logo, headerText);
  const weaponSprite = String(state.proficiencyPlanner.weaponSprite ?? "").trim();
  if (weaponSprite) {
    const weaponImg = document.createElement("img");
    weaponImg.className = "dc-export-weapon";
    weaponImg.src = `/${weaponSprite.replace(/^\/+/, "")}`;
    weaponImg.alt = "";
    header.append(weaponImg);
  }

  const summary = document.createElement("div");
  summary.className = "dc-export-summary";
  [["Effective / turn", result.summary?.effectiveDamagePerTurn], ["Effective / hit", result.summary?.effectiveDamagePerHit], ["Charm damage", result.summary?.damageFromCharms]].forEach(([label, value]) => {
    const block = document.createElement("div");
    const span = document.createElement("span");
    span.textContent = label;
    const strong = document.createElement("strong");
    strong.textContent = formatDamage(value);
    block.append(span, strong);
    summary.append(block);
  });

  const gridTitle = document.createElement("div");
  gridTitle.className = "dc-export-grid-title";
  gridTitle.textContent = "Top hits";
  const grid = document.createElement("div");
  grid.className = "dc-export-grid";
  // Druids and sorcerers lean on wave spells; keep single-target strikes from crowding them out.
  const demoteStrikes = state.stats.vocation === "druid" || state.stats.vocation === "sorcerer";
  const strikeRank = (spell) => (demoteStrikes && /\bstrike\b/.test(normalized(item("spells", spell.id)?.name ?? spell.name)) ? 1 : 0);
  const topSpells = visibleResultSpells(result.spells ?? [])
    .filter((spell) => Number.isFinite(Number(spellMetric(spell, "effective", "avg"))))
    .sort((a, b) => strikeRank(a) - strikeRank(b) || Number(spellMetric(b, "effective", "avg")) - Number(spellMetric(a, "effective", "avg")))
    .slice(0, 6);
  grid.append(...topSpells.map(exportSpellTile));

  card.append(header, summary, gridTitle, grid);

  const gems = (state.wheelPlanner.effects ?? []).filter((effect) => effect.group === "gem");
  if (gems.length) {
    const gemTitle = document.createElement("div");
    gemTitle.className = "dc-export-grid-title dc-export-gem-title";
    gemTitle.textContent = "Wheel gems";
    const gemList = document.createElement("div");
    gemList.className = "dc-export-gems";
    gems.forEach((effect) => {
      const chip = document.createElement("span");
      chip.className = "dc-export-gem";
      chip.textContent = effect.label ?? `${effect.name}${effect.value ? ` ${effect.value}` : ""}`;
      gemList.append(chip);
    });
    card.append(gemTitle, gemList);
  }

  const footer = document.createElement("div");
  footer.className = "dc-export-footer";
  footer.textContent = `${window.location.host}/damage-calculator`;

  card.append(footer);
  return card;
}

function buildIsReady(message) {
  if (hasCalculated && lastResult) return true;
  calculationStatus.classList.remove("error");
  calculationStatus.classList.add("dc-status-stale");
  calculationStatus.textContent = message;
  return false;
}

function buildImageFilename() {
  return `tibiapal-${state.stats.vocation}-build.png`;
}

async function renderBuildImageBlob() {
  const card = buildExportCard(lastResult);
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

async function saveBuildImage() {
  if (!buildIsReady("Calculate the build first, then save it as an image.")) return;
  await withBusyButton(document.querySelector("#saveBuildImage"), "Rendering…", async () => {
    try { downloadBlob(await renderBuildImageBlob(), buildImageFilename()); }
    catch (error) { calculationStatus.classList.add("error"); calculationStatus.textContent = error.message || "Could not save the build image."; }
  });
}


function wireEvents() {
  root.querySelectorAll("[data-stat]").forEach((control) => {
    control.addEventListener("input", () => {
      const key = control.dataset.stat;
      state.stats[key] = control.tagName === "SELECT" || key === "imbuementElement" ? control.value : numberOrZero(control.value);
      if (key === "vocation") {
        state.stats.stanceIds = [];
        state.stats.bonus = 0;
        state.wheelPlanner = { code: "", vocation: state.stats.vocation, promotionPoints: 0, bonus: 0, effects: [], gemGrades: {} };
        state.manualPerks = state.manualPerks.filter((row) => vocationAllows(item("perks", row.id)));
        state.rotation = state.rotation.filter((row) => vocationAllows(item("spells", row.id)));
        state.wheelPerks = mappedPlannerPerks("wheel");
        state.proficiencyPerks = mappedPlannerPerks("proficiency");
        populateStaticControls();
        refreshWheelPresetOptions();
        syncPlannerVocation();
        resetWheelPlanner();
      }
      changed();
    });
  });
  document.querySelectorAll("[data-add-perk]").forEach((button) => button.addEventListener("click", addPerk));
  document.querySelector("#addSpell").addEventListener("click", addSpell);
  document.querySelector("#addTarget").addEventListener("click", addTarget);
  document.querySelector("#manualPerkSearch").addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); addPerk(); } });
  document.querySelector("#spellSearch").addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); addSpell(); } });
  document.querySelector("#resultFilter").addEventListener("input", filterResultCards);
  document.querySelector("#creatureSearch").addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); addTarget(); } });
  document.querySelector("#ammoSelect").addEventListener("change", (event) => { state.weapon.ammoId = event.target.value ? Number(event.target.value) : null; changed(); });
  document.querySelector("#shieldSelect").addEventListener("change", (event) => { state.weapon.shieldId = event.target.value ? Number(event.target.value) : null; changed(); });
  document.querySelectorAll("[data-open-planner]").forEach((button) => button.addEventListener("click", () => openPlanner(button.dataset.openPlanner)));
  document.querySelector("#wheelImportBtn").addEventListener("click", importWheelFromInput);
  document.querySelector("#wheelImportInput").addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); importWheelFromInput(); } });
  document.querySelector("#wheelPresetLoad").addEventListener("click", loadSelectedWheelPreset);
  document.querySelector("#wheelPresetSave").addEventListener("click", saveCurrentWheelPreset);
  document.querySelector("#wheelPresetDelete").addEventListener("click", deleteSelectedWheelPreset);
  document.querySelector("#proficiencyImportBtn").addEventListener("click", importProficiencyFromInput);
  document.querySelector("#proficiencyImportInput").addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); importProficiencyFromInput(); } });
  document.querySelector("#proficiencyPresetLoad").addEventListener("click", loadSelectedProficiencyPreset);
  document.querySelector("#proficiencyPresetSave").addEventListener("click", saveCurrentProficiencyPreset);
  document.querySelector("#proficiencyPresetDelete").addEventListener("click", deleteSelectedProficiencyPreset);
  document.querySelector("#wheelPlannerFrame").addEventListener("load", () => {
    syncPlannerVocation("wheel");
    syncWheelGrades();
  });
  document.querySelector("#proficiencyPlannerFrame").addEventListener("load", () => syncPlannerVocation("proficiency"));
  setupEffectsInfo();
  document.querySelector("#closePlannerModal").addEventListener("click", closePlanner);
  document.querySelector("#donePlannerModal").addEventListener("click", closePlanner);
  plannerModal.addEventListener("click", (event) => { if (event.target === plannerModal) closePlanner(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !plannerModal.hidden) closePlanner(); });
  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) return;
    if (event.source === document.querySelector("#wheelPlannerFrame").contentWindow && event.data?.type === "tibiapal:wheel-build") receiveWheelBuild(event.data.payload);
    if (event.source === document.querySelector("#proficiencyPlannerFrame").contentWindow && event.data?.type === "tibiapal:proficiency-build") receiveProficiencyBuild(event.data.payload);
  });
  form.addEventListener("submit", (event) => { event.preventDefault(); calculate(); });
  document.querySelector("#resetBuild").addEventListener("click", () => {
    if (!window.confirm("Reset every field in this damage build?")) return;
    state = defaultState(); hasCalculated = false; lastResult = null; document.querySelector("#saveBuildImage").disabled = true; saveState(); populateStaticControls(); initializePlannerFrames(); renderResults({ summary: {}, spells: [] }); calculationStatus.textContent = "Ready to calculate.";
  });
  document.querySelector("#shareBuild").addEventListener("click", async (event) => {
    const url = new URL(window.location.href); url.searchParams.set("build", encodeBuild(shareableBuild()));
    try { await navigator.clipboard.writeText(url.href); event.currentTarget.textContent = "Link copied!"; window.setTimeout(() => { event.currentTarget.textContent = "Copy build link"; }, 1500); }
    catch { window.prompt("Copy this build link:", url.href); }
  });
  document.querySelector("#saveBuildImage").addEventListener("click", saveBuildImage);
}

async function loadMetadata() {
  try {
    const responses = await Promise.all(META_RESOURCES.map((resource) => fetch(`${API_ROOT}/meta/${resource}`, { headers: { Accept: "application/json" } })));
    const failed = responses.find((response) => !response.ok);
    if (failed) throw new Error(`TibiaTools metadata returned HTTP ${failed.status}.`);
    const bodies = await Promise.all(responses.map((response) => response.json()));
    bodies.forEach((body) => { metadata[body.resource] = body.items; });
    state = restoreState();
    if (!item("vocations", state.stats.vocation)) state.stats.vocation = "knight";
    wireEvents();
    populateStaticControls();
    initializePlannerFrames();
    saveState();
    metadataStatus.hidden = true;
    form.hidden = false;
    root.setAttribute("aria-busy", "false");
  } catch (error) {
    metadataStatus.classList.add("dc-error");
    metadataStatus.replaceChildren(document.createTextNode(`${error.message} Please reload to try again.`));
    root.setAttribute("aria-busy", "false");
  }
}

loadMetadata();
