import { ContactShadows, Sparkles } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BoxGeometry, NoToneMapping, PMREMGenerator, type PerspectiveCamera } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { BOOK_D, SHELF_GAP_Y, plankWidth, shelfCount, slotFor } from './geometry'
import { NotebookMesh } from './NotebookMesh'
import { Cup, PencilCup, Plant } from './Props'
import { woodTextures } from './textures'
import { makeWallMaterial } from './WallMaterial'
import { cssVar } from '../../lib/covers'
import type { Notebook } from '../../types'

interface Props {
  notebooks: Notebook[]
  focusIndex: number
  justCreatedId: string | null
  onOpen: (id: string, rect: { x: number; y: number; width: number; height: number }) => void
  /** Il quaderno che sta volando via non deve restare anche nella fila. */
  leavingId: string | null
  onHover: (title: string | null) => void
  onAdd: () => void
  perShelf: number
}

const PLANK_T = 0.07
const PLANK_D = BOOK_D + 0.22

/** Parete: intonaco in GLSL (vedi WallMaterial). Fondale, non superficie:
 *  le ombre le dipinge, non le riceve. */
function Wall({
  shelves,
  width,
  themeTick,
}: {
  shelves: number
  width: number
  themeTick: number
}) {
  const dark = document.documentElement.dataset.theme === 'dark'
  const material = useMemo(
    () =>
      makeWallMaterial(
        Array.from({ length: shelves }, (_, i) => -i * SHELF_GAP_Y - 0.03),
        width / 2,
        dark,
      ),
    // themeTick: al cambio tema i token cambiano e il materiale va ridipinto
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shelves, width, dark, themeTick],
  )
  useEffect(() => () => material.dispose(), [material])
  return (
    <mesh position={[0, -shelves * 0.55 + 0.4, -0.7]} material={material}>
      <planeGeometry args={[40, 16]} />
    </mesh>
  )
}

/** Ripiano: una tavola di legno vero — venatura procedurale, bordo smussato
 *  da un listello frontale, due reggimensola sotto. */
function Plank({ y, width, themeTick }: { y: number; width: number; themeTick: number }) {
  const wood = useMemo(() => woodTextures(), [themeTick]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(
    () => () => {
      wood.map.dispose()
      wood.roughnessMap.dispose()
    },
    [wood],
  )
  wood.map.repeat.set(width / 2.2, 1)
  wood.roughnessMap.repeat.set(width / 2.2, 1)

  const bracket = cssVar('--c-wood-deep')
  return (
    <group position={[0, y - PLANK_T / 2, 0]}>
      <mesh>
        <boxGeometry args={[width, PLANK_T, PLANK_D]} />
        <meshStandardMaterial
          map={wood.map}
          roughnessMap={wood.roughnessMap}
          roughness={0.82}
          metalness={0}
          envMapIntensity={0.25}
        />
      </mesh>
      {/* listello frontale appena più scuro: è la costa della tavola */}
      <mesh position={[0, 0, PLANK_D / 2 + 0.004]}>
        <boxGeometry args={[width, PLANK_T * 0.96, 0.008]} />
        <meshStandardMaterial color={bracket} roughness={0.9} />
      </mesh>
      {/* reggimensola: due cunei sotto, verso la parete */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * (width / 2 - 0.34), -PLANK_T / 2 - 0.09, -PLANK_D / 2 + 0.11]}
          rotation={[0, 0, 0]}
        >
          <boxGeometry args={[0.05, 0.18, 0.2]} />
          <meshStandardMaterial color={bracket} roughness={0.85} />
        </mesh>
      ))}
    </group>
  )
}

/** Il posto vuoto in fondo alla fila: un quaderno tratteggiato da riempire. */
function AddSlot({
  index,
  total,
  perShelf,
  onAdd,
}: {
  index: number
  total: number
  perShelf: number
  onAdd: () => void
}) {
  const slot = slotFor(index, total, perShelf)
  const [hover, setHover] = useState(false)
  const ink = cssVar('--c-graphite')
  return (
    <group
      position={[slot.x, slot.y + 0.5, 0]}
      onClick={(e) => {
        e.stopPropagation()
        onAdd()
      }}
      onPointerOver={() => {
        setHover(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHover(false)
        document.body.style.cursor = ''
      }}
    >
      <mesh>
        <boxGeometry args={[0.17, 1, BOOK_D]} />
        <meshStandardMaterial
          color={cssVar('--c-paper')}
          roughness={1}
          transparent
          opacity={hover ? 0.4 : 0.2}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new BoxGeometry(0.17, 1, BOOK_D)]} />
        <lineBasicMaterial color={ink} transparent opacity={hover ? 0.6 : 0.38} />
      </lineSegments>
      <mesh position={[0, 0, BOOK_D / 2 + 0.004]}>
        <planeGeometry args={[0.075, 0.008]} />
        <meshBasicMaterial color={ink} />
      </mesh>
      <mesh position={[0, 0, BOOK_D / 2 + 0.004]} rotation={[0, 0, Math.PI / 2]}>
        <planeGeometry args={[0.075, 0.008]} />
        <meshBasicMaterial color={ink} />
      </mesh>
    </group>
  )
}

/** La camera arretra quando nasce un secondo ripiano: la stanza è la stessa,
 *  ci si fa solo un passo indietro. E segue il mouse di un soffio: la stanza
 *  ha una profondità, non è un poster. */
