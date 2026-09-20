// Il quaderno nell'area di notifica di Windows.
//
// Stesso mestiere dell'app per la barra del Mac, altro sistema: un'icona
// vicino all'orologio, un pannello appeso a lei, e una finestra vera per
// quando serve spazio. Una sola WebView2 per tutt'e due — due istanze
// scriverebbero lo stesso localStorage, e l'ultima che salva vincerebbe.
//
// E una sola finestra, non due che si passano la WebView: in WinForms un
// controllo che cambia genitore si porta dietro il rischio di rinascere, e
// una WebView rinata è una pagina ricaricata. Qui la finestra è sempre
// quella: cambia cornice, barra delle applicazioni e misura, e il quaderno
// dentro non se ne accorge.
//
// Il pannello non ha cornice, perché Windows non sa fare una finestra
// titolata e vuota come l'NSPanel del Mac. I bordi che si tirano li rimette
// WM_NCHITTEST, e i sei pixel che restano fuori dalla WebView sono la
// cornice: presa la tinta dalla scrivania di dentro, non sembra un errore.

using System.Diagnostics;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace Quaderno;

static class Programma
{
  internal const string Indirizzo = "https://quaderno-two.vercel.app";

  [STAThread]
  static void Main()
  {
    // Un quaderno solo: due processi scriverebbero lo stesso archivio.
    using var solo = new Mutex(true, @"Local\it.simoneriva.quaderno", out var primo);
    if (!primo) return;

    Application.SetHighDpiMode(HighDpiMode.PerMonitorV2);
    Application.EnableVisualStyles();
    Application.SetCompatibleTextRenderingDefault(false);
    Application.Run(new Barra());
  }
}

/// La finestra: senza cornice quando è appesa all'icona, normale quando è
/// una finestra. Sa solo due cose da sola — rimettere i bordi che si tirano
/// quando la cornice non c'è, e non lasciarsi chiudere davvero.
sealed class Casa : Form
{
  internal const int Bordo = 6;
  internal bool Appesa = true;

  protected override void WndProc(ref Message m)
  {
    const int WM_NCHITTEST = 0x0084;
    base.WndProc(ref m);
    if (m.Msg != WM_NCHITTEST || !Appesa) return;

    var lp = (int)(m.LParam.ToInt64() & 0xFFFFFFFF);
    var p = PointToClient(new Point((short)(lp & 0xFFFF), (short)(lp >> 16)));
    bool sx = p.X <= Bordo, dx = p.X >= ClientSize.Width - Bordo;
    bool su = p.Y <= Bordo, giu = p.Y >= ClientSize.Height - Bordo;

    // HTLEFT 10, HTRIGHT 11, HTTOP 12, HTTOPLEFT 13, HTTOPRIGHT 14,
    // HTBOTTOM 15, HTBOTTOMLEFT 16, HTBOTTOMRIGHT 17.
    var dove = su ? (sx ? 13 : dx ? 14 : 12)
             : giu ? (sx ? 16 : dx ? 17 : 15)
             : sx ? 10 : dx ? 11 : 0;
    if (dove != 0) m.Result = dove;
  }
}

sealed class Barra : ApplicationContext
{
  static readonly Size Minima = new(360, 420);
  static readonly Size Partenza = new(480, 726);
  static readonly Size Larga = new(1100, 820);

