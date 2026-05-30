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
  - [ ] The contrast table lists pairs and labels AAA / AA / AA Large correctly.
  - [ ] Switching theme format (CSS / Tailwind 3.4 / Tailwind 4.1) and color
        format (hex / HSL / RGB) changes the exported snippet.
  - [ ] Copy-to-clipboard works.
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

Prioritized by leverage for the designer workflow and the designer→dev handoff.
Tiers are rough guidance, not a strict order.

### Tier 2 — handoff bridges (export depth)

- **Dark-mode pairing** — emit a `:root` + `prefers-color-scheme: dark` (or
  `[data-theme]`) block with the ramp inverted (900↔50). Devs hand-build this
  today.
- **SCSS** variables / map, and **cross-platform** formats (Android
  `colors.xml`, iOS `UIColor` / SwiftUI `Color`).
- **Swatch files** — `.ase` / `.aco` for direct import into design tools.

### Tier 3 — accessibility (extend the differentiator)

- **Colorblind simulation** — protanopia / deuteranopia / tritanopia previews of
  the palette.
- **APCA contrast** alongside WCAG 2 (the WCAG 3 direction).
- **Suggest a passing shade** — when a contrast pair fails, propose the nearest
  shade in the ramp that passes.

### Tier 4 — quick wins (low effort, daily value)

- **Copy a whole scale** (array / all shades), not just one swatch.
- **Reorder (drag) scales** and **duplicate a scale**.
- **Pin the input as a chosen shade** (e.g. "this hex is my 600") instead of
  always forcing it to 500; optional ramp-curve tuning.
- **Curate which shades export** (systems rarely ship all 10).
- **Bulk-create scales** by pasting a list of hex values.

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