function CameraRig({ shelves, width }: { shelves: number; width: number }) {
  const { camera, size, pointer } = useThree()
  const base = useRef({ x: 0, y: 0, z: 3, cy: 0 })

  useEffect(() => {
    const cam = camera as PerspectiveCamera
    const contentH = shelves * SHELF_GAP_Y + 0.5
    const contentW = width + 0.6
    const vFov = (cam.fov * Math.PI) / 180
    const aspect = size.width / size.height
    // distanza che fa entrare sia l'altezza sia la larghezza, con un margine
    const distH = contentH / 2 / Math.tan(vFov / 2)
    const distW = contentW / 2 / Math.tan(vFov / 2) / aspect
    const z = Math.max(distH, distW) * 1.08
    const centerY = -((shelves - 1) * SHELF_GAP_Y) / 2 + 0.34
    // leggermente dall'alto: si guarda una mensola, non la si fissa in faccia
    base.current = { x: 0, y: centerY + z * 0.13, z, cy: centerY }
    camera.position.set(0, base.current.y, z)
    camera.lookAt(0, centerY, 0)
  }, [camera, shelves, width, size.width, size.height])

  useFrame((_, dt) => {
    const b = base.current
    const k = 1 - Math.exp(-dt * 3)
    camera.position.x += (pointer.x * 0.08 * b.z * 0.3 - camera.position.x) * k
    camera.position.y += (b.y + pointer.y * 0.04 * b.z * 0.3 - camera.position.y) * k
    camera.lookAt(0, b.cy, 0)
  })
  return null
}

/** Riflessi ambientali: una stanza generata, non un HDR scaricato. Con
 *  NoToneMapping va tenuta bassa, o le copertine diventano di plastica. */
function Env() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    scene.environmentIntensity = 0.28
    return () => {
      scene.environment = null
      env.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])
  return null
}

export default function ShelfScene({
  notebooks,
  focusIndex,
  justCreatedId,
  leavingId,
  onOpen,
  onHover,
  onAdd,
  perShelf,
}: Props) {
  const total = notebooks.length
  const shelves = shelfCount(total, perShelf)
  const width = useMemo(() => plankWidth(total + 1, perShelf), [total, perShelf])

  // Le texture leggono le variabili CSS: al cambio tema vanno ridipinte.
  const [themeTick, setThemeTick] = useState(0)
  const dark = document.documentElement.dataset.theme === 'dark'
  useEffect(() => {
    const observer = new MutationObserver(() => setThemeTick((t) => t + 1))
    observer.observe(document.documentElement, { attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, toneMapping: NoToneMapping }}
      camera={{ fov: 34, position: [0, 0.55, 3.1] }}
      onPointerMissed={() => onHover(null)}
    >
      <CameraRig shelves={shelves} width={width} />
      <Env />

      {/* Luce da finestra: calda, di taglio. Somma delle intensità intorno a 1:
          con NoToneMapping, scelto per tenere i pastelli fedeli al CSS, tutto
          sopra sbianca. */}
      <hemisphereLight
        intensity={0.5}
        color={cssVar('--c-paper-warm')}
        groundColor={cssVar('--c-wood-deep')}
      />
      <ambientLight intensity={0.22} />
      <directionalLight
        position={[-2.2, 2.8, 4.2]}
        intensity={dark ? 0.35 : 0.85}
        color="#FFE7C4"
      />
      <directionalLight position={[2.8, 0.6, 2.4]} intensity={0.16} color="#CFE0F5" />
      {dark && (
        <pointLight position={[1.4, 0.9, 1.6]} intensity={2.4} distance={6} color="#FFC98A" />
      )}

      <Wall shelves={shelves} width={width} themeTick={themeTick} />

      {Array.from({ length: shelves }, (_, i) => (
        <group key={i}>
          <Plank y={-i * SHELF_GAP_Y} width={width} themeTick={themeTick} />
          {/* ombra di contatto: morbida, come quella che un oggetto fa
              davvero sul piano su cui poggia */}
          <ContactShadows
            position={[0, -i * SHELF_GAP_Y + 0.002, 0.02]}
            width={width}
            height={PLANK_D}
            far={1.3}
            blur={2.2}
            opacity={dark ? 0.55 : 0.42}
            color={dark ? '#000' : '#3a2718'}
            resolution={512}
          />
        </group>
      ))}

      {notebooks.map((n, i) =>
        n.id === leavingId ? null : (
          <NotebookMesh
            key={n.id}
            notebook={n}
            index={i}
            total={total + 1}
            perShelf={perShelf}
            focused={focusIndex === i}
            dropIn={n.id === justCreatedId}
            themeTick={themeTick}
            onOpen={(rect) => onOpen(n.id, rect)}
            onHover={onHover}
          />
        ),
      )}

      <AddSlot index={total} total={total + 1} perShelf={perShelf} onAdd={onAdd} />

      <Plant position={[width / 2 - 0.3, 0, 0.02]} themeTick={themeTick} />
      <Cup position={[-width / 2 + 0.27, 0, 0.1]} />
      {shelves > 1 && <PencilCup position={[width / 2 - 0.28, -SHELF_GAP_Y, 0.08]} />}
      {total > perShelf && (
        <Plant position={[-width / 2 + 0.3, -SHELF_GAP_Y, 0.02]} themeTick={themeTick} small />
      )}

      {/* pulviscolo nella luce: pochissimo, lento */}
      <Sparkles
        count={28}
        scale={[width + 1, shelves * SHELF_GAP_Y + 1.2, 1.4]}
        position={[0, -((shelves - 1) * SHELF_GAP_Y) / 2 + 0.4, 0.4]}
        size={1.6}
        speed={0.12}
        opacity={dark ? 0.35 : 0.22}
        color={cssVar('--c-paper-warm')}
        noise={0.4}
      />
    </Canvas>
  )
}
