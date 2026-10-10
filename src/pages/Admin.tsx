// Tela do administrador: usuários (plano, acesso, senha) e o cofre de chaves de API.
// Toda a autorização é do servidor (api/admin/*): aqui a checagem só evita mostrar a tela.
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Activity, ArrowDown, BadgeDollarSign, Bell, Car, Check, Copy, CreditCard, Eye, EyeOff, FileText, KeyRound, Layers, Link2, Loader2, LogIn, LogOut, MessageCircle, MonitorSmartphone, Plus, RefreshCw, Search, Smartphone, Timer, Trash2, TriangleAlert, UserPlus, Users, Wand2, X, Zap } from 'lucide-react'
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

  if (!session) return conferindo ? <div aria-busy="true" className="min-h-screen" /> : <Navigate to="/login" replace />
  if (session.papel !== 'admin') return <Navigate to="/app" replace />

  return (
    <div className="schematic-grid min-h-screen">
      <header className="flex min-h-[68px] flex-wrap items-center justify-between gap-3 border-b seam px-4 py-3 sm:px-8">
        <div className="flex items-center gap-4">
          <Link to="/app"><img src="/brand/logo-h-light.png" alt="Deepcar" className="w-32" draggable={false} /></Link>
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
  visitante: string | null; usuario_id: string | null; nome: string | null; email: string | null; plano: Plano | null }
type ResumoLogs = {
  porTipo: { tipo: string; n: number; pessoas: number }[]
  semResultado: { termo: string; n: number }[]
  placasErro: { erro: string; n: number }[]
  assinar: { id: string; nome: string; email: string; plano: Plano; cliques: number; ultimo: string }[]
  navegador: { so: string; acao: string; n: number }[]
  leitura?: { so: string; visitantes: number; rolou_metade: number; segundos_mediana: number | null; abriu_cadastro: number; cadastrou: number }[]
  secoes?: { so: string; visitantes: number; tour: number; busca: number; planos: number; faq: number; oferta: number; assinar: number }[]
}

const NOMES_EVENTO: Record<string, string> = {
  whatsapp: 'Chamou no WhatsApp', viu_secao: 'Viu seção da página de vendas', tour_passo: 'Passo do tour (página de vendas)', busca_landing: 'Buscou carro na página de vendas', escolheu_carro: 'Escolheu carro na página de vendas', carro_para_planos: 'Foi aos planos pelo carro', pegar_oferta: 'Clicou em Pegar oferta', compra_apple: 'Assinou pela App Store', push_diag: 'Notificações (diagnóstico)', rolou: 'Rolou a página de vendas', saiu_landing: 'Saiu da página de vendas', app_aberto: 'Abriu o app Android', compra_play: 'Assinou pela Google Play',
  pagina: 'Telas abertas (site e app)', busca: 'Busca', placa: 'Placa encontrada', placa_erro: 'Placa com erro', esquema: 'Esquema',
  viu_planos: 'Viu os planos', clicou_assinar: 'Clicou em assinar', cadastro: 'Cadastrou', cadastro_erro: 'Erro no cadastro',
  login: 'Entrou', login_erro: 'Erro ao entrar', compartilhou: 'Compartilhou', navegador_interno: 'Navegador do Instagram/Facebook',
}

/** Uma linha legível do detalhe de cada tipo de evento. */
function resumoEvento(e: EventoUso) {
  const d = (e.detalhe ?? {}) as Record<string, string | number | null>
  switch (e.tipo) {
    case 'pagina': return e.rota ?? ''
    case 'busca': return `"${d.termo}" · ${d.resultados} resultado(s)`
    case 'placa': return `${d.placa} · ${[d.marca, d.modelo, d.ano].filter(Boolean).join(' ')}`
    case 'placa_erro': return `${d.placa} · ${d.erro}`
    case 'esquema': return `${String(d.id ?? '').split('/').slice(1).join(' / ')} · ${d.estado}`
    case 'viu_planos': return String(d.onde ?? '')
    case 'clicou_assinar': return `${d.plano} ${d.ciclo}`
    case 'navegador_interno': return `${d.app} · ${d.so} · ${d.acao}`
    case 'rolou': return `${d.pct}% da página`
    case 'saiu_landing': return `${d.segundos} s · rolou ${d.rolou}%`
    default: return d.erro ? String(d.erro) : e.rota ?? ''
  }
}

