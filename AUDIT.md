# Audit del portale — 12 settembre 2026

Chi: un agente in due parti. `npm run audit` ([scripts/audit.mjs](scripts/audit.mjs)) percorre
tutti i casi d'uso su quattro profili (desktop giorno e sera, tablet, telefono) e raccoglie
screenshot, accessibilità (axe-core), bersagli tattili sotto 44px, testi sotto 12px, overflow,
errori in console, tempi e bundle in `.audit/report.md`. Sopra, una revisione euristica con il
target in mente — studentesse e studenti 16–24 — che ha letto rapporto, 60 screenshot e codice.
Questo file è la sintesi; si rigenera rilanciando lo script e rifacendo la revisione.

## In numeri (rapporto automatico)

|                           | desktop | desktop sera | tablet | telefono |
| ------------------------- | ------- | ------------ | ------ | -------- |
| DOMContentLoaded          | 65 ms   | 57 ms        | 55 ms  | 57 ms    |
| prima scena 3D            | 410 ms  | 399 ms       | 382 ms | 379 ms   |
| errori console (15 passi) | 0       | 0            | 0      | 0        |
| overflow orizzontale      | mai     | mai          | mai    | mai      |
| testi < 12px              | 0       | 0            | 0      | 0        |
| violazioni axe distinte   | 9       | 6            | 9      | 9        |

Violazioni axe ricorrenti: contrasto delle etichette da 12px al 60% (atelier, impostazioni,
conteggio quaderni), `aria-label` su un `div` (anteprima carta), checkbox del to-do e
`input type=file` senza etichetta, `role=menu` con un figlio che non è `menuitem`, nessun `h1`
nel quaderno aperto. Bersagli sotto 44px: solo la lista `sr-only` della mensola (voluta) e le
checkbox nel testo, che scalano con la pagina.

Bundle: primo paint 58.7 KB gzip; il chunk della mensola 3D (three.js) 236 KB gzip, caricato
dopo.

Corretto oggi, prima di scrivere il piano: colori del disegno (erano tutti neri: il canvas
non risolve `var()`), astuccio sotto la pagina sul telefono, evidenziatore su più righe,
baseline dei titoli sulla seconda riga, home vuota in 3D.

---

Data: 2026-09-12 · Base: `.audit/report.md` + 60 screenshot in `.audit/{desktop,desktop-sera,tablet,telefono}/` + lettura di `src/` (nessuna esecuzione, nessuna modifica).

Target considerato: studentesse e studenti 16–24 che oggi usano GoodNotes/Notability (iPad + Pencil), Notion (organizzare), carta (ripasso) e Instagram/Pinterest per l'estetica dello studio. I bisogni che ho usato come metro: **organizzare per materia, ritrovare, ripassare, to-do, evidenziare, usare sul telefono in classe o in treno, personalizzare con gusto, condividere, non perdere niente**.

Premessa sulla misurazione: l'app non ha backend né analytics (scelta giusta). "Come misurarne l'effetto" qui significa: script `npm run audit` (axe, bersagli, contrasto), screenshot e2e come regressione visiva, invarianti del `debug:portale`, e 4–5 sessioni moderate con studentesse su compiti fissi (creare un quaderno, scrivere titolo + checklist, disegnare di sera, ritrovare una parola, condividere una pagina). Le percentuali d'uso si misurano solo in quelle sessioni.

---

## 1. Discrepanze e attriti

Ordinati per gravità. Per ciascuno: **dove** (passo + profilo), **evidenza**, **gravità**, **perché conta per il target**.

### Alta

**A1. Il colore dei tratti di disegno non viene applicato: tutto è nero, e di sera è invisibile.** ✅ _Corretto il 12/09: il token si risolve al momento del paint (`lib/strokes.ts`), i tratti seguono il tema._

