import { Download, Moon, Settings2, Sun, Trash2, Upload, Volume2, VolumeX, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useRef, useState } from 'react'
import { SPRING } from '../../lib/constants'
import { exportNotebooks, parseSnapshot } from '../../lib/storage'
import { DangerButton } from './DangerButton'
import { useNotebooks } from '../../store/notebooks'
import { usePrefs, type ThemeChoice } from '../../store/prefs'
import { useUi } from '../../store/ui'

const THEMES: { id: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { id: 'light', label: 'Giorno', Icon: Sun },
  { id: 'dark', label: 'Sera', Icon: Moon },
  { id: 'system', label: 'Come il sistema', Icon: Settings2 },
]

export function SettingsSheet() {
  const [open, setOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const { theme, setTheme, sounds, toggleSounds } = usePrefs()
  const notebooks = useNotebooks((s) => s.notebooks)
  const replaceAll = useNotebooks((s) => s.replaceAll)
  const showToast = useUi((s) => s.showToast)

  const importFile = async (file: File) => {
    try {
      const imported = parseSnapshot(await file.text())
      replaceAll(imported)
      showToast(`Importati ${imported.length} quaderni.`)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Non riesco a leggere questo file.')
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Impostazioni"
        className="grid size-11 place-items-center rounded-md text-graphite transition-colors hover:bg-paper"
      >
        <Settings2 size={19} strokeWidth={1.75} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 flex items-end justify-center sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.16 } }}
          >
            <button
              type="button"
              aria-label="Chiudi"
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-[rgb(var(--sh-tint)/0.22)] backdrop-blur-[2px]"
            />
            <motion.div
              role="dialog"
              aria-label="Impostazioni"
              initial={{ y: 28, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 16, opacity: 0, transition: { duration: 0.18 } }}
              transition={SPRING}
              className="relative m-md w-full max-w-[28rem] rounded-lg bg-paper p-lg shadow-lift"
            >
              <div className="mb-lg flex items-center justify-between">
                <h2 className="font-hand text-lg text-ink">Impostazioni</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Chiudi"
                  className="grid size-11 place-items-center rounded-md text-graphite hover:bg-desk"
                >
                  <X size={19} strokeWidth={1.75} />
                </button>
              </div>

              <fieldset className="mb-lg">
                <legend className="mb-xs text-2xs font-semibold text-graphite opacity-70">
                  Luce
                </legend>
                <div className="flex gap-2xs">
                  {THEMES.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={theme === id}
                      onClick={() => setTheme(id)}
                      className={`flex h-11 flex-1 items-center justify-center gap-2xs rounded-md text-xs ${
                        theme === id ? 'bg-desk text-ink' : 'text-graphite opacity-70'
                      }`}
                    >
                      <Icon size={17} strokeWidth={1.75} />
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <button
                type="button"
                onClick={toggleSounds}
                aria-pressed={sounds}
                className="mb-lg flex h-12 w-full items-center gap-sm rounded-md bg-desk px-md text-xs text-graphite"
              >
                {sounds ? (
                  <Volume2 size={18} strokeWidth={1.75} />
                ) : (
                  <VolumeX size={18} strokeWidth={1.75} />
                )}
                {sounds ? 'Suoni accesi' : 'Suoni spenti'}
              </button>

              <div className="flex gap-xs">
                <button
                  type="button"
                  onClick={() => exportNotebooks(notebooks)}
                  className="flex h-12 flex-1 items-center justify-center gap-2xs rounded-md bg-ink text-xs font-semibold text-paper"
                >
                  <Download size={17} strokeWidth={2} />
                  Esporta
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex h-12 flex-1 items-center justify-center gap-2xs rounded-md bg-desk text-xs text-graphite"
                >
                  <Upload size={17} strokeWidth={1.75} />
                  Importa
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void importFile(file)
                    e.target.value = ''
                  }}
                />
              </div>

              {notebooks.length > 0 && (
                <DangerButton
                  className="mt-lg w-full"
                  label={`Cancella tutti i quaderni (${notebooks.length})`}
                  confirmLabel="Sicuro? Spariscono tutti, per sempre"
                  icon={<Trash2 size={17} strokeWidth={1.75} />}
                  onConfirm={() => {
                    replaceAll([])
                    showToast('Mensola vuota.')
                  }}
                />
              )}

              <p className="mt-md text-2xs leading-relaxed text-graphite opacity-60">
                I quaderni restano su questo dispositivo. L'importazione sostituisce quelli
                esistenti: esporta prima, se vuoi tenerli.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
