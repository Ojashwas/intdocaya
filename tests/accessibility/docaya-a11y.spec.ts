import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('sign-in and authenticated home have no automatically detectable serious violations', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()

  const signIn = await new AxeBuilder({ page }).analyze()
  expectSeriousViolationsToBeEmpty(signIn.violations)

  await page.getByRole('button', { name: /continue with organizational sso/i }).click()
  await expect(page.getByRole('heading', { name: /welcome,/i })).toBeVisible()
  const home = await new AxeBuilder({ page }).analyze()
  expectSeriousViolationsToBeEmpty(home.violations)
})

function expectSeriousViolationsToBeEmpty(
  violations: Array<{ id: string; impact?: string | null; nodes: unknown[] }>,
) {
  const serious = violations.filter((item) => ['critical', 'serious'].includes(item.impact || ''))
  const summary = serious.map((item) => `${item.id}: ${item.nodes.length} node(s)`).join(', ')
  expect(serious, summary).toHaveLength(0)
}
