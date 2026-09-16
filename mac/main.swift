// Il quaderno nella barra in alto a destra.
//
// Non è SwiftUI: MenuBarExtra apre un pannello che non prende il fuoco da
// tastiera, e in un quaderno dove non si può scrivere non c'è quaderno.
// NSStatusItem + NSPopover + una attivazione esplicita: banale, e funziona.
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
  private let pannello = NSPopover()
  private let nido = NSView(frame: NSRect(x: 0, y: 0, width: 480, height: 726))
  private static let barraH: CGFloat = 26
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

    web = WKWebView(frame: areaWeb, configuration: conf)
    web.autoresizingMask = [.width, .height]
    web.allowsBackForwardNavigationGestures = true
    web.load(URLRequest(url: indirizzo))
    nido.addSubview(web)
    nido.addSubview(strisciaConEspandi())

    let contenitore = NSViewController()
    contenitore.view = nido
    pannello.contentViewController = contenitore
    pannello.contentSize = nido.bounds.size
    pannello.behavior = .transient

    voce = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
    voce.button?.image = NSImage(systemSymbolName: "book.closed", accessibilityDescription: "Quaderno")
    voce.button?.target = self
    voce.button?.action = #selector(tocco)
    voce.button?.sendAction(on: [.leftMouseUp, .rightMouseUp])

    NSApp.mainMenu = menuPrincipale()
  }

  /// Quel che resta al quaderno sotto la striscia.
  private var areaWeb: NSRect {
    NSRect(x: 0, y: 0, width: nido.bounds.width, height: nido.bounds.height - Self.barraH)
  }

  /// Una striscia sottile in cima al pannello, del colore della scrivania, con
  /// il tasto per aprire la finestra. Il menu col tasto destro c'era già, ma
  /// un tasto che non si vede è un tasto che non esiste — e in ogni angolo
  /// dove metterlo galleggiante ci sta già qualcosa dell'app.
  private func strisciaConEspandi() -> NSView {
    let h = Self.barraH
    let striscia = NSView(frame: NSRect(x: 0, y: nido.bounds.height - h, width: nido.bounds.width, height: h))
    striscia.autoresizingMask = [.width, .minYMargin]
    striscia.wantsLayer = true
    striscia.layer?.backgroundColor = NSColor(name: nil) { aspetto in
      aspetto.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
        ? NSColor(red: 0.110, green: 0.098, blue: 0.086, alpha: 1) // #1C1916
        : NSColor(red: 0.937, green: 0.902, blue: 0.855, alpha: 1) // #EFE6DA
    }.cgColor

    let tasto = NSButton(frame: NSRect(x: striscia.bounds.width - h, y: 1, width: h - 2, height: h - 2))
    tasto.autoresizingMask = [.minXMargin]
    tasto.bezelStyle = .accessoryBarAction
    tasto.isBordered = false
    tasto.image = NSImage(
      systemSymbolName: "arrow.up.left.and.arrow.down.right", accessibilityDescription: "Apri in finestra")
    tasto.imageScaling = .scaleProportionallyDown
    tasto.toolTip = "Apri in finestra"
    tasto.target = self
    tasto.action = #selector(apriFinestra)
    striscia.addSubview(tasto)
    return striscia
  }

  // ── La voce nella barra ───────────────────────────────────────────────

  @objc private func tocco() {
    if NSApp.currentEvent?.type == .rightMouseUp { return menuScorciatoie() }
    // Se la finestra è già aperta, il pannello sarebbe vuoto: porta su quella.
    if let f = finestra { return mostra(f) }
    if pannello.isShown { return pannello.performClose(nil) }
    guard let bottone = voce.button else { return }
    pannello.show(relativeTo: bottone.bounds, of: bottone, preferredEdge: .minY)
    // Senza questa riga il pannello si vede ma la tastiera non lo raggiunge.
    NSApp.activate(ignoringOtherApps: true)
    pannello.contentViewController?.view.window?.makeKey()
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
    pannello.performClose(nil)

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

  func windowWillClose(_: Notification) {
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
