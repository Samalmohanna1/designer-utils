# CLAUDE.md

Project context and working rules for Claude Code in this repo. This file is
the source of truth for how to work on this codebase. Re-read it when in doubt
about architecture or conventions.

---

## What this is

**Designer Utils** (MYOL Creative tools suite) — a small set of designer/dev
tools, each its own route, linked by a shared top nav ([SiteNav](./src/components/SiteNav.astro)):

- **Color Scales** (`/`, the original tool) — build color scales, check WCAG
  contrast, export code, copy swatches to Figma. The bulk of this doc.
- **Type Scales** (`/type`) — a fluid type-scale calculator: set min/max
  viewport, font size, and modular-scale ratio, preview every step, and copy a
  `:root` block of `clamp()` custom properties. See the **Type Scale** entry.
- **Space & Grid** (`/space`) — a fluid spacing scale (T-shirt sizes 3xs–3xl on
  an 8pt grid by default, plus one-up pairs) and a matching column grid, both
  interpolating between min/max viewport via `clamp()`. See the **Space & Grid**
  entry.
- **Foundations** (`/foundations`) — the remaining token layers: corner radii,
  T-shirt-sized border widths, elevation shadows, and motion. (Font stacks
  live with the Type tool.) See the **Foundations** entry.
- **Export** (`/export`) — THE export surface for the whole suite: every
  tool's latest saved state merged into one CSS / Tailwind 4 / Markdown /
  DTCG file. The individual tools have no export blocks of their own. See
  the **Unified system export** entry.

The repo is still named "color-scale-generator"; the color tool is the primary
surface and most of this file describes it. The site itself has a dark mode
(see **Site dark mode**).

### Color Scales tool

What the color tool does, top to bottom on one page:

1. **Generate scales.** Enter one or more base hex colors; each expands into a
   10-step shade ramp (50–900). A fixed bottom bar can simulate color blindness
   (protanopia / deuteranopia / tritanopia / achromatopsia) across the whole page.
2. **Check contrast.** Every unique shade across every scale is paired against
   every other, and combinations meeting at least 3:1 are listed with their
   WCAG level (AAA / AA / AA Large), minimum text size, and a live preview.
3. **Export.** Handled by the shared `/export` page (see **Unified system
   export**): **CSS + Dark Mode** (`:root` plus a `prefers-color-scheme:
   dark` block with the ramp inverted), **Tailwind 4.1** `@theme` tokens (in
   **hex / HSL / RGB**), a **Markdown style guide** (a Hex + HSL table per
   color with WCAG text-on-white/black notes), or **W3C Design Tokens (DTCG
   2025.10) JSON** (color objects, Figma-importable), with one-click copy or
   download as a `.txt` file, and an optional variable prefix (see
   **Variable prefix**).
4. **Share.** The palette lives in the URL hash (`#p=name:hex,…`), so editing
   updates the link live and a shared link reopens the exact palette. Also
   autosaved to `localStorage` (written, but not auto-restored — the URL or the
   default wins on load). See the **Palette sharing** glossary entry.

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

- **Astro 5** static site (`output` default = static). Config in
  [astro.config.mjs](./astro.config.mjs).
- **React 19** for interactivity, via `@astrojs/react`. Each tool is one React
  island mounted with `client:load` from its `.astro` route ([index.astro](./src/pages/index.astro)
  → `App`; [type.astro](./src/pages/type.astro) → `TypeScale`;
  [space.astro](./src/pages/space.astro) → `SpaceScale`).
- **Tailwind CSS 4** via the `@tailwindcss/vite` plugin (no `tailwind.config`
  file — theme is defined in CSS with `@theme`, see
  [src/styles/global.css](./src/styles/global.css)).
- **Prism.js** for syntax-highlighting the exported code block
  (`prism-tomorrow` theme, CSS grammar).
- **PostHog** analytics, initialized inline in
  [src/layouts/Layout.astro](./src/layouts/Layout.astro).
- **Playwright** for end-to-end tests, run in CI via GitHub Actions.
- **TypeScript** throughout (`astro/tsconfigs/strict` — see
  [tsconfig.json](./tsconfig.json)).

No database, no auth, no API. All color math runs in the browser.

### Project layout

