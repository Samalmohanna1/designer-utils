import { test, expect, type Page } from '@playwright/test'

const BASE = 'http://localhost:4321'

// Pick a Format ("Format", not "Color Format", which is a separate selector).
// The export block only reacts once the island has hydrated — Prism adds the
// `language-*` class at that point — so selecting any earlier fires a change
// event that nothing is listening to yet and the format silently stays put.
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

test('design tokens export uses the DTCG 2025.10 color object', async ({
	page,
}) => {
	await page.goto(BASE)
	await selectFormat(page, 'tokens')
	const code = page.locator('pre code')
	// $value must be a color object, not a bare hex string — Figma's native
	// variables importer rejects the pre-2025.10 style.
	await expect(code).toContainText('"$type": "color"')
	await expect(code).toContainText('"colorSpace": "srgb"')
	await expect(code).toContainText('"components": [')
	await expect(code).toContainText('"alpha": 1')
	await expect(code).toContainText('"hex": "#')
	// The old shape (a hex directly as $value) must be gone.
	await expect(code).not.toContainText(/"\$value": "#/)
})

test('type and space tokens use DTCG 2025.10 dimension objects', async ({
	page,
}) => {
	for (const [path, sample] of [
		['/type', '"step-0"'],
		['/space', '"s"'],
	]) {
		await page.goto(`${BASE}${path}`)
		await selectFormat(page, 'tokens')
		const code = page.locator('pre code')
		// Fluid values flatten to min/max anchor groups — a clamp() can't be a
		// DTCG dimension, and Figma variables have no viewport concept.
		await expect(code).toContainText('"min": {')
		await expect(code).toContainText('"max": {')
		await expect(code).toContainText(sample)
		// $value must be a { value, unit } object, never a string.
		await expect(code).toContainText('"unit": "rem"')
		await expect(code).not.toContainText(/"\$value": "/)
	}
})

test('type tool loads and outputs fluid CSS', async ({ page }) => {
	await page.goto(`${BASE}/type`)
	await expect(page).toHaveTitle(/Type Scale Calculator/)
	await expect(
		page.getByRole('heading', { name: /Type Scale Calculator/i })
	).toBeVisible()
	// Default config matches the Utopia reference output.
	await expect(page.locator('pre code')).toContainText(
		'--step-0: clamp(1.125rem, 1.0815rem + 0.2174vw, 1.25rem)'
	)
})

test('space tool loads and outputs a space scale + grid', async ({ page }) => {
	await page.goto(`${BASE}/space`)
	await expect(page).toHaveTitle(/Space & Grid Calculator/)
	await expect(
		page.getByRole('heading', { name: /Space & Grid Calculator/i })
	).toBeVisible()
	const code = page.locator('pre code')
	// Default 8pt @min space scale (16 -> 20px fluid).
	await expect(code).toContainText(
		'--space-s: clamp(1rem, 0.9286rem + 0.3571vw, 1.25rem)'
	)
	// The grid block with the container utility.
	await expect(code).toContainText('--grid-columns: 12;')
	await expect(code).toContainText('.u-container {')
})

test('code snippet downloads as a txt file', async ({ page }) => {
	await page.goto(BASE)
	await selectFormat(page, 'tokens')
	const [download] = await Promise.all([
		page.waitForEvent('download'),
		page.getByRole('button', { name: 'Download .txt' }).click(),
	])
	expect(download.suggestedFilename()).toBe('color-scales-tokens.txt')
	const stream = await download.createReadStream()
	const chunks: Buffer[] = []
	for await (const chunk of stream) chunks.push(chunk as Buffer)
	// The downloaded file is the same snippet shown in the code block.
	expect(Buffer.concat(chunks).toString()).toContain('"colorSpace": "srgb"')
})

test('foundations tool loads and exports every token layer', async ({
	page,
}) => {
	await page.goto(`${BASE}/foundations`)
	await expect(page).toHaveTitle(/Design System Foundations/)
	await expect(
		page.getByRole('heading', { name: /^🧱 Foundations/i })
	).toBeVisible()
	const code = page.locator('pre code').first()
	// Default CSS export carries all five layers.
	await expect(code).toContainText('--radius-md: 8px;')
	await expect(code).toContainText('--border-hairline: 1px;')
	await expect(code).toContainText('--elevation-1:')
	await expect(code).toContainText('--font-heading: system-ui')
	await expect(code).toContainText('--duration-base: 250ms;')
	await expect(code).toContainText('--ease-standard: cubic-bezier')
	// Elevation ships a dark override.
	await expect(code).toContainText('@media (prefers-color-scheme: dark)')
})

test('whole-system export merges every tool', async ({ page }) => {
	await page.goto(`${BASE}/foundations`)
	await expect(page.locator('pre code').first()).toHaveClass(/language-/)
	await page
		.getByLabel('Format', { exact: true })
		.nth(1)
		.selectOption('tokens')
	const code = page.locator('pre code').nth(1)
	// One DTCG file: mode groups + static foundations groups. DTCG shadow
	// tokens for elevation live under light/dark alongside color.
	await expect(code).toContainText('"light": {')
	await expect(code).toContainText('"min": {')
	await expect(code).toContainText('"font-size": {')
	await expect(code).toContainText('"elevation": {')
	await expect(code).toContainText('"radius": {')
	await expect(code).toContainText('"$type": "shadow"')
})

test('nav moves between the four tools', async ({ page }) => {
	await page.goto(BASE)
	await page.getByRole('link', { name: 'Type Scales' }).click()
	await expect(page).toHaveURL(/\/type\/?$/)
	await expect(
		page.getByRole('heading', { name: /Type Scale Calculator/i })
	).toBeVisible()
	await page.getByRole('link', { name: 'Space & Grid' }).click()
	await expect(page).toHaveURL(/\/space\/?$/)
	await expect(
		page.getByRole('heading', { name: /Space & Grid Calculator/i })
	).toBeVisible()
	await page.getByRole('link', { name: 'Foundations' }).click()
	await expect(page).toHaveURL(/\/foundations\/?$/)
	await expect(
		page.getByRole('heading', { name: /^🧱 Foundations/i })
	).toBeVisible()
	await page.getByRole('link', { name: 'Color Scales' }).click()
	await expect(
		page.getByRole('heading', { name: /Color Scale Generator/i })
	).toBeVisible()
})
