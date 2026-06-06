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

test('nav moves between the two tools', async ({ page }) => {
	await page.goto(BASE)
	await page.getByRole('link', { name: 'Type Scales' }).click()
	await expect(page).toHaveURL(/\/type\/?$/)
	await expect(
		page.getByRole('heading', { name: /Type Scale Calculator/i })
	).toBeVisible()
	await page.getByRole('link', { name: 'Color Scales' }).click()
	await expect(
		page.getByRole('heading', { name: /Color Scale Generator/i })
	).toBeVisible()
})