```
src/
  pages/
    index.astro           Color tool route. SiteNav + <App> + SiteFooter in the layout.
    type.astro            Type Scale tool route. SiteNav + <TypeScale> + SiteFooter.
    space.astro           Space & Grid tool route. SiteNav + <SpaceScale> + SiteFooter.
    foundations.astro     Foundations tool route. SiteNav + <Foundations> + SiteFooter.
    export.astro          The export route. SiteNav + <SystemExport> + SiteFooter.
  layouts/Layout.astro    HTML shell: meta/OG tags (per-page title/description/path/image), PostHog, bg pattern, CVD SVG filters + CvdBar.
  components/
    SiteNav.astro         Shared top nav (Color Scales | Type Scales | Space & Grid | Foundations | Export); `active` marks the current item.
    SiteFooter.astro      Shared footer (the author credit link), used by all routes.
    App.tsx               Color-tool island. Owns colorScales state; composes the three sections + jump links + restore banner.
    ColorInput.tsx        Hex text field + native color picker for one scale. Validates #RRGGBB.
    ShadeRamp.tsx         Renders the 10 swatches (50–900) for one base color (renamed from ColorScale.tsx — collided with the ColorScale type).
    ContrastChecker.tsx   Pick-a-background → legible-foregrounds cards; the whole grid copies as one SVG.
    ExportBlock.tsx       The shared export panel (format select, scoped Prism highlight, Copy Code + Download .txt, optional prefix field). Rendered by SystemExport.
    SystemExport.tsx      The /export island: reads every tool's autosave (readSystemState) and renders the one export block for the whole suite.
    CvdBar.tsx            Fixed bottom bar; toggles a page-wide color-blindness SVG filter.
    TypeScale.tsx         Type-tool island. Owns the TypeScaleConfig (incl. font stacks); inputs, live preview, font-stack pickers.
    SpaceScale.tsx        Space & Grid island. Owns SpaceConfig + GridConfig; size table + pairs + grid.
    Foundations.tsx       Foundations island. Owns FoundationsConfig; radii/borders/elevation/motion sections.
  hooks/
    useHashSync.ts        The shared URL-hash persistence pattern (mount read → hydrated gate → replaceState live-sync) + optional localStorage autosave. Used by all four islands.
    useCopied.ts          Shared copied!-feedback state with the reset timer.
  utils/
    colorUtils.ts         All color math + shared types, the SVG-export builders, and the four color export formats (paletteShadeData/paletteCss/paletteTailwind/paletteMarkdown/paletteTokens). The one place color logic lives.
    typeScale.ts          Fluid type-scale math + font stacks (FONT_STACKS presets, weights): step sizes + clamp() builder + named ratios + CSS/Tailwind/Tokens emitters. Exports clampFor/pxToRem/round/withPrefix/remDimension (shared with the other engines).
    spaceScale.ts         Fluid space + grid math: T-shirt sizes + one-up pairs + column/grid calc + CSS/Tailwind/Tokens emitters. Reuses typeScale's clampFor. The one place space/grid logic lives.
    foundations.ts        Radii/borders/elevation/motion math + CSS/Tailwind/Tokens emitters. The one place foundations logic lives.
    systemExport.ts       The whole-system export: reads every tool's localStorage autosave (defaults as fallback) and merges into one CSS/Tailwind/DTCG file. Owns the STORAGE_KEYS.
    clipboard.ts          copySvg: writes an SVG to the clipboard as text/plain + image/svg+xml (Figma paste). Shared by App + ContrastChecker.
    download.ts           downloadText: saves a code snippet as a file via a Blob URL. Used by ExportBlock.
  styles/
    global.css            Tailwind import + @theme tokens (colors, fonts, fluid type, spacing) + the dark-mode token remap.
    reset.css             CSS reset (imported into the base layer).
  assets/                 SVGs used by the build.
public/                   Static files served as-is: fonts/, favicon.svg, og-image.png + per-tool og-type/og-space/og-foundations.png.
tests/                    Playwright specs (smoke.spec.ts covers all four tools + nav).
tests-examples/           Playwright's generated demo spec (not part of the suite).
```

**`colorUtils.ts` is the engine.** Shade generation, hex/RGB/HSL/OKLCH
conversion, and WCAG luminance/contrast all live there as a single exported
`colorUtils` object, plus the shared `ColorScale` / `ColorInfo` /
`ColorCombination` types. Add new color logic here, not inline in components.

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
  Keep state ownership in `App.tsx`; child components stay presentational and
  receive props.
- **Naming:** PascalCase components/types (and component file names, matching
  the existing files), camelCase functions/variables, SCREAMING_SNAKE for
  constants. Descriptive names; no obscure abbreviations.
