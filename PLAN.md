# PLAN.md

Tracked follow-up work for the Color Scale Generator. See
[CLAUDE.md](./CLAUDE.md) for architecture and conventions. Read the relevant
item before starting it; mark items done here as they ship.

---

## Open items

### 1. Remove dead code: `ContrastLevel.tsx` (+ missing `ColorCombo`)

**Status:** not started · **Type:** `chore`/`refactor`

[src/components/ContrastLevel.tsx](./src/components/ContrastLevel.tsx) imports
`./ColorCombo`, a component that does not exist in the repo. Neither
`ContrastLevel` nor `ColorCombo` is referenced by [App.tsx](./src/components/App.tsx)
or anything else — the live contrast UI is [ContrastChecker.tsx](./src/components/ContrastChecker.tsx).

- [ ] Confirm `ContrastLevel` has no remaining importers.
- [ ] Delete `ContrastLevel.tsx` (and `ColorCombo` if a stub turns up).
- [ ] `npm run build` passes (no broken imports / type errors).

### 2. Replace scaffolding e2e tests with real coverage

**Status:** not started · **Type:** `test`

[tests/example.spec.ts](./tests/example.spec.ts) is Playwright starter
scaffolding — it asserts a "get started" / "Installation" flow that does not
exist in this app. [tests-examples/](./tests-examples/) is Playwright's
generated demo and is not part of the suite.

- [ ] Replace `tests/example.spec.ts` with specs that assert real behavior:
  - [ ] Entering a base hex renders the 10-step scale (50–900), with 500 = the base.
  - [ ] Adding / removing a color scale updates the page.
  - [ ] The contrast checker lists legible foregrounds and labels AAA / AA /
        AA Large correctly.
  - [ ] Switching format (CSS + Dark / Tailwind 4 / Markdown / Design Tokens)
        and color format (hex / HSL / RGB) changes the exported snippet.
  - [ ] Copy-to-clipboard works (text export + SVG copy).
- [ ] Add unit-level coverage of [colorUtils.ts](./src/utils/colorUtils.ts):
      shade-ramp endpoints, contrast thresholds at 3.1 / 4.5 / 7, and
      hex↔RGB↔HSL conversion.
- [ ] Remove or ignore the `tests-examples/` demo so it isn't mistaken for real tests.
- [ ] `npx playwright test` passes.

### 3. Generate a palette from an image

**Status:** not started · **Type:** `feature`

Let designers seed scales from an uploaded image instead of picking hex by hand.
Decided approach: **extract the top N dominant colors**, each becoming one base
color (a `500`), auto-named via `colorUtils.nameFromHex`.

- [ ] Image upload / drag-and-drop control in the color selection section.
- [ ] Sample pixels onto a `<canvas>` and quantize to N dominant colors
      (hand-rolled — e.g. median-cut or coarse bucketing — no new dependency
      unless justified first; keep it in `colorUtils`).
- [ ] A control for how many colors to extract (N).
- [ ] Each extracted color becomes a new scale (base + auto-name); de-dupe
      against existing scales.
- [ ] Process the image client-side only — never upload it anywhere.
- [ ] Tests: extraction returns N valid hex colors; scales are created and named.

---

## Feature roadmap

Remaining quick wins (low effort, daily value). Earlier tiers (SCSS /
cross-platform exports, swatch files, APCA, suggest-a-passing-shade) were
dropped from scope.

- **Duplicate a scale** — clone a scale (same color/name, new id) after it.
- **Pin the input as a chosen shade** (e.g. "this hex is my 600") instead of
  always forcing it to 500; optional ramp-curve tuning.
- **Curate which shades export** (systems rarely ship all 10).

---

## Done

- **Color selection: naming + designer optimizations** (branch
  `feature/contrast-picker-redesign`). Editable, hue-auto-named scales; names
  flow into the export (slugified + de-duped) and contrast labels; varied
  default color per new scale; click-to-copy swatch hex; reset-palette control.
- **Shareable / persistent palette** (branch `feature/shareable-palette`).
  Palette serialized to the URL hash (`#p=name:hex,…`) with live sync + a copy
  link button; `localStorage` autosave (write-only, not auto-restored). URL wins
  over default on load; malformed hashes fall back to the default.
- **Design Tokens (DTCG) JSON export** (branch `feature/design-tokens-export`).
  New `tokens` format in `CodeBlock` emitting W3C Design Tokens
  (`{ slug: { shade: { $type, $value } } }`, always hex) for Style Dictionary /
  Tokens Studio / Figma; JSON syntax-highlighted; color-format selector hidden.
- **OKLCH shade generation** (branch `feature/oklch-ramp`). Ramps built in OKLCH
  (perceptual): base anchors 500, lightness interpolates to fixed light/dark
  endpoints holding hue, chroma tapers at the ends, with binary-search gamut
  mapping. Even, hue-stable steps replacing the sRGB white/black mix.
- **CSS + Dark Mode export** (branch `feature/dark-mode-export`). New `cssDark`
  format: the `:root` light block plus a `@media (prefers-color-scheme: dark)`
  block where each shade takes its mirror value (50↔900, …), keeping hue/chroma.
  Respects the color-format selector. Later extended dark mode to Tailwind 4
  (`.dark` block), the Markdown style guide (Dark column), and Design Tokens
  (top-level `light`/`dark` groups), sharing `colorUtils.mirrorHexes`.
- **Colorblind simulation** (branch `feature/colorblind-simulation`). A fixed
  bottom bar (`CvdBar`) toggles a page-wide SVG `feColorMatrix` filter via a
  `body.cvd-*` class for protanopia / deuteranopia / tritanopia / achromatopsia;
  the filter covers `main` + `footer`, leaving the bar itself unfiltered.
- **Quick wins** (branch `feature/quick-wins`). Per-scale copy (later changed to
  SVG copy, below); reorder scales with up/down buttons (export + URL order
  follows); bulk-paste hex (`colorUtils.parseHexList`) to create several
  auto-named scales at once.
- **Compact scale rows** (branch `style/compact-scale-row`). Redesigned the
  color-selection rows: shade number + hex live inside each full-height swatch
  (auto black/white label per `colorUtils.readableTextColor`), slimmed name/hex
  inputs, tighter rows, and an icon cluster (copy / up / down / remove) under
  the input so more scales fit on screen.
- **SVG copy for Figma** (branch `feature/contrast-card-svg-copy`). Copy a
  scale (`colorUtils.scaleToSvg`), the whole palette (`paletteToSvg`), or the
  entire contrast grid (`contrastGridToSvg`) as an SVG of named, editable
  rectangles — written to the clipboard under both `text/plain` and
  `image/svg+xml` (`utils/clipboard.copySvg`) so it pastes into Figma as vector
  with `id`-named layers. Same branch: loaded palettes re-derive their name on
  recolor (fixes a stale-name bug), and a duplicate scale's name field shows
  its de-duped export slug (e.g. `blue-2`).
