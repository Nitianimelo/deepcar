// Tela do administrador: usuários (plano, acesso, senha) e o cofre de chaves de API.
// Toda a autorização é do servidor (api/admin/*): aqui a checagem só evita mostrar a tela.
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { KeyRound, Loader2, Plus, RefreshCw, Search, Timer, Trash2, Users } from 'lucide-react'
import { useSessao } from '../lib/auth'
import { mmss } from '../lib/plano'
import { mascararWhatsapp } from '../lib/validacao'

type Usuario = {
  id: string
  email: string
  nome: string
  oficina: string
  plano: 'free' | 'pro'
  papel: 'usuario' | 'admin'
  ativo: boolean
  criado_em: string
  visto_em: string | null
  whatsapp: string | null
  free_expira_em: string | null
  sessoes?: number
}

type Segredo = { chave: string; descricao: string | null; atualizado_em: string; por: string | null }

async function api(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    credentials: 'same-origin',
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json', ...init?.headers } : init?.headers,
  })
  const corpo = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((corpo as { erro?: string })?.erro ?? `Falha (HTTP ${res.status}).`)
  return corpo
}

const data = (s: string | null) => (s ? new Date(s).toLocaleDateString('pt-BR') : '—')

/** Situação do teste gratuito, do jeito que o administrador precisa ler de relance. */
function teste(ate: string | null) {
  if (!ate) return 'teste não começou'
  const falta = new Date(ate).getTime() - Date.now()
  return falta > 0 ? `teste: ${mmss(falta)}` : 'teste encerrado'
}

