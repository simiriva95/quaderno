# DESIGN.md — Il Quaderno degli Appunti dello Studente

Registro delle scelte di gusto e del perché. Si aggiorna a ogni milestone.

---

## Il principio

L'app ha poche funzioni: scrivere, disegnare, sfogliare. Tutto il valore sta nel **peso
degli oggetti**. Un quaderno che si apre come un file non è un quaderno. Ogni decisione
qui sotto risponde alla stessa domanda: _questo si comporta come carta e cartoncino?_

---

## 1. Palette

Tutti i colori sono autorati in **OKLCH**, non in hex o HSL. Su una palette pastello
la differenza è visibile: interpolando in sRGB un rosa cipria verso un pesca si passa
per un grigio sporco, in OKLCH no. La chroma è ridotta man mano che la lightness sale
(un pastello all'90% di lightness vive intorno a 0.03–0.07 di chroma; sopra diventa acido).

I neutri **non sono neutri**: `--c-graphite` ha chroma 0.008 in hue 70 (ambra). Il nero
puro non esiste in natura e sulla carta calda stona. Stessa logica per le ombre, che
hanno tinta ambra (`--sh-tint: 28 18 12`) e mai grigio.

**Dark mode = "sera in cameretta"**, non un'inversione. La carta diventa `oklch(26.9% 0.01 61)`
— ambrata, come sotto una lampada da scrivania — non grigio scuro. Il legno scurisce
mantenendo la hue. Le copertine perdono 35% di lightness e 20% di chroma: restano
riconoscibili come _quella_ copertina. I contrasti sono verificati separatamente, non dedotti.

## 2. Tipografia

|          | Scelta                          | Perché non le alternative                                                                                                                                                                                                                                                                                    |
| -------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Quaderno | **Caveat Variable** 21px / 32px | Patrick Hand e Kalam non hanno asse variabile: per un titolo servirebbe un secondo file. Caveat ha copertura completa dei diacritici italiani (à è ì ò ù + maiuscole accentate, che molti handwriting saltano) e una baseline stabile — indispensabile, visto che il testo deve cadere sulle righe al pixel. |
| UI       | **Nunito Variable**             | Quicksand non ha corsivo e i diacritici sotto 14px si impastano. Nunito ha la famiglia completa e terminali arrotondati che non stridono col resto.                                                                                                                                                          |

Scala UI a `rem` fissi (12/14/16/20/26/34), non `clamp()`. Il fluid type è per le landing;
qui è una app, e un pulsante che cambia dimensione col viewport è solo rumore.

## 3. La regola delle righe

Il numero più importante del progetto è `--rule-step: 32px`.

È contemporaneamente: il passo del `repeating-linear-gradient` della carta, il `line-height`
del testo, e il passo della griglia sulla carta a quadretti. Non sono tre valori coordinati:
è **un** valore. Se cambia, cambia tutto insieme e l'allineamento resta.

`--rule-drop` (7px) è la manopola di taratura dell'offset fra baseline del font e riga
disegnata. Non è calcolabile dalle metriche in modo affidabile (dipende da hinting e
rendering del browser): si guarda e si aggiusta. Resta esposta come variabile CSS apposta.

## 4. Motion

| Contesto         | Curva                                      |
| ---------------- | ------------------------------------------ |
| Oggetti fisici   | spring `stiffness 260, damping 26, mass 1` |
| UI               | 200–280ms `cubic-bezier(.22,1,.36,1)`      |
| Uscite           | 65% dell'entrata                           |
| Signature moment | 1200–1600ms, timeline orchestrata          |

**Spring sì, rimbalzo no.** Damping 26 su stiffness 260 dà un micro-assestamento — un
oggetto pesante che si posa — non l'elastico da cartone animato. Solo `transform` e
`opacity`, mai `width`/`height`/`top`.

`prefers-reduced-motion` non spegne le animazioni: le sostituisce con crossfade da 120ms.
Il page flip diventa un cambio pagina istantaneo, il replay dei tratti non parte, la
mensola 3D cade sul fallback 2D.

## 5. Decisioni architetturali di gusto

**Mensola piena → ripiani multipli, non scroll orizzontale.**
8 quaderni per ripiano; il nono ne apre uno sotto e la camera arretra. Lo scroll
orizzontale rompe la metafora della stanza (le mensole non scorrono) e peggiora la
navigazione da tastiera. I ripiani sono la crescita naturale dell'oggetto.

**Apertura copertina → handoff 3D → DOM.**
I primi ~600ms sono Three.js (estrazione + rotazione). Quando la copertina è frontale e
piatta, i suoi quattro angoli vengono proiettati in coordinate schermo e il testimone
passa a un elemento DOM posizionato lì (FLIP). Cardine e sfoglio avvengono in DOM.
Il quaderno aperto _deve_ essere DOM — testo selezionabile, canvas, screen reader — e
qualsiasi crossfade da 3D a DOM si vede. Con l'handoff il salto avviene nell'unico
istante in cui i due rendering sono indistinguibili.

**Strokes in spazio logico 600×840, non in pixel schermo.**
Il disegno resta identico a ogni dimensione, il localStorage si dimezza (coordinate
arrotondate a 1 decimale), e il replay è deterministico.

**Anteprima dell'atelier in CSS 3D, non in Three.js.**
A quella scala e con quell'illuminazione è indistinguibile, costa 0 KB e non lega la
schermata di creazione al chunk di three.

## 6. Deviazioni dal brief

1. **`oxlint` al posto di ESLint.** È il linter del template Vite dal 2025, è già
   configurato a zero, ed è ~50× più veloce. `npm run lint` esegue `oxlint && prettier --check`.
   Se serve ESLint per una regola specifica si aggiunge; oggi non serve.
2. **Nessuna delle altre.** Stack, palette, data model e milestone seguono il brief.

## 7. Copy

Italiano, caldo, breve. Mai infantile, mai motivazionale. "Il quaderno è pieno. Esporta
o elimina qualcosa." non "Ops! Sembra che tu abbia finito lo spazio 😅".

---

# Registro delle scelte, milestone per milestone

Quello che segue è stato deciso durante la costruzione, non prima. Ogni voce
risponde a un problema concreto emerso guardando la cosa vera.

## M1 — La griglia della carta

**Il titolo è un blocco, non un inline.** Un `<span>` con `font-size: 30px`
dentro un paragrafo da 21px allarga la line box di 3px anche con lo stesso
`line-height`: i due font, allineati sulla stessa baseline, hanno mezzo-leading
diverso e l'unione dei due box supera il passo. Tre pixel per riga si accumulano
e dopo dieci righe il testo galleggia sopra le righe della carta. Il titolo è
quindi `display: block` con `line-height: calc(var(--rule-step) * 2)`: occupa
due righe esatte, come quando si scrive un titolo su un quaderno vero.

**`--rule-lift: 7px`.** Misurato, non calcolato: con Caveat a 21px in una line
box da 32px la baseline cade a 23px dal bordo alto. La riga va disegnata 2px
sotto. Resta una variabile CSS perché al primo cambio di font va rifatta.

**Le pagine si toccano.** Il `GUTTER` è 0 e la piega è solo un gradiente in
`multiply`. Con uno spazio in mezzo sembravano due fogli, non un quaderno; e
l'ombra andava messa sull'intero blocco, perché due ombre affiancate disegnano
una fessura luminosa al centro.

**Il traboccamento taglia il DOM, non il testo.** `splitAtHeight` misura su uno
specchio fuori schermo, trova con una ricerca binaria il primo carattere che
sfora l'ultima riga, arretra al confine di parola ed estrae il resto con un
`Range`. Così inchiostri, evidenziatori e checkbox sopravvivono al passaggio di
pagina — con uno split su stringa sarebbero andati persi.

## M2 — Disegno

**I profili degli strumenti sono sei numeri.** Non serve una texture per far
sembrare una matita una matita: bastano `thinning`, `streamline`, opacità e
`taper` giusti (vedi `lib/strokes.ts`). L'evidenziatore usa `multiply`, la gomma
`destination-out` — così anche cancellare resta un tratto vettoriale e quindi
annullabile.

**Due canvas.** Uno per i tratti già posati, uno per quello in corso. Ridisegnare
tutto a ogni `pointermove` con `perfect-freehand` costa; separando i due livelli
il tratto vivo ridisegna solo sé stesso.

**`getCoalescedEvents`.** Su penna e trackpad ad alta frequenza metà dei punti
non arriva mai come evento separato. Senza, i tratti veloci diventano spezzate.

## M3 — Atelier

**Anteprima in CSS 3D.** A 280px di larghezza è indistinguibile da una scena
Three, costa zero KB e non lega la schermata di creazione al chunk di three.js.

**L'elastico sta sul taglio.** In mezzo alla copertina leggeva come una riga
stampata, non come un elastico.

## M4 — Mensola

**Una sola implementazione della copertina.** `lib/covers.ts` dipinge su canvas,
e lo stesso canvas diventa `background-image` nel DOM e `CanvasTexture` nel 3D.
Non è pigrizia: nel passaggio mensola → quaderno aperto le due copertine devono
combaciare, e due implementazioni non combaciano mai.

**I colori si risolvono con un canvas 1×1.** I token sono in OKLCH; three.js non
sa leggere `oklch()` e lascia il materiale bianco senza dire niente, e nemmeno
`getComputedStyle` aiuta perché in CSS Color 4 il valore calcolato di un colore
oklch resta oklch. Li facciamo dipingere a un canvas e leggiamo i byte. Stessa
storia per `rgb(r g b)`: three accetta solo la sintassi con le virgole, quindi
si restituisce esadecimale.

**Il materiale nasce con la sua texture.** Assegnare una `map` a un materiale
già compilato non ricompila lo shader: il quaderno resta bianco. Si monta il
mesh con una `key` che cambia quando le texture sono pronte.

**La parete è un fondale, non una superficie.** Le sagome dei quaderni proiettate
sul muro leggevano come poligoni grigi. La parete ora è `meshBasicMaterial` con
un gradiente verticale e non riceve ombre; sotto ogni ripiano c'è una macchia
morbida _dipinta_. Una stanza vera ha ombre morbide, non proiezioni nette.

**Esposizione.** Con `NoToneMapping` — scelto per tenere i pastelli fedeli al
CSS — la somma delle intensità luminose va tenuta intorno a 1. Sopra, ogni
superficie chiara sbianca e la mensola diventa di plastica.

**Meno quaderni per ripiano sugli schermi stretti** (4 invece di 8): la fila è
più corta, la camera può avvicinarsi, e i dorsi restano leggibili invece di
diventare fiammiferi in fondo alla stanza.

## M5 — La transizione

**Tutto in DOM, con la consegna al primo frame.** Il piano prevedeva di girare
in 3D per ~600ms e passare il testimone al DOM a metà strada. La consegna
avviene invece subito: si legge il rettangolo che il dorso occupa sullo schermo
(proiettando la posizione del mesh con la camera) e da lì parte un quaderno DOM
che si porta al centro, apre la copertina e sfoglia. Stesso effetto, e nessuna
cucitura possibile — non ci sono due rendering da far combaciare. Funziona anche
sul fallback 2D, dove il rettangolo è semplicemente `getBoundingClientRect()`.

**La copertina ha un rovescio.** Senza `backface-visibility: hidden` e una
seconda faccia, aprendola si vedeva l'etichetta specchiata.

**Il ritorno dura il 65%.** E riparte dal rettangolo salvato in `sessionStorage`
quando il quaderno è stato aperto: si rimette esattamente al suo posto.

## M6 — Rifiniture

**I suoni sono sintetizzati, non file.** Tre campioni brevi costerebbero ~90 KB
e un giro di rete. Venti righe di WebAudio pesano zero: rumore filtrato per il
fruscio e la matita, una sinusoide che decade per il "tump".

**Router scritto a mano.** Tre rotte piatte, nessun loader, nessun data layer:
`react-router` costava ~13 KB gzip nel bundle iniziale per fare `location.hash`.
Il brief prevedeva l'hash come alternativa.

**`motion` fuori dal bundle iniziale.** Il `Toaster` è l'unico componente
montato subito; animandolo in CSS invece che con `motion`, la libreria scende
nei chunk delle scene. Il JavaScript del primo paint è passato da 113 a 61 KB
gzip, e Lighthouse mobile da 92 a 95.

**Lo scheletro di avvio è nell'HTML.** La mensola vuota si vede prima che il
JavaScript arrivi. I suoi stili stanno sull'elemento e non su `#root`: applicati
a `#root` restavano addosso all'app dopo il mount, e un `place-items: center`
dimenticato lì rendeva `<main>` largo 600px dentro un viewport da 390.

**`min-w-0` sui flex item che contengono la pagina.** La pagina ha larghezza
fissa (600px, scalata con una `transform`): senza `min-w-0` il flex item prende
`min-width: auto` e il layout sfonda il viewport su mobile.

**PWA: no.** Il brief la dava come opzionale. Un service worker su una app che
vive interamente in `localStorage` aggiunge una cache da invalidare e un modo
in più di servire una versione vecchia, in cambio di un offline che il browser
già garantisce dopo la prima visita.

## M7 — Provarlo davvero

**Il flip era in deadlock.** `AnimatePresence onExitComplete` chiamava `onDone`,
ma il foglio usciva solo quando `leaf` tornava `null` — cosa che faceva proprio
`onDone`. La rotazione finiva, il foglio restava nel DOM e `go()` rifiutava ogni
sfoglio successivo. I test non lo vedevano perché girano con `reducedMotion`,
che salta l'animazione. Ora `onDone` arriva da `onAnimationComplete`: il foglio
è già stato disegnato sopra le pagine di arrivo e può sparire secco.

**Sotto il foglio che gira c'è già la pagina di arrivo.** In pagina singola
(telefono) il foglio se ne va a sinistra e svanisce sull'ultimo 45%; indietro
rientra da lì. Il cardine è sempre il bordo sinistro, come un blocco ad anelli.

**Gli angoli si girano.** Le frecce da sole non bastavano: sono un'affordance
da slideshow, non da quaderno. In basso, sul bordo esterno di ogni pagina, un
angolo si solleva al passaggio e gira al click; sul telefono resta appena
visibile come invito. Le frecce restano, ma grandi, di carta, e accanto al
quaderno: la riga è `[astuccio] [freccia] [pagina] [freccia]` e la pagina misura
lo spazio che resta fra i vicini, così l'astuccio non copre più la freccia.

**Un tratto orizzontale non è uno swipe.** Il gesto di sfoglio si ignora in
modalità disegno: i touch del canvas risalivano al contenitore e una riga di
matita girava pagina.

**Righe da 1.5px.** La pagina vive sotto uno `scale()`: una riga da 1px a scala
0.7 cade fra due pixel e sparisce, una sì e una no. Si vedeva come righe
irregolari, e sembrava un difetto della carta.

**La mensola è di legno.** Venatura procedurale su canvas (mappa colore +
rugosità), listello frontale, reggimensola. La parete è uno `ShaderMaterial`:
gradiente, grana d'intonaco a due ottave, vignetta, una chiazza di luce (la
finestra di giorno, la lampada di sera) e l'ombra morbida sotto ogni ripiano
dipinta nello shader, non proiettata. Le ombre dei quaderni sono
`ContactShadows`, non shadow map: sono quelle che un oggetto fa sul piano su cui
poggia. Un `RoomEnvironment` generato dà un filo di riflesso alle copertine
(`environmentIntensity` 0.28: con `NoToneMapping` di più sbianca).

