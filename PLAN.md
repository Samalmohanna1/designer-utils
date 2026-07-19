# PLAN.md

Tracked follow-up work for the Color Scale Generator. See
[CLAUDE.md](./CLAUDE.md) for architecture and conventions. Read the relevant
item before starting it; mark items done here as they ship.

---

## Open items

### 2. Expand e2e / unit coverage

**Status:** in progress · **Type:** `test`

The scaffolding `example.spec.ts` was replaced with real smoke tests
([tests/smoke.spec.ts](./tests/smoke.spec.ts): both tools load with correct
titles, the color tool renders its 10 shades, the type tool outputs the
reference CSS, and the nav moves between them). Still wanted:

- [ ] Deeper color-tool specs: add/remove a scale, contrast tiers labeled
      correctly, format + color-format switching changes the snippet, copy
      (text export + SVG copy).
- [ ] Type-tool specs: changing ratio/viewport/size updates the clamps; steps
      up/down change the count.
- [ ] Unit coverage of [colorUtils.ts](./src/utils/colorUtils.ts) (shade-ramp
      endpoints, distinct shades for near-white/near-black bases, contrast
      thresholds at 3.1 / 4.5 / 7, hex↔RGB↔HSL) and
      [typeScale.ts](./src/utils/typeScale.ts) (clamp matches Utopia).
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

## Improvement backlog (audited 2026-07)

**Status: SHIPPED** (branch `feature/foundations-suite`, 2026-07-19) — every
item below (A/B/C/D/E, in the suggested order) landed in that one branch; see
the Done entry at the top of the Done section for the summary. The original
backlog is kept below as the design rationale.

Goal: make the suite a **one-stop shop for design-system foundations** — a team
should be able to leave with every foundational token layer, not just color /
type / space. Grouped by theme; suggested order at the end.

### A. New foundations: the missing token layers

**Type:** `feature` — the core of the one-stop-shop vision.

One new **`/foundations`** route (one nav item, not five) with a section per
token layer, mirroring the existing pattern: an island owning one config,
`utils/foundations.ts` as the engine, live preview per section, the standard
CSS / Tailwind 4 / DTCG export block, and `#f=` URL-hash sync.

- [ ] **Corner radii** — a small ramp (`none / sm / md / lg / xl / full`) from
      a base value + multiplier curve. Preview as rounded squares. DTCG
      `dimension` tokens; `--radius-*` in CSS/Tailwind.
- [ ] **Border widths** — hairline / 1 / 2 / 4 style ladder. Preview as ruled
      lines. DTCG `dimension`; `--border-*`.
- [ ] **Elevation / shadows** — a 5–6 level ramp of layered `box-shadow`s
      (each level = 2 stacked shadows: ambient + key), with a **dark-mode
      variant** (shadows read differently on dark surfaces — usually higher
      opacity). Preview as floating cards. DTCG `shadow` type (it supports an
      array of shadow objects); `--elevation-*`.
- [ ] **Font families** — pick a heading + body + mono stack (curated
      system-stack presets plus a free-text field), with fallbacks. Preview
      renders the stacks. DTCG `fontFamily` tokens; `--font-*`. Optionally
      font-weight tokens (`fontWeight`) alongside.
- [ ] **Motion** — duration ramp (fast/base/slow) + named easings
      (standard/decelerate/accelerate as `cubic-bezier`). Preview as a
      replayable animation per easing. DTCG `duration` + `cubicBezier`.
- [ ] Each section ships with smoke coverage like the existing tools.

Radii, borders, and elevation are the highest-value/lowest-effort trio — they
can ship first and the page can grow section by section.

### B. Unified "whole system" export

**Type:** `feature` — the capstone; depends on A.

- [ ] A single **Export design system** action that merges all tools' current
      configs into one DTCG file (and one CSS/Tailwind block): `color`,
      `font-size`, `space`, `grid`, `radius`, `border`, `elevation`, `font`,
      `motion`.
