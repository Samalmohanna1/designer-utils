import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
	DEFAULT_TYPE_CONFIG,
	clampFor,
	decodeConfig,
	encodeConfig,
	generateTypeScale,
	pxToRem,
	ratioName,
	remDimension,
	sizeAtViewport,
	withPrefix,
} from '../../src/utils/typeScale.ts'

test('clampFor matches utopia.fyi for the default step 0', () => {
	// 18px @320 to 20px @1440: the slope/intercept of the line through both
	// anchors, px to rem at 16.
	assert.equal(
		clampFor(18, 20, 320, 1440),
		'clamp(1.125rem, 1.0893rem + 0.1786vw, 1.25rem)'
	)
})

test('the scale spans the configured steps with 500-equivalent at step 0', () => {
	const steps = generateTypeScale(DEFAULT_TYPE_CONFIG)
	assert.equal(
		steps.length,
		DEFAULT_TYPE_CONFIG.stepsUp + DEFAULT_TYPE_CONFIG.stepsDown + 1
	)
	const step0 = steps.find((s) => s.step === 0)
	assert.ok(step0)
	assert.equal(step0.minSize, DEFAULT_TYPE_CONFIG.minFontSize)
	assert.equal(step0.maxSize, DEFAULT_TYPE_CONFIG.maxFontSize)
})

test('each step scales by the configured ratio', () => {
	const config = { ...DEFAULT_TYPE_CONFIG, minRatio: 1.25, maxRatio: 1.25 }
	const steps = generateTypeScale(config)
	const at = (n: number) => steps.find((s) => s.step === n)!
	assert.equal(
		Number(at(1).minSize.toFixed(4)),
		Number((at(0).minSize * 1.25).toFixed(4))
	)
	assert.equal(
		Number(at(2).minSize.toFixed(4)),
		Number((at(0).minSize * 1.25 ** 2).toFixed(4))
	)
})

test('sizeAtViewport interpolates between the anchors and clamps outside', () => {
	const step = { step: 0, minSize: 18, maxSize: 20, clamp: '' }
	const config = { ...DEFAULT_TYPE_CONFIG, minViewport: 320, maxViewport: 1440 }
	assert.equal(sizeAtViewport(step, 320, config), 18)
	assert.equal(sizeAtViewport(step, 1440, config), 20)
	assert.equal(sizeAtViewport(step, 880, config), 19)
	// Beyond the anchors the value holds rather than running away.
	assert.equal(sizeAtViewport(step, 100, config), 18)
	assert.equal(sizeAtViewport(step, 3000, config), 20)
})

test('a zero-width viewport range does not divide by zero', () => {
	const step = { step: 0, minSize: 18, maxSize: 20, clamp: '' }
	const config = { ...DEFAULT_TYPE_CONFIG, minViewport: 800, maxViewport: 800 }
	assert.equal(sizeAtViewport(step, 800, config), 18)
})

test('named ratios resolve and unknown ones fall back', () => {
	assert.equal(ratioName(1.25), 'Major Third')
	assert.equal(ratioName(1.2), 'Minor Third')
	assert.ok(ratioName(1.137) !== undefined)
})

test('pxToRem and remDimension agree on the 16px root', () => {
	assert.equal(pxToRem(16), '1rem')
	assert.equal(pxToRem(24), '1.5rem')
	// DTCG dimension $values must be objects, never strings.
	assert.deepEqual(remDimension(24), {
		$type: 'dimension',
		$value: { value: 1.5, unit: 'rem' },
	})
})

test('withPrefix builds the variable-namespace fragment', () => {
	assert.equal(withPrefix(''), '')
	assert.equal(withPrefix('brand'), 'brand-')
})

test('the type config survives a round trip through its hash segment', () => {
	const config = {
		...DEFAULT_TYPE_CONFIG,
		minFontSize: 17,
		maxRatio: 1.333,
		headingStack: 'Inter, sans-serif',
		fontCssUrl: 'https://example.com/fonts.css?a=1&b=2',
	}
	const decoded = decodeConfig(encodeConfig(config))
	assert.deepEqual(decoded, config)
})

test('a numbers-only legacy type segment still decodes', () => {
	// Links predating the font stacks: the stacks fall back to defaults.
	const decoded = decodeConfig('320,1200,18,20,1.2,1.25,5,2')
	assert.ok(decoded)
	assert.equal(decoded.minViewport, 320)
	assert.equal(decoded.maxViewport, 1200)
	assert.equal(decoded.headingStack, DEFAULT_TYPE_CONFIG.headingStack)
})

test('a malformed type segment decodes to null so the caller falls back', () => {
	assert.equal(decodeConfig(''), null)
	assert.equal(decodeConfig('not,a,config'), null)
})
