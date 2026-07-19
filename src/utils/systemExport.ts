// The unified "whole system" export: merges every tool's latest saved state
// (localStorage, written by each island's useHashSync) into one CSS block,
// one Tailwind @theme, or one DTCG token file. Tools that were never opened
// fall back to their defaults, so the export is always complete.
//
// Token mode strategy (documented in CLAUDE.md): top-level `light`/`dark`
// groups hold the theme-dependent layers (color, elevation), top-level
// `min`/`max` hold the viewport-dependent layers (font-size, space, grid),
// and the static layers (radius, border, font, motion) sit at the top level.

import { colorUtils, type ColorValueFormat } from './colorUtils'
import {
	DEFAULT_TYPE_CONFIG,
	decodeConfig,
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
	// Which layers came from a saved tool state vs. the default.
	saved: { color: boolean; type: boolean; space: boolean; foundations: boolean }
}

const defaultPalette = (): { name: string; color: string }[] => {
	const color = colorUtils.defaultColorForIndex(0)
	return [{ name: colorUtils.nameFromHex(color), color }]
}

const readKey = (key: string): string | null => {
	try {
		return window.localStorage.getItem(key)
	} catch {
		return null
	}
}

// Client-only: the latest saved state of every tool, defaults where a tool
// has no autosave.
export const readSystemState = (): SystemState => {
	const paletteRaw = readKey(STORAGE_KEYS.palette)
	const paletteEntries = paletteRaw ? colorUtils.decodePalette(paletteRaw) : []

	const typeRaw = readKey(STORAGE_KEYS.type)
	const type = (typeRaw && decodeConfig(typeRaw)) || DEFAULT_TYPE_CONFIG

	const spaceRaw = readKey(STORAGE_KEYS.space)
	const spaceGrid = spaceRaw ? decodeSpaceGrid(spaceRaw) : null

	const foundationsRaw = readKey(STORAGE_KEYS.foundations)
	const foundations =
		(foundationsRaw && decodeFoundations(foundationsRaw)) ||
		DEFAULT_FOUNDATIONS

	return {
		palette: paletteEntries.length > 0 ? paletteEntries : defaultPalette(),
		type,
		space: spaceGrid?.space ?? DEFAULT_SPACE,
		grid: spaceGrid?.grid ?? DEFAULT_GRID,
		foundations,
		saved: {
			color: paletteEntries.length > 0,
			type: Boolean(typeRaw && decodeConfig(typeRaw)),
			space: spaceGrid !== null,
			foundations: Boolean(
				foundationsRaw && decodeFoundations(foundationsRaw)
			),
		},
	}
}

const spaceParts = (state: SystemState) => {
	const sizes = generateSpaceSizes(state.space)
	const pairs = generateSpacePairs(state.space)
	const grid = computeGrid(state.grid)
	const gutter = gutterClampFor(state.grid)
	return { sizes, pairs, grid, gutter }
}

export const systemCss = (
	state: SystemState,
	colorFormat: ColorValueFormat = 'hex',
	prefix = ''
): string => {
	const data = colorUtils.paletteShadeData(state.palette)
	const { sizes, pairs, grid, gutter } = spaceParts(state)
	return [
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
