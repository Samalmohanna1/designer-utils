// The unified "whole system" export and serialization: every tool section's
// live state merged into one CSS block, one Tailwind @theme, or one DTCG token
// file — plus the combined URL-hash codec and the localStorage autosave reader
// the single-page island uses.
//
// Token mode strategy (documented in CLAUDE.md): top-level `light`/`dark`
// groups hold the theme-dependent layers (color, elevation), top-level
// `min`/`max` hold the viewport-dependent layers (font-size, space, grid),
// and the static layers (radius, border, font, motion) sit at the top level.

import { colorUtils, type ColorValueFormat } from './colorUtils'
import {
	DEFAULT_TYPE_CONFIG,
	decodeConfig,
	encodeConfig,
	fontImports,
	generateTypeScale,
	toCss as typeCss,
	toTailwind as typeTailwind,
	typeTokensObject,
	type TypeScaleConfig,
} from './typeScale'
import {
	DEFAULT_SPACE,
	DEFAULT_GRID,
	decodeSpaceGrid,
	encodeSpaceGrid,
	generateSpaceSizes,
	generateSpacePairs,
	computeGrid,
	gutterClampFor,
	toCss as spaceCss,
	toTailwind as spaceTailwind,
	spaceTokensObject,
	type SpaceConfig,
	type GridConfig,
} from './spaceScale'
import {
	DEFAULT_FOUNDATIONS,
	decodeFoundations,
	encodeFoundations,
	toCss as foundationsCss,
	toTailwind as foundationsTailwind,
	foundationsTokensObject,
	type FoundationsConfig,
} from './foundations'

export const STORAGE_KEYS = {
	// The color key predates the suite naming; kept for existing autosaves.
	palette: 'color-scale-generator:palette',
	type: 'designer-utils:type-scale',
	space: 'designer-utils:space-grid',
	foundations: 'designer-utils:foundations',
} as const

export interface SystemState {
	palette: { name: string; color: string }[]
	type: TypeScaleConfig
	space: SpaceConfig
	grid: GridConfig
	foundations: FoundationsConfig
}

export const defaultPalette = (): { name: string; color: string }[] => {
	const color = colorUtils.defaultColorForIndex(0)
	return [{ name: colorUtils.nameFromHex(color), color }]
}

// --- Combined URL-hash codec ---
// The single page serializes every section into one hash of &-joined
// segments: `#p=<palette>&t=<type>&s=<space+grid>&f=<foundations>`. Segment
// keys match the old per-page prefixes, so a legacy single-tool link
// (`#t=…`) parses as a one-segment hash. Segments whose encoding equals the
// default are omitted to keep share links short. Segment values never
// contain a raw '&': palette names are slugified, type stacks/URL are
// URI-encoded, and the other segments are numeric.

const SEGMENT_ORDER = ['p', 't', 's', 'f'] as const
type SegmentKey = (typeof SEGMENT_ORDER)[number]

const defaultEncoded = (): Record<SegmentKey, string> => ({
	p: colorUtils.encodePalette(defaultPalette()),
	t: encodeConfig(DEFAULT_TYPE_CONFIG),
	s: encodeSpaceGrid(DEFAULT_SPACE, DEFAULT_GRID),
	f: encodeFoundations(DEFAULT_FOUNDATIONS),
})

export const encodeSystemHash = (
	encoded: Record<SegmentKey, string>
): string => {
	const defaults = defaultEncoded()
	return SEGMENT_ORDER.filter((k) => encoded[k] !== defaults[k])
		.map((k) => `${k}=${encoded[k]}`)
		.join('&')
}

// The decoded segments a hash carries (each optional — a segment is present
// only when it decodes to something valid).
export interface SystemHashParts {
	palette?: { name: string; color: string }[]
	type?: TypeScaleConfig
	spaceGrid?: { space: SpaceConfig; grid: GridConfig }
	foundations?: FoundationsConfig
}

export const decodeSystemHash = (encoded: string): SystemHashParts | null => {
	const parts: SystemHashParts = {}
	for (const segment of encoded.split('&')) {
		const eq = segment.indexOf('=')
		if (eq < 1) continue
		const key = segment.slice(0, eq)
		const value = segment.slice(eq + 1)
		if (!value) continue
		if (key === 'p') {
			const entries = colorUtils.decodePalette(value)
			if (entries.length > 0) parts.palette = entries
		} else if (key === 't') {
			const config = decodeConfig(value)
			if (config) parts.type = config
		} else if (key === 's') {
			const spaceGrid = decodeSpaceGrid(value)
			if (spaceGrid) parts.spaceGrid = spaceGrid
		} else if (key === 'f') {
			const config = decodeFoundations(value)
			if (config) parts.foundations = config
		}
	}
	return Object.keys(parts).length > 0 ? parts : null
}

