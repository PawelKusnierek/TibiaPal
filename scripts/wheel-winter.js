/* Winter-only Gem Atelier and Fragment Workshop extensions to the existing planner UI. */
(function () {
  "use strict";
  const controller = window.wodWinter;
  if (!controller) return;
  const roman = ["I", "II", "III", "IV"];
  const escape = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  let selectedVessel = 0;
  function init() {
    const wrapper = document.getElementById("wod-wrapper");
    if (!wrapper) return;
    wrapper.classList.add("WodWinter");
    const panel = (id, title, content) => `<section id="${id}" class="TableContainer WodWinterPanel"><div class="CaptionContainer"><div class="CaptionInnerContainer"><div class="Text">${title}</div></div></div><table class="Table5"><tbody><tr><td><div class="InnerTableContainer">${content}</div></td></tr></tbody></table></section>`;
    const tools = document.createElement("div");
    tools.className = "WodWinterTools";
    const atelierContent = `<div class="WodWinterLoadoutHeader"><div><span class="WodWinterEyebrow">EIGHT VESSELS</span><h3>Gem loadout</h3><p>Choose a vessel to configure its gem and grades.</p></div><div id="wod-winter-loadout-count" class="WodWinterLoadoutCount" aria-live="polite"></div></div><div class="WodWinterAtelierLayout"><div class="WodWinterRack"><div class="WodWinterRackHeading"><strong>Gem vessels</strong><span>Unlock order →</span></div><div id="wod-winter-vessels" class="WodWinterVessels" role="group" aria-label="Eight gem vessels in unlock order"></div><p class="WodWinterRackHelp">Fill Gem Vessel perks to unlock slots in this order. You can plan gems in locked slots; they activate when unlocked.</p></div><div id="wod-winter-gem-editor" class="WodWinterGemEditor"></div></div>`;
    tools.innerHTML = `<div class="WodWinterTabs" role="tablist" aria-label="Gem tools"><button type="button" role="tab" id="wod-winter-atelier-tab" aria-selected="true" aria-controls="wod-winter-atelier">Gem Atelier</button><button type="button" role="tab" id="wod-winter-workshop-tab" aria-selected="false" aria-controls="wod-winter-workshop" tabindex="-1">Fragment Workshop</button></div>${panel("wod-winter-atelier", "Gem Atelier", atelierContent)}${panel("wod-winter-workshop", "Fragment Workshop", '<p class="WodWinterNote">Choose the highest grade you have unlocked. The grade applies to every copy of the mod, independently of other mods on the gem.</p><label class="WodWinterFilter">Filter mods <input type="text" id="wod-winter-mod-filter" placeholder="Spell or effect"></label><div id="wod-winter-mods"></div>')}<p class="WodWinterNote">New spell augments reach +7% base damage or +12% critical extra damage at grade IV. Winter preview codes save the complete build for TibiaPal and cannot be imported into the game.</p>`;
    wrapper.querySelector("#PerksSummary").closest(".TableContainer").before(tools);
    const atelier = document.getElementById("wod-winter-atelier");
    const workshop = document.getElementById("wod-winter-workshop");
    atelier.setAttribute("role", "tabpanel"); atelier.setAttribute("aria-labelledby", "wod-winter-atelier-tab");
    workshop.setAttribute("role", "tabpanel"); workshop.setAttribute("aria-labelledby", "wod-winter-workshop-tab");
    workshop.hidden = true;
    const vessels = document.getElementById("wod-winter-vessels");
    const editor = document.getElementById("wod-winter-gem-editor");
    const mods = document.getElementById("wod-winter-mods");
    const filter = document.getElementById("wod-winter-mod-filter");
    document.getElementById("wod-limitpoints").maxLength = 5;
    for (const id of ["wod-code-input", "wod-code-input-mobile"]) {
      const input = document.getElementById(id);
      input.maxLength = 20000;
      input.placeholder = "Enter a winter preview code, Tibia code or saved planner URL";
    }
    for (const id of ["wod-code-tibialink", "wod-code-tibialink-mobile"]) {
      const button = document.getElementById(id);
      button.disabled = true;
      button.closest(".BigButton").hidden = true;
    }
    function effects(type, id) {
      return controller.model.modEffects(type, id).map(effect => `${effect.value} ${effect.name}`).join(" / ") || "No effect selected";
    }
    function gemVisual(slot) {
      return `<span class="WodWinterSocket ${slot.gem ? "HasGem" : ""}" aria-hidden="true">${slot.gem ? `<span class="WodWinterGemSprite" style="background-position:-${slot.spriteId * 40}px 0"></span><span class="WodWinterGemBezel" style="background-position:-${slot.bezelId * 40}px 0"></span>` : ""}</span>`;
    }
    function renderAtelier() {
      const model = controller.model;
      if (!model) return;
      const slots = model.vessels();
      const equipped = slots.filter(slot => slot.unlocked && slot.gem).length;
      document.getElementById("wod-winter-loadout-count").innerHTML = `<strong>${model.unlockedVessels}<span> / 8</span></strong><span>vessels unlocked</span><small>${equipped} gem${equipped === 1 ? "" : "s"} equipped</small>`;
      vessels.innerHTML = slots.map(slot => {
        const grade = model.gemGrade(slot.index);
        const state = slot.unlocked ? slot.gem ? "Equipped" : "Empty" : slot.gem ? "Planned" : "Locked";
        return `<button type="button" class="WodWinterVessel ${slot.unlocked ? "Unlocked" : "Locked"} ${slot.gem ? "HasGem" : ""}" data-vessel="${slot.index}" aria-pressed="${selectedVessel === slot.index}" aria-controls="wod-winter-gem-editor" aria-label="Vessel ${slot.index + 1}, ${slot.qualityName}, ${state}${typeof grade === "number" ? `, grade ${roman[grade]}` : grade === "mixed" ? ", mixed grades" : ""}"><span class="WodWinterVesselNumber">${slot.index + 1}</span><span class="WodWinterVesselDot" aria-hidden="true"></span>${gemVisual(slot)}<span class="WodWinterQuality" aria-hidden="true">${"●".repeat(slot.quality + 1)}</span><strong>${slot.qualityName}</strong><span class="WodWinterVesselState">${state}</span><span class="WodWinterVesselGrade">${typeof grade === "number" ? `Grade ${roman[grade]}` : grade === "mixed" ? "Mixed grades" : `${slot.quality + 1} mod${slot.quality ? "s" : ""}`}</span></button>`;
      }).join("");
      const slot = slots[selectedVessel];
      const gemGrade = model.gemGrade(selectedVessel);
      const gradeButtons = (key, grade, label) => `<div class="WodWinterGrades" role="group" aria-label="${escape(label)}">${roman.map((text, index) => `<button type="button" data-grade-key="${key}" data-grade="${index}" aria-pressed="${grade === index}">${text}</button>`).join("")}</div>`;
      editor.innerHTML = `<div class="WodWinterEditorHeader"><div class="WodWinterEditorIdentity">${gemVisual(slot)}<div><span class="WodWinterEyebrow">VESSEL ${slot.index + 1} · ${slot.qualityName.toUpperCase()}</span><h3>${escape(slot.name)}</h3><span class="WodWinterStatus ${slot.unlocked ? "is-active" : "is-locked"}">${slot.unlocked ? "Unlocked" : "Locked · planning only"}</span></div></div><button type="button" class="WodWinterButton WodWinterClear" id="wod-winter-clear-gem" ${slot.gem ? "" : "disabled"}>Clear gem</button></div><div class="WodWinterGemGrade"><div><strong>Gem grade</strong><span>${gemGrade === null ? "Choose mods below" : gemGrade === "mixed" ? "Mixed · set all mods together" : slot.quality === 0 ? `Grade ${roman[gemGrade]}` : `Grade ${roman[gemGrade]} · applies to all selected mods`}</span></div><div class="WodWinterGrades" role="group" aria-label="Selected gem grade">${roman.map((label, grade) => `<button type="button" data-gem-grade="${grade}" aria-pressed="${gemGrade === grade}" ${gemGrade === null ? "disabled" : ""}>${label}</button>`).join("")}</div></div><div class="WodWinterGemMods">${Array.from({ length: slot.quality + 1 }, (_, index) => {
        const type = index === 2 ? "supreme" : "basic", id = slot.gem?.mods[index] ?? null;
        const label = index === 2 ? "Supreme mod" : slot.quality === 0 ? "Basic mod" : `Basic mod ${index + 1}`;
        const icon = Number.isInteger(id) ? `<span class="WodWinterModIcon" style="background-image:url('https://static.tibia.com/images/global/common/skillwheel/icons-skillwheel-${type === "basic" ? "basicmods" : "suprememods"}.png');background-position:-${id * 32}px 0" aria-hidden="true"></span>` : `<span class="WodWinterModIcon is-empty" aria-hidden="true">${index === 2 ? "✦" : "+"}</span>`;
        const options = model.modOptions(type, index).map(option => ({ id: option, name: model.modName(type, option), label: model.modLabel(type, option) })).sort((a, b) => a.name.localeCompare(b.name));
        return `<section class="WodWinterModCard ${index === 2 ? "is-supreme" : ""}" data-editor-slot="${index}">${icon}<div class="WodWinterModContent"><div class="WodWinterModHeading"><label for="wod-winter-mod-${index}">${label}</label>${slot.quality ? `<span>${id === null ? "No mod selected" : `Grade ${roman[model.grade(type, id)]}`}</span>` : ""}</div><select class="GemDropdown" id="wod-winter-mod-${index}" data-mod-slot="${index}"><option value="">Choose ${index === 2 ? "a supreme mod" : "a basic mod"}…</option>${options.map(option => `<option value="${option.id}" ${option.id === id ? "selected" : ""}>${escape(option.label)}</option>`).join("")}</select>${id === null ? '<p class="WodWinterModEmpty">Select an effect for this slot.</p>' : `<p class="ModEffectValue">${escape(effects(type, id))}</p>${slot.quality ? `<div class="WodWinterModGrade"><span>Mod grade</span>${gradeButtons(`${type}:${id}`, model.grade(type, id), `${label} grade`)}</div>` : ""}`}</div></section>`;
      }).join("")}</div><p class="WodWinterEditorNote">Grades apply to every gem using the same mod. Each mod's grade works independently.</p>`;
    }
    function renderWorkshop() {
      const model = controller.model;
      if (!model || workshop.hidden) return;
      const search = filter.value.trim().toLowerCase();
      const used = new Set(model.gems.flatMap(gem => gem?.mods.flatMap((id, slot) => id === null ? [] : [`${slot === 2 ? "supreme" : "basic"}:${id}`]) ?? []));
      const rows = [
        ...[...new Set([...model.basic1, ...model.basic2])].map(id => ({ id, type: "basic" })),
        ...model.modOptions("supreme").map(id => ({ id, type: "supreme" })),
      ].map(row => ({ ...row, key: `${row.type}:${row.id}`, name: model.modName(row.type, row.id) }))
        .filter(row => !search || row.name.toLowerCase().includes(search))
        .sort((a, b) => Number(used.has(b.key)) - Number(used.has(a.key)) || a.name.localeCompare(b.name));
      mods.innerHTML = rows.map((row, index) => `<div class="WodWinterModRow ${index % 2 ? "Odd" : "Even"}"><div><strong>${escape(row.name)}</strong>${used.has(row.key) ? '<span class="WodWinterNote"> · In this build</span>' : ""}<div class="ModEffectValue">${escape(effects(row.type, row.id))}</div></div><div class="WodWinterGrades" role="group" aria-label="${escape(row.name)} grade">${roman.map((label, grade) => `<button type="button" data-grade-key="${row.key}" data-grade="${grade}" aria-pressed="${model.grade(row.type, row.id) === grade}">${label}</button>`).join("")}</div></div>`).join("") || '<p class="WodWinterNote">No matching mods.</p>';
    }
    function renderGemSummary() {
      const model = controller.model;
      if (!model) return;
      const summary = model.summary();
      const rows = [{ name: "Gem vessels unlocked", value: `${model.unlockedVessels} / 8` }, { name: "Damage and Healing", value: `+${summary.vesselDamage}` }, ...summary.effects];
      if (summary.momentum) rows.push({ name: "Momentum", value: `+${summary.momentum}%` });
      document.getElementById("wod-gem-perks").innerHTML = rows.map((row, index) => `<tr class="${index % 2 ? "Odd" : "Even"}"><td>${escape(row.name)}</td><td><span class="PerksSummaryValue">${escape(row.value)}</span></td></tr>`).join("");
    }
    controller.update = () => { renderAtelier(); renderWorkshop(); renderGemSummary(); };
    function refresh() { window.wodPlannerRefresh?.(); controller.update(); }
    tools.querySelectorAll('[role="tab"]').forEach(tab => {
      tab.addEventListener("click", () => {
        tools.querySelectorAll('[role="tab"]').forEach(button => {
          const active = button === tab;
          button.setAttribute("aria-selected", String(active)); button.tabIndex = active ? 0 : -1;
          document.getElementById(button.getAttribute("aria-controls")).hidden = !active;
        });
        renderAtelier(); renderWorkshop();
      });
      tab.addEventListener("keydown", event => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const tabs = [...tools.querySelectorAll('[role="tab"]')];
        const target = event.key === "Home" ? tabs[0] : event.key === "End" ? tabs[1] : tabs.find(button => button !== tab);
        target.click(); target.focus();
      });
    });
    vessels.addEventListener("click", event => {
      const button = event.target.closest("[data-vessel]");
      if (!button) return;
      selectedVessel = Number(button.dataset.vessel); renderAtelier();
      vessels.querySelector(`[data-vessel="${selectedVessel}"]`).focus();
    });
    vessels.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      const button = event.target.closest("[data-vessel]");
      if (!button) return;
      event.preventDefault();
      const index = Number(button.dataset.vessel);
      const offset = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -4, ArrowDown: 4 }[event.key];
      selectedVessel = event.key === "Home" ? 0 : event.key === "End" ? 7 : (index + offset + 8) % 8;
      renderAtelier(); vessels.querySelector(`[data-vessel="${selectedVessel}"]`).focus();
    });
    editor.addEventListener("change", event => {
      const select = event.target.closest("[data-mod-slot]");
      if (!select || !controller.model) return;
      const model = controller.model, slot = Number(select.dataset.modSlot);
      const gem = model.gems[selectedVessel] ?? { mods: Array(model.vessels()[selectedVessel].quality + 1).fill(null) };
      gem.mods[slot] = select.value === "" ? null : select.value.startsWith("new:") ? select.value : Number(select.value);
      model.gems[selectedVessel] = gem.mods.some(id => id !== null) ? gem : null;
      refresh(); editor.querySelector(`[data-mod-slot="${slot}"]`).focus();
    });
    editor.addEventListener("click", event => {
      if (!controller.model) return;
      const bulkGrade = event.target.closest("[data-gem-grade]");
      if (bulkGrade) {
        const grade = Number(bulkGrade.dataset.gemGrade);
        controller.model.setGemGrade(selectedVessel, grade); refresh();
        editor.querySelector(`[data-gem-grade="${grade}"]`)?.focus(); return;
      }
      if (event.target.closest("[data-grade-key]")) return changeModGrade(event, editor);
      if (event.target.id === "wod-winter-clear-gem") { controller.model.gems[selectedVessel] = null; refresh(); }
    });
    function changeModGrade(event, host) {
      const button = event.target.closest("[data-grade-key]");
      if (!button || !controller.model) return;
      const { gradeKey, grade } = button.dataset;
      const editorSlot = button.closest("[data-editor-slot]")?.dataset.editorSlot;
      controller.model.grades[gradeKey] = Number(grade); refresh();
      const prefix = editorSlot === undefined ? "" : `[data-editor-slot="${editorSlot}"] `;
      host.querySelector(`${prefix}[data-grade-key="${gradeKey}"][data-grade="${grade}"]`)?.focus();
    }
    mods.addEventListener("click", event => changeModGrade(event, mods));
    filter.addEventListener("input", renderWorkshop);
    document.getElementById("wod-limitpoints").addEventListener("input", () => queueMicrotask(refresh));
    controller.update();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
