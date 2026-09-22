// Fundo animado da landing: pulsos de luz correndo pelas linhas de uma grade, como corrente numa trilha de circuito.
// Adaptado do "Grid Beam" (cult-ui, via 21st.dev): paleta presa ao azul elétrico do produto, sem dependências,
// e mais econômico — a animação para quando sai da tela, quando a aba fica oculta e quando o sistema pede menos movimento.
import { useEffect, useRef, type ReactNode } from 'react'

type RGB = readonly [number, number, number]
type Faixa = { cor: RGB; op: number }

/** Azuis da trilha (trace / trace-hi / navy claro) com um fio de verde do CTA, para não virar um bloco monocromático. */
const PALETA: { h: Faixa[]; v: Faixa[] } = {
  h: [
    { cor: [74, 141, 255], op: 0.42 },
    { cor: [138, 184, 255], op: 0.3 },
    { cor: [60, 110, 220], op: 0.38 },
    { cor: [63, 209, 143], op: 0.22 },
  ],
  v: [
    { cor: [138, 184, 255], op: 0.34 },
    { cor: [74, 141, 255], op: 0.4 },
    { cor: [63, 209, 143], op: 0.2 },
    { cor: [90, 130, 240], op: 0.36 },
  ],
}

const suave = (t: number) => t * t * (3 - 2 * t)
const gauss = (x: number, s: number) => Math.exp(-(x * x) / (2 * s * s))
const rgba = (r: number, g: number, b: number, a: number) => `rgba(${r},${g},${b},${Math.max(0, a).toFixed(4)})`
const clara = (c: RGB, d: number) => [Math.min(255, c[0] + d), Math.min(255, c[1] + d), Math.min(255, c[2] + d)] as const

type Props = {
  /** tamanho da célula em px; linhas e colunas saem do tamanho do bloco */
  celula?: number
  /** segundos para um pulso atravessar o bloco */
  duracao?: number
  forca?: number
  /** cor das linhas da grade */
  linha?: string
  className?: string
  children?: ReactNode
}

