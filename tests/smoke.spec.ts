import { test, expect, type Download, type Page } from '@playwright/test'

const BASE = 'http://localhost:4321'

// Pick a Format in the export section ("Format", not "Color Format", which is
// a separate selector). The block only reacts once the island has hydrated —
// Prism adds the `language-*` class at that point — so selecting any earlier
// fires a change event that nothing is listening to yet and the format
// silently stays put.
const selectFormat = async (page: Page, value: string): Promise<void> => {
	await awaitHydrated(page)
	await page.getByLabel('Format', { exact: true }).selectOption(value)
}

// The page is one React island; interacting before it hydrates hits dead
// server HTML and the event is lost. Prism adds the `language-*` class in a
// post-hydration effect, so it doubles as the whole page's hydration marker.
const awaitHydrated = async (page: Page): Promise<void> => {
	await expect(page.locator('pre code')).toHaveClass(/language-/)
}

test('one page carries every section', async ({ page }) => {
	await page.goto(BASE)
	await expect(page).toHaveTitle(/Design System Foundations/)
	await expect(
		page.getByRole('heading', { name: /Design System Foundations/i })
	).toBeVisible()
	for (const id of ['colors', 'type', 'space', 'foundations', 'export']) {
		await expect(page.locator(`#${id}`)).toBeAttached()
	}
	// The default scale renders its 10 shades (each swatch shows its hex).
	await expect(page.locator('.hex-code')).toHaveCount(10)
})

test('a shade copies its hex without the leading hash', async ({ page }) => {
	// Recorded rather than read back: clipboard permissions are Chromium-only,
	// and the thing under test is what the component hands to the clipboard.
	await page.addInitScript(() => {
		;(window as unknown as { copied: string[] }).copied = []
		Object.defineProperty(navigator, 'clipboard', {
			configurable: true,
			value: {
				writeText: (text: string) => {
					;(window as unknown as { copied: string[] }).copied.push(text)
					return Promise.resolve()
				},
			},
		})
	})
	await page.goto(BASE)
	await awaitHydrated(page)
	const swatch = page.locator('#colors button[aria-label^="Copy #"]').first()
	const hex = (await swatch.getAttribute('aria-label'))!.replace('Copy ', '')
	await swatch.click()
	await expect(swatch.getByText('Copied!')).toBeVisible()
	const copied = await page.evaluate(
		() => (window as unknown as { copied: string[] }).copied
	)
	expect(copied).toEqual([hex.slice(1)])
	expect(copied[0]).not.toContain('#')
	// The swatch still shows the hex with its '#'.
	await expect(swatch.locator('.hex-code')).toHaveText(hex)
})

// The shade ramp has a ~649px floor (10 swatches at min-w-16), so it and the
// scale row only go single-line at lg; at sm they overflowed the page.
test('no horizontal scroll at any breakpoint', async ({ page }) => {
	await page.goto(BASE)
	await awaitHydrated(page)
	for (const width of [390, 640, 768, 1024, 1440]) {
		await page.setViewportSize({ width, height: 1000 })
		const overflow = await page.evaluate(
			() =>
				document.documentElement.scrollWidth -
				document.documentElement.clientWidth
		)
		expect(overflow, `horizontal overflow at ${width}px`).toBe(0)
	}
})

test('sticky nav jumps to sections without touching the hash', async ({
	page,
}) => {
	await page.goto(BASE)
	const nav = page.getByLabel('Tools')
	for (const [label, id] of [
		['Type Scales', 'type'],
		['Space & Grid', 'space'],
		['Foundations', 'foundations'],
		['Export', 'export'],
		['Color Scales', 'colors'],
	] as const) {
		await nav.getByRole('link', { name: label }).click()
		await expect(page.locator(`#${id}`)).toBeInViewport()
	}
	// Jumps scroll via JS — the state-carrying hash stays untouched.
	expect(new URL(page.url()).hash).toBe('')
})

