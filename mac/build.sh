#!/bin/bash
# Costruisce Quaderno.app: un'app senza progetto Xcode, un file Swift e un
# plist scritto qui sotto. Il risultato va in mac/build/.
#
#   ./mac/build.sh            costruisce
#   ./mac/build.sh --installa costruisce, copia in /Applications e avvia
set -euo pipefail

DOMINIO="quaderno-two.vercel.app"
INDIRIZZO="https://$DOMINIO"
ID="it.simoneriva.quaderno"

cd "$(dirname "$0")"
APP="build/Quaderno.app"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS"

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>Quaderno</string>
  <key>CFBundleDisplayName</key><string>Il Quaderno degli Appunti</string>
  <key>CFBundleIdentifier</key><string>$ID</string>
  <key>CFBundleExecutable</key><string>Quaderno</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>LSMinimumSystemVersion</key><string>13.0</string>
  <!-- Vive nella barra: niente icona nel Dock, niente finestra all'avvio. -->
  <key>LSUIElement</key><true/>
  <key>QuadernoURL</key><string>$INDIRIZZO</string>
  <!-- Apple dà i service worker a una WKWebView solo per i domini elencati qui. -->
  <key>WKAppBoundDomains</key>
  <array><string>$DOMINIO</string></array>
</dict>
</plist>
PLIST

swiftc -O -target arm64-apple-macos13.0 \
  -o "$APP/Contents/MacOS/Quaderno" main.swift

# Firma ad-hoc: basta a far smettere Gatekeeper di lamentarsi in locale.
codesign --force --sign - "$APP" >/dev/null
echo "fatto: mac/$APP"

if [[ "${1:-}" == "--installa" ]]; then
  pkill -f "Quaderno.app/Contents/MacOS/Quaderno" 2>/dev/null || true
  rm -rf /Applications/Quaderno.app
  cp -R "$APP" /Applications/
  # LaunchServices tiene ancora il bundle vecchio a quel percorso: aperto
  # subito risponde -600. Una registrazione esplicita, e se serve un secondo
  # tentativo, costano meno di un errore che sembra un guasto.
  /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
    -f /Applications/Quaderno.app 2>/dev/null || true
  open /Applications/Quaderno.app 2>/dev/null || { sleep 2; open /Applications/Quaderno.app; }
  echo "installata e avviata: guarda in alto a destra"
fi