- [ ] Requires a **consistent mode strategy** first: color exports top-level
      `light`/`dark`, type/space export `min`/`max`. A merged file needs a
      deliberate shape (e.g. modes only where they exist:
      `{ light, dark, min, max, static }` or per-group modes). Decide before
      building; document in CLAUDE.md.
- [ ] Reading configs across pages: each tool's config already serializes to a
      hash — a shared `localStorage` key per tool (the color tool already
      writes one) lets the export read the latest state of every tool.

### C. Code improvements

**Type:** `refactor` — do C1 *before* building A, or the duplication triples.

- [ ] **C1. Shared `ExportBlock` component.** `CodeBlock`, `TypeScale`, and
      `SpaceScale` each hand-roll the same format selector + Prism `<pre>` +
      Copy Code + Download .txt block (three near-identical copies today; a
      fourth tool would make four). Extract one component taking
      `{ formats, code, language, filename }`.
- [ ] **C2. Shared `useHashConfig` hook.** The mount-read → `hydrated` ref →
      `replaceState` live-sync pattern is duplicated in `App`, `TypeScale`,
      and `SpaceScale`. One hook taking `{ prefix, encode, decode }`.
- [ ] **C3. Shared `useCopied` hook** for the copy-button state + 2s reset
      timer (repeated ~6 times across components).
- [ ] **C4. Scope Prism highlighting.** `Prism.highlightAll()` re-highlights
      the whole page on every config keystroke; use `highlightElement` on the
      one `<code>` node.
- [ ] **C5. Tokenize stray hexes.** `#A51D1D`/`#FDF4F4` (App remove button),
      `#F4F5F9` (App buttons), `#2d2d2d` (all three export blocks),
      `#5799DB` (Type/Space previews) violate the repo's own use-`@theme`
      rule — add tokens (`red-*`, `code-bg`, `blue-500`) and use them.
- [ ] **C6. Fix the `black-*` ramp in global.css.** `black-600`–`900` are all
      ~1% lightness (visually identical); blue only has `blue-50`. Regenerate
      the app's own ramps with the app (dogfood) and fill the gaps.
- [ ] **C7. Rename the `ColorScale` component.** It collides with the
      `ColorScale` type from `colorUtils` (imported as `ColorScale2` in App) —
      rename the component to `ShadeRamp`.
- [ ] Existing open item 1 (delete dead `ContrastLevel.tsx`) folds in here.

### D. UX improvements

**Type:** `feature`/`fix`.

- [ ] **D1. Offer to restore the autosave.** `localStorage` is written on
      every edit but never read back — on load with no URL hash, show a small
      "Restore your last palette?" affordance instead of silently discarding
      it (keep URL-wins behavior).
- [ ] **D2. Announce copy confirmations.** The Copied!/Link copied! feedback
      is a visual text swap only; add `aria-live='polite'` so screen readers
      hear it. Applies to every copy/download button.
- [ ] **D3. Variable-prefix control.** Teams rarely ship `--blue-500` as-is;
      an optional prefix input (e.g. `brand`) applied across CSS/Tailwind/
      DTCG exports on all tools.
- [ ] **D4. px/rem display toggle** on the Type and Space tables (values show
      rem; designers think in px at the anchors — show both or toggle).
