// /obrigado: para onde a Cakto manda o comprador depois de pagar (produto → página de upsell = esta URL).
// Quem pagou com a sessão aberta neste navegador entra direto na plataforma assim que o webhook libera o plano
// (conferimos a sessão a cada 3 s). Sem sessão (outro navegador, comprou sem conta) a tela explica o próximo passo.
// O redirect é só conforto: quem LIBERA o plano é o webhook (api/webhooks/cakto.js), nunca esta página.
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, Loader2, LogIn } from 'lucide-react'
import { conferirSessao, type Session } from '../lib/auth'
import { linkSuporte } from '../lib/plano'
import { useTitulo } from '../lib/seo'

const NOME_PLANO = { pro: 'Pro', full: 'Full' } as const
const ESPERA_MS = 90_000 // Pix e cartão costumam liberar em segundos; depois disso não prendemos a pessoa aqui
const VAI_SOZINHO_MS = 4_000

type Estado =
  | { tipo: 'conferindo' }
  | { tipo: 'aguardando'; sessao: Session }
  | { tipo: 'liberado'; sessao: Session }
  | { tipo: 'demorando'; sessao: Session }
  | { tipo: 'sem-sessao' }

export default function Obrigado() {
  useTitulo('Pagamento recebido · Deepcar')
  const nav = useNavigate()
  const [estado, setEstado] = useState<Estado>({ tipo: 'conferindo' })

  useEffect(() => {
    let vivo = true
    let timer: ReturnType<typeof setTimeout>
    const inicio = Date.now()
    async function conferir() {
      const s = await conferirSessao()
      if (!vivo) return
      if (!s) return setEstado({ tipo: 'sem-sessao' })
      if (s.plano !== 'free') return setEstado({ tipo: 'liberado', sessao: s })
      if (Date.now() - inicio > ESPERA_MS) return setEstado({ tipo: 'demorando', sessao: s })
      setEstado({ tipo: 'aguardando', sessao: s })
      timer = setTimeout(conferir, 3000)
    }
    conferir()
    return () => { vivo = false; clearTimeout(timer) }
  }, [])

  // Plano liberado: entra sozinho na plataforma.
  useEffect(() => {
    if (estado.tipo !== 'liberado') return
    const t = setTimeout(() => nav('/app', { replace: true }), VAI_SOZINHO_MS)
    return () => clearTimeout(t)
  }, [estado.tipo, nav])

  return (
    <div className="schematic-grid flex min-h-screen flex-col bg-pit">
      <header className="border-b seam bg-bench-1">
        <div className="mx-auto flex h-16 max-w-xl items-center px-5">
          <img src="/brand/logo-h-light.png" alt="Deepcar" className="h-7 w-auto select-none" draggable={false} />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-md rounded-2xl border seam bg-bench-2 p-7 text-center sm:p-8" aria-live="polite">
          {(estado.tipo === 'conferindo' || estado.tipo === 'aguardando') && (
            <>
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-trace" aria-hidden />
              <h1 className="mt-5 text-2xl font-semibold tracking-tight">Pagamento recebido!</h1>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
                Estamos liberando o seu plano. Isso leva só alguns segundos, não feche esta página.
              </p>
            </>
          )}

          {estado.tipo === 'liberado' && (
            <>
              <CheckCircle2 className="mx-auto h-12 w-12 text-ok" aria-hidden />
              <h1 className="mt-5 text-2xl font-semibold tracking-tight">
                Plano {NOME_PLANO[estado.sessao.plano as 'pro' | 'full'] ?? ''} liberado!
              </h1>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
                Tudo pronto, {estado.sessao.nome.split(' ')[0]}. Você já vai entrar na plataforma.
              </p>
              <Link to="/app" replace className="btn-cta mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl text-[15px] font-semibold">
                Entrar na plataforma agora
              </Link>
            </>
          )}

          {estado.tipo === 'demorando' && (
            <>
              <CheckCircle2 className="mx-auto h-12 w-12 text-trace" aria-hidden />
              <h1 className="mt-5 text-2xl font-semibold tracking-tight">Recebemos a sua compra</h1>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
                A confirmação do pagamento está levando um pouco mais que o normal. Pode entrar: o plano é liberado
                sozinho assim que confirmar, e você recebe uma mensagem no WhatsApp.
              </p>
              <Link to="/app" replace className="btn-cta mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl text-[15px] font-semibold">
                Entrar na plataforma
              </Link>
              <a href={linkSuporte('Deepcar · minha compra')} target="_blank" rel="noreferrer" className="mt-3 inline-block text-[14px] text-ink-3 underline-offset-4 hover:text-ink-1 hover:underline">
                Falar com o suporte
              </a>
            </>
          )}

          {estado.tipo === 'sem-sessao' && (
            <>
              <CheckCircle2 className="mx-auto h-12 w-12 text-ok" aria-hidden />
              <h1 className="mt-5 text-2xl font-semibold tracking-tight">Pagamento recebido!</h1>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
                O plano já está liberado no <b className="text-ink-1">e-mail que você usou na compra</b>. Se ainda não tinha
                conta, ela foi criada agora: <b className="text-ink-1">abra o e-mail da Deepcar e toque em "Criar minha senha e
                entrar"</b>.
              </p>
              <Link
                to="/login"
                state={{ from: '/app', aviso: 'Pagamento recebido! Entre com o e-mail usado na compra para acessar o seu plano.' }}
                className="btn-cta mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-semibold"
              >
                <LogIn className="h-4 w-4" aria-hidden /> Já tenho conta, entrar
              </Link>
              <p className="mt-3 text-[13px] leading-relaxed text-ink-3">
                Não chegou o e-mail? Olhe o spam ou use "Esqueci a senha" na tela de entrar, com o e-mail da compra.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
