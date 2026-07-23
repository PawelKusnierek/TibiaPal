const calculator = document.querySelector("#weaponProficiencyCalculator") ?? document;
const $ = (selector) => calculator.querySelector(selector);
const state = { profiles: [], shapingGroups: {}, filtered: [], current: null, selected: {}, applied: {}, modified: {}, filter: "all", family: "all", dust: 4600, orbs: 1, activeSlot: null, modifyTarget: null, picker: null };
const refineCosts = [125, 200, 275, 350, 425, 500, 575, 650, 725, 800];

const perkNames = {
  0: "Attack damage", 1: "Defence", 2: "Weapon shield",
  3: "Combat skill", 4: "Specialized magic level", 5: "Spell augmentation",
  6: "Damage against bestiary family", 7: "Damage against bosses and Sinister Embraced", 8: "Critical hit chance",
  9: "Elemental critical hit chance", 10: "Rune critical hit chance",
  11: "Auto-attack critical hit chance", 12: "Critical extra damage",
  13: "Elemental critical extra damage", 14: "Rune critical extra damage",
  15: "Auto-attack critical extra damage", 16: "Mana leech",
  17: "Armor penetration", 18: "Life on hit", 19: "Mana on hit",
  20: "Life on kill", 21: "Mana on kill", 22: "Damage at range",
  23: "Ranged chance to hit", 24: "Attack range",
  25: "Combat skill scaling for auto-attacks",
  26: "Combat skill scaling for spell damage",
  27: "Combat skill scaling for healing",
  28: "Highest combat skill scaling for auto-attacks",
  29: "Highest combat skill scaling for spell damage",
  30: "Highest combat skill scaling for healing",
  31: "Elemental pierce", 32: "Homing missile",
};
const spellNames = {
  1: "Light Healing", 2: "Intense Healing", 13: "Energy Wave",
  19: "Fire Wave", 21: "Sudden Death", 22: "Energy Beam",
  23: "Great Energy Beam", 24: "Hell's Core", 43: "Strong Ice Wave",
  56: "Wrath of Nature", 57: "Strong Ethereal Spear", 59: "Front Sweep",
  61: "Brutal Strike", 62: "Annihilation", 80: "Berserk",
  84: "Heal Friend", 87: "Death Strike", 88: "Energy Strike",
  89: "Flame Strike", 105: "Fierce Berserk", 106: "Groundshaker",
  107: "Whirlwind Throw", 112: "Ice Strike", 113: "Terra Strike",
  118: "Eternal Winter", 119: "Rage of the Skies", 120: "Terra Wave",
  121: "Ice Wave", 122: "Divine Missile", 123: "Wound Cleansing",
  124: "Divine Caldera", 125: "Divine Healing", 141: "Inflict Wound",
  148: "Physical Strike", 150: "Strong Flame Strike",
  153: "Strong Terra Strike", 154: "Ultimate Flame Strike",
  155: "Ultimate Energy Strike", 156: "Ultimate Ice Strike",
  157: "Ultimate Terra Strike", 158: "Intense Wound Cleansing",
  169: "Apprentice's Strike", 173: "Chill Out", 177: "Buzz", 178: "Scorch",
  238: "Divine Dazzle", 240: "Great Fire Wave", 258: "Divine Grenade",
  260: "Great Death Beam", 261: "Executioner's Throw", 263: "Ice Burst",
  264: "Avatar of Steel", 265: "Avatar of Light", 266: "Avatar of Storm",
  267: "Avatar of Nature", 268: "Divine Empowerment", 270: "Lesser Ethereal Spear",
  271: "Lesser Front Sweep", 283: "Avatar of Balance", 287: "Flurry of Blows",
  288: "Chained Penance", 289: "Greater Flurry of Blows", 290: "Mystic Repulse",
  292: "Greater Tiger Clash", 293: "Devastating Knockout", 294: "Sweeping Takedown",
  301: "Thousand Fist Blows", 302: "Divine Barrage", 303: "Ethereal Barrage",
  310: "Death Echo", 316: "Shield Slam", 318: "Forked Thorns",
};
const augmentNames = {
  2: "base damage", 3: "healing", 6: "cooldown", 14: "life leech",
  15: "mana leech", 16: "critical extra damage", 17: "critical hit chance",
};
const elementNames = { 1: "Physical", 8: "Energy", 16: "Earth", 32: "Fire", 64: "Ice", 128: "Holy", 256: "Death", 1048576: "Healing" };
const weaponGlyphs = { Sword: "⚔", Axe: "⚒", Club: "✥", Bow: "➶", Crossbow: "➵", Wand: "⚚", Rod: "ϟ", Fist: "✊", Throw: "✦" };
function weaponType(name) {
  return Object.keys(weaponGlyphs).find((type) => name.includes(type)) ?? "Throw";
}

function applyWeaponSprite(element, profile) {
  if (!profile.weapon?.sprite) return;
  element.style.backgroundImage = `url('../${profile.weapon.sprite}')`;
  element.style.setProperty("--sprite-x", 0);
  element.style.setProperty("--sprite-y", 0);
}

function formatValue(value) {
  if (!Number.isFinite(Number(value))) return "";
  if (Math.abs(value) < 1) return `${Math.round(value * 10000) / 100}%`;
  return Number.isInteger(value) ? `${value}` : `${Math.round(value * 100) / 100}`;
}

