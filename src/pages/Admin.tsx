// Tela do administrador: usuários (plano, acesso, senha) e o cofre de chaves de API.
// Toda a autorização é do servidor (api/admin/*): aqui a checagem só evita mostrar a tela.
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Activity, BadgeDollarSign, Bell, Check, Copy, Eye, EyeOff, KeyRound, Layers, Link2, Loader2, MessageCircle, MonitorSmartphone, Plus, RefreshCw, Search, Timer, Trash2, Users, Wand2, X } from 'lucide-react'
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
      <header className="flex h-[68px] items-center justify-between gap-4 border-b seam px-5 sm:px-8">
        <div className="flex items-center gap-4">
          <Link to="/app"><img src="/brand/logo-h-light.png" alt="Deepcar" className="w-32" draggable={false} /></Link>
          <span className="code text-[11px] uppercase tracking-[0.2em] text-ink-4">Administração</span>
        </div>
        <div className="flex items-center gap-1 rounded-lg border seam bg-bench-2 p-1">
          {([['usuarios', 'Usuários', Users], ['planos', 'Planos', Layers], ['assinaturas', 'Assinaturas', BadgeDollarSign], ['avisos', 'Avisos no app', Bell], ['logs', 'Logs', Activity], ['chaves', 'Chaves de API', KeyRound]] as const).map(([k, rotulo, Icone]) => (
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
function AbaAvisos() {
  const [historico, setHistorico] = useState<Aviso[]>([])
  const [aparelhos, setAparelhos] = useState<Record<string, number>>({})
  const [titulo, setTitulo] = useState('')
  const [texto, setTexto] = useState('')
  const [publico, setPublico] = useState<string>('todos')
  const [enviando, setEnviando] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)

  const carregar = useCallback(async () => {
    try {
      const r = (await api('/api/admin/usuarios?acao=push')) as { historico: Aviso[]; aparelhos: Record<string, number> }
      setHistorico(r.historico ?? []); setAparelhos(r.aparelhos ?? {})
    } catch (e) { setMsg({ ok: false, texto: e instanceof Error ? e.message : 'Falha ao carregar.' }) }
  }, [])
  useEffect(() => { const t = setTimeout(() => void carregar(), 0); return () => clearTimeout(t) }, [carregar])

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const n = aparelhos[publico] ?? 0
    if (!confirm(`Mandar "${titulo}" para ${n} ${n === 1 ? 'aparelho' : 'aparelhos'}? Não dá para desfazer.`)) return
    setEnviando(true); setMsg(null)
    try {
      const r = (await api('/api/admin/usuarios?acao=push', { method: 'POST', body: JSON.stringify({ titulo, texto, publico }) })) as { aparelhos: number; entregues: number }
      setMsg({ ok: true, texto: `Enviado: ${r.entregues} de ${r.aparelhos} aparelhos receberam.` })
      setTitulo(''); setTexto(''); await carregar()
    } catch (e2) { setMsg({ ok: false, texto: e2 instanceof Error ? e2.message : 'Não foi possível enviar.' }) }
    finally { setEnviando(false) }
  }

  return (
    <>
      <h1 className="text-[26px] font-semibold tracking-tight">Avisos no app</h1>
      <p className="mt-1 text-ink-3">Notificação no celular de quem tem o app Android e aceitou receber. Use para novidades e funções novas.
        O aviso de &quot;teste acabou&quot; sai sozinho.</p>
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
              {rotulo} <span className="text-ink-4">· {aparelhos[k] ?? 0}</span>
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
            <p className="mt-1.5 text-[12px] text-ink-4">{new Date(a.enviado_em).toLocaleString('pt-BR')} · {PUBLICOS_AVISO.find(([k]) => k === a.publico)?.[1] ?? a.publico} · {a.entregues} de {a.aparelhos} aparelhos{a.enviado_por ? ` · ${a.enviado_por}` : ''}</p>
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
}

const NOMES_EVENTO: Record<string, string> = {
  whatsapp: 'Chamou no WhatsApp', app_aberto: 'Abriu o app Android', compra_play: 'Assinou pela Google Play',
  pagina: 'Página', busca: 'Busca', placa: 'Placa encontrada', placa_erro: 'Placa com erro', esquema: 'Esquema',
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
    default: return d.erro ? String(d.erro) : e.rota ?? ''
  }
}

/** O que cada pessoa faz no site e no app (eventos_uso), para achar onde o cadastro trava. */
function AbaLogs() {
  const [dias, setDias] = useState(7)
  const [tipo, setTipo] = useState('')
  const [q, setQ] = useState('')
  const [usuario, setUsuario] = useState<{ id: string; nome: string } | null>(null)
  const [dados, setDados] = useState<{ eventos: EventoUso[]; resumo: ResumoLogs } | null>(null)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    try {
      const p = new URLSearchParams({ acao: 'logs', dias: String(dias), tipo, q })
      if (usuario) p.set('usuario', usuario.id)
      setDados((await api(`/api/admin/usuarios?${p}`)) as { eventos: EventoUso[]; resumo: ResumoLogs }); setErro('')
    } catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao carregar.') }
  }, [dias, tipo, q, usuario])
  useEffect(() => { const t = setTimeout(() => void carregar(), 300); return () => clearTimeout(t) }, [carregar])

  const r = dados?.resumo
  const cartao = 'rounded-xl border seam bg-bench-2 p-4'
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">Logs</h1>
          <p className="mt-1 text-ink-3">O que as pessoas fazem no site e no app: páginas, buscas, placas, esquemas, planos e erros.</p>
        </div>
        <button type="button" onClick={() => void carregar()} className="btn-ghost inline-flex items-center gap-2"><RefreshCw size={15} /> Atualizar</button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {[1, 7, 30, 90].map((d) => (
          <button key={d} type="button" onClick={() => setDias(d)} className={`rounded-lg border px-3 py-1.5 text-[13px] ${dias === d ? 'border-trace/50 bg-trace/15 text-ink-1' : 'seam text-ink-3'}`}>
            {d === 1 ? 'Hoje' : `${d} dias`}
          </button>
        ))}
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="field h-9 w-auto py-0 text-[13px]">
          <option value="">Todos os eventos</option>
          {Object.entries(NOMES_EVENTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
          <input className="field h-9 w-56 pl-8 text-[13px]" placeholder="Nome ou e-mail" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        {usuario && (
          <button type="button" onClick={() => setUsuario(null)} className="inline-flex items-center gap-1.5 rounded-lg border border-trace/40 bg-trace/10 px-3 py-1.5 text-[13px] text-ink-1">
            Só {usuario.nome} <X size={13} />
          </button>
        )}
      </div>
      {erro && <p role="alert" className="mt-4 rounded-lg border border-fault/30 bg-fault/10 px-4 py-3 text-sm text-fault">{erro}</p>}

      {r && !usuario && (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <section className={cartao}>
            <h2 className="code text-[11px] uppercase tracking-[0.18em] text-ink-4">No período</h2>
            <ul className="mt-2 space-y-1 text-[13.5px]">
              {r.porTipo.map((t) => <li key={t.tipo} className="flex justify-between gap-3"><span className="text-ink-2">{NOMES_EVENTO[t.tipo] ?? t.tipo}</span><span className="text-ink-3">{t.n} · {t.pessoas} pessoa(s)</span></li>)}
              {!r.porTipo.length && <li className="text-ink-4">Nada registrado ainda.</li>}
            </ul>
          </section>
          <section className={cartao}>
            <h2 className="code text-[11px] uppercase tracking-[0.18em] text-ink-4">Clicaram em assinar</h2>
            <ul className="mt-2 space-y-1.5 text-[13.5px]">
              {r.assinar.map((a) => (
                <li key={a.id} className="flex justify-between gap-3">
                  <button type="button" onClick={() => setUsuario({ id: a.id, nome: a.nome })} className="truncate text-left text-trace hover:underline">{a.nome}</button>
                  <span className={a.plano === 'free' ? 'text-warn' : 'text-ok'}>{a.plano === 'free' ? 'não assinou' : rotuloPlano(a.plano)} · {a.cliques}x</span>
                </li>
              ))}
              {!r.assinar.length && <li className="text-ink-4">Ninguém no período.</li>}
            </ul>
          </section>
          <section className={cartao}>
            <h2 className="code text-[11px] uppercase tracking-[0.18em] text-ink-4">Buscas sem resultado</h2>
            <ul className="mt-2 space-y-1 text-[13.5px]">
              {r.semResultado.map((b) => <li key={b.termo} className="flex justify-between gap-3"><span className="truncate text-ink-2">{b.termo}</span><span className="text-ink-3">{b.n}x</span></li>)}
              {!r.semResultado.length && <li className="text-ink-4">Nenhuma.</li>}
            </ul>
          </section>
          <section className={cartao}>
            <h2 className="code text-[11px] uppercase tracking-[0.18em] text-ink-4">Placas com erro</h2>
            <ul className="mt-2 space-y-1 text-[13.5px]">
              {r.placasErro.map((p) => <li key={p.erro} className="flex justify-between gap-3"><span className="truncate text-ink-2">{p.erro}</span><span className="text-ink-3">{p.n}x</span></li>)}
              {!r.placasErro.length && <li className="text-ink-4">Nenhuma.</li>}
            </ul>
          </section>
          <section className={cartao}>
            <h2 className="code text-[11px] uppercase tracking-[0.18em] text-ink-4">Navegador do Instagram/Facebook</h2>
            <ul className="mt-2 space-y-1 text-[13.5px]">
              {r.navegador.map((n) => <li key={`${n.so}${n.acao}`} className="flex justify-between gap-3"><span className="text-ink-2">{n.so} · {n.acao}</span><span className="text-ink-3">{n.n}</span></li>)}
              {!r.navegador.length && <li className="text-ink-4">Nada no período.</li>}
            </ul>
          </section>
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border seam">
        <table className="w-full min-w-[820px] text-left text-[13px]">
          <thead className="bg-bench-2 text-ink-4"><tr><th className="px-3 py-2 font-medium">Quando</th><th className="px-3 py-2 font-medium">Quem</th><th className="px-3 py-2 font-medium">Aparelho</th><th className="px-3 py-2 font-medium">Evento</th><th className="px-3 py-2 font-medium">Detalhe</th></tr></thead>
          <tbody>
            {(dados?.eventos ?? []).map((e) => (
              <tr key={e.id} className="border-t seam-soft align-top">
                <td className="whitespace-nowrap px-3 py-2 text-ink-3">{new Date(e.em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                <td className="px-3 py-2">
                  {e.usuario_id
                    ? <button type="button" onClick={() => setUsuario({ id: e.usuario_id!, nome: e.nome ?? '' })} className="text-left text-trace hover:underline">{e.nome}<span className="block text-[11.5px] text-ink-4">{e.email}</span></button>
                    : <span className="text-ink-4">visitante {e.visitante?.slice(0, 6) ?? ''}</span>}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-ink-3">{e.aparelho}</td>
                <td className="whitespace-nowrap px-3 py-2 text-ink-1">{NOMES_EVENTO[e.tipo] ?? e.tipo}</td>
                <td className="px-3 py-2 text-ink-2">{resumoEvento(e)}</td>
              </tr>
            ))}
            {dados && !dados.eventos.length && <tr><td colSpan={5} className="px-3 py-6 text-center text-ink-4">Nenhum evento com esses filtros.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[12px] text-ink-4">Mostra os 400 eventos mais recentes do filtro. O registro guarda 120 dias.</p>
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
