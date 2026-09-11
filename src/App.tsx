import { lazy, Suspense } from 'react'
import { useTheme } from './hooks/useTheme'
import { useRoute } from './lib/router'
import { Toaster } from './components/ui/Toaster'

const Shelf = lazy(() => import('./scenes/Shelf'))
const Atelier = lazy(() => import('./scenes/Atelier'))
const Reader = lazy(() => import('./scenes/Reader'))

export default function App() {
  useTheme()
  const route = useRoute()
  const notebookId = route.startsWith('/q/') ? route.slice(3) : null

  return (
    <>
      <Suspense fallback={null}>
        {notebookId ? <Reader id={notebookId} /> : route === '/nuovo' ? <Atelier /> : <Shelf />}
      </Suspense>
      <Toaster />
    </>
  )
}