- **No dead code.** No commented-out blocks or scaffolding for unagreed
  features. Prefer deletion over deprecation.
- **No emojis in code or commit messages** unless explicitly asked. (The
  decorative emoji *entities* in `App.tsx`/`index.astro` headings are existing
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

---

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start Astro dev server at `http://localhost:4321`. |
| `npm run build` | Static production build. |
| `npm run preview` | Serve the built output locally. |
| `npx playwright test` | Run the Playwright e2e suite (auto-starts `npm run dev`). |

There is **no separate lint script.** Type checking comes from the strict
`tsconfig` at build time; run `npm run build` to catch type errors.

---

## Testing

- **Playwright e2e** under [tests/](./tests/), configured in
  [playwright.config.ts](./playwright.config.ts). The config starts the dev
  server automatically and runs chromium/firefox/webkit.
- **`tests-examples/` is Playwright's generated demo** — not part of the real
  suite. Don't extend it.
- Note the existing `tests/example.spec.ts` is **scaffolding** (a "get started"
  assertion that doesn't match this app's UI). When adding real coverage,
  replace it rather than building on it, and assert on actual behavior — scale
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
  a value isn't there, add it to `@theme` first, then use it.
- **The site has a dark mode** implemented purely as a token remap under
  `prefers-color-scheme: dark` in global.css (see **Site dark mode** in the
  glossary). New UI must work in both themes: pair tokens that flip together
  (`bg-black-500` + `text-cream-100`), and use the static `code-*` /
  `preview-*` tokens for surfaces that must not flip.
- **This tool is itself an accessibility utility — hold its own UI to a high
  bar.** Target WCAG AAA contrast (7:1 normal text, 4.5:1 large) for the app's
  own chrome. Verify pairs; don't eyeball them.
- **Accessibility beyond contrast:** semantic HTML first, ARIA only when needed.
  Every form control has a label (note `ColorInput` uses an `sr-only` label and
  the selects in `CodeBlock` use `htmlFor`). Keyboard navigation and visible
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
  `nameEdited` in `App`'s local state, *not* on the shared `ColorScale` type).
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
  (CSS / Tailwind 4). Both
  [CodeBlock](./src/components/CodeBlock.tsx) and
  [ContrastChecker](./src/components/ContrastChecker.tsx) labels go through
  `uniqueSlugs` so naming stays consistent. (This replaced the old positional
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
- **Format vs. color format** — *format* is the output syntax (`cssDark`,
  `tailwind4`, `markdown`, `tokens`; `cssDark` is the default); *color format* is
  the value encoding (`hex`, `hsl`, `rgb`). Independent selectors in `CodeBlock`,
  except the color format is hidden for the fixed-value formats (`markdown` →
  Hex + HSL table; `tokens` → a fixed DTCG color object). Those two build from
  raw-hex shade data, not the `convertColor` pipeline the code formats use.
  `tokens` emits W3C Design Tokens (**DTCG 2025.10**), keyed by the de-duped
  slug: each `$value` is a color *object*
  (`colorUtils.hexToDtcgColor` → `{ colorSpace: 'srgb', components, alpha, hex }`,
  components normalized 0..1 at 6 decimals), which is what Figma's native
  variables importer expects — a bare hex string is the old style and no longer
  imports. The Prism language switches
  `css` / `markdown` / `json` by format (`cssDark`, `tailwind4` use `css`).
- **Fluid values as tokens** — DTCG 2025.10 requires a `dimension` `$value` to
  be an **object**, `{ value: <number>, unit: 'px' | 'rem' }` — never a string.
  A `clamp()` therefore has no representation as a dimension token (one number,
  one unit), and Figma variables have no viewport concept to bind it to either.
  So the Type and Space tools' `toTokens` flatten each fluid value to its two
  viewport anchors under top-level **`min`** and **`max`** groups, which import
  as Figma modes — deliberately mirroring the color tool's `light`/`dark`
  groups. `typeScale.remDimension(px)` (+ the `DimensionToken` type) builds the
  object and is shared by both engines; `grid.columns` stays `$type: 'number'`,
  which is already spec-valid. The `clamp()` strings live only in the CSS and
  Tailwind formats, which is where they're actually consumable.
- **Snippet download** — the export block pairs **Copy Code** with
  **Download .txt**, which saves the exact snippet on screen via
  `download.ts`'s `downloadText` (a Blob URL + synthetic `<a download>`; no
  backend). Filenames are `design-system-<format>.txt`. The `.txt` extension
  is deliberate per issue #46 — note Figma's *native* variables importer and
  most token plugins filter their file picker to `.json`, so a `.txt` token
  export may need renaming before import.
- **Dark mode in exports** — the dark ramp is the light ramp **mirrored**
  (`colorUtils.mirrorHexes` — 50↔900, 100↔800, …), so light tints become dark
  and vice versa, keeping hue/chroma. Where each format puts it: `cssDark` →
  `:root` plus a `@media (prefers-color-scheme: dark) { :root { … } }` override;
  `tailwind4` → `@theme { … }` plus a `.dark { … }` override (class-based dark
  variant); `markdown` → a **Dark** column in the per-color table; `tokens` →
  top-level `light` and `dark` groups, each `{ slug: { shade: { $type, $value } } }`.
- **Palette sharing** — the palette serializes to `name:hex,…`
  (`colorUtils.encodePalette` / `decodePalette`) and lives in the URL hash under
  the `#p=` prefix, via the shared `useHashSync` hook (mount read → `hydrated`
  ref gate → `replaceState` live-sync → `localStorage` autosave). A valid hash
  wins over the default. **The hook writes nothing until the value actually
  changes** (a `lastSynced` baseline seeded on mount): a mount-time
  `replaceState` would abort an in-flight nav click, and the eager write used
  to clobber the previous session's autosave — so a fresh page keeps a clean
  URL until the first edit. The autosave is **not** auto-restored, but when a
  previous session's save exists and the URL carries no palette, a banner
  offers **"Restore your last palette?"** (the saved value is read in a lazy
  initializer). Shared scales load with `nameEdited: false` (the shared name is
  shown, but recoloring re-derives it from the hue until the recipient types
  one — see `handleColorChange`). Malformed pairs are dropped; if nothing
  valid decodes, the default loads. The same `useHashSync` pattern backs
  `#t=` (type), `#s=` (space), and `#f=` (foundations), each with its own
  autosave key (see `systemExport.STORAGE_KEYS`).
- **Type Scale** — the second tool ([TypeScale](./src/components/TypeScale.tsx)
  at `/type`). Math lives in [typeScale.ts](./src/utils/typeScale.ts) (the
  engine, mirroring `colorUtils`): `generateTypeScale(config)` builds each step
  (`size = fontSize × ratio^step` at each viewport), `toCss` emits the `:root`
  block of `--step-N: clamp(...)` custom properties, and `clampFor` builds the
  Utopia-style `clamp(min, intercept + slopeVw, max)` (slope/intercept of the
  line through the two viewport anchors; px→rem at 16px). `NAMED_RATIOS` /
  `ratioName` back the modular-scale picker (Minor Third, etc.). The island owns
  a `TypeScaleConfig` (min/max viewport, font size, ratio; steps up/down) and a
  preview-viewport slider that renders each step at its interpolated px size
  (`sizeAtViewport`). The slider's draggable handle is a device icon
  (`deviceForWidth`: mobile <768, tablet <1024, laptop ≥1024) — a transparent
  native range input over a custom thick track, with the icon overlaid at the
  value position (so it stays accessible/keyboard-operable). Output matches
  utopia.fyi for the same inputs; the default viewport is 320–1440, matching
  the space tool. **The tool also owns the font stacks** (heading/body/mono,
  picked from `FONT_STACKS` — curated modernfontstacks.com system stacks,
  zero-download — or free text, plus fixed regular/medium/bold weights);
  typography belongs with the type scale. Engine emitters (consumed by the
  Export page): `toCss` (`--step-N` clamps + `--font-*` stacks/weights),
  `toTailwind` (`--text-step-N` + `--font-*` utilities), `typeTokensObject`
  (DTCG `font-size` dimensions under `min`/`max` — see **Fluid values as
  tokens** — plus a static `font` group of `fontFamily`/`fontWeight`). The
  config serializes to `#t=` (`encodeConfig` / `decodeConfig`: eight
  comma-joined numbers, then the three URI-encoded stacks pipe-appended;
  numbers-only legacy links still decode with default stacks).
- **Space & Grid** — the third tool ([SpaceScale](./src/components/SpaceScale.tsx)
  at `/space`). Math lives in [spaceScale.ts](./src/utils/spaceScale.ts), which
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
  **Engine emitters** (consumed by the Export page): `toCss` → `--space-*` +
  the grid `:root` plus `.u-container`/`.u-grid`; `toTailwind` → `@theme`
  with `--spacing-*`; `spaceTokensObject` → DTCG under `space`/`grid` groups,
  see **Fluid values as tokens**. Preview swatches/bars use the blue-500
  token (not Utopia's pink); size rows show px and rem. The config serializes
  to `#s=` (`encodeSpaceGrid`/`decodeSpaceGrid`, ten numbers) with the same
  hash-sync pattern. Output matches utopia.fyi for the same inputs.

- **Foundations** — the fourth tool ([Foundations](./src/components/Foundations.tsx)
  at `/foundations`). Math lives in [foundations.ts](./src/utils/foundations.ts)
  (the engine, mirroring the others). Four sections, each with controls +
  live preview: **corner radii** (`none/sm/md/lg/xl/full` multipliers off a
  base, `full` = 9999px), **border widths** (a T-shirt ladder off a base —
  `BORDER_LADDER` `s/m/l/xl/2xl/3xl/4xl` — with a `borderSteps` control for
  how many sizes the system ships), **elevation** (5 levels, each a key +
  ambient shadow pair; fixed geometry, opacity scaled by an intensity control
  and a shadow color pickable from the saved palette's 500/900 shades or a
  native picker; the dark variant raises opacity ×1.8 — shadows need more
  contrast on dark surfaces — previewed on fixed `preview-*` light/dark
  panels), and **motion** (fast/base/slow durations +
  standard/decelerate/accelerate cubic-bezier easings, laid out as three
  cards with replayable previews). Engine emitters (consumed by the Export
  page): `toCss` (`:root` plus a dark elevation override), `toTailwind`
  (`@theme` using real TW4 namespaces — `--radius-*`, `--shadow-*`,
  `--ease-*` — plus a `.dark` elevation block), `foundationsTokensObject`
  (DTCG: px dimensions, `shadow` composites under `light`/`dark`,
  `duration`/`cubicBezier`). Config serializes to `#f=`
  (`encodeFoundations`/`decodeFoundations`, eight pipe-separated parts; the
  legacy 10-part format that carried font stacks still decodes).
- **Unified system export** — THE export surface, its own nav destination at
  `/export` ([SystemExport.tsx](./src/components/SystemExport.tsx) over
  [systemExport.ts](./src/utils/systemExport.ts)); the tools themselves have
  no export blocks. Merges every tool's **latest saved state** (each
  island's `useHashSync` autosave, read via `STORAGE_KEYS`; defaults where a
  tool was never opened) into one CSS block, Tailwind `@theme`, Markdown
  style guide (colors only), or DTCG file
  (`systemCss`/`systemTailwind`/`systemMarkdown`/`systemTokens`). The code
  formats take the hex/HSL/RGB color-format selector. **Token mode
  strategy:** top-level `light`/`dark` groups hold the theme-dependent
  layers (color, elevation), top-level `min`/`max` hold the
  viewport-dependent layers (font-size, space, grid), and the static layers
  (radius, border, font, motion) sit at the top level — each top-level group
  imports as a Figma collection/mode. `mergeGroups` deep-merges the
  per-engine token objects so e.g. color's `light` and elevation's `light`
  share one group (and prefix groups merge instead of clobbering).
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
  **Static tokens that never flip:** the brand `blue-*` ramp, `red-50/500`,
  `code-bg`/`code-fg` (the export terminal), and the `preview-*` panels (the
  elevation preview needs an always-light and an always-dark surface). No
  `.dark` class, no toggle — the OS preference decides. CVD filters apply on
  top unchanged.

---

## Rules for Claude (summary)

- Do NOT add features, services, or dependencies not asked for. No color
  libraries — the math is intentionally hand-written in `colorUtils.ts`.
- Keep all color/contrast logic in `colorUtils.ts`; keep components
  presentational with state owned by `App.tsx`.
- Use existing `@theme` tokens; add to `@theme` before hardcoding values. No
  `tailwind.config` file.
- Always create a new branch; never work on `main`.
- Run `npm run build` (type check) and `npx playwright test` before calling a
  change complete.
- **Never start, restart, or kill the user's dev server** (and never
  `taskkill node.exe`) to take screenshots or for any other reason, unless the
  user asks or grants permission. The user runs their own dev server — rely on
  them for visual feedback; describe the change and ask them to confirm.
- Never add AI co-author trailers.
- Commit after checks pass, but never push — the user opens the PR after review.
- When in doubt about architecture, re-read this file.
