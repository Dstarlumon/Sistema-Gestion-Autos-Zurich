import { test, expect } from '@playwright/test'

test.describe('Navigation (unauthenticated)', () => {
  test('should load landing page', async ({ page }) => {
    await page.goto('/landing')
    await expect(page.locator('text=BMG+')).toBeVisible()
    await expect(page.locator('text=Iniciar Sesión')).toBeVisible()
  })

  test('should redirect root to login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })
})
