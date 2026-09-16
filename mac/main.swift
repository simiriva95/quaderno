// Il quaderno nella barra in alto a destra.
//
// Non è SwiftUI: MenuBarExtra apre un pannello che non prende il fuoco da
// tastiera, e in un quaderno dove non si può scrivere non c'è quaderno.
//
// E non è nemmeno più un NSPopover. Un popover non si ridimensiona: la
// maniglia disegnata a mano funzionava, ma il pannello sta centrato sotto la
// sua icona e tirando un angolo si muovevano tutti e due i bordi. Qui c'è un
// NSPanel con la barra del titolo trasparente e vuota: sembra un popover, e
// i bordi li ridimensiona macOS, da tutti i lati, coi cursori giusti.
//
// Una sola WKWebView, che si sposta: dal pannello alla finestra e ritorno.
// Due istanze scriverebbero lo stesso localStorage in contemporanea, e
// l'ultima che salva vincerebbe sull'altra.
//
// La WKWebView ha il suo archivio, separato da Safari. È una scelta, non un
// incidente: qui il quaderno è uno solo, quello della barra.

import AppKit
import WebKit

final class Barra: NSObject, NSApplicationDelegate, NSWindowDelegate {
  private var voce: NSStatusItem!
  private var pannello: NSPanel!
  private let nido = NSView(frame: NSRect(x: 0, y: 0, width: 480, height: 726))
  private static let barraH: CGFloat = 26
  private static let misuraSalvata = "misuraPannello"
  private static let minima = NSSize(width: 360, height: 420)
  private var web: WKWebView!
  private var finestra: NSWindow?
  private var indirizzo: URL!

  func applicationDidFinishLaunching(_: Notification) {
    let info = Bundle.main.infoDictionary ?? [:]
    indirizzo = URL(string: info["QuadernoURL"] as? String ?? "")!

    let conf = WKWebViewConfiguration()
    // I domini dichiarati nel plist sono la condizione che Apple mette per
    // dare a una WKWebView i service worker: senza, niente pagina offline.
    conf.limitsNavigationsToAppBoundDomains = true
    conf.websiteDataStore = .default() // su disco: gli appunti sopravvivono all'uscita

    nido.setFrameSize(misuraRicordata())

    web = WKWebView(frame: areaWeb, configuration: conf)
    web.autoresizingMask = [.width, .height]
    // Due dita orizzontali servono a girare pagina, non a tornare indietro
    // nella cronologia: con le rotte a cancelletto sarebbe anche lo stesso
    // documento, e il gesto se le prendeva prima che arrivassero alla pagina.
    web.allowsBackForwardNavigationGestures = false
    web.load(URLRequest(url: indirizzo))
    nido.addSubview(web)
    nido.addSubview(striscia())

    pannello = costruisciPannello()

    voce = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
    voce.button?.image = NSImage(systemSymbolName: "book.closed", accessibilityDescription: "Quaderno")
    voce.button?.target = self
    voce.button?.action = #selector(tocco)
    voce.button?.sendAction(on: [.leftMouseUp, .rightMouseUp])

    NSApp.mainMenu = menuPrincipale()
  }

  // ── Il pannello appeso all'icona ──────────────────────────────────────

  /// Titolata ma senza titolo e senza semaforo: `.titled` è la condizione che
  /// AppKit mette per dare a una finestra i bordi che si tirano, e
  /// `.fullSizeContentView` restituisce al contenuto i ventotto pixel che la
  /// barra del titolo si sarebbe presa. Non si sposta: è appesa a un'icona,
  /// non poggiata sulla scrivania.
  private func costruisciPannello() -> NSPanel {
    let p = NSPanel(
      contentRect: NSRect(origin: .zero, size: nido.bounds.size),
      styleMask: [.titled, .resizable, .fullSizeContentView, .utilityWindow],
      backing: .buffered, defer: false)
    p.titleVisibility = .hidden
    p.titlebarAppearsTransparent = true
    p.titlebarSeparatorStyle = .none
    for tasto in [NSWindow.ButtonType.closeButton, .miniaturizeButton, .zoomButton] {
      p.standardWindowButton(tasto)?.isHidden = true
    }
    p.isMovable = false
    p.isFloatingPanel = true
    p.becomesKeyOnlyIfNeeded = false // ci si scrive dentro: il fuoco deve poterci arrivare
    p.hidesOnDeactivate = true // via il fuoco, via il pannello: come faceva il popover
    p.isReleasedWhenClosed = false
    p.level = .floating
    p.minSize = Self.minima
    p.contentView = nido
    p.delegate = self
    return p
  }