function combatSkill(profile) {
  const name = profile?.ProfileName ?? profile?.Name ?? "";
  if (/\b(Wand|Rod)\b/i.test(name)) return "Magic Level";
  if (/\b(Bow|Crossbow|Distance|Throw)\b/i.test(name)) return "Distance Fighting";
  if (/\bSword\b/i.test(name)) return "Sword Fighting";
  if (/\bAxe\b/i.test(name)) return "Axe Fighting";
  if (/\bClub\b/i.test(name)) return "Club Fighting";
  if (/\bFist\b/i.test(name)) return "Fist Fighting";
  return "Combat Skill";
}

function perkLabel(perk, profile = state.current) {
  if (perk.ShapeEffect) {
    const value = Math.round(Number(perk.Value) * 100) / 100;
    return perk.ShapeEffect.replace("{value}", value.toLocaleString("en-US", { maximumFractionDigits: 2 }));
  }
  if (perk.sourceDescription) return perk.sourceDescription;
  if (perk.ShapeLabel) return perk.ShapeLabel.replace("{value}", formatValue(perk.Value));
  const name = perkNames[perk.Type] ?? `Proficiency effect ${perk.Type}`;
  if (perk.SpellId != null) {
    const spell = perk.SpellName ?? spellNames[perk.SpellId] ?? spellDetails(perk.SpellId, profile)?.name ?? `Unknown spell (${perk.SpellId})`;
    const augment = augmentNames[perk.AugmentType] ?? `spell effect (augment ${perk.AugmentType})`;
    const value = formatValue(perk.Value);
    return `${spell}: ${augment}${value ? ` +${value}` : ""}`;
  }
  if (perk.Type === 3) return `+${formatValue(perk.Value)} ${combatSkill(profile)}`;
  if (perk.Type === 4) return `+${formatValue(perk.Value)} ${elementNames[perk.DamageType ?? perk.ElementId] ?? "Specialized"} Magic Level`;
  if (perk.Type === 7) return `+${formatValue(perk.Value)} damage against bosses and Sinister Embraced`;
  if (perk.Type === 9) return `+${formatValue(perk.Value)} critical hit chance for ${elementNames[perk.ElementId] ?? "elemental"} spells and runes`;
  if (perk.Type === 13) return `+${formatValue(perk.Value)} critical extra damage for ${elementNames[perk.ElementId] ?? "elemental"} spells and runes`;
  if (perk.Type === 25) return `+${formatValue(perk.Value)} of your ${combatSkill(profile)} as extra damage for auto-attacks`;
  if (perk.Type === 26) return `+${formatValue(perk.Value)} of your ${combatSkill(profile)} as extra damage for spells`;
  if (perk.Type === 27) return `+${formatValue(perk.Value)} of your ${combatSkill(profile)} as extra healing for spells`;
  const target = perk.BestiaryName ? ` against ${perk.BestiaryName}` : "";
  const value = formatValue(perk.Value);
  return `${name}${target}${value ? ` +${value}` : ""}`;
}

function elementalArtworkFrame(value, frames = 7) {
  const elementFrames = { 1: 0, 32: 1, 8: 2, 16: 3, 64: 4, 256: 5, 128: 6 };
  return elementFrames[Number(value)] ?? 0;
}

function specializedMagicArtworkFrame(value) {
  const damageTypeFrames = { 32: 0, 64: 1, 16: 2, 8: 3, 256: 4, 128: 5, 1048576: 6 };
  return damageTypeFrames[Number(value)] ?? 0;
}

function skillArtworkFrame(skillId) {
  return ({ 8: 0, 10: 1, 9: 2, 11: 3, 1: 4, 6: 5, 7: 6, 13: 8 })[skillId] ?? 4;
}

function vocation(profile) {
  const type = profile?.WeaponType ?? weaponType(profile.Name);
  return ({ Sword: "Knight", Axe: "Knight", Club: "Knight", Bow: "Paladin", Crossbow: "Paladin", Throw: "Paladin", Fist: "Monk", Wand: "Sorcerer", Rod: "Druid" })[type] ?? "Knight";
}

