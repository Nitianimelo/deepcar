import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, ShieldCheck } from 'lucide-react'
import { getSession, logout } from '../lib/auth'

export default function Conta() {
  const nav = useNavigate()
  const s = getSession()
  if (!s) return null

  function sair() {
    logout()
    nav('/login', { replace: true })
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
      <p className="code text-[11px] uppercase tracking-[0.2em] text-ink-4">Conta</p>
      <h1 className="mt-1.5 text-[26px] font-semibold tracking-tight sm:text-3xl">{s.nome}</h1>
      <p className="mt-1 text-ink-3">{s.email}</p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <section className="rounded-xl border seam bg-bench-2 p-5">
          <h2 className="font-medium">Oficina</h2>
          <dl className="mt-3 space-y-2 text-[14px]">
            <Row k="Nome" v={s.oficina} />
            <Row k="Plano" v={s.plano} />
            <Row k="Usuários" v="3 de 5" />
          </dl>
        </section>

        <section className="rounded-xl border seam bg-bench-2 p-5">
          <h2 className="flex items-center gap-2 font-medium"><ShieldCheck size={17} className="text-ok" /> Acesso</h2>
          <dl className="mt-3 space-y-2 text-[14px]">
            <Row k="Sessão" v="Este dispositivo" />
            <Row k="Autenticação" v="E-mail e senha" />
            <Row k="Último acesso" v={new Date().toLocaleDateString('pt-BR')} />
          </dl>
        </section>
      </div>

      <section className="mt-5 rounded-xl border seam bg-bench-2 p-5">
        <h2 className="font-medium">Preferências</h2>
        <div className="mt-3 space-y-3 text-[14px]">
          <Toggle label="Abrir esquemas em tela cheia" defaultChecked />
          <Toggle label="Mostrar cores de fio em código (VM, AZ/BR…)" defaultChecked />
          <Toggle label="Manter menu lateral recolhido" />
        </div>
      </section>

      <div className="mt-8 flex justify-end">
        <button onClick={sair} className="btn-ghost inline-flex items-center gap-2 hover:!text-fault hover:!border-fault/40">
          <LogOut size={16} /> Sair da conta
        </button>
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-3">{k}</dt>
      <dd className="text-ink-1">{v}</dd>
    </div>
  )
}

function Toggle({ label, defaultChecked = false }: { label: string; defaultChecked?: boolean }) {
  const [on, setOn] = useState(defaultChecked)
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 select-none">
      <span className="text-ink-2">{label}</span>
      <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} className="peer sr-only" />
      <span
        className={`relative h-6 w-11 flex-none rounded-full border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-trace/50 ${
          on ? 'border-trace/60 bg-trace/25' : 'seam-strong bg-well'
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-[18px] w-[18px] rounded-full transition-transform ${
            on ? 'translate-x-5 bg-trace-hi' : 'bg-ink-3'
          }`}
        />
      </span>
    </label>
  )
}
