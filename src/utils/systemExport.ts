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

const systemTokenTree = (
	state: SystemState,
	prefix: string
): Record<string, unknown> => {
	const data = colorUtils.paletteShadeData(state.palette)
	const { sizes, pairs, grid } = spaceParts(state)
	return mergeGroups(
		colorUtils.paletteTokensObject(data, prefix),
		typeTokensObject(generateTypeScale(state.type), state.type, prefix),
		spaceTokensObject(sizes, pairs, grid, prefix),
		foundationsTokensObject(state.foundations, prefix)
	)
}

// --- Figma variable import ---
// Figma's importer takes only part of DTCG, so the token files are shaped for
// it rather than emitted verbatim (the CSS/Tailwind exports keep the rem/ms/
// stack values). Three value rules — dimensions in px, durations in seconds,
// fontFamily a single name, not an array — plus two token types it has no
// variable for at all. Those are dropped here and carried into Figma as
// pasteable layers instead (foundations.foundationsToSvg).
export const FIGMA_UNSUPPORTED = [
	{ type: 'shadow', label: 'Elevation shadows', carrier: 'effect styles' },
	{ type: 'cubicBezier', label: 'Easing curves', carrier: 'documentation' },
] as const

const UNSUPPORTED_TYPES: readonly string[] = FIGMA_UNSUPPORTED.map(
	(u) => u.type
)

const roundTo = (n: number, places = 3): number =>
	Math.round(n * 10 ** places) / 10 ** places

const isToken = (n: unknown): n is Record<string, unknown> =>
	!!n && typeof n === 'object' && '$type' in (n as Record<string, unknown>)

// Reshapes one token for Figma, or returns null when Figma has no variable
// type for it. Values the importer already accepts pass through untouched.
const figmaToken = (
	token: Record<string, unknown>
): Record<string, unknown> | null => {
	const type = token.$type
	if (typeof type === 'string' && UNSUPPORTED_TYPES.includes(type)) return null
	const value = token.$value
	if (
		type === 'dimension' &&
		value &&
		typeof value === 'object' &&
		(value as { unit?: string }).unit === 'rem'
	) {
		const { value: v } = value as { value: number }
		return { ...token, $value: { value: roundTo(v * 16), unit: 'px' } }
	}
	if (
		type === 'duration' &&
		value &&
		typeof value === 'object' &&
		(value as { unit?: string }).unit === 'ms'
	) {
		const { value: v } = value as { value: number }
		return { ...token, $value: { value: roundTo(v / 1000), unit: 's' } }
	}
	if (type === 'fontFamily' && Array.isArray(value)) {
		return { ...token, $value: value[0] ?? '' }
	}
	return token
}

// Walks a token tree applying figmaToken, pruning dropped tokens and any
// group left empty by the pruning.
const figmaReady = (node: Record<string, unknown>): Record<string, unknown> => {
	const out: Record<string, unknown> = {}
	for (const [key, value] of Object.entries(node)) {
		if (!value || typeof value !== 'object') continue
		if (isToken(value)) {
			const token = figmaToken(value)
			if (token) out[key] = token
			continue
		}
		const group = figmaReady(value as Record<string, unknown>)
		if (Object.keys(group).length > 0) out[key] = group
	}
	return out
}

// Figma imports one JSON file per mode ("Import mode" on a mode column), so a
// single merged file can only ever land as nested groups inside one mode.
// These are the mode groups the engines emit at the top level; whatever else
// is up there (radius/border/font/motion, or the prefix group wrapping them)
// has no modes and ships as one static file.
const MODE_GROUPS = ['light', 'dark', 'min', 'max'] as const

export interface TokenFile {
	// `light`, `max`, `static` — also the Figma mode name to import into.
	mode: string
	filename: string
	// Which collection the mode belongs to, for the on-screen guidance.
	collection: string
	json: string
}

const COLLECTIONS: Record<string, string> = {
	light: 'Color',
	dark: 'Color',
	min: 'Scale (type, space, grid)',
	max: 'Scale (type, space, grid)',
	static: 'Base (radius, border, font, duration)',
}

export const systemTokenFiles = (
	state: SystemState,
	prefix = ''
): TokenFile[] => {
	const tree = figmaReady(systemTokenTree(state, prefix))
	const files: TokenFile[] = []
	for (const mode of MODE_GROUPS) {
		const group = tree[mode]
		if (!group || Object.keys(group as object).length === 0) continue
		files.push({
			mode,
			filename: `design-system-${mode}.json`,
			collection: COLLECTIONS[mode] ?? mode,
			json: JSON.stringify(group, null, 2),
		})
	}
	const staticGroups = Object.fromEntries(
		Object.entries(tree).filter(
			([key]) => !MODE_GROUPS.includes(key as (typeof MODE_GROUPS)[number])
		)
	)
	if (Object.keys(staticGroups).length > 0) {
		files.push({
			mode: 'static',
			filename: 'design-system-static.json',
			collection: COLLECTIONS.static,
			json: JSON.stringify(staticGroups, null, 2),
		})
	}
	return files
}

// The on-screen preview of the file set. Not itself valid JSON — each file is
// downloaded separately — so the separators are comments naming the file.
export const systemTokensBundle = (
	state: SystemState,
	prefix = ''
): string =>
	systemTokenFiles(state, prefix)
		.map((f) => `// ===== ${f.filename} → ${f.collection} =====\n${f.json}`)
		.join('\n\n')