function spellDetails(spellId, profile) {
  const preferredVocation = vocation(profile);
  const matches = [];
  for (const candidate of state.profiles) {
    for (const level of candidate.Levels) for (const perk of level.Perks) {
      if (perk.Type === 5 && perk.SpellId === spellId) matches.push({ candidate, perk });
    }
  }
  matches.sort((left, right) => Number(vocation(right.candidate) === preferredVocation) - Number(vocation(left.candidate) === preferredVocation));
  let artwork = matches.find(({ perk }) => perk.optionImage
    || (perk.sprite?.file && !perk.sprite.file.includes("icons-weaponmastery")))?.perk;
  const described = matches.find(({ perk }) => perk.sourceDescription)?.perk?.sourceDescription;
  const name = spellNames[spellId] ?? described?.match(/\bfor (.+)$/i)?.[1];
  const localFallbacks = new Set([125, 173, 178, 268, 292]);
  if (!artwork && name && localFallbacks.has(spellId)) {
    const filename = name.toLowerCase().replaceAll("'", "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const file = `images/proficiency/source/fandom/proficiency-spell-${filename}.gif`;
    artwork = { optionImage: file, sprite: { file, frame: 0, frames: 1, width: 32, height: 32, displayWidth: 64, displayHeight: 64 } };
  }
  if (!artwork || !name) return null;
  return { name, artwork };
}

function shapingPool(profile) {
  const records = [
    ...(state.shapingGroups["Todas as Vocações"] ?? []),
    ...(state.shapingGroups[vocation(profile)] ?? []),
  ];
  return records.map(shapingRecordToPerk);
}

function shapingRecordToPerk(record) {
  const number = (text) => Number(text.match(/[+]?(\d+(?:[.,]\d+)?)/)?.[1].replace(",", ".") ?? 0);
  const min = number(record.rank0);
  const max = number(record.rank10);
  const spellMatch = record.name.match(/^Spell Augment (.+) (Base Damage|Critical Extra Damage|Critical Hit Chance|Life Leech|Mana Leech)$/);
  let title = record.name;
  let category = "General";
  let effect = record.name;
  if (spellMatch) {
    const [, spell, augment] = spellMatch;
    title = `${spell} ${augment}`;
    category = "Spell Augment";
    effect = `+{value}% ${augment.toLowerCase()} for ${spell}`;
  } else if (record.name.startsWith("Bestiary Damage ")) {
    const family = record.name.slice("Bestiary Damage ".length);
    category = "Bestiary Damage";
    effect = `+{value}% damage against ${family} creatures`;
  } else {
    const effects = {
      "Alpha Strike Extra Damage": "+{value}% damage against targets above 95% health",
      "Armor Penetration": "+{value}% armor penetration",
      "Auto-Attack Critical Extra Damage": "+{value}% critical extra damage for auto-attacks",
      "Auto-Attack Critical Hit Chance": "+{value}% critical hit chance for auto-attacks",
      "Highest Combat Skill Percentage Auto-Attack Damage": "+{value}% of your highest combat skill as extra auto-attack damage",
      "Highest Combat Skill Percentage Spell Damage": "+{value}% of your highest combat skill as extra spell damage",
      "Highest Combat Skill Percentage Spell Healing": "+{value}% of your highest combat skill as extra spell healing",
      "Life Gain on Hit": "+{value} hit points on hit",
      "Life Gain on Kill": "+{value} hit points on kill",
      "Mana Gain on Kill": "+{value} mana on kill",
      "Omega Strike Extra Damage": "+{value}% damage against targets below 30% health",
      "Rune Critical Extra Damage": "+{value}% critical extra damage for offensive runes",
      "Rune Critical Hit Chance": "+{value}% critical hit chance for offensive runes",
    };
    effect = effects[record.name] ?? `${record.name} +{value}%`;
  }
  const icon = `images/proficiency/shaping/${record.icon.split("/").pop()}`;
  return {
    Type: spellMatch ? 5 : -1,
    ShapeKey: record.sourceUrl.split("/").pop(),
    ShapeName: title,
    ShapeCategory: category,
    ShapeEffect: effect,
    Value: min,
    MinValue: min,
    MaxValue: max,
    optionImage: icon,
    sprite: { file: icon, frame: 0, frames: 1, width: 32, height: 32, displayWidth: 64, displayHeight: 64 },
  };
}

function valueAtRank(perk, rank) {
  const copy = { ...perk };
  const min = copy.MinValue ?? copy.Value;
  const max = copy.MaxValue ?? copy.Value;
  copy.Value = min + (max - min) * rank / 10;
  return copy;
}

function randomChoices(profile, rank, excluded) {
  const pool = shapingPool(profile).filter((perk) => perkLabel(perk, profile) !== perkLabel(excluded, profile));
  const shuffled = pool.map((perk) => ({ perk, n: Math.random() })).sort((a, b) => a.n - b.n);
  return shuffled.slice(0, 3).map(({ perk }) => valueAtRank(perk, rank));
}

function modificationMap() { return state.modified[state.current.ProficiencyId] ??= {}; }
function modifiedCount() { return Object.keys(modificationMap()).length; }

function makePerkCard(perk, rank, buttonText, onClick) {
  const card = document.createElement("article");
  card.className = "shape-card";
  card.innerHTML = `<div class="shape-icon"><span></span><b>${rank}</b></div><p>${perkLabel(perk)}</p>${buttonText ? `<button>${buttonText}</button>` : ""}`;
  const icon = card.querySelector(".shape-icon span");
  applyPerkSprite(icon, perk);
  if (onClick) card.querySelector("button").addEventListener("click", onClick);
  return card;
}

function updateWallet() {
  $("#dustBalance").textContent = state.dust.toLocaleString();
  $("#orbBalance").textContent = state.orbs;
}

function openShape(levelIndex) {
  state.activeSlot = levelIndex;
  const modification = modificationMap()[levelIndex];
  if (!modification) return;
  $("#shapeCurrent").replaceChildren(makePerkCard(modification.perk, modification.rank));
  $("#shapeHint").textContent = `Modified slot ${modifiedCount()} of 2 · proficiency level ${levelIndex + 1}`;
  const nextCost = refineCosts[modification.rank];
  $("#refineCost").innerHTML = nextCost == null ? "Maximum rank" : `${nextCost} <span class="shard">◆</span>`;
  $("#refineButton").disabled = nextCost == null || state.dust < nextCost;
  $("#maximiseButton").disabled = modification.rank === 10 || state.orbs < 1;
  $("#reshapeButton").disabled = state.dust < 250;
  updateWallet();
  $("#shapeBackdrop").hidden = false;
}

function shapeSlot(levelIndex) {
  const modifications = modificationMap();
  if (modifications[levelIndex]) { openShape(levelIndex); return; }
  const count = modifiedCount();
  if (count >= 2) { alert("This weapon already has two modified perk slots."); return; }
  const cost = count === 0 ? 250 : 1000;
  if (state.dust < cost) { alert(`You need ${cost} dust to shape this slot.`); return; }
  openPerkPicker(levelIndex, cost, true);
}

function openPerkPicker(levelIndex, cost, isNew = false) {
  const currentModification = modificationMap()[levelIndex];
  const rank = currentModification?.rank ?? 0;
  const currentPerk = currentModification?.perk ?? state.current.Levels[levelIndex].Perks[state.selected[state.current.ProficiencyId][levelIndex]];
  const pool = shapingPool(state.current)
    .map((perk) => valueAtRank(perk, rank))
    .sort((a, b) => perkLabel(a).localeCompare(perkLabel(b)));
  state.picker = { levelIndex, cost, isNew, pool, currentPerk };
  $("#reshapeFilter").value = "";
  renderPerkOptions();
  $("#pickerCost").innerHTML = `Cost: ${cost.toLocaleString()} <span class="shard">◆</span> · rank ${rank}`;
  renderPickerPreview();
  $("#reshapeBackdrop").hidden = false;
}

function renderPerkOptions() {
  const query = $("#reshapeFilter").value.trim().toLowerCase();
  const matches = state.picker.pool
    .map((perk, index) => ({ perk, index, label: perkLabel(perk) }))
    .filter(({ label }) => !query || label.toLowerCase().includes(query));
  const select = $("#reshapeSelect");
  select.innerHTML = matches.map(({ index, label }) => `<option value="${index}">${label}</option>`).join("");
  const preferred = matches.find(({ perk }) => perkLabel(perk) !== perkLabel(state.picker.currentPerk)) ?? matches[0];
  if (preferred) select.value = String(preferred.index);
  const list = $("#reshapePerkList");
  list.replaceChildren(...matches.map(({ perk, index }) => makeReshapeRow(perk, index)));
  renderPickerPreview();
}

function makeReshapeRow(perk, index) {
  const row = document.createElement("button");
  row.type = "button";
  row.className = "reshape-perk-row";
  row.dataset.index = index;
  row.setAttribute("role", "option");

  const identity = document.createElement("span");
  identity.className = "reshape-perk-identity";
  const iconWrap = document.createElement("span");
  iconWrap.className = "reshape-list-icon";
  const icon = document.createElement("span");
  applyPerkSprite(icon, perk);
  iconWrap.append(icon);
  if (perk.iconImage) {
    const augment = document.createElement("img");
    augment.src = perk.iconImage;
    augment.alt = "";
    iconWrap.append(augment);
  }
  const names = document.createElement("span");
  const title = document.createElement("strong");
  title.textContent = perk.ShapeName
    ?? perk.SpellName
    ?? perk.ShapeLabel?.replace(/\s*[+:]?\s*\{value\}.*$/, "")
    ?? perkNames[perk.Type]
    ?? "Weapon perk";
  const category = document.createElement("small");
  category.textContent = perk.ShapeCategory ?? perkNames[perk.Type] ?? "Weapon proficiency";
  names.append(title, category);
  identity.append(iconWrap, names);

  const minimum = document.createElement("span");
  minimum.className = "reshape-rank-effect";
  minimum.textContent = perkLabel(valueAtRank(perk, 0));
  const maximum = document.createElement("span");
  maximum.className = "reshape-rank-effect rank-maximum";
  maximum.textContent = perkLabel(valueAtRank(perk, 10));
  row.append(identity, minimum, maximum);
  row.addEventListener("click", () => {
    $("#reshapeSelect").value = String(index);
    renderPickerPreview();
  });
  return row;
}

function renderPickerPreview() {
  const perk = state.picker?.pool[Number($("#reshapeSelect").value)];
  const selectedIndex = Number($("#reshapeSelect").value);
  calculator.querySelectorAll(".reshape-perk-row").forEach((row) => {
    const selected = Boolean(perk) && Number(row.dataset.index) === selectedIndex;
    row.classList.toggle("selected", selected);
    row.setAttribute("aria-selected", String(selected));
  });
}

function perkArtwork(perk) {
  if (perk.sprite) {
    return {
      file: perk.sprite.file,
      frame: perk.sprite.frame,
      frames: perk.sprite.frames,
      width: perk.sprite.width,
      height: perk.sprite.height,
      displayWidth: perk.sprite.displayWidth,
      displayHeight: perk.sprite.displayHeight,
    };
  }
  const genericFrames = {
    0: 0, 1: 1, 2: 1, 5: 0, 7: 12, 8: 4,
    10: 6, 11: 7, 12: 5, 14: 6, 15: 7, 16: 13,
    17: 3, 18: 10, 19: 11, 20: 12, 21: 13,
    22: 15, 23: 16, 24: 17,
  };
  const main = { file: "icons-weaponmastery.png", frame: genericFrames[perk.Type] ?? 0, frames: 22 };
  if (perk.Type === 3) return { file: "icons-weaponmastery-offensiveBonusSkill.png", frame: skillArtworkFrame(perk.SkillId), frames: 8 };
  if (perk.Type === 4) return { file: "icon-weaponsmastery-specializedMagicLevel.png", frame: specializedMagicArtworkFrame(perk.DamageType ?? perk.ElementId), frames: 7 };
  if (perk.Type === 6) return { file: "icons-weaponmastery-damagaAgainstBestiary.png", frame: Math.max(0, (perk.BestiaryId ?? 1) - 1) % 21, frames: 21 };
  if (perk.Type === 9) return { file: "icons-weaponmastery-criticalHitChanceElement.png", frame: elementalArtworkFrame(perk.ElementId), frames: 7 };
  if (perk.Type === 13) return { file: "icons-weaponmastery-criticalExtraDamageElement.png", frame: elementalArtworkFrame(perk.ElementId), frames: 7 };
  if (perk.Type === 25 || perk.Type === 28) return { file: "icons-weaponmastery-gainExtraDamageAutoAttack.png", frame: skillArtworkFrame(perk.SkillId), frames: 9 };
  if (perk.Type === 26 || perk.Type === 29) return { file: "icons-weaponmastery-gainExtraDamageSpells.png", frame: skillArtworkFrame(perk.SkillId), frames: 9 };
  if (perk.Type === 27 || perk.Type === 30) return { file: "icons-weaponmastery-gainExtraHealingSpells.png", frame: skillArtworkFrame(perk.SkillId), frames: 9 };
  if (perk.Type === 31) return { file: "icons-weaponmastery-elementalPiercing.png", frame: elementalArtworkFrame(perk.ElementId), frames: 7 };
  if (perk.Type === 32) return { file: "icons-weaponmastery-homingMissile.png", frame: elementalArtworkFrame(perk.ElementId ?? perk.MissileId), frames: 7 };
  return main;
}

function applyPerkSprite(element, perk) {
  const artwork = perkArtwork(perk);
  const width = artwork.displayWidth ?? artwork.width ?? 64;
  const height = artwork.displayHeight ?? artwork.height ?? 64;
  const file = /^https?:\/\//.test(artwork.file) ? artwork.file
    : artwork.file.startsWith("images/") ? `../${artwork.file}` : `../images/proficiency/${artwork.file}`;
  element.style.backgroundImage = `url('${file}')`;
  element.style.backgroundSize = `${artwork.frames * width}px ${height}px`;
  element.style.backgroundPosition = `${artwork.frame * -width}px 0`;
}

function logImageStatus(label, url) {
  if (!url) return console.info(`[Proficiency image] ${label}: none`);
  const probe = new Image();
  probe.onload = () => console.info(`[Proficiency image] ${label}: loaded`, {
    url, width: probe.naturalWidth, height: probe.naturalHeight,
  });
  probe.onerror = () => console.error(`[Proficiency image] ${label}: FAILED`, url);
  probe.src = url;
}

function buildFamilies() {
  const families = [...new Set(state.profiles.map((p) => p.WeaponType))].sort();
  $("#familySelect").innerHTML = `<option value="all">Weapons: All</option>${families.map((f) => `<option>${f}</option>`).join("")}`;
}

function filterProfiles() {
  const query = $("#search").value.trim().toLowerCase();
  state.filtered = state.profiles.filter((p) => {
    const matchesSearch = !query || p.Name.toLowerCase().includes(query);
    const matchesFamily = state.family === "all" || p.WeaponType === state.family;
    const matchesFilter = state.filter === "all" || p.Handedness === state.filter;
    return matchesSearch && matchesFamily && matchesFilter;
  }).sort((a, b) => weaponDisplayPriority(a.Name) - weaponDisplayPriority(b.Name));
  renderGrid();
}

function weaponDisplayPriority(name) {
  const normalized = name.toLowerCase();
  if (normalized.includes("moonsilver")) return 0;
  if (normalized.includes("sanguine")) return 1;
  if (normalized.includes("soul")) return 2;
  return 3;
}

function renderGrid() {
  const grid = $("#weaponGrid");
  grid.replaceChildren();
  for (const profile of state.filtered) {
    const tile = $("#weaponTemplate").content.firstElementChild.cloneNode(true);
    const type = profile.WeaponType;
    tile.title = profile.Name;
    tile.dataset.id = profile.ProficiencyId;
    tile.classList.toggle("selected", profile === state.current);
    const glyph = tile.querySelector(".weapon-glyph");
    glyph.textContent = weaponGlyphs[type] ?? "✦";
    applyWeaponSprite(glyph, profile);
    tile.querySelector(".weapon-level").textContent = profile.Levels.length;
    tile.addEventListener("click", () => selectProfile(profile));
    grid.append(tile);
  }
}

function selectProfile(profile) {
  state.current = profile;
  state.modifyTarget = null;
  state.selected[profile.ProficiencyId] ??= profile.Levels.map(() => 0);
  $("#weaponName").textContent = profile.Name;
  $("#crestGlyph").textContent = weaponGlyphs[profile.WeaponType] ?? "✦";
  applyWeaponSprite($("#crestGlyph"), profile);
  const selectedLevels = profile.Levels.length;
  renderGrid();
  renderBoard();
}

function renderBoard() {
  const profile = state.current;
  const choices = state.selected[profile.ProficiencyId];
  const tabs = $("#levelTabs");
  const board = $("#levelBoard");
  const labels = $("#perkLabels");
  tabs.replaceChildren(); board.replaceChildren(); labels.replaceChildren();

  profile.Levels.forEach((level, levelIndex) => {
    const unlocked = true;
    const tab = document.createElement("button");
    tab.className = `level-tab ${unlocked ? "unlocked" : ""}`;
    tab.textContent = "★";
    tab.title = `Proficiency level ${levelIndex + 1}`;
    tabs.append(tab);

    const column = document.createElement("div");
    column.className = `level-column ${unlocked ? "unlocked" : ""}`;
    const mobileTitle = document.createElement("strong");
    mobileTitle.className = "mobile-level-title";
    mobileTitle.textContent = `Proficiency Level ${levelIndex + 1}`;
    column.append(mobileTitle);
    level.Perks.forEach((perk, perkIndex) => {
      const node = document.createElement("button");
      const selected = choices[levelIndex] === perkIndex;
      const modification = modificationMap()[levelIndex];
      const modified = modification?.originalChoice === perkIndex;
      const displayPerk = modified ? modification.perk : perk;
      node.className = `perk-node ${selected ? "selected" : ""} ${modified ? "modified" : ""} ${state.modifyTarget === levelIndex && selected ? "modify-target" : ""}`;
      node.innerHTML = "<span></span>";
      const icon = node.firstElementChild;
      applyPerkSprite(icon, displayPerk);
      if (displayPerk.iconImage) {
        const augmentIcon = document.createElement("img");
        augmentIcon.className = "augment-icon";
        augmentIcon.src = displayPerk.iconImage;
        augmentIcon.alt = "";
        node.append(augmentIcon);
      }
      node.title = perkLabel(displayPerk, profile);
      if (modified) node.insertAdjacentHTML("beforeend", `<b class="rank-badge">${modification.rank}</b>`);
      node.addEventListener("click", () => {
        console.groupCollapsed(`[Proficiency] ${profile.Name} · level ${levelIndex + 1} · option ${perkIndex + 1}`);
        console.table({
          weapon: profile.Name,
          level: levelIndex + 1,
          option: perkIndex + 1,
          description: perkLabel(displayPerk, profile),
          optionImage: displayPerk.optionImage ?? displayPerk.sprite?.file ?? "",
          iconImage: displayPerk.iconImage ?? "",
          source: displayPerk.sourceDescription ? "x.json WeaponProficiencys" : "fallback profile",
        });
        console.groupEnd();
        logImageStatus("main", displayPerk.optionImage ?? displayPerk.sprite?.file ?? "");
        logImageStatus("augment", displayPerk.iconImage ?? "");
        choices[levelIndex] = perkIndex;
        state.modifyTarget = levelIndex;
        renderBoard();
      });
      column.append(node);
    });
    const modification = modificationMap()[levelIndex];
    const selectedPerk = modification?.originalChoice === choices[levelIndex]
      ? modification.perk
      : level.Perks[choices[levelIndex]];
    const mobileLabel = document.createElement("div");
    mobileLabel.className = "mobile-perk-label";
    mobileLabel.textContent = selectedPerk ? perkLabel(selectedPerk, profile) : "";
    column.append(mobileLabel);
    board.append(column);

    const label = document.createElement("div");
    label.className = "perk-label";
    label.textContent = selectedPerk ? perkLabel(selectedPerk, profile) : "";
    labels.append(label);
  });
  $("#progressBar").style.width = "100%";
  const targetModification = state.modifyTarget == null ? null : modificationMap()[state.modifyTarget];
  const targetIsModified = targetModification?.originalChoice === choices[state.modifyTarget];
  $("#modifyButton").disabled = state.modifyTarget == null;
  $("#modifyButton").classList.toggle("ready", state.modifyTarget != null);
  $("#modifyButton").textContent = state.modifyTarget == null
    ? "⚒ Select a perk"
    : targetIsModified ? "🔮 Reshape selected perk" : "⚒ Modify selected perk";
  $("#selectionHint").textContent = state.modifyTarget == null
    ? "Choose a perk on the board to modify it."
    : targetIsModified
      ? `Level ${state.modifyTarget + 1} custom perk selected · click Reshape to replace it.`
      : `Level ${state.modifyTarget + 1} selected · click Modify to reshape it.`;
  renderBuildSummary();
  syncBuildUrl();
}

function summaryKey(perk) {
  return [
    perk.Type,
    perk.SkillId ?? "",
    perk.ElementId ?? "",
    perk.DamageType ?? "",
    perk.SpellId ?? "",
    perk.AugmentType ?? "",
    perk.BestiaryId ?? "",
    perk.BestiaryName ?? "",
    perk.MissileId ?? "",
  ].join(":");
}

function renderBuildSummary() {
  const profile = state.current;
  const summary = $("#buildSummary");
  if (!profile || !summary) return;

  const choices = state.selected[profile.ProficiencyId];
  const selected = profile.Levels.flatMap((level, levelIndex) => {
    const modification = modificationMap()[levelIndex];
    const perk = modification?.originalChoice === choices[levelIndex]
      ? modification.perk
      : level.Perks[choices[levelIndex]];
    return perk ? [{ level: levelIndex + 1, perk }] : [];
  });
  const grouped = new Map();
  for (const { level, perk } of selected) {
    const key = summaryKey(perk);
    const entry = grouped.get(key) ?? { perk: { ...perk, Value: 0 }, levels: [] };
    entry.perk.Value += Number(perk.Value) || 0;
    entry.levels.push(level);
    grouped.set(key, entry);
  }

  $("#buildSummaryMeta").textContent = `${profile.Name} · ${selected.length} selected level${selected.length === 1 ? "" : "s"}`;
  summary.replaceChildren();
  for (const { perk, levels } of grouped.values()) {
    const item = document.createElement("article");
    const levelLabel = levels.length === 1 ? `Level ${levels[0]}` : `Levels ${levels.join(", ")}`;
    const icon = document.createElement("span");
    icon.className = "summary-icon";
    applyPerkSprite(icon, perk);
    const text = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = perkLabel(perk, profile);
    const small = document.createElement("small");
    small.textContent = levelLabel;
    text.append(strong, small);
    item.append(icon, text);
    summary.append(item);
  }
}

function cloneSelections(value) { return JSON.parse(JSON.stringify(value)); }

function encodeBuild(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function decodeBuild(value) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0))));
}

