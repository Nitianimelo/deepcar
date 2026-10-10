// Tela do administrador: usuários (plano, acesso, senha) e o cofre de chaves de API.
// Toda a autorização é do servidor (api/admin/*): aqui a checagem só evita mostrar a tela.
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Activity, BadgeDollarSign, Bell, Check, Copy, Eye, EyeOff, KeyRound, Layers, Link2, Loader2, MessageCircle, MonitorSmartphone, Moon, Plus, RefreshCw, Search, Sun, Timer, Trash2, Users, Wand2, X } from 'lucide-react'
import { useSessao } from '../lib/auth'
import { rotuloPlano, tempoRestante } from '../lib/plano'
import { mascararWhatsapp, SENHA_MINIMA } from '../lib/validacao'
import { SECTION_META, type SectionKey } from '../data/nav'

type Plano = 'free' | 'pro' | 'full'

type Usuario = {
  id: string
  email: string
  nome: string
  oficina: string
  plano: Plano
  papel: 'usuario' | 'admin'
  ativo: boolean
  criado_em: string
  visto_em: string | null
  whatsapp: string | null
  free_expira_em: string | null
  sessoes?: number
  assinatura_status?: string | null
  assinatura_plano?: Plano | null
  assinatura_renova_em?: string | null
  assinatura_em_atraso?: boolean
  assinatura_origem?: string | null
  assinatura_ciclo?: 'mensal' | 'anual' | null
  plano_expira_em?: string | null
  /** de onde veio (UTM/fbclid), só em cadastros feitos pelo site depois de 03/10/2026 */
  origem?: Record<string, string> | null
  /** ativação (db/008): primeiros passos na plataforma */
  boas_vindas_em?: string | null
  primeira_placa_em?: string | null
  primeiro_esquema_em?: string | null
  /** esquemas e placas DIFERENTES que a conta já consultou (api/_lib/consultas.js); o teste do site vale 5 */
  consultas?: number
}

/** Os três primeiros passos, na ordem do funil: ✓ com a data na dica, ou — quando ainda não fez. */
function Ativacao({ u }: { u: Usuario }) {
  if (u.papel === 'admin') return null
  const passos: [string, string | null | undefined][] = [
    ['boas-vindas', u.boas_vindas_em], ['placa', u.primeira_placa_em], ['esquema', u.primeiro_esquema_em],
  ]
  return (
    <span className="block text-[12px] text-ink-4">
      Ativação:{' '}
      {passos.map(([nome, quando], i) => (
        <span key={nome} data-tip={quando ? `${nome}: ${new Date(quando).toLocaleString('pt-BR')}` : `${nome}: ainda não`} className={quando ? 'text-ok' : 'text-ink-4'}>
          {i > 0 && <span className="text-ink-4"> · </span>}{quando ? '✓' : '—'} {nome}
        </span>
      ))}
      <span className="text-ink-4"> · </span>
      <span className={u.consultas ? 'text-ink-2' : 'text-ink-4'}>{u.consultas ?? 0} {u.consultas === 1 ? 'consulta' : 'consultas'}</span>
    </span>
  )
}

/** "facebook / cpc · campanha-x" ou "anúncio da Meta" (só fbclid) ou "google.com" (referrer). */
function textoOrigem(o?: Record<string, string> | null) {
  if (!o) return null
  const fonte = [o.utm_source, o.utm_medium].filter(Boolean).join(' / ')
  if (fonte) return [fonte, o.utm_campaign, o.utm_content].filter(Boolean).join(' · ')
  if (o.fbclid) return 'anúncio da Meta (sem UTM)'
  if (o.gclid) return 'anúncio do Google (sem UTM)'
  if (o.referrer) return o.referrer
  return 'acesso direto'
}

type Pendente = {
  id: string
  email: string
  nome: string | null
  whatsapp: string | null
  plano: Exclude<Plano, 'free'>
  valor: string | number | null
  criado_em: string
  assinatura_id: string | null
  pedido_id: string | null
  ciclo?: 'mensal' | 'anual' | null
}

type Evento = {
  id: string
  evento: string
  status: string
  email: string | null
  plano: Plano | null
  valor: string | number | null
  detalhe: string | null
  recebido_em: string
  usuario_nome: string | null
  usuario_email: string | null
}

type Segredo = { chave: string; descricao: string | null; atualizado_em: string; por: string | null }

type RegraPlano = { secoes: string[]; placa: boolean; dispositivos: number | null; minutos_teste?: number | null; consultas_teste?: number | null }
type RespostaPlanos = { secoes: string[]; planos: Record<Plano, RegraPlano> }

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
  return falta > 0 ? `teste: ${tempoRestante(falta)}` : 'teste encerrado'
}

