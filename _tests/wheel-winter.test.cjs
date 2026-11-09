// Run with: node --test _tests/wheel-winter.test.cjs
const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { WinterWheel, VOCATIONS, QUALITIES } = require("../scripts/wheel-winter-model.js");
const { createPlannerClass, strings: winterStrings, drawPerk, perkSpriteId } = require("../scripts/wheel-winter-adapter.js");
const strings = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/wheel-planner/SkillwheelStringsJsonLibrary.json")));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, "../scripts/wod-assets/skillgrid.js"), "utf8"));
let engine;
before(async () => { engine = await createModule(); });
function wheel(t, vocation = "knight") {
  const model = new WinterWheel(engine, strings);
  if (vocation !== model.vocation) model.setVocation(vocation);
  t.after(() => model.planner.delete());
  return model;
}
function fill(model) {
  for (let round = 0; round < 5; round++) model.tiles().forEach(tile => model.change(tile.key, "fill"));
}
function middlePath(model) {
  for (const key of ["QTL0", "QTL1", "QTL4"]) model.change(key, "fill");
}

for (const vocation of VOCATIONS) {
  test(`${vocation}: middle Mastery, side augment and outer gem match the winter reference`, t => {
    const model = wheel(t, vocation), tiles = model.tiles();
    assert.equal(tiles.length, 36);
    assert.deepEqual(tiles.filter(tile => tile.kind === "mastery").map(tile => tile.key).sort(), ["QBL4", "QBR4", "QTL4", "QTR4"]);
    assert.deepEqual(tiles.filter(tile => tile.kind === "vessel").map(tile => tile.key).sort(), ["QBL3", "QBL7", "QBR0", "QBR5", "QTL0", "QTL5", "QTR3", "QTR7"]);
    for (const [domain, sideKey, movedKey] of [["TL", "QTL6", "QTL5"], ["TR", "QTR2", "QTR7"], ["BL", "QBL2", "QBL7"], ["BR", "QBR6", "QBR5"]]) {
      const side = tiles.find(tile => tile.key === sideKey);
      const moved = tiles.find(tile => tile.key === movedKey);
      const middle = tiles.find(tile => tile.key === `Q${domain}4`);
      const originalMiddle = model.rawTiles().find(tile => tile.key === `Q${domain}4`);
      assert.equal(side.kind, "conviction");
      assert.equal(side.maxSkillPoints, 100);
      assert.equal(side.mediumPerkId, originalMiddle.mediumPerkId);
      assert.equal(middle.kind, "mastery");
      assert.equal(moved.kind, "vessel");
      assert.equal(moved.maxSkillPoints, 150);
    }
    fill(model);
    assert.equal(model.spent, 4000);
    assert.equal(model.unlockedVessels, 8);
    assert.deepEqual(model.corners().map(corner => corner.mastery), [125, 125, 125, 125]);
    assert.deepEqual(model.corners().map(corner => corner.level), [3, 3, 3, 3]);
    assert.equal(model.summary().vesselDamage, 8);
  });
}
test("Mastery activates only when filled and advances revelation without spending points", t => {
  const model = wheel(t);
  model.change("QTL0", "fill"); model.change("QTL1", "fill"); model.change("QTL4", 99);
  assert.equal(model.corners()[0].mastery, 0);
  assert.equal(model.corners()[0].level, 0);
  model.change("QTL4", 1);
  assert.equal(model.spent, 225);
  assert.equal(model.corners()[0].points, 350);
  assert.equal(model.corners()[0].level, 1);
  assert.equal(model.corners()[0].damage, 4);
  model.change("QTL4", -1);
  assert.equal(model.corners()[0].mastery, 0);
  assert.equal(model.corners()[0].level, 0);
});
test("locked paths, point limits, zero budget and slice caps use actual spent points", t => {
  const model = wheel(t);
  model.change("QTL8", "fill"); assert.equal(model.spent, 0);
  model.budget = 0; model.change("QTL0", 1); assert.equal(model.spent, 0);
  model.budget = 24; model.change("QTL0", "fill"); assert.equal(model.spent, 24);
  model.budget = null; model.change("QTL0", 1000); assert.equal(model.spent, 50);
  model.change("QTL0", -1000); assert.equal(model.spent, 0);
});
test("vessels give +1 each without an equipped gem and unlock in the announced order", t => {
  const model = wheel(t);
  assert.deepEqual(QUALITIES, [0, 1, 2, 0, 2, 1, 2, 2]);
  model.change("QTL0", 49); assert.equal(model.unlockedVessels, 0);
  model.change("QTL0", 1); assert.equal(model.unlockedVessels, 1);
  assert.equal(model.summary().vesselDamage, 1);
});
test("atelier exposes all eight quality-marked slots, with greater gems active at unlocks 3, 5, 7 and 8", t => {
  const model = wheel(t);
  const greater = [2, 4, 6, 7];
  greater.forEach(index => { model.gems[index] = { mods: [null, null, 5] }; });
  assert.deepEqual(model.vessels().map(slot => slot.qualityName), ["Lesser", "Regular", "Greater", "Lesser", "Greater", "Regular", "Greater", "Greater"]);
  const seen = new Set([0]);
  function checkSlots() {
    const unlocked = model.unlockedVessels;
    seen.add(unlocked);
    const vessels = model.vessels();
    assert.equal(vessels.length, 8);
    assert.deepEqual(vessels.map(slot => slot.unlocked), QUALITIES.map((_, index) => index < unlocked));
    assert.equal(model.gemEffects().length, greater.filter(index => index < unlocked).length);
    greater.forEach(index => assert.equal(vessels[index].gem.mods[2], 5));
  }
  checkSlots();
  for (let round = 0; round < 5; round++) {
    model.tiles().forEach(tile => { model.change(tile.key, "fill"); checkSlots(); });
  }
  assert.deepEqual([...seen].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
});
test("Atelier gem images match the current engine's vocation and quality sprites", t => {
  for (const vocation of VOCATIONS) {
    const model = wheel(t, vocation);
    const native = new engine.SkillwheelPlanner(model.planner.getVocation());
    try {
      const ids = [model.basic1[0], model.basic2[0], model.supreme[0]];
      ids.forEach((id, quality) => {
        const paths = [["QTL0"], ["QTL3", "QTL6"], ["QTL1", "QTL4", "QTL5"]];
        paths[quality].forEach(key => native.fillSkill(engine.EGridTile[key]));
        native.onModChange(quality + 1, String(id), engine.EQuarter.TL);
        const corners = native.getCornerParameters();
        try {
          const image = corners.get(0).gemImgId;
          assert.equal(model.vessels().filter(slot => slot.quality === quality).every(slot => slot.spriteId === image), true, `${vocation}, quality ${quality}`);
          assert.equal(model.vessels().filter(slot => slot.quality === quality).every(slot => slot.bezelId === corners.get(0).socketBezelImgId), true);
        } finally {
          for (let i = 0; i < corners.size(); i++) {
            const corner = corners.get(i);
            corner.valueBasicMod1.delete(); corner.valueBasicMod2.delete();
          }
          corners.delete();
        }
      });
    } finally { native.delete(); }
  }
});
test("middle grants Mastery, the outer vessel unlocks a gem, and the side grants the displaced augment", t => {
  const model = wheel(t);
  middlePath(model);
  assert.equal(model.convictions().some(row => row.name === "Augmented Shield Slam"), false);
  assert.equal(model.corners()[0].mastery, 125);
  model.change("QTL5", "fill");
  assert.equal(model.convictions().some(row => row.name === "Augmented Shield Slam"), false);
  assert.equal(model.unlockedVessels, 2);
  model.change("QTL3", "fill");
  model.change("QTL6", "fill");
  const row = model.convictions().find(row => row.name === "Augmented Shield Slam");
  assert.equal(row.value, 1); assert.equal(row.display, "I");
  assert.equal(model.corners()[0].mastery, 125);
  assert.equal(model.unlockedVessels, 2);
});
test("conviction augmentations count stages rather than adding both engine stage-II values", t => {
  const model = wheel(t); fill(model);
  assert.equal(model.convictions().find(row => row.name === "Augmented Shield Slam").value, 2);
  assert.equal(model.convictions().find(row => row.name === "Life Leech").display, "+3%");
});
test("locked gem slots have no effects and later grades are independent of earlier slots", t => {
  const model = wheel(t);
  model.gems[2] = { mods: [3, 0, 5] };
  model.grades = { "basic:3": 0, "basic:0": 2, "supreme:5": 3 };
  assert.deepEqual(model.gemEffects(), []);
  fill(model);
  assert.equal(model.gemEffects()[0].value, strings.BasicModConfig[3][0].knight[0]);
  assert.equal(model.gemEffects()[1].value, strings.BasicModConfig[0][0].knight[2]);
  assert.equal(model.corners()[0].gemMastery, 225);
});
test("every copy of a mod uses its highest unlocked grade", t => {
  const model = wheel(t); fill(model);
  model.gems[0] = { mods: [3] }; model.gems[3] = { mods: [3] };
  model.grades["basic:3"] = 3;
  assert.deepEqual(model.gemEffects().map(effect => effect.value), Array(2).fill(strings.BasicModConfig[3][0].knight[3]));
});
test("selected gem grade updates all its mods, shared copies, effects and saved build", t => {
  const model = wheel(t); fill(model);
  model.gems[2] = { mods: [3, 0, 5] };
  model.gems[0] = { mods: [3] };
  model.grades = { "basic:3": 0, "basic:0": 1, "supreme:5": 2, "basic:4": 1 };
  assert.equal(model.gemGrade(2), "mixed");
  assert.equal(model.setGemGrade(2, 3), true);
  assert.equal(model.gemGrade(2), 3);
  assert.equal(model.gemGrade(0), 3);
  assert.equal(model.grade("basic", 4), 1, "unselected mods keep their grade");
  assert.equal(model.corners()[0].gemMastery, 225);
  const copy = wheel(t);
  copy.importCode(model.exportCode());
  assert.equal(copy.gemGrade(2), 3);
  assert.equal(copy.gemGrade(0), 3);
  copy.grades["basic:0"] = 0;
  assert.equal(copy.gemGrade(2), "mixed", "individual mod grades remain independent");
});
test("gem grade controls reject invalid grades and handle an empty vessel", t => {
  const model = wheel(t);
  assert.equal(model.gemGrade(0), null);
  assert.equal(model.setGemGrade(0, 2), false);
  const code = model.exportCode();
  for (const [index, grade] of [[-1, 0], [8, 0], [0, -1], [0, 4], [0, 1.5]]) {
    assert.throws(() => model.setGemGrade(index, grade), RangeError);
    assert.equal(model.exportCode(), code);
  }
});
test("dropdown labels include grade-aware percentages and distinguish spell augment effects", t => {
  const model = wheel(t);
  assert.equal(model.modLabel("basic", 3), "Fire Resistance — +2%");
  model.grades["basic:3"] = 3;
  assert.equal(model.modLabel("basic", 3), "Fire Resistance — +3%");
  assert.equal(model.modLabel("supreme", 12), "Augmented Berserk — +5% Base Damage");
  assert.equal(model.modLabel("supreme", 13), "Augmented Berserk — +12% Critical Extra Damage");
  model.grades["supreme:12"] = 3;
  assert.equal(model.modLabel("supreme", 12), "Augmented Berserk — +7.5% Base Damage");
});
test("preview share round trip preserves vocation, point limit, gems, grades and points", t => {
  const model = wheel(t, "druid"); middlePath(model);
  model.budget = 700; model.gems[2] = { mods: [model.basic1[0], model.basic2[0], "new:0:1"] };
  model.grades[`basic:${model.basic1[0]}`] = 2;
  const code = model.exportCode(), copy = wheel(t);
  copy.importCode(`https://tibiapal.com/wheel-planner-winter?winter=${code}`);
  assert.equal(copy.exportCode(), code);
  assert.equal(copy.vocation, "druid"); assert.equal(copy.spent, 225);
});
test("invalid imports leave the existing build unchanged", t => {
  const model = wheel(t); middlePath(model);
  const original = model.exportCode();
  assert.throws(() => model.importCode("not a code"));
  assert.equal(model.exportCode(), original);
  assert.throws(() => model.importCode("TPW26_eyJ2ZXJzaW9uIjo5fQ"));
  assert.equal(model.exportCode(), original);
});
test("malformed preview gem and grade data is rejected transactionally", t => {
  const model = wheel(t); middlePath(model);
  const original = model.exportCode();
  const data = JSON.parse(Buffer.from(original.slice(6), "base64url").toString());
  for (const patch of [{ gems: [{ mods: [9999] }, ...Array(7).fill(null)] }, { grades: { "basic:3": 99 } }, { budget: -1 }, { vocation: "paladin" }]) {
    const bad = "TPW26_" + Buffer.from(JSON.stringify({ ...data, ...patch })).toString("base64url");
    assert.throws(() => model.importCode(bad)); assert.equal(model.exportCode(), original);
  }
});
test("official Tibia codes import points and select the encoded vocation", t => {
  const model = wheel(t, "monk"); middlePath(model);
  const copy = wheel(t);
  copy.importCode(model.planner.getCode());
  assert.equal(copy.vocation, "monk"); assert.equal(copy.spent, model.spent);
});
test("new spell augments scale to exactly 7% base damage and 12% critical extra damage at grade IV", t => {
  for (const vocation of VOCATIONS) {
    const model = wheel(t, vocation); fill(model);
    for (const spell of [0, 1]) {
      for (const [augment, values] of [
        [1, ["+5% Base Damage", "+5.5% Base Damage", "+6% Base Damage", "+7% Base Damage"]],
        [2, ["+8% Critical Extra Damage", "+8.8% Critical Extra Damage", "+9.6% Critical Extra Damage", "+12% Critical Extra Damage"]],
      ]) {
        const id = `new:${spell}:${augment}`;
        model.gems[2] = { mods: [null, null, id] };
        for (const grade of [0, 1, 2, 3]) {
          model.grades[`supreme:${id}`] = grade;
          const effect = model.gemEffects()[0];
          assert.equal(effect.value, values[grade]);
          assert.match(effect.name, /^Augmented /);
          assert.ok(model.modLabel("supreme", id).includes(effect.value));
          assert.doesNotMatch(model.modLabel("supreme", id), /pending|new augment/i);
        }
      }
    }
  }
});
test("new damage and crit augments show explicit percentages and remain active after sharing", t => {
  const model = wheel(t, "druid"); fill(model);
  assert.equal(model.modLabel("supreme", "new:0:1"), "Augmented Forked Glacier — +5% Base Damage");
  assert.equal(model.modLabel("supreme", "new:0:2"), "Augmented Forked Glacier — +8% Critical Extra Damage");
  model.gems[2] = { mods: [null, null, "new:0:1"] };
  model.gems[4] = { mods: [null, null, "new:0:2"] };
  model.setGemGrade(2, 3); model.setGemGrade(4, 3);
  const copy = wheel(t);
  copy.importCode(model.exportCode());
  assert.deepEqual(copy.gemEffects().map(effect => effect.value), ["+7% Base Damage", "+12% Critical Extra Damage"]);
});
test("winter adapter feeds the existing canvas and selection boxes transformed perks and stages", t => {
  const data = winterStrings(strings), Planner = createPlannerClass(engine, data);
  const planner = new Planner(engine.EActiveVocation.Knight);
  t.after(() => planner.delete());
  for (const key of ["QTL0", "QTL1", "QTL4", "QTL5"]) planner.fillSkill(engine.EGridTile[key]);
  const vector = planner.getSkillParameters();
  const tiles = Array.from({ length: vector.size() }, (_, i) => vector.get(i));
  const middle = tiles.find(tile => tile.key === "QTL4");
  assert.equal(middle.mediumPerkId, 50);
  assert.equal(middle.mediumPerkValue, 125);
  assert.equal(middle.kind, "mastery");
  assert.equal(typeof middle.masterySpriteId, "number");
  assert.equal(tiles.find(tile => tile.key === "QTL0").mediumPerkId, 49);
  assert.equal(tiles.find(tile => tile.key === "QTL6").mediumPerkId, 14);
  assert.equal(tiles.find(tile => tile.key === "QTL5").mediumPerkId, 49);
  assert.equal(tiles.find(tile => tile.key === "QTL5").sourceMediumPerkId, 37);
  assert.equal(tiles.find(tile => tile.key === "QTL5").mediumPerkValue, 1);
  assert.equal(tiles.every(tile => Boolean(data.MediumPerkInfos[tile.mediumPerkId])), true);
  const corner = planner.getCornerParameters().get(0);
  assert.equal(corner.currentSkillPoints, 500);
  assert.equal(corner.level, 2);
  assert.equal(corner.fillPercent, 0);
  assert.equal(corner.hasGem, false);
  assert.equal(corner.valueBasicMod1.size(), 0);
  assert.equal(planner.getGridDamageAndHealingBonus(), 9);
  assert.equal(planner.getVesselsDamageAndHealingBonus(), 2);
  const summary = planner.getMediumPerksSummary();
  assert.equal(Array.from({ length: summary.size() }, (_, i) => summary.get(i)).find(row => row.id === 50).value, 125);
});
test("gem spots use the current planner's native atlas frames and renderer", () => {
  const medium = {}, supreme = { height: 40 }, images = [];
  const context = { drawImage: (...args) => images.push(args) };
  for (const masterySpriteId of [5, 6, 7, 8]) {
    assert.equal(drawPerk(context, { kind: "mastery", masterySpriteId }, 100, 200, 34, medium, supreme), true);
    assert.deepEqual(images.at(-1), [supreme, masterySpriteId * 40, 0, 40, 40, 100, 200, 34, 34]);
  }
  for (const sourceMediumPerkId of [37, 38, 39, 40]) {
    const tile = { kind: "vessel", mediumPerkId: 49, sourceMediumPerkId };
    assert.equal(perkSpriteId(tile), sourceMediumPerkId);
    assert.equal(drawPerk(context, tile, 100, 200, 34, medium, supreme), false, "vessels must use the existing native draw rather than the winter hook");
  }
  assert.equal(perkSpriteId({ kind: "conviction", mediumPerkId: 14 }), 14);
  assert.equal(drawPerk(context, { kind: "conviction" }, 100, 200, 34, medium, supreme), false);
  assert.equal(images.length, 4);
  const renderer = fs.readFileSync(path.join(__dirname, "../scripts/wod-assets/wheelofdestinyplanner.min.js"), "utf8");
  assert.match(renderer, /perkSpriteId\(o\)\?\?o.mediumPerkId/);
  assert.match(renderer, /drawPerk\(h,o,u,i,e,Ce,We,qe,ye\)\|\|h.drawImage\(Ce,r\*e,0,e,e,u,i,e,e\)/, "empty winter vessels fall through to the exact current-version draw");
});
test("chosen gems are assigned only to unlocked wheel vessels and rendered inside original socket circles", t => {
  const Planner = createPlannerClass(engine, winterStrings(strings));
  const planner = new Planner(engine.EActiveVocation.Knight);
  t.after(() => planner.delete());
  planner.model.gems[0] = { mods: [3] };
  planner.model.gems[2] = { mods: [3, 0, 5] };
  const readTiles = () => {
    const vector = planner.getSkillParameters();
    return Array.from({ length: vector.size() }, (_, i) => vector.get(i));
  };
  assert.equal(readTiles().some(tile => tile.gemSpriteId !== null), false);
  planner.fillSkill(engine.EGridTile.QTL0);
  const tile = readTiles().find(tile => tile.key === "QTL0");
  assert.equal(tile.gemSpriteId, planner.model.vessels()[0].spriteId);
  assert.equal(tile.gemBezelId, 1);
  assert.equal(readTiles().filter(tile => tile.gemSpriteId !== null).length, 1);
  const images = [], gems = { height: 34 }, sockets = { height: 36 };
  assert.equal(drawPerk({ drawImage: (...args) => images.push(args) }, tile, 10, 20, 34, {}, {}, gems, sockets), true);
  assert.deepEqual(images, [
    [gems, tile.gemSpriteId * 34, 0, 34, 34, 10, 20, 34, 34],
    [sockets, 36, 0, 36, 36, 10, 20, 34, 34],
  ]);
});
test("existing planner code/reset controls work through the winter adapter", t => {
  const Planner = createPlannerClass(engine, winterStrings(strings));
  const planner = new Planner(engine.EActiveVocation.Druid);
  t.after(() => planner.delete());
  planner.addToSkill(engine.EGridTile.QTL0, 10);
  planner.model.gems[2] = { mods: [null, null, "new:0:1"] };
  planner.model.grades["supreme:new:0:1"] = 2;
  const code = planner.getCode();
  assert.ok(code.length > 90, "preview codes use the extended import limit");
  assert.equal(planner.updateByCode("broken code"), false);
  assert.equal(planner.getCode(), code);
  assert.equal(planner.updateByCode(""), true);
  assert.equal(planner.getSpentSkillPoints(), 0);
  assert.equal(planner.model.gems[2], null);
  assert.equal(planner.updateByCode(code), true);
  assert.equal(planner.getCode(), code);
  assert.equal(planner.getVocation(), engine.EActiveVocation.Druid);
});
test("current and winter pages include the same planner markup and original canvas", () => {
  const base = path.join(__dirname, "..");
  const current = fs.readFileSync(path.join(base, "wheel-planner.html"), "utf8");
  const winter = fs.readFileSync(path.join(base, "wheel-planner-winter.html"), "utf8");
  const shared = fs.readFileSync(path.join(base, "_includes/wheel-planner.html"), "utf8");
  assert.match(current, /include wheel-planner\.html/);
  assert.match(winter, /include wheel-planner\.html/);
  assert.equal((shared.match(/id="wod-canvas"/g) ?? []).length, 1);
  assert.match(shared, /runWodPlanner\(/);
  assert.match(shared, /if page\.winter_wheel/);
  assert.doesNotMatch(winter, /ww-wheel|ww-toolbar|ww-planner/);
});
