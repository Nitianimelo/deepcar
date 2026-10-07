// Navegador de dentro do Instagram/Facebook (07/10/2026). Metade dos cadastros vinha de anúncio e ficava nesse navegador:
// o login se perde quando a pessoa fecha, o checkout é ruim e ninguém pagou por ali. Então, na chegada:
//  - iPhone: "Abrir no Safari" (esquema x-safari-https do iOS 17+), já no cadastro; se o Instagram bloquear,
//    a instrução de abrir pelo menu "···" e o botão de copiar o link;
//  - Android: "Baixar o app" (Play Store) ou "Abrir no Chrome" (intent:// com o Chrome, e a própria página de reserva).
// O endereço vai com a query de campanha (utm/fbclid), para a origem do cadastro não se perder. Uma vez por visita.
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Check, Copy, Download, ExternalLink, X } from 'lucide-react'
import { registrar } from '../lib/log'

const PLAY = 'https://play.google.com/store/apps/details?id=deepcar.app.android'
const CHAVE = 'deepcar.iab.dispensado'
const ROTAS_NAO = ['/admin', '/c/', '/obrigado', '/privacidade', '/excluir-conta']

function detectarInterno(ua = navigator.userAgent) {
  const app = /Instagram/i.test(ua) ? 'Instagram' : /FBAN|FBAV|FB_IAB|FBIOS|FB4A/.test(ua) ? 'Facebook' : /musical_ly|TikTok|BytedanceWebview/i.test(ua) ? 'TikTok' : null
  if (!app) return null
  const so = /iPhone|iPad|iPod/.test(ua) ? 'ios' : /Android/.test(ua) ? 'android' : 'outro'
  return { app, so } as const
}

/** Para onde mandar: da landing, direto ao cadastro; das outras páginas, a mesma. Sempre com a query da campanha. */
function destino(pathname: string, search: string) {
  const caminho = pathname === '/' ? '/cadastro' : pathname
  return { host: location.host, caminho: caminho + search, url: `${location.protocol}//${location.host}${caminho}${search}` }
}

export function NavegadorInterno() {
  const { pathname, search } = useLocation()
  const [info] = useState(() => (typeof navigator === 'undefined' ? null : detectarInterno()))
  const [aberto, setAberto] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const permitido = !!info && !ROTAS_NAO.some((r) => pathname.startsWith(r))
  useEffect(() => {
    if (!permitido) return
    let ja = false
    try { ja = sessionStorage.getItem(CHAVE) === '1' } catch { /* sem armazenamento */ }
    if (ja) return
    const t = window.setTimeout(() => { setAberto(true); registrar('navegador_interno', { app: info!.app, so: info!.so, acao: 'mostrado' }) }, 600)
    return () => window.clearTimeout(t)
  }, [permitido]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!aberto || !info) return null
  const d = destino(pathname, search)
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
            {info.so === 'ios' ? 'Abra a Deepcar no Safari' : 'Use a Deepcar no app ou no Chrome'}
          </h2>
          <button type="button" onClick={() => fechar()} aria-label="Fechar" className="-mr-1 -mt-1 grid h-10 w-10 flex-none place-items-center rounded-lg text-ink-3"><X size={18} /></button>
        </div>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
          Você está no navegador do {info.app}. Aqui o login se perde quando você fecha, e o teste grátis fica pela metade.
          {info.so === 'ios' ? ' No Safari você cria a conta e ela continua salva.' : ' No app ou no Chrome a sua conta fica salva.'}
        </p>

        {info.so === 'ios' ? (
          <>
            <a href={safari} onClick={() => anotar('abrir_safari')} className="btn-primary mt-4 inline-flex !h-12 w-full items-center justify-center gap-2 text-[15.5px]">
              <ExternalLink size={17} /> Abrir no Safari e me cadastrar
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