export default function Admin() {
  const { session, conferindo } = useSessao()
  const [aba, setAba] = useState<'usuarios' | 'planos' | 'assinaturas' | 'avisos' | 'logs' | 'chaves'>('usuarios')
  // claro (padrão desde 10/10/2026) ou escuro, lembrado neste navegador
  const [escuro, setEscuro] = useState(() => { try { return localStorage.getItem('deepcar.admin.tema') === 'escuro' } catch { return false } })
  function trocarTema() {
    setEscuro((v) => { try { localStorage.setItem('deepcar.admin.tema', v ? 'claro' : 'escuro') } catch { /* modo anônimo */ } return !v })
  }

  if (!session) return conferindo ? <div aria-busy="true" className="min-h-screen" /> : <Navigate to="/login" replace />
  if (session.papel !== 'admin') return <Navigate to="/app" replace />

  return (
    <div className={`${escuro ? 'tema-escuro' : 'tema-claro'} schematic-grid min-h-screen bg-pit text-ink-1`}>
      <header className="flex min-h-[68px] flex-wrap items-center justify-between gap-3 border-b seam bg-bench-1 px-4 py-3 sm:px-8">
        <div className="flex items-center gap-4">
          <Link to="/app"><img src={escuro ? '/brand/logo-h-light.png' : '/brand/logo-h.png'} alt="Deepcar" className="w-32" draggable={false} /></Link>
          <span className="code text-[11px] uppercase tracking-[0.2em] text-ink-4">Administração</span>
        </div>
        <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border seam bg-bench-2 p-1">
          {([['usuarios', 'Usuários', Users], ['planos', 'Planos', Layers], ['assinaturas', 'Assinaturas', BadgeDollarSign], ['avisos', 'Avisos no app', Bell], ['logs', 'Logs', Activity], ['chaves', 'Chaves de API', KeyRound]] as const).map(([k, rotulo, Icone]) => (
            <button
              key={k}
              type="button"
              onClick={() => setAba(k)}
              className={`inline-flex flex-none items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] ${aba === k ? 'bg-bench-3 text-ink-1' : 'text-ink-3 hover:text-ink-1'}`}
            >
              <Icone size={15} /> {rotulo}
            </button>
          ))}
          <span className="mx-1 h-5 w-px flex-none bg-ink-1/10" aria-hidden />
          <button type="button" onClick={trocarTema} title={escuro ? 'Usar o tema claro' : 'Usar o tema escuro'} aria-label={escuro ? 'Usar o tema claro' : 'Usar o tema escuro'}
            className="inline-flex flex-none items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] text-ink-3 hover:text-ink-1">
            {escuro ? <Sun size={15} /> : <Moon size={15} />} {escuro ? 'Claro' : 'Escuro'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl overflow-x-clip px-4 py-8 sm:px-8">
        {aba === 'usuarios' && <AbaUsuarios meuEmail={session.email} />}
        {aba === 'planos' && <AbaPlanos />}
        {aba === 'assinaturas' && <AbaAssinaturas />}
        {aba === 'avisos' && <AbaAvisos />}
        {aba === 'logs' && <AbaLogs />}
        {aba === 'chaves' && <AbaChaves />}
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
  const [senhaDe, setSenhaDe] = useState<Usuario | null>(null)
  const [limites, setLimites] = useState<Record<string, number | null>>({})

  useEffect(() => {
    api('/api/admin/planos')
      .then((r) => {
        const planos = (r as RespostaPlanos).planos
        setLimites(Object.fromEntries(Object.entries(planos).map(([k, v]) => [k, v.dispositivos])))
      })
      .catch(() => { /* só enfeite da coluna: sem isso mostra só o número */ })
  }, [])

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

  async function mudar(u: Usuario, campos: Partial<Usuario> & { senha?: string; liberarFree?: boolean; encerrarSessoes?: boolean }) {
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
                  <Ativacao u={u} />
                  {textoOrigem(u.origem) && (
                    <span className="block text-[12px] text-ink-4" data-tip="De onde a pessoa chegou antes de criar a conta">
                      Origem: <span className="text-ink-3">{textoOrigem(u.origem)}</span>
                    </span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <select className="field h-9 py-0 text-[13px]" value={u.plano} onChange={(e) => void mudar(u, { plano: e.target.value as Plano, free_expira_em: null })}>
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="full">Full</option>
                  </select>
                  {u.assinatura_status && <EstadoAssinatura u={u} />}
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
                  <span className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-ink-4">
                    <MonitorSmartphone size={12} className="flex-none" />
                    {u.sessoes ?? 0}
                    {u.papel !== 'admin' && limites[u.plano] ? ` de ${limites[u.plano]}` : ''} aparelho{(u.sessoes ?? 0) === 1 ? '' : 's'}
                    {!!u.sessoes && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Desconectar todos os aparelhos de ${u.nome}? A pessoa precisa entrar de novo.`)) {
                            void mudar(u, { encerrarSessoes: true, sessoes: 0 })
                          }
                        }}
                        data-tip="Encerra as sessões abertas em todos os aparelhos"
                        className="text-trace hover:text-trace-hi"
                      >
                        desconectar
                      </button>
                    )}
                  </span>
                </td>
                <td className="code px-3 py-3 text-[12px] text-ink-3">{data(u.criado_em)}</td>
                <td className="code px-3 py-3 text-[12px] text-ink-3">{data(u.visto_em)}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => setSenhaDe(u)}
                    aria-label={`Redefinir a senha de ${u.nome}`}
                    data-tip="Redefinir senha"
                    className="grid h-8 w-8 place-items-center rounded-md text-ink-4 hover:bg-bench-3 hover:text-trace-hi"
                  >
                    <KeyRound size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void remover(u)}
                    disabled={u.email === meuEmail}
                    aria-label={`Apagar ${u.nome}`}
                    className="grid h-8 w-8 place-items-center rounded-md text-ink-4 hover:bg-fault/10 hover:text-fault disabled:opacity-30"
                  >
                    <Trash2 size={15} />
                  </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {senhaDe && <RedefinirSenha u={senhaDe} ehVoce={senhaDe.email === meuEmail} onFechar={() => setSenhaDe(null)} />}
    </>
  )
}

/** Senha fácil de ditar por telefone: sem 0/O, 1/l/I. Ex.: "k7mq-4hzt". */
function gerarSenha() {
  const letras = 'abcdefghjkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  const s = Array.from(bytes, (b) => letras[b % letras.length]).join('')
  return `${s.slice(0, 4)}-${s.slice(4)}`
}

function RedefinirSenha({ u, ehVoce, onFechar }: { u: Usuario; ehVoce: boolean; onFechar: () => void }) {
  const [senha, setSenha] = useState('')
  const [mostrar, setMostrar] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [pronta, setPronta] = useState<string | null>(null)
  const [copiada, setCopiada] = useState(false)
  const valida = senha.length >= SENHA_MINIMA

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !salvando) onFechar() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onFechar, salvando])

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!valida) return
    setSalvando(true)
    setErro('')
    try {
      await api(`/api/admin/usuarios?id=${u.id}`, { method: 'PATCH', body: JSON.stringify({ senha }) })
      setPronta(senha)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível trocar a senha.')
    } finally {
      setSalvando(false)
    }
  }

  async function copiar() {
    if (!pronta) return
    try {
      await navigator.clipboard.writeText(pronta)
      setCopiada(true)
      setTimeout(() => setCopiada(false), 2000)
    } catch { /* navegador sem permissão: a senha está visível na tela */ }
  }

  const whatsapp = u.whatsapp?.replace(/\D/g, '')
  const mensagem = pronta
    ? `Olá, ${u.nome.split(' ')[0]}! Sua senha do Deepcar foi redefinida.\nE-mail: ${u.email}\nSenha nova: ${pronta}\nEntre em ${window.location.origin}/login`
    : ''

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="redefinir-titulo" className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-pit/80 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget && !salvando) onFechar() }}>
      <div className="relative w-full max-w-[440px] rounded-2xl border seam bg-bench-2 p-6">
        <button type="button" onClick={onFechar} aria-label="Fechar" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md text-ink-4 hover:bg-bench-3 hover:text-ink-1">
          <X size={16} />
        </button>
        <h2 id="redefinir-titulo" className="text-[19px] font-semibold tracking-tight">Redefinir senha</h2>
        <p className="mt-1 text-[14px] text-ink-3">{u.nome} · <span className="code text-[13px]">{u.email}</span></p>

        {!pronta ? (
          <form onSubmit={salvar} className="mt-5">
            <label className="block text-[13px] font-medium text-ink-2" htmlFor="senha-nova">Senha nova</label>
            <div className="relative mt-1.5">
              <input
                id="senha-nova"
                className="field code pr-24"
                type={mostrar ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder={`pelo menos ${SENHA_MINIMA} caracteres`}
                autoComplete="new-password"
                autoFocus
              />
              <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
                <button type="button" onClick={() => { setSenha(gerarSenha()); setMostrar(true) }} aria-label="Gerar senha" data-tip="Gerar uma senha fácil de ditar" className="grid h-9 w-9 place-items-center rounded-md text-ink-3 hover:bg-bench-3 hover:text-trace-hi">
                  <Wand2 size={16} />
                </button>
                <button type="button" onClick={() => setMostrar((v) => !v)} aria-label={mostrar ? 'Esconder senha' : 'Mostrar senha'} className="grid h-9 w-9 place-items-center rounded-md text-ink-3 hover:bg-bench-3 hover:text-ink-1">
                  {mostrar ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <p className="mt-2 text-[12.5px] text-ink-4">
              {ehVoce
                ? 'É a sua própria conta: depois de salvar você sai e entra de novo com a senha nova.'
                : 'As sessões abertas dessa conta são encerradas: a pessoa entra de novo com a senha nova.'}
            </p>
            {erro && <p role="alert" className="mt-3 rounded-lg border border-fault/30 bg-fault/10 px-3 py-2 text-[13px] text-fault">{erro}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={onFechar} className="btn-ghost">Cancelar</button>
              <button type="submit" className="btn-primary !h-10 px-4 text-[14px]" disabled={!valida || salvando}>
                {salvando ? 'Salvando…' : 'Salvar senha'}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-5">
            <p className="flex items-center gap-2 text-[14px] text-ok"><Check size={16} /> Senha trocada.</p>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border seam bg-well px-4 py-3">
              <span className="code break-all text-[17px] tracking-[0.06em] text-ink-1">{pronta}</span>
              <button type="button" onClick={() => void copiar()} className="inline-flex flex-none items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink-1">
                {copiada ? <><Check size={14} /> Copiada</> : <><Copy size={14} /> Copiar</>}
              </button>
            </div>
            <p className="mt-2 text-[12.5px] text-ink-4">Ela não fica guardada em lugar nenhum: passe para a pessoa agora.</p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {whatsapp && !ehVoce && (
                <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(mensagem)}`} target="_blank" rel="noreferrer" className="btn-ghost inline-flex items-center gap-2">
                  <MessageCircle size={15} /> Enviar pelo WhatsApp
                </a>
              )}
              {ehVoce
                ? <a href="/login" className="btn-primary inline-flex !h-10 items-center px-4 text-[14px]">Entrar de novo</a>
                : <button type="button" onClick={onFechar} className="btn-primary !h-10 px-4 text-[14px]">Concluir</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** Pastilha com o estado da assinatura, do jeito que o administrador precisa ler de relance. */
const ESTADOS: Record<string, { rotulo: string; cor: string }> = {
  ativa: { rotulo: 'assinatura ativa', cor: 'text-ok' },
  em_atraso: { rotulo: 'cobrança atrasada', cor: 'text-warn' },
  pausada: { rotulo: 'pausada', cor: 'text-ink-4' },
  cancelada: { rotulo: 'cancelada', cor: 'text-fault' },
  reembolsada: { rotulo: 'reembolsada', cor: 'text-fault' },
  chargeback: { rotulo: 'contestada', cor: 'text-fault' },
  manual: { rotulo: 'plano manual', cor: 'text-ink-4' },
  expirada: { rotulo: 'anual vencido', cor: 'text-fault' },
}

const ORIGENS: Record<string, string> = { play: 'Google Play', cakto: 'Cakto', manual: 'manual' }

function EstadoAssinatura({ u }: { u: Usuario }) {
  const e = ESTADOS[u.assinatura_status ?? ''] ?? { rotulo: u.assinatura_status ?? '', cor: 'text-ink-4' }
  return (
    <span className={`mt-1.5 block text-[11.5px] ${e.cor}`}>
      {e.rotulo}
      {u.assinatura_origem && ` · ${ORIGENS[u.assinatura_origem] ?? u.assinatura_origem}`}
      {u.assinatura_ciclo === 'anual' && u.assinatura_status !== 'expirada' && ' · anual'}
      {u.assinatura_ciclo === 'anual' && u.plano_expira_em
        ? ` · até ${data(u.plano_expira_em)}`
        : u.assinatura_renova_em && ` · renova ${data(u.assinatura_renova_em)}`}
    </span>
  )
}

/** Pagamentos que chegaram sem conta e o histórico do que a Cakto mandou. */
/**
 * O que cada plano libera. Vale para todas as contas do plano, venham da Cakto ou do /admin;
 * administrador sempre vê tudo. A página de vendas é texto fixo (src/data/planos.ts) e não muda daqui.
 */
function AbaPlanos() {
  const PLANOS: Plano[] = ['free', 'pro', 'full']
  const [dados, setDados] = useState<RespostaPlanos | null>(null)
  const [rascunho, setRascunho] = useState<Record<Plano, RegraPlano> | null>(null)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  useEffect(() => {
    api('/api/admin/planos')
      .then((r) => {
        setDados(r as RespostaPlanos)
        setRascunho((r as RespostaPlanos).planos)
      })
      .catch((e) => setErro(e instanceof Error ? e.message : 'Falha ao carregar.'))
  }, [])

  const mudou = (p: Plano) => !!dados && !!rascunho && JSON.stringify(dados.planos[p]) !== JSON.stringify(rascunho[p])
  const algoMudou = PLANOS.some(mudou)

  function alternar(p: Plano, secao: string) {
    setSalvo(false)
    setRascunho((r) => {
      if (!r) return r
      const tem = r[p].secoes.includes(secao)
      return { ...r, [p]: { ...r[p], secoes: tem ? r[p].secoes.filter((x) => x !== secao) : [...r[p].secoes, secao] } }
    })
  }
  const ajustar = (p: Plano, campos: Partial<RegraPlano>) => {
    setSalvo(false)
    setRascunho((r) => (r ? { ...r, [p]: { ...r[p], ...campos } } : r))
  }

  async function salvar() {
    if (!rascunho) return
    setSalvando(true)
    try {
      let ultima: RespostaPlanos | null = null
      for (const p of PLANOS.filter(mudou)) {
        ultima = (await api('/api/admin/planos', { method: 'PUT', body: JSON.stringify({ plano: p, ...rascunho[p] }) })) as RespostaPlanos
      }
      if (ultima) { setDados(ultima); setRascunho(ultima.planos) }
      setErro('')
      setSalvo(true)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setSalvando(false)
    }
  }

  const caixa = (marcado: boolean, onChange: () => void, rotulo: string) => (
    <label className="inline-grid h-9 w-9 cursor-pointer place-items-center rounded-md hover:bg-bench-3">
      <input type="checkbox" checked={marcado} onChange={onChange} aria-label={rotulo} className="peer sr-only" />
      <span className={`grid h-[18px] w-[18px] place-items-center rounded border peer-focus-visible:ring-2 peer-focus-visible:ring-trace/50 ${marcado ? 'border-trace bg-trace text-white' : 'seam-strong bg-well'}`}>
        {marcado && <Check size={12} strokeWidth={3} />}
      </span>
    </label>
  )

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">Planos</h1>
          <p className="mt-1 max-w-[62ch] text-ink-3">
            O que cada plano libera. Vale para todas as contas do plano, pagas pela Cakto ou definidas aqui no /admin.
            Administrador sempre vê tudo.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {salvo && !algoMudou && <span className="inline-flex items-center gap-1.5 text-[13px] text-ok"><Check size={14} /> Salvo</span>}
          <button type="button" disabled={!algoMudou || salvando} onClick={() => setRascunho(dados?.planos ?? null)} className="btn-ghost disabled:opacity-40">
            Desfazer
          </button>
          <button type="button" disabled={!algoMudou || salvando} onClick={() => void salvar()} className="btn-primary inline-flex items-center gap-2 px-5 disabled:opacity-40">
            {salvando && <Loader2 size={15} className="animate-spin" />} Salvar
          </button>
        </div>
      </div>

      {erro && <p role="alert" className="mt-4 rounded-lg border border-fault/30 bg-fault/10 px-4 py-3 text-sm text-fault">{erro}</p>}

      {!rascunho || !dados ? (
        <div className="mt-6 grid place-items-center py-16 text-ink-4"><Loader2 size={18} className="animate-spin" /></div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-xl border seam bg-bench-2">
          <table className="w-full min-w-[560px] text-[14px]">
            <thead>
              <tr className="code border-b seam-soft text-[11px] uppercase tracking-[0.14em] text-ink-4">
                <th className="px-5 py-3 text-left font-normal">Liberado</th>
                {PLANOS.map((p) => (
                  <th key={p} className="w-28 px-3 py-3 text-center font-normal">
                    {rotuloPlano(p)}{mudou(p) && <span className="ml-1 text-warn" data-tip="Alterado, falta salvar">•</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dados.secoes.map((secao) => (
                <tr key={secao} className="border-t seam-soft">
                  <td className="px-5 py-1.5 text-ink-2">{SECTION_META[secao as SectionKey]?.titulo ?? secao}</td>
                  {PLANOS.map((p) => (
                    <td key={p} className="px-3 py-1.5 text-center">
                      {caixa(rascunho[p].secoes.includes(secao), () => alternar(p, secao), `${SECTION_META[secao as SectionKey]?.titulo ?? secao} no plano ${rotuloPlano(p)}`)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t seam">
                <td className="px-5 py-1.5 text-ink-2">Busca pela placa</td>
                {PLANOS.map((p) => (
                  <td key={p} className="px-3 py-1.5 text-center">
                    {caixa(rascunho[p].placa, () => ajustar(p, { placa: !rascunho[p].placa }), `Busca pela placa no plano ${rotuloPlano(p)}`)}
                  </td>
                ))}
              </tr>
              <tr className="border-t seam-soft">
                <td className="px-5 py-2.5 text-ink-2">
                  Aparelhos conectados
                  <span className="block text-[12px] text-ink-4">Ao passar do limite, cai o aparelho parado há mais tempo. Vazio = sem limite.</span>
                </td>
                {PLANOS.map((p) => (
                  <td key={p} className="px-3 py-2.5 text-center">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      inputMode="numeric"
                      className="field mx-auto h-9 w-16 px-2 text-center text-[14px]"
                      value={rascunho[p].dispositivos ?? ''}
                      placeholder="∞"
                      aria-label={`Aparelhos no plano ${rotuloPlano(p)}`}
                      onChange={(e) => ajustar(p, { dispositivos: e.target.value === '' ? null : Math.max(1, Math.min(50, Number(e.target.value) || 1)) })}
                    />
                  </td>
                ))}
              </tr>
              <tr className="border-t seam">
                <td className="px-5 py-2.5 text-ink-2">
                  Esquemas no teste
                  <span className="block text-[12px] text-ink-4">Quantos esquemas ou placas diferentes a pessoa consulta no teste grátis, sem prazo em dias. Abrir de novo o mesmo não conta. Depois disso, tudo abre borrado com "assine um plano".</span>
                </td>
                {PLANOS.map((p) => (
                  <td key={p} className="px-3 py-2.5 text-center">
                    {p === 'free' ? (
                      <input
                        type="number"
                        min={1}
                        max={500}
                        step={1}
                        inputMode="numeric"
                        className="field mx-auto h-9 w-20 px-2 text-center text-[14px]"
                        value={rascunho.free.consultas_teste ?? ''}
                        aria-label="Esquemas no teste"
                        onChange={(e) => ajustar('free', { consultas_teste: e.target.value === '' ? null : Math.max(1, Math.min(500, Math.round(Number(e.target.value) || 1))) })}
                      />
                    ) : (
                      <span className="text-ink-4" aria-hidden="true">—</span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-[12.5px] text-ink-4">
        A mudança vale no próximo acesso de cada conta (em até 1 minuto). O limite de aparelhos é aplicado quando alguém
        entra num aparelho novo. Os itens escritos na página de vendas não mudam daqui.
      </p>
    </>
  )
}

function AbaAssinaturas() {
  const [pendentes, setPendentes] = useState<Pendente[]>([])
  const [eventos, setEventos] = useState<Evento[]>([])
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [soProblemas, setSoProblemas] = useState(false)
  const [vinculando, setVinculando] = useState<Pendente | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const r = (await api('/api/admin/assinaturas')) as { pendentes: Pendente[]; eventos: Evento[] }
      setPendentes(r.pendentes ?? [])
      setEventos(r.eventos ?? [])
      setErro('')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  async function descartar(p: Pendente) {
    if (!confirm(`Descartar o pagamento pendente de ${p.email}? A pessoa não recebe o plano.`)) return
    try {
      await api(`/api/admin/assinaturas?id=${p.id}&acao=descartar`, { method: 'POST' })
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível descartar.')
    }
  }

  const lista = soProblemas ? eventos.filter((e) => ['erro', 'pendente'].includes(e.status)) : eventos

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">Assinaturas</h1>
          <p className="mt-1 text-ink-3">Pagamentos da Cakto: o que ficou sem dono e o que chegou por webhook.</p>
        </div>
        <button type="button" onClick={() => void carregar()} className="btn-ghost inline-flex items-center gap-2">
          <RefreshCw size={15} /> Atualizar
        </button>
      </div>

      {erro && <p role="alert" className="mt-4 rounded-lg border border-fault/30 bg-fault/10 px-4 py-3 text-sm text-fault">{erro}</p>}

      <h2 className="mt-8 text-[15px] font-medium">
        Pagamentos sem conta {pendentes.length > 0 && <span className="ml-1 rounded-full bg-warn/15 px-2 py-0.5 text-[12px] text-warn">{pendentes.length}</span>}
      </h2>
      <p className="mt-1 text-[13px] text-ink-4">
        Quem pagou com um e-mail que ainda não tem conta. O plano entra sozinho quando a pessoa se cadastrar com esse
        e-mail; se ela digitou errado, vincule à conta certa aqui.
      </p>

      <div className="mt-3 overflow-x-auto rounded-xl border seam bg-bench-2">
        <table className="w-full min-w-[720px] text-[14px]">
          <thead>
            <tr className="code border-b seam-soft text-left text-[11px] uppercase tracking-[0.14em] text-ink-4">
              <th className="px-5 py-3 font-normal">Comprador</th>
              <th className="px-3 py-3 font-normal">Plano</th>
              <th className="px-3 py-3 font-normal">Valor</th>
              <th className="px-3 py-3 font-normal">Quando</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {carregando && pendentes.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-ink-4"><Loader2 size={18} className="mx-auto animate-spin" /></td></tr>
            )}
            {!carregando && pendentes.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-ink-3">Nenhum pagamento sem conta.</td></tr>
            )}
            {pendentes.map((p) => (
              <tr key={p.id} className="border-t seam-soft">
                <td className="px-5 py-3">
                  <span className="block font-medium text-ink-1">{p.nome ?? '—'}</span>
                  <span className="code block text-[12px] text-ink-4">{p.email}</span>
                </td>
                <td className="px-3 py-3">{rotuloPlano(p.plano)}{p.ciclo === 'anual' && ' anual'}</td>
                <td className="code px-3 py-3 text-[13px] text-ink-3">{p.valor ? `R$ ${Number(p.valor).toFixed(2).replace('.', ',')}` : '—'}</td>
                <td className="code px-3 py-3 text-[12px] text-ink-3">{data(p.criado_em)}</td>
                <td className="px-3 py-3 text-right">
                  <button type="button" onClick={() => setVinculando(p)} className="btn-ghost !h-8 inline-flex items-center gap-1.5 text-[13px]">
                    <Link2 size={14} /> Vincular
                  </button>
                  <button type="button" onClick={() => void descartar(p)} aria-label="Descartar" className="ml-1 grid h-8 w-8 place-items-center rounded-md text-ink-4 hover:bg-fault/10 hover:text-fault">
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-medium">Eventos recebidos</h2>
        <label className="flex items-center gap-2 text-[13px] text-ink-3">
          <input type="checkbox" checked={soProblemas} onChange={(e) => setSoProblemas(e.target.checked)} /> só problemas
        </label>
      </div>

      <ul className="mt-3 overflow-hidden rounded-xl border seam bg-bench-2">
        {lista.length === 0 && <li className="px-5 py-8 text-center text-ink-3">Nada por aqui.</li>}
        {lista.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 border-t seam-soft px-5 py-3 first:border-t-0">
            <div className="min-w-0">
              <p className="text-[14px] text-ink-1">
                <span className="code text-[13px]">{e.evento}</span>
                {e.email && <span className="text-ink-3"> · {e.email}</span>}
              </p>
              <p className="text-[12px] text-ink-4">
                {data(e.recebido_em)}
                {e.plano && ` · ${rotuloPlano(e.plano)}`}
                {e.usuario_nome && ` · ${e.usuario_nome}`}
                {e.detalhe && ` · ${e.detalhe}`}
              </p>
            </div>
            <span className={`code flex-none text-[11.5px] ${e.status === 'aplicado' ? 'text-ok' : e.status === 'erro' ? 'text-fault' : e.status === 'pendente' ? 'text-warn' : 'text-ink-4'}`}>
              {e.status}
            </span>
          </li>
        ))}
      </ul>

      {vinculando && <VincularPendente p={vinculando} onFechar={() => setVinculando(null)} onPronto={() => { setVinculando(null); void carregar() }} />}
    </>
  )
}

/** Escolhe a conta que vai receber um pagamento pendente. */
function VincularPendente({ p, onFechar, onPronto }: { p: Pendente; onFechar: () => void; onPronto: () => void }) {
  const [q, setQ] = useState(p.email)
  const [contas, setContas] = useState<Usuario[]>([])
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    let vivo = true
    const t = setTimeout(() => {
      void api(`/api/admin/usuarios?q=${encodeURIComponent(q)}`)
        .then((r) => { if (vivo) setContas((r as Usuario[]).slice(0, 8)) })
        .catch(() => { /* a busca falhar não impede fechar o diálogo */ })
    }, 300)
    return () => { vivo = false; clearTimeout(t) }
  }, [q])

  async function vincular(u: Usuario) {
    if (!confirm(`Dar o plano ${rotuloPlano(p.plano)} para ${u.nome} (${u.email})?`)) return
    setSalvando(true)
    try {
      await api(`/api/admin/assinaturas?id=${p.id}`, { method: 'POST', body: JSON.stringify({ usuarioId: u.id }) })
      onPronto()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível vincular.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-pit/80 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar() }}>
      <div className="relative w-full max-w-[520px] rounded-2xl border seam bg-bench-2 p-6">
        <button type="button" onClick={onFechar} aria-label="Fechar" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md text-ink-4 hover:bg-bench-3 hover:text-ink-1">
          <X size={16} />
        </button>
        <h2 className="text-[19px] font-semibold tracking-tight">Vincular pagamento</h2>
        <p className="mt-1 text-[14px] text-ink-3">
          {rotuloPlano(p.plano)} comprado por <span className="code text-[13px]">{p.email}</span>. Escolha a conta que recebe o plano.
        </p>

        <input className="field mt-4" placeholder="Buscar conta por nome ou e-mail" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        {erro && <p role="alert" className="mt-3 rounded-lg border border-fault/30 bg-fault/10 px-3 py-2 text-[13px] text-fault">{erro}</p>}

        <ul className="mt-3 max-h-[280px] overflow-y-auto rounded-xl border seam bg-bench-1">
          {contas.length === 0 && <li className="px-4 py-6 text-center text-[13.5px] text-ink-4">Nenhuma conta encontrada.</li>}
          {contas.map((u) => (
            <li key={u.id} className="border-t seam-soft first:border-t-0">
              <button type="button" disabled={salvando} onClick={() => void vincular(u)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-bench-3 disabled:opacity-50">
                <span className="min-w-0">
                  <span className="block truncate text-[14px] text-ink-1">{u.nome}</span>
                  <span className="code block truncate text-[12px] text-ink-4">{u.email} · {rotuloPlano(u.plano)}</span>
                </span>
                <Link2 size={15} className="flex-none text-ink-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
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
      <input className="field" type="password" placeholder={`Senha (${SENHA_MINIMA}+ caracteres)`} minLength={SENHA_MINIMA} value={d.senha} onChange={(e) => setD({ ...d, senha: e.target.value })} required />
      <div className="sm:col-span-2">
        <button type="submit" className="btn-primary" disabled={salvando}>{salvando ? 'Criando…' : 'Criar conta'}</button>
      </div>
    </form>
  )
}

type Aviso = { id: number; titulo: string; texto: string; publico: string; aparelhos: number; entregues: number; enviado_em: string; enviado_por: string | null }
const PUBLICOS_AVISO = [['todos', 'Todos com o app'], ['teste', 'Só quem está no teste'], ['pagos', 'Só assinantes']] as const

/** Notificação no celular de quem tem o app Android e aceitou (api/admin/usuarios ?acao=push). Novidades, funções novas. */
type ContagemAparelhos = { todas: number; android: number; ios: number }

function AbaAvisos() {
  const [historico, setHistorico] = useState<Aviso[]>([])
  const [aparelhos, setAparelhos] = useState<Record<string, ContagemAparelhos>>({})
  const [titulo, setTitulo] = useState('')
  const [texto, setTexto] = useState('')
  const [publico, setPublico] = useState<string>('todos')
  const [plataforma, setPlataforma] = useState<'todas' | 'android' | 'ios'>('todas')
  const [enviando, setEnviando] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)

  const carregar = useCallback(async () => {
    try {
      const r = (await api('/api/admin/usuarios?acao=push')) as { historico: Aviso[]; aparelhos: Record<string, ContagemAparelhos> }
      setHistorico(r.historico ?? []); setAparelhos(r.aparelhos ?? {})
    } catch (e) { setMsg({ ok: false, texto: e instanceof Error ? e.message : 'Falha ao carregar.' }) }
  }, [])
  useEffect(() => { const t = setTimeout(() => void carregar(), 0); return () => clearTimeout(t) }, [carregar])

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const n = aparelhos[publico]?.[plataforma] ?? 0
    if (!confirm(`Mandar "${titulo}" para ${n} ${n === 1 ? 'aparelho' : 'aparelhos'}? Não dá para desfazer.`)) return
    setEnviando(true); setMsg(null)
    try {
      const r = (await api('/api/admin/usuarios?acao=push', { method: 'POST', body: JSON.stringify({ titulo, texto, publico, plataforma }) })) as { aparelhos: number; entregues: number }
      setMsg({ ok: true, texto: `Enviado: ${r.entregues} de ${r.aparelhos} aparelhos receberam.` })
      setTitulo(''); setTexto(''); await carregar()
    } catch (e2) { setMsg({ ok: false, texto: e2 instanceof Error ? e2.message : 'Não foi possível enviar.' }) }
    finally { setEnviando(false) }
  }

  return (
    <>
      <h1 className="text-[26px] font-semibold tracking-tight">Avisos no app</h1>
      <p className="mt-1 text-ink-3">Notificação no celular de quem tem o app (Android e iPhone) e aceitou receber. Use para novidades e funções
        novas. O aviso de &quot;teste acabou&quot; sai sozinho. O que cada pessoa faz no app está na aba Logs.</p>
      <form onSubmit={enviar} className="mt-6 max-w-2xl space-y-4 rounded-xl border seam bg-bench-2 p-5">
        <label className="block text-[13px] text-ink-3">Título <span className="text-ink-4">({titulo.length}/65)</span>
          <input className="field mt-1.5 h-11" maxLength={65} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Novidade na Deepcar" required />
        </label>
        <label className="block text-[13px] text-ink-3">Texto <span className="text-ink-4">({texto.length}/240)</span>
          <textarea className="field mt-1.5 min-h-24 py-2.5" maxLength={240} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Agora dá para buscar os esquemas de câmbio diesel pela placa." required />
        </label>
        <div className="flex flex-wrap gap-2">
          {PUBLICOS_AVISO.map(([k, rotulo]) => (
            <button key={k} type="button" onClick={() => setPublico(k)} className={`rounded-lg border px-3 py-2 text-[13px] ${publico === k ? 'border-trace/50 bg-trace/15 text-ink-1' : 'seam text-ink-3 hover:text-ink-1'}`}>
              {rotulo} <span className="text-ink-4">· {aparelhos[k]?.[plataforma] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="text-ink-4">Aparelhos:</span>
          {([['todas', 'Android e iPhone'], ['android', 'Só Android'], ['ios', 'Só iPhone']] as const).map(([k, rotulo]) => (
            <button key={k} type="button" onClick={() => setPlataforma(k)} className={`rounded-lg border px-3 py-1.5 ${plataforma === k ? 'border-trace/50 bg-trace/15 text-ink-1' : 'seam text-ink-3 hover:text-ink-1'}`}>
              {rotulo} <span className="text-ink-4">· {aparelhos[publico]?.[k] ?? 0}</span>
            </button>
          ))}
        </div>
        <button type="submit" disabled={enviando || !titulo.trim() || !texto.trim()} className="btn-primary inline-flex !h-11 items-center gap-2 px-5">
          {enviando ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />} Mandar aviso
        </button>
        {msg && <p role="status" className={`text-sm ${msg.ok ? 'text-ok' : 'text-fault'}`}>{msg.texto}</p>}
      </form>
      <h2 className="mt-8 code text-[11px] uppercase tracking-[0.2em] text-ink-4">Já enviados</h2>
      <ul className="mt-3 max-w-2xl space-y-2">
        {historico.length === 0 && <li className="text-sm text-ink-4">Nenhum aviso enviado ainda.</li>}
        {historico.map((a) => (
          <li key={a.id} className="rounded-lg border seam bg-bench-2 px-4 py-3 text-[13.5px]">
            <p className="font-medium text-ink-1">{a.titulo}</p>
            <p className="mt-0.5 text-ink-2">{a.texto}</p>
            <p className="mt-1.5 text-[12px] text-ink-4">{new Date(a.enviado_em).toLocaleString('pt-BR')} · {(PUBLICOS_AVISO.find(([k]) => k === a.publico.split(' · ')[0])?.[1] ?? a.publico) + (a.publico.includes(' · ') ? ` · ${a.publico.endsWith('ios') ? 'só iPhone' : 'só Android'}` : '')} · {a.entregues} de {a.aparelhos} aparelhos{a.enviado_por ? ` · ${a.enviado_por}` : ''}</p>
          </li>
        ))}
      </ul>
    </>
  )
}

type EventoUso = { id: number; tipo: string; detalhe: Record<string, unknown> | null; rota: string | null; aparelho: string | null; em: string
  visitante: string | null; usuario_id: string | null; nome: string | null; email: string | null; plano: Plano | null
  /** 1ª visita com campanha da mesma pessoa, e a origem guardada no cadastro (api/admin/usuarios.js ?acao=logs) */
  origem_rota?: string | null; origem_conta?: Record<string, string> | null }
type Origem = { fonte: string | null; meio: string | null; conteudo: string | null }
type ResumoLogs = {
  porTipo: { tipo: string; n: number; pessoas: number }[]
  semResultado: { termo: string; n: number }[]
  placasErro: { erro: string; n: number }[]
  assinar: { id: string; nome: string; email: string; plano: Plano; cliques: number; ultimo: string }[]
  navegador: { so: string; acao: string; n: number }[]
  leitura?: { so: string; visitantes: number; rolou_metade: number; segundos_mediana: number | null; abriu_cadastro: number; cadastrou: number }[]
  secoes?: { so: string; visitantes: number; tour: number; busca: number; planos: number; faq: number; oferta: number; assinar: number }[]
  vendas?: { n: number; total: number }
  origens?: (Origem & { fbclid: boolean; visitantes: number; assinar: number })[]
  vendasOrigem?: (Origem & { n: number; total: number })[]
}

const NOMES_EVENTO: Record<string, string> = {
  compra: 'Venda (pagamento aprovado)', whatsapp: 'Chamou no WhatsApp', viu_secao: 'Viu seção da página de vendas', tour_passo: 'Passo do tour (página de vendas)', busca_landing: 'Buscou carro na página de vendas', escolheu_carro: 'Escolheu carro na página de vendas', carro_para_planos: 'Foi aos planos pelo carro', pegar_oferta: 'Clicou em Pegar oferta', compra_apple: 'Assinou pela App Store', push_diag: 'Notificações (diagnóstico)', rolou: 'Rolou a página de vendas', saiu_landing: 'Saiu da página de vendas', app_aberto: 'Abriu o app Android', compra_play: 'Assinou pela Google Play',
  pagina: 'Telas abertas (site e app)', busca: 'Busca', placa: 'Placa encontrada', placa_erro: 'Placa com erro', esquema: 'Esquema',
  viu_planos: 'Viu os planos', clicou_assinar: 'Clicou em assinar', cadastro: 'Cadastrou', cadastro_erro: 'Erro no cadastro',
  login: 'Entrou', login_erro: 'Erro ao entrar', compartilhou: 'Compartilhou', navegador_interno: 'Navegador do Instagram/Facebook',
  esqueci_senha: 'Pediu senha nova', senha_redefinida: 'Criou senha nova', senha_criada_compra: 'Criou a senha depois de pagar',
}

// ── Aba Logs (09/10/2026): cada evento vira uma frase em português ("Consultou a placa…"), sem código solto. ──

/** Nome de uma tela pelo caminho, para "Abriu a tela …". */
function nomeTela(rota: string | null) {
  const caminho = String(rota ?? '').split('?')[0]
  if (caminho === '/' || caminho === '') return 'a página de vendas'
  const fixas: Record<string, string> = {
    '/cadastro': 'a tela de cadastro', '/login': 'a tela de entrar', '/app': 'o início da plataforma', '/app/conta': 'Minha conta',
    '/app/busca': 'a busca da plataforma', '/obrigado': 'a página de obrigado (depois de pagar)', '/esqueci-senha': 'a tela "Esqueci a senha"',
    '/redefinir-senha': 'a tela de criar senha', '/privacidade': 'a política de privacidade', '/suporte': 'a página de suporte',
    '/excluir-conta': 'a tela de excluir conta', '/admin': 'o painel do administrador',
  }
  if (fixas[caminho]) return fixas[caminho]
  if (caminho.startsWith('/app/veiculo/')) return `a ficha da placa ${caminho.split('/')[3] ?? ''}`
  if (caminho.startsWith('/app/esquema/')) return `o esquema ${nomeEsquema(caminho.replace('/app/esquema/', ''))}`
  if (caminho.startsWith('/c/')) return 'um esquema recebido por link'
  const secao = (Object.keys(SECTION_META) as SectionKey[]).find((k) => caminho.replace('/app/', '').replace('/', '-') === k)
  return secao ? `a lista de ${SECTION_META[secao].titulo}` : caminho
}

/** "eletrica/fiat/fiorino-1-4-8v-evo-flex-de-2014-a-2021" → "Fiat Fiorino 1.4 8v Evo Flex de 2014 a 2021 (Elétrica · Leve)". */
function nomeEsquema(id: string) {
  const [secao, marca, modelo] = String(id).split('/')
  const bonito = (t = '') => t.replace(/(\d)-(\d)/g, '$1.$2').replace(/-/g, ' ').replace(/\b\w+/g, (w) => (/^(de|a|em|diante|e|ate)$/.test(w) ? w : w[0].toUpperCase() + w.slice(1)))
  const meta = SECTION_META[secao as SectionKey]
  return `${bonito(marca)} ${bonito(modelo)}${meta ? ` (${meta.titulo})` : ''}`.trim()
}

const SECOES_PAGINA: Record<string, string> = {
  topo: 'o topo (oferta e chamada principal)', 'como-funciona': 'o tour "Como funciona"', 'seu-carro': 'a busca "Veja se tem o seu carro"',
  cobertura: 'a parte de cobertura (montadoras e placa)', 'por-que': 'a comparação Deepcar × manual em PDF', planos: 'os planos e preços', faq: 'as perguntas frequentes (FAQ)',
}
const ACOES_NAVEGADOR: Record<string, string> = {
  mostrado: 'Viu o aviso para sair do navegador do', abrir_safari: 'Tocou em "Abrir no Safari" no aviso do navegador do',
  abrir_chrome: 'Tocou em "Abrir no Chrome" no aviso do navegador do', baixar_app: 'Tocou em "Baixar o app" no aviso do navegador do',
  copiou_link: 'Copiou o link no aviso do navegador do', continuou_aqui: 'Fechou o aviso e continuou no navegador do',
}
const ONDE_OFERTA: Record<string, string> = { faixa: 'na faixa laranja do topo', cabecalho: 'no cabeçalho', topo: 'no topo da página' }
const ESTADO_ESQUEMA: Record<string, string> = {
  liberado: '', teste_encerrado: ', mas o teste grátis já tinha acabado (abriu borrado, com o convite para assinar)',
  fora_do_plano: ', mas esse sistema não está no plano dele (abriu borrado)', recusado: ', mas o teste grátis acabou nesse momento (abriu borrado)',
}

/** O que a pessoa fez, numa frase. */
function fraseEvento(e: EventoUso) {
  const d = (e.detalhe ?? {}) as Record<string, string | number | null | string[]>
  const n = Number(d.resultados ?? 0)
  const resultados = n === 0 ? 'nenhum resultado' : n === 1 ? '1 resultado' : `${n} resultados`
  switch (e.tipo) {
    case 'pagina': return `Abriu ${nomeTela(e.rota)}`
    case 'rolou': return `Rolou até ${d.pct}% da página de vendas`
    case 'saiu_landing': return `Saiu da página de vendas depois de ${d.segundos} segundos, tendo descido até ${d.rolou}% dela`
    case 'viu_secao': return `Chegou até ${SECOES_PAGINA[String(d.secao)] ?? d.secao} na página de vendas`
    case 'tour_passo': return `Passou para o passo ${d.passo} de 7 do tour "Como funciona"`
    case 'busca_landing': return `Procurou "${d.termo}" na busca de carros da página de vendas: ${resultados}`
    case 'escolheu_carro': return `Escolheu o carro ${d.carro} na busca da página de vendas`
    case 'carro_para_planos': return 'Foi do carro escolhido para os planos'
    case 'pegar_oferta': return `Tocou em "Pegar oferta" ${ONDE_OFERTA[String(d.onde)] ?? `(${d.onde})`}`
    case 'clicou_assinar': return `Clicou para assinar o plano ${String(d.plano ?? '').replace(/^\w/, (l) => l.toUpperCase())} ${d.ciclo ?? ''} e foi para o pagamento`
    case 'viu_planos': return d.onde === 'conta' ? 'Viu os planos na aba "Plano" da conta' : `Viu os planos na mensagem "${d.onde}"`
    case 'cadastro': return 'Criou uma conta'
    case 'cadastro_erro': return `Tentou criar uma conta e deu erro: ${d.erro}`
    case 'login': return 'Entrou na conta'
    case 'login_erro': return `Tentou entrar e deu erro: ${d.erro}${d.email ? ` (digitou ${d.email})` : ''}`
    case 'esqueci_senha': return 'Pediu o link para criar uma senha nova'
    case 'senha_redefinida': return 'Criou uma senha nova pelo link do e-mail'
    case 'senha_criada_compra': return 'Criou a senha depois de pagar (a conta foi criada na compra)'
    case 'placa': return `Consultou a placa ${d.placa}: ${[d.marca, d.modelo, d.ano].filter(Boolean).join(' ')}`
    case 'placa_erro': return `Tentou consultar a placa ${d.placa} e deu erro: ${d.erro}`
    case 'busca': return `Buscou "${d.termo}" na plataforma: ${resultados}`
    case 'esquema': return `Abriu o esquema ${nomeEsquema(String(d.id ?? ''))}${ESTADO_ESQUEMA[String(d.estado)] ?? ''}`
    case 'compartilhou': return 'Compartilhou um esquema por link'
    case 'whatsapp': return `Tocou no botão do WhatsApp${d.onde ? ` (em ${nomeTela(String(d.onde))})` : ''}`
    case 'navegador_interno': return `${ACOES_NAVEGADOR[String(d.acao)] ?? `Aviso do navegador (${d.acao}) do`} ${d.app} (${d.so === 'ios' ? 'iPhone' : 'Android'})`
    case 'app_aberto': return 'Abriu o app Android'
    case 'compra': return `Pagamento aprovado: plano ${String(d.plano ?? '').replace(/^\w/, (l) => l.toUpperCase())} ${d.ciclo ?? ''}${d.valor != null ? `, ${Number(d.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : ''}${d.metodo ? ` (${d.metodo === 'pix' ? 'Pix' : d.metodo === 'credit_card' ? 'cartão' : d.metodo})` : ''}`
    case 'compra_play': return 'Assinou pelo app Android (Google Play)'
    case 'compra_apple': return 'Assinou pelo app do iPhone (App Store)'
    case 'push_diag': return `Notificações do app: etapa "${d.etapa}" — ${d.info}`
    default: return NOMES_EVENTO[e.tipo] ?? e.tipo
  }
}

/** De qual anúncio a pessoa veio, lido da UTM da própria rota (página de vendas). */
const MEIOS_WHATSAPP: Record<string, string> = { crm: 'link mandado pelo CRM', anuncio: 'resposta automática do anúncio', apresentacao: 'apresentação do Matheus', fora_horario: 'resposta fora do horário' }
const decodificar = (v: string | null) => { if (!v) return null; try { return decodeURIComponent(v.replace(/\+/g, ' ')) } catch { return v } }
/** "facebook / cpc / criativo 3 · 42s" → "Anúncio Meta · criativo 3 · 42s". Sem campanha = null. */
function rotuloOrigem(o: { fonte?: string | null; meio?: string | null; conteudo?: string | null; fbclid?: boolean }) {
  const fonte = decodificar(o.fonte ?? null)?.toLowerCase() ?? null
  const meio = decodificar(o.meio ?? null)
  const conteudo = decodificar(o.conteudo ?? null)
  if (!fonte) return o.fbclid ? 'Facebook/Instagram (link sem campanha)' : null
  let nome = fonte
  if (['facebook', 'fb', 'instagram', 'meta'].includes(fonte)) nome = meio === 'cpc' || meio === 'paid' ? 'Anúncio Meta' : 'Facebook/Instagram'
  else if (fonte === 'ig') nome = 'Instagram (perfil)'
  else if (fonte === 'whatsapp') nome = `WhatsApp${meio ? ` · ${MEIOS_WHATSAPP[meio] ?? meio}` : ''}`
  else if (fonte === 'email') nome = `E-mail${meio ? ` · ${meio.replace(/_/g, ' ')}` : ''}`
  else if (fonte === 'google') nome = meio === 'cpc' ? 'Anúncio Google' : 'Google'
  return [nome, conteudo].filter(Boolean).join(' · ')
}
function origemDaRota(rota: string | null | undefined) {
  const qs = String(rota ?? '').split('?')[1]
  if (!qs) return null
  const p = new URLSearchParams(qs)
  return rotuloOrigem({ fonte: p.get('utm_source'), meio: p.get('utm_medium'), conteudo: p.get('utm_content'), fbclid: !!p.get('fbclid') })
}
/** De onde a pessoa daquele log veio: a campanha do próprio log, a 1ª visita com campanha, ou a do cadastro.
 *  null = não se sabe (app Android e plataforma sem visita com campanha antes): a tela não mostra nada. */
function origemDe(e: EventoUso): string | null {
  const c = e.origem_conta
  return origemDaRota(e.rota) ?? origemDaRota(e.origem_rota)
    ?? (c ? rotuloOrigem({ fonte: c.utm_source, meio: c.utm_medium, conteudo: c.utm_content, fbclid: !!c.fbclid }) : null)
}

/** Categoria de cada evento: a etiqueta da coluna "Categoria" nos logs. */
type Categoria = 'Venda' | 'Checkout' | 'Conta' | 'Página de vendas' | 'Plataforma' | 'App' | 'Contato' | 'Erro'
const ERROS = new Set(['placa_erro', 'login_erro', 'cadastro_erro'])
function categoria(e: EventoUso): Categoria {
  if (ERROS.has(e.tipo)) return 'Erro'
  if (['compra', 'compra_play', 'compra_apple'].includes(e.tipo)) return 'Venda'
  if (['clicou_assinar', 'pegar_oferta', 'viu_planos', 'carro_para_planos'].includes(e.tipo)) return 'Checkout'
  if (['cadastro', 'login', 'esqueci_senha', 'senha_redefinida', 'senha_criada_compra'].includes(e.tipo)) return 'Conta'
  if (['rolou', 'saiu_landing', 'viu_secao', 'tour_passo', 'busca_landing', 'escolheu_carro'].includes(e.tipo)) return 'Página de vendas'
  if (e.tipo === 'pagina' && /^\/(\?|$)/.test(e.rota ?? '')) return 'Página de vendas'
  if (['app_aberto', 'push_diag', 'navegador_interno'].includes(e.tipo)) return 'App'
  if (e.tipo === 'whatsapp') return 'Contato'
  return 'Plataforma'
}
const COR_CATEGORIA: Record<Categoria, string> = {
  Venda: 'bg-ok/12 text-ok ring-ok/25', Checkout: 'bg-warn/12 text-warn ring-warn/25', Conta: 'bg-trace/10 text-trace-hi ring-trace/20',
  'Página de vendas': 'bg-violet-500/10 text-violet-700 ring-violet-500/20 [.tema-escuro_&]:text-violet-300', Plataforma: 'bg-ink-1/[0.05] text-ink-3 ring-ink-1/10',
  App: 'bg-sky-500/10 text-sky-700 ring-sky-500/20 [.tema-escuro_&]:text-sky-300', Contato: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 [.tema-escuro_&]:text-emerald-300', Erro: 'bg-fault/10 text-fault ring-fault/20',
}

// "Ocultar dados pessoais" (para gravar a tela): nome vira iniciais, e-mail e placa ficam mascarados.
const mascaraNome = (n: string | null) => (n ?? '').trim().split(/\s+/).filter(Boolean).map((p) => p[0].toUpperCase() + '•'.repeat(Math.min(5, Math.max(2, p.length - 1)))).join(' ')
const mascaraEmail = (e: string | null) => { const [u, d] = String(e ?? '').split('@'); return d ? `${u.slice(0, 1)}•••••@${d}` : '' }
const mascaraTexto = (t: string) => t
  .replace(/\b([A-Z]{3})-?[0-9][0-9A-Z][0-9]{2}\b/g, '$1-••••')
  .replace(/([\w.+-])[\w.+-]*@([\w-]+\.[\w.]+)/g, '$1•••••@$2')
// código do link de senha nunca aparece (registros antigos guardaram a rota com ?t=…)
const semToken = (t: string) => t.replace(/([?&]t=)[^&\s]+/g, '$1(oculto)')

const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(',', '')
const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
function quandoFoi(iso: string, agora: number) {
  const s = Math.max(0, Math.round((agora - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'agora'
  if (s < 3600) return `há ${Math.floor(s / 60)} min`
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}
function nomeDia(iso: string, agora: number) {
  const d = new Date(iso); const hoje = new Date(agora); const ontem = new Date(agora - 86_400_000)
  const igual = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  const data = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })
  return igual(d, hoje) ? `Hoje · ${data}` : igual(d, ontem) ? `Ontem · ${data}` : data.replace(/^\w/, (l) => l.toUpperCase())
}
const vezes = (n: number) => (n === 1 ? '1 vez' : `${n.toLocaleString('pt-BR')} vezes`)
const pessoas = (n: number) => (n === 1 ? '1 pessoa' : `${n.toLocaleString('pt-BR')} pessoas`)
const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function lerOcultar() { try { return localStorage.getItem('deepcar.admin.ocultar') !== '0' } catch { return true } }

/** O que cada pessoa faz no site e nos apps (eventos_uso), mais as vendas. Atualiza sozinho a cada 30 s. */
function AbaLogs() {
  const [dias, setDias] = useState(7)
  const [tipo, setTipo] = useState('')
  const [q, setQ] = useState('')
  const [usuario, setUsuario] = useState<{ id: string; nome: string } | null>(null)
  const [aparelho, setAparelho] = useState('')
  const [dados, setDados] = useState<{ eventos: EventoUso[]; resumo: ResumoLogs } | null>(null)
  const [erro, setErro] = useState('')
  const [ocultar, setOcultar] = useState(lerOcultar)
  const [agora, setAgora] = useState(() => Date.now())
  const [atualizado, setAtualizado] = useState<number | null>(null)
  const [mostrar, setMostrar] = useState(60)
  const [copiado, setCopiado] = useState('')
  const [aberto, setAberto] = useState<number | null>(null)
  const [cru, setCru] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const p = new URLSearchParams({ acao: 'logs', dias: String(dias), tipo, q, aparelho })
      if (usuario) p.set('usuario', usuario.id)
      setDados((await api(`/api/admin/usuarios?${p}`)) as { eventos: EventoUso[]; resumo: ResumoLogs }); setErro('')
      setAtualizado(Date.now())
    } catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao carregar.') }
  }, [dias, tipo, q, usuario, aparelho])
  useEffect(() => { const t = setTimeout(() => void carregar(), 300); return () => clearTimeout(t) }, [carregar])
  useEffect(() => { const t = setInterval(() => void carregar(), 30_000); return () => clearInterval(t) }, [carregar])
  useEffect(() => { const t = setInterval(() => setAgora(Date.now()), 5_000); return () => clearInterval(t) }, [])

  function alternarOcultar() {
    setOcultar((v) => { try { localStorage.setItem('deepcar.admin.ocultar', v ? '0' : '1') } catch { /* modo anônimo */ } return !v })
  }
  const nome = (n: string | null) => (ocultar ? mascaraNome(n) : n ?? '')
  const texto = (v: string) => (ocultar ? mascaraTexto(semToken(v)) : semToken(v))
  // visitante sem conta: o id do aparelho (visitanteId() do navegador) separa uma pessoa da outra
  const quem = (e: EventoUso) => (e.usuario_id ? nome(e.nome) || 'Conta sem nome' : `Visitante ${e.visitante ? e.visitante.slice(0, 8) : 'sem id'}`)
  const frase = (e: EventoUso) => texto(fraseEvento(e))

  /** Os dados técnicos do log, em pares campo → valor (detalhe aberto e cópia). */
  function camposLog(e: EventoUso): [string, string][] {
    const c: [string, string][] = [['Data e hora', dataHora(e.em)], ['Categoria', categoria(e)], ['Tipo', e.tipo], ['Nº do log', String(e.id)]]
    if (e.usuario_id) {
      c.push(['Pessoa', nome(e.nome) || '—'])
      if (e.email) c.push(['E-mail', ocultar ? mascaraEmail(e.email) : e.email])
      if (e.plano) c.push(['Plano atual', e.plano === 'free' ? 'Teste grátis' : rotuloPlano(e.plano)])
      c.push(['ID da conta', ocultar ? `${e.usuario_id.slice(0, 8)}…` : e.usuario_id])
    } else c.push(['Pessoa', 'Visitante sem conta'])
    if (e.visitante) c.push(['ID do visitante', e.visitante])
    if (e.aparelho) c.push(['Aparelho', e.aparelho])
    const origem = origemDe(e)
    if (origem) c.push(['Origem', origem])
    if (e.rota) c.push(['Endereço', texto(e.rota.split('?')[0])])
    for (const [k, v] of Object.entries(e.detalhe ?? {})) {
      if (v == null || v === '') continue
      c.push([`detalhe.${k}`, texto(typeof v === 'object' ? JSON.stringify(v) : String(v))])
    }
    return c
  }
  /** O registro como está no banco (com nome, e-mail e placa mascarados se "Dados pessoais ocultos" estiver ligado). */
  const linhaCrua = (e: EventoUso) => texto(JSON.stringify({
    id: e.id, em: e.em, tipo: e.tipo, usuario_id: e.usuario_id, nome: e.nome && ocultar ? mascaraNome(e.nome) : e.nome,
    email: e.email, plano: e.plano, visitante: e.visitante, aparelho: e.aparelho, rota: e.rota, detalhe: e.detalhe,
  }))
  const linhaLog = (e: EventoUso) => [dataHora(e.em), categoria(e), quem(e), e.aparelho ?? '', frase(e), ...camposLog(e).slice(4).map(([k, v]) => `${k}: ${v}`)].join(' | ')
  async function copiarTexto(t: string, aviso: string) {
    try { await navigator.clipboard.writeText(t) } catch {
      const area = document.createElement('textarea'); area.value = t; document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove()
    }
    setCopiado(aviso); setTimeout(() => setCopiado(''), 2500)
  }
  async function copiarLogs(janela: '1h' | '24h' | 'hoje' | 'tudo') {
    const inicioHoje = new Date(agora); inicioHoje.setHours(0, 0, 0, 0)
    const desde = janela === '1h' ? agora - 3_600_000 : janela === '24h' ? agora - 86_400_000 : janela === 'hoje' ? inicioHoje.getTime() : 0
    const lista = (dados?.eventos ?? []).filter((e) => new Date(e.em).getTime() >= desde)
    const nomeJanela = { '1h': 'última hora', '24h': 'últimas 24 h', hoje: 'hoje', tudo: dias === 1 ? 'hoje' : `últimos ${dias} dias` }[janela]
    if (cru) { await copiarTexto(lista.map(linhaCrua).join('\n'), `${lista.length} logs crus copiados`); return }
    const cab = `Deepcar · logs (${nomeJanela}) · ${lista.length} eventos · copiado em ${dataHora(new Date(agora).toISOString())}\nformato: quando | categoria | quem | aparelho | o que fez | dados técnicos`
    await copiarTexto([cab, ...lista.map(linhaLog)].join('\n'), `${lista.length} logs copiados`)
  }

  const r = dados?.resumo
  const tipoN = (k: string) => r?.porTipo.find((t) => t.tipo === k)
  const visitas = (r?.secoes ?? []).reduce((a, l) => a + l.visitantes, 0) || (r?.leitura ?? []).reduce((a, l) => a + l.visitantes, 0)
  const funil = r?.secoes?.length
    ? ([['Abriram a página de vendas', 'visitantes'], ['Viram o tour "Como funciona"', 'tour'], ['Chegaram na busca do carro', 'busca'], ['Chegaram nos planos e preços', 'planos'], ['Chegaram no FAQ', 'faq'], ['Tocaram em "Pegar oferta"', 'oferta'], ['Clicaram para assinar', 'assinar']] as const)
        .map(([rotulo, k]) => ({ rotulo, n: r.secoes!.reduce((a, l) => a + l[k], 0) }))
    : []
  const porAparelho = (r?.secoes ?? []).map((l) => ({ ...l, ...(r?.leitura?.find((x) => x.so === l.so) ?? {}) }))
  const pct = (n: number, de: number) => (de ? Math.round((100 * n) / de) : 0)
  // visitas e vendas juntas por origem (mesmo rótulo); sem campanha vira "Direto"
  const origens = (() => {
    const m = new Map<string, { rotulo: string; visitantes: number; assinar: number; vendas: number; total: number }>()
    const linha = (rotulo: string) => m.get(rotulo) ?? m.set(rotulo, { rotulo, visitantes: 0, assinar: 0, vendas: 0, total: 0 }).get(rotulo)!
    for (const o of r?.origens ?? []) { const l = linha(rotuloOrigem(o) ?? 'Direto (sem campanha)'); l.visitantes += o.visitantes; l.assinar += o.assinar }
    for (const v of r?.vendasOrigem ?? []) { const l = linha(rotuloOrigem(v) ?? 'Direto (sem campanha)'); l.vendas += v.n; l.total += v.total }
    return [...m.values()].sort((a, b) => b.vendas - a.vendas || b.visitantes - a.visitantes)
  })()
  const periodo = dias === 1 ? 'hoje' : `nos últimos ${dias} dias`

  const KPIS: [string, string, string][] = [
    ['Visitantes da página', (visitas).toLocaleString('pt-BR'), 'aparelhos diferentes'],
    ['Contas criadas', String(tipoN('cadastro')?.pessoas ?? 0), 'cadastros novos'],
    ['Foram ao pagamento', String(tipoN('clicou_assinar')?.pessoas ?? 0), `pessoas · ${vezes(tipoN('clicou_assinar')?.n ?? 0)}`],
    ['Vendas', String(r?.vendas?.n ?? 0), reais(r?.vendas?.total ?? 0)],
    ['Placas consultadas', String(tipoN('placa')?.n ?? 0), `por ${pessoas(tipoN('placa')?.pessoas ?? 0)}`],
    ['Esquemas abertos', String(tipoN('esquema')?.n ?? 0), `por ${pessoas(tipoN('esquema')?.pessoas ?? 0)}`],
  ]
  const cartao = 'rounded-xl border seam bg-bench-1 shadow-[0_1px_2px_rgba(15,23,42,0.04)]'
  const titulo = 'text-[14px] font-semibold text-ink-1'
  const explica = 'mt-0.5 text-[12.5px] leading-snug text-ink-4'

  const eventos = (dados?.eventos ?? []).slice(0, mostrar)
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-ink-1">Atividade</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[13.5px] text-ink-3">
            <span>Uso do site e dos apps, e as vendas.</span>
            <span className="inline-flex items-center gap-1.5 text-ink-4"><span className="h-1.5 w-1.5 rounded-full bg-ok" />Atualização automática a cada 30 s{atualizado && ` · última ${hora(new Date(atualizado).toISOString())}`}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={alternarOcultar} aria-pressed={ocultar} className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[13px] ${ocultar ? 'border-trace/40 bg-trace/10 text-trace-hi' : 'seam bg-bench-1 text-ink-3 hover:text-ink-1'}`}>
            {ocultar ? <EyeOff size={14} /> : <Eye size={14} />} {ocultar ? 'Dados pessoais ocultos' : 'Ocultar dados pessoais'}
          </button>
          <button type="button" onClick={() => void carregar()} className="inline-flex h-9 items-center gap-2 rounded-lg border seam bg-bench-1 px-3 text-[13px] text-ink-2 hover:text-ink-1"><RefreshCw size={14} /> Atualizar</button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border seam bg-bench-1 p-0.5">
          {[1, 7, 30, 90].map((d) => (
            <button key={d} type="button" onClick={() => setDias(d)} className={`rounded-md px-3 py-1.5 text-[13px] ${dias === d ? 'bg-ink-1 font-medium text-bench-1' : 'text-ink-3 hover:text-ink-1'}`}>
              {d === 1 ? 'Hoje' : `${d} dias`}
            </button>
          ))}
        </div>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="field h-9 w-auto bg-bench-1 py-0 text-[13px]">
          <option value="">Todos os eventos</option>
          {Object.entries(NOMES_EVENTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={aparelho} onChange={(e) => setAparelho(e.target.value)} className="field h-9 w-auto bg-bench-1 py-0 text-[13px]">
          <option value="">Site e apps</option>
          <option value="site">Só o site</option>
          <option value="android">Só o app Android</option>
          <option value="ios">Só o app iPhone</option>
        </select>
        <label className="relative w-full sm:ml-auto sm:w-auto">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
          <input className="field h-9 w-full bg-bench-1 pl-8 text-[13px] sm:w-64" placeholder="Procurar nome, e-mail ou id do visitante" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        {usuario && (
          <button type="button" onClick={() => setUsuario(null)} className="inline-flex items-center gap-1.5 rounded-lg border border-trace/40 bg-trace/10 px-3 py-1.5 text-[13px] text-trace-hi">
            Só {nome(usuario.nome)} <X size={13} />
          </button>
        )}
      </div>
      {erro && <p role="alert" className="mt-4 rounded-lg border border-fault/30 bg-fault/10 px-4 py-3 text-sm text-fault">{erro}</p>}

      {r && !usuario && (
        <>
          <div className={`${cartao} mt-5 grid grid-cols-2 divide-ink-1/[0.07] sm:grid-cols-3 lg:grid-cols-6 lg:divide-x`}>
            {KPIS.map(([t, v, sub]) => (
              <div key={t} className="border-b border-ink-1/[0.07] px-5 py-4 lg:border-b-0">
                <p className="text-[12.5px] text-ink-3">{t}</p>
                <p className="mt-1.5 text-[26px] font-semibold leading-none tracking-tight tabular-nums text-ink-1">{v}</p>
                <p className="mt-1.5 text-[12px] text-ink-4">{sub}</p>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-[12px] text-ink-4">Números {periodo}.</p>

          <div className="mt-3 grid gap-3 lg:grid-cols-5">
            {!!funil.length && (
              <section className={`${cartao} p-5 lg:col-span-3`}>
                <h2 className={titulo}>Até onde as pessoas chegam na página de vendas</h2>
                <p className={explica}>Cada pessoa conta uma vez. A porcentagem é sobre quem abriu a página.</p>
                <table className="mt-3 w-full text-[13px]">
                  <tbody>
                    {funil.map((f, i) => (
                      <tr key={f.rotulo} className="border-t border-ink-1/[0.06] first:border-0">
                        <td className="py-2 pr-3 text-ink-2">{f.rotulo}</td>
                        <td className="w-[38%] py-2"><span className="block h-1.5 overflow-hidden rounded-full bg-ink-1/[0.06]"><span className="block h-full rounded-full bg-trace" style={{ width: `${funil[0].n ? Math.max(1.5, (100 * f.n) / funil[0].n) : 0}%` }} /></span></td>
                        <td className="py-2 pl-3 text-right tabular-nums text-ink-1">{pessoas(f.n)}</td>
                        <td className="w-12 py-2 text-right tabular-nums text-ink-4">{i ? `${pct(f.n, funil[0].n)}%` : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
            <section className={`${cartao} p-5 ${funil.length ? 'lg:col-span-2' : 'lg:col-span-5'}`}>
              <h2 className={titulo}>O que mais aconteceu</h2>
              <p className={explica}>Vezes que aconteceu e pessoas diferentes.</p>
              <table className="mt-3 w-full text-[13px]">
                <tbody>
                  {r.porTipo.slice(0, 10).map((t) => (
                    <tr key={t.tipo} className="border-t border-ink-1/[0.06] first:border-0">
                      <td className="py-2 pr-2 text-ink-2">{NOMES_EVENTO[t.tipo] ?? t.tipo}</td>
                      <td className="py-2 text-right tabular-nums text-ink-1">{vezes(t.n)}</td>
                      <td className="py-2 pl-3 text-right tabular-nums text-ink-4">{pessoas(t.pessoas)}</td>
                    </tr>
                  ))}
                  {!r.porTipo.length && <tr><td className="py-2 text-ink-4">Nada registrado ainda.</td></tr>}
                </tbody>
              </table>
            </section>
          </div>

          {!!origens.length && (
            <section className={`${cartao} mt-3 overflow-x-auto p-5`}>
              <h2 className={titulo}>De onde vêm as visitas</h2>
              <p className={explica}>Pessoas que abriram a página de vendas, pela campanha do link da 1ª visita no período; e as vendas pela campanha do link do pagamento.</p>
              <table className="mt-3 w-full min-w-[640px] text-left text-[13px]">
                <thead className="text-[12px] text-ink-4"><tr className="border-b border-ink-1/[0.08]">
                  {['Origem', 'Visitas', 'Clicaram para assinar', 'Vendas'].map((h, i) => <th key={h} className={`pb-2 font-medium ${i ? 'text-right' : ''}`}>{h}</th>)}
                </tr></thead>
                <tbody className="tabular-nums">
                  {origens.map((o) => (
                    <tr key={o.rotulo} className="border-b border-ink-1/[0.05] last:border-0">
                      <td className="py-2.5 pr-3 text-ink-1">{o.rotulo}</td>
                      <td className="text-right text-ink-1">{pessoas(o.visitantes)}</td>
                      <td className="text-right text-ink-2">{o.visitantes ? <>{pessoas(o.assinar)} <span className="text-ink-4">({pct(o.assinar, o.visitantes)}%)</span></> : '—'}</td>
                      <td className={`text-right ${o.vendas ? 'font-medium text-ok' : 'text-ink-4'}`}>{o.vendas ? `${o.vendas} · ${reais(o.total)}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <section className={`${cartao} p-5`}>
              <h2 className={titulo}>Quem foi ao pagamento</h2>
              <p className={explica}>Pessoas com conta que clicaram em assinar.</p>
              <ul className="mt-3 space-y-2 text-[13px]">
                {r.assinar.slice(0, 8).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3">
                    <button type="button" onClick={() => setUsuario({ id: a.id, nome: a.nome })} className="truncate text-left text-ink-1 hover:text-trace-hi">{nome(a.nome)}</button>
                    <span className={`flex-none text-[12px] ${a.plano === 'free' ? 'text-warn' : 'text-ok'}`}>{a.plano === 'free' ? 'não assinou' : `assinou ${rotuloPlano(a.plano)}`} · {vezes(a.cliques)}</span>
                  </li>
                ))}
                {!r.assinar.length && <li className="text-ink-4">Ninguém com conta no período.</li>}
              </ul>
            </section>
            <section className={`${cartao} p-5`}>
              <h2 className={titulo}>Buscas sem resultado</h2>
              <p className={explica}>Procuraram e não acharam esquema.</p>
              <ul className="mt-3 space-y-1.5 text-[13px]">
                {r.semResultado.slice(0, 8).map((b) => <li key={b.termo} className="flex justify-between gap-3"><span className="truncate text-ink-2">"{b.termo}"</span><span className="flex-none tabular-nums text-ink-4">{vezes(b.n)}</span></li>)}
                {!r.semResultado.length && <li className="text-ink-4">Nenhuma.</li>}
              </ul>
            </section>
            <section className={`${cartao} p-5`}>
              <h2 className={titulo}>Erros na consulta de placa</h2>
              <p className={explica}>Motivo e quantas vezes.</p>
              <ul className="mt-3 space-y-1.5 text-[13px]">
                {r.placasErro.slice(0, 8).map((p) => <li key={p.erro} className="flex justify-between gap-3"><span className="text-ink-2">{p.erro}</span><span className="flex-none tabular-nums text-ink-4">{vezes(p.n)}</span></li>)}
                {!r.placasErro.length && <li className="text-ink-4">Nenhum.</li>}
              </ul>
            </section>
            <section className={`${cartao} p-5`}>
              <h2 className={titulo}>Navegador do Instagram/Facebook</h2>
              <p className={explica}>O que fizeram no aviso para sair dele.</p>
              <ul className="mt-3 space-y-1.5 text-[13px]">
                {r.navegador.slice(0, 8).map((n) => <li key={`${n.so}${n.acao}`} className="flex justify-between gap-3"><span className="text-ink-2">{n.so === 'ios' ? 'iPhone' : n.so === 'android' ? 'Android' : n.so}: {(ACOES_NAVEGADOR[n.acao] ?? n.acao).replace(/ no aviso do navegador do$| do$/, '').replace(/^\w/, (l) => l.toLowerCase())}</span><span className="flex-none tabular-nums text-ink-4">{vezes(n.n)}</span></li>)}
                {!r.navegador.length && <li className="text-ink-4">Nada no período.</li>}
              </ul>
            </section>
          </div>

          {!!porAparelho.length && (
            <section className={`${cartao} mt-3 overflow-x-auto p-5`}>
              <h2 className={titulo}>Página de vendas por aparelho</h2>
              <p className={explica}>Pessoas daquele aparelho que chegaram em cada parte; entre parênteses, a porcentagem sobre quem abriu a página nesse aparelho.</p>
              <table className="mt-3 w-full min-w-[820px] text-left text-[13px]">
                <thead className="text-[12px] text-ink-4"><tr className="border-b border-ink-1/[0.08]">
                  {['Aparelho', 'Abriram a página', 'Tempo típico', 'Viram o tour', 'Chegaram na busca', 'Chegaram nos planos', 'Pegar oferta', 'Clicaram para assinar'].map((h) => <th key={h} className="pb-2 pr-3 font-medium">{h}</th>)}
                </tr></thead>
                <tbody className="tabular-nums">
                  {porAparelho.map((l) => (
                    <tr key={l.so} className="border-b border-ink-1/[0.05] last:border-0">
                      <td className="py-2.5 pr-3 font-medium text-ink-1">{l.so}</td>
                      <td className="pr-3 text-ink-1">{pessoas(l.visitantes)}</td>
                      <td className="pr-3 text-ink-2">{'segundos_mediana' in l && l.segundos_mediana != null ? `${l.segundos_mediana} s` : '—'}</td>
                      {([l.tour, l.busca, l.planos, l.oferta, l.assinar]).map((n, i) => (
                        <td key={i} className="pr-3 text-ink-2">{pessoas(n)} <span className="text-ink-4">({pct(n, l.visitantes)}%)</span></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}

      <section className={`${cartao} mt-3 overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b seam px-5 py-3.5">
          <div>
            <h2 className={titulo}>Logs ao vivo</h2>
            <p className={explica}>{dados?.eventos.length ?? 0} eventos carregados, do mais recente ao mais antigo. {cru ? 'Cada linha é o registro do banco, em JSON.' : 'Clique numa linha para ver os dados técnicos.'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="mr-2 flex rounded-md border seam bg-bench-1 p-0.5 text-[12px]">
              {([[false, 'Formatado'], [true, 'Cru']] as const).map(([v, rr]) => (
                <button key={rr} type="button" onClick={() => setCru(v)} aria-pressed={cru === v} className={`rounded px-2.5 py-0.5 ${cru === v ? 'bg-ink-1 font-medium text-bench-1' : 'text-ink-3 hover:text-ink-1'}`}>{rr}</button>
              ))}
            </div>
            <span className="mr-0.5 text-[12px] text-ink-4">Copiar:</span>
            {([['1h', 'Última hora'], ['24h', '24 h'], ['hoje', 'Hoje'], ['tudo', 'Tudo']] as const).map(([k, rr]) => (
              <button key={k} type="button" onClick={() => void copiarLogs(k)} className="rounded-md border seam bg-bench-1 px-2.5 py-1 text-[12px] text-ink-2 hover:border-trace/40 hover:text-trace-hi">{rr}</button>
            ))}
            {copiado && <span role="status" className="ml-1 text-[12px] text-ok">{copiado}</span>}
          </div>
        </div>
        {cru ? (
          <div className="max-h-[70vh] overflow-auto bg-[#0f141b] px-5 py-3 font-[family-name:var(--font-code)] text-[12px] leading-relaxed text-[#d6dde8]">
            {eventos.map((e) => <div key={e.id} className="whitespace-pre-wrap break-all border-b border-white/[0.06] py-1.5">{linhaCrua(e)}</div>)}
            {dados && !dados.eventos.length && <div className="py-6 text-center text-[#8793a4]">Nenhum evento com esses filtros.</div>}
          </div>
        ) : (<>
        <div className="hidden grid-cols-[76px_128px_minmax(0,1fr)_220px_140px] gap-4 border-b seam bg-bench-2 px-5 py-2 text-[11.5px] font-medium uppercase tracking-wide text-ink-4 md:grid">
          <span>Hora</span><span>Categoria</span><span>Evento</span><span>Pessoa · origem</span><span>Aparelho</span>
        </div>
        <ul>
          {eventos.map((e, i) => {
            const cat = categoria(e)
            const dia = nomeDia(e.em, agora)
            const novoDia = i === 0 || nomeDia(eventos[i - 1].em, agora) !== dia
            return (
              <li key={e.id}>
                {novoDia && <div className="border-b seam bg-bench-2/70 px-5 py-1.5 text-[12px] font-medium text-ink-3">{dia}</div>}
                <button type="button" onClick={() => setAberto(aberto === e.id ? null : e.id)} aria-expanded={aberto === e.id}
                  className={`grid w-full grid-cols-[64px_minmax(0,1fr)] gap-x-3 gap-y-1 border-b border-ink-1/[0.05] px-5 py-2.5 text-left text-[13px] hover:bg-ink-1/[0.025] md:grid-cols-[76px_128px_minmax(0,1fr)_220px_140px] md:gap-4 ${cat === 'Venda' ? 'bg-ok/[0.06]' : ''} ${aberto === e.id ? 'bg-ink-1/[0.03]' : ''}`}>
                  <span className="code pt-px text-[12px] text-ink-3" title={quandoFoi(e.em, agora)}>{hora(e.em)}</span>
                  <span className="md:order-none"><span className={`inline-flex rounded px-1.5 py-0.5 text-[11.5px] font-medium ring-1 ring-inset ${COR_CATEGORIA[cat]}`}>{cat}</span></span>
                  <span className={`col-span-2 md:col-span-1 ${cat === 'Venda' ? 'font-semibold text-ink-1' : 'text-ink-1'}`}>{frase(e)}</span>
                  <span className="col-span-2 min-w-0 text-ink-3 md:col-span-1">
                    <span className="block truncate">{e.usuario_id ? <span className="text-ink-2">{quem(e)}</span> : <span className="text-ink-4">Visitante <span className="code text-ink-3">{e.visitante ? e.visitante.slice(0, 8) : 'sem id'}</span></span>}</span>
                    {origemDe(e) && <span className="block truncate text-[12px] text-ink-4" title={origemDe(e)!}>via {origemDe(e)}</span>}
                  </span>
                  <span className="col-span-2 truncate text-[12.5px] text-ink-4 md:col-span-1">{e.aparelho}</span>
                </button>
                {aberto === e.id && (
                  <div className="border-b seam bg-bench-2/60 px-5 py-3.5">
                    <dl className="grid gap-x-6 gap-y-1.5 text-[12.5px] sm:grid-cols-2 lg:grid-cols-3">
                      {camposLog(e).map(([k, v]) => (
                        <div key={k} className="flex min-w-0 gap-2"><dt className="w-28 flex-none text-ink-4">{k}</dt><dd className="code min-w-0 break-all text-ink-1">{v}</dd></div>
                      ))}
                    </dl>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => void copiarTexto(linhaLog(e), 'Log copiado')} className="inline-flex items-center gap-1.5 rounded-md border seam bg-bench-1 px-2.5 py-1 text-[12px] text-ink-2 hover:text-trace-hi"><Copy size={12} /> Copiar este log</button>
                      {!e.usuario_id && e.visitante && <button type="button" onClick={() => { setQ(e.visitante!); setAberto(null) }} className="inline-flex items-center gap-1.5 rounded-md border seam bg-bench-1 px-2.5 py-1 text-[12px] text-ink-2 hover:text-trace-hi"><Search size={12} /> Ver tudo deste visitante</button>}
                      {e.usuario_id && <button type="button" onClick={() => setUsuario({ id: e.usuario_id!, nome: e.nome ?? '' })} className="inline-flex items-center gap-1.5 rounded-md border seam bg-bench-1 px-2.5 py-1 text-[12px] text-ink-2 hover:text-trace-hi"><Search size={12} /> Ver tudo desta pessoa</button>}
                    </div>
                  </div>
                )}
              </li>
            )
          })}
          {dados && !dados.eventos.length && <li className="px-5 py-10 text-center text-ink-4">Nenhum evento com esses filtros.</li>}
          {!dados && !erro && Array.from({ length: 6 }, (_, i) => <li key={i} className="border-b border-ink-1/[0.05] px-5 py-3"><div className="h-4 w-2/3 rounded bg-ink-1/[0.06]" /></li>)}
        </ul>
        </>)}
        {(dados?.eventos.length ?? 0) > mostrar && (
          <button type="button" onClick={() => setMostrar((n) => n + 100)} className="w-full py-3 text-[13px] text-trace-hi hover:bg-ink-1/[0.02]">Mostrar mais</button>
        )}
      </section>
      <p className="mt-2 text-[12px] text-ink-4">A tela carrega os 400 eventos mais recentes do período e dos filtros; os botões de copiar usam esses. O registro guarda 120 dias. Com "Dados pessoais ocultos" ligado, a cópia também sai mascarada.</p>
    </>
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
        <input className="field code" placeholder="FALCON_TOKEN" value={d.chave}
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