function syncBuildUrl() {
  if (!state.current) return;
  const id = state.current.ProficiencyId;
  const url = new URL(window.location.href);
  const shaped = state.modified[id] ?? {};
  const compactShapes = Object.entries(shaped).map(([level, modification]) => [
    Number(level),
    modification.originalChoice,
    modification.rank,
    modification.perk.ShapeKey,
  ]);
  url.searchParams.set("build", encodeBuild({ w: id, p: state.selected[id], s: compactShapes }));
  url.searchParams.delete("weapon");
  url.searchParams.delete("perks");
  url.searchParams.delete("shaped");
  history.replaceState(null, "", url);
}

function restoreBuildFromUrl() {
  const params = new URLSearchParams(window.location.search);
  let weaponId = Number(params.get("weapon"));
  let choicesValue = (params.get("perks") ?? "").split(",").map(Number);
  let shapedValue = params.get("shaped");
  const token = params.get("build");
  if (token) {
    try {
      const build = decodeBuild(token);
      weaponId = Number(build.w);
      choicesValue = Array.isArray(build.p) ? build.p.map(Number) : [];
      shapedValue = Object.fromEntries((Array.isArray(build.s) ? build.s : []).map(([level, originalChoice, rank, ShapeKey]) => [
        level,
        { originalChoice, rank, perk: { ShapeKey } },
      ]));
    } catch (error) {
      console.warn("Ignored invalid proficiency build token", error);
      return null;
    }
  }
  const profile = state.profiles.find((candidate) => candidate.ProficiencyId === weaponId);
  if (!profile) return null;
  state.selected[profile.ProficiencyId] = profile.Levels.map((level, index) => {
    const choice = choicesValue[index];
    return Number.isInteger(choice) && choice >= 0 && choice < level.Perks.length ? choice : 0;
  });
  if (shapedValue) {
    try {
      const shaped = typeof shapedValue === "string" ? decodeBuild(shapedValue) : shapedValue;
      const pool = shapingPool(profile);
      const valid = Object.entries(shaped).flatMap(([slot, modification]) => {
        const level = Number(slot);
        const rank = Number(modification?.rank);
        if (!Number.isInteger(level) || !profile.Levels[level] || !Number.isInteger(rank) || rank < 0 || rank > 10) return [];
        const savedPerk = modification.perk;
        const source = pool.find((perk) => perk.ShapeKey && perk.ShapeKey === savedPerk?.ShapeKey)
          ?? pool.find((perk) => perk.ShapeName === savedPerk?.ShapeName && perk.ShapeEffect === savedPerk?.ShapeEffect)
          ?? pool.find((perk) => savedPerk?.ShapeLabel && perkLabel(perk, profile) === perkLabel(savedPerk, profile));
        if (!source) return [];
        const originalChoice = Number(modification.originalChoice);
        return [[slot, {
          originalChoice: Number.isInteger(originalChoice) && profile.Levels[level].Perks[originalChoice] ? originalChoice : state.selected[profile.ProficiencyId][level],
          rank,
          perk: valueAtRank(source, rank),
        }]];
      }).slice(0, 2);
      state.modified[profile.ProficiencyId] = Object.fromEntries(valid);
    } catch (error) {
      console.warn("Ignored invalid proficiency build URL", error);
    }
  }
  return profile;
}