**Il quaderno ha un taglio.** Non più un parallelepipedo con sei texture: due
copertine di cartone, un blocco di pagine rientrato con le righe dei fogli, il
dorso appena sporgente, l'elastico. Dall'alto si legge "quaderno". La
transizione di apertura non cambia: parte ancora dal rettangolo proiettato del
gruppo.

**Gli oggetti di scena hanno colori propri.** Tazza, pianta, matite non leggono
i token del tema: di sera è la luce a cambiare, non la ceramica. Con i token la
tazza diventava nera.

**La camera segue il mouse di un soffio** e c'è un pulviscolo lento nella luce:
la stanza ha una profondità, non è un poster. Niente di più: il brief chiedeva
artistico, non movimentato.

**Un debugger che usa il portale** (`npm run debug:portale`): Playwright senza
`reducedMotion`, desktop e telefono, uno scenario guidato e poi azioni a caso.
Dopo ogni azione verifica gli invarianti — nessun foglio rimasto a mezz'aria,
etichetta coerente con lo storage, pagina corrente a schermo, zero scrollbar
nella carta, testo a schermo uguale a quello salvato, frecce nello stato giusto,
console pulita — e ogni violazione diventa un bug con screenshot in `.debugger/`.
È questo che ha trovato il deadlock.

**Il corpo del testo si sceglie, il passo delle righe no.** Tre corpi (22/26/30px)
sotto la stessa `line-height` di 32px; il default era 21px e il testo galleggiava
fra le righe. La taratura della riga (`--rule-lift`) dipende dal corpo — la
baseline di Caveat cade a 23/24/26px dal bordo alto della line box — quindi
misurata a coppie: 7/6/4px. Corpo e taratura vivono su `:root`, non sulla
pagina: lo specchio con cui `paginate.ts` misura il testo è appeso a `body` e
deve leggere lo stesso corpo, o taglia le pagine per un testo diverso da quello
che si vede. Al cambio di corpo le pagine si riversano tutte.