- [ ] **D5. In-page section nav.** The color page is long (scales → contrast
      → export); small sticky anchor links (or scroll-margin'd headings)
      would help all three tools.

### E. Layout & design

**Type:** `style`.

- [ ] **E1. Dark mode for the site itself.** The tool *exports* dark mode but
      doesn't have one — with the cream/black/yellow tokens in `@theme`, a
      `prefers-color-scheme` variant is mostly token remapping. High
      credibility win for a design-system tool. (CVD filters must still apply.)
- [ ] **E2. Per-tool OG images + titles.** All routes share the color tool's
      `og-image.png`; give Type, Space (and Foundations) their own cards.
- [ ] **E3. Fluid body size.** `body { font-size: 18px }` is fixed while
      everything else uses `text-step-*`; use `--text-step-0`.

### Suggested order

1. **C1–C3** (shared export block + hooks) — pays for itself immediately.
2. **A** radii + borders + elevation (first `/foundations` slice), then fonts
   + motion.
3. **B** unified export once A's layers exist.
4. **D/E** interleaved as small PRs (D1/D2/E3 are quick wins; E1 is a bigger
   style pass).

---

## Done

- **The 2026-07 improvement backlog, whole** (branch
  `feature/foundations-suite`). In order: dead `ContrastLevel.tsx` deleted
  (old open item 1); shared `ExportBlock` + `useHashSync`/`useCopied` hooks
  replacing three hand-rolled copies (Prism scoped to the block; copy buttons
  announce via aria-live); color export formats extracted into `colorUtils`
  and every engine's builders made prefix-aware (the **variable prefix**
  field); global.css cleanup (full blue ramp generated by the app's own
  engine, red/code tokens replacing stray hexes, dead black-600–900 deleted,
  fluid body size); `ColorScale` component renamed `ShadeRamp`; the
  **Foundations tool** at `/foundations` (radii, borders, elevation with dark
  variant, font stacks, motion — engine in `utils/foundations.ts`, `#f=`
  hash sync); the **whole-system export** (`utils/systemExport.ts`) merging
  every tool's autosave into one CSS/Tailwind/DTCG file with the documented
  mode strategy; restore-autosave banner (plus the fix for the autosave being
  clobbered on load); px+rem readouts; jump links; **site dark mode** as a
  pure token remap (verified in both schemes); per-tool OG cards.
- **DTCG 2025.10 compliance across all three tools** (branches
  `fix/dtcg-color-object` #45, `feature/download-code-snippet` #46). Color
  `$value`s became color objects (`colorUtils.hexToDtcgColor`). Type and Space
  dimension `$value`s became `{ value, unit }` objects
  (`typeScale.remDimension`); since a `clamp()` can't be a DTCG dimension, both
  flatten to `min`/`max` anchor groups that import as Figma modes. Every export
  block also gained a **Download .txt** button (`utils/download.ts`).
- **Space & Grid calculator** (branch `feature/space-grid-calculator`). A third
  tool at `/space`: fluid spacing scale (T-shirt sizes 3xs–3xl on an 8pt grid
  by default + one-up pairs) and a matching column grid, in
  `utils/spaceScale.ts` (reusing `typeScale`'s `clampFor`/`pxToRem`/`round`).
  A `SpaceScale` island with own inputs (viewport 320–1440), a size table with
  blue preview swatches, pair bars, a grid section (gutter/container/columns +
  @min-column rounding), CSS/Tailwind/Tokens export, and `#s=` URL sync. Added
  to the nav (ruler icon) and the smoke suite. Output matches utopia.fyi.
- **Type Scale calculator** (branch `feature/type-scale-calculator`). A second
  tool at `/type`: fluid type-scale math in `utils/typeScale.ts`
  (`generateTypeScale` / `toCss` / named ratios), a `TypeScale` island with
  min/max viewport + size + ratio inputs, steps up/down, a preview-viewport
  slider, and a copyable `:root` block of `clamp()` custom properties
  (matches utopia.fyi). Added a shared top nav (`SiteNav`) and footer
  (`SiteFooter`) across both tools, per-page titles/descriptions in `Layout`,
  and replaced the scaffolding spec with real smoke tests (`smoke.spec.ts`).
- **Ramp collapse fix for near-endpoint bases** (branch
  `fix/ramp-collapse-light-base`). A base whose OKLCH lightness sat at an
  endpoint (e.g. near-white `#EEF6FF`) collapsed the short side of the ramp to
  one repeated color; each side's endpoint is now pushed out to keep a minimum
  per-step lightness gap (`MIN_STEP_L`), clamped at white/black.
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
  (`{ slug: { shade: { $type, $value } } }`) for Style Dictionary /
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
