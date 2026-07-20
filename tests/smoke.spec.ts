import { test, expect, type Page } from '@playwright/test'

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
	// The default palette's full ramp is offered, not just 500/900.
	const swatch = foundations.getByLabel(/^Shadow color blue-300,/)
	await expect(swatch).toBeVisible()
	await swatch.click()
	await expect(swatch).toHaveAttribute('aria-pressed', 'true')
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

test('export tokens are DTCG 2025.10 across every layer', async ({ page }) => {
	await page.goto(BASE)
	await selectFormat(page, 'tokens')
	const code = page.locator('pre code')
	// Mode groups: light/dark (color + elevation), min/max (type + space),
	// static groups at the top level.
	await expect(code).toContainText('"light": {')
	await expect(code).toContainText('"min": {')
	await expect(code).toContainText('"font-size": {')
	await expect(code).toContainText('"radius": {')
	// Color objects, dimension objects, shadow composites, fontFamily.
	await expect(code).toContainText('"colorSpace": "srgb"')
	await expect(code).toContainText('"unit": "rem"')
	await expect(code).toContainText('"$type": "shadow"')
	await expect(code).toContainText('"$type": "fontFamily"')
	// No bare-string $values anywhere (pre-2025.10 style).
	await expect(code).not.toContainText(/"\$value": "/)
})

test('export downloads the snippet as a txt file', async ({ page }) => {
	await page.goto(BASE)
	await selectFormat(page, 'tokens')
	const [download] = await Promise.all([
		page.waitForEvent('download'),
		page.getByRole('button', { name: 'Download .txt' }).click(),
	])
	expect(download.suggestedFilename()).toBe('design-system-tokens.txt')
	const stream = await download.createReadStream()
	const chunks: Buffer[] = []
	for await (const chunk of stream) chunks.push(chunk as Buffer)
	expect(Buffer.concat(chunks).toString()).toContain('"colorSpace": "srgb"')
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
