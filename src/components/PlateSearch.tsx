import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScanLine } from 'lucide-react'
import { formatarPlaca, placaValida } from '../lib/placa'

// Campo de placa da barra superior. Enter → /app/veiculo/:placa
export function PlateSearch({ className = '' }: { className?: string }) {
  const nav = useNavigate()
  const [placa, setPlaca] = useState('')
  const ok = placaValida(placa)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!ok) return
    nav(`/app/veiculo/${placa.replace('-', '')}`)
  }

  return (
    <form onSubmit={onSubmit} className={`relative ${className}`}>
      <ScanLine size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-4" />
      <input
        className="field code h-10 rounded-lg pl-10 pr-24 text-[14px] uppercase tracking-[0.12em]"
        placeholder="Placa · ABC1D23"
        value={placa}
        onChange={(e) => setPlaca(formatarPlaca(e.target.value))}
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        maxLength={8}
        aria-label="Consultar placa"
      />
      <button
        type="submit"
        disabled={!ok}
        className="absolute right-1.5 top-1/2 h-7 -translate-y-1/2 rounded-md bg-trace/15 px-3 text-[12px] font-medium text-trace-hi transition-colors hover:bg-trace/25 disabled:opacity-40 disabled:hover:bg-trace/15"
      >
        Consultar
      </button>
    </form>
  )
}