export default function Admin() {
  const { session, conferindo } = useSessao()
  const [aba, setAba] = useState<'usuarios' | 'chaves'>('usuarios')

  if (!session) return conferindo ? <div aria-busy="true" className="min-h-screen" /> : <Navigate to="/login" replace />
  if (session.papel !== 'admin') return <Navigate to="/app" replace />

  return (
    <div className="schematic-grid min-h-screen">
      <header className="flex h-[68px] items-center justify-between gap-4 border-b seam px-5 sm:px-8">
        <div className="flex items-center gap-4">
          <Link to="/app"><img src="/brand/logo-h-light.png" alt="Deepcar" className="w-32" draggable={false} /></Link>
          <span className="code text-[11px] uppercase tracking-[0.2em] text-ink-4">Administração</span>
        </div>
        <div className="flex items-center gap-1 rounded-lg border seam bg-bench-2 p-1">
          {([['usuarios', 'Usuários', Users], ['chaves', 'Chaves de API', KeyRound]] as const).map(([k, rotulo, Icone]) => (
            <button
              key={k}
              type="button"
              onClick={() => setAba(k)}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] ${aba === k ? 'bg-bench-3 text-ink-1' : 'text-ink-3 hover:text-ink-1'}`}
            >
              <Icone size={15} /> {rotulo}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        {aba === 'usuarios' ? <AbaUsuarios meuEmail={session.email} /> : <AbaChaves />}
      </main>
    </div>
  )
}

function AbaUsuarios({ meuEmail }: { meuEmail: string }) {
  const [lista, setLista] = useState<Usuario[]>([])
  const [q, setQ] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [novo, setNovo] = useState(false)

  const buscar = useCallback(async (termo: string) => {
    setCarregando(true)
    try {
      setLista((await api(`/api/admin/usuarios?q=${encodeURIComponent(termo)}`)) as Usuario[])
      setErro('')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => void buscar(q), q ? 300 : 0)
    return () => clearTimeout(t)
  }, [q, buscar])

  async function mudar(u: Usuario, campos: Partial<Usuario> & { senha?: string; liberarFree?: boolean }) {
    const antes = lista
    setLista((l) => l.map((x) => (x.id === u.id ? { ...x, ...campos } : x))) // resposta imediata
    try {
      await api(`/api/admin/usuarios?id=${u.id}`, { method: 'PATCH', body: JSON.stringify(campos) })
    } catch (e) {
      setLista(antes)
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.')
    }
  }

  async function remover(u: Usuario) {
    if (!confirm(`Apagar a conta de ${u.nome} (${u.email})? Não dá para desfazer.`)) return
    try {
      await api(`/api/admin/usuarios?id=${u.id}`, { method: 'DELETE' })
      setLista((l) => l.filter((x) => x.id !== u.id))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível apagar.')
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">Usuários</h1>
          <p className="mt-1 text-ink-3">{lista.length} conta{lista.length === 1 ? '' : 's'} · plano e acesso mudam na hora.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void buscar(q)} className="btn-ghost inline-flex items-center gap-2">
            <RefreshCw size={15} /> Atualizar
          </button>
          <button type="button" onClick={() => setNovo((v) => !v)} className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> Novo usuário
          </button>
        </div>
      </div>

      {novo && <FormaNovoUsuario onPronto={(u) => { setLista((l) => [u, ...l]); setNovo(false) }} onErro={setErro} />}

      <label className="relative mt-5 block">
        <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-4" />
        <input className="field pl-11" placeholder="Buscar por nome, e-mail ou oficina" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>

      {erro && <p role="alert" className="mt-4 rounded-lg border border-fault/30 bg-fault/10 px-4 py-3 text-sm text-fault">{erro}</p>}

      <div className="mt-4 overflow-x-auto rounded-xl border seam bg-bench-2">
        <table className="w-full min-w-[820px] text-[14px]">
          <thead>
            <tr className="code border-b seam-soft text-left text-[11px] uppercase tracking-[0.14em] text-ink-4">
              <th className="px-5 py-3 font-normal">Pessoa</th>
              <th className="px-3 py-3 font-normal">Plano</th>
              <th className="px-3 py-3 font-normal">Papel</th>
              <th className="px-3 py-3 font-normal">Acesso</th>
              <th className="px-3 py-3 font-normal">Criada</th>
              <th className="px-3 py-3 font-normal">Último uso</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {carregando && lista.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-ink-4"><Loader2 size={18} className="mx-auto animate-spin" /></td></tr>
            )}
            {!carregando && lista.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-ink-3">Nenhuma conta encontrada.</td></tr>
            )}
            {lista.map((u) => (
              <tr key={u.id} className="border-t seam-soft">
                <td className="px-5 py-3">
                  <span className="block font-medium text-ink-1">{u.nome}{u.email === meuEmail && <span className="ml-2 text-[11px] text-ink-4">você</span>}</span>
                  <span className="code block text-[12px] text-ink-4">{u.email} · {u.oficina}</span>
                  {u.whatsapp && (
                    <a
                      href={`https://wa.me/${u.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="code text-[12px] text-ink-3 hover:text-trace"
                    >
                      {mascararWhatsapp(u.whatsapp)}
                    </a>
                  )}
                </td>
                <td className="px-3 py-3">
                  <select className="field h-9 py-0 text-[13px]" value={u.plano} onChange={(e) => void mudar(u, { plano: e.target.value as Usuario['plano'], free_expira_em: null })}>
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                  </select>
                  {u.plano === 'free' && u.papel !== 'admin' && (
                    <span className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-ink-4">
                      <Timer size={12} className="flex-none" />
                      {teste(u.free_expira_em)}
                      {u.free_expira_em && (
                        <button
                          type="button"
                          onClick={() => void mudar(u, { liberarFree: true, free_expira_em: null })}
                          data-tip="Zera o relógio: a pessoa ganha um teste novo no próximo acesso"
                          className="text-trace hover:text-trace-hi"
                        >
                          liberar
                        </button>
                      )}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <select className="field h-9 py-0 text-[13px]" value={u.papel} disabled={u.email === meuEmail}
                    onChange={(e) => void mudar(u, { papel: e.target.value as Usuario['papel'] })}>
                    <option value="usuario">Usuário</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-3 py-3">
                  <button
                    type="button"
                    disabled={u.email === meuEmail}
                    onClick={() => void mudar(u, { ativo: !u.ativo })}
                    className={`rounded-full px-3 py-1 text-[12px] ${u.ativo ? 'bg-trace/15 text-trace' : 'bg-bench-3 text-ink-4'} disabled:opacity-50`}
                  >
                    {u.ativo ? 'Ativo' : 'Bloqueado'}
                  </button>
                </td>
                <td className="code px-3 py-3 text-[12px] text-ink-3">{data(u.criado_em)}</td>
                <td className="code px-3 py-3 text-[12px] text-ink-3">{data(u.visto_em)}</td>
                <td className="px-3 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => void remover(u)}
                    disabled={u.email === meuEmail}
                    aria-label={`Apagar ${u.nome}`}
                    className="grid h-8 w-8 place-items-center rounded-md text-ink-4 hover:bg-fault/10 hover:text-fault disabled:opacity-30"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function FormaNovoUsuario({ onPronto, onErro }: { onPronto: (u: Usuario) => void; onErro: (m: string) => void }) {
  const [d, setD] = useState({ nome: '', email: '', senha: '', oficina: '', whatsapp: '', plano: 'free' as const })
  const [salvando, setSalvando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setSalvando(true)
    try {
      onPronto((await api('/api/admin/usuarios', { method: 'POST', body: JSON.stringify(d) })) as Usuario)
    } catch (err) {
      onErro(err instanceof Error ? err.message : 'Não foi possível criar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="mt-5 grid gap-3 rounded-xl border seam bg-bench-2 p-5 sm:grid-cols-2">
      <input className="field" placeholder="Nome" value={d.nome} onChange={(e) => setD({ ...d, nome: e.target.value })} required />
      <input className="field" type="email" placeholder="E-mail" value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} required />
      <input className="field" placeholder="Oficina" value={d.oficina} onChange={(e) => setD({ ...d, oficina: e.target.value })} />
      <input className="field" type="tel" inputMode="numeric" placeholder="WhatsApp (11) 98765-4321" maxLength={16}
        value={d.whatsapp} onChange={(e) => setD({ ...d, whatsapp: mascararWhatsapp(e.target.value) })} />
      <input className="field" type="password" placeholder="Senha (8+ caracteres)" minLength={8} value={d.senha} onChange={(e) => setD({ ...d, senha: e.target.value })} required />
      <div className="sm:col-span-2">
        <button type="submit" className="btn-primary" disabled={salvando}>{salvando ? 'Criando…' : 'Criar conta'}</button>
      </div>
    </form>
  )
}

function AbaChaves() {
  const [lista, setLista] = useState<Segredo[]>([])
  const [erro, setErro] = useState('')
  const [d, setD] = useState({ chave: '', valor: '', descricao: '' })
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    try {
      setLista((await api('/api/admin/segredos')) as Segredo[])
      setErro('')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar.')
    }
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  async function gravar(e: FormEvent) {
    e.preventDefault()
    setSalvando(true)
    try {
      await api('/api/admin/segredos', { method: 'PUT', body: JSON.stringify(d) })
      setD({ chave: '', valor: '', descricao: '' })
      await carregar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível gravar.')
    } finally {
      setSalvando(false)
    }
  }

  async function apagar(chave: string) {
    if (!confirm(`Apagar a chave ${chave}?`)) return
    try {
      await api(`/api/admin/segredos?chave=${encodeURIComponent(chave)}`, { method: 'DELETE' })
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível apagar.')
    }
  }

  return (
    <>
      <h1 className="text-[26px] font-semibold tracking-tight">Chaves de API</h1>
      <p className="mt-1 max-w-2xl text-ink-3">
        Guardadas cifradas no banco. O valor nunca volta para esta tela: para trocar, grave de novo.
        A conexão do banco e a chave da cifra ficam nas variáveis da Vercel, não aqui.
      </p>

      {erro && <p role="alert" className="mt-4 rounded-lg border border-fault/30 bg-fault/10 px-4 py-3 text-sm text-fault">{erro}</p>}

      <form onSubmit={gravar} className="mt-5 grid gap-3 rounded-xl border seam bg-bench-2 p-5 sm:grid-cols-[1fr_1.4fr_1fr_auto]">
        <input className="field code" placeholder="APIBRASIL_BEARER_TOKEN" value={d.chave}
          onChange={(e) => setD({ ...d, chave: e.target.value.toUpperCase() })} required />
        <input className="field" type="password" placeholder="valor" value={d.valor}
          onChange={(e) => setD({ ...d, valor: e.target.value })} required />
        <input className="field" placeholder="para que serve (opcional)" value={d.descricao}
          onChange={(e) => setD({ ...d, descricao: e.target.value })} />
        <button type="submit" className="btn-primary" disabled={salvando}>{salvando ? 'Gravando…' : 'Gravar'}</button>
      </form>

      <ul className="mt-4 divide-y divide-[var(--seam-soft,transparent)] overflow-hidden rounded-xl border seam bg-bench-2">
        {lista.length === 0 && <li className="px-5 py-10 text-center text-ink-3">Nenhuma chave guardada.</li>}
        {lista.map((s) => (
          <li key={s.chave} className="flex flex-wrap items-center justify-between gap-3 border-t seam-soft px-5 py-3.5 first:border-t-0">
            <div className="min-w-0">
              <p className="code font-medium text-ink-1">{s.chave}</p>
              <p className="text-[12.5px] text-ink-4">
                {s.descricao ? `${s.descricao} · ` : ''}mudada em {data(s.atualizado_em)}{s.por ? ` por ${s.por}` : ''}
              </p>
            </div>
            <button type="button" onClick={() => void apagar(s.chave)} aria-label={`Apagar ${s.chave}`}
              className="grid h-8 w-8 place-items-center rounded-md text-ink-4 hover:bg-fault/10 hover:text-fault">
              <Trash2 size={15} />
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
