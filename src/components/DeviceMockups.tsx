// Celular e tablet em CSS puro, com réplicas reduzidas das telas do app.
// As telas internas usam os mesmos tokens do produto (bench/ink/trace).
import { Car, ChevronRight, CircleDot, Cog, Cpu, ScanLine, Search, Truck, Zap } from 'lucide-react'

/* ── Telas internas (renderizadas em tamanho natural, depois escaladas) ── */

function TelaCelular() {
  return (
    <div className="flex h-[844px] w-[390px] flex-col bg-pit text-ink-1" style={{ fontSize: 15 }}>
      {/* status bar */}
      <div className="flex h-[54px] items-end justify-between px-8 pb-2 text-[15px] font-semibold">
        <span>9:41</span>
        <span className="flex items-center gap-1.5">
          <span className="flex items-end gap-[2px]">{[5, 8, 11, 14].map((h) => <i key={h} className="block w-[3px] rounded-sm bg-ink-1" style={{ height: h }} />)}</span>
          <span className="ml-1 h-[12px] w-[24px] rounded-[3px] border border-ink-1/70 p-[2px]"><i className="block h-full w-[80%] rounded-[1px] bg-ink-1" /></span>
        </span>
      </div>
      {/* topo */}
      <div className="flex items-center justify-between px-5 pt-2">
        <img src="/brand/logo-h-light.png" alt="" className="h-6" />
        <span className="grid h-9 w-9 place-items-center rounded-full border seam-strong bg-bench-3 text-[13px] font-semibold">CS</span>
      </div>
      {/* placa */}
      <div className="px-5 pt-6">
        <p className="code text-[11px] uppercase tracking-[0.2em] text-ink-4">Consulta por placa</p>
        <div className="mt-2 flex h-14 items-center rounded-xl border border-trace/50 bg-well px-4" style={{ boxShadow: '0 0 0 1px rgba(74,141,255,.25), 0 0 24px rgba(74,141,255,.15)' }}>
          <ScanLine size={18} className="text-trace" />
          <span className="code ml-3 flex-1 text-[19px] tracking-[0.18em]">BRA-2E19</span>
          <span className="rounded-md bg-trace/15 px-3 py-1.5 text-[12px] font-medium text-trace-hi">Consultar</span>
        </div>
      </div>
      {/* veículo */}
      <div className="mx-5 mt-5 rounded-xl border seam bg-bench-2 p-4">
        <p className="text-[12px] uppercase tracking-[0.08em] text-ink-3">Toyota</p>
        <p className="mt-0.5 text-[20px] font-semibold tracking-tight">Hilux CD SRX 2.8 4x4</p>
        <div className="mt-3 grid grid-cols-3 gap-3 text-[13px]">
          {[['Ano', '2020'], ['Comb.', 'Diesel'], ['Motor', '1GD-FTV']].map(([k, v]) => (
            <div key={k}><p className="text-[11px] text-ink-4">{k}</p><p className="code mt-0.5 text-ink-1">{v}</p></div>
          ))}
        </div>
      </div>
      {/* sistemas */}
      <div className="px-5 pt-6">
        <p className="text-[15px] font-semibold">Sistemas disponíveis</p>
        <ul className="mt-3 space-y-2">
          {[
            [Truck, 'Injeção Eletrônica · Diesel', 'Denso EDC · 12 pág'],
            [CircleDot, 'ABS', 'Bosch ABS 9.0 · 4 pág'],
            [Zap, 'Elétrica', 'Main Body ECU · 26 pág'],
            [Cog, 'Câmbio', 'AT AC60 · 6 pág'],
          ].map(([Icon, t, s]) => {
            const I = Icon as typeof Zap
            return (
              <li key={t as string} className="flex items-center gap-3 rounded-xl border seam bg-bench-2 px-4 py-3">
                <I size={18} className="text-trace" />
                <span className="flex-1"><span className="block text-[14px]">{t as string}</span><span className="code block text-[11px] text-ink-4">{s as string}</span></span>
                <ChevronRight size={16} className="text-ink-4" />
              </li>
            )
          })}
        </ul>
      </div>
      {/* barra inferior */}
      <div className="mt-auto flex h-[84px] items-start justify-around border-t seam pt-3 text-[10px] text-ink-4">
        {[[Search, 'Placa', true], [Cpu, 'Sistemas', false], [Car, 'Veículos', false], [Cog, 'Conta', false]].map(([Icon, l, on]) => {
          const I = Icon as typeof Zap
          return (
            <span key={l as string} className={`flex flex-col items-center gap-1 ${on ? 'text-trace-hi' : ''}`}>
              <I size={22} /> {l as string}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function TelaTablet() {
  const linhas = [
    ['Volkswagen Gol G6', 'Bosch ME 7.5.30', '1.6 8V EA111 Flex', '2013–2016'],
    ['Fiat Argo', 'Magneti Marelli 8GMF', '1.3 Firefly Flex', '2018–2024'],
    ['Chevrolet Onix', 'Delphi MT35', '1.0 Turbo CSS', '2020–2025'],
    ['Toyota Corolla', 'Denso 89661', '2.0 Dynamic Force', '2020–2025'],
    ['Hyundai HB20', 'Kefico GDI', '1.0 TGDI', '2020–2025'],
    ['Honda Civic G10', 'Keihin PGM-FI', '2.0 i-VTEC', '2017–2021'],
  ]
  return (
    <div className="flex h-[800px] w-[1180px] bg-pit text-ink-1" style={{ fontSize: 14 }}>
      <aside className="flex w-[240px] flex-col border-r seam bg-bench-1">
        <div className="flex h-16 items-center border-b seam px-5"><img src="/brand/logo-h-light.png" alt="" className="h-6" /></div>
        <nav className="space-y-1 p-3">
          <p className="code mb-2 px-3 text-[10px] uppercase tracking-[0.2em] text-ink-4">Sistemas</p>
          {[[Cpu, 'Injeção Eletrônica', false], [Car, 'Leve', true], [Truck, 'Diesel', false], [CircleDot, 'ABS', false], [Zap, 'Elétrica', false], [Cog, 'Câmbio', false]].map(([Icon, l, on], i) => {
            const I = Icon as typeof Zap
            const nested = i === 1 || i === 2
            return (
              <div key={l as string} className={`nav-item h-10 ${on ? 'nav-active' : ''} ${nested ? 'pl-10 text-[13px]' : ''}`}>
                <I size={17} className="nav-icon" /> {l as string}
              </div>
            )
          })}
        </nav>
        <div className="mt-auto flex items-center gap-3 border-t seam p-4">
          <span className="grid h-9 w-9 place-items-center rounded-full border seam-strong bg-bench-3 text-[12px] font-semibold">CS</span>
          <span className="leading-tight"><span className="block text-[13px]">Carlos Souza</span><span className="block text-[11px] text-ink-3">Oficina Central</span></span>
        </div>
      </aside>
      <main className="flex-1 schematic-grid">
        <div className="flex h-16 items-center border-b seam px-6">
          <div className="flex h-10 w-[360px] items-center rounded-lg border seam bg-well px-3"><ScanLine size={15} className="text-ink-4" /><span className="code ml-3 text-[13px] tracking-[0.12em] text-ink-4">PLACA · ABC1D23</span></div>
        </div>
        <div className="p-7">
          <p className="code text-[10px] uppercase tracking-[0.2em] text-ink-4">Injeção Eletrônica › Leve</p>
          <h2 className="mt-1 text-[24px] font-semibold tracking-tight">Injeção Eletrônica · Leve</h2>
          <div className="mt-5 flex gap-2">
            {['Todas', 'Chevrolet', 'Fiat', 'Honda', 'Hyundai', 'Toyota', 'Volkswagen'].map((m, i) => (
              <span key={m} className={`rounded-full border px-3 py-1.5 text-[12px] ${i === 0 ? 'border-trace/50 bg-trace/12 text-trace-hi' : 'seam bg-bench-2 text-ink-2'}`}>{m}</span>
            ))}
          </div>
          <div className="mt-5 overflow-hidden rounded-xl border seam bg-bench-2">
            <div className="code grid grid-cols-[1.5fr_1.2fr_1fr_0.8fr_auto] gap-4 border-b seam-soft px-5 py-2 text-[10px] uppercase tracking-[0.16em] text-ink-4">
              <span>Veículo</span><span>Módulo</span><span>Motor</span><span>Anos</span><span />
            </div>
            {linhas.map(([v, m, mo, a], i) => (
              <div key={v} className={`grid grid-cols-[1.5fr_1.2fr_1fr_0.8fr_auto] items-center gap-4 px-5 py-3 ${i > 0 ? 'border-t seam-soft' : ''}`}>
                <span className="font-medium">{v}</span><span className="code text-[12px] text-ink-2">{m}</span><span className="text-[13px] text-ink-2">{mo}</span><span className="code text-[12px] text-ink-3">{a}</span>
                <ChevronRight size={15} className="text-ink-4" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

/* ── Molduras ─────────────────────────────────────────────────────── */

export function Phone({ scale = 0.62, className = '' }: { scale?: number; className?: string }) {
  const w = 390, h = 844
  return (
    <div className={className} style={{ width: (w + 24) * scale, height: (h + 24) * scale }}>
      <div
        className="relative origin-top-left rounded-[64px] bg-[#1a1d23] p-[12px]"
        style={{
          width: w + 24, height: h + 24, transform: `scale(${scale})`,
          boxShadow: 'inset 0 0 0 2px #2c3038, inset 0 0 0 5px #0a0c10, 0 40px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.06)',
        }}
      >
        {/* botões laterais */}
        <i className="absolute -left-[3px] top-[150px] h-[34px] w-[3px] rounded-l bg-[#2c3038]" />
        <i className="absolute -left-[3px] top-[210px] h-[62px] w-[3px] rounded-l bg-[#2c3038]" />
        <i className="absolute -left-[3px] top-[286px] h-[62px] w-[3px] rounded-l bg-[#2c3038]" />
        <i className="absolute -right-[3px] top-[240px] h-[96px] w-[3px] rounded-r bg-[#2c3038]" />
        {/* tela */}
        <div className="relative h-full w-full overflow-hidden rounded-[52px] bg-pit">
          <TelaCelular />
          {/* dynamic island */}
          <i className="absolute left-1/2 top-[12px] h-[36px] w-[124px] -translate-x-1/2 rounded-full bg-black" />
          {/* home indicator */}
          <i className="absolute bottom-[8px] left-1/2 h-[5px] w-[140px] -translate-x-1/2 rounded-full bg-ink-1/70" />
        </div>
      </div>
    </div>
  )
}

export function Tablet({ scale = 0.5, className = '' }: { scale?: number; className?: string }) {
  const w = 1180, h = 800
  return (
    <div className={className} style={{ width: (w + 44) * scale, height: (h + 44) * scale }}>
      <div
        className="relative origin-top-left rounded-[36px] bg-[#1a1d23] p-[22px]"
        style={{
          width: w + 44, height: h + 44, transform: `scale(${scale})`,
          boxShadow: 'inset 0 0 0 2px #2c3038, inset 0 0 0 5px #0a0c10, 0 40px 90px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.06)',
        }}
      >
        <i className="absolute -top-[3px] left-[80px] h-[3px] w-[70px] rounded-t bg-[#2c3038]" />
        <i className="absolute -top-[3px] left-[160px] h-[3px] w-[40px] rounded-t bg-[#2c3038]" />
        <i className="absolute -right-[3px] top-[70px] h-[40px] w-[3px] rounded-r bg-[#2c3038]" />
        <div className="relative h-full w-full overflow-hidden rounded-[18px] bg-pit">
          <TelaTablet />
          <i className="absolute left-1/2 top-[8px] h-[6px] w-[6px] -translate-x-1/2 rounded-full bg-black ring-1 ring-white/10" />
        </div>
      </div>
    </div>
  )
}
