# CLAUDE.md

Project-specific gotchas. Read before editing CSS or the damage-calculator/wheel/proficiency planner integration.

## Don't verify finished work in a browser — the owner does that

The owner runs the local Jekyll server and checks the result themselves. Don't launch a headless browser or screenshot a change as a final "proof it works" step; make the edit and describe it.

Headless rendering *is* fine for **diagnosis** — reproducing a reported bug, measuring an actual overflow, working out which rule contributes unexpected pixels. Answer the specific question, then stop.

## `css/main.css` is compiled — never hand-edit it alone

It's built from `css/main.sass`, which `@import`s the `_sass/*.sass` partials (indented syntax: no braces/semicolons). A Sass watcher (VS Code Live Sass Compiler) can recompile at any time and will silently discard edits made only to `css/main.css`.

- **Always edit the matching `_sass/_*.sass` partial.** You may *additionally* mirror the change into `css/main.css` to see it immediately, but never instead — if the mirror doesn't match the source, a recompile erases it and the fix looks unapplied.
- Don't recompile `main.sass` with an ad hoc `sass` CLI. A different implementation/version drops autoprefixer vendor prefixes and reflows comments, producing a huge unrelated diff.
- `css/main.css.map`'s `sources` array confirms the partial chain if in doubt.

## `_site/` is committed and mirrors a live Jekyll server

The Jekyll build output is checked into git. If `jekyll serve` is running (port 4000, `ruby.exe`), source edits are mirrored into `_site/` automatically — expect both to show in `git status`. Never edit `_site/` by hand.

## Cache-busting query params

These reference each other with explicit `?v=YYYYMMDD-N` strings:

- `damage-calculator.html` → `/damage-calculator/app.js?v=…`
- `weapon-proficiency.html` → `/proficiency-calculator/app.js?v=…`
- `damage-calculator/app.js` → matching `v` values passed to `plannerUrl()` for the `wheel-planner.html` / `weapon-proficiency.html` iframes

Bump the relevant one whenever you edit those files, or a browser keeps serving the cached script and a real fix looks like it didn't work.

## Damage calculator share links (`?build=`) — the schema is append-only

A token is `compactBuild()` output (one **positional array** per build, defaults trimmed off the end) → JSON → `deflate-raw` → base64url, behind a one-character format marker. The codec sits in `damage-calculator/app.js` between `bytesToBase64Url()` and `sanitizeState()`.

Every index is baked into links already posted to Discord and forums, so when adding a field to `shareableFromState()`:

- **Append to the end** of `compactBuild()` and read the same new index in `expandBuild()`. Inserting or reordering makes old links decode as a *different* build instead of failing loudly. `SHARE_VOCATIONS` indices are part of the format too — new vocations go on the end.
- **`expandBuild()` must leave absent fields absent, not `null`.** `sanitizeState()` merges over `defaultState()`, and an explicit `null` beats the default it would otherwise pick (that's what re-derives `magicLevel` for paladins/casters).

Markers: `3` = positional + deflate, `2` = positional uncompressed (no `CompressionStream`), anything else = the original plain-base64-JSON. Legacy tokens are base64 of a string starting `{"`, so they always begin `ey` and can't collide. **Keep the legacy branch** — old links must still open.

`wheelPlanner.code` is CIP's own opaque planner code (~49 chars, already compressed) and sets the floor on link length. There's no backend in this repo to shorten it further.

## The damage calculator mirrors its state into the address bar

`saveAllState()` → `syncBuildUrl()`, which debounces and `history.replaceState`s the builds into `?build=` (same idea as `syncBuildUrl()` in `proficiency-calculator/app.js`).

- **`replaceState`, never `pushState`** — every edit would otherwise become a Back-button step.
- Boot can't treat "`?build=` exists" as "someone else's link". It compares against the token this tab last wrote (`SHARE_TOKEN_KEY` in `sessionStorage`, per-tab deliberately) so a refresh doesn't drop the saved-preset name and dirty marker via `isSharedLink`. Keep that comparison honest if you change how tokens are written.

## Damage calculator planner modal (Wheel of Destiny / Weapon Proficiency)

One shared modal (`#plannerModal`) with two iframes reused across Build A and Build B — see `openPlanner()` / `initializePlannerFrames()`.

- Reopening an *unchanged* build reuses the iframe's current document instead of reloading it — see `pendingNav` in `setPlannerFrameSrc()`.
- The `.dc-planner-loading` overlay covers each iframe on *every* open with a minimum duration (`PLANNER_LOADING_MIN_MS`), because even a no-navigation reopen can flash stale content while the modal settles.
- `proficiency-calculator/app.js`'s `wpBuild` cookie is only for the standalone `/weapon-proficiency.html` page. It's skipped (read and write) when `isPlannerEmbed` — otherwise editing one build inside the damage calculator leaks its weapon/perk choices into a different, not-yet-customized build. **Don't remove that guard.**
