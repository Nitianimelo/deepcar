import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, AtSign, Check, CircleAlert, CircleCheck, Eye, EyeOff, LockKeyhole, Smartphone, Timer, UserRound } from 'lucide-react'
import { registrar, type ErroApi } from '../lib/auth'
import { carregarIndice, fmt, resumoAcervo, useCarga } from '../lib/acervo'
import { MINUTOS_FREE } from '../lib/plano'
import {
  emailValido,
  forcaSenha,
  mascararWhatsapp,
  nomeValido,
  SENHA_MINIMA,
  whatsappParaApi,
  whatsappValido,
} from '../lib/validacao'
import { CircuitArt } from '../components/CircuitArt'
import { TracePad } from '../components/TracePad'
import { CarBlueprint } from '../components/CarBlueprint'

type NomeCampo = 'nome' | 'email' | 'whatsapp' | 'senha'
type Form = Record<NomeCampo, string>

const VAZIO: Form = { nome: '', email: '', whatsapp: '', senha: '' }

/** Uma mensagem por campo — nula quando está certo. Mesmas regras de api/_lib/validar.js. */
function validar(d: Form): Record<NomeCampo, string | null> {
  return {
    nome: !d.nome.trim()
      ? 'Informe seu nome.'
      : nomeValido(d.nome)
        ? null
        : 'Use seu nome, sem números nem e-mail.',
    email: !d.email.trim() ? 'Informe seu e-mail.' : emailValido(d.email) ? null : 'E-mail incompleto — falta algo como @oficina.com.br.',
    whatsapp: !d.whatsapp.trim()
      ? 'Informe seu WhatsApp.'
      : whatsappValido(d.whatsapp)
        ? null
        : 'Precisa ser DDD + celular com o 9 na frente.',
    senha: d.senha.length < SENHA_MINIMA ? `Pelo menos ${SENHA_MINIMA} caracteres.` : null,
  }
}

