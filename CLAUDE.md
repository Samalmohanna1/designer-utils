# CLAUDE.md

Project context and working rules for Claude Code in this repo. This file is
the source of truth for how to work on this codebase. Re-read it when in doubt
about architecture or conventions.

---

## What this is

**Designer Utils** (MYOL Creative tools suite) — a design-system-foundations
builder that lives on **ONE page** (`/`). A sticky top nav
([SiteNav](./src/components/SiteNav.astro)) jumps between the sections (JS
`scrollIntoView`, never `#hash` navigation — the hash carries state), and one
React island ([DesignSystemApp](./src/components/DesignSystemApp.tsx)) owns
every section's state (see **Single-page architecture**):

- **Color Scales** (`#colors`, the original tool) — build color scales, check
  WCAG contrast, copy swatches to Figma. The bulk of this doc.
- **Type Scales** (`#type`) — font stacks first (system stacks, Google Fonts,
  or a custom stylesheet URL), then a fluid type-scale calculator: font size
  and modular-scale ratio at each shared viewport anchor, preview every step.
  See the **Type Scale** entry.
- **Space & Grid** (`#space`) — a fluid spacing scale (T-shirt sizes 3xs–3xl on
  an 8pt grid by default, plus one-up pairs) and a matching column grid. See
  the **Space & Grid** entry.
- **Foundations** (`#foundations`) — the remaining token layers: corner radii,
  T-shirt-sized border widths, elevation shadows (tint pickable from ANY shade
  of the live palette), and motion. See the **Foundations** entry.
- **Export** (`#export`) — THE export surface for the whole suite: every
  section's LIVE state merged into one CSS / Tailwind 4 / Markdown / DTCG
  file. See the **Unified system export** entry.

A single **viewport range control** at the top of the page drives every fluid
scale (type, space, grid) — see **Shared viewport**. The old per-tool routes
(`/type`, `/space`, `/foundations`, `/export`) survive as redirect stubs that
keep their OG cards and forward any legacy hash to `/?go=<section>#…`.

The repo is still named "color-scale-generator"; the color section is the
original tool and most of this file describes it. The site itself has a dark
mode (see **Site dark mode**).

### Color Scales section

What the color section does, top to bottom:

1. **Generate scales.** Enter one or more base hex colors; each expands into a
   10-step shade ramp (50–900). A fixed bottom bar can simulate color blindness
   (protanopia / deuteranopia / tritanopia / achromatopsia) across the whole page.
2. **Check contrast.** Every unique shade across every scale is paired against
   every other, and combinations meeting at least 3:1 are listed with their
   WCAG level (AAA / AA / AA Large), minimum text size, and a live preview.
3. **Export.** Handled by the Export section (see **Unified system
   export**): **CSS + Dark Mode** (`:root` plus a `prefers-color-scheme:
   dark` block with the ramp inverted), **Tailwind 4.1** `@theme` tokens (in
   **hex / HSL / RGB**), a **Markdown style guide** (a Hex + HSL table per
   color with WCAG text-on-white/black notes), or **W3C Design Tokens (DTCG
   2025.10) JSON** (shaped for Figma's variable importer — one `.json` per
   mode, see **Figma-ready token files**), with one-click copy or download,
   and an optional variable prefix (see **Variable prefix**).
4. **Share.** The whole system lives in the URL hash
   (`#p=<palette>&t=<type>&s=<space>&f=<foundations>`, default segments
   omitted), so editing updates the link live and a shared link reopens the
   exact state. Also autosaved to `localStorage` (written, but not
   auto-restored — the URL or the default wins on load). See the **State
   sharing** glossary entry.

Deployed at <https://tools.myol-creative.com/>. There is no backend — it's a
fully static Astro site with a client-rendered React island.

## Companion docs

- **[PLAN.md](./PLAN.md)** — tracked follow-up work. Read the relevant item
  before starting it; mark items done as they ship.
- **[README.md](./README.md)** — setup, local dev, deploy. <!-- keep in sync -->

Keep CLAUDE.md, PLAN.md, and README.md **in sync with reality**. When a change
makes any of them stale — new surface, new dependency, removed file, changed
command — the doc update is **part of that change, not a follow-up**.

---

## Stack & architecture