**Invio dentro un titolo esce dal titolo.** Il browser continua lo span e tutto
il resto della pagina nasceva a due righe in grassetto.

**Zoom a passi, non a rotella.** Tutto → una pagina → un quarto di pagina (sul
telefono la pagina è già tutto: dritti ai quarti). È la stessa `scale()` che
adatta la pagina al contenitore, con una traslazione che porta la zona scelta al
centro: nessun secondo layout, il testo resta modificabile da vicino. Zoomati,
le frecce scorrono le zone in ordine di lettura — pagina sinistra, destra, poi i
quattro quarti — e in fondo girano pagina, secca: il foglio che gira non si
legge da vicino. `+`, `-` ed `Esc` da tastiera; l'ingrandimento parte dal punto
dove sta il cursore.

**La mensola è un cartone animato.** `MeshToonMaterial` con una rampa a tre
toni (ombra, mezzo tono, luce) al posto del PBR, e contorni a inchiostro fatti
alla vecchia maniera: la stessa forma un filo più grande, disegnata dal lato
interno (`Hull.tsx`). Un guscio per quaderno, non per mesh, o si vedrebbero
righe fra copertina e pagine. La tazza ha un guscio chiuso a parte: con il
profilo aperto il contorno si vedeva anche dentro. Le `Outlines` di drei non
disegnavano nulla sulle nostre mesh; dieci righe nostre sì. Il colore del
contorno è `--c-ink`: blu di giorno, crema di sera, come un gessetto.

