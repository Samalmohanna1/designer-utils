// Fluid space + grid math, mirroring Utopia's Space and Grid calculators.
// Sizes are baseSize × multiplier, fluid between two viewports via clamp().
// Reuses the type tool's clamp/rounding so all the fluid math lives in one
// place (see typeScale.ts). The one place space/grid logic lives.

import { clampFor, pxToRem, round } from './typeScale'

export interface SpaceConfig {
	minViewport: number // px
	maxViewport: number // px
	minBase: number // base space at the min viewport (px)
	maxBase: number // base space at the max viewport (px)
}

// The T-shirt size ladder: label + multiplier applied to the base. With an 8pt
// base (16) these land on a 4/8pt grid: 4 8 12 16 24 32 48 64 96.
export const SPACE_SIZES: { label: string; multiplier: number }[] = [
	{ label: '3xs', multiplier: 0.25 },
	{ label: '2xs', multiplier: 0.5 },
	{ label: 'xs', multiplier: 0.75 },
	{ label: 's', multiplier: 1 },
	{ label: 'm', multiplier: 1.5 },
	{ label: 'l', multiplier: 2 },
	{ label: 'xl', multiplier: 3 },
	{ label: '2xl', multiplier: 4 },
	{ label: '3xl', multiplier: 6 },
]

export interface SpaceSize {
	label: string
	minSize: number // px at minViewport
	maxSize: number // px at maxViewport
	clamp: string
}

export interface SpacePair {
	label: string // e.g. `2xs-xs`
	from: string
	to: string
	minSize: number // the smaller size's @min
	maxSize: number // the larger size's @max
	clamp: string
}

// Every size as { label, min px, max px, clamp() }.
export const generateSpaceSizes = (config: SpaceConfig): SpaceSize[] => {
	const { minViewport, maxViewport, minBase, maxBase } = config
	return SPACE_SIZES.map(({ label, multiplier }) => {
		const minSize = minBase * multiplier
		const maxSize = maxBase * multiplier
		return {
			label,
			minSize,
			maxSize,
			clamp: clampFor(minSize, maxSize, minViewport, maxViewport),
		}
	})
}

// One-up pairs (3xs-2xs, 2xs-xs, …): fluid from the smaller size's @min to the
// larger size's @max, so spacing grows a notch as the viewport widens.
export const generateSpacePairs = (config: SpaceConfig): SpacePair[] => {
	const sizes = generateSpaceSizes(config)
	const pairs: SpacePair[] = []
	for (let i = 0; i < sizes.length - 1; i++) {
		const a = sizes[i]
		const b = sizes[i + 1]
		pairs.push({
			label: `${a.label}-${b.label}`,
			from: a.label,
			to: b.label,
			minSize: a.minSize,
			maxSize: b.maxSize,
			clamp: clampFor(
				a.minSize,
				b.maxSize,
				config.minViewport,
				config.maxViewport
			),
		})
	}
	return pairs
}

// --- Grid ---

export interface GridConfig {
	minViewport: number
	maxViewport: number
	containerMax: number // max container width (px)
	minGutter: number // gutter at the min viewport (px)
	maxGutter: number // gutter at the max viewport (px)
	columnMax: number // a column's max width (px)
	columns: number
	roundMinColumn: 'none' | 'up' | 'down'
}

// A column's width at a viewport: (container - (cols+1) gutters) / cols. The
// container has one gutter of inline padding each side, plus gutters between
// columns — so (columns + 1) gutters total. @min may be fractional, hence the
// optional rounding (Utopia rounds the @min column up/down for whole pixels).
export const columnWidth = (
	container: number,
	gutter: number,
	columns: number
): number => (container - (columns + 1) * gutter) / columns

export interface GridResult {
	minContainer: number
	maxContainer: number
	minGutter: number
	maxGutter: number
	minColumn: number
	maxColumn: number
	minColumnRounded: number // after roundMinColumn
	columns: number
}

export const computeGrid = (config: GridConfig): GridResult => {
	const {
		minViewport,
		containerMax,
		minGutter,
		maxGutter,
		columns,
		roundMinColumn,
	} = config
	// At @min the container is the min viewport; at @max it's the container max.
	const minContainer = minViewport
	const maxContainer = containerMax
	const minColumn = columnWidth(minContainer, minGutter, columns)
	const maxColumn = columnWidth(maxContainer, maxGutter, columns)
	const minColumnRounded =
		roundMinColumn === 'up'
			? Math.ceil(minColumn)
			: roundMinColumn === 'down'
				? Math.floor(minColumn)
				: minColumn
	return {
		minContainer,
		maxContainer,
		minGutter,
		maxGutter,
		minColumn,
		maxColumn,
		minColumnRounded,
		columns,
	}
}

// --- Exports (CSS / Tailwind 4 / Design Tokens), matching the type tool ---

const spaceVarLines = (
	sizes: SpaceSize[],
	pairs: SpacePair[],
	prefix: string
): string => {
	const sizeLines = sizes.map((s) => `  --${prefix}-${s.label}: ${s.clamp};`)
	const pairLines = pairs.map((p) => `  --${prefix}-${p.label}: ${p.clamp};`)
	return [
		...sizeLines,
		'',
		'  /* One-up pairs */',
		...pairLines,
	].join('\n')
}