export function GridBeam({ celula = 96, duracao = 7, forca = 1, linha = 'rgba(255,255,255,0.045)', className = '', children }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const grade = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const svg = grade.current
    const ctx = canvas?.getContext('2d', { alpha: true })
    if (!canvas || !svg || !ctx) return

    const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = 0, h = 0, rows = 2, cols = 2
    let visivel = false
    let raf: number | null = null
    let inicio = performance.now()

    // a grade (SVG) acompanha o tamanho: células sempre quadradas, qualquer que seja a largura da tela
    const medir = () => {
      const r = canvas.getBoundingClientRect()
      w = r.width; h = r.height
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cols = Math.max(2, Math.round(w / celula))
      rows = Math.max(2, Math.round(h / celula))
      const ns = 'http://www.w3.org/2000/svg'
      svg.replaceChildren()
      for (let i = 1; i < rows; i++) {
        const l = document.createElementNS(ns, 'line')
        const y = `${(i / rows) * 100}%`
        l.setAttribute('x1', '0'); l.setAttribute('x2', '100%'); l.setAttribute('y1', y); l.setAttribute('y2', y)
        svg.appendChild(l)
      }
      for (let i = 1; i < cols; i++) {
        const l = document.createElementNS(ns, 'line')
        const x = `${(i / cols) * 100}%`
        l.setAttribute('y1', '0'); l.setAttribute('y2', '100%'); l.setAttribute('x1', x); l.setAttribute('x2', x)
        svg.appendChild(l)
      }
      if (reduzir.matches) desenhar(inicio + 4000) // quadro parado, para o fundo não ficar vazio
    }

    function desenhar(agora: number) {
      ctx!.clearRect(0, 0, w, h)
      const t0 = (agora - inicio) / 1000
      const gs = suave(Math.min(1, t0 / 1.2)) * forca
      const br = 0.85 + 0.3 * Math.sin(t0 * 1.1) + 0.1 * Math.sin(t0 * 2.3)
      const cw = w / cols, ch = h / rows

      // pulso horizontal em cada linha da grade
      const posH = (r: number) => (((t0 * (1 + (r % 3) * 0.12)) / duracao + r * 0.21 + (r % 2) * 0.35) % 1) * w
      const posV = (c: number) => (((t0 * (1 + (c % 3) * 0.1)) / (duracao * 1.2) + c * 0.26 + (c % 2) * 0.4) % 1) * h

      const feixe = (x0: number, y0: number, x1: number, y1: number, cor: RGB, op: number) => {
        const g = ctx!.createLinearGradient(x0, y0, x1, y1)
        const [r, gg, b] = cor
        const [r1, g1, b1] = clara(cor, 60)
        const [r2, g2, b2] = clara(cor, 100)
        g.addColorStop(0, 'transparent')
        g.addColorStop(0.12, rgba(r, gg, b, op * 0.4 * gs))
        g.addColorStop(0.35, rgba(r1, g1, b1, op * 0.8 * gs))
        g.addColorStop(0.5, rgba(r2, g2, b2, op * gs))
        g.addColorStop(0.65, rgba(r1, g1, b1, op * 0.8 * gs))
        g.addColorStop(0.88, rgba(r, gg, b, op * 0.4 * gs))
        g.addColorStop(1, 'transparent')
        ctx!.strokeStyle = g
        ctx!.lineWidth = 1.5
        ctx!.beginPath(); ctx!.moveTo(x0, y0); ctx!.lineTo(x1, y1); ctx!.stroke()
      }

      for (let r = 1; r < rows; r++) {
        const { cor, op } = PALETA.h[r % PALETA.h.length]
        const y = r * ch, x = posH(r), len = cw * 0.55 * br
        feixe(x - len, y, x + len, y, cor, op)
      }
      for (let c = 1; c < cols; c++) {
        const { cor, op } = PALETA.v[c % PALETA.v.length]
        const x = c * cw, y = posV(c), len = ch * 0.55 * br
        feixe(x, y - len, x, y + len, cor, op)
      }

      // faísca no cruzamento quando dois pulsos se encontram (o "pad" da trilha acende)
      for (let r = 1; r < rows; r++) {
        const hx = posH(r)
        for (let c = 1; c < cols; c++) {
          const ix = c * cw, iy = r * ch
          const prox = gauss((hx - ix) / cw, 0.25) * gauss((posV(c) - iy) / ch, 0.25)
          if (prox <= 0.05) continue
          const a = PALETA.h[r % PALETA.h.length].cor, b = PALETA.v[c % PALETA.v.length].cor
          const m = [(a[0] + b[0]) >> 1, (a[1] + b[1]) >> 1, (a[2] + b[2]) >> 1] as const
          const [mr, mg, mb] = clara(m, 140)
          const raio = 4 * Math.sqrt(prox), op = prox * 0.7 * gs
          const g = ctx!.createRadialGradient(ix, iy, 0, ix, iy, raio)
          g.addColorStop(0, rgba(mr, mg, mb, op))
          g.addColorStop(0.5, rgba(m[0], m[1], m[2], op * 0.4))
          g.addColorStop(1, 'transparent')
          ctx!.fillStyle = g
          ctx!.beginPath(); ctx!.arc(ix, iy, raio, 0, Math.PI * 2); ctx!.fill()
        }
      }
    }

    const quadro = (agora: number) => { desenhar(agora); raf = requestAnimationFrame(quadro) }
    const parar = () => { if (raf !== null) cancelAnimationFrame(raf); raf = null }
    const tocar = () => {
      if (raf !== null || !visivel || document.hidden || reduzir.matches) return
      raf = requestAnimationFrame(quadro)
    }

    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(canvas)
    const io = new IntersectionObserver(([e]) => { visivel = e.isIntersecting; if (visivel) tocar(); else parar() })
    io.observe(canvas)
    const aba = () => (document.hidden ? parar() : tocar())
    document.addEventListener('visibilitychange', aba)
    const mudouMovimento = () => { parar(); inicio = performance.now(); medir(); tocar() }
    reduzir.addEventListener('change', mudouMovimento)

    return () => {
      parar(); ro.disconnect(); io.disconnect()
      document.removeEventListener('visibilitychange', aba)
      reduzir.removeEventListener('change', mudouMovimento)
    }
  }, [celula, duracao, forca])

  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <svg ref={grade} className="absolute inset-0 h-full w-full" stroke={linha} strokeWidth={1} preserveAspectRatio="none" />
      <canvas ref={ref} className="absolute inset-0 h-full w-full" />
      {children}
    </div>
  )
}
