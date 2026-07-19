// The foundations engine: corner radii, border widths, elevation shadows,
// font stacks, and motion tokens — the token layers a design system needs
// beyond color/type/space. Pure functions, no DOM; the one place foundations
// logic lives (mirrors colorUtils / typeScale / spaceScale).

import { colorUtils } from './colorUtils'
import { withPrefix } from './typeScale'

export interface FoundationsConfig {
	radiusBase: number // px — the `md` radius; the ladder scales off it
	borderBase: number // px — the `hairline` width; thin/thick scale off it
	shadowColor: string // hex — tint for every elevation shadow
	shadowIntensity: number // 0.5–2 multiplier on shadow opacity
	durationFast: number // ms
	durationBase: number // ms
	durationSlow: number // ms
	headingStack: string
	bodyStack: string
	monoStack: string
}

export const DEFAULT_FOUNDATIONS: FoundationsConfig = {
	radiusBase: 8,
	borderBase: 1,
	shadowColor: '#000000',
	shadowIntensity: 1,
	durationFast: 150,
	durationBase: 250,
	durationSlow: 400,
	headingStack: 'system-ui, sans-serif',
	bodyStack: 'system-ui, sans-serif',
	monoStack: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace",
}

// --- Corner radii ---
// Multipliers on the base (md). `full` is the pill/circle special case.
export const RADIUS_SIZES: { label: string; multiplier: number | 'full' }[] = [
	{ label: 'none', multiplier: 0 },
	{ label: 'sm', multiplier: 0.5 },
	{ label: 'md', multiplier: 1 },
	{ label: 'lg', multiplier: 2 },
	{ label: 'xl', multiplier: 4 },
	{ label: 'full', multiplier: 'full' },
]

export interface RadiusToken {
	label: string
	px: number // 9999 for `full`
}

export const generateRadii = (config: FoundationsConfig): RadiusToken[] =>
	RADIUS_SIZES.map(({ label, multiplier }) => ({
		label,
		px:
			multiplier === 'full'
				? 9999
				: Math.round(config.radiusBase * multiplier * 100) / 100,
	}))

// --- Border widths ---
export const BORDER_SIZES: { label: string; multiplier: number }[] = [
	{ label: 'hairline', multiplier: 1 },
	{ label: 'thin', multiplier: 2 },
	{ label: 'thick', multiplier: 4 },
]

export interface BorderToken {
	label: string
	px: number
}

export const generateBorders = (config: FoundationsConfig): BorderToken[] =>
	BORDER_SIZES.map(({ label, multiplier }) => ({
		label,
		px: Math.round(config.borderBase * multiplier * 100) / 100,
	}))

// --- Elevation ---
// Five levels, each two stacked shadows: a `key` shadow (directional, grows
// with height) and an `ambient` shadow (soft, close). Geometry is fixed;
// opacity scales with the intensity control. The dark variant keeps the
// geometry and raises opacity — shadows need more contrast on dark surfaces.
const ELEVATION_GEOMETRY: {
	key: { y: number; blur: number }
	ambient: { y: number; blur: number }
}[] = [
	{ key: { y: 1, blur: 2 }, ambient: { y: 1, blur: 3 } },
	{ key: { y: 2, blur: 6 }, ambient: { y: 1, blur: 4 } },
	{ key: { y: 4, blur: 12 }, ambient: { y: 2, blur: 6 } },
	{ key: { y: 8, blur: 24 }, ambient: { y: 3, blur: 8 } },
	{ key: { y: 16, blur: 48 }, ambient: { y: 4, blur: 12 } },
]

const KEY_ALPHA = 0.14
const AMBIENT_ALPHA = 0.08
const DARK_ALPHA_FACTOR = 1.8

export interface ShadowLayer {
	x: number
	y: number
	blur: number
	spread: number
	color: string // hex
	alpha: number
}

export interface ElevationToken {
	label: string // elevation-1 … elevation-5
	layers: ShadowLayer[]
}

const roundAlpha = (a: number): number => Math.min(0.6, Math.round(a * 100) / 100)

export const generateElevation = (
	config: FoundationsConfig,
	mode: 'light' | 'dark' = 'light'
): ElevationToken[] => {
	const factor =
		config.shadowIntensity * (mode === 'dark' ? DARK_ALPHA_FACTOR : 1)
	return ELEVATION_GEOMETRY.map((geo, i) => ({
		label: `elevation-${i + 1}`,
		layers: [
			{
				x: 0,
				y: geo.key.y,
				blur: geo.key.blur,
				spread: 0,
				color: config.shadowColor,
				alpha: roundAlpha(KEY_ALPHA * factor),
			},
			{
				x: 0,
				y: geo.ambient.y,
				blur: geo.ambient.blur,
				spread: 1,
				color: config.shadowColor,
				alpha: roundAlpha(AMBIENT_ALPHA * factor),
			},
		],
	}))
}

