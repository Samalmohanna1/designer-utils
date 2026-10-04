import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
	DEFAULT_GRID,
	DEFAULT_SPACE,
	computeGrid,
	decodeSpaceGrid,
	encodeSpaceGrid,
	generateSpacePairs,
	generateSpaceSizes,
} from '../../src/utils/spaceScale.ts'

test('the default @min base lands on a clean 4/8pt ramp', () => {
	const sizes = generateSpaceSizes(DEFAULT_SPACE)
	assert.deepEqual(
		sizes.map((s) => s.minSize),
		[4, 8, 12, 16, 24, 32, 48, 64, 96]
	)
	assert.deepEqual(
		sizes.map((s) => s.label),
		['3xs', '2xs', 'xs', 's', 'm', 'l', 'xl', '2xl', '3xl']
	)
})

test('sizes scale with the base', () => {
	const sizes = generateSpaceSizes({ ...DEFAULT_SPACE, minBase: 32 })
	// Every multiplier doubles when the base does.
	assert.deepEqual(
		sizes.map((s) => s.minSize),
		[8, 16, 24, 32, 48, 64, 96, 128, 192]
	)
})

test('pairs step one size up, min of N to max of N+1', () => {
	const sizes = generateSpaceSizes(DEFAULT_SPACE)
	const pairs = generateSpacePairs(DEFAULT_SPACE)
	assert.equal(pairs.length, sizes.length - 1)
	assert.equal(pairs[0].label, '3xs-2xs')
	assert.equal(pairs[0].from, '3xs')
	assert.equal(pairs[0].to, '2xs')
})

test('the grid reserves one gutter of padding each side plus the inner gaps', () => {
	// columnWidth = (container - (cols + 1) * gutter) / cols. At @min the
	// container is the min viewport; at @max it's containerMax.
	const grid = computeGrid(DEFAULT_GRID)
	const { minViewport, containerMax, minGutter, maxGutter, columns } =
		DEFAULT_GRID
	assert.equal(grid.minContainer, minViewport)
	assert.equal(grid.maxContainer, containerMax)
	assert.equal(
		grid.minColumn,
		(minViewport - (columns + 1) * minGutter) / columns
	)
	assert.equal(
		grid.maxColumn,
		(containerMax - (columns + 1) * maxGutter) / columns
	)
})

test('@min column rounding is opt-in and directional', () => {
	const unrounded = computeGrid(DEFAULT_GRID)
	assert.ok(!Number.isInteger(unrounded.minColumn), 'this case has a remainder')
	assert.equal(unrounded.minColumnRounded, unrounded.minColumn)
	const down = computeGrid({ ...DEFAULT_GRID, roundMinColumn: 'down' })
	const up = computeGrid({ ...DEFAULT_GRID, roundMinColumn: 'up' })
	assert.equal(down.minColumnRounded, Math.floor(unrounded.minColumn))
	assert.equal(up.minColumnRounded, Math.ceil(unrounded.minColumn))
})

test('space and grid survive a round trip through their hash segment', () => {
	const space = { ...DEFAULT_SPACE, minBase: 18, maxBase: 22 }
	const grid = { ...DEFAULT_GRID, columns: 16, maxGutter: 40 }
	const decoded = decodeSpaceGrid(encodeSpaceGrid(space, grid))
	assert.ok(decoded)
	assert.deepEqual(decoded.space, space)
	assert.deepEqual(decoded.grid, grid)
})

test('a malformed space segment decodes to null so the caller falls back', () => {
	assert.equal(decodeSpaceGrid(''), null)
	assert.equal(decodeSpaceGrid('1,2,3'), null)
})
