import { chromium } from '@playwright/test'
const base = process.argv[2] ?? 'http://localhost:5176'
const browser = await chromium.launch({ channel: 'chromium' })
for (const [name, opts] of [['desktop',{viewport:{width:1440,height:900}}],['tablet',{viewport:{width:1000,height:750}}],['mobile',{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}]]) {
  const page = await browser.newPage(opts)
  await page.goto(base + '/#/')
  await page.getByRole('button', { name: 'Crea il tuo primo quaderno' }).click()
  await page.getByPlaceholder('Appunti di…').fill('Storia')
  await page.getByRole('button', { name: 'Metti sulla mensola' }).click()
  await page.waitForURL(/#\/q\//); await page.waitForTimeout(1800)
  const ed = page.getByRole('textbox', { name: 'Testo della pagina 1' })
  await ed.click(); await page.keyboard.insertText('La rivoluzione industriale comincia in Inghilterra. ')
  await page.waitForTimeout(300)
  const corner = page.getByRole('button', { name: 'Gira alla pagina successiva' })
  await corner.hover(); await page.waitForTimeout(300)
  await page.screenshot({ path: `.debugger/reader-${name}-text.png` })
  await corner.click(); await page.waitForTimeout(280)
  await page.screenshot({ path: `.debugger/reader-${name}-midflip.png` })
  await page.waitForTimeout(900)
  await page.getByRole('radio', { name: 'Disegno' }).click(); await page.waitForTimeout(400)
  await page.screenshot({ path: `.debugger/reader-${name}-draw.png` })
  await page.close()
}
await browser.close()