**Di tre quarti.** Camera a 30° di azimut e un po' più alta: si vede la
copertina dell'ultimo quaderno, lo spessore della tavola, la stanza. La
distanza tiene conto dell'ingombro ruotato. Ondeggio lento della camera (mezzo
grado, un soffio in altezza) e foglie che respirano: la scena è viva, non
mossa. L'environment map è sparita: il toon non la legge.

**Le righe sono un SVG, non un gradiente.** Sotto lo `scale()` della pagina
Chrome arrotonda al pixel intero ogni tessera del `repeating-linear-gradient`:
il passo diventa 30–31px invece di 32, il testo resta a 32, e riga dopo riga
le parole scivolano via dalle righe. Con una sola immagine vettoriale 600×840
righe e testo scalano insieme e restano allineati a qualunque zoom. La
taratura verticale (`--rule-lift`) arriva via `transform` CSS, così i tre corpi
del testo continuano a funzionare.

**Le linee invisibili catturavano i click.** Il raycaster di three non guarda
`visible` e per le linee usa una soglia di 1 unità di mondo: l'anello di focus
di ogni quaderno e il bordo tratteggiato dello slot "nuovo" avevano un'area di
click grande come la mensola, e cliccare ovunque apriva il primo quaderno. Ora
hanno `raycast` spento. Trovato con una mappa dei click lungo il ripiano.

