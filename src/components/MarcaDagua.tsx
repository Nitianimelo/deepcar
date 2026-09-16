// Marca d'água Deepcar espalhada pela folha do visualizador, bem sutil.
// O ladrilho é gerado uma vez no navegador a partir do logo (dois logos inclinados, em padrão alternado)
// e usado como máscara CSS repetida: a cor e a opacidade vêm do tema do desenho, sem imagem extra no acervo.
// Fica por cima do desenho, mas não recebe cliques (arrastar, duplo clique e zoom continuam funcionando).
import { useEffect, useState } from 'react'

const LOGO = '/brand/logo-h-light.png'
const TILE_W = 520
const TILE_H = 340
const LOGO_W = 150
const ANGULO = (-22 * Math.PI) / 180

let ladrilho: Promise<string> | null = null

function gerarLadrilho() {
  ladrilho ??= new Promise<string>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = TILE_W
      c.height = TILE_H
      const g = c.getContext('2d')!
      const h = LOGO_W * (img.naturalHeight / img.naturalWidth)
      // centros em padrão alternado: cada logo cabe inteiro na célula, então o ladrilho emenda sem corte
      for (const [cx, cy] of [[TILE_W * 0.27, TILE_H * 0.27], [TILE_W * 0.77, TILE_H * 0.77]]) {
        g.save()
        g.translate(cx, cy)
        g.rotate(ANGULO)
        g.drawImage(img, -LOGO_W / 2, -h / 2, LOGO_W, h)
        g.restore()
      }
      resolve(c.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = LOGO
  })
  return ladrilho
}

export function MarcaDagua({ escuro }: { escuro: boolean }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let vivo = true
    gerarLadrilho().then((u) => vivo && setUrl(u)).catch(() => { /* sem marca d'água, sem erro */ })
    return () => { vivo = false }
  }, [])
  if (!url) return null
  return (
    <div
      aria-hidden="true"
      className="marca-dagua pointer-events-none absolute inset-0 select-none"
      style={{
        backgroundColor: escuro ? 'rgba(255, 255, 255, 0.05)' : 'rgba(20, 42, 73, 0.065)',
        maskImage: `url(${url})`,
        WebkitMaskImage: `url(${url})`,
        maskRepeat: 'repeat',
        WebkitMaskRepeat: 'repeat',
        maskSize: `${TILE_W}px ${TILE_H}px`,
        WebkitMaskSize: `${TILE_W}px ${TILE_H}px`,
      }}
    />
  )
}
