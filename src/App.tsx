import { lazy, Suspense } from 'react'
import { useTheme } from './hooks/useTheme'
import { useRoute } from './lib/router'
import { Toaster } from './components/ui/Toaster'

const Shelf = lazy(() => import('./scenes/Shelf'))
const Atelier = lazy(() => import('./scenes/Atelier'))
const Reader = lazy(() => import('./scenes/Reader'))
const WebDoc = lazy(() => import('./scenes/WebDoc'))

export default function App() {
  useTheme()
  const route = useRoute()
  const notebookId = route.startsWith('/q/') ? route.slice(3) : null
  // Il raccoglitore ha una scena sua: niente impaginazione, niente carta a
  // 600×840, e un chunk da 165 KB che non deve mai toccare il primo paint.
  const webId = route.startsWith('/w/') ? route.slice(3) : null

  return (
    <>
      <Suspense fallback={null}>
        {notebookId ? (
          <Reader id={notebookId} />
        ) : webId ? (
          <WebDoc id={webId} />
        ) : route === '/nuovo' ? (
          <Atelier />
        ) : (
          <Shelf />
        )}
      </Suspense>
      <Toaster />
    </>
  )
}