**Il sollevamento va verso la camera.** Con la camera di tre quarti un passo
lungo z appariva come uno scivolamento di lato sopra il vicino, e hover e click
rimbalzavano fra quaderni adiacenti. La camera sta a sinistra, così lo slot
"nuovo", ultimo a destra, è il più lontano e non copre nessuno; la distanza si
trova proiettando gli otto vertici della mensola, non con la trigonometria del
solo fronte.

**Cancellare è dietro un menu, e chiede conferma sul posto.** Nel quaderno il
"⋯" apre "Svuota le pagine aperte" ed "Elimina questo quaderno"; nelle
impostazioni c'è "Cancella tutti i quaderni". Le azioni distruttive sono un
`DangerButton`: al primo click si arma e chiede "Sicuro?", dopo tre secondi
torna com'era. Niente `confirm()` di sistema in una cartoleria.

**I contorni restano scuri anche di sera.** Con il token dell'inchiostro (crema
al buio) leggevano come bordi bianchi; il tratto a china è sempre scuro.

**Il perno del quaderno è lo spigolo davanti in basso.** Inclinandosi verso di
te alza il retro invece di affondare nella tavola.

**`max-w-md` non è una larghezza qui.** Il tema definisce `--spacing-md`, e in
Tailwind v4 `max-w-md` la prende per buona: 16px. Il pannello delle
impostazioni era una colonna di 50px da chissà quando. `max-w-[28rem]`.

