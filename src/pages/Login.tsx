import { useState, type FormEvent } from 'react'
import { linkSuporte } from '../lib/plano'
import { registrar as anotar } from '../lib/log'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { AtSign, Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { login } from '../lib/auth'
import { CircuitArt } from '../components/CircuitArt'
import { TracePad } from '../components/TracePad'
import { CarBlueprint } from '../components/CarBlueprint'
import { useTitulo } from '../lib/seo'

export default function Login() {
  useTitulo('Entrar · Deepcar')
  const nav = useNavigate()
  const loc = useLocation()
  // vindo do aviso do navegador do Instagram (NavegadorInterno): e-mail preenchido e "conta criada"
  const [email, setEmail] = useState(() => new URLSearchParams(location.search).get('email') ?? '')
  const [senha, setSenha] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  // 2 erros seguidos: mostra o caminho de recuperar a senha e o WhatsApp (registro de uso, 08/10/2026)
  const [erros, setErros] = useState(0)
  // o app manda para cá quem teve a sessão encerrada (limite de aparelhos do plano, admin, senha nova)
  const aviso = (loc.state as { aviso?: string } | null)?.aviso
    ?? (new URLSearchParams(loc.search).get('conta') === 'criada' ? 'Sua conta já está criada. Entre com a senha que você acabou de cadastrar.' : undefined)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    // preenchimento automático (navegador do Instagram/Facebook) às vezes não avisa o React: lê também do campo
    const form = e.currentTarget as HTMLFormElement
    const emailCampo = email || (form.querySelector('input[type=email]') as HTMLInputElement | null)?.value || ''
    const senhaCampo = senha || (form.querySelector('input[autocomplete=current-password], input[type=password]') as HTMLInputElement | null)?.value || ''
    if (emailCampo !== email) setEmail(emailCampo)
    if (senhaCampo !== senha) setSenha(senhaCampo)
    setCarregando(true)
    try {
      await login(emailCampo, senhaCampo)
      anotar('login')
      const dest = (loc.state as { from?: string } | null)?.from ?? '/app'
      nav(dest, { replace: true })
    } catch (err) {
      anotar('login_erro', { erro: err instanceof Error ? err.message.slice(0, 160) : 'desconhecido' })
      setErros((n) => n + 1)
      setErro(err instanceof Error ? err.message : 'Não foi possível entrar.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="schematic-grid min-h-full grid lg:grid-cols-[1.15fr_1fr]">
      {/* Painel da marca */}
      <section className="relative hidden lg:flex flex-col justify-between overflow-hidden border-r seam p-12">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(900px 600px at 20% 30%, rgba(14,58,118,0.55) 0%, transparent 60%), radial-gradient(600px 500px at 80% 90%, rgba(74,141,255,0.10) 0%, transparent 60%)',
          }}
        />
        <CircuitArt />
        <img src="/brand/logo-h-light.png" alt="Deepcar" className="relative w-56 select-none" draggable={false} />
        <CarBlueprint className="relative mx-auto w-full max-w-[720px]" />
        <div className="relative max-w-md">
          <p className="code text-[11px] tracking-[0.22em] uppercase text-ink-3 mb-4">Plataforma técnica</p>
          <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-ink-1">
            Inteligência automotiva para a sua oficina.
          </h1>
          <p className="mt-5 text-ink-2 text-base leading-relaxed">
            Injeção eletrônica, elétrica, ABS e câmbio de mais de 15 mil modelos, do leve ao diesel.
            Digite a placa e encontre o que precisa no celular, no tablet ou no computador.
          </p>
        </div>
        <p className="relative code text-xs text-ink-4">© {new Date().getFullYear()} Deepcar</p>
      </section>

      {/* Formulário */}
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[420px]">
          <img src="/brand/logo-h-light.png" alt="Deepcar" className="lg:hidden w-44 mb-10 select-none" draggable={false} />

          <div className="relative rounded-2xl border seam bg-bench-2 p-7 sm:p-8">
            <TracePad className="trace-pad top-[38px] left-[-14px] absolute" />
            <h2 className="text-2xl font-semibold tracking-tight">Entrar</h2>
            <p className="mt-1.5 text-ink-3 text-sm">Acesse com a conta da sua oficina.</p>

            {aviso && !erro && (
              <p role="status" className="mt-6 rounded-lg border border-warn/30 bg-warn/10 px-3.5 py-2.5 text-[13.5px] text-ink-1">
                {aviso}
              </p>
            )}
            <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-ink-2">E-mail</span>
                <span className="relative block">
                  <AtSign size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-4" />
                  <input
                    className="field pl-11"
                    type="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="voce@oficina.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-1.5 flex items-center justify-between text-[13px] font-medium text-ink-2">
                  Senha
                  <Link
                    to={`/esqueci-senha${email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ''}`}
                    className="text-trace hover:text-trace-hi font-normal"
                  >
                    Esqueci a senha
                  </Link>
                </span>
                <span className="relative block">
                  <LockKeyhole size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-4" />
                  <input
                    className="field pl-11 pr-12"
                    type={mostrar ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setMostrar((v) => !v)}
                    aria-label={mostrar ? 'Ocultar senha' : 'Mostrar senha'}
                    data-tip={mostrar ? 'Ocultar senha' : 'Mostrar a senha digitada'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-md text-ink-3 hover:text-ink-1 hover:bg-bench-3"
                  >
                    {mostrar ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </label>

              <p className="text-[13px] text-ink-4">A sessão fica aberta por 30 dias neste dispositivo.</p>

              {erro && (
                <div role="alert" className="rounded-lg border border-fault/30 bg-fault/10 px-3.5 py-2.5 text-sm text-fault">
                  {erro}
                </div>
              )}

              <button type="submit" className="btn-primary w-full" disabled={carregando}>
                {carregando ? 'Entrando…' : 'Entrar'}
              </button>
            </form>
            {erros >= 2 && (
              <div className="mt-5 rounded-xl border border-warn/30 bg-warn/10 p-4 text-[14px] text-ink-1">
                <p className="font-semibold">Não está conseguindo entrar?</p>
                <p className="mt-1 text-ink-2">Crie uma senha nova pelo e-mail, ou chame a gente no WhatsApp que a gente resolve na hora.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link to={`/esqueci-senha${email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ''}`} className="btn-primary inline-flex !h-10 items-center px-4 text-[14px]">Criar nova senha</Link>
                  <a href={linkSuporte(`Olá! Não estou conseguindo entrar na Deepcar.${email.trim() ? ` Meu e-mail é ${email.trim()}.` : ''}`, 'Deepcar · não consigo entrar')} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-xl border seam bg-bench-3 px-4 text-[14px] text-ink-1">Falar no WhatsApp</a>
                </div>
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-ink-3">
            Ainda não tem conta?{' '}
            <Link to="/cadastro" className="text-trace hover:text-trace-hi">Criar conta grátis</Link>
          </p>
        </div>
      </section>
    </div>
  )
}