/** Ícone e cor de cada tipo de evento no feed. */
const ICONE_EVENTO: Record<string, [typeof Activity, string]> = {
  pagina: [FileText, 'text-ink-3 bg-white/[0.06]'], busca: [Search, 'text-trace-hi bg-trace/15'], busca_landing: [Search, 'text-trace-hi bg-trace/15'],
  placa: [Car, 'text-ok bg-ok/15'], placa_erro: [TriangleAlert, 'text-fault bg-fault/15'], esquema: [Zap, 'text-trace-hi bg-trace/15'],
  viu_planos: [Eye, 'text-warn bg-warn/15'], viu_secao: [Eye, 'text-ink-3 bg-white/[0.06]'], clicou_assinar: [CreditCard, 'text-ok bg-ok/15'],
  pegar_oferta: [CreditCard, 'text-warn bg-warn/15'], cadastro: [UserPlus, 'text-ok bg-ok/15'], cadastro_erro: [TriangleAlert, 'text-fault bg-fault/15'],
  login: [LogIn, 'text-trace-hi bg-trace/15'], login_erro: [TriangleAlert, 'text-fault bg-fault/15'], compra_play: [BadgeDollarSign, 'text-ok bg-ok/15'],
  compra_apple: [BadgeDollarSign, 'text-ok bg-ok/15'], whatsapp: [MessageCircle, 'text-whatsapp bg-whatsapp/15'], app_aberto: [Smartphone, 'text-trace-hi bg-trace/15'],
  rolou: [ArrowDown, 'text-ink-3 bg-white/[0.06]'], saiu_landing: [LogOut, 'text-ink-3 bg-white/[0.06]'], tour_passo: [Layers, 'text-ink-3 bg-white/[0.06]'],
  escolheu_carro: [Car, 'text-trace-hi bg-trace/15'], carro_para_planos: [CreditCard, 'text-warn bg-warn/15'], compartilhou: [Link2, 'text-trace-hi bg-trace/15'],
}

// "Ocultar dados pessoais" (09/10/2026, para gravar a tela): nome vira iniciais, e-mail e placa ficam mascarados.
const mascaraNome = (n: string | null) => (n ?? '').trim().split(/\s+/).filter(Boolean).map((p) => p[0].toUpperCase() + '•'.repeat(Math.min(5, Math.max(2, p.length - 1)))).join(' ')
const mascaraEmail = (e: string | null) => { const [u, d] = String(e ?? '').split('@'); return d ? `${u.slice(0, 1)}•••••@${d}` : '' }
const mascaraPlaca = (t: string) => t.replace(/\b([A-Z]{3})-?[0-9][0-9A-Z][0-9]{2}\b/g, '$1-••••')