async function copyShareUrl() {
  syncBuildUrl();
  try {
    await navigator.clipboard.writeText(window.location.href);
    const button = $("#shareButton");
    button.textContent = "URL Copied!";
    window.setTimeout(() => { button.textContent = "Copy Share URL"; }, 1600);
  } catch {
    window.prompt("Copy this proficiency build URL:", window.location.href);
  }
}

$("#search").addEventListener("input", filterProfiles);
$(".search-wrap span").addEventListener("click", () => { $("#search").value = ""; filterProfiles(); });
$("#familySelect").addEventListener("change", (event) => { state.family = event.target.value; filterProfiles(); });
$("#filters").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  state.filter = button.dataset.filter;
  calculator.querySelectorAll("#filters button").forEach((item) => item.classList.toggle("active", item === button));
  filterProfiles();
});
$("#resetButton").addEventListener("click", () => {
  state.selected[state.current.ProficiencyId] = state.current.Levels.map(() => 0);
  state.modified[state.current.ProficiencyId] = {};
  state.modifyTarget = null;
  renderBoard();
});
$("#shareButton").addEventListener("click", copyShareUrl);
$("#modifyButton").addEventListener("click", () => {
  if (state.modifyTarget == null) return;
  const modification = modificationMap()[state.modifyTarget];
  if (modification?.originalChoice === state.selected[state.current.ProficiencyId][state.modifyTarget]) {
    openPerkPicker(state.modifyTarget, 250, false);
  } else {
    shapeSlot(state.modifyTarget);
  }
});

