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

// A semantic token points at a ramp step with var(), so follow the chain
// before parsing. hsla(h, s%, l%, a) and hex literals both resolve to hex.
const toHex = (
	value: string,
	theme: Record<string, string>,
	seen = 0
): string => {
	const ref = value.match(/^var\(\s*--color-([a-z0-9-]+)\s*\)$/i)
	if (ref) {
		assert.ok(seen < 10, `circular var() chain at --color-${ref[1]}`)
		const next = theme[ref[1]]
		assert.ok(next, `--color-${ref[1]} is referenced but not defined`)
		return toHex(next, theme, seen + 1)
	}
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
	return colorUtils.getContrastRatio(
		toHex(theme[fg], theme),
		toHex(theme[bg], theme)
	)
}

// The app is itself an accessibility tool, so its own chrome targets AAA for
// text. Non-text UI (the focus ring) only owes WCAG 2.1 SC 1.4.11's 3:1.
const TEXT_PAIRS: [string, string, string][] = [
	['body text', 'black-400', 'cream-100'],
	['heading', 'black-500', 'cream-100'],
	['nav current', 'cream-100', 'black-500'],
	['accent hover', 'accent-ink', 'accent'],
	// Semantic roles: each names a job, and each owes AAA in both schemes.
	['success chip', 'success', 'success-soft'],
	['destructive hover', 'danger-ink', 'danger'],
	['notice text', 'notice', 'cream-50'],
	['AAA tier badge', 'black-400', 'tier-aaa'],
	['AA tier badge', 'black-400', 'tier-aa'],
	['AA Large tier badge', 'black-400', 'tier-aa-large'],
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

test('the success chip border is visible against its own fill', () => {
	// Non-text, so SC 1.4.11's 3:1 rather than AAA.
	for (const [scheme, theme] of [
		['light', LIGHT],
		['dark', DARK],
	] as const) {
		const r = ratio(theme, 'success-line', 'success-soft')
		assert.ok(
			r >= 3,
			`${scheme}: success border is ${r.toFixed(2)}:1 on its fill, want >= 3`
		)
	}
})

test('feedback roles own palette colours, not a framework default', () => {
	// Green used to come from Tailwind's defaults, so the palette didn't own
	// its most common state and the dark block patched someone else's values.
	for (const role of ['success', 'success-soft', 'success-line', 'tier-aaa']) {
		for (const theme of [LIGHT, DARK]) {
			assert.match(
				theme[role] ?? '',
				/^var\(--color-green-\d{2,3}\)$/,
				`--color-${role} should point at the project's green ramp`
			)
		}
	}
	for (let step of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]) {
		assert.ok(LIGHT[`green-${step}`], `--color-green-${step} is missing`)
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

test('every face ships as woff2', () => {
	// The three faces were 735KB of TTF; woff2 brought that to 329KB. They're
	// converted once and committed, so nothing guards this but the test.
	const faces = [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)]
	assert.equal(faces.length, 3)
	for (const [, body] of faces) {
		assert.match(body, /url\([^)]+\.woff2\)\s*format\('woff2'\)/)
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