  private func mostraPannello() {
    if finestra != nil { return } // il quaderno è nell'altra finestra: il pannello sarebbe vuoto
    pannello.setContentSize(misuraRicordata())
    appendi()
    NSApp.activate(ignoringOtherApps: true)
    pannello.makeKeyAndOrderFront(nil)
  }

  /// Sotto la sua icona: centrato su di lei, appena sotto la barra dei menu,
  /// e dentro lo schermo anche quando l'icona sta all'estremità.
  private func appendi() {
    guard let bottone = voce.button, let suaFinestra = bottone.window else { return }
    let icona = suaFinestra.convertToScreen(bottone.convert(bottone.bounds, to: nil))
    let schermo = (suaFinestra.screen ?? NSScreen.main)?.visibleFrame ?? .zero
    var f = pannello.frame
    f.origin.x = min(max(schermo.minX + 8, icona.midX - f.width / 2), schermo.maxX - f.width - 8)
    f.origin.y = max(schermo.minY + 8, icona.minY - 6 - f.height)
    pannello.setFrame(f, display: false)
  }

  func windowDidResize(_ n: Notification) {
    guard n.object as? NSWindow === pannello else { return }
    let s = pannello.frame.size
    UserDefaults.standard.set([s.width, s.height], forKey: Self.misuraSalvata)
  }

  /// La misura dell'ultima volta, o quella di partenza.
  private func misuraRicordata() -> NSSize {
    let m = UserDefaults.standard.array(forKey: Self.misuraSalvata) as? [Double]
    guard let m, m.count == 2 else { return NSSize(width: 480, height: 726) }
    return limita(NSSize(width: m[0], height: m[1]))
  }

  /// Fra il minimo leggibile e lo schermo: un pannello più alto dello schermo
  /// non si vedrebbe tutto, e uno da trecento pixel non è un quaderno.
  private func limita(_ s: NSSize) -> NSSize {
    let schermo = NSScreen.main?.visibleFrame.size ?? NSSize(width: 1440, height: 900)
    return NSSize(
      width: min(max(Self.minima.width, s.width), schermo.width - 40),
      height: min(max(Self.minima.height, s.height), schermo.height - 40))
  }

  /// Quel che resta al quaderno sotto la striscia.
  private var areaWeb: NSRect {
    NSRect(x: 0, y: 0, width: nido.bounds.width, height: nido.bounds.height - Self.barraH)
  }

  /// Una striscia sottile in cima al pannello, del colore della scrivania.
  /// Non ha più niente dentro — «apri in finestra» sta nel menu col tasto
  /// destro — ma resta: copre la barra del titolo, che è vuota ma esiste, e
  /// senza di lei i tasti in cima all'app finirebbero sotto la zona che
  /// macOS si tiene per sé.
  private func striscia() -> NSView {
    let h = Self.barraH
    let striscia = NSView(frame: NSRect(x: 0, y: nido.bounds.height - h, width: nido.bounds.width, height: h))
    striscia.autoresizingMask = [.width, .minYMargin]
    striscia.wantsLayer = true
    striscia.layer?.backgroundColor = NSColor(name: nil) { aspetto in
      aspetto.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
        ? NSColor(red: 0.109, green: 0.098, blue: 0.087, alpha: 1) // #1C1916, --c-desk sera
        : NSColor(red: 0.800, green: 0.733, blue: 0.646, alpha: 1) // #CCBBA5, --c-desk giorno
    }.cgColor

    return striscia
  }

  // ── La voce nella barra ───────────────────────────────────────────────

