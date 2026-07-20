// Fluid type-scale math. A scale is anchored by two viewports: at minViewport
// the font is minFontSize and steps grow by minRatio per step; at maxViewport
// the font is maxFontSize and steps grow by maxRatio. Each step's size fluidly
// interpolates between the two via a CSS clamp(). Pure functions, no DOM — the
// one place type-scale logic lives (mirrors colorUtils for color).

export interface TypeScaleConfig {
	minViewport: number // px
	maxViewport: number // px
	minFontSize: number // px (at step 0)
	maxFontSize: number // px (at step 0)
	minRatio: number // multiplier per step at the min viewport
	maxRatio: number // multiplier per step at the max viewport
	stepsUp: number // how many steps above 0
	stepsDown: number // how many steps below 0
	// Font stacks — typography belongs with the type scale.
	headingStack: string
	bodyStack: string
	monoStack: string
	// Optional stylesheet URL for self-hosted/custom fonts ('' = none). Loaded
	// for the live preview and emitted as an @import in the CSS exports.
	fontCssUrl: string
}

// Curated system stacks (modernfontstacks.com) — OS-native families that
// render with zero font downloads. The free-text field accepts any list.
export const FONT_STACKS: { label: string; value: string }[] = [
	{ label: 'System UI', value: 'system-ui, sans-serif' },
	{
		label: 'Humanist',
		value: "Seravek, 'Gill Sans Nova', Ubuntu, Calibri, 'DejaVu Sans', source-sans-pro, sans-serif",
	},
	{
		label: 'Neo-Grotesque',
		value: "Inter, Roboto, 'Helvetica Neue', 'Arial Nova', 'Nimbus Sans', Arial, sans-serif",
	},
	{
		label: 'Geometric Humanist',
		value: "Avenir, Montserrat, Corbel, 'URW Gothic', source-sans-pro, sans-serif",
	},
	{
		label: 'Rounded Sans',
		value: "ui-rounded, 'Hiragino Maru Gothic ProN', Quicksand, Comfortaa, Manjari, 'Arial Rounded MT', 'Arial Rounded MT Bold', Calibri, source-sans-pro, sans-serif",
	},
	{
		label: 'Transitional Serif',
		value: "Charter, 'Bitstream Charter', 'Sitka Text', Cambria, serif",
	},
	{
		label: 'Old Style Serif',
		value: "'Iowan Old Style', 'Palatino Linotype', 'URW Palladio L', P052, serif",
	},
	{
		label: 'Slab Serif',
		value: "Rockwell, 'Rockwell Nova', 'Roboto Slab', 'DejaVu Serif', 'Sitka Small', serif",
	},
	{
		label: 'Monospace Code',
		value: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace",
	},
	{
		label: 'Monospace Slab',
		value: "'Nimbus Mono PS', 'Courier New', monospace",
	},
]

// Curated Google Fonts (loaded from fonts.googleapis.com only while previewed
// or via the emitted @import — unlike the system stacks these download). Each
// stack leads with the Google family and falls back to a system family.
export const GOOGLE_FONTS: {
	label: string
	family: string
	value: string
}[] = [
	{ label: 'Inter', family: 'Inter', value: "'Inter', system-ui, sans-serif" },
	{ label: 'Roboto', family: 'Roboto', value: "'Roboto', system-ui, sans-serif" },
	{ label: 'Open Sans', family: 'Open Sans', value: "'Open Sans', system-ui, sans-serif" },
	{ label: 'Lato', family: 'Lato', value: "'Lato', system-ui, sans-serif" },
	{ label: 'Montserrat', family: 'Montserrat', value: "'Montserrat', Avenir, system-ui, sans-serif" },
	{ label: 'Poppins', family: 'Poppins', value: "'Poppins', system-ui, sans-serif" },
	{ label: 'Nunito', family: 'Nunito', value: "'Nunito', system-ui, sans-serif" },
	{ label: 'Work Sans', family: 'Work Sans', value: "'Work Sans', system-ui, sans-serif" },
	{ label: 'DM Sans', family: 'DM Sans', value: "'DM Sans', system-ui, sans-serif" },
	{ label: 'Space Grotesk', family: 'Space Grotesk', value: "'Space Grotesk', system-ui, sans-serif" },
	{ label: 'Playfair Display', family: 'Playfair Display', value: "'Playfair Display', 'Iowan Old Style', serif" },
	{ label: 'Merriweather', family: 'Merriweather', value: "'Merriweather', Charter, serif" },
	{ label: 'Lora', family: 'Lora', value: "'Lora', Charter, serif" },
	{ label: 'Source Serif 4', family: 'Source Serif 4', value: "'Source Serif 4', Charter, serif" },
	{ label: 'JetBrains Mono', family: 'JetBrains Mono', value: "'JetBrains Mono', ui-monospace, monospace" },
	{ label: 'Fira Code', family: 'Fira Code', value: "'Fira Code', ui-monospace, monospace" },
	{ label: 'IBM Plex Mono', family: 'IBM Plex Mono', value: "'IBM Plex Mono', ui-monospace, monospace" },
	{ label: 'Space Mono', family: 'Space Mono', value: "'Space Mono', ui-monospace, monospace" },
]

