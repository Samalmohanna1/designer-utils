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

// The CSS :root block of custom properties, one per step. Prefix is the
// variable namespace (e.g. `step` -> `--step-0`). Negative steps read
// `--step--1` (Utopia's convention).
export const toCss = (steps: TypeStep[], prefix = 'step'): string => {
	const lines = steps.map((s) => `  --${prefix}-${s.step}: ${s.clamp};`)
	return `:root {\n${lines.join('\n')}\n}`
}

// Tailwind 4 @theme block. Uses --text-step-N so each step becomes a
// `text-step-N` utility (the convention this repo's own global.css uses).
export const toTailwind = (steps: TypeStep[]): string => {
	const lines = steps.map((s) => `  --text-step-${s.step}: ${s.clamp};`)
	return `@theme {\n${lines.join('\n')}\n}`
}

// W3C Design Tokens (DTCG): one dimension token per step, value = the clamp().
// Keyed `step-N` (negatives as `step--1`) under a `font-size` group.
export const toTokens = (steps: TypeStep[]): string => {
	const sizes: Record<string, { $type: 'dimension'; $value: string }> = {}
	for (const s of steps) {
		sizes[`step-${s.step}`] = { $type: 'dimension', $value: s.clamp }
	}
	return JSON.stringify({ 'font-size': sizes }, null, 2)
}

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
// The config encodes to a fixed, comma-separated list of its eight numbers,
// for the URL hash (e.g. `320,1240,18,20,1.2,1.25,5,2`). Mirrors colorUtils'
// encodePalette/decodePalette. Round-trips through encode/decode.

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
	CONFIG_ORDER.map((k) => config[k]).join(',')

// Parses the encoded string back into a config. Returns null if it doesn't
// hold all eight finite numbers, so the caller can fall back to a default.
// Viewports/sizes/steps are coerced sane (steps non-negative integers; ratios
// kept >= 1) so a malformed hash can't produce a broken scale.
export const decodeConfig = (encoded: string): TypeScaleConfig | null => {
	if (!encoded) return null
	const parts = encoded.split(',').map((p) => parseFloat(p.trim()))
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
	return {
		minViewport,
		maxViewport,
		minFontSize,
		maxFontSize,
		minRatio: Math.max(1, minRatio),
		maxRatio: Math.max(1, maxRatio),
		stepsUp: Math.max(0, Math.round(stepsUp)),
		stepsDown: Math.max(0, Math.round(stepsDown)),
	}
}