**I colori del disegno erano tutti neri.** Il canvas 2D non risolve `var(--c-ink)`:
l'assegnazione a `fillStyle` viene ignorata e resta `#000`. Sei colori nell'astuccio,
nessuno colorava, e di sera i tratti sparivano sulla carta scura. Ora il token si
risolve al momento del paint con lo stesso `cssVar()` della mensola, così i tratti
seguono anche il tema. Trovato dalla revisione UX dell'audit, non dai test: nessuno
guardava il colore di un pixel.

**L'astuccio sul telefono sta sotto la pagina, non sopra.** Era assoluto in basso e
copriva l'ultimo terzo del foglio; la riga del lettore è una colonna sotto `md`.

**L'evidenziatore avvolge nodo per nodo.** Un solo `mark` attorno a una selezione su
più righe portava dentro blocchi e ritorni a capo, e con `box-decoration-break: clone`
lasciava strisce gialle sulle righe vuote.

**La baseline del titolo cade sulla seconda riga.** Con la line-height piena di due
righe il titolo galleggiava a metà; padding sopra e line-height ridotta della stessa
misura lo appoggiano sulla riga. Misurato per i tre corpi.

**L'audit è un agente in due parti** (`npm run audit` + revisione euristica): la sintesi e
il piano stanno in `AUDIT.md`.

**Un solo vassoio in basso, per testo e disegno.** L'astuccio laterale era un
oggetto bello ma faceva muovere la pagina: montato solo in disegno, cambiava il
contenitore che `useFitScale` misura. Ora astuccio e portapenne stanno nello
stesso slot, alto uguale, e la pagina non si sposta. Sul telefono le barre sono
una riga che scorre, non tre righe.

**Testo e tratti convivono.** In disegno il testo resta sotto, in sola lettura;
in testo i tratti si vedono con la matita posata. Prima i due layer si
escludevano e prendere appunti a mano sopra il testo era impossibile.

**La pagina destra si scrive anche se non è nata.** `withPage` la crea al primo
segno: su carta si scrive dove si vuole.

**Header del telefono su due righe.** Titolo intero sopra; lente, "Pagina 2 di 5"
e T/matita sotto. Il gruppo di modalità è un componente con `layoutId` diverso
per riga, o `motion` litigherebbe fra i due.

**Importare chiede.** "Aggiungi" (per `id`, default) o "Sostituisci tutto" con
conferma. Prima rimpiazzava tutto al volo.

## Punteggi

|         | Performance | Accessibilità | Best practices |
| ------- | ----------- | ------------- | -------------- |
| Mobile  | 95          | 100           | 100            |
| Desktop | 100         | 100           | 100            |

Misurati su `dist/` servito con gzip (come fa Vercel). Con `vite preview`, che
non comprime, la performance mobile scende a ~81: non è la app, è il server di
anteprima.

## M8 — Il raccoglitore

**Un secondo oggetto, non una terza carta.** Studiare AI engineering vuol dire
incollare screenshot, tenere blocchi di codice e disegnare schemi di RAG. Nessuna
di queste cose entra nel quaderno a mano, e non per gusto: `lib/paginate.ts`
taglia al primo carattere che sfora, e un'immagine alta novecento pixel non ha un
carattere dove tagliare; `--rule-step: 32px` è insieme passo delle righe,
`line-height` e griglia, e il monospaziato non ci vive dentro; e soprattutto
`persist` riserializza **l'intero** array dei quaderni a ogni tasto, quindi uno
screenshot in base64 sarebbe un `JSON.stringify` da megabyte a ogni battuta. Il
raccoglitore è quindi un `kind` sul quaderno, una scena sua, e un foglio che
scorre. Sulla mensola si riconosce da tre anelli sul dorso, dall'etichetta
stampata invece che scritta a mano, e dal fatto che è un filo più grosso — lo
scarto resta sotto il `GAP`, o i vicini si toccherebbero.

**Il campo `kind` è opzionale.** Assente vuol dire `'paper'`. Così i quaderni già
sulla mensola restano validi senza una migrazione che li riscriva, e i test e2e
che costruiscono il quaderno a mano non cambiano di una riga.