// The Google families a set of stacks actually uses (a stack counts when its
// LEADING family is a curated Google family), deduped in stack order.
export const googleFamiliesIn = (stacks: string[]): string[] => {
	const families: string[] = []
	for (const stack of stacks) {
		const lead = stackToFamilies(stack)[0]
		if (!lead) continue
		const match = GOOGLE_FONTS.find((g) => g.family === lead)
		if (match && !families.includes(match.family)) {
			families.push(match.family)
		}
	}
	return families
}

// The css2 stylesheet URL for a set of families at the system's three weights.
export const googleFontsUrl = (families: string[]): string => {
	const params = families
		.map(
			(f) =>
				`family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@${FONT_WEIGHTS.map((w) => w.value).join(';')}`
		)
		.join('&')
	return `https://fonts.googleapis.com/css2?${params}&display=swap`
}

export const isHttpUrl = (raw: string): boolean => /^https?:\/\//i.test(raw)

// @import lines the config needs (Google Fonts and/or the custom stylesheet).
// @import is only valid before any other rule, so the system export hoists
// these to the very top of the merged file.
export const fontImports = (config: TypeScaleConfig): string[] => {
	const imports: string[] = []
	const families = googleFamiliesIn([
		config.headingStack,
		config.bodyStack,
		config.monoStack,
	])
	if (families.length > 0) {
		imports.push(`@import url('${googleFontsUrl(families)}');`)
	}
	if (isHttpUrl(config.fontCssUrl)) {
		imports.push(`@import url('${config.fontCssUrl}');`)
	}
	return imports
}

export const FONT_WEIGHTS: { label: string; value: number }[] = [
	{ label: 'regular', value: 400 },
	{ label: 'medium', value: 500 },
	{ label: 'bold', value: 700 },
]