- Dove: `disegno` in tutti i profili; drammatico in `desktop-sera/10-disegno.png`.
- Evidenza: in `desktop-sera/10` i tratti sono neri su carta color caffè, quasi indistinguibili dalle righe. In `desktop/10` e `telefono/10` il colore selezionato è "grafite" (grigio caldo `oklch 35%`) ma i tratti sono nero pieno. Codice: `Reader.tsx` passa a `DrawCanvas` `color={\`var(--c-${toolColor})\`}`e`strokes.ts`fa`ctx.fillStyle = stroke.color`. Il canvas 2D non risolve `var()`: l'assegnazione è ignorata e il fill resta `#000`. Quindi **nessuno dei 6 colori dell'astuccio funziona** (cambia solo il pallino sull'icona) e i tratti non si adattano al tema. Il progetto ha già il risolutore giusto (`cssVar()`in`lib/covers.ts`, usato dalla mensola 3D).
- Gravità: **alta**.
- Perché conta: la scena tipica è "schema disegnato in classe di giorno, ripasso a letto di sera". Oggi la sera lo schema sparisce. E un astuccio con sei colori che non colorano rompe la fiducia nell'oggetto.

**A2. Sul telefono il titolo del quaderno è troncato a "Le…" in ogni schermata del quaderno.**

- Dove: `telefono/04` → `telefono/12` (tutti).
- Evidenza: header = indietro + titolo + lente + ⋯ + T/matita; l'`<input>` del titolo (flex-1) riceve 48 px (report: "Titolo del quaderno — 48×40"). "Letteratura" diventa "Le…".
- Gravità: **alta**.
- Perché conta: chi ha 6–9 materie apre e chiude quaderni di continuo; senza titolo leggibile non sai dove sei. In più il titolo è l'unico punto per rinominare (è un input) e troncato non lo si scopre mai.

**A3. Sul desktop la pagina destra della doppia pagina è "morta": si vede ma non si può scrivere né disegnare.**

- Dove: `quaderno-aperto` e `scrittura` su desktop e tablet (`desktop/04`, `desktop/05`, `tablet/05`), `sfoglia` (`desktop/11`).
- Evidenza: due pagine a schermo ma "Pagina 1 di 1"; la destra non ha numero. In `Reader.tsx` `TextPage`/`DrawCanvas` si montano solo se `page` esiste, e la pagina destra nasce solo premendo la freccia o quando la sinistra ha contenuto (`canGoNext = … || lastHasContent`). In `desktop/11` "Pagina 3 di 3" con due fogli visibili: stesso fenomeno.
- Gravità: **alta**.
- Perché conta: su carta si scrive dove si vuole; la doppia pagina "schema a sinistra, riassunto a destra" è un pattern di studio classico. Cliccare sulla destra e non ottenere il cursore fa pensare che l'app sia rotta. Anche la freccia "→" attiva con "1 di 1" (`desktop/05`) è incoerente.

**A4. Il pulsante "Metti sulla mensola" è sotto la piega su desktop e tablet, e su telefono l'intero form è sotto l'anteprima.**

- Dove: `atelier` e `atelier-personalizzato`: `desktop/02`, `desktop/03` (si vede solo un bordo blu a y≈890 su 900), `desktop-sera/02` (idem), `tablet/02` (nemmeno il bordo; anche "Carta" ed "Elastico" fuori), `telefono/02` (il primo schermo è tutta anteprima, "Come lo chiami?" è a fondo schermo).
- Evidenza: `Atelier.tsx` — griglia `lg:grid-cols-[1fr_420px]` con colonna destra lunga e CTA in fondo; nessun elemento sticky. La colonna sinistra usa 280 px su ~800 disponibili: molto spazio sprecato mentre il CTA sparisce.
- Gravità: **alta** (è il primo compito del funnel).
- Perché conta: su un portatile da 13" (1366×768 o 1440×900) la studentessa non vede come confermare. Su telefono deve scorrere tutto un modulo prima di poter perfino dare un nome.

**A5. Passando da testo a disegno la pagina cambia posto e dimensione; sul telefono finisce sotto l'astuccio.** ✅ _Telefono corretto il 12/09: l'astuccio è in colonna sotto la pagina. Restano tablet/desktop (voce 5 del piano)._

- Dove: `disegno` vs `scrittura`: `telefono/10` vs `telefono/05`; `tablet/10` vs `tablet/05`; `desktop/10` vs `desktop/05`.
- Evidenza: su telefono la pagina parte a y≈205 CSS (era 122) e il fondo è coperto dal cassetto dell'astuccio: l'ultimo terzo del foglio non si vede e non si disegna. Su tablet la pagina perde ~25% di larghezza (x 84→244) perché l'astuccio laterale entra nel flex; su desktop si sposta a destra e in basso fin quasi al bordo (y 875/900). L'astuccio è montato solo in `draw` e la barra del testo solo in `text`, quindi il contenitore che `useFitScale` misura cambia.
- Gravità: **alta** sul telefono, media su tablet/desktop.
- Perché conta: iPad + Pencil è _il_ caso d'uso di chi viene da GoodNotes, e proprio lì la superficie di disegno si rimpicciolisce. Un quaderno che si sposta quando prendi la matita smentisce il principio "un oggetto, non un'interfaccia".

**A6. Importare un file JSON sostituisce tutti i quaderni senza conferma.**

- Dove: `impostazioni` (`desktop/14`, `telefono/14`, `desktop-sera/14`).
- Evidenza: `SettingsSheet.importFile` → `replaceAll(imported)` appena scelto il file. L'unico avviso è la nota in 12 px a opacità 0.6 sotto ("L'importazione sostituisce quelli esistenti"), che axe segnala per contrasto.
- Gravità: **alta** (perdita dati irreversibile con un solo tap).
- Perché conta: lo scambio di appunti tra compagne passerà da qui ("ti mando il mio quaderno di Fisica"): l'esito oggi è che sparisce tutto il proprio. "Cancella tutti" chiede "Sicuro?", "Importa" no.

### Media

**M1. Residui gialli di evidenziatore vuoto sulla carta.** ✅ _In parte corretto il 12/09: l'evidenziatore su più righe avvolge nodo per nodo e salta spazi e ZWSP. Resta il `<mark>` su selezione vuota (voce 7)._

- Dove: `telefono/05`–`09`, `desktop/05`–`09`, `desktop-sera/05`; enormi in `desktop/08-zoom-quarto.png`.
- Evidenza: barrette gialle sulla riga sopra "Il Romanticismo" e sotto la checklist. `richtext.wrapSelection` su selezione collassata inserisce `<mark>​</mark>` (zero-width space) "per tenere lo strumento in mano"; la regola `.hand-text mark:empty` non lo cattura perché non è vuoto. Resta nell'HTML salvato.
- Gravità: media (è un difetto visibile della carta, cioè del prodotto).

**M2. Icone degli strumenti indistinguibili e senza etichetta.**

- Dove: `telefono/10`, `desktop/10`, `tablet/10`.
- Evidenza: `PencilCase.tsx` usa `Highlighter` sia per "Pennarello" sia per "Evidenziatore"; matita e penna sono due tratti sottili quasi uguali. Nessun testo sotto. Nella barra del testo, invece, i tre evidenziatori non hanno stato selezionato (`aria-pressed` assente) e il "cancellino" ha la stessa icona della gomma del disegno e dello "Svuota" del menu ⋯ (`telefono/04`, `/10`, `/12`): tre gomme, tre significati.
- Gravità: media.
- Perché conta: chi evidenzia per ripassare deve saper distinguere il pennarello coprente dall'evidenziatore trasparente al primo colpo.

**M3. Sul telefono non c'è alcuna indicazione di pagina.**

- Dove: `telefono/05`, `telefono/11`.
- Evidenza: "Pagina X di Y" è `hidden sm:block`; il numero a piè pagina è `text-2xs` (12 px) × scala ~0.6 ≈ 7 px a opacità 0.35: illeggibile.
- Gravità: media.
- Perché conta: "a che pagina ero" e "quante ne ho" servono per ripassare e per ritrovare.

**M4. Su telefono, mentre si personalizza, l'anteprima non si vede.**

- Dove: `telefono/03-atelier-personalizzato.png`.
- Evidenza: scelto "Stelline" + lavanda + gatto, in viewport c'è solo il foglio di carta; la copertina è scrollata via. Il feedback dal vivo, che è tutto il senso dell'atelier, sparisce proprio sul dispositivo principale.
- Gravità: media.
- Perché conta: per questo pubblico "personalizzare con gusto" è un motivo per aprire l'app; senza vedere il risultato si tira a indovinare.

**M5. Etichette da 12 px sbiadite: contrasto insufficiente in modo sistematico.**

- Dove: `atelier` (axe: 14 nodi `h2` "Come lo chiami?", "Copertina", "Motivo"…), `impostazioni` (5 nodi: legenda "Luce", nota finale), `mensola-piena` (conteggio "9 quaderni"), `torna-mensola` su telefono.
- Evidenza: `text-2xs` (0.75 rem) con `opacity-60/70` su `--c-graphite`. Il rapporto non trova testi <12 px, ma i 12 px al 60% non passano.
- Gravità: media.
- Perché conta: si legge su un treno controluce, spesso con luminosità al minimo per la batteria.

**M6. Di sera l'atelier mostra colori "di sera": si sceglie un pastello e si ottiene fango.**

- Dove: `desktop-sera/02-atelier.png`.
- Evidenza: cipria/pesca/malva/lino sono quasi identici; l'anteprima della carta "a righe" è una lastra nera senza righe visibili. Le copertine di sera perdono 35% di luminosità e 20% di chroma per scelta (DESIGN §1), giusto sulla mensola; nell'atelier però la scelta va fatta sui colori veri.
- Gravità: media.
- Perché conta: la personalizzazione è una decisione estetica; se il risultato di giorno è un altro colore, la decisione era cieca.

**M7. Il menu ⋯ ha solo azioni distruttive, e dopo la creazione la copertina non si può più cambiare.**

- Dove: `menu-azioni` (`desktop/12`, `telefono/12`).
- Evidenza: "Svuota…" ed "Elimina questo quaderno"; l'elemento distruttivo appare già evidenziato (sfondo `desk` del `DangerButton` + hover residuo). Non esistono "Rinomina" (il titolo è un input, ma nulla lo dice), "Cambia copertina / carta", "Esporta questo quaderno", "Vai a pagina", "Aggiungi pagina". Non c'è alcuna rotta di modifica dell'atelier.
- Gravità: media (alta per la mancanza di modifica copertina, dato il target).
- Perché conta: nomi che cambiano ("Storia" → "Storia moderna", secondo quadrimestre), gusti che cambiano, sticker sbagliato scelto di fretta: oggi si rifà il quaderno da zero perdendo le pagine.

**M8. Impostazioni su telefono: "Come il sistema" va a capo con l'icona staccata; "Suoni spenti" sembra un bottone disabilitato.**

- Dove: `telefono/14-impostazioni.png`.
- Evidenza: tre opzioni `flex-1` in 390 px; il toggle suoni è un `<button aria-pressed>` con lo stesso look di un pulsante `desk`, senza interruttore visivo.
- Gravità: media-bassa.

**M9. Zoom sul telefono: il quarto è tagliato dalla barra e le frecce galleggiano sul testo; nessun pinch in modalità testo.**

- Dove: `telefono/07`, `telefono/08` (identici per costruzione).
- Evidenza: il testo è troncato a destra ("nato", "L'inf", "per v") e in basso dalla barra di scrittura; le frecce ‹ › stanno a metà pagina sopra le parole; non si sa quale quarto (1/4) si guarda. `useZoomPan` (pinch) è attivo solo in disegno.
- Gravità: media.
- Perché conta: sul telefono lo zoom è il modo normale di leggere appunti scritti da desktop; il gesto atteso è il pinch, non una lente a due scatti.

**M10. Nessuna modalità "solo penna" né rifiuto del palmo.**

- Dove: `disegno` su tablet.
- Evidenza: `useDrawingCanvas` scarta solo i pointer non primari; con il palmo appoggiato + Pencil i due pointer diventano pinch/pan (`useZoomPan`) o tratti spuri.
- Gravità: media.
- Perché conta: è la prima cosa che chi viene da GoodNotes/Notability prova, e la prima su cui giudica.

**M11. Il testo non ha "annulla" visibile.**

- Dove: `scrittura` su telefono (`telefono/05`).
- Evidenza: `InkToolbar` non ha undo/redo; resta il Cmd/Ctrl+Z del browser (su iPhone: scuoti o tastiera). Il disegno invece li ha.
- Gravità: media.

**M12. Sulla mensola la personalizzazione si vede solo sul primo quaderno; nessun ordine, data o riordino.**

- Dove: `desktop/15`, `telefono/15`, `tablet/15`.
- Evidenza: 7 quaderni su 8 mostrano solo il dorso: motivo e adesivo scelti con cura spariscono. L'ordine è quello di creazione; `updatedAt` esiste nel modello ma non è mostrato né usato. Su telefono i dorsi sono ~25 px CSS di larghezza uno accanto all'altro: bersagli stretti (il report segnala 9 "Apri …" a 24 px: sono i proxy `sr-only`, ma il problema di larghezza dei dorsi 3D resta).
- Gravità: media.
- Perché conta: "qual è quello che ho toccato ieri" e "trova Latino tra nove" sono le due domande della mensola.

**M13. Non c'è modo di condividere o esportare una pagina/un quaderno (PDF, immagine).**

- Dove: `impostazioni`, `menu-azioni`.
- Evidenza: esiste solo l'export JSON di tutta la libreria.
- Gravità: media (alta per l'aspettativa del target).
- Perché conta: mandare gli appunti a chi era assente, stamparli per ripassare, postare la pagina bella: è il secondo bisogno dopo scrivere, e il canale naturale per far conoscere l'app.

**M14. Nessuna ricerca.**

- Evidenza: con 9 quaderni e più pagine ritrovare "Foscolo" significa sfogliare tutto. I dati sono già in RAM (`notebooks[].pages[].text`).
- Gravità: media.

**M15. Il chunk della mensola pesa 236 KB gzip (three.js) su un'app da 61 KB al primo paint.**

- Dove: report, sezione Bundle; "prima scena" 380–410 ms in locale.
- Gravità: media-bassa (in 4G a scuola diventa più di un secondo di mensola scheletro).

### Bassa

- **B1. Accessibilità (axe):** `aria-label` su `div` nell'atelier (anteprima carta); checkbox del to-do senza etichetta (`TODO_HTML`); `input type=file` senza label; `role="menu"` con un `DangerButton` che non è `menuitem`; nessun `h1` nel quaderno aperto.
- **B2. Indicatore di salvataggio** incoerente e minuscolo accanto al titolo: rombo, spunta, matita, nulla (`desktop/05`, `06`, `09`, `10`; `telefono/05`, `06`). La matita in modalità disegno si confonde con l'indicatore di modalità.
- **B3. Chip non selezionati nell'atelier** ("Tinta unita", "Righe") sembrano testo, non opzioni (`desktop/02`); i colori non hanno nome visibile (solo `title` al passaggio del mouse, quindi mai su touch).
- **B4. Nessun manifest né `apple-touch-icon`:** "Aggiungi a Home" su iPhone produce un'icona generica. La PWA con service worker è esclusa per scelta (DESIGN M6), ma il manifest non lo richiede.
- **B5. La didascalia al passaggio ("Poesie")** compare a fondo schermo, lontana dal quaderno (`telefono/15`).
- **B6. Le frecce cambiano posto** fra zoom e non (`desktop/05` vs `07`) e la barra copre il fondo pagina in zoom (`desktop/07`, `08`).
- **B7. Il placeholder "Inizia a scrivere…"** esiste solo a pagina 1: le pagine nuove non invitano (`telefono/11`).
- **B8. Di sera lo slot tratteggiato "+"** è quasi invisibile (`desktop-sera/01`).
- **B9. Swipe di 60 px sul contenitore** in modalità testo: trascinare una selezione con il dito può girare pagina (da verificare su iOS).

---

## 2. Cosa funziona e va protetto

- **Coerenza fra i quattro profili.** Stessa gerarchia, stessi token, stesse metafore da 390 a 1440 px; il tema "sera" è davvero una stanza al buio e non un'inversione (`desktop-sera/01`, `05`, `14`, `15`).
- **La carta.** Righe in SVG e testo che resta sulle righe a qualunque scala; il quarto di pagina in `desktop/08` è leggibilissimo. Corpo S/M/L con passo fisso (`telefono/06`).
- **Le tre cose che una studentessa usa davvero — titolo, evidenziatore, checklist — sono a un tap** e rendono bene a mano (`telefono/05`).
- **Bersagli e igiene tecnica.** Tutti i controlli a 44 px, zero testi sotto i 12 px, zero errori in console, DOMContentLoaded ~60 ms, Lighthouse 95/100.
- **Copy e conferme.** Italiano caldo e breve, mai infantile; le azioni distruttive si armano sul posto ("Sicuro?") senza `confirm()`.
- **Mensola a ripiani.** 4 per ripiano sul telefono: nove quaderni in un colpo d'occhio senza scroll (`telefono/15`).
- **Primo avvio senza onboarding ma chiaro:** "La mensola aspetta il primo quaderno" + un solo CTA (`telefono/01`, `desktop/01`).
- **Autosave silenzioso e suoni spenti di default.** Il silenzio come feature regge.

---

## 3. Piano di miglioramento prioritizzato

Sforzo: **S** ≤ mezza giornata · **M** 1–3 giorni · **L** una settimana o più.

### Subito (correggono difetti che il target incontra nella prima ora)

| #   | Cosa                                                                                                                                                                                                                                                             | Perché per il target                                                              | Sforzo | Come misurare                                                                                                                     |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Risolvere i colori dei tratti** con `cssVar()` al momento del paint e salvare il _token_ nello stroke (non l'esadecimale), così di sera si adattano come il testo. Migrare gli stroke esistenti con `var(--c-…)` al token. (A1)                                | Disegni visibili di sera e sei colori che colorano.                               | S      | Test e2e che campiona un pixel del canvas dopo un tratto blu (≠ `#000`) in giorno e sera; screenshot `disegno` in `desktop-sera`. |
| 2   | **Header del telefono su due righe**: sopra indietro + titolo pieno + ⋯, sotto (o nella riga della barra) "2 / 5" e lente. Oppure spostare la lente dentro ⋯. Mostrare l'icona matita accanto al titolo al focus per far capire che si rinomina. (A2, M3)        | Sapere in che quaderno e a che pagina si è.                                       | S      | Nessun troncamento con titoli ≤ 20 caratteri a 390 px; "Pagina X di Y" visibile in `telefono/05`.                                 |
| 3   | **Pagina destra sempre scrivibile**: montare `TextPage`/`DrawCanvas` anche se `page` non esiste e chiamare `appendPage` al primo input; etichetta "Pagine 1–2 di 2". (A3)                                                                                        | Il quaderno si comporta come carta.                                               | S/M    | Click sulla destra → cursore; invariante nel `debug:portale`: "pagina visibile ⇒ editabile".                                      |
| 4   | **Atelier: CTA sticky in basso** su tutti i viewport; su telefono anteprima ridotta (≈120 px) sticky in alto che segue le scelte; su desktop/tablet ridurre l'aria della colonna sinistra e portare "Come lo chiami?" in evidenza. (A4, M4)                      | Creare il primo quaderno senza cercare il pulsante; vedere quello che si sceglie. | M      | CTA e anteprima nel viewport a 1366×768, 1024×768 e 390×844 senza scroll; tempo al primo quaderno nelle sessioni moderate.        |
| 5   | **Stessa scatola per testo e disegno**: riservare l'altezza della barra in entrambe le modalità (barra e astuccio nello stesso slot, `visibility` invece di mount/unmount) e su tablet/desktop far entrare l'astuccio come overlay flottante, non nel flex. (A5) | La pagina non si muove quando prendi la matita; su iPad il foglio resta grande.   | M      | Bounding box della pagina identico fra T e matita nei quattro profili (asserzione nello script di audit).                         |
| 6   | **Import con scelta "Aggiungi" (default, merge per `id`) / "Sostituisci" (DangerButton)**. (A6)                                                                                                                                                                  | Scambiarsi quaderni senza perdere i propri.                                       | S      | Test e2e: import su libreria piena → nessuna perdita senza conferma esplicita.                                                    |
| 7   | **Niente `<mark>` su selezione vuota** (o pulizia dei mark con solo ZWSP a ogni `onInput`) e stato selezionato sugli evidenziatori. (M1)                                                                                                                         | Carta pulita.                                                                     | S      | Nessun `mark` con solo `​` nell'HTML salvato (invariante debugger).                                                               |
| 8   | **Icone distinte + etichette brevi sotto gli strumenti** (Matita, Penna, Pennarello, Evidenziatore, Gomma); tre icone diverse per "gomma disegno", "cancellino formattazione", "svuota pagina". (M2)                                                             | Scegliere lo strumento al primo colpo.                                            | S      | Sessioni: 5/5 individuano l'evidenziatore senza tentativi.                                                                        |
| 9   | **Contrasto delle etichette**: 12 px → 13–14 px, opacità ≥ 0.85, o colore dedicato `--c-label` verificato AA in entrambi i temi; "Come il sistema" → "Sistema" o icona sopra. (M5, M8)                                                                           | Leggibilità sul treno.                                                            | S      | axe `color-contrast` = 0 in tutti i passi.                                                                                        |

### Prossimo (colmano le aspettative di chi viene da GoodNotes/Notion, restando "oggetto")

| #   | Cosa                                                                                                                                                                                                                                       | Perché per il target                                                             | Sforzo | Come misurare                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| 10  | **Modificare copertina, carta e nome dopo la creazione**: rotta `/q/:id/atelier` riusando `Atelier` in modalità edit, voce "Cambia copertina" nel menu ⋯. (M7)                                                                             | I gusti e le materie cambiano; oggi si rifà tutto.                               | M      | Voce presente e funzionante; nessuna perdita di pagine dopo l'edit (e2e).                                        |
| 11  | **Esporta / condividi**: "Questa pagina come immagine" (render 600×840 → PNG, Web Share API su telefono) e "Questo quaderno come PDF" (print CSS a due pagine per foglio). (M13)                                                           | Mandare appunti a chi mancava, stampare per ripassare, postare la pagina bella.  | M/L    | Export completato in ≤ 3 tap; PDF con righe allineate al testo; sessioni: 5/5 riescono a condividere una pagina. |
| 12  | **Mensola con ordine e memoria**: ordina per "ultima modifica" (default), nome, creazione; nella didascalia hover/focus "aggiornato ieri"; riordino trascinando il dorso (o "sposta" da menu). Mostrare `updatedAt`, che esiste già. (M12) | Trovare il quaderno di oggi tra nove.                                            | M      | Tempo per aprire "il quaderno toccato ieri" con 9 quaderni.                                                      |
| 13  | **Ricerca nel testo di tutti i quaderni** dal campo in alto sulla mensola: risultati "Letteratura · p. 3 · …Foscolo per venerdì" che aprono la pagina giusta. (M14)                                                                        | Ritrovare senza sfogliare.                                                       | M      | Task "trova Foscolo" in ≤ 10 s.                                                                                  |
| 14  | **Modalità "solo penna"** nell'astuccio (accetta solo `pointerType === 'pen'` quando attiva; pinch solo con due dita `touch`) e rifiuto del tocco mentre la penna è giù. (M10)                                                             | Apple Pencil senza tratti del palmo.                                             | M      | Test manuale su iPad: 0 tratti spuri in 2 minuti di scrittura a mano.                                            |
| 15  | **Annulla/ripristina nel testo** (stack di snapshot HTML per pagina, max 30) con i due pulsanti nella barra; Cmd/Ctrl+Z mappato. (M11)                                                                                                     | Sbagliare senza panico, anche sul telefono.                                      | S/M    | Invariante: undo dopo un input ripristina l'HTML precedente.                                                     |
| 16  | **Pinch per zoomare anche in testo** sul telefono e quarto corrente indicato ("1/4"); frecce fuori dalla carta anche zoomati. (M9)                                                                                                         | Leggere sul telefono appunti scritti da desktop.                                 | S      | Screenshot `telefono/08` senza testo coperto dalla barra.                                                        |
| 17  | **Menu ⋯ completo**: Rinomina, Cambia copertina, Vai a pagina…, Aggiungi pagina bianca, Esporta questo quaderno, poi separatore, Svuota, Elimina. Rimuovere l'evidenziazione di default dal distruttivo. (M7)                              | Le azioni che ci si aspetta da un quaderno, senza scoprire input nascosti.       | S      | axe `aria-required-children` = 0; sessioni: 5/5 rinominano senza aiuto.                                          |
| 18  | **Manifest + icone iOS/Android** (senza service worker). (B4)                                                                                                                                                                              | "Aggiungi a Home" con l'icona del quaderno: l'app in classe si apre come un'app. | S      | Icona corretta su iOS/Android; `display: standalone`.                                                            |
| 19  | **Colori "di giorno" nell'atelier anche di sera** (o doppia anteprima giorno/sera). (M6)                                                                                                                                                   | Scegliere il colore vero.                                                        | S      | Swatch identici fra `desktop/02` e `desktop-sera/02`.                                                            |
| 20  | **Mensola 2D come prima vista** finché il chunk 3D non arriva (poi crossfade), o preload del chunk al `hover`/`touchstart` su "Crea". (M15)                                                                                                | Nessuna attesa in 4G.                                                            | M      | Prima scena utile < 200 ms su throttling "Fast 3G".                                                              |

### Dopo (crescita coerente con "un oggetto semplice, non un Notion")

| #   | Cosa                                                                                                                                                                                                  | Perché per il target                                                                      | Sforzo | Come misurare                                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------- |
| 21  | **Un ripiano per materia (o per semestre), nominabile**: è la forma fisica delle "cartelle", senza tag né database. Schema v2 con `migrate`.                                                          | Organizzare 10+ quaderni come sulla mensola vera.                                         | L      | Con 16 quaderni, tempo per trovarne uno; nessuna regressione della camera 3D. |
| 22  | **Foto nella pagina** (una alla volta, come una foto incollata: ritaglio, ridimensionamento, compressione ≤ 150 KB). Richiede spostare i dati su IndexedDB per non saturare i 5 MB di `localStorage`. | La foto della lavagna o del libro accanto agli appunti è un bisogno reale in classe.      | L      | Quota mai superata in 50 foto; pagina con foto esportata in PDF.              |
| 23  | **Adesivi e washi tape sulla pagina** (gli stessi 10 dell'atelier + 4 nastri).                                                                                                                        | Personalizzare la pagina, non solo la copertina: è l'estetica studygram con mezzi minimi. | M      | Sessioni: piacevolezza percepita; nessun impatto su paginazione.              |
| 24  | **Promemoria di backup gentile**: dopo 30 giorni senza export, una riga discreta sulla mensola "Non esporti da un mese". Niente cloud.                                                                | Non perdere un anno di appunti cancellando i dati del browser.                            | S      | Frequenza di export nelle sessioni lunghe.                                    |
| 25  | **Scorciatoie di tastiera** (Cmd/Ctrl+B/U, H per titolo, PgUp/PgDn per le pagine, `?` per l'elenco) e navigazione della mensola annunciata.                                                           | Chi scrive al portatile scrive veloce.                                                    | S      | Elenco `?` presente; e2e su ogni scorciatoia.                                 |
| 26  | **Sveglietta da studio sulla mensola** (timer 25/5 come oggetto di scena, opzionale). Valutare: coerente con la stanza, ma è una feature in più. Da non fare prima di 11–13.                          | "Study with me" è un'abitudine del target.                                                | M      | Uso nelle sessioni; se < 2/5 lo cercano, non farlo.                           |

Fuori perimetro, volutamente: promemoria con notifiche, sincronizzazione cloud, collaborazione in tempo reale, tag liberi. Tolgono all'app il suo carattere e ne richiedono un backend.

---

## Nota di metodo

I bersagli "Apri Storia — 77×24" nel rapporto sono i pulsanti della lista `sr-only` (Shelf.tsx): non sono un problema per chi tocca la mensola 3D, ma restano il solo accesso per screen reader e vanno bene così. Il vero bersaglio da guardare sul telefono è la larghezza dei dorsi (~25 px CSS) in `telefono/15`. La coppia `zoom-pagina`/`zoom-quarto` è identica su telefono per costruzione (due soli livelli): lo script d'audit può saltare il passo o etichettarlo.
