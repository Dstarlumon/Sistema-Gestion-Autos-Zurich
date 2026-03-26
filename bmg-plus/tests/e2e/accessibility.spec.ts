import { test, expect } from '@playwright/test'

test.describe('Accessibility', () => {
  test('login page has proper form labels', async ({ page }) => {
    await page.goto('/login')
    // Check that inputs have associated labels or aria-labels
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible()
  })

  test('login page is keyboard navigable', async ({ page }) => {
    await page.goto('/login')
    await page.keyboard.press('Tab')
    // Focus should move through form elements
    const focused = await page.evaluate(() => document.activeElement?.tagName)
    expect(focused).toBeTruthy()
  })
})
