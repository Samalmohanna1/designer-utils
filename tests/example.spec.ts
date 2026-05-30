import { test, expect } from '@playwright/test';

const url = 'http://localhost:4321'

test('has title', async ({ page }) => {
  await page.goto(url);

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Tools/);
});

test('get started link', async ({ page }) => {
  await page.goto(url);

  // Click the get started link.
  await page.getByRole('link', { name: 'Add a Color' }).click();

  // Expects page to have a heading with the name of Installation.
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});
