import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
	BORDER_LADDER,
	DEFAULT_FOUNDATIONS,
	decodeFoundations,
	encodeFoundations,
	foundationsToSvg,
	generateBorders,
	generateElevation,
	generateRadii,
} from '../../src/utils/foundations.ts'

test('radii scale off the base, with full as the pill case', () => {
	const radii = generateRadii({ ...DEFAULT_FOUNDATIONS, radiusBase: 8 })
	const px = Object.fromEntries(radii.map((r) => [r.label, r.px]))
	assert.deepEqual(px, { none: 0, sm: 4, md: 8, lg: 16, xl: 32, full: 9999 })
})

test('borderSteps controls how many ladder sizes ship', () => {
	assert.equal(generateBorders({ ...DEFAULT_FOUNDATIONS, borderSteps: 3 }).length, 3)
	assert.equal(generateBorders({ ...DEFAULT_FOUNDATIONS, borderSteps: 7 }).length, 7)
	// Out-of-range values clamp rather than producing an empty or over-long ladder.
	assert.equal(generateBorders({ ...DEFAULT_FOUNDATIONS, borderSteps: 0 }).length, 1)
	assert.equal(
		generateBorders({ ...DEFAULT_FOUNDATIONS, borderSteps: 99 }).length,
		BORDER_LADDER.length
	)
})

test('each elevation level is a key plus an ambient shadow', () => {
	const levels = generateElevation(DEFAULT_FOUNDATIONS, 'light')
	assert.equal(levels.length, 5)
	assert.deepEqual(
		levels.map((l) => l.label),
		['elevation-1', 'elevation-2', 'elevation-3', 'elevation-4', 'elevation-5']
	)
	for (const level of levels) assert.equal(level.layers.length, 2)
})

test('each color mode takes its own shadow tint', () => {
	const config = {
		...DEFAULT_FOUNDATIONS,
		shadowColor: '#1E4D8C',
		shadowColorDark: '#A51D1D',
	}
	const light = generateElevation(config, 'light')[0]
	const dark = generateElevation(config, 'dark')[0]
	assert.ok(light.layers.every((l) => l.color === '#1E4D8C'))
	assert.ok(dark.layers.every((l) => l.color === '#A51D1D'))
})

test('the dark variant raises opacity by 1.8x', () => {
	const light = generateElevation(DEFAULT_FOUNDATIONS, 'light')[0]
	const dark = generateElevation(DEFAULT_FOUNDATIONS, 'dark')[0]
	assert.equal(dark.layers[0].alpha, Number((light.layers[0].alpha * 1.8).toFixed(2)))
	// Geometry is identical between modes.
	assert.equal(dark.layers[0].y, light.layers[0].y)
	assert.equal(dark.layers[0].blur, light.layers[0].blur)
})

test('intensity scales both modes together', () => {
	const base = generateElevation(DEFAULT_FOUNDATIONS, 'light')[0]
	const doubled = generateElevation(
		{ ...DEFAULT_FOUNDATIONS, shadowIntensity: 2 },
		'light'
	)[0]
	assert.ok(doubled.layers[0].alpha > base.layers[0].alpha)
})

test('the foundations config survives a round trip through its hash segment', () => {
	const config = {
		...DEFAULT_FOUNDATIONS,
		radiusBase: 12,
		shadowColor: '#1E4D8C',
		shadowColorDark: '#A51D1D',
	}
	assert.deepEqual(decodeFoundations(encodeFoundations(config)), config)
})

test('the 8-part segment predating the dark tint reuses the light hex', () => {
	// Such a link must render exactly as it always did.
	const decoded = decodeFoundations('8|1|3|1|150|250|400|A51D1D')
	assert.ok(decoded)
	assert.equal(decoded.shadowColor, '#A51D1D')
	assert.equal(decoded.shadowColorDark, '#A51D1D')
})

test('the legacy 10-part segment with font stacks still decodes', () => {
	// Index 2 was shadowIntensity, 6 the hex, 7-9 the stacks (now the type tool's).
	const decoded = decodeFoundations('8|1|1|150|250|400|A51D1D|a|b|c')
	assert.ok(decoded)
	assert.equal(decoded.shadowColor, '#A51D1D')
	assert.equal(decoded.shadowColorDark, '#A51D1D')
	assert.equal(decoded.borderSteps, 3, 'borderSteps defaults')
})

test('malformed foundations segments decode to null', () => {
	assert.equal(decodeFoundations(''), null)
	assert.equal(decodeFoundations('nope'), null)
	// A bad dark hex is rejected rather than silently dropped.
	assert.equal(decodeFoundations('8|1|3|1|150|250|400|000000|ZZZZZZ'), null)
	// So is a negative number.
	assert.equal(decodeFoundations('8|1|3|1|-150|250|400|000000|000000'), null)
})

test('the Figma paste SVG carries both modes and the easings as named layers', () => {
	const svg = foundationsToSvg({
		...DEFAULT_FOUNDATIONS,
		shadowColorDark: '#A51D1D',
	})
	const ids = [...svg.matchAll(/<g id="([^"]+)"/g)].map((m) => m[1])
	// Layer ids match the token names so Figma's layer panel lines up.
	assert.ok(ids.includes('elevation-1-light'))
	assert.ok(ids.includes('elevation-5-dark'))
	assert.ok(ids.includes('ease-standard'))
	// Shadows ride as feDropShadow primitives, two per level per mode.
	assert.equal((svg.match(/feDropShadow/g) ?? []).length, 20)
	// The dark tint reaches the dark filters.
	assert.ok(svg.includes('flood-color="rgb(165, 29, 29)"'))
	assert.ok(svg.startsWith('<svg'))
})