test('the shared viewport control drives type, space, and grid', async ({
	page,
}) => {
	await page.goto(BASE)
	// The export block below re-renders live off the same state.
	await expect(page.locator('pre code')).toHaveClass(/language-/)
	await page.getByLabel('Max viewport').fill('1200')
	await expect(page.getByText('At max viewport (1200px)')).toBeVisible()
	await expect(page.getByText('Base size @max (1200px)')).toBeVisible()
	const code = page.locator('pre code')
	await expect(code).toContainText(
		'--step-0: clamp(1.125rem, 1.0795rem + 0.2273vw, 1.25rem)'
	)
	await expect(code).toContainText(
		'--space-s: clamp(1rem, 0.9091rem + 0.4545vw, 1.25rem)'
	)
})

test('type section owns the fonts and can load Google Fonts', async ({
	page,
}) => {
	await page.goto(BASE)
	await awaitHydrated(page)
	await expect(
		page.getByRole('heading', { name: /Font Stacks/i })
	).toBeVisible()
	await expect(page.getByLabel('Heading', { exact: true })).toHaveValue(
		'system-ui, sans-serif'
	)
	// Picking a Google font swaps the stack and mounts the preview stylesheet.
	await page
		.getByLabel('Heading preset')
		.selectOption("'Poppins', system-ui, sans-serif")
	await expect(page.getByLabel('Heading', { exact: true })).toHaveValue(
		"'Poppins', system-ui, sans-serif"
	)
	const link = page.locator('link#google-fonts-preview')
	await expect(link).toBeAttached()
	expect(await link.getAttribute('href')).toContain(
		'fonts.googleapis.com/css2?family=Poppins'
	)
	// And the exported CSS hoists a matching @import.
	await expect(page.locator('pre code')).toContainText(
		"@import url('https://fonts.googleapis.com/css2?family=Poppins"
	)
})

