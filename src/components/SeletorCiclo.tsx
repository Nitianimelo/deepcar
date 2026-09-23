// Chave Mensal/Anual dos planos: landing, aba Plano da conta e tela de fim do teste.
// Um botão de rádio de verdade (radiogroup) para leitor de tela e teclado; a pílula que desliza é só visual.
import { descontoAnual, type Ciclo } from '../data/planos'

const OPCOES: { id: Ciclo; rotulo: string }[] = [
  { id: 'mensal', rotulo: 'Mensal' },
  { id: 'anual', rotulo: 'Anual' },
]

export function SeletorCiclo({ ciclo, onChange, className = '' }: { ciclo: Ciclo; onChange: (c: Ciclo) => void; className?: string }) {
  function teclar(e: React.KeyboardEvent) {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault()
      onChange(ciclo === 'mensal' ? 'anual' : 'mensal')
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label="Forma de pagamento"
      onKeyDown={teclar}
      className={`relative inline-grid grid-cols-2 rounded-full border seam bg-bench-2 p-1 text-[14px] ${className}`}
    >
      {/* pílula que desliza até a opção escolhida */}
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full border border-trace/40 bg-trace/15 transition-transform duration-300 ease-[cubic-bezier(.2,.7,.2,1)] motion-reduce:transition-none"
        style={{ transform: ciclo === 'anual' ? 'translateX(100%)' : 'none' }}
      />
      {OPCOES.map((o) => {
        const ativo = ciclo === o.id
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={ativo}
            tabIndex={ativo ? 0 : -1}
            onClick={() => onChange(o.id)}
            className={`relative z-10 inline-flex h-9 items-center justify-center gap-2 rounded-full px-5 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trace/50 ${ativo ? 'text-ink-1' : 'text-ink-3 hover:text-ink-2'}`}
          >
            {o.rotulo}
            {o.id === 'anual' && (
              <span className="code rounded-full bg-ok/15 px-1.5 py-0.5 text-[10.5px] font-medium tracking-wide text-ok">
                −{descontoAnual}%
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
