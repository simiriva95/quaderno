import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

/** Un'azione che cancella: al primo click chiede conferma sul posto e, se
 *  entro tre secondi non arriva, torna com'era. Niente finestre di sistema
 *  in una cartoleria. */
export function DangerButton({
  label,
  confirmLabel = 'Sicuro? Clicca di nuovo',
  onConfirm,
  icon,
  className = '',
}: {
  label: string
  confirmLabel?: string
  onConfirm: () => void
  icon?: ReactNode
  className?: string
}) {
  const [arming, setArming] = useState(false)
  useEffect(() => {
    if (!arming) return
    const t = setTimeout(() => setArming(false), 3000)
    return () => clearTimeout(t)
  }, [arming])

  return (
    <button
      type="button"
      onClick={() => {
        if (!arming) return setArming(true)
        setArming(false)
        onConfirm()
      }}
      aria-live="polite"
      className={`flex h-12 items-center gap-sm rounded-md px-md text-xs transition-colors ${
        arming
          ? 'bg-ink-red text-paper'
          : 'bg-danger-surface text-ink-red hover:bg-danger-surface-hover'
      } ${className}`}
    >
      {icon}
      {arming ? confirmLabel : label}
    </button>
  )
}
