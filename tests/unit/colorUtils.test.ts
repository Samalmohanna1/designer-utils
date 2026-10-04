import { test } from 'node:test'
import assert from 'node:assert/strict'
import { colorUtils } from '../../src/utils/colorUtils.ts'

const luminance = (hex: string): number =>
	colorUtils.getLuminance(...colorUtils.hexToRgb(hex))

test('the ramp anchors 500 to the untouched base color', () => {
	for (const base of ['#1E4D8C', '#A51D1D', '#EEF6FF', '#2F2F2F']) {
		const shades = colorUtils.generateShades(base)
		assert.equal(shades.length, 10)
		assert.equal(shades[5], base, `500 should be ${base}`)
	}
})

test('the ramp never gets lighter as it descends', () => {
	// Extremes included: at true white/black the ends necessarily clamp, but
	// the order must still hold.
	for (const base of ['#1E4D8C', '#EEF6FF', '#FEFEFE', '#010101', '#7F7F7F']) {
		const lums = colorUtils.generateShades(base).map(luminance)
		for (let i = 1; i < lums.length; i++) {
			assert.ok(
				lums[i] <= lums[i - 1] + 1e-9,
				`${base}: shade ${i} is lighter than ${i - 1}`
			)
		}
	}
})

test('a near-white base still yields ten distinct shades', () => {
	// The regression behind fix/ramp-collapse-light-base: the short side of
	// the ramp used to repeat one color.
	const shades = colorUtils.generateShades('#EEF6FF')
	assert.equal(new Set(shades.map((s) => s.toUpperCase())).size, 10)
})

test('contrast is symmetric and anchored at the known extremes', () => {
	assert.equal(Math.round(colorUtils.getContrastRatio('#000000', '#FFFFFF')), 21)
	assert.equal(colorUtils.getContrastRatio('#4F4F4F', '#4F4F4F'), 1)
	assert.equal(
		colorUtils.getContrastRatio('#1E4D8C', '#FFFFFF'),
		colorUtils.getContrastRatio('#FFFFFF', '#1E4D8C')
	)
})

test('contrast ratios land on the right side of each WCAG tier', () => {
	// Thresholds the contrast picker groups by: AAA >= 7, AA >= 4.5,
	// AA Large >= 3.1. White backgrounds, darkening foregrounds.
	const onWhite = (hex: string) => colorUtils.getContrastRatio(hex, '#FFFFFF')
	// #595959 is the exact 7:1 point on white, so it pins the AAA boundary.
	assert.equal(Number(onWhite('#595959').toFixed(2)), 7)
	assert.ok(onWhite('#767676') >= 4.5, '#767676 on white is AA')
	assert.ok(onWhite('#767676') < 7, '#767676 on white is not AAA')
	assert.ok(onWhite('#8A8A8A') >= 3.1, '#8A8A8A on white is AA Large')
	assert.ok(onWhite('#8A8A8A') < 4.5, '#8A8A8A on white is not AA')
	assert.ok(onWhite('#A0A0A0') < 3.1, '#A0A0A0 on white fails every tier')
})

test('readableTextColor picks the legible ink for a background', () => {
	assert.equal(colorUtils.readableTextColor('#EFF6FF'), '#000000')
	assert.equal(colorUtils.readableTextColor('#00204B'), '#FFFFFF')
})

test('hex survives a round trip through RGB', () => {
	for (const hex of ['#000000', '#FFFFFF', '#1E4D8C', '#A51D1D', '#7F3FBF']) {
		assert.equal(colorUtils.rgbToHex(...colorUtils.hexToRgb(hex)), hex)
	}
})

test('convertColor emits the documented encodings', () => {
	assert.equal(colorUtils.convertColor('#1E4D8C', 'hex'), '#1E4D8C')
	assert.equal(colorUtils.convertColor('#1E4D8C', 'rgb'), 'rgb(30,77,140)')
	assert.equal(colorUtils.convertColor('#1E4D8C', 'hsl'), 'hsla(214, 65%, 33%, 1)')
})

test('slugs are export-safe and de-duped across scales', () => {
	assert.equal(colorUtils.slugify('My  Brand Blue!'), 'my-brand-blue')
	assert.deepEqual(colorUtils.uniqueSlugs(['Blue', 'blue', 'Blue']), [
		'blue',
		'blue-2',
		'blue-3',
	])
})

test('parseHexList keeps valid hexes and drops the rest', () => {
	assert.deepEqual(
		colorUtils.parseHexList('#1E4D8C, A51D1D nonsense #fff'),
		['#1E4D8C', '#A51D1D']
	)
})

test('the palette survives a round trip through its hash segment', () => {
	const scales = [
		{ name: 'blue', color: '#1E4D8C' },
		{ name: 'warm red', color: '#A51D1D' },
	]
	const decoded = colorUtils.decodePalette(colorUtils.encodePalette(scales))
	assert.deepEqual(decoded, [
		{ name: 'blue', color: '#1E4D8C' },
		{ name: 'warm-red', color: '#A51D1D' },
	])
})

test('a malformed palette segment degrades instead of throwing', () => {
	assert.deepEqual(colorUtils.decodePalette(''), [])
	assert.deepEqual(colorUtils.decodePalette('nonsense'), [])
	// Valid pairs survive alongside broken ones.
	assert.deepEqual(colorUtils.decodePalette('blue:1E4D8C,red:ZZZZZZ'), [
		{ name: 'blue', color: '#1E4D8C' },
	])
})

test('the dark ramp is the light ramp mirrored', () => {
	const light = colorUtils.generateShades('#1E4D8C')
	const dark = colorUtils.mirrorHexes(light)
	assert.equal(dark[0], light[9])
	assert.equal(dark[9], light[0])
	assert.deepEqual([...dark].reverse(), light)
})

test('hexToDtcgColor emits the 2025.10 color object Figma expects', () => {
	// A bare hex string is the pre-2025.10 style and no longer imports.
	assert.deepEqual(colorUtils.hexToDtcgColor('#1E4D8C', 1), {
		colorSpace: 'srgb',
		components: [0.117647, 0.301961, 0.54902],
		alpha: 1,
		hex: '#1E4D8C',
	})
})
