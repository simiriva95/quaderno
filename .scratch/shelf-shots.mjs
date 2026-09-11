import { chromium } from '@playwright/test'
const base = process.argv[2] ?? 'http://localhost:5176'
const OUT = '.debugger'
const colors = ['menta','pesca','cielo','lavanda','burro','terracotta','salvia','malva','cipria','lino']
const patterns = ['plain','dots','stripes','gingham','stars','clouds']
const stickers = ['stella','nuvola','gatto','tazza','foglia',undefined]
const n = Number(process.argv[3] ?? 6)
const notebooks = Array.from({length:n},(_,i)=>({
  id:`nb${i}`, title:['Storia','Matematica','Idee','Ricette','Poesie','Diario','Fisica','Latino','Disegni','Viaggi'][i%10],
  createdAt: 1e12+i, updatedAt:1e12+i,
  cover:{color:colors[i%10], pattern:patterns[i%6], sticker:stickers[i%6], labelText:'', spineColor:colors[(i+3)%10], elastic:i%2===0},
  paper:'lined', lastOpenedPageIndex:0, pages:[{id:`p${i}`,text:'',strokes:[],createdAt:1e12}],
}))
const browser = await chromium.launch({ channel: 'chromium' })
for (const [name, opts] of [['desktop',{viewport:{width:1440,height:900}}],['mobile',{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}]]) {
  for (const theme of ['light','dark']) {
    const page = await browser.newPage(opts)
    await page.goto(base + '/#/')
    await page.evaluate(([nbs, theme]) => {
      localStorage.setItem('quaderno:v1', JSON.stringify({state:{notebooks:nbs, quotaExceeded:false}, version:1}))
      localStorage.setItem('quaderno:prefs:v1', JSON.stringify({state:{theme, sounds:false, tool:'pencil', toolColor:'ink', toolSize:1, ink:'ink'}, version:1}))
    }, [notebooks, theme])
    await page.reload(); await page.waitForTimeout(2500)
    await page.mouse.move(700, 300)
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${OUT}/shelf-${name}-${theme}-${n}.png` })
    await page.close()
  }
}
await browser.close()
