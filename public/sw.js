/*
 * Il quaderno deve aprirsi anche in metropolitana: gli appunti stanno già
 * sul dispositivo, sarebbe assurdo che a mancare fosse l'app.
 *
 * Nessuna lista di file da precaricare: gli asset di Vite hanno l'hash nel
 * nome, quindi una copia in cache non è mai vecchia — si tiene e si serve.
 * L'HTML invece cambia sotto lo stesso indirizzo: prima la rete, la copia
 * solo se la rete non risponde.
 */
const CACHE = 'quaderno-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((k) => Promise.all(k.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  )
})

const metti = async (req, res) => {
  if (res.ok) (await caches.open(CACHE)).put(req, res.clone())
  return res
}

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Navigazione: la pagina fresca se c'è, altrimenti quella di ieri.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        // sempre sotto '/': l'HTML è lo stesso per ogni indirizzo, e così una
        // pagina profonda mai visitata si apre lo stesso senza rete
        .then((res) => metti('/', res))
        .catch(async () => (await caches.match('/')) ?? Response.error()),
    )
    return
  }

  // Tutto il resto: la copia se c'è, e intanto nessuna attesa.
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ??
        fetch(req)
          .then((res) => metti(req, res))
          .catch(() => Response.error()),
    ),
  )
})
