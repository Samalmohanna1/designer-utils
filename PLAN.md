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

## Done

- **Color selection: naming + designer optimizations** (branch
  `feature/contrast-picker-redesign`). Editable, hue-auto-named scales; names
  flow into the export (slugified + de-duped) and contrast labels; varied
  default color per new scale; click-to-copy swatch hex; reset-palette control.
