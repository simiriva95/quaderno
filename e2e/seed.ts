import type { Page } from '@playwright/test'

const demoPage = (text: string) => ({
  id: Math.random().toString(36).slice(2),
  text,
  strokes: [],
  createdAt: 1700000000000,
})

export const DEMO_NOTEBOOK = {
  id: 'demo',
  title: 'Appunti di Storia',
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
  cover: {
    color: 'salvia',
    pattern: 'dots',
    sticker: 'stella',
    labelText: 'Appunti di Storia',
    spineColor: 'terracotta',
    elastic: true,
  },
  paper: 'lined',
  lastOpenedPageIndex: 0,
  pages: [
    demoPage(
      '<span class="hand-title">La rivoluzione industriale</span><div><br></div>' +
        '<div>Il vapore cambia tutto: prima la <mark class="hl-giallo">filatura</mark>, poi il trasporto.</div>' +
        '<div>Manchester passa da 25.000 a 300.000 abitanti in ottant’anni.</div><div><br></div>' +
        '<div><span class="ink-rosso">Da ricordare:</span> il telaio meccanico e la macchina di Watt.</div>' +
        '<div><br></div><div><label class="todo" contenteditable="false"><input type="checkbox" checked /></label>&nbsp;leggere il capitolo 4</div>' +
        '<div><label class="todo" contenteditable="false"><input type="checkbox" /></label>&nbsp;rifare lo schema delle date</div>',
    ),
    demoPage('<div>Le <u>enclosures</u> svuotano le campagne.</div>'),
  ],
}

export async function seed(page: Page, notebooks: unknown[] = [DEMO_NOTEBOOK]) {
  await page.addInitScript((nbs) => {
    localStorage.setItem('quaderno:v1', JSON.stringify({ state: { notebooks: nbs }, version: 1 }))
  }, notebooks)
}
