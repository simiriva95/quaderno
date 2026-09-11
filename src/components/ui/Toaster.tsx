import { useEffect } from 'react'
import { useUi } from '../../store/ui'
import { useNotebooks } from '../../store/notebooks'

/** Un toast alla volta, in basso, breve. Non ruba il focus.
 *  Animato in CSS e non con `motion`: è l'unico componente montato subito, e
 *  tenerlo fuori dal bundle iniziale dimezza il JavaScript del primo paint. */
export function Toaster() {
  const toast = useUi((s) => s.toast)
  const showToast = useUi((s) => s.showToast)
  const quotaExceeded = useNotebooks((s) => s.quotaExceeded)
  const clearQuotaFlag = useNotebooks((s) => s.clearQuotaFlag)

  useEffect(() => {
    if (!quotaExceeded) return
    showToast('Il quaderno è pieno. Esporta o elimina qualcosa.')
    clearQuotaFlag()
  }, [quotaExceeded, showToast, clearQuotaFlag])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => showToast(null), 4200)
    return () => clearTimeout(t)
  }, [toast, showToast])

  if (!toast) return null

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-lg z-50 flex justify-center px-md"
    >
      <p
        key={toast}
        className="toast-in pointer-events-auto max-w-[36rem] rounded-md bg-paper px-lg py-sm text-xs text-graphite shadow-lift"
      >
        {toast}
      </p>
    </div>
  )
}
