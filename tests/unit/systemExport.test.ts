import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
	FIGMA_UNSUPPORTED,
	decodeSystemHash,
	defaultPalette,
	encodeSystemHash,
	systemTokenFiles,
	systemTokensBundle,
	type SystemState,
} from '../../src/utils/systemExport.ts'
import { colorUtils } from '../../src/utils/colorUtils.ts'
import {
	DEFAULT_TYPE_CONFIG,
	encodeConfig,
} from '../../src/utils/typeScale.ts'
import {
	DEFAULT_GRID,
	DEFAULT_SPACE,
	encodeSpaceGrid,
} from '../../src/utils/spaceScale.ts'
import {
	DEFAULT_FOUNDATIONS,
	encodeFoundations,
} from '../../src/utils/foundations.ts'

const state = (): SystemState => ({
	palette: defaultPalette(),
	type: DEFAULT_TYPE_CONFIG,
	space: DEFAULT_SPACE,
	grid: DEFAULT_GRID,
	foundations: DEFAULT_FOUNDATIONS,
})

// Every token in a tree, flattened to [path, token].
const tokens = (
	node: Record<string, unknown>,
	path: string[] = []
): [string, Record<string, unknown>][] => {
	const out: [string, Record<string, unknown>][] = []
	for (const [key, value] of Object.entries(node)) {
		if (!value || typeof value !== 'object') continue
		const record = value as Record<string, unknown>
		if ('$type' in record) out.push([[...path, key].join('.'), record])
		else out.push(...tokens(record, [...path, key]))
	}
	return out
}

test('the export is one file per Figma variable mode', () => {
	const files = systemTokenFiles(state())
	assert.deepEqual(
		files.map((f) => f.mode),
		['light', 'dark', 'min', 'max', 'static']
	)
	assert.deepEqual(
		files.map((f) => f.filename),
		[
			'design-system-light.json',
			'design-system-dark.json',
			'design-system-min.json',
			'design-system-max.json',
			'design-system-static.json',
		]
	)
})

test('each file is valid JSON with no mode wrapper left inside', () => {
	for (const file of systemTokenFiles(state())) {
		const parsed = JSON.parse(file.json)
		for (const mode of ['light', 'dark', 'min', 'max']) {
			assert.ok(
				!(mode in parsed),
				`${file.filename} should not nest a ${mode} group`
			)
		}
	}
})

test('dimensions are px and durations seconds, as the importer requires', () => {
	for (const file of systemTokenFiles(state())) {
		for (const [path, token] of tokens(JSON.parse(file.json))) {
			if (token.$type === 'dimension') {
				assert.equal(
					(token.$value as { unit: string }).unit,
					'px',
					`${path} must be px`
				)
			}
			if (token.$type === 'duration') {
				assert.equal(
					(token.$value as { unit: string }).unit,
					's',
					`${path} must be seconds`
				)
			}
		}
	}
})

test('rem and ms values are converted, not just relabelled', () => {
	const files = systemTokenFiles(state())
	const max = JSON.parse(files.find((f) => f.mode === 'max')!.json)
	// Step 0 is 20px at the max viewport: 1.25rem -> 20px, not 1.25px.
	const step0 = tokens(max).find(([p]) => p.endsWith('font-size.step-0'))
	assert.ok(step0)
	assert.deepEqual(step0[1].$value, { value: 20, unit: 'px' })

	const statics = JSON.parse(files.find((f) => f.mode === 'static')!.json)
	// 150ms -> 0.15s.
	const fast = tokens(statics).find(([p]) => p.endsWith('duration.fast'))
	assert.ok(fast)
	assert.deepEqual(fast[1].$value, { value: 0.15, unit: 's' })
})

test('fontFamily collapses to the single leading family', () => {
	const statics = JSON.parse(
		systemTokenFiles(state()).find((f) => f.mode === 'static')!.json
	)
	const families = tokens(statics).filter(([, t]) => t.$type === 'fontFamily')
	assert.ok(families.length > 0)
	for (const [path, token] of families) {
		assert.equal(typeof token.$value, 'string', `${path} must be a string`)
		assert.ok(!Array.isArray(token.$value))
	}
})

