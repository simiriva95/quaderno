import { expect, test, type Page } from '@playwright/test'

/** Il raccoglitore: foglio unico che scorre, immagini in IndexedDB, diagrammi.
 *  Le immagini sono il motivo per cui questo tipo di quaderno esiste, quindi
 *  il giro che conta è: incolla → ricarica → esporta → cancella → reimporta. */
test.use({ reducedMotion: 'reduce' })

const nuovoRaccoglitore = async (page: Page, titolo: string) => {
  await page.goto('/#/nuovo')
  await page.getByRole('button', { name: 'Web dev' }).click()
  await page.getByPlaceholder('Appunti di…').fill(titolo)
  await page.getByRole('button', { name: 'Metti sulla mensola' }).click()
  await expect(page).toHaveURL(/#\/w\//)
  await expect(page.getByRole('textbox', { name: 'Documento' })).toBeVisible()
}

/** Incolla un PNG vero, come farebbe uno screenshot dal sistema. */
const incollaImmagine = (page: Page) =>
  page.evaluate(async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 240
    canvas.height = 120
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#2b6cb0'
    ctx.fillRect(0, 0, 240, 120)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
    const dt = new DataTransfer()
    dt.items.add(new File([blob!], 'shot.png', { type: 'image/png' }))
    const editor = document.querySelector<HTMLElement>('.tiptap')!
    editor.focus()
    editor.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }),
    )
  })

const testoSalvato = (page: Page) =>
  page.evaluate(
    () =>
      (
        JSON.parse(localStorage.getItem('quaderno:v1')!).state.notebooks as {
          kind?: string
          pages: { text: string }[]
        }[]
      )[0]!,
  )

test('il raccoglitore scrive, incolla, disegna un diagramma e sopravvive al reload', async ({
  page,
}) => {
  await nuovoRaccoglitore(page, 'AI Engineering')

  const editor = page.getByRole('textbox', { name: 'Documento' })
  await editor.click()
  await editor.pressSequentially('RAG in due minuti')
  await page.keyboard.press('Enter')

  // il diagramma è un blocco di codice come gli altri
  await editor.pressSequentially('```mermaid ')
  await editor.pressSequentially('flowchart LR')
  await page.keyboard.press('Enter')
  await editor.pressSequentially('  Q[Domanda] --> L[LLM]')
  await expect(page.locator('.mermaid-figure svg')).toBeVisible({ timeout: 15000 })

  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await incollaImmagine(page)
  await expect(editor.locator('img')).toBeVisible()

  // il documento salvato cita l'immagine, non la contiene
  await expect
    .poll(async () => (await testoSalvato(page)).pages[0]!.text, { timeout: 5000 })
    .toContain('qimg:')
  const salvato = await testoSalvato(page)
  expect(salvato.kind).toBe('web')
  expect(salvato.pages[0]!.text).not.toContain('data:image')
  expect(salvato.pages[0]!.text.length).toBeLessThan(4000)

  // ricaricare rimette l'immagine al suo posto, letta da IndexedDB
  await page.reload()
  await expect(editor.locator('img')).toBeVisible()
  expect(await editor.locator('img').evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(240)
  await expect(editor).toContainText('RAG in due minuti')
})

test('export e import riportano anche le immagini', async ({ page }) => {
  await nuovoRaccoglitore(page, 'Con foto')
  const editor = page.getByRole('textbox', { name: 'Documento' })
  await editor.click()
  await editor.pressSequentially('Lo screenshot della lezione')
  await incollaImmagine(page)
  await expect(editor.locator('img')).toBeVisible()
  await expect
    .poll(async () => (await testoSalvato(page)).pages[0]!.text, { timeout: 5000 })
    .toContain('qimg:')

  await page.goto('/#/')
  await page.getByRole('button', { name: 'Impostazioni' }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Esporta', exact: true }).click()
  const file = await (await download).path()
  expect(file).toBeTruthy()

  // via tutto: quaderni e magazzino delle immagini
  await page.evaluate(async () => {
    localStorage.removeItem('quaderno:v1')
    await new Promise((r) => {
      const req = indexedDB.deleteDatabase('quaderno-blobs')
      req.onsuccess = r
      req.onerror = r
      req.onblocked = r
    })
  })
  await page.reload()
  await expect(page.getByRole('button', { name: 'Crea il tuo primo quaderno' })).toBeVisible()

  await page.getByRole('button', { name: 'Impostazioni' }).click()
  await page.locator('input[type="file"]').setInputFiles(file!)
  await expect(page.getByText('Importati 1 quaderni.')).toBeVisible()

  const id = await page.evaluate(
    () => JSON.parse(localStorage.getItem('quaderno:v1')!).state.notebooks[0].id as string,
  )
  await page.goto(`/#/w/${id}`)
  const ripreso = page.getByRole('textbox', { name: 'Documento' }).locator('img')
  await expect(ripreso).toBeVisible()
  expect(await ripreso.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(240)
})

test('i tasti dicono come si chiamano, e il menu inserisce', async ({ page }) => {
  await nuovoRaccoglitore(page, 'Strumenti')
  const editor = page.getByRole('textbox', { name: 'Documento' })
  await editor.click()

  // la targhetta arriva anche col focus da tastiera, non solo col mouse
  await page.getByRole('button', { name: 'Evidenzia' }).hover()
  await expect(page.getByRole('tooltip')).toContainText('Evidenzia')

  // i blocchi si scelgono per nome
  await page.getByRole('button', { name: 'Inserisci' }).click()
  const menu = page.getByRole('menu', { name: 'Cosa inserire' })
  await expect(menu.getByRole('menuitem', { name: /Diagramma/ })).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: /Citazione/ })).toBeVisible()
  await menu.getByRole('menuitem', { name: /Diagramma/ }).click()
  await expect(page.locator('.mermaid-figure svg')).toBeVisible({ timeout: 15000 })
})

test("il collegamento chiede l'indirizzo sul posto, senza prompt di sistema", async ({ page }) => {
  await nuovoRaccoglitore(page, 'Link')
  const editor = page.getByRole('textbox', { name: 'Documento' })
  await editor.click()
  await editor.pressSequentially('Udemy')
  await page.keyboard.press('ControlOrMeta+a')

  await page.getByRole('button', { name: 'Collegamento' }).click()
  await page.getByRole('textbox', { name: 'Indirizzo del collegamento' }).fill('udemy.com')
  await page.getByRole('button', { name: 'Applica' }).click()
  await expect(editor.locator('a[href="https://udemy.com"]')).toHaveText('Udemy')
})

test('svuotare il foglio lo svuota davvero, anche dopo un reload', async ({ page }) => {
  await nuovoRaccoglitore(page, 'Da buttare')
  const editor = page.getByRole('textbox', { name: 'Documento' })
  await editor.click()
  await editor.pressSequentially('roba scritta per sbaglio')
  await expect.poll(async () => (await testoSalvato(page)).pages[0]!.text).toContain('sbaglio')

  await page.getByRole('button', { name: 'Altre azioni' }).click()
  await page.getByRole('button', { name: 'Svuota questo foglio' }).click()
  await expect(editor).not.toContainText('sbaglio')

  // il debounce dell'editor smontato non deve resuscitare il testo
  await page.waitForTimeout(1200)
  expect((await testoSalvato(page)).pages[0]!.text).not.toContain('sbaglio')
  await page.reload()
  await expect(editor).not.toContainText('sbaglio')
})
