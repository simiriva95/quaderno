import { test, expect } from '@playwright/test'
import { seed } from './seed'
test('nessun errore in console nel giro completo', async ({ page }) => {
  const errs: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push(m.text())
  })
  page.on('pageerror', (e) => errs.push(e.message))
  await seed(page)
  await page.goto('/#/')
  await page.waitForTimeout(1500)
  await page.goto('/#/q/demo')
  await page.waitForSelector('.paper')
  await page.getByRole('radio', { name: 'Disegno' }).click()
  await page.waitForTimeout(500)
  await page.goto('/#/nuovo')
  await page.waitForTimeout(500)
  expect(errs).toEqual([])
})
