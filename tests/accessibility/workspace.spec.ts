import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('sign-in and authenticated home have no serious axe violations', async ({ page }) => {
  await page.goto('/')
  let results = await new AxeBuilder({ page }).analyze()
  expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact || ''))).toEqual([])
  await page.getByRole('button', { name: /Continue with organizational SSO/i }).click()
  await expect(page.getByRole('heading', { name: /Welcome,/i })).toBeVisible()
  results = await new AxeBuilder({ page }).analyze()
  expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact || ''))).toEqual([])
})
