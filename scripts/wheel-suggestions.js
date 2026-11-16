(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    if (!document.getElementById("wod-suggestions")) return;
    const data = JSON.parse(document.getElementById("wod-suggestions-data").textContent);
    const select = document.getElementById("wod-suggestion");
    const status = document.getElementById("wod-suggestion-status");
    let activeVocation = "";
    let builds = [];

    function showStatus(message = "") {
      status.textContent = message;
      status.hidden = !message;
    }

    function syncVocation() {
      const vocation = document.querySelector('input[name="wod-vocation"]:checked')?.value;
      if (vocation === activeVocation) return;
      activeVocation = vocation;
      builds = data[vocation]?.builds ?? [];
      select.replaceChildren(new Option("Choose a wheel template…", ""));
      builds.forEach((build, index) => select.add(new Option(`${build.points} points — ${build.description}`, String(index))));
      showStatus();
    }

    document.querySelectorAll('input[name="wod-vocation"]').forEach((radio) => {
      radio.addEventListener("change", syncVocation);
    });
    // Imports (including shared URLs) update the checked radio without a change event.
    new MutationObserver(syncVocation).observe(document.getElementById("wod-code"), { childList: true, characterData: true, subtree: true });

    select.addEventListener("change", () => {
      syncVocation();
      showStatus();
      const build = builds[select.value];
      if (!build) return;
      if (!window.wodPlannerRefresh?.()) {
        select.value = "";
        showStatus("The planner is still loading. Please select the build again in a moment.");
        return;
      }
      const code = new URL(build.link, window.location.href).searchParams.get("code");
      if (!code) return;
      // Use the existing importer so canvas, perks, vocation and URL all update together.
      const input = document.getElementById("wod-code-input");
      input.value = code;
      document.getElementById("wod-code-input-mobile").value = code;
      document.getElementById("wod-code-import").click();
      const invalid = !document.getElementById("wod-code-invalid").classList.contains("hide");
      showStatus(invalid ? "This wheel could not be loaded. Please try another build." : `Loaded: ${build.points} points — ${build.description}. You can now adjust the wheel.`);
    });

    syncVocation();
  });
})();
