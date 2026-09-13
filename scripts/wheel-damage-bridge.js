(function () {
  if (window.parent === window) return;

  document.documentElement.classList.add("planner-embed");
  const summaryIds = ["wod-dedication-perks", "wod-conviction-perks", "wod-revelation-perks", "wod-gem-perks"];
  const gradeLabels = ["I", "II", "III", "IV"];
  const supportedVocations = new Set(["knight", "paladin", "sorcerer", "druid", "monk"]);
  // Points a revelation perk's domain needs for stages 1-3, and the Damage and Healing bonus
  // each stage grants (LargePerkInfos.ExtraDamageHealingInfo).
  const revelationStagePoints = [250, 500, 1000];
  const revelationDamageHealing = [0, 4, 9, 20];
  let strings = null;
  let stringsReady = null;
  let gemGrades = {};
  let gradesHydrated = false;
  let publishTimer = null;
  let refreshTimer = null;
  let wheelModule = null;

  function listOf(vector) {
    return Array.from({ length: vector.size() }, (_, index) => vector.get(index));
  }

  // Stands in for an engine vector: the planner only ever reads these through size()/get().
  function vectorOf(items) {
    return { size: () => items.length, get: (index) => items[index] };
  }

  function wrapEngineMethod(prototype, name, wrapper) {
    const original = prototype?.[name];
    if (typeof original !== "function" || original.__tibiapalWrapped) return;
    const wrapped = function (...args) {
      return wrapper.call(this, original, args);
    };
    wrapped.__tibiapalWrapped = true;
    wrapped.__tibiapalOriginal = original;
    prototype[name] = wrapped;
  }

  // The engine scores every gem mod at grade IV. For most mods only the summary text is off
  // (computedGemRows() re-derives those), but Revelation Mastery feeds the engine's own output:
  // its points count towards a revelation perk's domain, so a lower grade can cost that perk a
  // stage - which the canvas, the Selection bar, the Revelation summary and its Damage and
  // Healing bonus all read. These wrappers re-score those domains at the chosen grades.
  function wrapWheelEngine() {
    const originalCreateModule = window.createModule;
    if (typeof originalCreateModule !== "function" || originalCreateModule.__tibiapalWrapped) return;
    const wrappedCreateModule = async function (...args) {
      const module = await originalCreateModule(...args);
      wheelModule = module;
      const prototype = module.SkillwheelPlanner?.prototype;
      wrapEngineMethod(prototype, "getCornerParameters", function (original, args) {
        const result = original.apply(this, args);
        const corners = listOf(result);
        window.__tibiapalWheelCorners = corners.map((corner) => ({
          hasGem: Boolean(corner.hasGem),
          gemQuality: Number(corner.gemQuality),
          vesselLevel: Number(corner.vesselLevel),
          keyBasicMod1: Number(corner.keyBasicMod1),
          keyBasicMod2: Number(corner.keyBasicMod2),
          keySupremeMod: Number(corner.keySupremeMod),
        }));
        const rescored = rescoredCorners(this, corners);
        return rescored ? vectorOf(rescored) : result;
      });
      wrapEngineMethod(prototype, "getGridDamageAndHealingBonus", function (original, args) {
        const bonus = original.apply(this, args);
        const corners = listOf(prototype.getCornerParameters.__tibiapalOriginal.call(this));
        const rescored = rescoredCorners(this, corners);
        if (!rescored) return bonus;
        return corners.reduce((total, corner, index) => total + revelationDamageHealing[rescored[index].level] - revelationDamageHealing[corner.level], bonus);
      });
      wrapEngineMethod(prototype, "getGemsSupremeModSummary", function (original, args) {
        const result = original.apply(this, args);
        const { byMod } = revelationMasteryPoints(listOf(prototype.getCornerParameters.__tibiapalOriginal.call(this)));
        if (!byMod.size) return result;
        return vectorOf(listOf(result).map((mod) => (byMod.has(mod.id) ? { ...mod, value: mod.value - byMod.get(mod.id) } : mod)));
      });
      return module;
    };
    wrappedCreateModule.__tibiapalWrapped = true;
    window.createModule = wrappedCreateModule;
  }

  wrapWheelEngine();

  function cleanName(value) {
    return String(value ?? "").split("|")[0].replace(/^Aug\.\s*/i, "Augmented ").trim();
  }

  function numberFrom(value) {
    const match = String(value ?? "").replace(",", ".").match(/[-+]?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : 0;
  }

  function romanStage(value) {
    const roman = String(value ?? "").trim().match(/\b(III|II|I)\b/i)?.[1]?.toUpperCase();
    return ({ I: 1, II: 2, III: 3 })[roman] ?? numberFrom(value);
  }

  function vocation() {
    return document.querySelector('input[name="wod-vocation"]:checked')?.value ?? "knight";
  }

  function gradeKey(type, id) {
    return `${type}:${id}`;
  }

  function selectedGrade(type, id) {
    const grade = Number(gemGrades[gradeKey(type, id)]);
    return Number.isInteger(grade) && grade >= 0 && grade <= 3 ? grade : 3;
  }

  function sanitizedGrades(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).flatMap(([key, grade]) => {
      const parsed = Number(grade);
      return /^(basic|supreme):\d+$/.test(key) && Number.isInteger(parsed) && parsed >= 0 && parsed <= 3 ? [[key, parsed]] : [];
    }));
  }

  // A gem's active mods in slot order, each at its applied grade: a slot can't run at a higher
  // grade than the one before it (what renderGradeControls() shows as "capped by previous slot").
  function gemSlots(corner) {
    let cap = 3;
    return [
      { active: corner.vesselLevel >= 1, type: "basic", id: corner.keyBasicMod1 },
      { active: corner.vesselLevel >= 2, type: "basic", id: corner.keyBasicMod2 },
      { active: corner.vesselLevel >= 3, type: "supreme", id: corner.keySupremeMod },
    ].filter((slot) => slot.active && slot.id >= 0).map((slot) => {
      cap = Math.min(selectedGrade(slot.type, slot.id), cap);
      return { ...slot, grade: cap };
    });
  }

  // The revelation perk a Revelation Mastery supreme mod feeds, and its points at grades I-IV.
  function revelationMastery(modId) {
    const info = strings?.SupremeModInfos?.[modId];
    if (!info || cleanName(info.Name) !== "Revelation Mastery") return null;
    const perkName = cleanName(info.NameSummary).replace(/^Revelation Mastery\s+/i, "");
    const largePerkId = Object.keys(strings.LargePerkInfos ?? {}).find((key) => /^\d+$/.test(key) && cleanName(strings.LargePerkInfos[key]?.Name) === perkName);
    if (largePerkId == null) return null;
    return { largePerkId: Number(largePerkId), points: [0, 1, 2, 3].map((grade) => numberFrom(info.EffectInfo?.[grade])) };
  }

  // Revelation Mastery points per revelation perk, both as the engine counts them (grade IV) and
  // at the chosen grades, plus how far each mod falls short of grade IV. Only perks/mods where a
  // lower grade actually changes something are included.
  function revelationMasteryPoints(corners) {
    const byPerk = new Map();
    const byMod = new Map();
    corners.forEach((corner) => {
      if (!corner.hasGem) return;
      gemSlots(corner).forEach((slot) => {
        const mastery = slot.type === "supreme" ? revelationMastery(slot.id) : null;
        if (!mastery) return;
        const entry = byPerk.get(mastery.largePerkId) ?? { engine: 0, applied: 0 };
        entry.engine += mastery.points[3];
        entry.applied += mastery.points[slot.grade];
        byPerk.set(mastery.largePerkId, entry);
        const shortfall = mastery.points[3] - mastery.points[slot.grade];
        if (shortfall > 0) byMod.set(slot.id, (byMod.get(slot.id) ?? 0) + shortfall);
      });
    });
    byPerk.forEach((entry, largePerkId) => {
      if (entry.applied >= entry.engine) byPerk.delete(largePerkId);
    });
    return { byPerk, byMod };
  }

  function enumName(enumType, value) {
    return Object.keys(enumType ?? {}).find((key) => enumType[key]?.value === value?.value);
  }

  // Promotion points spent in each domain ("TL", "TR", "BL", "BR"), from the slices themselves.
  function domainSlicePoints(planner) {
    const vector = planner.getSkillParameters();
    const points = new Map();
    listOf(vector).forEach((tile) => {
      const domain = enumName(wheelModule?.EGridTile, tile.id)?.match(/^Q(TL|TR|BL|BR)\d+$/)?.[1];
      if (domain) points.set(domain, (points.get(domain) ?? 0) + Number(tile.currentSkillPoints));
    });
    vector.delete?.();
    return points;
  }

  // The engine's corner fields for a domain holding `points`: the stage, the bar towards the next
  // stage (capped at the stage 3 threshold) and the fill of the stage in progress.
  function revelationProgress(points) {
    const level = revelationStagePoints.filter((threshold) => points >= threshold).length;
    const floor = level ? revelationStagePoints[level - 1] : 0;
    const maxSkillPoints = revelationStagePoints[Math.min(level, revelationStagePoints.length - 1)];
    return {
      level,
      currentSkillPoints: Math.min(points, maxSkillPoints),
      maxSkillPoints,
      fillPercent: level === revelationStagePoints.length ? 1 : (points - floor) / (maxSkillPoints - floor),
    };
  }

  // The engine's corners with each domain re-scored at the chosen Revelation Mastery grades, or
  // null when nothing differs from the engine's grade IV scoring. A domain is left untouched if
  // its slices plus grade IV mastery don't reproduce the engine's own number, so a change in how
  // CIP scores domains degrades to the grade IV values instead of showing something wrong.
  function rescoredCorners(planner, corners) {
    const { byPerk } = revelationMasteryPoints(corners);
    if (!byPerk.size || !wheelModule) return null;
    const slicePoints = domainSlicePoints(planner);
    return corners.map((corner) => {
      const mastery = byPerk.get(corner.largePerkId);
      const slices = slicePoints.get(enumName(wheelModule.EQuarter, corner.id));
      if (!mastery || slices == null) return corner;
      const engine = revelationProgress(slices + mastery.engine);
      if (engine.level !== corner.level || engine.currentSkillPoints !== corner.currentSkillPoints) return corner;
      return { ...corner, ...revelationProgress(slices + mastery.applied) };
    });
  }

  function mediumDetails(name, value) {
    if (!strings?.MediumPerkInfos) return [];
    const record = Object.values(strings.MediumPerkInfos).find((candidate) => candidate && typeof candidate === "object" && cleanName(candidate.Name) === cleanName(name));
    if (!record) return [];
    const stage = romanStage(value);
    return [stage >= 1 ? record.Aug1Info : null, stage >= 2 ? record.Aug2Info : null].filter(Boolean);
  }

  function supremeDetail(name, value) {
    if (!strings?.SupremeModInfos) return null;
    const expected = Math.abs(numberFrom(value));
    const candidates = Object.values(strings.SupremeModInfos).filter((candidate) => candidate && typeof candidate === "object" && cleanName(candidate.NameSummary ?? candidate.Name) === cleanName(name));
    const record = candidates.find((candidate) => Object.values(candidate.EffectInfo ?? {}).some((effect) => Math.abs(numberFrom(effect) - expected) < 0.001));
    if (!record) return null;
    return Object.values(record.EffectInfo ?? {}).find((effect) => Math.abs(numberFrom(effect) - expected) < 0.001) ?? record.EffectInfoSummary ?? null;
  }

  function officialSummaryRows() {
    return summaryIds.flatMap((id) => {
      const group = id.replace("wod-", "").replace("-perks", "");
      return [...(document.querySelector(`#${id}`)?.querySelectorAll("tr") ?? [])].flatMap((row) => {
        const cells = row.querySelectorAll("td");
        if (cells.length < 2 || cells[0].textContent.trim().toLowerCase() === "none") return [];
        const name = cleanName(cells[0].textContent);
        const value = cells[1].textContent.trim();
        if (/^locked$/i.test(value) || /^[-+]?0+(?:\.0+)?%?$/.test(value.replaceAll(" ", ""))) return [];
        const details = group === "conviction" ? mediumDetails(name, value) : group === "gem" ? [supremeDetail(name, value)].filter(Boolean) : [];
        return [{ group, name, value, details }];
      });
    });
  }

  function amountParts(value) {
    const text = String(value ?? "");
    return {
      value: numberFrom(text),
      unit: text.includes("%") ? "%" : /[-+]?\d+(?:\.\d+)?s\b/i.test(text) ? "s" : "",
    };
  }

  function formattedAmount(value, unit) {
    const rounded = Math.round(value * 100) / 100;
    const sign = rounded > 0 ? "+" : "";
    return `${sign}${rounded.toLocaleString("en-US", { maximumFractionDigits: 2 })}${unit}`;
  }

  function addAmount(map, key, name, source, details = [], info = null) {
    const amount = amountParts(source);
    const previous = map.get(key) ?? { group: "gem", name, total: 0, unit: amount.unit, details: [] };
    previous.total += amount.value;
    previous.unit ||= amount.unit;
    previous.details.push(...details);
    previous.info ||= info;
    map.set(key, previous);
  }

  function detailFromSummary(info, total, fallback) {
    const summary = String(info?.EffectInfoSummary ?? "");
    if (!summary.includes("<ReplaceMe>")) return fallback;
    return summary.replaceAll("<ReplaceMe>", Math.abs(Math.round(total * 100) / 100));
  }

  function computedGemRows() {
    if (!strings || !Array.isArray(window.__tibiapalWheelCorners)) return null;
    const rows = new Map();
    const activeVocation = vocation();
    window.__tibiapalWheelCorners.forEach((corner) => {
      if (!corner.hasGem) return;
      gemSlots(corner).forEach((slot) => {
        const { grade } = slot;
        if (slot.type === "basic") {
          (strings.BasicModConfig?.[slot.id] ?? []).forEach((effect) => {
            const info = strings.BasicModEffectInfos?.[effect.EffectId];
            const value = effect?.[activeVocation]?.[grade];
            if (!info || value == null) return;
            addAmount(rows, `basic:${effect.EffectId}`, cleanName(info.Name), value);
          });
          return;
        }
        const info = strings.SupremeModInfos?.[slot.id];
        const effect = info?.EffectInfo?.[grade];
        if (!info || !effect) return;
        const key = `supreme:${slot.id}`;
        const name = cleanName(info.NameSummary ?? info.Name) || String(effect).replace(/^[-+]?\d+(?:\.\d+)?%?\s*/, "");
        addAmount(rows, key, name, effect, [effect], info);
        const momentum = String(effect).match(/([-+]?\d+(?:\.\d+)?)%\s+Momentum/i);
        if (momentum) addAmount(rows, "supreme:momentum", "Momentum", `${momentum[1]}%`);
      });
    });
    return [...rows.values()].map((row) => {
      const details = [...new Set(row.details)];
      if (row.info && details.length) details.splice(0, details.length, detailFromSummary(row.info, row.total, details[0]));
      return { group: row.group, name: row.name, value: formattedAmount(row.total, row.unit), details };
    });
  }

  function summaryRows() {
    const official = officialSummaryRows();
    const computed = computedGemRows();
    if (!computed) return official;
    const preserved = official.filter((row) => row.group !== "gem" || /vessel resonance|damage and healing/i.test(row.name));
    return [...preserved, ...computed];
  }

  function gemModLines(type, id, grade) {
    return type === "basic"
      ? (strings.BasicModConfig?.[id] ?? []).flatMap((effect) => {
        const info = strings.BasicModEffectInfos?.[effect.EffectId];
        const value = effect?.[vocation()]?.[grade];
        return info && value != null ? [`${value} ${cleanName(info.Name)}`] : [];
      })
      : [strings.SupremeModInfos?.[id]?.Name ? cleanName(strings.SupremeModInfos[id].Name) : null, strings.SupremeModInfos?.[id]?.EffectInfo?.[grade]].filter(Boolean);
  }

  function writeModText(target, lines) {
    if (!target) return;
    const signature = lines.join("\n");
    // The planner re-wraps the supreme-mod slot in <div class="InvalidMod ColorRed"> (strikethrough).
    // textContent ignores that wrapper, so never skip the rewrite while it is still present.
    const hasStaleMarkup = target.querySelector(".InvalidMod, .ColorRed") !== null;
    if (!hasStaleMarkup && target.dataset.gradeText === signature && target.textContent.trim().replace(/\s+/g, " ") === lines.join(" ").trim().replace(/\s+/g, " ")) return;
    target.dataset.gradeText = signature;
    target.replaceChildren(...lines.flatMap((line, index) => index ? [document.createElement("br"), document.createTextNode(line)] : [document.createTextNode(line)]));
  }

  function setEffectText(slot, type, id, grade) {
    if (!strings) return;
    const lines = gemModLines(type, id, grade);
    const dropdown = document.querySelector(`select[name="wod-selection-box-gem-mod${slot}-dropdown"]`);
    const selectedOption = dropdown?.selectedOptions?.[0];
    const optionLabel = lines.join(" · ");
    if (selectedOption && selectedOption.textContent !== optionLabel) selectedOption.textContent = optionLabel;
    writeModText(document.querySelector(`#wod-selection-box-gem-mod${slot}`), lines);
    // Mirror the grade-adjusted text into the read-only Information box, which otherwise
    // renders every mod at grade IV. Only when it is showing the same gem as the Selection box.
    const selName = document.querySelector("#wod-selection-box-gem-name")?.textContent?.trim();
    const infoName = document.querySelector("#wod-information-box-gem-name")?.textContent?.trim();
    if (selName && infoName && selName === infoName) writeModText(document.querySelector(`#wod-information-box-gem-mod${slot}`), lines);
  }

  function createGradePicker(slot) {
    const picker = document.createElement("div");
    picker.className = "wod-grade-picker";
    picker.dataset.slot = slot;
    const label = document.createElement("span");
    label.className = "wod-grade-label";
    label.textContent = "Mod grade";
    const buttons = document.createElement("div");
    buttons.className = "wod-grade-options";
    gradeLabels.forEach((grade, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.grade = index;
      button.textContent = grade;
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const type = picker.dataset.type;
        const id = Number(picker.dataset.modId);
        if (!type || id < 0) return;
        gradesHydrated = true;
        gemGrades[gradeKey(type, id)] = index;
        refreshPlanner();
        renderGradeControls();
        publish();
      });
      buttons.append(button);
    });
    const effective = document.createElement("small");
    effective.className = "wod-grade-effective";
    picker.append(label, buttons, effective);
    return picker;
  }

  function renderGradeControls() {
    clearTimeout(refreshTimer);
    if (!strings) return;
    const socket = document.querySelector("#wod-selection-box-socket");
    if (!socket || socket.classList.contains("hide")) return;
    let effectiveCap = 3;
    for (let slot = 1; slot <= 3; slot += 1) {
      const dropdown = document.querySelector(`select[name="wod-selection-box-gem-mod${slot}-dropdown"]`);
      const wrapper = dropdown?.closest(".GemDropdownWrapper");
      const pickerHost = document.querySelector(`#wod-selection-box-gem-mod${slot}`)?.closest(".ModEffectWrapper");
      const id = Number(dropdown?.value);
      let picker = pickerHost?.querySelector(".wod-grade-picker");
      if (!dropdown || !wrapper || !pickerHost || dropdown.disabled || !Number.isInteger(id) || id < 0) {
        if (picker) picker.hidden = true;
        continue;
      }
      const type = slot === 3 ? "supreme" : "basic";
      const chosen = selectedGrade(type, id);
      const effective = Math.min(chosen, effectiveCap);
      effectiveCap = effective;
      if (!picker) {
        picker = createGradePicker(slot);
        pickerHost.append(picker);
      }
      picker.hidden = false;
      picker.dataset.type = type;
      picker.dataset.modId = id;
      picker.querySelectorAll("button").forEach((button) => {
        button.classList.toggle("selected", Number(button.dataset.grade) === chosen);
      });
      const effectiveLabel = picker.querySelector(".wod-grade-effective");
      const text = effective < chosen ? `Effective Grade ${gradeLabels[effective]} · capped by previous slot` : `Applied Grade ${gradeLabels[effective]}`;
      if (effectiveLabel.textContent !== text) effectiveLabel.textContent = text;
      picker.classList.toggle("capped", effective < chosen);
      setEffectText(slot, type, id, effective);
    }
  }

  function publish() {
    clearTimeout(publishTimer);
    const rows = summaryRows();
    const payload = {
      code: document.querySelector("#wod-code")?.textContent?.trim() ?? "",
      vocation: vocation(),
      promotionPoints: numberFrom(document.querySelector("#wod-reqpoints")?.textContent),
      bonus: rows.filter((row) => /damage and healing/i.test(row.name)).reduce((total, row) => total + numberFrom(row.value), 0),
      effects: rows,
      gradesHydrated,
    };
    if (gradesHydrated) payload.gemGrades = { ...gemGrades };
    window.parent.postMessage({ type: "tibiapal:wheel-build", payload }, window.location.origin);
  }

  // Re-reads the engine (through the wrappers in wrapWheelEngine()) and redraws the canvas and the
  // Selection, Information and summary boxes. The planner only does that on its own when the wheel
  // code changes, and grades aren't part of the code. Hook added to wheelofdestinyplanner.min.js.
  function refreshPlanner() {
    window.wodPlannerRefresh?.();
  }

  function schedulePublish() {
    clearTimeout(publishTimer);
    publishTimer = window.setTimeout(publish, 100);
  }

  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => {
      renderGradeControls();
      schedulePublish();
    }, 30);
  }

  function setVocation(value) {
    const nextVocation = String(value ?? "").toLowerCase();
    if (!supportedVocations.has(nextVocation)) return;
    const radio = document.querySelector(`input[name="wod-vocation"][value="${nextVocation}"]`);
    if (!radio || radio.checked) return scheduleRefresh();
    radio.click();
    scheduleRefresh();
  }

  function resetWheel() {
    const reset = document.querySelector("#wod-code-reset");
    gemGrades = {};
    gradesHydrated = false;
    if (reset) reset.click();
    scheduleRefresh();
  }

  function importCode(value) {
    const code = String(value ?? "").trim();
    const input = document.querySelector("#wod-code-input");
    const importButton = document.querySelector("#wod-code-import");
    if (!input || !importButton || !code) return;
    gemGrades = {};
    gradesHydrated = false;
    input.value = code;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    importButton.click();
    scheduleRefresh();
  }

  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) return;
    if (event.data?.type === "tibiapal:request-wheel-build") {
      // The hidden hydrate frame keeps only its first reply, so wait until Revelation Mastery can
      // be re-scored at the build's grades rather than answering with grade IV stages.
      Promise.resolve(stringsReady).then(() => {
        renderGradeControls();
        publish();
      });
    }
    if (event.data?.type === "tibiapal:set-vocation") setVocation(event.data.vocation);
    if (event.data?.type === "tibiapal:reset-wheel") resetWheel();
    if (event.data?.type === "tibiapal:import-wheel-code") importCode(event.data.code);
    if (event.data?.type === "tibiapal:set-wheel-grades") {
      gemGrades = sanitizedGrades(event.data.grades);
      gradesHydrated = true;
      refreshPlanner();
      scheduleRefresh();
    }
  });

  window.addEventListener("DOMContentLoaded", async () => {
    stringsReady = (async () => {
      try {
        const response = await fetch("/data/wheel-planner/SkillwheelStringsJsonLibrary.json");
        if (response.ok) strings = await response.json();
      } catch { /* The official maximum-grade values remain available as a fallback. */ }
      // Grades that arrived first were scored at grade IV - Revelation Mastery needs the strings.
      if (Object.values(gemGrades).some((grade) => grade < 3)) refreshPlanner();
    })();
    await stringsReady;
    const wrapper = document.querySelector("#wod-wrapper");
    if (wrapper) new MutationObserver(scheduleRefresh).observe(wrapper, { childList: true, subtree: true, characterData: true });
    document.addEventListener("change", (event) => {
      if (event.target.matches(".GemDropdown")) scheduleRefresh();
    });
    setVocation(new URLSearchParams(window.location.search).get("vocation"));
    scheduleRefresh();
  });
})();
