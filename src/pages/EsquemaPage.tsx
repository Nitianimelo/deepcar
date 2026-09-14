import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Printer, ZoomIn } from 'lucide-react'
import { esquemaPorId } from '../data/esquemas'
import { SECTION_META } from '../data/nav'

export default function EsquemaPage() {
  const { id = '' } = useParams()
  const e = esquemaPorId(id)

  if (!e) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-ink-2">Esquema não encontrado.</p>
        <Link to="/app" className="mt-4 inline-flex text-trace hover:text-trace-hi">Voltar ao catálogo</Link>
      </div>
    )
  }

  const meta = SECTION_META[e.secao]
  const voltar = `/app/${e.secao === 'injecao-leve' ? 'injecao/leve' : e.secao === 'injecao-diesel' ? 'injecao/diesel' : e.secao}`

  // pinagem de exemplo; virá do catálogo real
  const pinos = [
    ['1', 'Alimentação +30', 'VM', 'Bateria'],
    ['2', 'Massa de potência', 'MR', 'Chassi'],
    ['3', 'Sinal do sensor de rotação', 'AZ/BR', 'CKP'],
    ['4', 'Sinal do sensor de fase', 'VD/PT', 'CMP'],
    ['5', 'Comando injetor cil. 1', 'AM', 'INJ1'],
    ['6', 'CAN High', 'LR/VD', 'Rede CAN'],
    ['7', 'CAN Low', 'LR/BR', 'Rede CAN'],
    ['8', 'Sinal TPS', 'CZ', 'Borboleta'],
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <Link to={voltar} className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink-1">
        <ArrowLeft size={15} /> {meta.titulo}
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight sm:text-3xl">{e.montadora} {e.modelo}</h1>
          <p className="code mt-1 text-[13px] text-ink-3">{e.modulo} · {e.motor} · {e.anos}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost inline-flex items-center gap-2"><ZoomIn size={16} /> Ampliar</button>
          <button className="btn-ghost inline-flex items-center gap-2"><Printer size={16} /> Imprimir</button>
          <button className="btn-ghost inline-flex items-center gap-2"><Download size={16} /> PDF</button>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* visualizador (placeholder) */}
        <div className="relative min-h-[420px] overflow-hidden rounded-xl border seam bg-bench-2">
          <div className="absolute inset-0 schematic-grid opacity-70" />
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 800 480" fill="none" aria-hidden="true">
            <g stroke="rgba(180,189,203,0.55)" strokeWidth="1.5">
              <rect x="80" y="120" width="180" height="240" rx="6" />
              <rect x="520" y="90" width="120" height="70" rx="4" />
              <rect x="520" y="210" width="120" height="70" rx="4" />
              <rect x="520" y="330" width="120" height="70" rx="4" />
              <path d="M260 160 H400 V125 H520" />
              <path d="M260 240 H520 " />
              <path d="M260 320 H400 V365 H520" />
              <path d="M170 360 V420 H400" />
            </g>
            <g stroke="var(--color-trace)" strokeWidth="2" className="trace-anim">
              <path d="M40 240 H80" />
              <path d="M260 240 H520" />
            </g>
            <g fill="var(--color-pit)" stroke="rgba(180,189,203,0.7)" strokeWidth="1.5">
              <circle cx="260" cy="160" r="4" /><circle cx="260" cy="240" r="4" /><circle cx="260" cy="320" r="4" />
              <circle cx="400" cy="420" r="4" />
            </g>
            <g className="code" fill="var(--color-ink-3)" fontSize="11" fontFamily="JetBrains Mono, monospace">
              <text x="92" y="140">{e.modulo.split(' ')[0].toUpperCase()}</text>
              <text x="530" y="130">CKP</text><text x="530" y="250">INJ 1–4</text><text x="530" y="370">TPS</text>
              <text x="40" y="232">+30</text><text x="405" y="438">GND</text>
            </g>
          </svg>
          <div className="absolute bottom-3 left-3 code rounded-md border seam bg-bench-1/90 px-2.5 py-1 text-[11px] text-ink-3">
            Página 1 de {e.paginas} · pré-visualização
          </div>
        </div>

        {/* pinagem */}
        <aside className="rounded-xl border seam bg-bench-2">
          <div className="border-b seam-soft px-5 py-3.5">
            <h2 className="font-medium">Pinagem · Conector A</h2>
            <p className="code mt-0.5 text-[12px] text-ink-4">{e.conectores} conectores neste módulo</p>
          </div>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="code text-[11px] uppercase tracking-[0.14em] text-ink-4">
                <th className="px-5 py-2 text-left font-normal">Pino</th>
                <th className="py-2 text-left font-normal">Função</th>
                <th className="py-2 text-left font-normal">Cor</th>
              </tr>
            </thead>
            <tbody>
              {pinos.map(([n, f, c, d]) => (
                <tr key={n} className="border-t seam-soft">
                  <td className="code px-5 py-2.5 text-ink-2">{n}</td>
                  <td className="py-2.5 pr-3">
                    <span className="block text-ink-1">{f}</span>
                    <span className="block text-[12px] text-ink-4">{d}</span>
                  </td>
                  <td className="code py-2.5 pr-5 text-ink-2">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </aside>
      </div>
    </div>
  )
}
