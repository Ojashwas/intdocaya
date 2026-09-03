import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
})

test('sign-in, home and Document Center are connected', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Sign in to continue' })).toBeVisible()
  await page.getByRole('button', { name: /continue with organizational sso/i }).click()
  await expect(page.getByRole('heading', { name: /welcome, khalid/i })).toBeVisible()
  await page.getByRole('button', { name: /document center/i }).click()
  await expect(page.getByRole('heading', { name: 'Document Center' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Document register' })).toBeVisible()
})

test('controlled-document registration opens its four-step workflow', async ({ page }) => {
  await page.getByRole('button', { name: /continue with organizational sso/i }).click()
  await page.getByRole('button', { name: /register document/i }).click()
  await expect(page.getByRole('dialog', { name: /register controlled document/i })).toBeVisible()
  await expect(page.getByText('Document metadata', { exact: true })).toBeVisible()
  await expect(page.getByText('Classification & control', { exact: true })).toBeVisible()
  await expect(page.getByText('Approval workflow', { exact: true })).toBeVisible()
  await expect(page.getByText('Review & submit', { exact: true })).toBeVisible()
})