export default function Cadastro() {
  const nav = useNavigate()
  const loc = useLocation()
  const [d, setD] = useState<Form>(VAZIO)
  const [tocado, setTocado] = useState<Partial<Record<NomeCampo, boolean>>>({})
  const [mostrar, setMostrar] = useState(false)
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [erroServidor, setErroServidor] = useState<Partial<Record<NomeCampo, string>>>({})
  const [enviando, setEnviando] = useState(false)

  // os números do painel vêm do catálogo real, como na landing
  const indice = useCarga(() => carregarIndice(), [])
  const acervo = resumoAcervo(indice.estado === 'ok' ? indice.dados : null)

  const erros = useMemo(() => validar(d), [d])
  const tudoCerto = !erros.nome && !erros.email && !erros.whatsapp && !erros.senha
  const forca = forcaSenha(d.senha)

  function mudar(campo: NomeCampo, valor: string) {
    setD((v) => ({ ...v, [campo]: campo === 'whatsapp' ? mascararWhatsapp(valor) : valor }))
    setErroServidor((v) => ({ ...v, [campo]: undefined }))
    setErroGeral(null)
  }

  /** Erro visível: só depois de sair do campo (ou tentar enviar), para não brigar com quem digita. */
  const erroDe = (campo: NomeCampo) => erroServidor[campo] ?? (tocado[campo] ? erros[campo] : null)
  const okDe = (campo: NomeCampo) => !erros[campo] && !erroServidor[campo] && d[campo].length > 0

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTocado({ nome: true, email: true, whatsapp: true, senha: true })
    if (!tudoCerto) return
    setErroGeral(null)
    setEnviando(true)
    try {
      await registrar({
        nome: d.nome.trim().replace(/\s+/g, ' '),
        email: d.email.trim(),
        whatsapp: whatsappParaApi(d.whatsapp),
        senha: d.senha,
      })
      // veio da busca por placa na landing? cai direto no veículo consultado
      const destino = (loc.state as { from?: string } | null)?.from ?? '/app'
      nav(destino, { replace: true })
    } catch (err) {
      const e2 = err as ErroApi
      const campo = e2.campo as NomeCampo | undefined
      if (campo && campo in VAZIO) setErroServidor((v) => ({ ...v, [campo]: e2.message }))
      else setErroGeral(e2.message || 'Não foi possível criar a conta.')
    } finally {
      setEnviando(false)
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
          <p className="code text-[11px] tracking-[0.22em] uppercase text-ink-3 mb-4">Criar conta</p>
          <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-ink-1">
            Abra o esquema certo antes de encostar o multímetro.
          </h1>
          <ul className="mt-6 space-y-2.5">
            {[
              `${fmt(acervo.esquemas)} esquemas: injeção leve e diesel, ABS, elétrica e câmbio`,
              `${acervo.montadoras} montadoras, da linha leve ao caminhão`,
              'Consulta por placa, navegação por componente e impressão em A4',
            ].map((i) => (
              <li key={i} className="flex items-start gap-2.5 text-[15px] leading-relaxed text-ink-2">
                <Check size={16} className="mt-[5px] flex-none text-trace" /> {i}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative code text-xs text-ink-4">© {new Date().getFullYear()} Deepcar · Grupo Arcco</p>
      </section>

      {/* Formulário */}
      {/* min-w-0 + max-w com min(): sem isso a coluna do grid assume a largura máxima do
          cartão e a tela vaza para a direita no celular */}
      <section className="flex min-w-0 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[min(440px,100%)]">
          <img src="/brand/logo-h-light.png" alt="Deepcar" className="lg:hidden w-44 mb-8 select-none" draggable={false} />

          <div className="relative rounded-2xl border seam bg-bench-2 p-7 sm:p-8">
            <TracePad className="trace-pad top-[38px] left-[-14px] absolute" />
            <h2 className="text-2xl font-semibold tracking-tight">Criar conta</h2>
            <p className="mt-1.5 text-ink-3 text-sm">Leva menos de um minuto e não pede cartão.</p>

            <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
              <Campo rotulo="Seu nome" erro={erroDe('nome')} ok={okDe('nome')}>
                <UserRound size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-4" />
                <input
                  className="field pl-11 pr-11"
                  type="text"
                  autoComplete="name"
                  autoFocus
                  placeholder="como querem te chamar"
                  value={d.nome}
                  onChange={(e) => mudar('nome', e.target.value)}
                  onBlur={() => setTocado((t) => ({ ...t, nome: true }))}
                  aria-invalid={!!erroDe('nome')}
                  required
                />
              </Campo>

              <Campo rotulo="E-mail" erro={erroDe('email')} ok={okDe('email')} dica="É por ele que você entra.">
                <AtSign size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-4" />
                <input
                  className="field pl-11 pr-11"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="voce@oficina.com.br"
                  value={d.email}
                  onChange={(e) => mudar('email', e.target.value)}
                  onBlur={() => setTocado((t) => ({ ...t, email: true }))}
                  aria-invalid={!!erroDe('email')}
                  required
                />
              </Campo>

              <Campo rotulo="WhatsApp" erro={erroDe('whatsapp')} ok={okDe('whatsapp')} dica="Usamos para suporte e aviso de assinatura.">
                <Smartphone size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-4" />
                <input
                  className="field pl-11 pr-11"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="(11) 98765-4321"
                  maxLength={16}
                  value={d.whatsapp}
                  onChange={(e) => mudar('whatsapp', e.target.value)}
                  onBlur={() => setTocado((t) => ({ ...t, whatsapp: true }))}
                  aria-invalid={!!erroDe('whatsapp')}
                  required
                />
              </Campo>

              <Campo rotulo="Senha" erro={erroDe('senha')} ok={okDe('senha')} comBotao>
                <LockKeyhole size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-4" />
                <input
                  className="field pl-11 pr-12"
                  type={mostrar ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder={`pelo menos ${SENHA_MINIMA} caracteres`}
                  value={d.senha}
                  onChange={(e) => mudar('senha', e.target.value)}
                  onBlur={() => setTocado((t) => ({ ...t, senha: true }))}
                  aria-invalid={!!erroDe('senha')}
                  required
                />
                <button
                  type="button"
                  onClick={() => setMostrar((v) => !v)}
                  aria-label={mostrar ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-md text-ink-3 hover:text-ink-1 hover:bg-bench-3"
                >
                  {mostrar ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </Campo>

              {/* Medidor: só aparece quando já há o que medir */}
              {d.senha.length > 0 && (
                <div className="flex items-center gap-3 -mt-1">
                  <div className="flex flex-1 gap-1.5">
                    {[1, 2, 3].map((n) => (
                      <span
                        key={n}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          forca.nivel >= n
                            ? forca.nivel === 1
                              ? 'bg-fault'
                              : forca.nivel === 2
                                ? 'bg-warn'
                                : 'bg-ok'
                            : 'bg-bench-3'
                        }`}
                      />
                    ))}
                  </div>
                  <span className={`code text-[11px] ${forca.nivel === 0 ? 'text-ink-4' : forca.nivel === 1 ? 'text-fault' : forca.nivel === 2 ? 'text-warn' : 'text-ok'}`}>
                    {forca.rotulo}
                  </span>
                </div>
              )}

              {/* O que a conta grátis dá — dito antes de criar, não depois */}
              <div className="flex items-start gap-3 rounded-xl border seam bg-well/60 px-4 py-3">
                <Timer size={17} className="mt-[2px] flex-none text-trace" />
                <p className="text-[13px] leading-relaxed text-ink-3">
                  Você começa no <b className="font-medium text-ink-2">plano Free</b>: {MINUTOS_FREE} minutos de acesso
                  para conhecer o acervo. Depois disso é só assinar ou falar com a gente para continuar.
                </p>
              </div>

              {erroGeral && (
                <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-fault/30 bg-fault/10 px-3.5 py-2.5 text-sm text-fault">
                  <CircleAlert size={16} className="mt-[2px] flex-none" /> {erroGeral}
                </div>
              )}

              <button type="submit" className="btn-primary w-full" disabled={enviando}>
                {enviando ? 'Criando…' : (
                  <span className="inline-flex items-center gap-2">
                    Criar conta grátis <ArrowRight size={17} />
                  </span>
                )}
              </button>

              <p className="text-center text-[12px] leading-relaxed text-ink-4">
                Ao criar a conta você concorda em receber avisos sobre o serviço no e-mail e no WhatsApp informados.
              </p>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-ink-3">
            Já tem conta? <Link to="/login" className="text-trace hover:text-trace-hi">Entrar</Link>
          </p>
        </div>
      </section>
    </div>
  )
}

/** Rótulo + campo + estado. O ícone da esquerda e o input vêm como children. */
function Campo({
  rotulo,
  dica,
  erro,
  ok,
  comBotao = false,
  children,
}: {
  rotulo: string
  dica?: string
  erro: string | null
  ok: boolean
  /** true quando o campo já tem um botão à direita (o olho da senha): o certinho se afasta */
  comBotao?: boolean
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{rotulo}</span>
      <span className="relative block">
        {children}
        {ok && (
          <CircleCheck
            size={16}
            className={`pointer-events-none absolute ${comBotao ? 'right-12' : 'right-4'} top-1/2 -translate-y-1/2 text-ok opacity-80`}
          />
        )}
      </span>
      {erro ? (
        <span className="mt-1.5 flex items-start gap-1.5 text-[12.5px] text-fault">
          <CircleAlert size={14} className="mt-[2px] flex-none" /> {erro}
        </span>
      ) : dica ? (
        <span className="mt-1.5 block text-[12.5px] text-ink-4">{dica}</span>
      ) : null}
    </label>
  )
}