  readonly NotifyIcon voce = new();
  readonly Casa casa = new();
  readonly WebView2 web = new();
  readonly string cartella = Path.Combine(
    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Quaderno");
  DateTime spento = DateTime.MinValue;

  public Barra()
  {
    casa.FormBorderStyle = FormBorderStyle.None;
    casa.ShowInTaskbar = false;
    casa.StartPosition = FormStartPosition.Manual;
    casa.MinimumSize = Minima;
    casa.Size = MisuraRicordata();
    casa.Padding = new Padding(Casa.Bordo);
    casa.BackColor = Color.FromArgb(207, 186, 161); // finché la pagina non risponde
    casa.TopMost = true;
    casa.Deactivate += (_, _) => { if (casa.Appesa) Nascondi(); };
    casa.ResizeEnd += (_, _) => { if (casa.Appesa) Ricorda(); };
    // La X non chiude il quaderno: lo rimette nella barra, dove vive.
    casa.FormClosing += (_, e) =>
    {
      if (e.CloseReason != CloseReason.UserClosing) return;
      e.Cancel = true;
      TornaAlPannello();
    };

    web.Dock = DockStyle.Fill;
    casa.Controls.Add(web);

    voce.Icon = Icona();
    voce.Text = "Il Quaderno degli Appunti";
    voce.ContextMenuStrip = Scorciatoie();
    voce.MouseClick += (_, e) => { if (e.Button == MouseButtons.Left) Tocco(); };
    voce.Visible = true;

    _ = Avvia();
  }

  static Icon Icona()
  {
    var file = Path.Combine(AppContext.BaseDirectory, "quaderno.ico");
    return File.Exists(file) ? new Icon(file, SystemInformation.SmallIconSize) : SystemIcons.Application;
  }

  // ── Il quaderno dentro ────────────────────────────────────────────────

  async Task Avvia()
  {
    _ = casa.Handle; // la WebView2 parte solo dentro una finestra che esiste già

    CoreWebView2Environment ambiente;
    try
    {
      // L'archivio è suo, separato da Edge: qui il quaderno è uno, quello
      // della barra.
      ambiente = await CoreWebView2Environment.CreateAsync(null, cartella);
      await web.EnsureCoreWebView2Async(ambiente);
    }
    catch (WebView2RuntimeNotFoundException)
    {
      // Windows 11 e ogni Windows 10 con Edge ce l'hanno già. Chi non ce
      // l'ha merita una frase e un indirizzo, non un errore di sistema.
      var risposta = MessageBox.Show(
        "Per il Quaderno serve WebView2 di Microsoft, e su questo computer non c'è.\n\n"
          + "Vuoi aprire la pagina per scaricarlo?",
        "Il Quaderno degli Appunti", MessageBoxButtons.YesNo, MessageBoxIcon.Information);
      if (risposta == DialogResult.Yes)
        Apri("https://developer.microsoft.com/microsoft-edge/webview2/");
      Esci();
      return;
    }

    var c = web.CoreWebView2;
    // Due dita orizzontali servono a girare pagina, non a tornare indietro
    // nella cronologia.
    c.Settings.IsSwipeNavigationEnabled = false;
    c.Settings.IsStatusBarEnabled = false; // in un pannello da 480 pixel dà solo fastidio
    c.NewWindowRequested += (_, e) => { e.Handled = true; Apri(e.Uri); };
    c.WebMessageReceived += (_, e) => Tinge(e.TryGetWebMessageAsString());
    await c.AddScriptToExecuteOnDocumentCreatedAsync(Spia);
    c.Navigate(Programma.Indirizzo);
  }

  /// Dice al nativo di che colore è la scrivania, adesso e a ogni cambio di
  /// tema. Il token è in `oklch()` e il motore lo restituisce tale e quale: a
  /// convertirlo in tre byte sRGB ci pensa un canvas da un pixel, che è
  /// l'unico posto dove il colore diventa davvero quello dipinto.
  const string Spia = """
    (function () {
      const parti = () => {
        const sonda = document.createElement('div')
        sonda.style.cssText = 'position:fixed;left:-9999px;background:var(--c-desk)'
        document.documentElement.appendChild(sonda)
        const tela = document.createElement('canvas')
        tela.width = tela.height = 1
        const pennello = tela.getContext('2d', { willReadFrequently: true })
        const dillo = () => {
          try {
            pennello.clearRect(0, 0, 1, 1)
            pennello.fillStyle = getComputedStyle(sonda).backgroundColor
            pennello.fillRect(0, 0, 1, 1)
            const [r, g, b, a] = pennello.getImageData(0, 0, 1, 1).data
            if (a > 200) window.chrome?.webview?.postMessage(r + ',' + g + ',' + b)
          } catch (e) {}
        }
        dillo()
        addEventListener('load', dillo)
        new MutationObserver(dillo).observe(document.documentElement, {
          attributes: true, attributeFilter: ['data-theme'],
        })
        matchMedia('(prefers-color-scheme: dark)').addEventListener('change', dillo)
      }
      if (document.readyState === 'loading') addEventListener('DOMContentLoaded', parti)
      else parti()
    })()
    """;

  void Tinge(string? s)
  {
    var n = (s ?? "").Split(',');
    if (n.Length != 3 || !n.All(p => byte.TryParse(p, out _))) return;
    var v = n.Select(byte.Parse).ToArray();
    casa.BackColor = Color.FromArgb(v[0], v[1], v[2]);
  }

  // ── Il pannello appeso all'icona ──────────────────────────────────────

  void Tocco()
  {
    if (!casa.Appesa) { Mostra(); return; }
    if (casa.Visible) { Nascondi(); return; }
    // Il clic sull'icona toglie il fuoco al pannello, che si nasconde da
    // solo un istante prima di arrivare qui: senza questa pausa lo stesso
    // gesto lo chiuderebbe e lo riaprirebbe.
    if ((DateTime.Now - spento).TotalMilliseconds < 300) return;

    casa.Size = Limita(casa.Size);
    Appendi();
    Mostra();
  }

  void Nascondi()
  {
    if (!casa.Visible) return;
    Ricorda();
    casa.Hide();
    spento = DateTime.Now;
  }

  /// Vicino alla sua icona: al lato dello schermo dove sta la barra delle
  /// applicazioni — che è il pezzo di schermo che manca all'area di lavoro —
  /// e centrato sul puntatore, senza uscire dai bordi.
  void Appendi()
  {
    var schermo = Screen.FromPoint(Cursor.Position);
    var area = schermo.WorkingArea;
    var tutto = schermo.Bounds;
    var m = Cursor.Position;

    if (area.Left > tutto.Left)
      casa.Location = new Point(area.Left + 8, Dentro(m.Y, casa.Height, area.Top, area.Bottom));
    else if (area.Right < tutto.Right)
      casa.Location = new Point(area.Right - casa.Width - 8, Dentro(m.Y, casa.Height, area.Top, area.Bottom));
    else if (area.Top > tutto.Top)
      casa.Location = new Point(Dentro(m.X, casa.Width, area.Left, area.Right), area.Top + 8);
    else
      casa.Location = new Point(Dentro(m.X, casa.Width, area.Left, area.Right), area.Bottom - casa.Height - 8);
  }

  static int Dentro(int centro, int misura, int min, int max) =>
    Math.Min(Math.Max(min + 8, centro - misura / 2), max - misura - 8);

  // ── La finestra vera ──────────────────────────────────────────────────

  void ApriFinestra()
  {
    if (!casa.Appesa) { Mostra(); return; }
    Ricorda();
    casa.Hide();

    casa.Appesa = false;
    casa.Padding = Padding.Empty;
    casa.TopMost = false;
    casa.Text = "Il Quaderno degli Appunti";
    casa.Icon = voce.Icon;
    casa.FormBorderStyle = FormBorderStyle.Sizable;
    casa.MaximizeBox = true;
    casa.Size = Limita(Larga);
    casa.StartPosition = FormStartPosition.CenterScreen;
    // Con una finestra vera l'app smette di essere solo un'icona: compare
    // nella barra delle applicazioni, e da lì si ingrandisce.
    casa.ShowInTaskbar = true;
    Mostra();
  }

  void TornaAlPannello()
  {
    casa.Hide();
    casa.WindowState = FormWindowState.Normal;
    casa.ShowInTaskbar = false;
    casa.FormBorderStyle = FormBorderStyle.None;
    casa.MaximizeBox = false;
    casa.Text = string.Empty;
    casa.TopMost = true;
    casa.Padding = new Padding(Casa.Bordo);
    casa.StartPosition = FormStartPosition.Manual;
    casa.Size = MisuraRicordata();
    casa.Appesa = true;
    spento = DateTime.Now;
  }

  void Mostra()
  {
    if (casa.WindowState == FormWindowState.Minimized) casa.WindowState = FormWindowState.Normal;
    casa.Show();
    casa.Activate();
    web.Focus();
  }

  // ── La misura che resta ───────────────────────────────────────────────

  string Misura => Path.Combine(cartella, "misura.txt");

  void Ricorda()
  {
    try
    {
      Directory.CreateDirectory(cartella);
      File.WriteAllText(Misura, $"{casa.Width},{casa.Height}");
    }
    catch (IOException) { } // la misura del pannello non vale un errore
    catch (UnauthorizedAccessException) { }
  }

  Size MisuraRicordata()
  {
    try
    {
      var n = File.ReadAllText(Misura).Split(',');
      if (n.Length == 2 && int.TryParse(n[0], out var l) && int.TryParse(n[1], out var a))
        return Limita(new Size(l, a));
    }
    catch (IOException) { }
    catch (UnauthorizedAccessException) { }
    return Partenza;
  }

  /// Fra il minimo leggibile e lo schermo: un pannello più alto dello
  /// schermo non si vedrebbe tutto, e uno da trecento pixel non è un
  /// quaderno.
  static Size Limita(Size s)
  {
    var schermo = Screen.FromPoint(Cursor.Position).WorkingArea.Size;
    return new Size(
      Math.Min(Math.Max(Minima.Width, s.Width), schermo.Width - 40),
      Math.Min(Math.Max(Minima.Height, s.Height), schermo.Height - 40));
  }

  // ── Il menu col tasto destro ──────────────────────────────────────────

  ContextMenuStrip Scorciatoie()
  {
    var m = new ContextMenuStrip();
    m.Items.Add("Apri in finestra", null, (_, _) => ApriFinestra());
    m.Items.Add("Apri nel browser", null, (_, _) => Apri(Programma.Indirizzo));
    m.Items.Add("Ricarica", null, (_, _) => web.CoreWebView2?.Reload());
    m.Items.Add(new ToolStripSeparator());
    m.Items.Add("Esci", null, (_, _) => Esci());
    return m;
  }

  static void Apri(string indirizzo) =>
    Process.Start(new ProcessStartInfo(indirizzo) { UseShellExecute = true });

  void Esci()
  {
    voce.Visible = false; // senza, l'icona resta finché non ci passi sopra
    voce.Dispose();
    ExitThread();
  }
}
