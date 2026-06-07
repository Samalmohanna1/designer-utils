import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:4321'

test('color tool loads and generates a scale', async ({ page }) => {
	await page.goto(BASE)
	await expect(page).toHaveTitle(/Color Scale Generator/)
	await expect(
		page.getByRole('heading', { name: /Color Scale Generator/i })
	).toBeVisible()
	// The default scale renders its 10 shades (each swatch shows its hex).
	await expect(page.locator('.hex-code')).toHaveCount(10)
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

test('nav moves between the three tools', async ({ page }) => {
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
	await page.getByRole('link', { name: 'Color Scales' }).click()
	await expect(
		page.getByRole('heading', { name: /Color Scale Generator/i })
	).toBeVisible()
})