// A layer as CSS: `0 1px 2px 0 rgba(0, 0, 0, 0.14)`.
const layerCss = (l: ShadowLayer): string => {
	const [r, g, b] = colorUtils.hexToRgb(l.color)
	return `${l.x}px ${l.y}px ${l.blur}px ${l.spread}px rgba(${r}, ${g}, ${b}, ${l.alpha})`
}

export const elevationCss = (token: ElevationToken): string =>
	token.layers.map(layerCss).join(', ')

// --- Font stacks ---
// Curated system stacks (modernfontstacks.com) — zero-download, cross-OS.
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

// --- Motion ---
export const EASINGS: { label: string; bezier: [number, number, number, number] }[] = [
	{ label: 'standard', bezier: [0.4, 0, 0.2, 1] },
	{ label: 'decelerate', bezier: [0, 0, 0.2, 1] },
	{ label: 'accelerate', bezier: [0.4, 0, 1, 1] },
]

export const easingCss = (bezier: [number, number, number, number]): string =>
	`cubic-bezier(${bezier.join(', ')})`

export const durations = (
	config: FoundationsConfig
): { label: string; ms: number }[] => [
	{ label: 'fast', ms: config.durationFast },
	{ label: 'base', ms: config.durationBase },
	{ label: 'slow', ms: config.durationSlow },
]

// --- Exports (CSS / Tailwind 4 / Design Tokens) ---

const fontVarLines = (config: FoundationsConfig, p: string): string[] => [
	`  --${p}font-heading: ${config.headingStack};`,
	`  --${p}font-body: ${config.bodyStack};`,
	`  --${p}font-mono: ${config.monoStack};`,
	...FONT_WEIGHTS.map(
		(w) => `  --${p}font-weight-${w.label}: ${w.value};`
	),
]

export const toCss = (config: FoundationsConfig, prefix = ''): string => {
	const p = withPrefix(prefix)
	const lines = [
		'  /* Corner radii */',
		...generateRadii(config).map(
			(r) => `  --${p}radius-${r.label}: ${r.px}px;`
		),
		'',
		'  /* Border widths */',
		...generateBorders(config).map(
			(b) => `  --${p}border-${b.label}: ${b.px}px;`
		),
		'',
		'  /* Elevation */',
		...generateElevation(config, 'light').map(
			(e) => `  --${p}${e.label}: ${elevationCss(e)};`
		),
		'',
		'  /* Fonts */',
		...fontVarLines(config, p),
		'',
		'  /* Motion */',
		...durations(config).map(
			(d) => `  --${p}duration-${d.label}: ${d.ms}ms;`
		),
		...EASINGS.map(
			(e) => `  --${p}ease-${e.label}: ${easingCss(e.bezier)};`
		),
	]
	const dark = generateElevation(config, 'dark')
		.map((e) => `    --${p}${e.label}: ${elevationCss(e)};`)
		.join('\n')
	return [
		`:root {\n${lines.join('\n')}\n}`,
		'',
		'@media (prefers-color-scheme: dark) {',
		'  :root {',
		dark,
		'  }',
		'}',
	].join('\n')
}

export const toTailwind = (config: FoundationsConfig, prefix = ''): string => {
	const p = withPrefix(prefix)
	const lines = [
		'  /* rounded-* utilities */',
		...generateRadii(config).map(
			(r) => `  --radius-${p}${r.label}: ${r.px}px;`
		),
		'',
		'  /* border widths (use as var(--border-width-…)) */',
		...generateBorders(config).map(
			(b) => `  --border-width-${p}${b.label}: ${b.px}px;`
		),
		'',
		'  /* shadow-elevation-* utilities */',
		...generateElevation(config, 'light').map(
			(e) => `  --shadow-${p}${e.label}: ${elevationCss(e)};`
		),
		'',
		'  /* font-* utilities + weights */',
		`  --font-${p}heading: ${config.headingStack};`,
		`  --font-${p}body: ${config.bodyStack};`,
		`  --font-${p}mono: ${config.monoStack};`,
		...FONT_WEIGHTS.map(
			(w) => `  --font-weight-${p}${w.label}: ${w.value};`
		),
		'',
		'  /* motion (ease-* utilities; durations as vars) */',
		...durations(config).map(
			(d) => `  --duration-${p}${d.label}: ${d.ms}ms;`
		),
		...EASINGS.map(
			(e) => `  --ease-${p}${e.label}: ${easingCss(e.bezier)};`
		),
	]
	const dark = generateElevation(config, 'dark')
		.map((e) => `  --shadow-${p}${e.label}: ${elevationCss(e)};`)
		.join('\n')
	return `@theme {\n${lines.join('\n')}\n}\n\n.dark {\n${dark}\n}`
}

