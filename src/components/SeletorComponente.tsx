// Navegação por componente no visualizador: botão com o componente atual e a posição ("12/40") que abre uma
// lista com busca. Substitui o <select> nativo, que com 40+ componentes virava uma rolagem longa sem filtro.
// Teclado: "/" abre (atalho no EsquemaViewer), setas escolhem, Enter vai, Esc fecha.
// Fica dentro do visualizador (sem portal), para funcionar também na tela cheia do navegador.
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronsUpDown, Search } from 'lucide-react'
import type { SecaoDesenho } from '../lib/acervo'
import { normalizar } from '../lib/busca'

type Props = {
  secoes: SecaoDesenho[]
  atual: string
  aberto: boolean
  onAbrir: (v: boolean) => void
  onEscolher: (id: string) => void
}

export function SeletorComponente({ secoes, atual, aberto, onAbrir, onEscolher }: Props) {
  const raiz = useRef<HTMLDivElement>(null)

  const todos = useMemo(() => secoes.flatMap(([grupo, it]) => it.map(([id, nome]) => ({ id, nome, grupo }))), [secoes])
  const pos = todos.findIndex((c) => c.id === atual)
  // clique fora fecha
  useEffect(() => {
    if (!aberto) return
    const fora = (e: PointerEvent) => { if (!raiz.current?.contains(e.target as Node)) onAbrir(false) }
    document.addEventListener('pointerdown', fora)
    return () => document.removeEventListener('pointerdown', fora)
  }, [aberto, onAbrir])

  const nomeAtual = todos[pos]?.nome ?? 'Início'
  return (
    <div ref={raiz} className="relative min-w-0 flex-1 sm:flex-none">
      <button
        type="button"
        onClick={() => onAbrir(!aberto)}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        data-tip={aberto ? undefined : 'Ir direto a um componente do desenho'}
        data-tip-kbd="/"
        data-tip-side="bottom"
        className={`flex h-9 w-full min-w-0 items-center gap-2 rounded-md border px-2.5 text-left transition-colors sm:w-auto sm:max-w-[34vw] ${
          aberto ? 'border-trace/40 bg-bench-3' : 'border-transparent hover:border-[var(--seam-1)] hover:bg-bench-3'
        }`}
      >
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink-1">{nomeAtual}</span>
        <span className="code hidden flex-none text-[11px] text-ink-4 sm:inline">{pos + 1}/{todos.length}</span>
        <ChevronsUpDown size={14} className="flex-none text-ink-4" />
      </button>

      {aberto && <Painel todos={todos} atual={atual} pos={pos} onFechar={() => onAbrir(false)} onEscolher={(id) => { onAbrir(false); onEscolher(id) }} />}
    </div>
  )
}

type Item = { id: string; nome: string; grupo: string }

function Painel({ todos, atual, pos, onFechar, onEscolher }: {
  todos: Item[]; atual: string; pos: number; onFechar: () => void; onEscolher: (id: string) => void
}) {
  const lista = useRef<HTMLUListElement>(null)
  const campo = useRef<HTMLInputElement>(null)
  const [q, setQ] = useState('')
  const [marcado, setMarcado] = useState(Math.max(0, pos))

  const filtrados = useMemo(() => {
    const t = normalizar(q).trim()
    return t ? todos.filter((c) => normalizar(`${c.nome} ${c.grupo}`).includes(t)) : todos
  }, [todos, q])

  // no toque o teclado virtual cobriria a lista: foco no campo só com mouse/teclado
  useEffect(() => {
    if (matchMedia('(hover: hover)').matches) requestAnimationFrame(() => campo.current?.focus())
  }, [])

  // o item marcado fica sempre à vista
  useEffect(() => {
    lista.current?.querySelector<HTMLElement>(`[data-i="${marcado}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [marcado, filtrados])

  function tecla(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setMarcado((m) => Math.min(filtrados.length - 1, m + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setMarcado((m) => Math.max(0, m - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); const c = filtrados[marcado]; if (c) onEscolher(c.id) }
    // Esc aqui só fecha a lista (não sai da tela cheia)
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onFechar() }
  }

  return (
        <div onKeyDown={tecla} className="pop-in absolute left-0 top-[calc(100%+6px)] z-30 flex max-h-[min(62vh,500px)] w-[min(420px,calc(100vw-24px))] flex-col overflow-hidden rounded-xl border seam-strong bg-bench-2 shadow-[0_24px_60px_-12px_rgba(0,0,0,.6)]">
          <label className="relative block flex-none border-b seam-soft">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-4" />
            <input
              ref={campo}
              value={q}
              onChange={(e) => { setQ(e.target.value); setMarcado(0) }}
              placeholder={`Buscar entre ${todos.length} componentes`}
              aria-label="Buscar componente"
              className="h-11 w-full bg-transparent pl-10 pr-3 text-[14px] text-ink-1 outline-none placeholder:text-ink-4"
            />
          </label>
          <ul ref={lista} role="listbox" aria-label="Componentes do esquema" className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1.5">
            {filtrados.length === 0 && <li className="px-4 py-6 text-center text-[13px] text-ink-3">Nenhum componente com esse nome.</li>}
            {filtrados.map((c, i) => {
              const cabecalho = c.grupo && c.grupo !== filtrados[i - 1]?.grupo ? c.grupo : null
              const ativo = c.id === atual
              return (
                <li key={c.id}>
                  {cabecalho && (
                    <p className="code px-4 pb-1 pt-3 text-[10.5px] uppercase tracking-[0.16em] text-ink-4">{cabecalho}</p>
                  )}
                  <button
                    type="button"
                    role="option"
                    aria-selected={ativo}
                    data-i={i}
                    onPointerMove={() => setMarcado(i)}
                    onClick={() => onEscolher(c.id)}
                    className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13.5px] ${
                      i === marcado ? 'bg-bench-3 text-ink-1' : 'text-ink-2'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 flex-none rounded-full ${ativo ? 'bg-trace' : 'bg-transparent'}`} />
                    <span className="min-w-0 flex-1 truncate">{c.nome}</span>
                    {ativo && <span className="code flex-none text-[10.5px] uppercase tracking-[0.12em] text-trace-hi">aqui</span>}
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="code hidden flex-none justify-between border-t seam-soft px-4 py-2 text-[10.5px] text-ink-4 sm:flex">
            <span>↑↓ escolher · Enter ir</span><span>Esc fechar</span>
          </p>
        </div>
      
  )
}