**La rotta è `#/w/`, non `#/q/`.** Non è cosmetica. `scripts/debugger.mjs` attiva
i suoi invarianti solo dentro `/#\/q\//`, e due di quelli sono la negazione
letterale di questa pagina: «mai una scrollbar dentro la carta» (la radice di
ProseMirror _è_ un contenteditable che scorre) e «testo a schermo uguale allo
storage» (contro un documento JSON non vuol dire niente). Con un prefisso diverso
il debugger li salta da solo, mentre il suo controllo sulla console resta attivo
ovunque.

**Le immagini stanno in IndexedDB, il documento le cita.** Nel testo salvato
l'immagine è `qimg:<id>`: un `blob:` URL muore al reload, un data URL riporterebbe
i megabyte in `localStorage`. La conversione avviene solo ai due bordi della
persistenza — `hydrate` all'apertura, `dehydrate` al salvataggio — così l'editor
lavora con URL veri e non sa niente del magazzino. Gli screenshot passano da
`createImageBitmap` + `OffscreenCanvas` e scendono a webp: due megabyte diventano
centocinquanta kilobyte, senza una dipendenza.

**I blob orfani se ne vanno con un mark & sweep, non con quattro hook.** Quaderno
eliminato, foglio svuotato, import che sostituisce tutto, annulla: agganciare ogni
percorso vuol dire dimenticarne uno. Una sola raccolta a `requestIdleCallback`,
con gli id trovati da una regex sulle stringhe salvate, copre anche i percorsi non
ancora scritti.

**Il documento si salva in JSON, non in HTML.** L'HTML perde proprio le cose per
cui esiste questo quaderno: il linguaggio del blocco di codice, la larghezza
dell'immagine, lo stato delle caselle, le colonne della tabella. E all'import
`Node.fromJSON` rifiuta qualunque nodo fuori schema — validazione strutturale
gratis, contro una allowlist da mantenere a mano. Restano gli attributi, che sono
stringhe libere: `src` e `href` si ripuliscono con `scrub()` in `lib/docimages.ts`.
Fatto senza schema apposta: la validazione vera vive nel chunk dell'editor, e
tirarla sul percorso di import porterebbe centosessantacinque kilobyte nel bundle
iniziale.

**Il salvataggio ha un debounce di mezzo secondo.** Il quaderno di carta scrive a
ogni tasto perché la pagina pesa poco; un documento web è 50–200 KB di JSON, e
`persist` riscrive tutto. Si sciacqua al blur e su `beforeunload`, o l'ultimo mezzo
secondo di scrittura si perderebbe chiudendo la scheda.

**Mermaid arriva solo se serve.** Pesa più di tre volte il primo paint. Un solo
file lo nomina (`MermaidPreview.tsx`), e lo importa quando un diagramma entra
davvero in vista: una pagina senza diagrammi non scarica niente. `securityLevel:
'strict'` — le direttive `click` sanno eseguire `javascript:` — e nessun array
`secure` nostro, o un `%%{init}%%` dentro il diagramma potrebbe riaprire proprio
quella impostazione. Si chiama `parse()` prima di `render()`: un diagramma
illeggibile dentro `render` inietta un SVG d'errore in fondo al documento, e
l'errore deve restare dentro il blocco.

**I colori del codice sono token, non un tema di highlight.js.** I temi di
highlight.js sono esadecimali fissi: di sera si spaccano. Quattordici righe che
mappano `.hljs-keyword` su `--c-ink-violet`, `.hljs-string` su `--c-ink-green` e
via così, e il tema scuro non costa niente. Stessa logica al contrario per
mermaid: i token sono in OKLCH e la libreria colori di mermaid non sa leggerli,
quindi si usa il suo tema `neutral`/`dark` letto da `data-theme`.

**Il diagramma prende la larghezza del foglio.** Mermaid disegna alla dimensione
naturale: dentro un contenitore che si stringe sul contenuto, un flowchart di
quattro nodi diventava un francobollo.

**Il testo poggia su un foglio.** Il resto dell'app è fatto di oggetti che stanno
da qualche parte; il documento non poteva essere l'unico a galleggiare sulla
scrivania.

