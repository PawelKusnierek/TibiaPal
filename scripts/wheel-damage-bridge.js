(function () {
  if (window.parent === window) return;

  document.documentElement.classList.add("planner-embed");
  const summaryIds = ["wod-dedication-perks", "wod-conviction-perks", "wod-revelation-perks", "wod-gem-perks"];
  const gradeLabels = ["I", "II", "III", "IV"];
  const supportedVocations = new Set(["knight", "paladin", "sorcerer", "druid", "monk"]);
  let strings = null;
  let gemGrades = {};
  let gradesHydrated = false;
  let publishTimer = null;
  let refreshTimer = null;

  function exposeWheelCorners() {
    const originalCreateModule = window.createModule;
    if (typeof originalCreateModule !== "function" || originalCreateModule.__tibiapalWrapped) return;
    const wrappedCreateModule = async function (...args) {
      const module = await originalCreateModule(...args);
      const prototype = module.SkillwheelPlanner?.prototype;
      if (prototype?.getCornerParameters && !prototype.getCornerParameters.__tibiapalWrapped) {
        const originalGetCorners = prototype.getCornerParameters;
        const wrappedGetCorners = function (...methodArgs) {
          const result = originalGetCorners.apply(this, methodArgs);
          const corners = [];
          for (let index = 0; index < result.size(); index += 1) {
            const corner = result.get(index);
            corners.push({
              hasGem: Boolean(corner.hasGem),
              gemQuality: Number(corner.gemQuality),
              vesselLevel: Number(corner.vesselLevel),
              keyBasicMod1: Number(corner.keyBasicMod1),
              keyBasicMod2: Number(corner.keyBasicMod2),
              keySupremeMod: Number(corner.keySupremeMod),
            });
          }
          window.__tibiapalWheelCorners = corners;
          return result;
        };
        wrappedGetCorners.__tibiapalWrapped = true;
        prototype.getCornerParameters = wrappedGetCorners;
      }
      return module;
    };
    wrappedCreateModule.__tibiapalWrapped = true;
    window.createModule = wrappedCreateModule;
  }

  exposeWheelCorners();

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
      let effectiveCap = 3;
      const slots = [
        { active: corner.vesselLevel >= 1, type: "basic", id: corner.keyBasicMod1 },
        { active: corner.vesselLevel >= 2, type: "basic", id: corner.keyBasicMod2 },
        { active: corner.vesselLevel >= 3, type: "supreme", id: corner.keySupremeMod },
      ];
      slots.forEach((slot) => {
        if (!slot.active || slot.id < 0) return;
        const grade = Math.min(selectedGrade(slot.type, slot.id), effectiveCap);
        effectiveCap = grade;
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
      renderGradeControls();
      publish();
    }
    if (event.data?.type === "tibiapal:set-vocation") setVocation(event.data.vocation);
    if (event.data?.type === "tibiapal:reset-wheel") resetWheel();
    if (event.data?.type === "tibiapal:import-wheel-code") importCode(event.data.code);
    if (event.data?.type === "tibiapal:set-wheel-grades") {
      gemGrades = sanitizedGrades(event.data.grades);
      gradesHydrated = true;
      scheduleRefresh();
    }
  });

  window.addEventListener("DOMContentLoaded", async () => {
    try {
      const response = await fetch("/data/wheel-planner/SkillwheelStringsJsonLibrary.json");
      if (response.ok) strings = await response.json();
    } catch { /* The official maximum-grade values remain available as a fallback. */ }
    const wrapper = document.querySelector("#wod-wrapper");
    if (wrapper) new MutationObserver(scheduleRefresh).observe(wrapper, { childList: true, subtree: true, characterData: true });
    document.addEventListener("change", (event) => {
      if (event.target.matches(".GemDropdown")) scheduleRefresh();
    });
    setVocation(new URLSearchParams(window.location.search).get("vocation"));
    scheduleRefresh();
  });
})();