calculator.querySelectorAll(".close-modal").forEach((button) => button.addEventListener("click", () => $("#shapeBackdrop").hidden = true));
$("#refineButton").addEventListener("click", () => {
  const modification = modificationMap()[state.activeSlot];
  const cost = refineCosts[modification.rank];
  if (cost == null || state.dust < cost) return;
  state.dust -= cost; modification.rank++; modification.perk = valueAtRank(modification.perk, modification.rank);
  renderBoard(); openShape(state.activeSlot);
});
$("#maximiseButton").addEventListener("click", () => {
  const modification = modificationMap()[state.activeSlot];
  if (state.orbs < 1 || modification.rank === 10) return;
  state.orbs--; modification.rank = 10; modification.perk = valueAtRank(modification.perk, 10);
  renderBoard(); openShape(state.activeSlot);
});
$("#reshapeButton").addEventListener("click", () => {
  if (state.dust < 250) return;
  openPerkPicker(state.activeSlot, 250, false);
});
$("#reshapeSelect").addEventListener("change", renderPickerPreview);
$("#reshapeFilter").addEventListener("input", renderPerkOptions);
$("#confirmReshapeButton").addEventListener("click", () => {
  const picker = state.picker;
  const perk = picker?.pool[Number($("#reshapeSelect").value)];
  if (!picker || !perk || state.dust < picker.cost) return;
  state.dust -= picker.cost;
  const maximumPerk = valueAtRank(perk, 10);
  if (picker.isNew) {
    const originalChoice = state.selected[state.current.ProficiencyId][picker.levelIndex];
    modificationMap()[picker.levelIndex] = { originalChoice, rank: 10, perk: maximumPerk };
  } else {
    modificationMap()[picker.levelIndex].rank = 10;
    modificationMap()[picker.levelIndex].perk = maximumPerk;
  }
  state.activeSlot = picker.levelIndex;
  $("#reshapeBackdrop").hidden = true;
  $("#shapeBackdrop").hidden = true;
  renderBoard();
});
$("#keepButton").addEventListener("click", () => $("#reshapeBackdrop").hidden = true);
$("#clearShapeButton").addEventListener("click", () => {
  const slot = state.activeSlot;
  if (!confirm("Clear this shaped perk? Its refinements will be lost.")) return;
  state.selected[state.current.ProficiencyId][slot] = modificationMap()[slot].originalChoice;
  delete modificationMap()[slot]; $("#shapeBackdrop").hidden = true; renderBoard();
});

