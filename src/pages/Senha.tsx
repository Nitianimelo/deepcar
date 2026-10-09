// "Esqueci a senha" (/esqueci-senha) e "Criar nova senha" (/redefinir-senha?t=…), desde 07/10/2026.
// O link chega por e-mail (Resend, api/login.js ?acao=esqueci); vale 1 hora e uma vez. Trocar a senha derruba as
// sessões abertas e já entra neste aparelho (09/10/2026). `novo=1`: conta criada na compra (pagou sem ter conta;
// api/_lib/assinatura.js → criarContaDaCompra, link de 7 dias no e-mail "Bem-vindo ao plano"): "Crie sua senha".
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Check, Eye, EyeOff, LoaderCircle, MailCheck } from 'lucide-react'
import { PaginaSimples } from '../components/PaginaSimples'
import { linkSuporte } from '../lib/plano'
import { SENHA_MINIMA } from '../lib/validacao'
import { registrar as anotar } from '../lib/log'
import { lembrarSessao, type Session } from '../lib/auth'

async function postar(acao: string, dados: unknown) {
  const res = await fetch(`/api/login?acao=${acao}`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) })
  const corpo = (await res.json().catch(() => ({}))) as { erro?: string; mensagem?: string }
  if (!res.ok) throw new Error(corpo.erro ?? `Falha (HTTP ${res.status}).`)
  return corpo
}

const ERRO_SUPORTE = (onde: string, detalhe: string) => (
  <div role="alert" className="mt-4 rounded-lg border border-fault/30 bg-fault/10 px-4 py-3 text-[14px] text-fault">
    Houve um erro ao {onde}: {detalhe} Desculpe!{' '}
    <a href={linkSuporte(`Olá! Houve um erro ao ${onde} na Deepcar: ${detalhe}`)} className="font-semibold underline">Fale com o suporte no WhatsApp</a>.
  </div>
)

export function EsqueciSenha() {
  const [params] = useSearchParams()
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [estado, setEstado] = useState<'livre' | 'enviando' | 'enviado'>('livre')
  const [erro, setErro] = useState<string | null>(null)
  async function enviar(e: FormEvent) {
    e.preventDefault()
    setEstado('enviando'); setErro(null)
    try { await postar('esqueci', { email }); setEstado('enviado'); anotar('esqueci_senha') }
    catch (err) { setEstado('livre'); setErro((err as Error).message) }
  }
  return (
    <PaginaSimples rotulo="Sua conta" titulo="Esqueci a senha">
      {estado === 'enviado' ? (
        <div className="not-prose rounded-xl border border-ok/30 bg-ok/10 p-5 text-[15px] text-ink-1">
          <p className="flex items-center gap-2 font-semibold"><MailCheck size={18} className="text-ok" /> Confira o seu e-mail</p>
          <p className="mt-2 text-ink-2">Se <b>{email}</b> tiver conta na Deepcar, o link para criar uma nova senha chega em instantes. Ele vale por 1 hora.
            Não chegou? Olhe a caixa de spam ou promoções.</p>
          <Link to="/login" className="mt-4 inline-flex items-center gap-2 font-medium text-trace">Voltar para entrar <ArrowRight size={15} /></Link>
        </div>
      ) : (
        <form onSubmit={enviar} className="not-prose max-w-md">
          <p className="text-[15px] text-ink-2">Digite o e-mail da sua conta. Mandamos um link para você criar uma senha nova.</p>
          <input type="email" required autoComplete="email" inputMode="email" className="field mt-4 h-12" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="submit" disabled={estado === 'enviando'} className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2">
            {estado === 'enviando' ? <><LoaderCircle size={18} className="animate-spin" /> Enviando…</> : <>Mandar o link <ArrowRight size={16} /></>}
          </button>
          {erro && ERRO_SUPORTE('mandar o link', erro)}
          <p className="mt-5 text-[14px] text-ink-3">Lembrou? <Link to="/login" className="text-trace">Entrar</Link></p>
        </form>
      )}
    </PaginaSimples>
  )
}

export function RedefinirSenha() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const token = params.get('t') ?? ''
  const novo = params.get('novo') === '1'
  const [senha, setSenha] = useState('')
  const [ver, setVer] = useState(false)
  const [estado, setEstado] = useState<'livre' | 'salvando'>('livre')
  const [erro, setErro] = useState<string | null>(null)
  async function salvar(e: FormEvent) {
    e.preventDefault()
    setEstado('salvando'); setErro(null)
    try {
      const s = (await postar('redefinir', { token, senha })) as unknown as Session
      anotar(novo ? 'senha_criada_compra' : 'senha_redefinida')
      // o servidor já abriu a sessão: entra direto na plataforma
      if (s && (s as { email?: string }).email) { lembrarSessao(s); nav('/app', { replace: true }); return }
      nav('/login', { replace: true, state: { aviso: 'Senha nova criada. Entre com ela.' } })
    } catch (err) { setEstado('livre'); setErro((err as Error).message) }
  }
  return (
    <PaginaSimples rotulo="Sua conta" titulo={novo ? 'Crie sua senha' : 'Criar nova senha'}>
      {!token ? (
        <p className="text-[15px] text-ink-2">Este link está incompleto. <Link to="/esqueci-senha" className="text-trace">Peça um novo link</Link>.</p>
      ) : (
        <form onSubmit={salvar} className="not-prose max-w-md">
          <p className="text-[15px] text-ink-2">
            {novo
              ? <>Pagamento confirmado e conta criada com o e-mail da compra. Escolha uma senha (pelo menos {SENHA_MINIMA} caracteres) e você já entra na plataforma.</>
              : <>Escolha a nova senha da sua conta (pelo menos {SENHA_MINIMA} caracteres).</>}
          </p>
          <span className="relative mt-4 block">
            <input type={ver ? 'text' : 'password'} required minLength={SENHA_MINIMA} autoComplete="new-password" className="field h-12 pr-12" placeholder="Nova senha" value={senha} onChange={(e) => setSenha(e.target.value)} />
            <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Esconder a senha' : 'Mostrar a senha'} className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-ink-3">
              {ver ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </span>
          <button type="submit" disabled={estado === 'salvando' || senha.length < SENHA_MINIMA} className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2">
            {estado === 'salvando' ? <><LoaderCircle size={18} className="animate-spin" /> Salvando…</> : <><Check size={16} /> {novo ? 'Criar senha e entrar' : 'Salvar a nova senha e entrar'}</>}
          </button>
          {erro && ERRO_SUPORTE('criar a nova senha', erro)}
        </form>
      )}
    </PaginaSimples>
  )
}
