/* Winter 2026 preview rules. Base paths and dedication values come from CipSoft's engine.
   Announcement: https://www.tibia.com/news/?subtopic=newsarchive&searchstring=Gems+Polished+Up
   Middle-perk reference: https://static.tibia.com/images/news/wheel_perks_rm_goldenborder.png */
(function (root) {
  "use strict";
  const PREFIX = "TPW26_";
  const DOMAINS = ["TL", "TR", "BL", "BR"];
  const QUALITIES = [0, 1, 2, 0, 2, 1, 2, 2];
  const VOCATIONS = ["knight", "paladin", "sorcerer", "druid", "monk"];
  const NEW_SPELLS = {
    knight: ["Shield Slam", "Intense Wound Cleansing"],
    paladin: ["Divine Barrage", "Ethereal Barrage"],
    druid: ["Forked Glacier", "Forked Thorns"],
    sorcerer: ["Death Echo", "Lightning"],
    monk: ["Chained Penance", "Thousand Fist Blows"],
  };
  const clean = value => String(value ?? "").split("|")[0];
  const number = value => Number(String(value).match(/[-+]?\d+(?:\.\d+)?/)?.[0] ?? 0);
  function readVector(vector, map = value => value) {
    try { return Array.from({ length: vector.size() }, (_, i) => map(vector.get(i))); }
    finally { vector.delete?.(); }
  }
  function enumKey(type, value) {
    return Object.keys(type).find(key => type[key]?.value === value?.value);
  }
  function format(info, value) {
    if (info.FormatType === "NoEffectDisplay") return "Active";
    if (info.FormatType === "RomanNumerals") return ["", "I", "II", "III"][value] || String(value);
    const percent = /Percent/.test(info.FormatType);
    const scaled = /TwoFloatingpoints$/.test(info.FormatType) ? value / 100 : value;
    return `${scaled > 0 ? "+" : ""}${Number(scaled.toFixed(2)).toLocaleString("en-US")}${percent ? "%" : ""}`;
  }
  function encode(data) {
    const bytes = new TextEncoder().encode(JSON.stringify(data));
    return PREFIX + btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(""))
      .replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  }
  function decode(value) {
    const raw = value.slice(PREFIX.length).replaceAll("-", "+").replaceAll("_", "/");
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(atob(raw), c => c.charCodeAt(0))));
  }

  class WinterWheel {
    constructor(module, strings) {
      this.module = module;
      this.strings = strings;
      this.grades = {};
      this.gems = Array(8).fill(null);
      this.budget = null;
      this.setVocation("knight");
    }
    setVocation(vocation) {
      if (!VOCATIONS.includes(vocation)) throw new Error("Unknown vocation.");
      this.planner?.delete();
      this.vocation = vocation;
      const title = vocation[0].toUpperCase() + vocation.slice(1);
      this.planner = new this.module.SkillwheelPlanner(this.module.EActiveVocation[title]);
      this.gems = Array(8).fill(null);
      this.grades = {};
      this.definitions = this.rawTiles();
      // Obtain completed conviction values without changing the user's build.
      for (let round = 0; round < 5; round++) {
        this.rawTiles().filter(tile => tile.unlocked).forEach(tile => this.planner.fillSkill(this.module.EGridTile[tile.key]));
      }
      const completed = new Map(this.rawTiles().map(tile => [tile.key, tile]));
      this.definitions.forEach(tile => { tile.fullValue = tile.category === "Augmentation" ? 1 : completed.get(tile.key).mediumPerkValue; });
      this.planner.delete();
      this.planner = new this.module.SkillwheelPlanner(this.module.EActiveVocation[title]);
      this.basic1 = readVector(this.planner.getAvailableBasicModsPos1(), mod => {
        mod.effects?.delete(); return mod.id;
      });
      this.basic2 = readVector(this.planner.getAvailableBasicModsPos2(), mod => {
        mod.effects?.delete(); return mod.id;
      });
      this.supreme = readVector(this.planner.getAvailableSupremeMods());
      // Winter layout: central 100-point slice = Mastery;
      // former side 100-point vessel = displaced augment; 150-point vessel
      // stays a gem slot. Dedication stats and point paths stay in position.
      DOMAINS.forEach(domain => {
        const middle = this.definitions.find(tile => tile.key === `Q${domain}4`);
        const sideVessel = this.definitions.find(tile => tile.domain === domain && tile.maxSkillPoints === 100 && tile.category === "VesselResonance");
        if (!middle || !sideVessel) throw new Error("Unsupported base wheel layout.");
        sideVessel.mediumPerkId = middle.mediumPerkId;
        sideVessel.category = middle.category;
        sideVessel.fullValue = middle.fullValue;
        middle.kind = "mastery";
      });
      this.definitions.forEach(tile => {
        tile.kind ||= tile.category === "VesselResonance" ? "vessel" : "conviction";
      });
    }
    rawTiles() {
      return readVector(this.planner.getSkillParameters(), tile => {
        const key = enumKey(this.module.EGridTile, tile.id);
        return { ...tile, key, domain: key.slice(1, 3), category: enumKey(this.module.EMediumPerkCategory, tile.mediumPerkCategory) };
      });
    }
    tiles() {
      const current = new Map(this.rawTiles().map(tile => [tile.key, tile]));
      return this.definitions.map(def => ({ ...current.get(def.key), mediumPerkId: def.mediumPerkId, category: def.category, fullValue: def.fullValue, kind: def.kind }));
    }
    get spent() { return this.planner.getSpentSkillPoints(); }
    get remaining() { return this.budget === null ? Infinity : this.budget - this.spent; }
    change(key, amount) {
      const tile = this.tiles().find(item => item.key === key);
      if (!tile) return;
      const id = this.module.EGridTile[key];
      if (amount === "fill") amount = tile.maxSkillPoints - tile.currentSkillPoints;
      if (amount === "empty") amount = -tile.currentSkillPoints;
      if (amount > 0 && tile.unlocked) {
        amount = Math.min(amount, tile.maxSkillPoints - tile.currentSkillPoints, this.remaining);
        if (amount > 0) this.planner.addToSkill(id, amount);
      } else if (amount < 0 && tile.editable) this.planner.removeFromSkill(id, Math.min(-amount, tile.currentSkillPoints));
    }
    get unlockedVessels() { return this.tiles().filter(tile => tile.kind === "vessel" && tile.fillPercent === 1).length; }
    vessels() {
      const unlocked = this.unlockedVessels;
      return QUALITIES.map((quality, index) => ({
        index, quality, qualityName: ["Lesser", "Regular", "Greater"][quality],
        name: this.strings.VesselInfos.GemNames[quality][this.vocation],
        // Official gem-variant atlas: twelve frames per vocation, starting
        // with the lesser/regular/greater triplet used by the current engine.
        spriteId: VOCATIONS.indexOf(this.vocation) * 12 + quality,
        bezelId: quality + 1,
        unlocked: index < unlocked, gem: this.gems[index],
      }));
    }
    grade(type, id) { return this.grades[`${type}:${id}`] ?? 0; }
    gemGrade(index) {
      const grades = (this.gems[index]?.mods ?? []).flatMap((id, slot) => id === null ? [] : [this.grade(slot === 2 ? "supreme" : "basic", id)]);
      return grades.length ? grades.every(grade => grade === grades[0]) ? grades[0] : "mixed" : null;
    }
    setGemGrade(index, grade) {
      if (!Number.isInteger(index) || index < 0 || index >= this.gems.length || !Number.isInteger(grade) || grade < 0 || grade > 3) throw new RangeError("Invalid gem or grade.");
      const gem = this.gems[index];
      if (!gem) return false;
      gem.mods.forEach((id, slot) => { if (id !== null) this.grades[`${slot === 2 ? "supreme" : "basic"}:${id}`] = grade; });
      return true;
    }
    modOptions(type, slot = 0) {
      if (type === "basic") return slot === 0 ? this.basic1 : this.basic2;
      return [...this.supreme, ...NEW_SPELLS[this.vocation].flatMap((_, index) => [`new:${index}:1`, `new:${index}:2`])];
    }
    supremeModInfo(id) {
      const match = String(id).match(/^new:([01]):([12])$/);
      if (!match) return this.strings.SupremeModInfos[id];
      // New augments: base damage 5/5.5/6/7%, critical extra 8/8.8/9.6/12%.
      // Copy existing metadata without changing any current-version spell mod.
      const baseDamage = match[2] === "1";
      const template = this.strings.SupremeModInfos[baseDamage ? 10 : 11];
      const effectInfo = { ...template.EffectInfo };
      if (baseDamage) effectInfo[3] = "+7% Base Damage";
      const name = `Augmented ${NEW_SPELLS[this.vocation][Number(match[1])]}`;
      return { ...template, Name: name, NameSummary: name, EffectInfo: effectInfo };
    }
    modName(type, id) {
      if (type === "basic") return (this.strings.BasicModConfig[id] ?? []).map(effect => clean(this.strings.BasicModEffectInfos[effect.EffectId]?.Name)).join(" / ");
      const info = this.supremeModInfo(id);
      return clean(info?.NameSummary || info?.Name) || clean(info?.EffectInfo?.[0]);
    }
    modEffects(type, id) {
      const grade = this.grade(type, id);
      if (type === "basic") return (this.strings.BasicModConfig[id] ?? []).map(effect => ({
        name: clean(this.strings.BasicModEffectInfos[effect.EffectId]?.Name),
        value: effect[this.vocation]?.[grade] ?? "0", id: `basic:${effect.EffectId}`,
      }));
      const info = this.supremeModInfo(id);
      return info ? [{ name: this.modName(type, id), value: info.EffectInfo[grade], id: `supreme:${id}` }] : [];
    }
    modLabel(type, id) {
      const values = this.modEffects(type, id).map(effect => effect.value).join(" / ");
      return `${this.modName(type, id)}${values ? ` — ${values}` : ""}`;
    }
    gemEffects() {
      return this.gems.flatMap((gem, index) => {
        if (!gem || index >= this.unlockedVessels) return [];
        return gem.mods.flatMap((id, slot) => id === null ? [] : this.modEffects(slot === 2 ? "supreme" : "basic", id));
      });
    }
    corners() {
      const tiles = this.tiles();
      const effects = this.gemEffects();
      return readVector(this.planner.getCornerParameters(), corner => {
        corner.valueBasicMod1?.delete(); corner.valueBasicMod2?.delete();
        const domain = enumKey(this.module.EQuarter, corner.id);
        const info = this.strings.LargePerkInfos[corner.largePerkId];
        const own = tiles.filter(tile => tile.domain === domain);
        const mastery = own.some(tile => tile.kind === "mastery" && tile.fillPercent === 1) ? 125 : 0;
        const gemMastery = effects.filter(effect => effect.name === `Revelation Mastery ${clean(info.Name)}`).reduce((sum, effect) => sum + number(effect.value), 0);
        const points = own.reduce((sum, tile) => sum + tile.currentSkillPoints, 0) + mastery + gemMastery;
        const level = [250, 500, 1000].filter(threshold => points >= threshold).length;
        return { domain, id: corner.largePerkId, name: clean(info.Name), points, mastery, gemMastery, level, damage: [0, 4, 9, 20][level], info };
      });
    }
    convictions() {
      const totals = new Map();
      this.tiles().filter(tile => tile.kind === "conviction" && tile.fillPercent === 1).forEach(tile => {
        const info = this.strings.MediumPerkInfos[tile.mediumPerkId];
        const value = (totals.get(tile.mediumPerkId)?.value ?? 0) + tile.fullValue;
        totals.set(tile.mediumPerkId, { id: tile.mediumPerkId, info, value, name: clean(info.Name) });
      });
      return [...totals.values()].map(row => ({ ...row, display: format(row.info, row.value) }));
    }
    summary() {
      const effects = this.gemEffects();
      const dedication = readVector(this.planner.getSmallPerksSummary(), perk => {
        const info = this.strings.SmallPerkInfos[perk.id];
        return { name: clean(info.Name), value: format(info, perk.value) };
      });
      return { dedication, effects, corners: this.corners(), convictions: this.convictions(), vesselDamage: this.unlockedVessels,
        momentum: effects.reduce((sum, effect) => sum + number(effect.value?.match(/([-+]?\d+(?:\.\d+)?)%\s+Momentum/i)?.[1] ?? 0), 0) };
    }
    exportCode() {
      return encode({ version: 1, vocation: this.vocation, points: this.planner.getCode(), budget: this.budget, gems: this.gems, grades: this.grades });
    }
    importCode(value) {
      value = String(value).trim();
      if (!value || value.length > 20000) throw new Error("Enter a valid planner code or saved link.");
      if (/^https?:\/\//i.test(value)) {
        const url = new URL(value);
        value = url.searchParams.get("winter") || url.searchParams.get("code") || "";
      }
      const preview = value.startsWith(PREFIX);
      const data = preview ? decode(value) : null;
      if (preview && (data?.version !== 1 || !VOCATIONS.includes(data.vocation))) throw new Error("Unsupported winter preview code.");
      const code = preview ? data.points : value;
      if (typeof code !== "string" || !/^[-_.~a-zA-Z0-9]+$/.test(code)) throw new Error("Invalid planner code.");
      // Validate with a separate engine so a failed import never changes the current build.
      const candidate = new this.module.SkillwheelPlanner(this.module.EActiveVocation.Knight);
      let vocation, gems, grades, budget;
      try {
        if (!candidate.updateByCode(code)) throw new Error("Invalid planner code.");
        vocation = enumKey(this.module.EActiveVocation, candidate.getVocation()).toLowerCase();
        if (preview && vocation !== data.vocation) throw new Error("Invalid preview vocation.");
        budget = preview ? data.budget : this.budget;
        if (budget !== null && (!Number.isInteger(budget) || budget < 0 || budget > 99999)) throw new Error("Invalid promotion point limit.");
        // Validate mod IDs against the imported vocation's engine, not the outgoing build.
        const allowed1 = readVector(candidate.getAvailableBasicModsPos1(), mod => { mod.effects?.delete(); return mod.id; });
        const allowed2 = readVector(candidate.getAvailableBasicModsPos2(), mod => { mod.effects?.delete(); return mod.id; });
        const allowedSupreme = [...readVector(candidate.getAvailableSupremeMods()), "new:0:1", "new:0:2", "new:1:1", "new:1:2"];
        const allowed = [allowed1, allowed2, allowedSupreme];
        if (preview) {
          if (!Array.isArray(data.gems) || data.gems.length !== 8 || !data.grades || typeof data.grades !== "object" || Array.isArray(data.grades)) throw new Error("Invalid preview gems or grades.");
          gems = data.gems.map((gem, i) => {
            if (gem === null) return null;
            if (!Array.isArray(gem.mods) || gem.mods.length !== QUALITIES[i] + 1 || gem.mods.some((id, slot) => id !== null && !allowed[slot].includes(id))) throw new Error("Invalid gem mod.");
            return { mods: [...gem.mods] };
          });
          grades = {};
          for (const [key, grade] of Object.entries(data.grades)) {
            const match = key.match(/^(basic|supreme):(.+)$/);
            const id = match && (/^\d+$/.test(match[2]) ? Number(match[2]) : match[2]);
            const ids = match?.[1] === "basic" ? [...allowed1, ...allowed2] : allowedSupreme;
            if (!match || !ids.includes(id) || !Number.isInteger(grade) || grade < 0 || grade > 3) throw new Error("Invalid mod grade.");
            grades[key] = grade;
          }
        } else {
          gems = Array(8).fill(null); grades = {};
          readVector(candidate.getCornerParameters(), corner => {
            corner.valueBasicMod1?.delete(); corner.valueBasicMod2?.delete();
            if (!corner.hasGem) return;
            const target = QUALITIES.findIndex((quality, i) => quality === corner.gemQuality && !gems[i]);
            if (target < 0) return;
            const mods = [corner.keyBasicMod1, corner.keyBasicMod2, corner.keySupremeMod].slice(0, corner.gemQuality + 1);
            gems[target] = { mods: mods.map((id, slot) => allowed[slot].includes(id) ? id : null) };
            gems[target].mods.forEach((id, slot) => { if (id !== null) grades[`${slot === 2 ? "supreme" : "basic"}:${id}`] = 3; });
          });
        }
      } finally { candidate.delete(); }
      this.setVocation(vocation);
      this.planner.updateByCode(code);
      this.gems = gems; this.grades = grades; this.budget = budget;
      return preview;
    }
  }
  const api = { WinterWheel, DOMAINS, QUALITIES, VOCATIONS, NEW_SPELLS, clean, format, number };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TibiaPalWinterWheel = api;
})(typeof window === "undefined" ? globalThis : window);
