import { test, expect, type Page } from '@playwright/test'

const BASE = 'http://localhost:4321'

// Pick a Format on the Export page ("Format", not "Color Format", which is a
// separate selector). The block only reacts once the island has hydrated —
// Prism adds the `language-*` class at that point — so selecting any earlier
// fires a change event that nothing is listening to yet and the format
// silently stays put.
const selectFormat = async (page: Page, value: string): Promise<void> => {
	await expect(page.locator('pre code')).toHaveClass(/language-/)
	await page.getByLabel('Format', { exact: true }).selectOption(value)
}

test('color tool loads and generates a scale', async ({ page }) => {
	await page.goto(BASE)
	await expect(page).toHaveTitle(/Color Scale Generator/)
	await expect(
		page.getByRole('heading', { name: /Color Scale Generator/i })
	).toBeVisible()
	// The default scale renders its 10 shades (each swatch shows its hex).
	await expect(page.locator('.hex-code')).toHaveCount(10)
})

test('type tool previews the scale and owns the font stacks', async ({
	page,
}) => {
	await page.goto(`${BASE}/type`)
	await expect(page).toHaveTitle(/Type Scale Calculator/)
	// Default config: step 0 at the max viewport is 20px (1.25rem).
	await expect(page.getByText('Step 0')).toBeVisible()
	await expect(
		page.getByRole('heading', { name: /Font Stacks/i })
	).toBeVisible()
	await expect(page.getByLabel('Heading', { exact: true })).toHaveValue(
		'system-ui, sans-serif'
	)
})

test('space tool previews sizes with px and rem', async ({ page }) => {
	await page.goto(`${BASE}/space`)
	await expect(page).toHaveTitle(/Space & Grid Calculator/)
	// Default 8pt @min ramp: s = 16px = 1rem.
	await expect(page.getByText('16px · 1rem')).toBeVisible()
	await expect(
		page.getByRole('heading', { name: /Layout grid/i })
	).toBeVisible()
})

test('foundations tool previews every layer', async ({ page }) => {
	await page.goto(`${BASE}/foundations`)
	await expect(page).toHaveTitle(/Design System Foundations/)
	// Radii ladder + T-shirt borders + elevation panels + motion easings.
	await expect(page.getByText('9999px')).toBeVisible()
	await expect(page.getByLabel('Sizes')).toHaveValue('3')
	await expect(page.getByText('Light', { exact: true })).toBeVisible()
	await expect(page.getByText('Dark', { exact: true })).toBeVisible()
	await expect(page.getByText('cubic-bezier(0.4, 0, 0.2, 1)')).toBeVisible()
})

test('export page merges every tool into one CSS file', async ({ page }) => {
	await page.goto(`${BASE}/export`)
	await expect(page).toHaveTitle(/Export Your Design System/)
	const code = page.locator('pre code')
	// Default CSS format carries every layer, fonts included (now emitted by
	// the type engine).
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
	await page.goto(`${BASE}/export`)
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
	await page.goto(`${BASE}/export`)
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

test('nav moves between the five destinations', async ({ page }) => {
	await page.goto(BASE)
	// Scoped to the nav — page copy may link to the same routes. (Islands
	// write the URL hash only after an edit, so rapid clicking can't race a
	// mount-time replaceState.)
	const nav = page.getByLabel('Tools')
	await nav.getByRole('link', { name: 'Type Scales' }).click()
	await expect(page).toHaveURL(/\/type\/?$/)
	await nav.getByRole('link', { name: 'Space & Grid' }).click()
	await expect(page).toHaveURL(/\/space\/?$/)
	await nav.getByRole('link', { name: 'Foundations' }).click()
	await expect(page).toHaveURL(/\/foundations\/?$/)
	await nav.getByRole('link', { name: 'Export' }).click()
	await expect(page).toHaveURL(/\/export\/?$/)
	await nav.getByRole('link', { name: 'Color Scales' }).click()
	await expect(
		page.getByRole('heading', { name: /Color Scale Generator/i })
	).toBeVisible()
})
