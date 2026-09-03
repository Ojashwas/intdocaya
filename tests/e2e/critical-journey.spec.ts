import { expect, test } from '@playwright/test'

test('signs in, searches, and opens a controlled record', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Continue with organizational SSO/i }).click()
  await expect(page.getByRole('heading', { name: /Welcome,/i })).toBeVisible()
  await page.getByRole('textbox', { name: /Search documents/i }).fill('Evidence')
  await expect(page.getByRole('heading', { name: 'Document Center' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Evidence Handling Standard' })).toBeVisible()
  await page.getByRole('button', { name: 'Evidence Handling Standard' }).click()
  await expect(page.getByRole('dialog', { name: /Evidence Handling Standard/i })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
})