  @objc private func tocco() {
    if NSApp.currentEvent?.type == .rightMouseUp { return menuScorciatoie() }
    // Se la finestra è già aperta, il pannello sarebbe vuoto: porta su quella.
    if let f = finestra { return mostra(f) }
    if pannello.isVisible { return pannello.orderOut(nil) }
    mostraPannello()
  }

  private func menuScorciatoie() {
    let m = NSMenu()
    m.addItem(item("Apri in finestra", #selector(apriFinestra)))
    m.addItem(item("Apri nel browser", #selector(apriBrowser)))
    m.addItem(item("Ricarica", #selector(ricarica)))
    m.addItem(.separator())
    m.addItem(withTitle: "Esci", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
    // Il menu si mostra solo attaccandolo un istante alla voce: NSStatusItem
    // non ha altro modo, e lasciarlo attaccato ruberebbe il clic sinistro.
    voce.menu = m
    voce.button?.performClick(nil)
    voce.menu = nil
  }

  // ── La finestra vera ──────────────────────────────────────────────────

  @objc private func apriFinestra() {
    if let f = finestra { return mostra(f) }
    pannello.orderOut(nil)

    let f = NSWindow(
      contentRect: NSRect(x: 0, y: 0, width: 1100, height: 820),
      styleMask: [.titled, .closable, .miniaturizable, .resizable],
      backing: .buffered, defer: false)
    f.title = "Il Quaderno degli Appunti"
    f.setFrameAutosaveName("quaderno") // posizione e misura restano fra un avvio e l'altro
    f.isReleasedWhenClosed = false
    f.delegate = self
    f.contentView = web // esce dal pannello ed entra qui: è sempre la stessa
    f.center()
    finestra = f

    // Con una finestra vera l'app smette di essere solo un'icona: serve per
    // avere il tasto verde a schermo intero, il Dock e il menu che funziona.
    NSApp.setActivationPolicy(.regular)
    mostra(f)
  }

  private func mostra(_ f: NSWindow) {
    NSApp.activate(ignoringOtherApps: true)
    f.makeKeyAndOrderFront(nil)
  }

  func windowWillClose(_ n: Notification) {
    guard n.object as? NSWindow === finestra else { return }
    // La web view torna nel pannello, o al prossimo clic non ci sarebbe niente.
    web.frame = areaWeb
    nido.addSubview(web, positioned: .below, relativeTo: nido.subviews.first)
    finestra = nil
    NSApp.setActivationPolicy(.accessory)
  }

  // ── Menu dell'applicazione ────────────────────────────────────────────

  private func menuPrincipale() -> NSMenu {
    let radice = NSMenu()

    let app = NSMenuItem()
    app.submenu = NSMenu(title: "Quaderno")
    app.submenu?.addItem(item("Apri in finestra", #selector(apriFinestra), "o"))
    app.submenu?.addItem(.separator())
    app.submenu?.addItem(
      withTitle: "Esci", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
    radice.addItem(app)

    let finestre = NSMenuItem()
    finestre.submenu = NSMenu(title: "Finestra")
    finestre.submenu?.addItem(
      withTitle: "Chiudi", action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w")
    let pieno = NSMenuItem(
      title: "Attiva/Disattiva schermo intero", action: #selector(NSWindow.toggleFullScreen(_:)),
      keyEquivalent: "f")
    pieno.keyEquivalentModifierMask = [.control, .command]
    finestre.submenu?.addItem(pieno)
    radice.addItem(finestre)

    return radice
  }

  private func item(_ titolo: String, _ azione: Selector, _ tasto: String = "") -> NSMenuItem {
    let i = NSMenuItem(title: titolo, action: azione, keyEquivalent: tasto)
    i.target = self
    return i
  }

  @objc private func apriBrowser() { NSWorkspace.shared.open(indirizzo) }
  @objc private func ricarica() { web.reload() }
}

let app = NSApplication.shared
let barra = Barra()
app.delegate = barra
app.setActivationPolicy(.accessory) // vive nella barra finché non apri una finestra
app.run()
