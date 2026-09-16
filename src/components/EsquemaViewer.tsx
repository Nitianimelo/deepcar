// Visualizador do desenho contínuo (porte do template do pipeline para dentro da plataforma).
// Regras que não mudam: as fatias são um desenho único, empilhadas sem vão (sobreposição de 1px) e
// navegadas por rolagem contínua, âncora de componente e minimapa. Nada de paginação.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowUp, ChevronDown, ChevronUp, FileText, Maximize2, Minimize2, Moon, Sun } from 'lucide-react'
import { urlImagem, type EsquemaDetalhe } from '../lib/acervo'
import { MarcaDagua } from './MarcaDagua'

const STEPS = [0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 2.5, 3]
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const TEMA_KEY = 'deepcar.desenho.escuro'

export function EsquemaViewer({ d }: { d: EsquemaDetalhe }) {
  const raiz = useRef<HTMLDivElement>(null)
  const workspace = useRef<HTMLElement>(null)
  const toolbar = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const sheet = useRef<HTMLDivElement>(null)
  const drawing = useRef<HTMLDivElement>(null)
  const mmTrack = useRef<HTMLDivElement>(null)
  const mmView = useRef<HTMLDivElement>(null)
  const barra = useRef<HTMLDivElement>(null)
  const pctRef = useRef<HTMLOutputElement>(null)

  const itens = useMemo(() => d.secoes.flatMap(([, it]) => it), [d])
  const zoom = useRef(1)
  const fit = useRef(0)
  const [zoomUI, setZoomUI] = useState({ z: 1, real: false, pannable: false })
  const [atual, setAtual] = useState(itens[0]?.[0] ?? '')
  const [leitura, setLeitura] = useState(false)
  const [noDoc, setNoDoc] = useState(false)
  const [falhas, setFalhas] = useState<Set<number>>(new Set())
  const [escuro, setEscuro] = useState(() => {
    try { return localStorage.getItem(TEMA_KEY) !== '0' } catch { return true }
  })
  useEffect(() => { try { localStorage.setItem(TEMA_KEY, escuro ? '1' : '0') } catch { /* ignore */ } }, [escuro])

  /** Quem rola: o <main> da plataforma, ou o próprio visualizador no modo leitura. */
  const scroller = useCallback((): HTMLElement => {
    if (leitura && raiz.current) return raiz.current
    return (raiz.current?.closest('main') as HTMLElement | null) ?? document.documentElement
  }, [leitura])

  const sheetPad = () => {
    const cs = getComputedStyle(sheet.current!)
    return parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
  }

  const syncZoomUI = useCallback(() => {
    const dw = drawing.current?.getBoundingClientRect().width ?? 0
    setZoomUI({
      z: zoom.current,
      real: Math.abs(dw - d.largura) < 1.5,
      pannable: (sheet.current?.offsetWidth ?? 0) > (stage.current?.clientWidth ?? 0) + 1,
    })
  }, [d.largura])

  const measureFit = useCallback(() => {
    const st = stage.current, inner = st?.firstElementChild as HTMLElement | null
    if (!st || !inner || !sheet.current) return
    const cs = getComputedStyle(inner)
    fit.current = st.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
    sheet.current.style.width = `${fit.current * zoom.current}px`
    syncZoomUI()
  }, [syncZoomUI])

  /* ---------- posição, progresso, minimapa ---------- */
  const ticking = useRef(false)
  const onScroll = useCallback(() => {
    if (ticking.current) return
    ticking.current = true
    requestAnimationFrame(() => {
      ticking.current = false
      const sc = scroller(), dr = drawing.current, ws = workspace.current
      if (!dr || !ws) return
      const sr = sc === document.documentElement ? { top: 0, bottom: innerHeight } : sc.getBoundingClientRect()
      const b = dr.getBoundingClientRect(), H = b.height, vh = sc.clientHeight
      const top = sr.top - b.top
      const r0 = clamp(top / H), r1 = clamp((top + vh) / H)
      if (mmView.current) { mmView.current.style.top = `${r0 * 100}%`; mmView.current.style.height = `${(r1 - r0) * 100}%` }
      const p = H > vh ? clamp(top / (H - vh)) : 1
      if (pctRef.current) pctRef.current.textContent = `${Math.round(p * 100)}%`
      barra.current?.style.setProperty('--p', p.toFixed(4))
      // linha de leitura logo abaixo da barra; no fim do desenho, o último bloco vence mesmo sendo curto
      const readLine = clamp((top + (toolbar.current?.offsetHeight ?? 50) + 40) / H) * d.altura
      let cur = itens[0]
      for (const s of itens) { if (s[2] <= readLine) cur = s; else break }
      if (b.bottom <= sr.bottom + 24) cur = itens[itens.length - 1]
      if (cur) setAtual((a) => (a === cur[0] ? a : cur[0]))
      setNoDoc(ws.getBoundingClientRect().top < sr.top + 48 && b.bottom > sr.top + 120)
    })
  }, [scroller, d.altura, itens])

  /* Mantém sob (ax, ay) o mesmo ponto do desenho antes e depois da mudança de escala. */
  const applyZoom = useCallback((zAlvo: number, ax?: number, ay?: number) => {
    const st = stage.current, dr = drawing.current, sh = sheet.current
    if (!st || !dr || !sh) return
    const z = clamp(zAlvo, STEPS[0], STEPS[STEPS.length - 1])
    const sc = scroller()
    if (ax === undefined || ay === undefined) {
      const r = st.getBoundingClientRect()
      ax = r.left + r.width / 2
      ay = Math.max(r.top + 60, innerHeight / 2)
    }
    const b = dr.getBoundingClientRect()
    const rx = (ax - b.left) / b.width, ry = (ay - b.top) / b.height
    zoom.current = z
    sh.style.width = `${fit.current * z}px`
    const a = dr.getBoundingClientRect()
    sc.scrollTop += a.top + ry * a.height - ay
    st.scrollLeft += a.left + rx * a.width - ax
    syncZoomUI()
    onScroll()
  }, [scroller, syncZoomUI, onScroll])

  const stepZoom = useCallback((dir: 1 | -1) => {
    const z = zoom.current
    const next = dir > 0 ? STEPS.find((s) => s > z + 1e-3) : [...STEPS].reverse().find((s) => s < z - 1e-3)
    if (next !== undefined) applyZoom(next)
  }, [applyZoom])

  const irPara = (id: string) => {
    const item = itens.find((s) => s[0] === id), dr = drawing.current
    if (!item || !dr) return
    const sc = scroller()
    const sTop = sc === document.documentElement ? 0 : sc.getBoundingClientRect().top
    const b = dr.getBoundingClientRect()
    const alvo = sc.scrollTop + (b.top - sTop) + (Math.max(0, item[2] - 18) / d.altura) * b.height - (toolbar.current?.offsetHeight ?? 50) - 14
    const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches
    sc.scrollTo({ top: alvo, behavior: reduz ? 'instant' : 'smooth' })
    setAtual(id)
  }

  /* ---------- efeitos: medida, rolagem, teclado, ctrl+roda ---------- */
  useLayoutEffect(() => {
    const st = stage.current
    if (!st) return
    const ro = new ResizeObserver(measureFit)
    ro.observe(st)
    measureFit()
    return () => ro.disconnect()
  }, [measureFit])

  useEffect(() => {
    const sc = scroller()
    const alvo: HTMLElement | Window = sc === document.documentElement ? window : sc
    alvo.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    onScroll()
    return () => { alvo.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll) }
  }, [scroller, onScroll])

  useEffect(() => {
    const st = stage.current
    if (!st) return
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      applyZoom(zoom.current * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX, e.clientY)
    }
    st.addEventListener('wheel', wheel, { passive: false })
    return () => st.removeEventListener('wheel', wheel)
  }, [applyZoom])

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const digitando = t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
      if (e.key === 'Escape' && leitura) { setLeitura(false); return }
      if (e.ctrlKey || e.metaKey || e.altKey || digitando) return
      if (e.key === '+' || e.key === '=') { e.preventDefault(); stepZoom(1) }
      else if (e.key === '-') { e.preventDefault(); stepZoom(-1) }
      else if (e.key === '0') { e.preventDefault(); applyZoom(1) }
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [leitura, stepZoom, applyZoom])

  /* ---------- modo leitura: troca quem rola, preservando o ponto do desenho ---------- */
  const posAntes = useRef<number | null>(null)
  const alternarLeitura = () => {
    const dr = drawing.current, sc = scroller()
    if (dr) {
      const sTop = sc === document.documentElement ? 0 : sc.getBoundingClientRect().top
      const b = dr.getBoundingClientRect()
      posAntes.current = (sTop - b.top) / b.height
    }
    setLeitura((v) => !v)
  }
  useLayoutEffect(() => {
    measureFit()
    const r = posAntes.current, dr = drawing.current
    if (r === null || !dr) return
    posAntes.current = null
    const sc = scroller()
    const sTop = sc === document.documentElement ? 0 : sc.getBoundingClientRect().top
    const b = dr.getBoundingClientRect()
    sc.scrollTop += b.top - sTop + Math.max(0, r) * b.height
    onScroll()
  }, [leitura]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- arrastar para mover (mouse, quando o desenho excede a largura) ---------- */
  const pan = useRef<{ x: number; y: number } | null>(null)
  const [panning, setPanning] = useState(false)

  /* ---------- minimapa ---------- */
  const mmDrag = useRef(false)
  const mmGo = (clientY: number) => {
    const t = mmTrack.current!.getBoundingClientRect(), dr = drawing.current!
    const r = clamp((clientY - t.top) / t.height)
    const sc = scroller()
    const sTop = sc === document.documentElement ? 0 : sc.getBoundingClientRect().top
    const b = dr.getBoundingClientRect()
    sc.scrollTop += b.top - sTop + r * b.height - sc.clientHeight / 2
  }

  const filtro = escuro ? 'invert(1) hue-rotate(180deg) saturate(.35)' : 'none'
  const fundoFolha = escuro ? '#10151c' : '#f3f6fa'

  return (
    <div ref={raiz} className={leitura ? 'fixed inset-0 z-50 overflow-y-auto bg-pit px-2 pb-2 sm:px-4 sm:pb-4 xl:pr-[136px]' : 'xl:pr-[92px]'}>
      <section
        ref={workspace}
        aria-label="Esquema elétrico completo"
        className="relative rounded-xl border seam bg-bench-1"
      >
        {/* barra de ferramentas */}
        <div
          ref={toolbar}
          className="no-print sticky top-0 z-10 flex min-h-[52px] items-center justify-between gap-2 rounded-t-xl border-b seam bg-bench-1/95 px-2 py-1.5 backdrop-blur-md sm:px-3"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 text-ink-2">
            <FileText size={16} className="hidden flex-none text-ink-4 sm:block" />
            {itens.length > 1 ? (
              <select
                value={atual}
                onChange={(e) => { irPara(e.target.value); e.target.blur() }}
                aria-label="Ir para o componente"
                data-tip="Escolha um componente para ir direto a ele no desenho"
                data-tip-side="bottom"
                className="w-full min-w-[96px] cursor-pointer truncate rounded-md border border-transparent bg-transparent px-2 py-1.5 text-[13px] font-medium text-ink-1 hover:border-[var(--seam-1)] hover:bg-bench-3 sm:w-auto sm:max-w-[34vw]"
              >
                {d.secoes.map(([grupo, it]) =>
                  grupo ? (
                    <optgroup key={grupo} label={grupo}>
                      {it.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
                    </optgroup>
                  ) : it.map(([id, nome]) => <option key={id} value={id}>{nome}</option>),
                )}
              </select>
            ) : (
              <span className="px-2 text-[13px] font-medium text-ink-1">Desenho completo</span>
            )}
            {itens.length > 1 && (() => {
              const i = itens.findIndex((s) => s[0] === atual)
              return (
                <span className="hidden items-center rounded-lg border seam bg-well/70 p-0.5 sm:flex" role="group" aria-label="Componente anterior ou próximo">
                  <Btn onClick={() => irPara(itens[i - 1][0])} disabled={i <= 0} label="Componente anterior" tip="Voltar ao componente anterior"><ChevronUp size={16} /></Btn>
                  <Btn onClick={() => irPara(itens[i + 1][0])} disabled={i < 0 || i >= itens.length - 1} label="Próximo componente" tip="Avançar para o próximo componente"><ChevronDown size={16} /></Btn>
                </span>
              )
            })()}
            <output ref={pctRef} className="code hidden w-10 flex-none text-right text-[12px] text-ink-4 sm:block" data-tip="Quanto do esquema você já percorreu" data-tip-side="bottom">0%</output>
          </div>

          <div className="flex flex-none items-center gap-1" role="group" aria-label="Zoom e leitura">
            <div className="flex items-center rounded-lg border seam bg-well/70 p-0.5">
              <Btn onClick={() => stepZoom(-1)} disabled={zoomUI.z <= STEPS[0] + 1e-3} label="Diminuir zoom" tip="Afastar o desenho" kbd="−"><span className="text-[19px] leading-none">−</span></Btn>
              <output className="code w-11 text-center text-[12px] text-ink-1" aria-live="polite" data-tip="Zoom atual. Ctrl + rolagem do mouse também aproxima e afasta" data-tip-side="bottom">{Math.round(zoomUI.z * 100)}%</output>
              <Btn onClick={() => stepZoom(1)} disabled={zoomUI.z >= STEPS[STEPS.length - 1] - 1e-3} label="Aumentar zoom" tip="Aproximar o desenho" kbd="+"><span className="text-[19px] leading-none">+</span></Btn>
            </div>
            <Toggle className="hidden md:inline-flex" on={Math.abs(zoomUI.z - 1) < 1e-3} onClick={() => applyZoom(1)} label="Ajustar à largura" tip="Encaixa o desenho na largura da tela" kbd="0">Largura</Toggle>
            <Toggle className="hidden md:inline-flex" on={zoomUI.real} onClick={() => applyZoom((d.largura + sheetPad()) / fit.current)} label="Tamanho real" tip="Tamanho original do desenho, sem ampliar nem reduzir">1:1</Toggle>
            <span className="mx-1 h-5 w-px bg-[var(--seam-3)]" aria-hidden="true" />
            <Btn onClick={() => setEscuro((v) => !v)} label={escuro ? 'Desenho claro' : 'Desenho escuro'} tip={escuro ? 'Ver o desenho com fundo claro, como no papel' : 'Ver o desenho com fundo escuro, mais confortável com pouca luz'}>
              {escuro ? <Sun size={16} /> : <Moon size={16} />}
            </Btn>
            <Toggle
              on={leitura}
              onClick={alternarLeitura}
              label={leitura ? 'Sair do modo de leitura' : 'Modo de leitura'}
              tip={leitura ? 'Voltar à tela normal' : 'Esconde menus e usa a tela inteira para o desenho'}
              kbd={leitura ? 'Esc' : undefined}
            >
              {leitura ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              <span className="hidden lg:inline">{leitura ? 'Sair da leitura' : 'Modo de leitura'}</span>
            </Toggle>
          </div>
          <div
            ref={barra}
            aria-hidden="true"
            className="pointer-events-none absolute bottom-[-1px] left-0 h-[2px] bg-trace"
            style={{ width: 'calc(var(--p, 0) * 100%)' }}
          />
        </div>

        {/* palco */}
        <div
          ref={stage}
          className={`overflow-x-auto overflow-y-hidden rounded-b-xl overscroll-x-contain ${zoomUI.pannable ? (panning ? 'cursor-grabbing select-none' : 'cursor-grab') : ''}`}
          onPointerDown={(e) => {
            if (e.pointerType !== 'mouse' || e.button !== 0 || !zoomUI.pannable) return
            pan.current = { x: e.clientX, y: e.clientY }
            e.currentTarget.setPointerCapture(e.pointerId)
            setPanning(true)
          }}
          onPointerMove={(e) => {
            if (!pan.current) return
            e.currentTarget.scrollLeft -= e.clientX - pan.current.x
            scroller().scrollTop -= e.clientY - pan.current.y
            pan.current = { x: e.clientX, y: e.clientY }
          }}
          onPointerUp={() => { pan.current = null; setPanning(false) }}
          onPointerCancel={() => { pan.current = null; setPanning(false) }}
          // duplo clique: aproxima 2× no ponto clicado; de novo, volta à largura
          onDoubleClick={(e) => applyZoom(zoom.current > 1.01 ? 1 : 2, e.clientX, e.clientY)}
        >
          <div className="w-max min-w-full px-2 pb-6 pt-4 sm:px-8 sm:pb-10 sm:pt-8">
            <div
              ref={sheet}
              className="mx-auto rounded-[3px] border p-2 shadow-2xl sm:p-6"
              style={{ background: fundoFolha, borderColor: escuro ? '#1f2836' : '#c9d2de' }}
            >
              <div ref={drawing} className="desenho relative" style={{ background: fundoFolha }}>
                {d.trechos.map((t, i) =>
                  falhas.has(i) ? (
                    <div
                      key={t.arquivo}
                      className="grid place-items-center border border-dashed p-6 text-center text-[13px] text-ink-3"
                      style={{ aspectRatio: `${t.w}/${t.h}`, marginTop: i ? -1 : 0 }}
                    >
                      Esta parte do desenho não pôde ser carregada.
                    </div>
                  ) : (
                    <img
                      key={t.arquivo}
                      src={urlImagem(d, t)}
                      width={t.w}
                      height={t.h}
                      alt={i === 0 ? `Esquema elétrico ${d.marca} ${d.modelo}` : ''}
                      loading={i < 2 ? 'eager' : 'lazy'}
                      fetchPriority={i === 0 ? 'high' : 'auto'}
                      decoding="async"
                      draggable={false}
                      onError={() => setFalhas((f) => new Set(f).add(i))}
                      // fatias contíguas de um desenho único: sobrepor 1px elimina o fio que o arredondamento subpixel abre
                      style={{ display: 'block', width: '100%', height: 'auto', marginTop: i ? -1 : 0, filter: filtro, background: fundoFolha, userSelect: 'none' }}
                    />
                  ),
                )}
                <MarcaDagua escuro={escuro} />
              </div>
              <div
                className="code mt-4 flex justify-between gap-3 border-t pt-3 text-[10.5px] uppercase tracking-[0.1em]"
                style={{ borderColor: escuro ? '#1f2836' : '#d5dde8', color: escuro ? '#8c99ab' : '#5f6d80' }}
              >
                <span>Fim do esquema · {d.marca} {d.modelo}</span>
                <button
                  type="button"
                  onClick={() => irPara(itens[0]?.[0] ?? 'inicio')}
                  className="no-print inline-flex items-center gap-1 normal-case tracking-normal hover:underline"
                  style={{ color: 'inherit' }}
                  data-tip="Rolar de volta ao topo do esquema"
                >
                  Voltar ao início <ArrowUp size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* minimapa */}
      <aside
        aria-label="Mapa do esquema — clique ou arraste para navegar"
        className={`no-print fixed right-[18px] top-1/2 z-[60] hidden -translate-y-1/2 transition-opacity duration-200 xl:block ${noDoc ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        style={{ height: 'min(74vh, 880px)', aspectRatio: `${d.largura}/${d.altura}`, maxWidth: 72 }}
      >
        <div
          ref={mmTrack}
          data-tip="Mapa do esquema: clique ou arraste para ir a qualquer parte"
          data-tip-side="left"
          className="relative h-full w-full cursor-pointer overflow-hidden rounded ring-1 ring-[var(--seam-3)]"
          style={{ background: fundoFolha, touchAction: 'none' }}
          onPointerDown={(e) => { mmDrag.current = true; e.currentTarget.setPointerCapture(e.pointerId); mmGo(e.clientY); e.preventDefault() }}
          onPointerMove={(e) => { if (mmDrag.current) mmGo(e.clientY) }}
          onPointerUp={() => { mmDrag.current = false }}
          onPointerCancel={() => { mmDrag.current = false }}
        >
          <img
            src={urlImagem(d, d.minimapa)}
            alt=""
            aria-hidden="true"
            className="pointer-events-none block h-full w-full"
            style={{ objectFit: 'fill', filter: filtro }}
          />
          {d.secoes.filter(([g, it]) => g && it[0]?.[2] > 0).map(([g, it]) => (
            <div key={g} className="pointer-events-none absolute inset-x-0 h-px bg-trace/50" style={{ top: `${(it[0][2] / d.altura) * 100}%` }} />
          ))}
          <div ref={mmView} className="pointer-events-none absolute inset-x-0 min-h-[6px] rounded-sm border-[1.5px] border-trace bg-trace/15" />
        </div>
      </aside>
    </div>
  )
}

type Dica = { tip?: string; kbd?: string }

function Btn({ onClick, disabled, label, tip, kbd, children }: { onClick: () => void; disabled?: boolean; label: string; children: React.ReactNode } & Dica) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      data-tip={tip ?? label}
      data-tip-kbd={kbd}
      data-tip-side="bottom"
      className="grid h-7 w-8 place-items-center rounded-md text-ink-2 transition-colors hover:bg-bench-3 hover:text-ink-1 disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  )
}

// `className` substitui o display padrão (ex.: "hidden md:inline-flex")
function Toggle({ on, onClick, label, tip, kbd, className = 'inline-flex', children }: { on: boolean; onClick: () => void; label: string; className?: string; children: React.ReactNode } & Dica) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={label}
      data-tip={tip ?? label}
      data-tip-kbd={kbd}
      data-tip-side="bottom"
      className={`h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium transition-colors ${
        on ? 'bg-trace/15 text-trace-hi' : 'text-ink-2 hover:bg-bench-3 hover:text-ink-1'
      } ${className}`}
    >
      {children}
    </button>
  )
}
