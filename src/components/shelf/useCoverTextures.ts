import { useEffect, useState } from 'react'
import { CanvasTexture, SRGBColorSpace, type Texture } from 'three'
import { paintCoverFace, paintSpine, paintSticker } from '../../lib/covers'
import { pageEdgeTexture } from './textures'
import { STICKER_DEFS, stickerSvgMarkup } from '../../lib/stickers'
import { cssVar } from '../../lib/covers'
import type { Notebook } from '../../types'

const SIZE = 512

function toTexture(canvas: HTMLCanvasElement): Texture {
  const t = new CanvasTexture(canvas)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  return t
}

/** Le texture arrivano dalle stesse funzioni che disegnano l'anteprima DOM,
 *  così la copertina sulla mensola e quella che si apre sono la stessa cosa. */
export function useCoverTextures(notebook: Notebook, themeTick: number) {
  const [maps, setMaps] = useState<{ cover: Texture; spine: Texture; pages: Texture } | null>(null)

  useEffect(() => {
    let cancelled = false

    const build = async () => {
      await document.fonts.ready

      const coverCv = document.createElement('canvas')
      coverCv.width = SIZE
      coverCv.height = Math.round(SIZE * 1.38)
      const ctx = coverCv.getContext('2d')
      if (!ctx) return
      paintCoverFace(ctx, notebook.cover, notebook.title, coverCv.width, coverCv.height)

      const sticker = notebook.cover.sticker
      if (sticker) {
        await paintSticker(
          ctx,
          stickerSvgMarkup(sticker, cssVar('--c-graphite')),
          cssVar(STICKER_DEFS[sticker].tint),
          coverCv.width * 0.72,
          coverCv.height * 0.62,
          coverCv.width * 0.11,
        )
      }

      const spineCv = document.createElement('canvas')
      spineCv.width = 96
      spineCv.height = SIZE
      const sctx = spineCv.getContext('2d')
      if (sctx) paintSpine(sctx, notebook.cover, notebook.title, spineCv.width, spineCv.height)

      if (cancelled) return
      setMaps({
        cover: toTexture(coverCv),
        spine: toTexture(spineCv),
        pages: pageEdgeTexture(),
      })
    }

    void build()
    return () => {
      cancelled = true
    }
  }, [notebook.cover, notebook.title, themeTick])

  useEffect(
    () => () => {
      maps?.cover.dispose()
      maps?.spine.dispose()
      maps?.pages.dispose()
    },
    [maps],
  )

  return maps
}
