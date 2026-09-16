import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { getSession, logout } from '../lib/auth'
import { mmss, restanteFree } from '../lib/plano'

// Preferências reais, guardadas neste navegador (as mesmas chaves que o visualizador e o layout leem).
const PREFS = [
  { chave: 'deepcar.desenho.escuro', rotulo: 'Desenho escuro no visualizador', ajuda: 'Inverte as cores do esquema para leitura com pouca luz.', padrao: true, ligado: (v: string | null) => v !== '0' },
  { chave: 'deepcar.sidebar.collapsed', rotulo: 'Menu lateral recolhido', ajuda: 'Vale a partir da próxima abertura.', padrao: false, ligado: (v: string | null) => v === '1' },
] as const

export default function Conta() {
  const nav = useNavigate()
  const s = getSession()
  const restante = restanteFree(s)
  if (!s) return null

  async function sair() {
    await logout()
    nav('/login', { replace: true })
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
      <p className="code text-[11px] uppercase tracking-[0.2em] text-ink-4">Conta</p>
      <div className="mt-3 flex items-center gap-4">
        <span className="grid h-14 w-14 flex-none place-items-center rounded-full border seam-strong bg-bench-3 text-ink-2">
          <UserRound size={24} />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[26px] font-semibold tracking-tight sm:text-3xl">{s.nome}</h1>
          <p className="truncate text-ink-3">{s.email}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <section className="rounded-xl border seam bg-bench-2 p-5">
          <h2 className="font-medium">Oficina</h2>
          <dl className="mt-3 space-y-2 text-[14px]">
            <Row k="Nome" v={s.oficina} />
            <Row k="Plano" v={s.plano === 'pro' ? 'Profissional' : 'Free'} />
            {s.whatsapp && <Row k="WhatsApp" v={s.whatsapp.replace(/^55(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')} />}
          </dl>
          {restante !== null && (
            <p className="mt-3 border-t seam-soft pt-3 text-[13px] text-ink-3">
              {restante > 0 ? <>Restam <b className="font-medium text-ink-1">{mmss(restante)}</b> de acesso gratuito.</> : 'Seu acesso gratuito terminou.'}{' '}
              <a href="/#planos" className="text-trace hover:text-trace-hi">Ver planos</a>
            </p>
          )}
        </section>

        <section className="rounded-xl border seam bg-bench-2 p-5">
          <h2 className="flex items-center gap-2 font-medium"><ShieldCheck size={17} className="text-ok" /> Acesso</h2>
          <dl className="mt-3 space-y-2 text-[14px]">
            <Row k="Sessão" v="Este dispositivo" />
            <Row k="Autenticação" v="E-mail e senha" />
          </dl>
        </section>
      </div>

      <section className="mt-5 rounded-xl border seam bg-bench-2 p-5">
        <h2 className="font-medium">Preferências</h2>
        <p className="mt-0.5 text-[13px] text-ink-4">Guardadas neste navegador.</p>
        <div className="mt-4 space-y-4 text-[14px]">
          {PREFS.map((p) => <Toggle key={p.chave} {...p} />)}
        </div>
      </section>

      <div className="mt-8 flex justify-end">
        <button onClick={sair} className="btn-ghost inline-flex items-center gap-2 hover:!border-fault/40 hover:!text-fault">
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

function Toggle({ chave, rotulo, ajuda, padrao, ligado }: (typeof PREFS)[number]) {
  const [on, setOn] = useState(() => {
    try { const v = localStorage.getItem(chave); return v === null ? padrao : ligado(v) } catch { return padrao }
  })
  function mudar(v: boolean) {
    setOn(v)
    try { localStorage.setItem(chave, v ? '1' : '0') } catch { /* ignore */ }
  }
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 select-none">
      <span>
        <span className="block text-ink-2">{rotulo}</span>
        <span className="block text-[12px] text-ink-4">{ajuda}</span>
      </span>
      <input type="checkbox" checked={on} onChange={(e) => mudar(e.target.checked)} className="peer sr-only" />
      <span
        className={`relative h-6 w-11 flex-none rounded-full border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-trace/50 ${
          on ? 'border-trace/60 bg-trace/25' : 'seam-strong bg-well'
        }`}
      >
        <span className={`absolute left-0.5 top-0.5 h-[18px] w-[18px] rounded-full transition-transform ${on ? 'translate-x-5 bg-trace-hi' : 'bg-ink-3'}`} />
      </span>
    </label>
  )
}