try {
  const [data, shaping] = await Promise.all([
    fetch("../data/proficiency/weapon-proficiencies.json?v=20260723-12"),
    fetch("../data/proficiency/perk-shaping-options.json?v=20260723-1"),
  ]).then(async (responses) => {
    const failed = responses.find((response) => !response.ok);
    if (failed) throw new Error(`HTTP ${failed.status}`);
    return Promise.all(responses.map((response) => response.json()));
  });
  state.shapingGroups = shaping.groups;
  state.profiles = data.weapons.map((weapon) => ({
    Name: weapon.name,
    ProfileName: weapon.profileName,
    ProficiencyId: weapon.proficiencyId,
    Version: weapon.version,
    WeaponType: weapon.weaponType,
    Handedness: weapon.handedness,
    weapon: weapon.weapon,
    Levels: weapon.levels.map((level) => ({
      Level: level.level,
      Perks: level.proficiencies,
    })),
  }));
  state.filtered = [...state.profiles].sort((a, b) => weaponDisplayPriority(a.Name) - weaponDisplayPriority(b.Name));
  buildFamilies();
  selectProfile(restoreBuildFromUrl() ?? state.profiles.find((p) => p.Name.toLowerCase().includes("glacial rod")) ?? state.profiles[0]);
} catch (error) {
  $("#weaponName").textContent = "Tibia data unavailable";
  $("#weaponGrid").innerHTML = `<p>Calculator data could not be loaded.<br>${error.message}</p>`;
}
