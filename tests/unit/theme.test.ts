import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { colorUtils } from '../../src/utils/colorUtils.ts'

const css = readFileSync(
	new URL('../../src/styles/global.css', import.meta.url),
	'utf8'
)

// Pull `--color-*` declarations out of a slice of the stylesheet.
const colorsIn = (slice: string): Record<string, string> => {
	const out: Record<string, string> = {}
	for (const m of slice.matchAll(/--color-([a-z0-9-]+):\s*([^;]+);/gi)) {
		out[m[1]] = m[2].trim()
	}
	return out
}

const block = (start: string): string => {
	const i = css.indexOf(start)
	assert.notEqual(i, -1, `${start} block not found in global.css`)
	return css.slice(i, css.indexOf('\n}', i))
}

const LIGHT = colorsIn(block('@theme {'))
const DARK = { ...LIGHT, ...colorsIn(block('@media (prefers-color-scheme: dark)')) }

// hsla(h, s%, l%, a) or a hex literal, both to hex.
const toHex = (value: string): string => {
	if (value.startsWith('#')) return value
	const m = value.match(/hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%/)
	assert.ok(m, `cannot parse colour: ${value}`)
	return colorUtils.hslToHex(Number(m[1]), Number(m[2]), Number(m[3]))
}

const ratio = (
	theme: Record<string, string>,
	fg: string,
	bg: string
): number => {
	assert.ok(theme[fg], `--color-${fg} is not defined`)
	assert.ok(theme[bg], `--color-${bg} is not defined`)
	return colorUtils.getContrastRatio(toHex(theme[fg]), toHex(theme[bg]))
}

// The app is itself an accessibility tool, so its own chrome targets AAA for
// text. Non-text UI (the focus ring) only owes WCAG 2.1 SC 1.4.11's 3:1.
const TEXT_PAIRS: [string, string, string][] = [
	['body text', 'black-400', 'cream-100'],
	['heading', 'black-500', 'cream-100'],
	['nav current', 'cream-100', 'black-500'],
	['accent hover', 'accent-ink', 'accent'],
]

for (const [name, fg, bg] of TEXT_PAIRS) {
	test(`${name} clears AAA in both schemes`, () => {
		for (const [scheme, theme] of [
			['light', LIGHT],
			['dark', DARK],
		] as const) {
			const r = ratio(theme, fg, bg)
			assert.ok(r >= 7, `${scheme}: ${fg} on ${bg} is ${r.toFixed(2)}:1, want >= 7`)
		}
	})
}

test('the focus ring clears 3:1 against every surface it lands on', () => {
	for (const [scheme, theme] of [
		['light', LIGHT],
		['dark', DARK],
	] as const) {
		for (const surface of ['cream-50', 'cream-100', 'cream-200']) {
			const r = ratio(theme, 'blue-600', surface)
			assert.ok(
				r >= 3,
				`${scheme}: focus ring on ${surface} is ${r.toFixed(2)}:1, want >= 3`
			)
		}
	}
})

test('the accent pair is fixed, not theme-dependent', () => {
	// The highlight reads as a highlight in both schemes only because neither
	// half flips; riding yellow-500/black-500 collapsed it to 3:1 in dark.
	for (const token of ['accent', 'accent-ink']) {
		assert.equal(
			LIGHT[token],
			DARK[token],
			`--color-${token} must not be remapped for dark mode`
		)
	}
})

test('static font files are declared at a single weight', () => {
	// Declaring a static face as a range tells the browser it covers every
	// weight, which suppresses synthetic bolding — `font-bold` then rendered
	// the Regular file at regular weight.
	for (const face of css.matchAll(/@font-face\s*\{([^}]+)\}/g)) {
		const body = face[1]
		const src = body.match(/src:\s*url\(([^)]+)\)/)?.[1] ?? ''
		const weight = body.match(/font-weight:\s*([^;]+);/)?.[1].trim() ?? ''
		const isRange = /\s/.test(weight)
		// RobotoCondensed is a genuine variable font, so a range is correct there.
		if (src.includes('RobotoCondensed')) {
			assert.ok(isRange, `${src} is variable and should declare a range`)
		} else {
			assert.ok(
				!isRange,
				`${src} is a static file but declares the range "${weight}"`
			)
		}
	}
})

test('the body and mono utility share one family', () => {
	// `font-mono` used to fall through to the system stack while the body ran
	// Ubuntu Mono, so five places quietly rendered in a different typeface.
	assert.match(css, /--font-mono:\s*UbuntuMono/)
	assert.match(css, /font-family:\s*UbuntuMono/)
})
