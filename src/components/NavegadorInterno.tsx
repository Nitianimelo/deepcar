// Navegador de dentro do Instagram/Facebook (07/10/2026). Metade dos cadastros vinha de anúncio e ficava nesse navegador:
// o login se perde quando a pessoa fecha, o checkout é ruim e ninguém pagou por ali.
// Decisão do dono (08/10): NADA na página de vendas nem no cadastro (perde conversão). O aviso aparece só DEPOIS do
// cadastro, dentro da plataforma (/app com sessão), e a pessoa pode fechar e seguir navegando:
//  - iPhone: "Abrir no Safari" (esquema x-safari-https do iOS 17+); se o Instagram bloquear, a instrução do menu "···"
//    e o botão de copiar o link;
//  - Android: "Baixar o app" (Play Store) ou "Abrir no Chrome" (intent:// com o Chrome, e a própria página de reserva).
// O Safari/Chrome não levam a sessão do Instagram: o link vai para /login com o e-mail preenchido e o aviso de conta
// criada. Uma vez por visita.
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Check, Copy, Download, ExternalLink, X } from 'lucide-react'
import { registrar } from '../lib/log'
import { getSession } from '../lib/auth'

const PLAY = 'https://play.google.com/store/apps/details?id=deepcar.app.android'
const CHAVE = 'deepcar.iab.dispensado'

function detectarInterno(ua = navigator.userAgent) {
  const app = /Instagram/i.test(ua) ? 'Instagram' : /FBAN|FBAV|FB_IAB|FBIOS|FB4A/.test(ua) ? 'Facebook' : /musical_ly|TikTok|BytedanceWebview/i.test(ua) ? 'TikTok' : null
  if (!app) return null
  const so = /iPhone|iPad|iPod/.test(ua) ? 'ios' : /Android/.test(ua) ? 'android' : 'outro'
  return { app, so } as const
}

/** Para onde mandar: a tela de entrar, com o e-mail da conta recém-criada (o outro navegador não tem a sessão). */
function destino(email: string) {
  const caminho = `/login?conta=criada&email=${encodeURIComponent(email)}`
  return { host: location.host, caminho, url: `${location.protocol}//${location.host}${caminho}` }
}

export function NavegadorInterno() {
  const { pathname } = useLocation()
  const [info] = useState(() => (typeof navigator === 'undefined' ? null : detectarInterno()))
  const [aberto, setAberto] = useState(false)
  const [copiado, setCopiado] = useState(false)

  // só dentro da plataforma, já cadastrado (nunca na página de vendas, no cadastro ou no login)
  const sessao = pathname.startsWith('/app') ? getSession() : null
  const permitido = !!info && !!sessao
  useEffect(() => {
    if (!permitido) return
    let ja = false
    try { ja = sessionStorage.getItem(CHAVE) === '1' } catch { /* sem armazenamento */ }
    if (ja) return
    const t = window.setTimeout(() => { setAberto(true); registrar('navegador_interno', { app: info!.app, so: info!.so, acao: 'mostrado' }) }, 600)
    return () => window.clearTimeout(t)
  }, [permitido]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!aberto || !info) return null
  const d = destino(sessao?.email ?? '')
  const anotar = (acao: string) => registrar('navegador_interno', { app: info.app, so: info.so, acao })
  const fechar = (acao = 'continuou_aqui') => {
    anotar(acao)
    try { sessionStorage.setItem(CHAVE, '1') } catch { /* sem armazenamento */ }
    setAberto(false)
  }
  const chrome = `intent://${d.host}${d.caminho}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(d.url)};end`
  const playIntent = `intent://details?id=deepcar.app.android#Intent;scheme=market;package=com.android.vending;S.browser_fallback_url=${encodeURIComponent(PLAY)};end`
  const safari = `x-safari-https://${d.host}${d.caminho}`
  async function copiar() {
    try { await navigator.clipboard.writeText(d.url); setCopiado(true); anotar('copiou_link') } catch { /* navegador sem área de transferência */ }
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="iab-titulo" className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl border seam bg-bench-2 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <h2 id="iab-titulo" className="text-[19px] font-semibold leading-snug tracking-tight text-ink-1">
            {info.so === 'ios' ? 'Conta criada! Agora abra no Safari' : 'Conta criada! Agora use no app ou no Chrome'}
          </h2>
          <button type="button" onClick={() => fechar()} aria-label="Fechar" className="-mr-1 -mt-1 grid h-10 w-10 flex-none place-items-center rounded-lg text-ink-3"><X size={18} /></button>
        </div>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
          Você está no navegador do {info.app}: quando ele fecha, você sai da conta.
          {info.so === 'ios' ? ' No Safari ela fica salva' : ' No app ou no Chrome ela fica salva'}: é só entrar com o seu e-mail e a senha que acabou de criar.
        </p>

        {info.so === 'ios' ? (
          <>
            <a href={safari} onClick={() => anotar('abrir_safari')} className="btn-primary mt-4 inline-flex !h-12 w-full items-center justify-center gap-2 text-[15.5px]">
              <ExternalLink size={17} /> Abrir no Safari
            </a>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-3">
              Se não abrir: toque nos <b className="font-semibold text-ink-1">···</b> no canto de cima e escolha
              <b className="font-semibold text-ink-1"> Abrir no navegador externo</b>.
            </p>
            <button type="button" onClick={copiar} className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border seam bg-bench-3 text-[14.5px] text-ink-1">
              {copiado ? <><Check size={16} className="text-ok" /> Link copiado: cole no Safari</> : <><Copy size={16} /> Copiar o link</>}
            </button>
          </>
        ) : (
          <>
            <a href={info.so === 'android' ? playIntent : PLAY} onClick={() => anotar('baixar_app')} className="btn-primary mt-4 inline-flex !h-12 w-full items-center justify-center gap-2 text-[15.5px]">
              <Download size={17} /> Baixar o app Deepcar (grátis)
            </a>
            {info.so === 'android' && (
              <a href={chrome} onClick={() => anotar('abrir_chrome')} className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border seam bg-bench-3 text-[15px] text-ink-1">
                <ExternalLink size={16} /> Abrir no Chrome
              </a>
            )}
          </>
        )}
        <button type="button" onClick={() => fechar()} className="mt-3 w-full py-2 text-[13.5px] text-ink-4 underline-offset-2 hover:underline">Continuar aqui mesmo</button>
      </div>
    </div>
  )
}