function quandoFoi(iso: string, agora: number) {
  const s = Math.max(0, Math.round((agora - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'agora'
  if (s < 3600) return `há ${Math.floor(s / 60)} min`
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(',', '')

function lerOcultar() { try { return localStorage.getItem('deepcar.admin.ocultar') !== '0' } catch { return true } }

/** O que cada pessoa faz no site e no app (eventos_uso), para achar onde o cadastro trava. Atualiza sozinho a cada 30 s. */
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
  const [mostrar, setMostrar] = useState(40)

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
  const detalhe = (e: EventoUso) => (ocultar ? mascaraPlaca(resumoEvento(e)) : resumoEvento(e))
  const [copiado, setCopiado] = useState('')
  const texto = (v: string) => (ocultar ? mascaraPlaca(v) : v)
  /** Tudo o que o log tem, em pares campo → valor (o que aparece no cartão e vai na cópia). */
  function camposLog(e: EventoUso): [string, string][] {
    const c: [string, string][] = []
    if (e.usuario_id) {
      c.push(['quem', nome(e.nome)])
      if (e.email) c.push(['e-mail', ocultar ? mascaraEmail(e.email) : e.email])
      if (e.plano) c.push(['plano', e.plano])
      c.push(['conta', ocultar ? `${e.usuario_id.slice(0, 4)}…` : e.usuario_id])
    }
    if (e.visitante) c.push(['visitante', ocultar ? `${e.visitante.slice(0, 6)}…` : e.visitante])
    if (e.aparelho) c.push(['aparelho', e.aparelho])
    if (e.rota) c.push(['rota', texto(e.rota)])
    for (const [k, v] of Object.entries(e.detalhe ?? {})) {
      if (v == null || v === '') continue
      c.push([k, texto(typeof v === 'object' ? JSON.stringify(v) : String(v))])
    }
    return c
  }
  const linhaLog = (e: EventoUso) => [dataHora(e.em), e.tipo, NOMES_EVENTO[e.tipo] ?? e.tipo, ...camposLog(e).map(([k, v]) => `${k}=${v}`)].join(' | ')
  async function copiarTexto(t: string, aviso: string) {
    try { await navigator.clipboard.writeText(t) } catch {
      const area = document.createElement('textarea'); area.value = t; document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove()
    }
    setCopiado(aviso); setTimeout(() => setCopiado(''), 2500)
  }
  async function copiarLogs(janela: '1h' | '24h' | 'hoje' | 'tudo') {
    const agoraMs = agora // relógio da tela (atualiza a cada 5 s)
    const inicioHoje = new Date(); inicioHoje.setHours(0, 0, 0, 0)
    const desde = janela === '1h' ? agoraMs - 3_600_000 : janela === '24h' ? agoraMs - 86_400_000 : janela === 'hoje' ? inicioHoje.getTime() : 0
    const lista = (dados?.eventos ?? []).filter((e) => new Date(e.em).getTime() >= desde)
    const cab = `Deepcar · logs (${{ '1h': 'última hora', '24h': 'últimas 24 h', hoje: 'hoje', tudo: `últimos ${dias === 1 ? 'hoje' : `${dias} dias`}` }[janela]}) · ${lista.length} eventos · copiado em ${dataHora(new Date().toISOString())}`
    await copiarTexto([cab, ...lista.map(linhaLog)].join('\n'), `${lista.length} logs copiados`)
  }

  const r = dados?.resumo
  const tipoN = (k: string) => r?.porTipo.find((t) => t.tipo === k)
  const visitas = (r?.secoes ?? []).reduce((a, l) => a + l.visitantes, 0) || (r?.leitura ?? []).reduce((a, l) => a + l.visitantes, 0)
  const funil = r?.secoes?.length
    ? ([['Visitantes da página', 'visitantes'], ['Viram o tour', 'tour'], ['Procuraram o carro', 'busca'], ['Viram os planos', 'planos'], ['Leram o FAQ', 'faq'], ['Tocaram em Pegar oferta', 'oferta'], ['Clicaram em assinar', 'assinar']] as const)
        .map(([rotulo, k]) => ({ rotulo, n: r.secoes!.reduce((a, l) => a + l[k], 0) }))
    : []
  const maiorTipo = Math.max(1, ...(r?.porTipo ?? []).map((t) => t.n))
  const porAparelho = (r?.secoes ?? []).map((l) => ({ ...l, ...(r?.leitura?.find((x) => x.so === l.so) ?? {}) }))
  const pct = (n: number, de: number) => (de ? Math.round((100 * n) / de) : 0)

  const KPIS: [string, number | string, string, typeof Activity, string][] = [
    ['Visitas na página de vendas', visitas, 'aparelhos diferentes', Eye, 'text-trace-hi bg-trace/15'],
    ['Cadastros', tipoN('cadastro')?.pessoas ?? 0, 'contas novas', UserPlus, 'text-ok bg-ok/15'],
    ['Placas consultadas', tipoN('placa')?.n ?? 0, `${tipoN('placa')?.pessoas ?? 0} pessoas`, Car, 'text-trace-hi bg-trace/15'],
    ['Esquemas abertos', tipoN('esquema')?.n ?? 0, `${tipoN('esquema')?.pessoas ?? 0} pessoas`, Zap, 'text-warn bg-warn/15'],
    ['Clicaram em assinar', tipoN('clicou_assinar')?.pessoas ?? 0, `${tipoN('clicou_assinar')?.n ?? 0} cliques`, CreditCard, 'text-ok bg-ok/15'],
  ]
  const cartao = 'rounded-2xl border seam bg-bench-1/90 p-5 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]'
  const rotulo = 'code text-[11px] uppercase tracking-[0.18em] text-ink-4'

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[28px] font-semibold tracking-tight">Atividade</h1>
            <span className="inline-flex items-center gap-2 rounded-full border border-ok/30 bg-ok/10 px-2.5 py-1 text-[12px] font-medium text-ok">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok/70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-ok" /></span>
              Ao vivo
            </span>
          </div>
          <p className="mt-1.5 text-ink-3">O que as pessoas fazem no site e nos apps, em tempo real.{atualizado && <span className="text-ink-4"> · atualizado {quandoFoi(new Date(atualizado).toISOString(), agora)}</span>}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={alternarOcultar} aria-pressed={ocultar} className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3.5 text-[13px] ${ocultar ? 'border-trace/40 bg-trace/10 text-ink-1' : 'seam text-ink-3 hover:text-ink-1'}`}>
            {ocultar ? <EyeOff size={15} /> : <Eye size={15} />} {ocultar ? 'Dados pessoais ocultos' : 'Ocultar dados pessoais'}
          </button>
          <button type="button" onClick={() => void carregar()} className="btn-ghost inline-flex h-10 items-center gap-2"><RefreshCw size={15} /> Atualizar</button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl border seam bg-bench-1/80 p-2">
        <div className="flex rounded-lg bg-well p-1">
          {[1, 7, 30, 90].map((d) => (
            <button key={d} type="button" onClick={() => setDias(d)} className={`rounded-md px-3.5 py-1.5 text-[13px] transition-colors ${dias === d ? 'bg-bench-3 font-medium text-ink-1 shadow' : 'text-ink-3 hover:text-ink-1'}`}>
              {d === 1 ? 'Hoje' : `${d} dias`}
            </button>
          ))}
        </div>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="field h-9 w-auto py-0 text-[13px]">
          <option value="">Todos os eventos</option>
          {Object.entries(NOMES_EVENTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={aparelho} onChange={(e) => setAparelho(e.target.value)} className="field h-9 w-auto py-0 text-[13px]">
          <option value="">Site e apps</option>
          <option value="site">Só o site</option>
          <option value="android">App Android</option>
          <option value="ios">App iPhone</option>
        </select>
        <label className="relative w-full sm:ml-auto sm:w-auto">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
          <input className="field h-9 w-full pl-8 text-[13px] sm:w-56" placeholder="Nome ou e-mail" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        {usuario && (
          <button type="button" onClick={() => setUsuario(null)} className="inline-flex items-center gap-1.5 rounded-lg border border-trace/40 bg-trace/10 px-3 py-1.5 text-[13px] text-ink-1">
            Só {nome(usuario.nome)} <X size={13} />
          </button>
        )}
      </div>
      {erro && <p role="alert" className="mt-4 rounded-lg border border-fault/30 bg-fault/10 px-4 py-3 text-sm text-fault">{erro}</p>}

      {r && !usuario && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {KPIS.map(([titulo, valor, sub, Icone, cor], i) => (
              <div key={titulo} className={`${cartao} surge last:col-span-2 lg:last:col-span-1`} style={{ ['--i' as string]: i }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] leading-tight text-ink-3">{titulo}</span>
                  <span className={`grid h-8 w-8 flex-none place-items-center rounded-lg ${cor}`}><Icone size={16} /></span>
                </div>
                <p className="mt-3 text-[32px] font-semibold leading-none tracking-tight tabular-nums text-ink-1">{valor.toLocaleString('pt-BR')}</p>
                <p className="mt-1.5 text-[12px] text-ink-4">{sub}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-5">
            {!!funil.length && (
              <section className={`${cartao} lg:col-span-3`}>
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className={rotulo}>Página de vendas · até onde chegam <span className="normal-case tracking-normal">(cada aparelho conta 1 vez)</span></h2>
                  <span className="text-[12px] text-ink-4">{pct(funil[funil.length - 1].n, funil[0].n)}% clicam em assinar</span>
                </div>
                <ul className="mt-4 space-y-2.5">
                  {funil.map((f, i) => {
                    const w = funil[0].n ? Math.max(2, (100 * f.n) / funil[0].n) : 0
                    return (
                      <li key={f.rotulo} className="grid grid-cols-[118px_1fr_70px] items-center gap-3 text-[13px] sm:grid-cols-[190px_1fr_84px]">
                        <span className="truncate text-ink-2">{f.rotulo}</span>
                        <span className="h-7 overflow-hidden rounded-md bg-well">
                          <span className="block h-full rounded-md bg-gradient-to-r from-trace to-trace-hi/80 transition-[width] duration-700" style={{ width: `${w}%`, opacity: 1 - i * 0.08 }} />
                        </span>
                        <span className="text-right tabular-nums text-ink-1">{f.n} <span className="text-ink-4">{i ? `${pct(f.n, funil[0].n)}%` : ''}</span></span>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}
            <section className={`${cartao} ${funil.length ? 'lg:col-span-2' : 'lg:col-span-5'}`}>
              <div className="flex items-baseline justify-between gap-3"><h2 className={rotulo}>Eventos no período</h2><span className="text-[12px] text-ink-4">vezes · pessoas</span></div>
              <ul className="mt-4 space-y-2">
                {r.porTipo.slice(0, 9).map((t) => {
                  const [Icone, cor] = ICONE_EVENTO[t.tipo] ?? [Activity, 'text-ink-3 bg-white/[0.06]']
                  return (
                    <li key={t.tipo} className="flex items-center gap-3 text-[13px]">
                      <span className={`grid h-7 w-7 flex-none place-items-center rounded-md ${cor}`}><Icone size={14} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex justify-between gap-2"><span className="truncate text-ink-2">{NOMES_EVENTO[t.tipo] ?? t.tipo}</span><span className="tabular-nums text-ink-1">{t.n} <span className="text-ink-4">· {t.pessoas}</span></span></span>
                        <span className="mt-1 block h-1 overflow-hidden rounded-full bg-well"><span className="block h-full rounded-full bg-ink-4/70" style={{ width: `${(100 * t.n) / maiorTipo}%` }} /></span>
                      </span>
                    </li>
                  )
                })}
                {!r.porTipo.length && <li className="text-ink-4">Nada registrado ainda.</li>}
              </ul>
            </section>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <section className={cartao}>
              <h2 className={rotulo}>Clicaram em assinar</h2>
              <ul className="mt-3 space-y-2 text-[13.5px]">
                {r.assinar.slice(0, 8).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3">
                    <button type="button" onClick={() => setUsuario({ id: a.id, nome: a.nome })} className="truncate text-left text-ink-1 hover:text-trace-hi">{nome(a.nome)}</button>
                    <span className={`flex-none rounded-full px-2 py-0.5 text-[11.5px] ${a.plano === 'free' ? 'bg-warn/15 text-warn' : 'bg-ok/15 text-ok'}`}>{a.plano === 'free' ? 'não assinou' : rotuloPlano(a.plano)} · {a.cliques}x</span>
                  </li>
                ))}
                {!r.assinar.length && <li className="text-ink-4">Ninguém no período.</li>}
              </ul>
            </section>
            <section className={cartao}>
              <h2 className={rotulo}>Buscas sem resultado</h2>
              <ul className="mt-3 flex flex-wrap gap-1.5 text-[12.5px]">
                {r.semResultado.slice(0, 18).map((b) => <li key={b.termo} className="rounded-full border seam bg-bench-2 px-2.5 py-1 text-ink-2">{b.termo}{b.n > 1 && <span className="text-ink-4"> · {b.n}</span>}</li>)}
                {!r.semResultado.length && <li className="text-ink-4">Nenhuma.</li>}
              </ul>
            </section>
            <section className={cartao}>
              <h2 className={rotulo}>Placas com erro</h2>
              <ul className="mt-3 space-y-1.5 text-[13.5px]">
                {r.placasErro.slice(0, 8).map((p) => <li key={p.erro} className="flex justify-between gap-3"><span className="truncate text-ink-2">{p.erro}</span><span className="tabular-nums text-ink-3">{p.n}x</span></li>)}
                {!r.placasErro.length && <li className="text-ink-4">Nenhuma.</li>}
              </ul>
            </section>
            <section className={cartao}>
              <h2 className={rotulo}>Navegador do Instagram/Facebook</h2>
              <ul className="mt-3 space-y-1.5 text-[13.5px]">
                {r.navegador.slice(0, 8).map((n) => <li key={`${n.so}${n.acao}`} className="flex justify-between gap-3"><span className="truncate text-ink-2">{n.so} · {n.acao}</span><span className="tabular-nums text-ink-3">{n.n}</span></li>)}
                {!r.navegador.length && <li className="text-ink-4">Nada no período.</li>}
              </ul>
            </section>
          </div>

          {!!porAparelho.length && (
            <section className={`${cartao} mt-3 overflow-x-auto`}>
              <h2 className={rotulo}>Página de vendas por aparelho</h2>
              <table className="mt-3 w-full min-w-[760px] text-left text-[13px]">
                <thead className="text-[12px] text-ink-4"><tr>
                  {['Aparelho', 'Visitas', 'Tempo (mediana)', 'Viu o tour', 'Viu a busca', 'Viu os planos', 'Pegar oferta', 'Clicou em assinar'].map((h) => <th key={h} className="pb-2 font-medium">{h}</th>)}
                </tr></thead>
                <tbody className="tabular-nums">
                  {porAparelho.map((l) => (
                    <tr key={l.so} className="border-t seam-soft">
                      <td className="py-2 font-medium text-ink-1">{l.so}</td><td className="text-ink-1">{l.visitantes}</td>
                      <td className="text-ink-2">{'segundos_mediana' in l && l.segundos_mediana != null ? `${l.segundos_mediana} s` : '—'}</td>
                      {([l.tour, l.busca, l.planos, l.oferta, l.assinar]).map((n, i) => (
                        <td key={i} className="text-ink-2">{n} <span className="text-[11.5px] text-ink-4">{pct(n, l.visitantes)}%</span></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}

      <section className={`${cartao} mt-3 !p-0`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b seam px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok/70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-ok" /></span>
            <h2 className={rotulo}>Logs ao vivo</h2>
            <span className="code text-[11px] text-ink-4">{dados?.eventos.length ?? 0} carregados</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Copy size={14} className="mr-0.5 text-ink-4" />
            {([['1h', 'Última hora'], ['24h', 'Últimas 24 h'], ['hoje', 'Hoje'], ['tudo', 'Tudo']] as const).map(([k, r]) => (
              <button key={k} type="button" onClick={() => void copiarLogs(k)} className="rounded-md border seam px-2.5 py-1 text-[12px] text-ink-3 hover:border-trace/40 hover:text-ink-1">{r}</button>
            ))}
            {copiado && <span role="status" className="ml-1 text-[12px] text-ok">{copiado}</span>}
          </div>
        </div>
        <ul className="divide-y divide-white/[0.05]">
          {(dados?.eventos ?? []).slice(0, mostrar).map((e, i) => {
            const [Icone, cor] = ICONE_EVENTO[e.tipo] ?? [Activity, 'text-ink-3 bg-white/[0.06]']
            const campos = camposLog(e)
            return (
              <li key={e.id} className={`group px-5 py-3.5 transition-colors hover:bg-white/[0.02] ${i < 12 ? 'surge' : ''}`} style={i < 12 ? { ['--i' as string]: i } : undefined}>
                <div className="flex items-start gap-3.5">
                  <span className={`mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-xl ${cor}`}><Icone size={16} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[13.5px] font-medium text-ink-1">{NOMES_EVENTO[e.tipo] ?? e.tipo}</span>
                      <span className="code rounded bg-white/[0.06] px-1.5 py-0.5 text-[11px] text-ink-3">{e.tipo}</span>
                      <span className="code text-[11px] text-ink-4">#{e.id}</span>
                      <span className="ml-auto code text-[11.5px] tabular-nums text-ink-3" title={e.em}>{dataHora(e.em)} <span className="text-ink-4">· {quandoFoi(e.em, agora)}</span></span>
                    </div>
                    <p className="mt-0.5 text-[13px] text-ink-2">{detalhe(e) || <span className="text-ink-4">sem detalhe</span>}</p>
                    <dl className="mt-2 flex flex-wrap gap-1.5 code text-[11px]">
                      {campos.map(([k, v]) => (
                        <div key={k} className="flex max-w-full items-baseline gap-1 rounded-md border border-white/[0.06] bg-well/70 px-1.5 py-0.5">
                          <dt className="text-ink-4">{k}</dt>
                          <dd className="truncate text-ink-2">
                            {k === 'conta' && e.usuario_id
                              ? <button type="button" onClick={() => setUsuario({ id: e.usuario_id!, nome: e.nome ?? '' })} className="text-trace-hi hover:underline">{v}</button>
                              : v}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <button type="button" onClick={() => void copiarTexto(linhaLog(e), '1 log copiado')} aria-label="Copiar este log" className="flex-none rounded-md p-1.5 text-ink-4 opacity-60 hover:bg-white/[0.05] hover:text-ink-1 group-hover:opacity-100"><Copy size={14} /></button>
                </div>
              </li>
            )
          })}
          {dados && !dados.eventos.length && <li className="px-5 py-10 text-center text-ink-4">Nenhum evento com esses filtros.</li>}
          {!dados && !erro && Array.from({ length: 6 }, (_, i) => <li key={i} className="px-5 py-3.5"><div className="skeleton h-12 rounded-lg" /></li>)}
        </ul>
        {(dados?.eventos.length ?? 0) > mostrar && (
          <button type="button" onClick={() => setMostrar((n) => n + 60)} className="w-full border-t seam py-3 text-[13px] text-trace-hi hover:bg-white/[0.02]">Mostrar mais</button>
        )}
      </section>
      <p className="mt-2 text-[12px] text-ink-4">Até 400 eventos mais recentes do filtro e do período escolhido (os botões de copiar usam esses). O registro guarda 120 dias. Com "Dados pessoais ocultos" ligado, a cópia sai mascarada.</p>
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