// DTCG 2025.10 token objects. Radii/borders are px dimensions; elevation is
// the `shadow` composite type (color object + dimension objects per layer)
// under top-level light/dark mode groups (Figma modes, matching the color
// tool); fonts are fontFamily/fontWeight; motion is duration/cubicBezier.
const pxDimension = (px: number) => ({
	$type: 'dimension' as const,
	$value: { value: px, unit: 'px' as const },
})

const shadowToken = (token: ElevationToken) => ({
	$type: 'shadow' as const,
	$value: token.layers.map((l) => ({
		color: colorUtils.hexToDtcgColor(l.color, l.alpha),
		offsetX: { value: l.x, unit: 'px' as const },
		offsetY: { value: l.y, unit: 'px' as const },
		blur: { value: l.blur, unit: 'px' as const },
		spread: { value: l.spread, unit: 'px' as const },
	})),
})

export const foundationsTokensObject = (
	config: FoundationsConfig,
	prefix = ''
): Record<string, unknown> => {
	const radius: Record<string, unknown> = {}
	for (const r of generateRadii(config)) radius[r.label] = pxDimension(r.px)

	const border: Record<string, unknown> = {}
	for (const b of generateBorders(config)) border[b.label] = pxDimension(b.px)

	const elevation = (mode: 'light' | 'dark') => {
		const group: Record<string, unknown> = {}
		for (const e of generateElevation(config, mode)) {
			// Keyed 1–5 under an `elevation` group.
			group[e.label.replace('elevation-', '')] = shadowToken(e)
		}
		return group
	}

	const font: Record<string, unknown> = {
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

	const motion: Record<string, unknown> = {
		duration: Object.fromEntries(
			durations(config).map((d) => [
				d.label,
				{ $type: 'duration', $value: { value: d.ms, unit: 'ms' } },
			])
		),
		easing: Object.fromEntries(
			EASINGS.map((e) => [
				e.label,
				{ $type: 'cubicBezier', $value: e.bezier },
			])
		),
	}

	const staticGroups: Record<string, unknown> = { radius, border, font, motion }
	const wrap = (g: Record<string, unknown>) =>
		prefix ? { [prefix]: g } : g
	return {
		light: wrap({ elevation: elevation('light') }),
		dark: wrap({ elevation: elevation('dark') }),
		...(prefix ? { [prefix]: staticGroups } : staticGroups),
	}
}

export const toTokens = (config: FoundationsConfig, prefix = ''): string =>
	JSON.stringify(foundationsTokensObject(config, prefix), null, 2)

// --- Shareable config serialization ---
// Pipe-separated (font stacks contain commas): the seven numbers, the shadow
// hex (no '#'), then the three URI-encoded stacks. Malformed input decodes to
// null so the caller falls back to the default.

export const encodeFoundations = (config: FoundationsConfig): string =>
	[
		config.radiusBase,
		config.borderBase,
		config.shadowIntensity,
		config.durationFast,
		config.durationBase,
		config.durationSlow,
		config.shadowColor.replace('#', ''),
		encodeURIComponent(config.headingStack),
		encodeURIComponent(config.bodyStack),
		encodeURIComponent(config.monoStack),
	].join('|')

export const decodeFoundations = (
	encoded: string
): FoundationsConfig | null => {
	if (!encoded) return null
	const parts = encoded.split('|')
	if (parts.length !== 10) return null
	const nums = parts.slice(0, 6).map((n) => parseFloat(n))
	if (nums.some((n) => !Number.isFinite(n) || n < 0)) return null
	if (!/^[0-9a-fA-F]{6}$/.test(parts[6])) return null
	const [radiusBase, borderBase, shadowIntensity, fast, base, slow] = nums
	try {
		return {
			radiusBase,
			borderBase,
			shadowIntensity: Math.min(2, Math.max(0.5, shadowIntensity)),
			durationFast: fast,
			durationBase: base,
			durationSlow: slow,
			shadowColor: `#${parts[6].toUpperCase()}`,
			headingStack: decodeURIComponent(parts[7]),
			bodyStack: decodeURIComponent(parts[8]),
			monoStack: decodeURIComponent(parts[9]),
		}
	} catch {
		// Malformed percent-encoding in a stack.
		return null
	}
}
