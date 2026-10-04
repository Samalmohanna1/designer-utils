// The foundations engine: corner radii, border widths, elevation shadows,
// and motion tokens — the token layers a design system needs beyond
// color/type/space (font stacks live with the type scale). Pure functions,
// no DOM; the one place foundations logic lives (mirrors colorUtils /
// typeScale / spaceScale).

import { colorUtils } from './colorUtils.ts'
import { withPrefix } from './typeScale.ts'

export interface FoundationsConfig {
	radiusBase: number // px — the `md` radius; the ladder scales off it
	borderBase: number // px — the `s` width; the T-shirt ladder scales off it
	borderSteps: number // how many T-shirt sizes to emit (1..BORDER_LADDER)
	shadowColor: string // hex — tint for every elevation shadow in light mode
	shadowColorDark: string // hex — the dark-mode tint, picked independently
	shadowIntensity: number // 0.5–2 multiplier on shadow opacity
	durationFast: number // ms
	durationBase: number // ms
	durationSlow: number // ms
}

export const DEFAULT_FOUNDATIONS: FoundationsConfig = {
	radiusBase: 8,
	borderBase: 1,
	borderSteps: 3,
	shadowColor: '#000000',
	shadowColorDark: '#000000',
	shadowIntensity: 1,
	durationFast: 150,
	durationBase: 250,
	durationSlow: 400,
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
// T-shirt ladder off the base (`s`). borderSteps controls how many sizes are
// emitted, so a system can grow past the default s/m/l.
export const BORDER_LADDER: { label: string; multiplier: number }[] = [
	{ label: 's', multiplier: 1 },
	{ label: 'm', multiplier: 2 },
	{ label: 'l', multiplier: 4 },
	{ label: 'xl', multiplier: 6 },
	{ label: '2xl', multiplier: 8 },
	{ label: '3xl', multiplier: 12 },
	{ label: '4xl', multiplier: 16 },
]

export interface BorderToken {
	label: string
	px: number
}

export const generateBorders = (config: FoundationsConfig): BorderToken[] =>
	BORDER_LADDER.slice(
		0,
		Math.min(BORDER_LADDER.length, Math.max(1, Math.round(config.borderSteps)))
	).map(({ label, multiplier }) => ({
		label,
		px: Math.round(config.borderBase * multiplier * 100) / 100,
	}))

// --- Elevation ---
// Five levels, each two stacked shadows: a `key` shadow (directional, grows
// with height) and an `ambient` shadow (soft, close). Geometry is fixed;
// opacity scales with the intensity control. The dark variant keeps the
// geometry, takes its own tint, and raises opacity — shadows need more
// contrast on dark surfaces.
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
	const color =
		mode === 'dark' ? config.shadowColorDark : config.shadowColor
	return ELEVATION_GEOMETRY.map((geo, i) => ({
		label: `elevation-${i + 1}`,
		layers: [
			{
				x: 0,
				y: geo.key.y,
				blur: geo.key.blur,
				spread: 0,
				color,
				alpha: roundAlpha(KEY_ALPHA * factor),
			},
			{
				x: 0,
				y: geo.ambient.y,
				blur: geo.ambient.blur,
				spread: 1,
				color,
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

	const staticGroups: Record<string, unknown> = { radius, border, motion }
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

// --- Figma paste (SVG) ---
// Figma has no variable type for shadows or easing curves, so they can't ride
// along in the token files. This draws them as real layers instead: each
// elevation card carries its shadows as stacked <feDropShadow> primitives,
// which Figma imports as drop-shadow effects — select a card, "Create style
// from selection", and the effect style is named to match the token. The
// easing curves are documentation: the plotted path plus its cubic-bezier().

const CARD = 96
const CARD_GAP = 28
const SVG_PAD = 28
const ROW_LABEL_H = 34

const dropShadowFilter = (token: ElevationToken, id: string): string =>
	`<filter id="${id}" x="-60%" y="-60%" width="220%" height="220%" ` +
	`color-interpolation-filters="sRGB">` +
	token.layers
		.map((l) => {
			const [r, g, b] = colorUtils.hexToRgb(l.color)
			return (
				`<feDropShadow dx="${l.x}" dy="${l.y}" ` +
				`stdDeviation="${l.blur / 2}" ` +
				`flood-color="rgb(${r}, ${g}, ${b})" flood-opacity="${l.alpha}"/>`
			)
		})
		.join('') +
	`</filter>`

// One mode's five elevation cards on the surface that mode actually uses, so
// the shadow reads the way it will in the product.
const elevationRowSvg = (
	config: FoundationsConfig,
	mode: 'light' | 'dark',
	y: number,
	radius: number
): { defs: string; body: string; width: number; height: number } => {
	const tokens = generateElevation(config, mode)
	const surface = mode === 'dark' ? '#1A1614' : '#FBFAF7'
	const cardFill = mode === 'dark' ? '#241F1B' : '#FFFFFF'
	const ink = mode === 'dark' ? '#E8E0D4' : '#1A1A1A'
	const esc = colorUtils.escapeXml
	const width =
		SVG_PAD * 2 + tokens.length * CARD + (tokens.length - 1) * CARD_GAP
	const height = ROW_LABEL_H + CARD + SVG_PAD * 2
	const defs = tokens
		.map((t, i) => dropShadowFilter(t, `elevation-${mode}-${i + 1}`))
		.join('')
	const cards = tokens
		.map((t, i) => {
			const x = SVG_PAD + i * (CARD + CARD_GAP)
			const cy = y + ROW_LABEL_H + SVG_PAD / 2
			const label = `${t.label}-${mode}`
			return (
				`<g id="${esc(label)}">` +
				`<title>${esc(label)}: ${esc(elevationCss(t))}</title>` +
				`<rect x="${x}" y="${cy}" width="${CARD}" height="${CARD}" rx="${radius}" ` +
				`fill="${cardFill}" filter="url(#elevation-${mode}-${i + 1})"/>` +
				`<text x="${x + CARD / 2}" y="${cy + CARD / 2 + 5}" text-anchor="middle" ` +
				`font-family="sans-serif" font-size="14" font-weight="700" fill="${ink}">` +
				`${i + 1}</text>` +
				`</g>`
			)
		})
		.join('')
	const heading =
		`<text x="${SVG_PAD}" y="${y + 22}" font-family="sans-serif" ` +
		`font-size="15" font-weight="700" fill="${ink}">` +
		`Elevation — ${mode}</text>`
	const bg = `<rect x="0" y="${y}" width="${width}" height="${height}" fill="${surface}"/>`
	return {
		defs,
		body: `<g id="elevation-${mode}">${bg}${heading}${cards}</g>`,
		width,
		height,
	}
}

// A cubic-bezier plotted in a unit box: the curve itself, plus the CSS value
// so the number is right there when the designer wires up a prototype.
const easingCardSvg = (
	easing: { label: string; bezier: [number, number, number, number] },
	x: number,
	y: number
): string => {
	const S = CARD
	const [x1, y1, x2, y2] = easing.bezier
	const esc = colorUtils.escapeXml
	// SVG y grows downward, so the curve is drawn from the bottom-left corner.
	const path =
		`M 0 ${S} C ${x1 * S} ${S - y1 * S} ${x2 * S} ${S - y2 * S} ${S} 0`
	return (
		`<g id="ease-${esc(easing.label)}" transform="translate(${x},${y})">` +
		`<title>ease-${esc(easing.label)}: ${esc(easingCss(easing.bezier))}</title>` +
		`<rect x="0" y="0" width="${S}" height="${S}" rx="6" fill="#FFFFFF" stroke="#D8D5CE"/>` +
		`<path d="${path}" fill="none" stroke="#2F6FB0" stroke-width="2"/>` +
		`<text x="0" y="${S + 18}" font-family="sans-serif" font-size="13" ` +
		`font-weight="700" fill="#1A1A1A">ease-${esc(easing.label)}</text>` +
		`<text x="0" y="${S + 34}" font-family="monospace" font-size="11" ` +
		`fill="#555555">${esc(easingCss(easing.bezier))}</text>` +
		`</g>`
	)
}

// The whole non-variable half of the foundations as one pasteable SVG.
export const foundationsToSvg = (config: FoundationsConfig): string => {
	const radius = Math.min(
		CARD / 2,
		generateRadii(config).find((r) => r.label === 'md')?.px ?? 8
	)
	const light = elevationRowSvg(config, 'light', 0, radius)
	const dark = elevationRowSvg(config, 'dark', light.height, radius)
	const easingTop = light.height + dark.height
	const easingH = ROW_LABEL_H + CARD + 44 + SVG_PAD
	const easings = EASINGS.map((e, i) =>
		easingCardSvg(e, SVG_PAD + i * (CARD + CARD_GAP), easingTop + ROW_LABEL_H)
	).join('')
	const easingHeading =
		`<text x="${SVG_PAD}" y="${easingTop + 22}" font-family="sans-serif" ` +
		`font-size="15" font-weight="700" fill="#1A1A1A">Easing curves</text>`
	const width = Math.max(light.width, dark.width)
	const height = easingTop + easingH
	const easingBg = `<rect x="0" y="${easingTop}" width="${width}" height="${easingH}" fill="#FBFAF7"/>`
	return colorUtils.wrapSvg(
		`<defs>${light.defs}${dark.defs}</defs>` +
			light.body +
			dark.body +
			`<g id="easings">${easingBg}${easingHeading}${easings}</g>`,
		width,
		height
	)
}

// --- Shareable config serialization ---
// Pipe-separated: seven numbers, the light shadow hex, then the dark one (no
// '#'). Two older formats still decode, both predating a separate dark tint,
// so dark falls back to the light hex and renders exactly as those links did:
// 8 parts (one hex), and 10 parts that carried three font stacks (now owned
// by the type tool) and no borderSteps. Malformed input decodes to null so
// the caller falls back.

export const encodeFoundations = (config: FoundationsConfig): string =>
	[
		config.radiusBase,
		config.borderBase,
		config.borderSteps,
		config.shadowIntensity,
		config.durationFast,
		config.durationBase,
		config.durationSlow,
		config.shadowColor.replace('#', ''),
		config.shadowColorDark.replace('#', ''),
	].join('|')

export const decodeFoundations = (
	encoded: string
): FoundationsConfig | null => {
	if (!encoded) return null
	const parts = encoded.split('|')
	// Current: 9 parts. Previous: 8 (no dark hex). Legacy: 10 parts, where
	// index 2 was shadowIntensity, 6 the hex, and 7-9 the font stacks.
	const isLegacy = parts.length === 10
	if (parts.length !== 9 && parts.length !== 8 && !isLegacy) return null
	const numeric = isLegacy
		? [parts[0], parts[1], '3', ...parts.slice(2, 6)]
		: parts.slice(0, 7)
	const hex = isLegacy ? parts[6] : parts[7]
	const darkHex = parts.length === 9 ? parts[8] : hex
	const nums = numeric.map((n) => parseFloat(n))
	if (nums.some((n) => !Number.isFinite(n) || n < 0)) return null
	if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null
	if (!/^[0-9a-fA-F]{6}$/.test(darkHex)) return null
	const [radiusBase, borderBase, borderSteps, shadowIntensity, fast, base, slow] =
		nums
	return {
		radiusBase,
		borderBase,
		borderSteps: Math.min(
			BORDER_LADDER.length,
			Math.max(1, Math.round(borderSteps))
		),
		shadowIntensity: Math.min(2, Math.max(0.5, shadowIntensity)),
		durationFast: fast,
		durationBase: base,
		durationSlow: slow,
		shadowColor: `#${hex.toUpperCase()}`,
		shadowColorDark: `#${darkHex.toUpperCase()}`,
	}
}