- **Astro 7** static site (`output` default = static; Node ≥ 22.12). Config in
  [astro.config.mjs](./astro.config.mjs). Astro 7's default `compressHTML:
  'jsx'` strips whitespace that contains a newline between inline elements in
  `.astro` markup — keep text and an adjacent `<a>`/`<em>` on one line with an
  explicit space (see the redirect stubs); React components are unaffected.
- **React 19** for interactivity, via `@astrojs/react`. The whole suite is ONE
  React island mounted with `client:load` from
  [index.astro](./src/pages/index.astro) → `DesignSystemApp` (plus the small
  `CvdBar` island in the layout).
- **Tailwind CSS 4** via the `@tailwindcss/vite` plugin (no `tailwind.config`
  file — theme is defined in CSS with `@theme`, see
  [src/styles/global.css](./src/styles/global.css)).
- **Prism.js** for syntax-highlighting the exported code block
  (`prism-tomorrow` theme, CSS grammar).
- **PostHog** analytics, initialized inline in
  [src/layouts/Layout.astro](./src/layouts/Layout.astro).
- **Playwright** for end-to-end tests, run in CI via GitHub Actions.
- **TypeScript** throughout (`astro/tsconfigs/strict` — see
  [tsconfig.json](./tsconfig.json)); `typescript` is an explicit devDependency
  because `npx tsc --noEmit` is part of the completion checklist.

No database, no auth, no API. All color math runs in the browser.

### Project layout

```
src/
  pages/
    index.astro           THE page: SiteNav + <DesignSystemApp> + SiteFooter.
    type.astro            Redirect stub (kept for old links + its OG card) → /?go=type + legacy hash.
    space.astro           Redirect stub → /?go=space.
    foundations.astro     Redirect stub → /?go=foundations.
    export.astro          Redirect stub → /?go=export.
  layouts/Layout.astro    HTML shell: meta/OG tags (per-page title/description/path/image), PostHog, bg pattern, CVD SVG filters + CvdBar.
  components/
    SiteNav.astro         Sticky top nav; items scroll to sections via JS (never #hash nav — the hash is state) + IntersectionObserver current-section highlight (aria-current).
    SiteFooter.astro      Shared footer (the author credit link).
    DesignSystemApp.tsx   THE island. Owns ALL state (scales/type/space/grid/foundations), the shared viewport control, the combined hash sync + per-key autosaves, the restore banner, and the /?go= scroll. Composes the five sections.
    ColorSection.tsx      Color section (was App.tsx). Handlers over the passed-down setScales; exports ScaleState/defaultScales/scalesFromEntries.
    ColorInput.tsx        Hex text field + native color picker for one scale. Validates #RRGGBB.
    ShadeRamp.tsx         Renders the 10 swatches (50–900) for one base color (renamed from ColorScale.tsx — collided with the ColorScale type).
    ContrastChecker.tsx   Pick-a-background → legible-foregrounds cards; the whole grid copies as one SVG.
    TypeSection.tsx       Type section (was TypeScale.tsx). Fonts FIRST (presets incl. Google Fonts + custom stylesheet URL, preview <link> management), then scale controls + preview (specimen renders in the chosen heading stack).
    SpaceSection.tsx      Space & Grid section (was SpaceScale.tsx). Base sizes + size table + pairs + grid; no viewport fields (shared control).
    FoundationsSection.tsx Foundations section (was Foundations.tsx). Radii/borders/elevation/motion; shadow tint pickable from every shade of the live palette prop.
    ExportSection.tsx     Export section (was SystemExport.tsx). Renders the one ExportBlock from the LIVE SystemState prop — no localStorage indirection.
    ExportBlock.tsx       The shared export panel (format select, scoped Prism highlight, Copy Code + Download, optional prefix field, plus `notice`/`actions` slots the tokens format fills). Controls share CONTROL_CLASS so the selects and the prefix input line up.
    Field.tsx             The shared labeled number input (was triplicated across sections).
    CvdBar.tsx            Fixed bottom bar; toggles a page-wide color-blindness SVG filter.
  hooks/
    useHashSync.ts        URL-hash persistence (mount read → hydrated gate → replaceState live-sync; decode owns URI-decoding) + useAutosave (write-on-change localStorage). Used by DesignSystemApp.
    useCopied.ts          Shared copied!-feedback state with the reset timer.
  utils/
    colorUtils.ts         All color math + shared types, the SVG-export builders, and the four color export formats (paletteShadeData/paletteCss/paletteTailwind/paletteMarkdown/paletteTokens). The one place color logic lives.
    typeScale.ts          Fluid type-scale math + font stacks (FONT_STACKS system presets, GOOGLE_FONTS, weights, fontCssUrl + fontImports/googleFontsUrl): step sizes + clamp() builder + named ratios + CSS/Tailwind/Tokens emitters. Exports clampFor/pxToRem/round/withPrefix/remDimension (shared with the other engines).
    spaceScale.ts         Fluid space + grid math: T-shirt sizes + one-up pairs + column/grid calc + CSS/Tailwind/Tokens emitters. Reuses typeScale's clampFor. The one place space/grid logic lives.
    foundations.ts        Radii/borders/elevation/motion math + CSS/Tailwind/Tokens emitters. The one place foundations logic lives.
    systemExport.ts       The whole-system merge (CSS/Tailwind/Markdown/DTCG with hoisted font @imports) + the combined hash codec (encodeSystemHash/decodeSystemHash) + readSavedSystem for the restore banner. Owns the STORAGE_KEYS.
    clipboard.ts          copySvg: writes an SVG to the clipboard as text/plain + image/svg+xml (Figma paste). Shared by ColorSection + ContrastChecker.
    download.ts           downloadAll/downloadText: saves snippets as files via Blob URLs (staggered, so a multi-file token export isn't dropped). Used by ExportBlock.
  styles/
    global.css            Tailwind import + @theme tokens (color ramps, the semantic role layer, fonts, fluid type, spacing) + the dark-mode remap (roles only) + the @font-face block.
    reset.css             CSS reset (imported into the base layer).
  assets/                 SVGs used by the build.
public/                   Static files served as-is: fonts/ (woff2), favicon.svg, og-image.png + per-tool og-type/og-space/og-foundations.png (used by the redirect stubs).
tests/
  smoke.spec.ts           Playwright specs: every section, the nav, the shared viewport, the Figma-ready token files, no-horizontal-scroll at each breakpoint, and the legacy redirects.
  unit/*.test.ts          Engine unit tests on `node --test` — one file per src/utils engine, plus theme.test.ts which parses global.css and pins the chrome's contrast ratios and @font-face weights in both schemes.
```

**`colorUtils.ts` is the engine.** Shade generation, hex/RGB/HSL/OKLCH
conversion, and WCAG luminance/contrast all live there as a single exported
`colorUtils` object, plus the shared `ColorScale` / `ColorInfo` types. Add new
color logic here, not inline in components.

#### How shades are generated

`generateShades` works in **OKLCH** (a perceptual color space) so steps are
visually even and hue stays stable across the ramp. The base color anchors
**500** (`BASE_INDEX`) and is returned unchanged; lighter shades (50–400)
interpolate lightness up toward `LIGHTEST_L`, darker shades (600–900) down toward
`DARKEST_L`, keeping the base's hue. Chroma tapers toward the light/dark ends.
`oklchToHex` does a binary-search **gamut map** — when a target is outside sRGB
it lowers chroma (preserving hue + lightness) rather than clamping channels,
which would shift the hue. So the base hex you enter is always the `500` swatch,
and the ramp is monotonic in lightness for any input.

#### Contrast table

`ContrastChecker` flattens every scale's shades, dedupes by hex, then compares
every unique pair (O(n²)). Pairs scoring ≥ 3:1 are kept and sorted high-to-low.
Thresholds: **AAA ≥ 7**, **AA ≥ 4.5**, **AA Large ≥ 3.1**.

---

## Coding conventions

- **TypeScript strict.** No `any` / `@ts-ignore` without a same-line written
  justification. The build fails on type errors; don't paper over them.
- **Color/contrast logic lives in [colorUtils.ts](./src/utils/colorUtils.ts).**
  Don't reimplement hex parsing, mixing, or contrast math inside a component —
  import it. If a value or helper is reused, lift it into `colorUtils`.
- **Tailwind 4, CSS-first.** Design tokens (colors like `cream-*`, `black-*`,
  `yellow-*`; fluid type `text-step-*`; spacing `2xs`/`s`/`xl`; fonts) are
  defined in [global.css](./src/styles/global.css) under `@theme`. Use the
  existing tokens; add a new one to `@theme` before using it rather than
  hardcoding hex/px inline. There is **no `tailwind.config` file** — don't add
  one to define theme values.
- **No comments unless the WHY is non-obvious** — a hidden constraint or a
  surprising workaround. Don't explain WHAT the code does. No `TODO`s without an
  owner.
- **Single responsibility.** One React component per file, default-exported.
  Keep state ownership in `DesignSystemApp.tsx`; the section components stay
  presentational-ish and receive their slice of state (plus a setter/onChange)
  as props.
- **Naming:** PascalCase components/types (and component file names, matching
  the existing files), camelCase functions/variables, SCREAMING_SNAKE for
  constants. Descriptive names; no obscure abbreviations.
- **No dead code.** No commented-out blocks or scaffolding for unagreed
  features. Prefer deletion over deprecation.
- **No emojis in code or commit messages** unless explicitly asked. (The
  decorative emoji *entities* in the section components' headings are existing
  user-facing copy — leave them unless asked to change the copy.)

## Dependency policy

Keep dependencies minimal. **Do not add libraries** unless the task explicitly
requires them — justify any new dependency in your message *before* installing.
The whole tool runs on hand-written color math with no color library on purpose.

Current dependencies and why:

- `astro`, `@astrojs/react`, `react`, `react-dom` — framework + interactive island.
- `tailwindcss`, `@tailwindcss/vite` — styling.
- `prismjs` (`@types/prismjs`) — syntax highlighting in the export block.
- `posthog-js` — product analytics.
- `@playwright/test` — end-to-end tests.
- `typescript` — the strict type check (`npx tsc --noEmit`); Astro no longer
  pulls it in transitively.

---

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start Astro dev server at `http://localhost:4321`. |
| `npm run build` | Static production build. |
| `npm run preview` | Serve the built output locally. |
| `npm test` | Unit tests then e2e. |
| `npm run test:unit` | Engine unit tests on Node's built-in runner (no browser, ~0.2s). |
| `npm run test:e2e` | The Playwright suite (auto-starts `npm run dev -- --ignore-lock`, or reuses a server already on 4321). |

There is **no separate lint script.** Note `astro build` transpiles WITHOUT
type-checking (esbuild strips types) — run `npx tsc --noEmit` for the strict
check; both must pass before a change is complete.

Astro 7's `astro dev` is a **managed server**: it writes a lock file
(`.astro/dev.json`) and, when it detects an AI-agent environment, daemonizes
itself (`astro dev status` / `logs` / `stop`). That is why the Playwright
`webServer` command passes `--ignore-lock` — it keeps the harness-owned server
in the foreground and independent of any dev server the user is running.

---

## Testing

- **Two suites, two runners.** `tests/unit/*.test.ts` are engine unit tests on
  Node's built-in runner (`node --test`); `tests/*.spec.ts` are Playwright
  browser specs. Playwright's `testMatch` is pinned to `**/*.spec.ts` so it
  never tries to run the unit files. **Adding a test runner as a dependency
  isn't necessary** — Node strips the TypeScript itself. That is also why the
  engines import each other with explicit `.ts` extensions
  (`allowImportingTsExtensions` in [tsconfig.json](./tsconfig.json)): without
  them Node can't resolve the imports, though Vite/Astro are fine either way.
- **Unit-test the engines, not the components.** The math and the codecs live
  in `src/utils/*` as pure functions — test them directly there (ramp
  endpoints, contrast tiers, hash round-trips and their legacy formats, the
  Figma token shaping) rather than driving a browser to reach them.
- **Playwright e2e** under [tests/](./tests/), configured in
  [playwright.config.ts](./playwright.config.ts). The config starts the dev
  server automatically and runs chromium/firefox/webkit.
- [tests/smoke.spec.ts](./tests/smoke.spec.ts) is the suite: every section,
  the nav, the shared viewport, exports, and the legacy redirects. Extend it
  (or add sibling specs) with assertions on actual behavior — scale
  generation, the contrast table, format switching, copy-to-clipboard.
- **Test feature behavior, not just that the page loads.** For color math,
  cover `colorUtils` directly (shade ramp endpoints, contrast thresholds at
  3.1/4.5/7, hex/HSL/RGB conversion).
- Tests must pass before a change is considered complete; CI
  ([.github/workflows/playwright.yml](./.github/workflows/playwright.yml)) runs
  them on every push/PR to `main`.

## Design system & UX standards

- **Pull colors, type, and spacing from the `@theme` tokens** in
  [global.css](./src/styles/global.css) rather than inventing inline values. If
  a value isn't there, add it to `@theme` first, then use it — and never reach
  for a framework default (Tailwind's `green-*`, `red-700`) that the palette
  doesn't own, because the dark remap then has to patch someone else's values.
- **Reach for a semantic role before a ramp step** when the color means
  something: `bg-success-soft`, `text-notice`, `hover:bg-danger`,
  `bg-tier-aaa`, `bg-accent`. The ramps (`black-*`, `cream-*`, `blue-*`,
  `yellow-*`, `green-*`, `red-*`) are the raw palette, and a literal step is
  right for surfaces and chrome; a *state* should say what it is. See
  **Semantic color roles**.
- **The site has a dark mode** implemented purely as a token remap under
  `prefers-color-scheme: dark` in global.css (see **Site dark mode** in the
  glossary). New UI must work in both themes: pair tokens that flip together
  (`bg-black-500` + `text-cream-100`), and use the static `code-*` /
  `preview-*` tokens for surfaces that must not flip.
- **This tool is itself an accessibility utility — hold its own UI to a high
  bar.** Target WCAG AAA contrast (7:1 normal text, 4.5:1 large) for the app's
  own chrome, and 3:1 for non-text UI (focus rings, control borders) per WCAG
  2.1 SC 1.4.11. Verify pairs; don't eyeball them — and verify **both
  schemes**, since a token that flips can pass in one and fail in the other.
  Compute with the app's own engine (`colorUtils.getContrastRatio`); the
  theme pairs are pinned in
  [tests/unit/theme.test.ts](./tests/unit/theme.test.ts).
- **Accessibility beyond contrast:** semantic HTML first, ARIA only when needed.
  Every form control has a label (note `ColorInput` uses an `sr-only` label and
  the selects in `ExportBlock` use `htmlFor`). Keyboard navigation and visible
  focus on every interactive element; the contrast table is scrollable via
  `tabIndex`.
- **Mobile-first / responsive.** Layout already switches at `sm:`/`md:`
  breakpoints and type is fluid (`clamp`-based `text-step-*`). Test at
  representative widths before calling a change done.

---

## Git & workflow

> ### ⚠ Never work on `main`.
>
> **Before the first file edit of any task, run `git branch --show-current`.**
> If it returns `main`, create a branch *before* the first edit:
>
> ```
> git fetch origin
> git checkout -b <type>/<short-name> origin/main
> ```

- **Branch fresh, don't reuse.** Cut each task branch from `origin/main`. Prefer
  `fetch` over `pull`. One branch per logical change; one PR per branch. This
  repo's history shows the convention clearly (e.g. `chore/updatePackages`,
  `style/layoutFix`, `fix/acsb`).
- **Branch naming:** semantic prefix + kebab-case slug, slash-separated:
  - `feature/` — new functionality
  - `fix/` — bug fixes
  - `chore/` — maintenance, deps, config, docs
  - `refactor/` — restructuring with no behavior change
  - `style/` — visual polish, no behavior change
  - `test/` — adding or improving tests
- **Commits:** small, focused, conventional prefix (`feat:`, `fix:`,
  `refactor:`, `chore:`, `style:`, `docs:`). The *why* in the body when it isn't
  obvious. Always create new commits — never amend pushed commits.
- **No AI attribution.** Never add `Co-Authored-By` or any AI-attribution
  trailer. Commits are authored solely by the user's git config.
- **Don't push or merge to `main` yourself.** After checks pass, stage and
  commit. The user reviews and opens the PR (the workflow here is PR-based —
  merged via GitHub pull requests).
- **Surface the PR description in chat when a branch is ready** — full Summary +
  Test plan, ready to paste.
- **Confirm before destructive ops** (`reset --hard`, force-push, `branch -D`,
  `clean -f`, `--no-verify`). Read-only investigation never needs confirmation.

## Deploy

The site is static and published at <https://tools.myol-creative.com/>. Deploys
track `main` (merge the PR → production rebuilds). After a deploy, sanity-check
the live page reflects the merged commit before calling anything fixed.

---

## Domain glossary

- **Scale** — one base color and the 10 shades derived from it. The app supports
  multiple scales at once; each has a numeric `id`, a base `color`, and a
  `name`. The `name` is **auto-derived from the hue** (`colorUtils.nameFromHex`,
  e.g. blue) until the user edits it, after which it's left alone (tracked by
  `nameEdited` on `ColorSection`'s exported `ScaleState`, *not* on the shared
  `ColorScale` type).
  **Array order is the export/contrast order** — up/down buttons reorder it.
  Scales can be bulk-created by pasting a hex list (`colorUtils.parseHexList`),
  and each scale's ramp can be copied as a labeled-swatch SVG
  (`colorUtils.scaleToSvg`), so it pastes into Figma (or any vector tool) as
  named, editable rectangles — each group carries `id="<slug>-<shade>"`
  (e.g. `blue-500`), which Figma reads as the layer name on import. The whole
  palette can also be copied at once (`colorUtils.paletteToSvg`, the **Copy
  palette SVG** button by the share link) — one row per scale, stacked in array
  order. Both share `colorUtils.swatchRowSvg`. The whole contrast-checker grid
  copies too (`colorUtils.contrastGridToSvg` → `pairCardSvg` cells — every
  passing pairing in the same 3-column grid, grouped under a tier header and
  each card badged with its level, group `id="<fg>-on-<bg>"`). The shared
  `clipboard.copySvg` helper writes the markup under **both** `text/plain` and
  `image/svg+xml` in one `ClipboardItem` (Figma-in-browser pastes the SVG from
  `text/plain` on canvas; the desktop app / other tools read the
  `image/svg+xml` blob), falling back to plain text where `ClipboardItem` is
  unavailable.
- **Slug** — the export-safe form of a scale's `name`
  (`colorUtils.slugify`), de-duped across scales by `colorUtils.uniqueSlugs`
  (collisions get `-2`, `-3`…). Exported variables are `--<slug>-<shade>`
  (CSS / Tailwind 4). The export builders and
  [ContrastChecker](./src/components/ContrastChecker.tsx) labels both go
  through `uniqueSlugs` so naming stays consistent. (This replaced the old positional
  `color1`/`color2` naming.) The Markdown export uses the human `name`
  (capitalized) for section headings rather than the slug. When de-duping
  renames a scale, its name input shows the resolved slug (e.g. `blue-2`) while
  idle (via `ColorInput`'s `exportSlug` prop) so the real exported name is
  visible; focusing the field reveals the editable name and selects it, so a
  rename starts fresh instead of inheriting the `-2`.
- **Shade** — one step on a scale, keyed by `shadeNumbers` `50 100 200 300 400
  500 600 700 800 900`. **500 is the unmodified base color.** The ramp is built
  in OKLCH: lighter shades step the lightness up, darker shades step it down,
  holding the base's hue (see "How shades are generated").
- **Contrast picker** — [ContrastChecker](./src/components/ContrastChecker.tsx)
  is a *pick-a-background → legible-foregrounds* flow (not a full pairings
  table). Results are the shades scoring ≥3:1 against the chosen background,
  grouped by tier. Contrast is symmetric, so foreground/background only matters
  for the preview, not the ratio. A **Copy grid SVG** button (in the
  chosen-background header) copies the entire result grid as one SVG
  (`colorUtils.contrastGridToSvg`) for pasting into Figma — same layout,
  tier-grouped, each card badged with its level (the AA Large cards use the
  larger/bold sample to match the on-screen preview).
- **Contrast levels** — `AAA` (≥7:1), `AA` (≥4.5:1), `AA Large` (≥3.1:1). The
  table only lists pairs ≥3:1; anything lower is dropped, not shown as "Fail".
- **Vision simulation (CVD)** — the fixed bottom bar
  ([CvdBar](./src/components/CvdBar.tsx), a `client:load` island in
  [Layout](./src/layouts/Layout.astro)) simulates color blindness **page-wide**.
  It toggles a `cvd-<mode>` class on `<body>`; a global (`is:global`) CSS rule
  then applies the matching SVG `feColorMatrix` filter (defined in the Layout) to
  `main` + `footer`. The bar is a sibling of those, so it stays unfiltered.
  Modes: `protanopia`, `deuteranopia`, `tritanopia`, `achromatopsia` — one active
  at a time; re-clicking the active one (or "Reset to full color") clears it.
  There's no "normal" option — that's just the unfiltered default.
- **Format vs. color format** — *format* is the output syntax (`css`,
  `tailwind4`, `markdown`, `tokens`; `css` is the default); *color format* is
  the value encoding (`hex`, `hsl`, `rgb`). Independent selectors in
  `ExportSection`/`ExportBlock`,
  except the color format is hidden for the fixed-value formats (`markdown` →
  Hex + HSL table; `tokens` → a fixed DTCG color object). Those two build from
  raw-hex shade data, not the `convertColor` pipeline the code formats use.
  `tokens` emits W3C Design Tokens (**DTCG 2025.10**), keyed by the de-duped
  slug: each `$value` is a color *object*
  (`colorUtils.hexToDtcgColor` → `{ colorSpace: 'srgb', components, alpha, hex }`,
  components normalized 0..1 at 6 decimals), which is what Figma's native
  variables importer expects — a bare hex string is the old style and no longer
  imports. The Prism language switches
  `css` / `markdown` / `json` by format (the CSS and Tailwind formats use `css`).
- **Fluid values as tokens** — DTCG 2025.10 requires a `dimension` `$value` to
  be an **object**, `{ value: <number>, unit: 'px' | 'rem' }` — never a string.
  A `clamp()` therefore has no representation as a dimension token (one number,
  one unit), and Figma variables have no viewport concept to bind it to either.
  So the Type and Space tools' `toTokens` flatten each fluid value to its two
  viewport anchors under top-level **`min`** and **`max`** groups — mirroring
  the color tool's `light`/`dark` groups — which `systemTokenFiles` then
  splits into one file per Figma mode (see **Figma-ready token files**).
  `typeScale.remDimension(px)` (+ the `DimensionToken` type) builds the
  object and is shared by both engines; `grid.columns` stays `$type: 'number'`,
  which is already spec-valid. The `clamp()` strings live only in the CSS and
  Tailwind formats, which is where they're actually consumable.
- **Figma-ready token files** — Figma imports **one JSON file per variable
  mode** ("Import mode" on a mode column), so a single merged file can only
  ever land as nested groups inside one mode. `systemExport.systemTokenFiles`
  therefore splits the merged tree by top-level group into one file each:
  `light` / `dark` (Color), `min` / `max` (Scale), and everything left over —
  radius, border, font, motion, or the prefix group wrapping them — as
  `static` (Base). `systemTokensBundle` joins them for the on-screen preview
  with `// ===== <file> =====` separators, so the preview is deliberately
  **not** valid JSON on its own; each file is.
  The importer also takes only part of DTCG, so `figmaReady` reshapes the
  tree before splitting: `dimension` rem → **px** (×16), `duration` ms →
  **s**, `fontFamily` array → **the leading family only**. Figma has no
  variable type for `shadow` or `cubicBezier` (`FIGMA_UNSUPPORTED`), so those
  are dropped, along with any group left empty by the pruning. The CSS and
  Tailwind formats keep the rem/ms/full-stack values — this shaping is for
  the token format alone, which is documented as the Figma-targeted one.
  What's dropped is carried into Figma by **Copy for Figma** instead
  (`foundations.foundationsToSvg` → `clipboard.copySvg`): the five elevation
  levels per mode drawn on their own surface with the shadows as stacked
  `<feDropShadow>` primitives (Figma imports those as drop-shadow effects, so
  "Create style from selection" makes a matching effect style), plus the
  three easing curves plotted with their `cubic-bezier()` values. Layers are
  `id`-named to match the tokens (`elevation-3-dark`, `ease-standard`).
- **Snippet download** — the export block pairs **Copy Code** with a
  **Download** button driven by a `files` prop (`download.ts`'s
  `DownloadFile[]`; a Blob URL + synthetic `<a download>`, no backend). The
  CSS / Tailwind / Markdown formats pass one `design-system-<format>.txt`;
  `tokens` passes the whole per-mode set and the button reads **Download N
  files** (`downloadAll` staggers them — browsers drop downloads fired in a
  tight loop, and Chrome asks once to allow multiple). Token files are
  `.json` with an `application/json` blob type, because Figma's importer
  filters its file picker to `.json` (this reverses the earlier `.txt`-only
  decision from issue #46, which predated the Figma-targeted shaping).
- **Dark mode in exports** — the dark ramp is the light ramp **mirrored**
  (`colorUtils.mirrorHexes` — 50↔900, 100↔800, …), so light tints become dark
  and vice versa, keeping hue/chroma. Where each format puts it: `cssDark` →
  `:root` plus a `@media (prefers-color-scheme: dark) { :root { … } }` override;
  `tailwind4` → `@theme { … }` plus a `.dark { … }` override (class-based dark
  variant); `markdown` → a **Dark** column in the per-color table; `tokens` →
  top-level `light` and `dark` groups, each `{ slug: { shade: { $type, $value } } }`.
- **Single-page architecture** — the suite is ONE route (`/`) and ONE React
  island ([DesignSystemApp](./src/components/DesignSystemApp.tsx)) that owns
  every section's state and composes the five sections (`#colors`, `#type`,
  `#space`, `#foundations`, `#export` — each a `scroll-mt-2xl` wrapper div).
  The sticky [SiteNav](./src/components/SiteNav.astro) scrolls to sections
  with JS (`scrollIntoView`) — NEVER by setting `location.hash`, which
  carries the design-system state — and highlights the current section via
  IntersectionObserver (`aria-current` + a scoped CSS rule). The old routes
  (`/type`, `/space`, `/foundations`, `/export`) are redirect stubs
  (`location.replace('/?go=<section>' + location.hash)`) that keep their OG
  cards for old social shares; the island scrolls to `?go=` on mount and
  strips the query.
- **State sharing** — the whole system serializes into one URL hash of
  &-joined segments, `#p=<palette>&t=<type>&s=<space>&f=<foundations>`
  (`systemExport.encodeSystemHash`/`decodeSystemHash`; segment keys match the
  old per-page prefixes so legacy single-tool links parse as one-segment
  hashes; segments equal to the default encoding are omitted). Segment values
  never contain a raw `&`: palette names are slugified, type stacks/URL are
  URI-encoded, the rest are numeric — and `useHashSync` passes the raw hash
  to `decode` (URI-decoding is the decoder's job, per segment). The palette
  segment is `name:hex,…` (`colorUtils.encodePalette`/`decodePalette`). The
  `useHashSync` hook does mount read → `hydrated` ref gate → `replaceState`
  live-sync, and **writes nothing until the value actually changes** (a
  `lastSynced` baseline seeded on mount): a mount-time `replaceState` would
  abort an in-flight nav click — so a fresh page keeps a clean URL until the
  first edit. Each section also autosaves under its own localStorage key
  (`useAutosave` + `systemExport.STORAGE_KEYS`, same write-on-change
  semantics); the autosave is **not** auto-restored, but when a previous
  session's save differs from the defaults and the URL carries no state, a
  banner offers to restore the whole system (`readSavedSystem`, read in a
  lazy initializer). Shared scales load with `nameEdited: false` (the shared
  name is shown, but recoloring re-derives it from the hue until the
  recipient types one). Malformed segments are dropped; if nothing valid
  decodes, the defaults load.
- **Type Scale** — the type section
  ([TypeSection](./src/components/TypeSection.tsx) at `#type`). Math lives in
  [typeScale.ts](./src/utils/typeScale.ts) (the engine, mirroring
  `colorUtils`): `generateTypeScale(config)` builds each step
  (`size = fontSize × ratio^step` at each viewport), `toCss` emits the `:root`
  block of `--step-N: clamp(...)` custom properties, and `clampFor` builds the
  Utopia-style `clamp(min, intercept + slopeVw, max)` (slope/intercept of the
  line through the two viewport anchors; px→rem at 16px). `NAMED_RATIOS` /
  `ratioName` back the modular-scale picker (Minor Third, etc.). The section
  is controlled (`TypeScaleConfig` + onChange from `DesignSystemApp`; the
  viewport anchors come from the **shared viewport** control) and has a
  preview-viewport slider that renders each step at its interpolated px size
  (`sizeAtViewport`) **in the chosen heading stack**. The slider's draggable
  handle is a device icon (`deviceForWidth`: mobile <768, tablet <1024,
  laptop ≥1024) — a transparent native range input over a custom thick track,
  with the icon overlaid at the value position (so it stays
  accessible/keyboard-operable). Output matches utopia.fyi for the same
  inputs. **Fonts come FIRST** (pick families before sizing them):
  heading/body/mono stacks picked from `FONT_STACKS` (curated
  modernfontstacks.com system stacks, zero-download), `GOOGLE_FONTS` (a
  curated list; the preset select groups the two), or free text — plus fixed
  regular/medium/bold weights and an optional **custom font stylesheet URL**
  (`fontCssUrl`) for self-hosted fonts. Google families in use (detected by a
  stack's LEADING family, `googleFamiliesIn`) and the custom URL are loaded
  as `<link>` tags for the live preview (`syncStylesheet`) and emitted as
  `@import` lines in the CSS/Tailwind exports (`fontImports`, hoisted to the
  top of the merged file — `@import` must precede all other rules); DTCG has
  no URL representation, so tokens carry only the `fontFamily` arrays. Engine
  emitters (consumed by the Export section): `toCss` (`--step-N` clamps +
  `--font-*` stacks/weights), `toTailwind` (`--text-step-N` + `--font-*`
  utilities), `typeTokensObject` (DTCG `font-size` dimensions under
  `min`/`max` — see **Fluid values as tokens** — plus a static `font` group
  of `fontFamily`/`fontWeight`). The config serializes to the `t=` segment
  (`encodeConfig` / `decodeConfig`: eight comma-joined numbers, then the
  three URI-encoded stacks and the URL pipe-appended; numbers-only and
  three-stack legacy links still decode with defaults for the missing
  parts).
- **Shared viewport** — ONE viewport range control (min/max, at the top of
  the page) drives every fluid scale. The anchors still live inside
  `TypeScaleConfig`, `SpaceConfig`, and `GridConfig` (the engines and the
  serialized segments need them there) but are only ever written together by
  `DesignSystemApp.setViewport`, so they can't drift. On hash/autosave load,
  `snapshotFromParts` unifies them (a type segment's anchors win, then
  space's) — a legacy single-tool link therefore sets the viewport for the
  whole page. The type/space sections show the current anchors in their
  legends/labels (`At max viewport (1440px)`, `Base size @max (1440px)`) but
  have no viewport inputs of their own.
- **Space & Grid** — the space section
  ([SpaceSection](./src/components/SpaceSection.tsx) at `#space`). Math lives
  in [spaceScale.ts](./src/utils/spaceScale.ts), which
  **reuses `typeScale`'s `clampFor`/`pxToRem`/`round`** so all the fluid math is
  in one place. **Sizes:** `SPACE_SIZES` is the T-shirt ladder (3xs–3xl) with
  multipliers 0.25–6; `generateSpaceSizes` = `base × multiplier`, fluid between
  the viewports. With the default `@min` base 16 the ramp is a clean 4/8pt grid
  (4 8 12 16 24 32 48 64 96); `@max` base 20 makes it fluid. **Pairs:**
  `generateSpacePairs` are one-up steps (3xs-2xs, …) that clamp from size N's
  `@min` to size N+1's `@max`. **Grid:** `columnWidth = (container − (cols+1)
  gutters) / cols` (one gutter of inline padding each side + between columns);
  `computeGrid` returns the `@min`/`@max` container/gutter/column, with optional
  `@min`-column rounding (up/down). `gutterClampFor` is the fluid gutter.
  **Engine emitters** (consumed by the Export section): `toCss` → `--space-*`
  + the grid `:root` plus `.u-container`/`.u-grid` (all prefix-aware);
  `toTailwind` → `@theme` with `--spacing-*`; `spaceTokensObject` → DTCG
  under `space`/`grid` groups, see **Fluid values as tokens**. Preview
  swatches/bars use the blue-500 token (not Utopia's pink); size rows show px
  and rem. The config serializes to the `s=` segment
  (`encodeSpaceGrid`/`decodeSpaceGrid`, ten numbers). Output matches
  utopia.fyi for the same inputs.

- **Foundations** — the foundations section
  ([FoundationsSection](./src/components/FoundationsSection.tsx) at
  `#foundations`). Math lives in [foundations.ts](./src/utils/foundations.ts)
  (the engine, mirroring the others). Four sub-sections, each with controls +
  live preview: **corner radii** (`none/sm/md/lg/xl/full` multipliers off a
  base, `full` = 9999px), **border widths** (a T-shirt ladder off a base —
  `BORDER_LADDER` `s/m/l/xl/2xl/3xl/4xl` — with a `borderSteps` control for
  how many sizes the system ships), **elevation** (5 levels, each a key +
  ambient shadow pair; fixed geometry, opacity scaled by one shared intensity
  control, and **a shadow color per color mode** — `shadowColor` for light,
  `shadowColorDark` for dark — each pickable from **EVERY shade of every live
  scale** (the `palette` prop from `DesignSystemApp` — one swatch row per
  scale, all 10 shades, plus black and a native picker). The two tints are
  independent (both default to black, so a system that wants one tint just
  sets both the same); the section lays each mode's picker directly above the
  fixed `preview-*` panel it drives, two columns from `lg:` and stacked
  below. The dark variant also raises opacity ×1.8 — shadows need more
  contrast on dark surfaces), and **motion** (fast/base/slow durations +
  standard/decelerate/accelerate cubic-bezier easings, laid out as three
  cards with replayable previews). Engine emitters (consumed by the Export
  section): `toCss` (`:root` plus a dark elevation override), `toTailwind`
  (`@theme` using real TW4 namespaces — `--radius-*`, `--shadow-*`,
  `--ease-*` — plus a `.dark` elevation block), `foundationsTokensObject`
  (DTCG: px dimensions, `shadow` composites under `light`/`dark`,
  `duration`/`cubicBezier`). Config serializes to the `f=` segment
  (`encodeFoundations`/`decodeFoundations`, nine pipe-separated parts — seven
  numbers, the light shadow hex, then the dark one). Both older formats still
  decode, and since neither had a dark tint it falls back to the light hex so
  those links render exactly as they used to: the 8-part format (one hex) and
  the legacy 10-part one that carried font stacks.
- **Unified system export** — THE export surface, the last section
  ([ExportSection.tsx](./src/components/ExportSection.tsx) over
  [systemExport.ts](./src/utils/systemExport.ts)); no other section has an
  export block. Merges the **live state of every section** (the `SystemState`
  prop from `DesignSystemApp` — no localStorage indirection; edits above show
  up instantly) into one CSS block, Tailwind `@theme`, Markdown style guide
  (colors only), or a set of DTCG files
  (`systemCss`/`systemTailwind`/`systemMarkdown`/`systemTokenFiles`; the CSS
  and Tailwind builders hoist the type engine's font `@import`s to the top of
  the file). The code formats take the hex/HSL/RGB color-format selector.
  **Token mode strategy:** `mergeGroups` deep-merges the per-engine token
  objects one group level deep, so e.g. color's `light` and elevation's
  `light` share one group (and prefix groups merge instead of clobbering).
  Top-level `light`/`dark` hold the theme-dependent layers, `min`/`max` the
  viewport-dependent ones, and the static layers (radius, border, font,
  motion) sit alongside them — then `systemTokenFiles` splits that tree into
  one file per Figma mode, because the importer takes one file at a time (see
  **Figma-ready token files**).
- **Variable prefix** — the export block has an optional prefix field
  (sanitized slug-safe in `ExportBlock`). CSS/Tailwind prepend it to the
  variable namespace (`--brand-blue-500`, `--text-brand-step-0`,
  `--spacing-brand-s`, `--radius-brand-md`); the DTCG format nests a
  `<prefix>` group inside each mode group (paths like
  `light.brand.blue.500`). Engines take it as a trailing `prefix` param
  (`typeScale.withPrefix` builds the `brand-` fragment); the Markdown style
  guide ignores it.
- **Site dark mode** — a `prefers-color-scheme: dark` block in
  [global.css](./src/styles/global.css) remaps the theme tokens: cream
  surfaces go dark, the black ink ramp goes light (so `bg-black-500` +
  `text-cream-100` pairings invert together), yellow darkens to keep its
  light-text pairings legible, and the badge/feedback accents
  (`green-200/600/800`, `blue-100`, `red-700`) get dark-legible overrides.
  **Static tokens that never flip:** `accent`/`accent-ink` (see below), the
  brand `blue-*` ramp, `red-50/500`, `code-bg`/`code-fg` (the export
  terminal), and the `preview-*` panels (the elevation preview needs an
  always-light and an always-dark surface). No `.dark` class, no toggle — the
  OS preference decides, so **both schemes are live for real visitors even
  though there's no in-app switch**. CVD filters apply on top unchanged.
- **Interaction accent** — `--color-accent` (`#FFDA47`, the favicon's yellow)
  with `--color-accent-ink` (`#060404`) is the highlight behind a hovered or
  active control: the Copy/Download buttons, the CVD bar's active mode, the
  preview slider's fill. Both are **static on purpose**. The pair used to be
  `bg-yellow-500` + `text-black-500`, and since both of those flip, the
  hovered buttons landed at 3.06:1 in dark mode. Pinning the pair keeps the
  highlight reading as a highlight in both schemes at 14.97:1, and makes the
  brand yellow one fixed value rather than a ramp step. The `yellow-*` ramp
  is still the ramp — badges and fills use it.
  The **focus ring is `blue-600`**, not `blue-500`: `blue-500` only managed
  2.96:1 on `cream-100` in light mode, under WCAG 2.1 SC 1.4.11's 3:1 for
  non-text UI. `blue-600` is the one step that clears it in both schemes
  (4.51 light / 3.93 dark). [tests/unit/theme.test.ts](./tests/unit/theme.test.ts)
  parses `global.css` and holds these ratios, so a token edit that breaks
  them fails the unit suite.
- **Typography** — body is **Ubuntu Mono**, headings are **Roboto Condensed**
  at weight 900. Ubuntu Mono ships as two *static* files declared under one
  `UbuntuMono` family at their real weights (400 and 700), so `font-bold`
  picks the Bold file. They were previously declared `font-weight: 100 900`
  each, which tells the browser a single face covers the range and suppresses
  synthetic bolding — every `font-bold` in body copy rendered at regular
  weight. Roboto Condensed genuinely *is* variable, so its range is accurate.
  Tailwind's `--font-mono` is pointed at `UbuntuMono` too, so the `font-mono`
  utility matches the body instead of falling through to the system stack.
  All three faces are **`.woff2`** in [public/fonts/](./public/fonts/) (735KB
  of TTF became 329KB). There's no conversion step in the build — the files
  are converted once and committed, so nothing is added to `package.json`;
  re-convert with `fontTools` in a throwaway venv if a face is ever replaced.
- **Semantic color roles** — the `@theme` ramps are the palette; a second
  layer names the *job* a color does, so a component says what it means and
  each scheme's value is decided in one place instead of inside a class
  string. `success` / `success-soft` / `success-line` (the Copied! chip),
  `danger` / `danger-ink` (the destructive hover fill, static), `notice`
  (warning body text), and `tier-aaa` / `tier-aa` / `tier-aa-large` (the
  contrast badges, which ride a flipping fill so their `text-black-400` can
  stay put). Only these roles are remapped for dark — the green/blue/red
  ramps behind them are static, so a role just points at a different step.
  **Green is the project's own ramp** (`generateShades('#2E9E5B')`, the same
  dogfooding as blue): the feedback states used to borrow Tailwind's default
  green, which meant the palette didn't own its most common state and the
  dark block had to patch a framework's values. Every pair is pinned at AAA
  (3:1 for lines) in both schemes by
  [tests/unit/theme.test.ts](./tests/unit/theme.test.ts) — **add a role there
  when you add one here.**

---

## Rules for Claude (summary)

- Do NOT add features, services, or dependencies not asked for. No color
  libraries — the math is intentionally hand-written in `colorUtils.ts`.
- Keep all color/contrast logic in `colorUtils.ts`; keep section components
  presentational with state owned by `DesignSystemApp.tsx`.
- Use existing `@theme` tokens; add to `@theme` before hardcoding values. No
  `tailwind.config` file.
- Always create a new branch; never work on `main`.
- Run `npm run build`, `npx tsc --noEmit` (the build does NOT type-check), and
  `npm test` (unit + e2e) before calling a change complete.
- **Never start, restart, or kill the user's dev server** (and never
  `taskkill node.exe`) to take screenshots or for any other reason, unless the
  user asks or grants permission. The user runs their own dev server — rely on
  them for visual feedback; describe the change and ask them to confirm.
- Never add AI co-author trailers.
- Commit after checks pass, but never push — the user opens the PR after review.
- When in doubt about architecture, re-read this file.