// :root custom properties for the space scale, plus the grid block.
export const toCss = (
	sizes: SpaceSize[],
	pairs: SpacePair[],
	grid: GridResult,
	gutterClamp: string
): string => {
	const space = `:root {\n${spaceVarLines(sizes, pairs, 'space')}\n}`
	const gridBlock =
		`:root {\n` +
		`  --grid-max-width: ${pxToRem(grid.maxContainer)};\n` +
		`  --grid-gutter: ${gutterClamp};\n` +
		`  --grid-columns: ${grid.columns};\n` +
		`}\n\n` +
		`.u-container {\n` +
		`  max-width: var(--grid-max-width);\n` +
		`  padding-inline: var(--grid-gutter);\n` +
		`  margin-inline: auto;\n` +
		`}\n\n` +
		`.u-grid {\n` +
		`  display: grid;\n` +
		`  gap: var(--grid-gutter);\n` +
		`}`
	return `${space}\n\n${gridBlock}`
}

// Tailwind 4 @theme: --spacing-<label> so each becomes a spacing utility
// (p-s, gap-m, …) and --container-* for the grid, matching the repo convention.
export const toTailwind = (
	sizes: SpaceSize[],
	pairs: SpacePair[],
	grid: GridResult,
	gutterClamp: string
): string => {
	const lines = [
		...sizes.map((s) => `  --spacing-${s.label}: ${s.clamp};`),
		'',
		'  /* One-up pairs */',
		...pairs.map((p) => `  --spacing-${p.label}: ${p.clamp};`),
		'',
		'  /* Grid */',
		`  --grid-max-width: ${pxToRem(grid.maxContainer)};`,
		`  --grid-gutter: ${gutterClamp};`,
		`  --grid-columns: ${grid.columns};`,
	]
	return `@theme {\n${lines.join('\n')}\n}`
}

// W3C Design Tokens (DTCG): dimension tokens for sizes + pairs under a
// `space` group, and the grid values under a `grid` group.
export const toTokens = (
	sizes: SpaceSize[],
	pairs: SpacePair[],
	grid: GridResult,
	gutterClamp: string
): string => {
	const space: Record<string, { $type: 'dimension'; $value: string }> = {}
	for (const s of sizes) {
		space[s.label] = { $type: 'dimension', $value: s.clamp }
	}
	for (const p of pairs) {
		space[p.label] = { $type: 'dimension', $value: p.clamp }
	}
	const gridGroup = {
		'max-width': {
			$type: 'dimension' as const,
			$value: pxToRem(grid.maxContainer),
		},
		gutter: { $type: 'dimension' as const, $value: gutterClamp },
		columns: { $type: 'number' as const, $value: grid.columns },
	}
	return JSON.stringify({ space, grid: gridGroup }, null, 2)
}

// The gutter is itself a fluid value (min gutter -> max gutter), reused by the
// grid CSS and the preview.
export const gutterClampFor = (config: GridConfig): string =>
	clampFor(
		config.minGutter,
		config.maxGutter,
		config.minViewport,
		config.maxViewport
	)

// px formatted for display, trimming trailing zeros (e.g. "7.17px", "60px").
export const px = (n: number): string => `${round(n, 2)}px`

// --- Shareable config serialization (space + grid) ---
// The combined config encodes to a fixed comma-separated list for the URL hash.
// Order is locked; decodeConfig drops malformed input so the caller falls back
// to the default. Mirrors typeScale's encodeConfig/decodeConfig.

const ROUND_CODES = { none: 0, up: 1, down: 2 } as const
const ROUND_FROM_CODE: GridConfig['roundMinColumn'][] = ['none', 'up', 'down']

export const encodeSpaceGrid = (
	space: SpaceConfig,
	grid: GridConfig
): string =>
	[
		space.minViewport,
		space.maxViewport,
		space.minBase,
		space.maxBase,
		grid.containerMax,
		grid.minGutter,
		grid.maxGutter,
		grid.columnMax,
		grid.columns,
		ROUND_CODES[grid.roundMinColumn],
	].join(',')

export const decodeSpaceGrid = (
	encoded: string
): { space: SpaceConfig; grid: GridConfig } | null => {
	if (!encoded) return null
	const p = encoded.split(',').map((x) => parseFloat(x.trim()))
	if (p.length !== 10 || p.some((n) => !Number.isFinite(n))) return null
	const [minV, maxV, minB, maxB, cMax, minG, maxG, colMax, cols, roundCode] = p
	const space: SpaceConfig = {
		minViewport: minV,
		maxViewport: maxV,
		minBase: minB,
		maxBase: maxB,
	}
	const grid: GridConfig = {
		minViewport: minV,
		maxViewport: maxV,
		containerMax: cMax,
		minGutter: minG,
		maxGutter: maxG,
		columnMax: colMax,
		columns: Math.max(1, Math.round(cols)),
		roundMinColumn: ROUND_FROM_CODE[roundCode] ?? 'none',
	}
	return { space, grid }
}
