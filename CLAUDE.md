# CLAUDE.md

Project-specific gotchas for working in this repo. Read before editing CSS or the damage-calculator/wheel/proficiency planner integration.

## `css/main.css` is a compiled file — never hand-edit it alone

`css/main.css` is generated from `css/main.sass`, which `@import`s partials from `_sass/*.sass` (e.g. `_sass/_damage_calculator.sass`, `_sass/_wheel.sass`, `_sass/_proficiency_calculator.sass`, etc.). There's a Sass watcher (e.g. VS Code's "Live Sass Compiler") that can recompile `css/main.css` from those partials at any time and will silently discard any edit made only to the compiled `css/main.css`.

**Always make the real edit in the matching `_sass/_*.sass` partial first.** Sass here uses the indented syntax (no braces/semicolons, indentation-significant).

If you need the fix visible immediately (e.g. to test against a running local server) without waiting for the watcher to recompile, you can *also* patch `css/main.css` directly with the equivalent change — but treat that as a temporary mirror of the source edit, never a substitute for it. If a watcher then recompiles from source and your direct patch didn't match the source, the direct patch will disappear and the bug will look "unfixed" even though the CSS change was correct.

`css/main.css.map` exists and confirms the source chain — if in doubt, check it (`sources` array lists every `_sass/*.sass` partial that feeds the build).

Don't recompile the whole `css/main.sass` locally with an ad hoc `sass` CLI unless you've confirmed it reproduces the project's actual toolchain output byte-for-byte — a different Sass implementation/version can silently drop autoprefixer vendor-prefixes (`-webkit-*`, `-ms-*`) and reflow comments, producing a huge unrelated diff.

## `_site/` is checked into git and mirrors a live local Jekyll server

This repo commits its Jekyll build output (`_site/`). If a local `jekyll serve` is already running (check `netstat`/`tasklist` for a listener on port 4000, process name `ruby.exe`), edits to source files (`.html`, `_includes/*`, `css/main.css`, `_sass/*`, etc.) get picked up and mirrored into `_site/` automatically — you'll see matching changes in `git status` for both the source file and its `_site/` counterpart. Don't manually edit files under `_site/` — edit the source and let the build regenerate it.

## Cache-busting query params

Several files reference each other with explicit `?v=YYYYMMDD-N` query strings for cache-busting:
- `damage-calculator.html` → `<script src="/damage-calculator/app.js?v=...">`
- `weapon-proficiency.html` → `<script src="/proficiency-calculator/app.js?v=...">`
- `damage-calculator/app.js` → passes matching `v` values into `plannerUrl()` when building the `wheel-planner.html` / `weapon-proficiency.html` iframe URLs it embeds

When you edit any of `damage-calculator/app.js`, `proficiency-calculator/app.js`, or their host `.html` files, bump the relevant `?v=` string(s) too (increment the date/suffix). Otherwise a browser that already loaded the old URL under that exact query string can keep serving the stale cached script even after a refresh, making a real fix look like it "didn't work."

## Damage calculator planner modal (Wheel of Destiny / Weapon Proficiency editors)

`damage-calculator.html` has a single shared modal (`#plannerModal`) with two iframes (`#wheelPlannerFrame`, `#proficiencyPlannerFrame`) reused across both Build A and Build B — see `openPlanner()` / `initializePlannerFrames()` in `damage-calculator/app.js`. Notable behavior worth knowing before touching this:

- Reopening an *unchanged* build reuses the iframe's current document (no navigation) rather than reloading it — see the `pendingNav` handling in `setPlannerFrameSrc()`.
- A loading overlay (`.dc-planner-loading` + `.dc-spinner`, styled in `_sass/_damage_calculator.sass`) covers each iframe on every open (not just on real navigation) with a minimum visible duration (`PLANNER_LOADING_MIN_MS`), because even a "no navigation needed" reopen can otherwise show a frame of stale/raw content while the modal settles.
- `proficiency-calculator/app.js` has a `wpBuild` cookie meant only for the *standalone* `/weapon-proficiency.html` page's "remember my last build" feature. It's explicitly skipped (read and write) when `isPlannerEmbed` is true, so editing one build inside the damage calculator doesn't leak its weapon/perk choices into a different, not-yet-customized build. Don't remove that `isPlannerEmbed` guard.