// The previous session's autosave (each tool's localStorage key), decoded.
// Segments equal to the default are dropped — only real user state counts,
// so the restore banner never offers to "restore" the defaults. Client-only.
export const readSavedSystem = (): SystemHashParts | null => {
	const read = (key: string): string | null => {
		try {
			return window.localStorage.getItem(key)
		} catch {
			return null
		}
	}
	const defaults = defaultEncoded()
	const parts: SystemHashParts = {}

	const palette = read(STORAGE_KEYS.palette)
	if (palette && palette !== defaults.p) {
		const entries = colorUtils.decodePalette(palette)
		if (entries.length > 0) parts.palette = entries
	}
	const type = read(STORAGE_KEYS.type)
	if (type && type !== defaults.t) {
		const config = decodeConfig(type)
		if (config) parts.type = config
	}
	const space = read(STORAGE_KEYS.space)
	if (space && space !== defaults.s) {
		const spaceGrid = decodeSpaceGrid(space)
		if (spaceGrid) parts.spaceGrid = spaceGrid
	}
	const foundations = read(STORAGE_KEYS.foundations)
	if (foundations && foundations !== defaults.f) {
		const config = decodeFoundations(foundations)
		if (config) parts.foundations = config
	}
	return Object.keys(parts).length > 0 ? parts : null
}

// --- Merged export builders ---

const spaceParts = (state: SystemState) => {
	const sizes = generateSpaceSizes(state.space)
	const pairs = generateSpacePairs(state.space)
	const grid = computeGrid(state.grid)
	const gutter = gutterClampFor(state.grid)
	return { sizes, pairs, grid, gutter }
}

// @import must precede every other rule in a stylesheet, so the font imports
// (Google Fonts / custom stylesheet) are hoisted above the merged sections.
const importHeader = (state: SystemState): string[] => {
	const imports = fontImports(state.type)
	return imports.length > 0 ? [...imports, ''] : []
}

export const systemCss = (
	state: SystemState,
	colorFormat: ColorValueFormat = 'hex',
	prefix = ''
): string => {
	const data = colorUtils.paletteShadeData(state.palette)
	const { sizes, pairs, grid, gutter } = spaceParts(state)
	return [
		...importHeader(state),
		'/* ===== Color ===== */',
		colorUtils.paletteCss(data, colorFormat, prefix),
		'',
		'/* ===== Type ===== */',
		typeCss(generateTypeScale(state.type), state.type, prefix),
		'',
		'/* ===== Space & Grid ===== */',
		spaceCss(sizes, pairs, grid, gutter, prefix),
		'',
		'/* ===== Foundations ===== */',
		foundationsCss(state.foundations, prefix),
	].join('\n')
}

export const systemTailwind = (
	state: SystemState,
	colorFormat: ColorValueFormat = 'hex',
	prefix = ''
): string => {
	const data = colorUtils.paletteShadeData(state.palette)
	const { sizes, pairs, grid, gutter } = spaceParts(state)
	// Tailwind 4 merges repeated @theme blocks, so the sections stay readable.
	return [
		...importHeader(state),
		'/* ===== Color ===== */',
		colorUtils.paletteTailwind(data, colorFormat, prefix),
		'',
		'/* ===== Type ===== */',
		typeTailwind(generateTypeScale(state.type), state.type, prefix),
		'',
		'/* ===== Space & Grid ===== */',
		spaceTailwind(sizes, pairs, grid, gutter, prefix),
		'',
		'/* ===== Foundations ===== */',
		foundationsTailwind(state.foundations, prefix),
	].join('\n')
}

// The Markdown style guide documents the color palette (the other layers
// have no Markdown representation).
export const systemMarkdown = (state: SystemState): string =>
	colorUtils.paletteMarkdown(colorUtils.paletteShadeData(state.palette))

// Merge two token trees one group level deep, so e.g. color's `light` group
// and elevation's `light` group land in the same top-level mode group (and,
// with a prefix, the nested prefix groups merge instead of clobbering).
const mergeGroups = (
	...trees: Record<string, unknown>[]
): Record<string, unknown> => {
	const out: Record<string, unknown> = {}
	for (const tree of trees) {
		for (const [key, value] of Object.entries(tree)) {
			const existing = out[key]
			out[key] =
				existing &&
				typeof existing === 'object' &&
				value &&
				typeof value === 'object'
					? mergeGroups(
							existing as Record<string, unknown>,
							value as Record<string, unknown>
					  )
					: value
		}
	}
	return out
}

export const systemTokens = (state: SystemState, prefix = ''): string => {
	const data = colorUtils.paletteShadeData(state.palette)
	const { sizes, pairs, grid } = spaceParts(state)
	const merged = mergeGroups(
		colorUtils.paletteTokensObject(data, prefix),
		typeTokensObject(generateTypeScale(state.type), state.type, prefix),
		spaceTokensObject(sizes, pairs, grid, prefix),
		foundationsTokensObject(state.foundations, prefix)
	)
	return JSON.stringify(merged, null, 2)
}
