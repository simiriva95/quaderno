import { useEffect, useRef, useState } from 'react'

/** ── Il diagramma ─────────────────────────────────────────────────────────
 *  Mermaid pesa più di tre volte il primo paint dell'app: questo è l'unico
 *  file che lo nomina, e lo importa solo quando un diagramma entra davvero in
 *  vista. Una pagina senza diagrammi non scarica niente.                     */

const REDRAW_DELAY = 400

function useThemeAttr(): string {
  const [theme, setTheme] = useState(() => document.documentElement.dataset['theme'] ?? 'light')
  useEffect(() => {
    const root = document.documentElement
    const obs = new MutationObserver(() => setTheme(root.dataset['theme'] ?? 'light'))
    obs.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  return theme
}

export function MermaidPreview({ text }: { text: string }) {
  const host = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debounced, setDebounced] = useState(text)
  const theme = useThemeAttr()

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(text), REDRAW_DELAY)
    return () => clearTimeout(t)
  }, [text])

  useEffect(() => {
    const el = host.current
    if (!el || visible) return
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setVisible(true)
    })
    io.observe(el)
    return () => io.disconnect()
  }, [visible])

  useEffect(() => {
    if (!visible || !debounced.trim()) return
    let alive = true
    const id = `m-${Math.random().toString(36).slice(2)}`

    void import('mermaid').then(async ({ default: mermaid }) => {
      // 'strict' è anche il default: codifica l'HTML nelle etichette e
      // disattiva le direttive `click`, che sanno eseguire javascript:.
      // Nessun array `secure` nostro, o un %%{init}%% dentro il diagramma
      // potrebbe riaprire proprio questa impostazione.
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: theme === 'dark' ? 'dark' : 'neutral',
        fontFamily: 'Nunito Variable, Nunito, system-ui, sans-serif',
      })
      try {
        // Un diagramma illeggibile dentro `render` inietta un SVG d'errore in
        // fondo al documento: si valida prima, e l'errore resta nostro.
        await mermaid.parse(debounced)
        const { svg } = await mermaid.render(id, debounced)
        if (!alive || !host.current) return
        host.current.innerHTML = svg
        setError(null)
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Diagramma non valido')
      }
    })

    return () => {
      alive = false
    }
  }, [visible, debounced, theme])

  const label = debounced.trim().split('\n')[0] ?? 'Diagramma'

  return (
    <figure className="mermaid-figure" role="img" aria-label={`Diagramma: ${label}`}>
      <div ref={host} />
      {error && <p className="mermaid-error">{error}</p>}
    </figure>
  )
}
