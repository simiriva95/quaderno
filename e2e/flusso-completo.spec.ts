import { expect, test, type Page } from '@playwright/test'

/** Il giro completo: creo, scrivo, disegno, ricarico, riapro.
 *  `reducedMotion` non è una scorciatoia per i test: è la modalità che l'app
 *  deve comunque supportare, e rende i tempi deterministici. */
test.use({ reducedMotion: 'reduce' })

const TESTO_LUNGO = Array.from(
  { length: 34 },
  (_, i) =>
    `Riga ${i + 1}: gli appunti di oggi parlano di come il vapore abbia cambiato il lavoro.`,
).join(' ')

const leggiQuaderni = (page: Page) =>
  page.evaluate(() => {
    const raw = localStorage.getItem('quaderno:v1')
    return raw ? (JSON.parse(raw).state.notebooks as { pages: { text: string }[] }[]) : []
  })

test('crea, scrivi, disegna, ricarica, riapri', async ({ page }) => {
  await page.goto('/#/')

  // 1. mensola vuota
  const primo = page.getByRole('button', { name: 'Crea il tuo primo quaderno' })
  await expect(primo).toBeVisible()
  await primo.click()

  // 2. atelier
  await page.getByPlaceholder('Appunti di…').fill('Appunti di Storia')
  await page.getByRole('button', { name: 'Copertina Menta' }).click()
  await page.getByRole('button', { name: 'Stelline' }).click()
  await page.getByRole('button', { name: 'Gattino' }).click()
  await page.getByRole('button', { name: 'A righe' }).click()
  await page.getByRole('button', { name: 'Metti sulla mensola' }).click()

  // 3. si apre sul quaderno appena creato
  await expect(page).toHaveURL(/#\/q\//)
  const editor = page.getByRole('textbox', { name: 'Testo della pagina 1' })
  await expect(editor).toBeVisible()

  // 4. il testo trabocca e nasce la pagina 2
  await editor.click()
  await page.keyboard.insertText(TESTO_LUNGO)
  await expect
    .poll(async () => (await leggiQuaderni(page))[0]?.pages.length ?? 0, { timeout: 5000 })
    .toBeGreaterThan(1)

  const quaderni = await leggiQuaderni(page)
  expect(quaderni[0]!.pages[1]!.text.length).toBeGreaterThan(0)

  // su mobile il cursore è già volato a pagina 2: torniamo all'inizio, così
  // il resto del giro vale identico su entrambe le impaginazioni
  // su desktop c'è la freccia, sul telefono solo l'angolo della pagina
  const indietro = page
    .getByRole('button', { name: /pagina precedente/i })
    .filter({ visible: true })
    .first()
  while ((await indietro.count()) && (await indietro.isEnabled())) await indietro.click()

  // nessuna scrollbar dentro la carta, mai
  const overflow = await page
    .getByRole('textbox', { name: /Testo della pagina/ })
    .first()
    .evaluate((el) => el.scrollHeight - el.clientHeight)
  expect(overflow).toBeLessThanOrEqual(1)

  // 5. disegno: un tratto, annulla, ripristina
  await page.getByRole('radio', { name: 'Disegno' }).click()
  const canvas = page.getByRole('img', { name: /Area di disegno, pagina 1/ })
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + 60, box.y + 80)
  await page.mouse.down()
  for (let i = 1; i <= 8; i++) await page.mouse.move(box.x + 60 + i * 14, box.y + 80 + i * 9)
  await page.mouse.up()

  const contaTratti = async () => (await leggiQuaderni(page))[0]!.pages[0]!.strokes?.length ?? 0
  await expect.poll(contaTratti).toBe(1)
  await page.getByRole('button', { name: 'Annulla' }).click()
  await expect.poll(contaTratti).toBe(0)
  await page.getByRole('button', { name: 'Ripristina' }).click()
  await expect.poll(contaTratti).toBe(1)

  // 6. tutto sopravvive a un ricaricamento
  await page.reload()
  await expect(page.getByRole('img', { name: /Area di disegno, pagina 1/ })).toBeVisible()
  expect(await contaTratti()).toBe(1)

  // 7. torno alla mensola e riapro: sono sulla pagina di prima
  await page.getByRole('radio', { name: 'Testo' }).click()
  await page
    .getByRole('button', { name: /pagina successiva/i })
    .filter({ visible: true })
    .first()
    .click()
  const paginaAttesa = await page.evaluate(
    () => JSON.parse(localStorage.getItem('quaderno:v1')!).state.notebooks[0].lastOpenedPageIndex,
  )
  await page.getByRole('button', { name: 'Torna alla mensola' }).click()
  await expect(page).toHaveURL(/#\/$/)
  await page.getByRole('button', { name: 'Apri Appunti di Storia' }).first().click()
  await expect(page).toHaveURL(/#\/q\//)
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('quaderno:v1')!).state.notebooks[0].lastOpenedPageIndex,
      ),
    )
    .toBe(paginaAttesa)
})

test('export e import riportano tutto com’era', async ({ page }) => {
  await page.goto('/#/')
  await page.evaluate(() => {
    const nb = {
      id: 'x',
      title: 'Zibaldone',
      createdAt: 1,
      updatedAt: 1,
      cover: {
        color: 'cielo',
        pattern: 'stars',
        labelText: 'Zibaldone',
        spineColor: 'lino',
        elastic: false,
      },
      paper: 'grid',
      lastOpenedPageIndex: 0,
      pages: [{ id: 'p', text: '<div>ciao</div>', strokes: [], createdAt: 1 }],
    }
    localStorage.setItem('quaderno:v1', JSON.stringify({ state: { notebooks: [nb] }, version: 1 }))
  })
  await page.reload()

  await page.getByRole('button', { name: 'Impostazioni' }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Esporta', exact: true }).click()
  const file = await (await download).path()
  expect(file).toBeTruthy()

  await page.evaluate(() => localStorage.removeItem('quaderno:v1'))
  await page.reload()
  await expect(page.getByRole('button', { name: 'Crea il tuo primo quaderno' })).toBeVisible()

  await page.getByRole('button', { name: 'Impostazioni' }).click()
  await page.locator('input[type="file"]').setInputFiles(file!)
  await expect(page.getByText('Importati 1 quaderni.')).toBeVisible()
  expect((await leggiQuaderni(page))[0]!.pages[0]!.text).toBe('<div>ciao</div>')
})