test('token types Figma has no variable for are dropped entirely', () => {
	const unsupported: string[] = FIGMA_UNSUPPORTED.map((u) => u.type)
	assert.deepEqual(unsupported, ['shadow', 'cubicBezier'])
	for (const file of systemTokenFiles(state())) {
		for (const [path, token] of tokens(JSON.parse(file.json))) {
			assert.ok(
				!unsupported.includes(token.$type as string),
				`${file.filename} still carries ${path} (${token.$type})`
			)
		}
	}
})

test('groups emptied by the pruning do not ship as empty objects', () => {
	for (const file of systemTokenFiles(state())) {
		const walk = (node: Record<string, unknown>, path: string[] = []) => {
			for (const [key, value] of Object.entries(node)) {
				if (!value || typeof value !== 'object') continue
				const record = value as Record<string, unknown>
				if ('$type' in record) continue
				assert.ok(
					Object.keys(record).length > 0,
					`${file.filename}: ${[...path, key].join('.')} is empty`
				)
				walk(record, [...path, key])
			}
		}
		walk(JSON.parse(file.json))
	}
})

test('a prefix nests inside every mode file rather than clobbering it', () => {
	for (const file of systemTokenFiles(state(), 'brand')) {
		const parsed = JSON.parse(file.json)
		assert.deepEqual(
			Object.keys(parsed),
			['brand'],
			`${file.filename} should nest under the prefix`
		)
	}
})

test('the preview bundle names every file and is not itself valid JSON', () => {
	const bundle = systemTokensBundle(state())
	for (const file of systemTokenFiles(state())) {
		assert.ok(bundle.includes(file.filename), `names ${file.filename}`)
	}
	// It is a set of files joined with comment separators, by design.
	assert.throws(() => JSON.parse(bundle))
})

test('the system hash omits segments that match the defaults', () => {
	const defaults = {
		p: colorUtils.encodePalette(defaultPalette()),
		t: encodeConfig(DEFAULT_TYPE_CONFIG),
		s: encodeSpaceGrid(DEFAULT_SPACE, DEFAULT_GRID),
		f: encodeFoundations(DEFAULT_FOUNDATIONS),
	}
	// An untouched system keeps the URL clean.
	assert.equal(encodeSystemHash(defaults), '')
	// Edit one section and only that segment appears.
	const edited = encodeSystemHash({ ...defaults, p: 'blue:1E4D8C' })
	assert.equal(edited, 'p=blue:1E4D8C')
})

test('a full system hash round-trips through decode', () => {
	const encoded = encodeSystemHash({
		p: colorUtils.encodePalette([{ name: 'blue', color: '#1E4D8C' }]),
		t: encodeConfig({ ...DEFAULT_TYPE_CONFIG, maxFontSize: 22 }),
		s: encodeSpaceGrid(DEFAULT_SPACE, { ...DEFAULT_GRID, columns: 16 }),
		f: encodeFoundations({ ...DEFAULT_FOUNDATIONS, radiusBase: 12 }),
	})
	const parts = decodeSystemHash(encoded)
	assert.ok(parts)
	assert.deepEqual(parts.palette, [{ name: 'blue', color: '#1E4D8C' }])
	assert.equal(parts.type?.maxFontSize, 22)
	assert.equal(parts.spaceGrid?.grid.columns, 16)
	assert.equal(parts.foundations?.radiusBase, 12)
})

test('a legacy single-segment hash parses as one segment', () => {
	const parts = decodeSystemHash('t=320,1200,18,20,1.2,1.25,5,2')
	assert.ok(parts)
	assert.ok(parts.type)
	assert.equal(parts.type.maxViewport, 1200)
})

test('a hash with nothing valid decodes to null', () => {
	assert.equal(decodeSystemHash(''), null)
	assert.equal(decodeSystemHash('garbage'), null)
})