// A CSS stack as a DTCG fontFamily array: top-level comma split, quotes
// stripped (the token format quotes names itself).
export const stackToFamilies = (stack: string): string[] =>
	stack
		.split(',')
		.map((f) => f.trim().replace(/^['"]|['"]$/g, ''))
		.filter((f) => f.length > 0)

// The tool's default config — also the fallback the unified system export
// uses when the type tool has no saved state. Viewport 320–1440 matches the
// suite-wide default (same anchors as the space tool).
export const DEFAULT_TYPE_CONFIG: TypeScaleConfig = {
	minViewport: 320,
	maxViewport: 1440,
	minFontSize: 18,
	maxFontSize: 20,
	minRatio: 1.2,
	maxRatio: 1.25,
	stepsUp: 5,
	stepsDown: 2,
	headingStack: 'system-ui, sans-serif',
	bodyStack: 'system-ui, sans-serif',
	monoStack: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace",
	fontCssUrl: '',
}

export interface TypeStep {
	step: number // …, -1, 0, 1, …
	minSize: number // px at minViewport
	maxSize: number // px at maxViewport
	clamp: string // the CSS clamp() expression
}

const REM = 16

// Trim trailing zeros from a fixed-precision number (1.2500 -> 1.25, 1.0 -> 1).
// Exported so the space/grid engine shares the same rounding + clamp math.
export const round = (n: number, places = 4): string => {
	const v = Number(n.toFixed(places))
	return String(v)
}

export const pxToRem = (px: number): string => `${round(px / REM)}rem`

// A DTCG 2025.10 dimension token. The spec requires $value to be an object of
// one number + one unit — never a string — which is why a clamp() can't be a
// dimension token at all (see toTokens). Shared with the space/grid engine.
export interface DimensionToken {
	$type: 'dimension'
	$value: { value: number; unit: 'rem' }
}

export const remDimension = (px: number): DimensionToken => ({
	$type: 'dimension',
	$value: { value: Number((px / REM).toFixed(4)), unit: 'rem' },
})

// Common modular-scale ratios, for a labeled picker. Value is the multiplier.
export const NAMED_RATIOS: { value: number; label: string }[] = [
	{ value: 1.067, label: 'Minor Second' },
	{ value: 1.125, label: 'Major Second' },
	{ value: 1.2, label: 'Minor Third' },
	{ value: 1.25, label: 'Major Third' },
	{ value: 1.333, label: 'Perfect Fourth' },
	{ value: 1.414, label: 'Augmented Fourth' },
	{ value: 1.5, label: 'Perfect Fifth' },
	{ value: 1.618, label: 'Golden Ratio' },
]

// The name for a ratio if it matches a common one (within rounding), else ''.
export const ratioName = (ratio: number): string =>
	NAMED_RATIOS.find((r) => Math.abs(r.value - ratio) < 0.001)?.label ?? ''

// Build the clamp() for a step given its min/max px sizes across the viewports.
// slope/intercept are the line through (minViewport, minSize) and
// (maxViewport, maxSize); the preferred term is intercept + slope*100vw, fenced
// by the min/max sizes. Guards a zero viewport span (returns a fixed size).
// Exported so the space/grid engine reuses the exact same fluid formula.
export const clampFor = (
	minSize: number,
	maxSize: number,
	minViewport: number,
	maxViewport: number
): string => {
	const lo = Math.min(minSize, maxSize)
	const hi = Math.max(minSize, maxSize)
	if (maxViewport === minViewport) return pxToRem(minSize)

	const slope = (maxSize - minSize) / (maxViewport - minViewport)
	const intercept = minSize - slope * minViewport
	const vw = round(slope * 100)
	const interceptRem = pxToRem(intercept)
	// `intercept + 0vw` would be a constant; keep the vw term for clarity.
	const preferred = `${interceptRem} + ${vw}vw`
	return `clamp(${pxToRem(lo)}, ${preferred}, ${pxToRem(hi)})`
}

// The full ordered list of steps (lowest to highest) for a config.
export const generateTypeScale = (config: TypeScaleConfig): TypeStep[] => {
	const {
		minViewport,
		maxViewport,
		minFontSize,
		maxFontSize,
		minRatio,
		maxRatio,
		stepsUp,
		stepsDown,
	} = config

	const steps: TypeStep[] = []
	for (let step = stepsUp; step >= -stepsDown; step--) {
		const minSize = minFontSize * Math.pow(minRatio, step)
		const maxSize = maxFontSize * Math.pow(maxRatio, step)
		steps.push({
			step,
			minSize,
			maxSize,
			clamp: clampFor(minSize, maxSize, minViewport, maxViewport),
		})
	}
	return steps
}

// An optional user namespace ahead of a variable name: '' stays '', 'brand'
// becomes 'brand-'. Shared by every export builder in the suite.
export const withPrefix = (prefix: string): string =>
	prefix ? `${prefix}-` : ''

const fontCssLines = (
	config: TypeScaleConfig,
	p: string,
	namespace: string // '' for plain CSS vars, 'weight' namespaces differ in TW4
): string[] => [
	`  --${namespace}${p}heading: ${config.headingStack};`,
	`  --${namespace}${p}body: ${config.bodyStack};`,
	`  --${namespace}${p}mono: ${config.monoStack};`,
]

// The CSS :root block: one custom property per step (`--step-0`; with a
// prefix, `--brand-step-0`; negative steps read `--step--1`, Utopia's
// convention), plus the font stacks and weights.
export const toCss = (
	steps: TypeStep[],
	config: TypeScaleConfig,
	prefix = ''
): string => {
	const p = withPrefix(prefix)
	const lines = [
		...steps.map((s) => `  --${p}step-${s.step}: ${s.clamp};`),
		'',
		'  /* Font stacks */',
		...fontCssLines(config, p, 'font-'),
		...FONT_WEIGHTS.map(
			(w) => `  --${p}font-weight-${w.label}: ${w.value};`
		),
	]
	return `:root {\n${lines.join('\n')}\n}`
}

// Tailwind 4 @theme block. --text-step-N makes each step a `text-step-N`
// utility (the convention this repo's own global.css uses); --font-* makes
// the stacks `font-heading`/`font-body`/`font-mono` utilities.
export const toTailwind = (
	steps: TypeStep[],
	config: TypeScaleConfig,
	prefix = ''
): string => {
	const p = withPrefix(prefix)
	const lines = [
		...steps.map((s) => `  --text-${p}step-${s.step}: ${s.clamp};`),
		'',
		'  /* font-* utilities + weights */',
		`  --font-${p}heading: ${config.headingStack};`,
		`  --font-${p}body: ${config.bodyStack};`,
		`  --font-${p}mono: ${config.monoStack};`,
		...FONT_WEIGHTS.map(
			(w) => `  --font-weight-${p}${w.label}: ${w.value};`
		),
	]
	return `@theme {\n${lines.join('\n')}\n}`
}

// W3C Design Tokens (DTCG 2025.10). A dimension token holds a single number +
// unit, so a fluid clamp() has no representation — and Figma variables have no
// viewport concept either. The scale therefore flattens to its two anchors as
// `min` and `max` groups, which import as Figma modes (mirroring the color
// tool's light/dark groups). Steps are keyed `step-N` (negatives as `step--1`).
export const typeTokensObject = (
	steps: TypeStep[],
	config: TypeScaleConfig,
	prefix = ''
): Record<string, unknown> => {
	const min: Record<string, DimensionToken> = {}
	const max: Record<string, DimensionToken> = {}
	for (const s of steps) {
		min[`step-${s.step}`] = remDimension(s.minSize)
		max[`step-${s.step}`] = remDimension(s.maxSize)
	}
	const group = (g: Record<string, DimensionToken>) =>
		prefix ? { [prefix]: { 'font-size': g } } : { 'font-size': g }
	// Font stacks are static (no viewport modes), so they sit at the top
	// level alongside the min/max groups.
	const font = {
		heading: {
			$type: 'fontFamily',
			$value: stackToFamilies(config.headingStack),
		},
		body: { $type: 'fontFamily', $value: stackToFamilies(config.bodyStack) },
		mono: { $type: 'fontFamily', $value: stackToFamilies(config.monoStack) },
		weight: Object.fromEntries(
			FONT_WEIGHTS.map((w) => [
				w.label,
				{ $type: 'fontWeight', $value: w.value },
			])
		),
	}
	return {
		min: group(min),
		max: group(max),
		...(prefix ? { [prefix]: { font } } : { font }),
	}
}

export const toTokens = (
	steps: TypeStep[],
	config: TypeScaleConfig,
	prefix = ''
): string => JSON.stringify(typeTokensObject(steps, config, prefix), null, 2)

// The px size at an arbitrary viewport width, for the live preview. Linearly
// interpolates between the two anchors and clamps to the min/max bounds.
export const sizeAtViewport = (
	step: TypeStep,
	viewport: number,
	config: TypeScaleConfig
): number => {
	const { minViewport, maxViewport } = config
	const lo = Math.min(step.minSize, step.maxSize)
	const hi = Math.max(step.minSize, step.maxSize)
	if (maxViewport === minViewport) return step.minSize
	const t = (viewport - minViewport) / (maxViewport - minViewport)
	const raw = step.minSize + (step.maxSize - step.minSize) * t
	return Math.min(Math.max(raw, lo), hi)
}

// --- Shareable config serialization ---
// Eight comma-joined numbers, then the three URI-encoded font stacks and the
// custom stylesheet URL joined by '|' (stacks contain commas):
// `320,1440,18,20,1.2,1.25,5,2|h|b|m|url`. Links from before the stacks
// existed (numbers only) or before the URL (three stack parts) still decode —
// missing parts fall back to the defaults. Round-trips through encode/decode.

const CONFIG_ORDER = [
	'minViewport',
	'maxViewport',
	'minFontSize',
	'maxFontSize',
	'minRatio',
	'maxRatio',
	'stepsUp',
	'stepsDown',
] as const

export const encodeConfig = (config: TypeScaleConfig): string =>
	[
		CONFIG_ORDER.map((k) => config[k]).join(','),
		encodeURIComponent(config.headingStack),
		encodeURIComponent(config.bodyStack),
		encodeURIComponent(config.monoStack),
		encodeURIComponent(config.fontCssUrl),
	].join('|')

// Parses the encoded string back into a config. Returns null if the numeric
// block doesn't hold all eight finite numbers, so the caller can fall back
// to a default. Viewports/sizes/steps are coerced sane (steps non-negative
// integers; ratios kept >= 1) so a malformed hash can't produce a broken
// scale.
export const decodeConfig = (encoded: string): TypeScaleConfig | null => {
	if (!encoded) return null
	const [numericBlock, ...stackParts] = encoded.split('|')
	const parts = numericBlock.split(',').map((p) => parseFloat(p.trim()))
	if (parts.length !== CONFIG_ORDER.length || parts.some((n) => !Number.isFinite(n))) {
		return null
	}
	const [
		minViewport,
		maxViewport,
		minFontSize,
		maxFontSize,
		minRatio,
		maxRatio,
		stepsUp,
		stepsDown,
	] = parts
	const stack = (i: number, fallback: string): string => {
		if (stackParts.length < 3 || !stackParts[i]) return fallback
		try {
			return decodeURIComponent(stackParts[i])
		} catch {
			return fallback
		}
	}
	const url = stack(3, '')
	return {
		minViewport,
		maxViewport,
		minFontSize,
		maxFontSize,
		minRatio: Math.max(1, minRatio),
		maxRatio: Math.max(1, maxRatio),
		stepsUp: Math.max(0, Math.round(stepsUp)),
		stepsDown: Math.max(0, Math.round(stepsDown)),
		headingStack: stack(0, DEFAULT_TYPE_CONFIG.headingStack),
		bodyStack: stack(1, DEFAULT_TYPE_CONFIG.bodyStack),
		monoStack: stack(2, DEFAULT_TYPE_CONFIG.monoStack),
		fontCssUrl: isHttpUrl(url) ? url : '',
	}
}
