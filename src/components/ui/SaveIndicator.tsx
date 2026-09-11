import { AnimatePresence, motion } from 'motion/react'

/** Una matita che scrive tre trattini e lascia un segno. Nessun "Salvato!". */
export function SaveIndicator({ state }: { state: 'idle' | 'saving' | 'saved' }) {
  return (
    <div
      className="pointer-events-none flex h-5 w-6 items-center justify-center"
      aria-hidden="true"
    >
      <AnimatePresence mode="wait">
        {state === 'saving' && (
          <motion.svg
            key="pencil"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            className="text-graphite opacity-55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.55 }}
            exit={{ opacity: 0, transition: { duration: 0.14 } }}
          >
            <motion.path
              d="M4 18 L14 8"
              animate={{ pathLength: [0, 1, 0], x: [0, 2, 0] }}
              transition={{ duration: 0.62, repeat: Infinity, ease: 'easeInOut' }}
            />
            <path d="M14 8 l3 -3 3 3 -3 3z" />
          </motion.svg>
        )}
        {state === 'saved' && (
          <motion.svg
            key="check"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-ink-green opacity-60"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.6, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            <motion.path
              d="M5 13 l4 4 L19 7"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            />
          </motion.svg>
        )}
      </AnimatePresence>
    </div>
  )
}