**La checkbox delle cose da fare ha un'etichetta.** Il `TaskItem` di serie è un
`input` nudo dentro una `label` vuota: è la stessa violazione axe già corretta una
volta su `TODO_HTML`, e sarebbe rientrata dalla finestra.

## M9 — Il vassoio che si spiega

**Le icone non bastano quando non sono oggetti.** Nel quaderno a mano gli strumenti sono
penne colorate: si capiscono a vista. Qui `<>` e `[<>]` sono due cose diverse — codice in
mezzo al testo e blocco di codice — e nessuno lo indovina. Quindi ogni tasto dice come si
chiama: una targhetta al passaggio del mouse **e col focus da tastiera**, con la
scorciatoia accanto; `title` da solo arriva dopo un secondo e non si vede mai.

**I blocchi si scelgono per nome, in un menu.** "Inserisci" elenca titolo, sottotitolo,
elenchi, cose da fare, citazione, blocco di codice, diagramma, tabella, immagine, riga,
togli formattazione — con nome, icona e scorciatoia. È anche l'unico posto dove si scopre
che il diagramma esiste: la voce ne inserisce uno già scritto, da modificare. Una barra di
sole icone non lo avrebbe mai raccontato.

**Targhette e menu vivono in un portale.** La barra scorre in orizzontale sul telefono, e
un contenitore che scorre in orizzontale ritaglia anche in verticale: tutto ciò che stava
sopra la barra spariva. Il portale entra in `<main>` e non in fondo al `body`, o axe
segnala contenuto fuori dai punti di riferimento della pagina.

**Il collegamento chiede l'indirizzo sul posto.** Niente `prompt()` di sistema, come per
le azioni distruttive. Senza niente di selezionato scrive l'indirizzo stesso: è quello che
si voleva, e un link su una selezione vuota non avrebbe su cosa posarsi.

**Un evidenziatore anche qui.** Il quaderno a mano ne ha tre; per ripassare del codice ne
basta uno, e usa la stessa tinta della carta (`--c-hl-yellow`), non un giallo da schermo.

**Le scorciatoie si scrivono col simbolo giusto.** `⌘⌥C` su Mac, `Ctrl+Alt+C` altrove:
una scorciatoia scritta con i tasti sbagliati è peggio che non scriverla.

**Le maniglie del ridimensionamento arrivavano senza stile.** Quattro `div` da 0×0, sugli
angoli, invisibili e impossibili da prendere: il trascinamento c'era e non l'avrebbe mai
trovato nessuno. Ora sono quattro quadretti seduti a cavallo degli angoli, che compaiono
quando l'immagine è scelta o quando il mouse ci passa sopra, con la freccia giusta per
ogni angolo.

**Il contenitore dell'immagine si stringe su quello che contiene.** È largo quanto la
riga: rimpicciolita l'immagine, il contorno della selezione restava largo com'era, e
sembrava che l'immagine ci ballasse dentro.

## M10 — Dal telefono

**Sul telefono non si incolla: si prende dalla libreria.** Il percorso vero è
"Inserisci → Immagine", che apre la libreria foto o la fotocamera. Funziona già, ma non lo
diceva nessuno: ora la voce di menu ha il suo nome e il suo suggerimento ("o incollala e
basta").

**Un'immagine incollata da una pagina web non era nostra.** Arrivava dentro l'HTML in due
forme, e nessuna delle due andava bene: come `data:` spariva senza dire niente
(`allowBase64: false` la buttava), come indirizzo remoto entrava e poi svaniva al primo
reload — perché all'apertura teniamo solo i `src` della forma `qimg:`, e uno straniero
veniva ripulito. Silenziosamente, che è il modo peggiore.

Ora qualunque immagine forestiera viene **adottata**: si scarica, si rimpicciolisce, va in
IndexedDB e nel documento resta un `qimg:` come tutte le altre. Il testo attorno
all'immagine non si perde, perché la si lascia incollare a ProseMirror e si adotta subito
dopo. Quello che non si riesce a prendere — una CORS, o si è offline — non resta a metà: il
nodo se ne va e lo si dice con un avviso. E `dehydrate` ha una rete di sicurezza: un
`data:` sfuggito all'adozione non arriva comunque in `localStorage`.

**Una foto dell'iPhone può essere HEIC.** Su un browser che non la decodifica
`createImageBitmap` fallisce: prima si perdeva l'immagine, ora si tiene il file com'è. Non
rimpicciolito, ma presente.