test('foundations previews every layer and offers every palette shade for shadows', async ({
	page,
}) => {
	await page.goto(BASE)
	await awaitHydrated(page)
	// Scoped to the section — the export code block repeats these strings.
	const foundations = page.locator('#foundations')
	await expect(foundations.getByText('9999px')).toBeVisible()
	await expect(foundations.getByLabel('Sizes')).toHaveValue('3')
	await expect(foundations.getByText('Light', { exact: true })).toBeVisible()
	await expect(foundations.getByText('Dark', { exact: true })).toBeVisible()
	await expect(
		foundations.getByText('cubic-bezier(0.4, 0, 0.2, 1)')
	).toBeVisible()
	// The default palette's full ramp is offered, not just 500/900, and each
	// color mode tints independently.
	const light = foundations.getByLabel(/^Light shadow color blue-300,/)
	const dark = foundations.getByLabel(/^Dark shadow color blue-700,/)
	await expect(light).toBeVisible()
	await light.click()
	await expect(light).toHaveAttribute('aria-pressed', 'true')
	await expect(dark).toHaveAttribute('aria-pressed', 'false')
	await dark.click()
	await expect(dark).toHaveAttribute('aria-pressed', 'true')
	// Picking the dark tint leaves the light one alone.
	await expect(light).toHaveAttribute('aria-pressed', 'true')
	// Both tints reach the export: elevation-1 appears once in :root and once
	// in the dark block, and the two carry different rgb triples.
	const code = await page.locator('pre code').innerText()
	const tints = [
		...code.matchAll(/--elevation-1: 0px 1px 2px 0px rgba\((\d+, \d+, \d+)/g),
	].map((m) => m[1])
	expect(tints).toHaveLength(2)
	expect(tints[0]).not.toBe(tints[1])
})

test('export section merges every layer into one CSS file', async ({
	page,
}) => {
	await page.goto(BASE)
	const code = page.locator('pre code')
	// Default CSS format carries every layer, fonts included (emitted by the
	// type engine).
	await expect(code).toContainText('/* ===== Color ===== */')
	await expect(code).toContainText(
		'--step-0: clamp(1.125rem, 1.0893rem + 0.1786vw, 1.25rem)'
	)
	await expect(code).toContainText(
		'--space-s: clamp(1rem, 0.9286rem + 0.3571vw, 1.25rem)'
	)
	await expect(code).toContainText('--font-heading: system-ui')
	await expect(code).toContainText('--radius-md: 8px;')
	await expect(code).toContainText('--border-s: 1px;')
	await expect(code).toContainText('--elevation-1:')
	await expect(code).toContainText('--ease-standard: cubic-bezier')
})

test('export tokens are one Figma-ready file per mode', async ({ page }) => {
	await page.goto(BASE)
	await selectFormat(page, 'tokens')
	const code = page.locator('pre code')
	// One file per mode, not mode groups nested inside a single file.
	for (const mode of ['light', 'dark', 'min', 'max', 'static']) {
		await expect(code).toContainText(`design-system-${mode}.json`)
	}
	await expect(code).not.toContainText('"light": {')
	// Values shaped for the importer: px dimensions, seconds, one font name.
	await expect(code).toContainText('"colorSpace": "srgb"')
	await expect(code).toContainText('"unit": "px"')
	await expect(code).toContainText('"unit": "s"')
	await expect(code).toContainText('"$value": "system-ui"')
	await expect(code).not.toContainText('"unit": "rem"')
	await expect(code).not.toContainText('"unit": "ms"')
	// The two types Figma has no variable for are left out and flagged.
	await expect(code).not.toContainText('"$type": "shadow"')
	await expect(code).not.toContainText('"$type": "cubicBezier"')
	await expect(
		page.getByText('Figma has no variable type for')
	).toBeVisible()
})

test('export saves one json download per mode', async ({ page }) => {
	await page.goto(BASE)
	await selectFormat(page, 'tokens')
	const downloads: Download[] = []
	page.on('download', (d) => downloads.push(d))
	await page.getByRole('button', { name: 'Download 5 files' }).click()
	await expect.poll(() => downloads.length, { timeout: 15_000 }).toBe(5)
	expect(downloads.map((d) => d.suggestedFilename()).sort()).toEqual([
		'design-system-dark.json',
		'design-system-light.json',
		'design-system-max.json',
		'design-system-min.json',
		'design-system-static.json',
	])
	// Each file is valid JSON on its own, with no mode wrapper.
	const light = downloads.find(
		(d) => d.suggestedFilename() === 'design-system-light.json'
	)!
	const stream = await light.createReadStream()
	const chunks: Buffer[] = []
	for await (const chunk of stream) chunks.push(chunk as Buffer)
	const parsed = JSON.parse(Buffer.concat(chunks).toString())
	expect(Object.keys(parsed)).toEqual(['blue'])
	expect(parsed.blue['500'].$type).toBe('color')
})

test('the other formats still download a single txt file', async ({ page }) => {
	await page.goto(BASE)
	await awaitHydrated(page)
	const [download] = await Promise.all([
		page.waitForEvent('download'),
		page.getByRole('button', { name: 'Download .txt' }).click(),
	])
	expect(download.suggestedFilename()).toBe('design-system-css.txt')
})

test('legacy per-tool links redirect, keep their state, and unify the viewport', async ({
	page,
}) => {
	await page.goto(`${BASE}/type#t=320,1200,18,20,1.2,1.25,5,2`)
	// The stub replaces to /?go=type + hash; the island then drops the query.
	await page.waitForURL(/\/#t=320,1200/)
	await expect(page.locator('#type')).toBeInViewport()
	// The legacy segment's viewport anchors landed in the shared control…
	await expect(page.getByLabel('Max viewport')).toHaveValue('1200')
	// …and were stamped onto the space config too (one viewport everywhere).
	await expect(page.getByText('Base size @max (1200px)')).toBeVisible()
})
