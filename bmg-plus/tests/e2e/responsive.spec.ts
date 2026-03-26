import { test, expect } from '@playwright/test'

test.describe('Responsive', () => {
  test('login page works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/login')
    await expect(page.locator('text=BMG+')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test('landing page works on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/landing')
    await expect(page.locator('text=BMG+')).toBeVisible()
  })
})
