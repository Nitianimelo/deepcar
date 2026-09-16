// Dicas ao passar o mouse (ou focar pelo teclado) em botões e ícones.
//
// Uso: qualquer elemento com  data-tip="Texto"  ganha a dica. Opcionais:
//   data-tip-kbd="+"          atalho de teclado mostrado ao lado (vários: "Ctrl,Rolagem")
//   data-tip-side="bottom"    lado preferido (top | bottom | left | right); inverte sozinho se não couber
//
// Uma única camada para o app inteiro: escuta o documento e posiciona um balão fixo na tela, então funciona
// dentro de áreas com rolagem, menus recolhidos e no modo leitura. Em toque (celular) não aparece.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type Lado = 'top' | 'bottom' | 'left' | 'right'
type Dica = { texto: string; kbd: string[]; lado: Lado; alvo: DOMRect }

const ATRASO = 380      // ms até a primeira dica aparecer
const AQUECIDO = 450    // ms em que a próxima dica aparece na hora (passando de botão em botão)
const MARGEM = 8        // distância mínima da borda da tela
const AFASTAMENTO = 10  // distância entre o balão e o elemento

export function TooltipLayer() {
  const [dica, setDica] = useState<Dica | null>(null)
  const [pos, setPos] = useState<{ x: number; y: number; lado: Lado; seta: number } | null>(null)
  const balao = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let timer = 0
    let ultimaSaida = 0
    let atual: HTMLElement | null = null
    let aberta = false

    const alvoDe = (t: EventTarget | null) => (t instanceof Element ? (t.closest('[data-tip]') as HTMLElement | null) : null)

    const mostrar = (el: HTMLElement, imediato: boolean) => {
      window.clearTimeout(timer)
      const abrir = () => {
        if (!el.isConnected || !el.dataset.tip) return
        aberta = true
        setDica({
          texto: el.dataset.tip,
          kbd: el.dataset.tipKbd ? el.dataset.tipKbd.split(',').map((k) => k.trim()).filter(Boolean) : [],
          lado: (el.dataset.tipSide as Lado) || 'top',
          alvo: el.getBoundingClientRect(),
        })
      }
      if (imediato) abrir()
      else timer = window.setTimeout(abrir, ATRASO)
    }
    const esconder = () => {
      window.clearTimeout(timer)
      if (aberta) ultimaSaida = performance.now()
      atual = null
      aberta = false
      setDica(null)
    }

    const onOver = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      const el = alvoDe(e.target)
      if (el === atual) return
      if (!el) { if (atual) esconder(); return }
      atual = el
      mostrar(el, performance.now() - ultimaSaida < AQUECIDO)
    }
    const onOut = (e: PointerEvent) => {
      if (!atual) return
      const para = alvoDe(e.relatedTarget)
      if (para !== atual) esconder()
    }
    const onFocus = (e: FocusEvent) => {
      const el = alvoDe(e.target)
      if (!el || !(e.target as Element).matches?.(':focus-visible')) return
      atual = el
      mostrar(el, true)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') esconder() }
    // o texto pode mudar enquanto a dica está aberta (ex.: "Desenho claro" → "Desenho escuro")
    const obs = new MutationObserver(() => { if (atual && aberta) mostrar(atual, true) })

    document.addEventListener('pointerover', onOver)
    document.addEventListener('pointerout', onOut)
    document.addEventListener('pointerdown', esconder, true)
    document.addEventListener('focusin', onFocus)
    document.addEventListener('focusout', esconder)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', esconder, true)
    window.addEventListener('resize', esconder)
    obs.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-tip'] })
    return () => {
      window.clearTimeout(timer)
      obs.disconnect()
      document.removeEventListener('pointerover', onOver)
      document.removeEventListener('pointerout', onOut)
      document.removeEventListener('pointerdown', esconder, true)
      document.removeEventListener('focusin', onFocus)
      document.removeEventListener('focusout', esconder)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', esconder, true)
      window.removeEventListener('resize', esconder)
    }
  }, [])

  // posiciona depois de medir o balão; troca de lado se não couber e mantém dentro da tela
  useLayoutEffect(() => {
    const b = balao.current
    if (!dica || !b) { setPos(null); return }
    const { width: w, height: h } = b.getBoundingClientRect()
    const a = dica.alvo, vw = innerWidth, vh = innerHeight
    const cabe: Record<Lado, boolean> = {
      top: a.top - h - AFASTAMENTO >= MARGEM,
      bottom: a.bottom + h + AFASTAMENTO <= vh - MARGEM,
      left: a.left - w - AFASTAMENTO >= MARGEM,
      right: a.right + w + AFASTAMENTO <= vw - MARGEM,
    }
    const oposto: Record<Lado, Lado> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }
    const lado = cabe[dica.lado] ? dica.lado : cabe[oposto[dica.lado]] ? oposto[dica.lado] : 'bottom'
    const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)
    let x: number, y: number, seta: number
    if (lado === 'top' || lado === 'bottom') {
      const cx = a.left + a.width / 2
      x = clamp(cx - w / 2, MARGEM, vw - w - MARGEM)
      y = lado === 'top' ? a.top - h - AFASTAMENTO : a.bottom + AFASTAMENTO
      seta = clamp(cx - x, 12, w - 12)
    } else {
      const cy = a.top + a.height / 2
      y = clamp(cy - h / 2, MARGEM, vh - h - MARGEM)
      x = lado === 'left' ? a.left - w - AFASTAMENTO : a.right + AFASTAMENTO
      seta = clamp(cy - y, 10, h - 10)
    }
    setPos({ x, y, lado, seta })
  }, [dica])

  if (!dica) return null
  const setaStyle: React.CSSProperties = pos
    ? pos.lado === 'top' ? { left: pos.seta, bottom: -5, transform: 'translateX(-50%) rotate(45deg)', borderWidth: '0 1px 1px 0' }
      : pos.lado === 'bottom' ? { left: pos.seta, top: -5, transform: 'translateX(-50%) rotate(45deg)', borderWidth: '1px 0 0 1px' }
        : pos.lado === 'left' ? { top: pos.seta, right: -5, transform: 'translateY(-50%) rotate(45deg)', borderWidth: '1px 1px 0 0' }
          : { top: pos.seta, left: -5, transform: 'translateY(-50%) rotate(45deg)', borderWidth: '0 0 1px 1px' }
    : {}

  return createPortal(
    <div
      ref={balao}
      role="tooltip"
      className="tip pointer-events-none fixed left-0 top-0 z-[1000] max-w-[260px] rounded-lg border px-2.5 py-1.5 text-[12.5px] leading-snug"
      data-lado={pos?.lado}
      style={{
        transform: pos ? `translate(${Math.round(pos.x)}px, ${Math.round(pos.y)}px)` : 'translate(-9999px, -9999px)',
        visibility: pos ? 'visible' : 'hidden',
      }}
    >
      <span className="flex items-center gap-2">
        <span>{dica.texto}</span>
        {dica.kbd.length > 0 && (
          <span className="flex flex-none items-center gap-1">
            {dica.kbd.map((k) => <kbd key={k} className="tip-kbd">{k}</kbd>)}
          </span>
        )}
      </span>
      <i aria-hidden="true" className="tip-seta absolute h-2.5 w-2.5" style={setaStyle} />
    </div>,
    document.body,
  )
}
