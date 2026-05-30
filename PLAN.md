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

---

## Done

_(none yet)_
