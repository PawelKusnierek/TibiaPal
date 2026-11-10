/* Adapts winter rules to the existing runWodPlanner canvas, selection boxes and controls. */
(function (root) {
  "use strict";
  const api = typeof module !== "undefined" && module.exports ? require("./wheel-winter-model.js") : root.TibiaPalWinterWheel;
  const vector = items => ({ size: () => items.length, get: index => items[index], delete() {} });
  const enumKey = (type, value) => Object.keys(type).find(key => type[key]?.value === value?.value);
  function perkSpriteId(tile) {
    return tile.kind === "vessel" ? tile.sourceMediumPerkId : tile.mediumPerkId;
  }
  function drawPerk(context, tile, x, y, size, medium, supreme, gems, sockets) {
    // Vessels and augments fall through to the CURRENT planner's original
    // medium-perk atlas draw, including its original size and positioning.
    if (tile.kind === "vessel" && Number.isInteger(tile.gemSpriteId)) {
      const gemSize = gems.height, bezelSize = sockets.height;
      // Same gem + socket overlay assets and order as the current planner.
      context.drawImage(gems, tile.gemSpriteId * gemSize, 0, gemSize, gemSize, x, y, size, size);
      context.drawImage(sockets, tile.gemBezelId * bezelSize, 0, bezelSize, bezelSize, x, y, size, size);
      return true;
    }
    if (tile.kind !== "mastery") return false;
    const spriteSize = supreme.height;
    context.drawImage(supreme, tile.masterySpriteId * spriteSize, 0, spriteSize, spriteSize, x, y, size, size);
    return true;
  }
  function strings(data) {
    const result = { ...data, MediumPerkInfos: { ...data.MediumPerkInfos }, VesselInfos: { ...data.VesselInfos } };
    result.MediumPerkInfos[49] = { Name: "Gem Vessel", LongInfo: "Fill this slice to unlock the next Gem Atelier slot and gain +1 damage and healing.", FormatType: "PlusInteger", SummaryPriority: 4 };
    result.MediumPerkInfos[50] = { Name: "Revelation Mastery", LongInfo: "Fill this slice to gain +125 revelation progress in this domain. The fixed bonus is the same for every vocation and does not spend promotion points or unlock adjacent slices.", FormatType: "PlusInteger", SummaryPriority: 4 };
    result.VesselInfos.DisplayName = "Gem";
    return result;
  }
  function createPlannerClass(engine, data, hooks = {}) {
    return class WinterPlanner {
      constructor(vocation) {
        this.model = new api.WinterWheel(engine, data);
        this.setVocation(vocation);
        hooks.ready?.(this);
      }
      get base() { return this.model.planner; }
      delete() { this.base.delete(); }
      getVocation() { return this.base.getVocation(); }
      setVocation(vocation) { this.model.setVocation(enumKey(engine.EActiveVocation, vocation).toLowerCase()); }
      getSpentSkillPoints() { return this.model.spent; }
      getCode() {
        if (hooks.budget) this.model.budget = hooks.budget();
        return this.model.exportCode();
      }
      updateByCode(code) {
        try {
          if (code) this.model.importCode(code);
          else this.model.setVocation(this.model.vocation);
          hooks.imported?.(this.model);
          return true;
        } catch { return false; }
      }
      getSkillParameters() {
        const convictions = new Map(this.model.convictions().map(row => [row.id, row.value]));
        const tiles = this.model.tiles(), vessels = this.model.vessels();
        const unlocked = tiles.filter(tile => tile.kind === "vessel" && tile.fillPercent === 1)
          .sort((a, b) => api.DOMAINS.indexOf(a.domain) - api.DOMAINS.indexOf(b.domain) || a.key.localeCompare(b.key));
        const assignedVessels = new Map(unlocked.map((tile, index) => [tile.key, vessels[index]]));
        const masterySprites = new Map(this.model.corners().map(corner => {
          const entry = Object.entries(data.SupremeModInfos).find(([, info]) => api.clean(info?.NameSummary) === `Revelation Mastery ${corner.name}`);
          if (!entry) throw new Error("Missing Revelation Mastery artwork.");
          return [corner.domain, Number(entry[0])];
        }));
        return vector(tiles.map(tile => ({ ...tile,
          sourceMediumPerkId: tile.mediumPerkId,
          masterySpriteId: tile.kind === "mastery" ? masterySprites.get(tile.domain) : null,
          gemSpriteId: assignedVessels.get(tile.key)?.gem ? assignedVessels.get(tile.key).spriteId : null,
          gemBezelId: assignedVessels.get(tile.key)?.gem ? assignedVessels.get(tile.key).bezelId : null,
          mediumPerkId: tile.kind === "vessel" ? 49 : tile.kind === "mastery" ? 50 : tile.mediumPerkId,
          mediumPerkCategory: engine.EMediumPerkCategory[tile.kind === "conviction" ? tile.category : "Other"],
          mediumPerkValue: tile.kind === "conviction" ? convictions.get(tile.mediumPerkId) ?? 0 : tile.fillPercent === 1 ? tile.kind === "mastery" ? 125 : 1 : 0,
        })));
      }
      getCornerParameters() {
        return vector(this.model.corners().map(corner => {
          const ceiling = [250, 500, 1000, 1000][corner.level];
          const floor = [0, 250, 500, 1000][corner.level];
          return { id: engine.EQuarter[corner.domain], largePerkId: corner.id, level: corner.level,
            currentSkillPoints: Math.min(corner.points, ceiling), maxSkillPoints: ceiling,
            fillPercent: corner.level === 3 ? 1 : (corner.points - floor) / (ceiling - floor),
            // Gems now live in the eight-slot Atelier, with no domain affinity.
            vesselLevel: 0, hasGem: false, gemQuality: 0, socketBezelImgId: 0, gemImgId: 0,
            vesselDamageHealingBonus: 0, keyBasicMod1: -1, keyBasicMod2: -1, keySupremeMod: -1,
            valueBasicMod1: vector([]), valueBasicMod2: vector([]),
          };
        }));
      }
      getSmallPerksSummary() { return this.base.getSmallPerksSummary(); }
      getMediumPerksSummary() {
        const rows = this.model.convictions().map(row => {
          const tile = this.model.definitions.find(tile => tile.mediumPerkId === row.id && tile.kind === "conviction");
          return { id: row.id, value: row.value, category: engine.EMediumPerkCategory[tile.category] };
        });
        if (this.model.unlockedVessels) rows.push({ id: 49, value: this.model.unlockedVessels, category: engine.EMediumPerkCategory.Other });
        const mastery = this.model.corners().reduce((sum, corner) => sum + corner.mastery, 0);
        if (mastery) rows.push({ id: 50, value: mastery, category: engine.EMediumPerkCategory.Other });
        return vector(rows);
      }
      getGridDamageAndHealingBonus() { return this.model.corners().reduce((sum, corner) => sum + corner.damage, 0); }
      getVesselsDamageAndHealingBonus() { return this.model.unlockedVessels; }
      getVesselsMomentumBonus() { return this.model.summary().momentum; }
      // The Atelier renders grade-aware gem rows into the existing Gems summary table.
      getGemsBasicModEffectSummary() { return vector([]); }
      getGemsSupremeModSummary() { return vector([]); }
      getAvailableBasicModsPos1() { return this.base.getAvailableBasicModsPos1(); }
      getAvailableBasicModsPos2() { return this.base.getAvailableBasicModsPos2(); }
      getAvailableSupremeMods() { return this.base.getAvailableSupremeMods(); }
      addToSkill(...args) { return this.base.addToSkill(...args); }
      removeFromSkill(...args) { return this.base.removeFromSkill(...args); }
      fillSkill(...args) { return this.base.fillSkill(...args); }
      clearSkill(...args) { return this.base.clearSkill(...args); }
      onGridTileRightClicked(...args) { return this.base.onGridTileRightClicked(...args); }
      onModChange() {}
    };
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { createPlannerClass, strings, drawPerk, perkSpriteId };
    return;
  }
  const originalCreateModule = root.createModule;
  const controller = root.wodWinter = {
    strings,
    isCode: code => /^$|^[-_.~a-zA-Z0-9]{3,90}$/.test(code) || /^TPW26_[-_a-zA-Z0-9]{1,19994}$/.test(code),
    initialCode: () => { const query = new URLSearchParams(location.search); return query.get("winter") || query.get("code"); },
    afterRender() { controller.update?.(); },
    drawPerk,
    perkSpriteId,
  };
  root.createModule = async (...args) => {
    const [engine, response] = await Promise.all([originalCreateModule(...args), fetch("/data/wheel-planner/SkillwheelStringsJsonLibrary.json")]);
    if (!response.ok) throw new Error("Wheel data could not load.");
    const data = strings(await response.json());
    return { ...engine, SkillwheelPlanner: createPlannerClass(engine, data, {
      ready(planner) { controller.model = planner.model; },
      budget() {
        const value = document.getElementById("wod-limitpoints")?.value.trim();
        return /^\d+$/.test(value) ? Number(value) : null;
      },
      imported(model) {
        const input = document.getElementById("wod-limitpoints");
        if (input) { input.value = model.budget ?? ""; input.dispatchEvent(new Event("input", { bubbles: true })); }
      },
    }) };
  };
})(typeof window === "undefined" ? globalThis : window);
