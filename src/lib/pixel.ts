// Pixel da Meta (anúncios do Facebook/Instagram). Só roda nas páginas públicas: a URL do app leva a placa
// consultada (/app/veiculo/ABC1234) e a do link compartilhado leva o token (/c/...), e nada disso vai para a Meta.
// Por isso o script só é baixado na primeira página pública e a captura automática do pixel fica desligada
// (troca de rota e cliques): quem decide o que é enviado é `rotaRastreavel` + as chamadas abaixo.
// Mudou o que é enviado? Atualize a política de privacidade (src/pages/Privacidade.tsx) junto.

const PIXEL_ID = '980567241730551'

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void
  queue: unknown[]
  push: Fbq
  loaded: boolean
  version: string
  disablePushState?: boolean
  allowDuplicatePageViews?: boolean
}

declare global {
  interface Window { fbq?: Fbq; _fbq?: Fbq }
}

const PRIVADAS = ['/app', '/admin', '/c/']

export function rotaRastreavel(caminho: string) {
  return !PRIVADAS.some((p) => caminho === p || caminho.startsWith(p.endsWith('/') ? p : `${p}/`))
}

/** Snippet oficial da Meta, reescrito sem o `eval` de string e com a captura automática desligada. */
function carregar(): Fbq | null {
  if (typeof window === 'undefined') return null
  if (window.fbq) return window.fbq
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args)
    else fbq.queue.push(args)
  } as Fbq
  fbq.push = fbq
  fbq.loaded = true
  fbq.version = '2.0'
  fbq.queue = []
  fbq.disablePushState = true // as trocas de rota do React passam por `paginaVista`, não pelo pixel
  fbq.allowDuplicatePageViews = true // sem isso o fbevents.js descarta todo PageView depois do primeiro
  window.fbq = fbq
  window._fbq = fbq
  const s = document.createElement('script')
  s.async = true
  s.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.appendChild(s)
  fbq('set', 'autoConfig', false, PIXEL_ID) // sem captura automática de cliques e formulários
  fbq('init', PIXEL_ID)
  return fbq
}

export function paginaVista(caminho: string) {
  if (!rotaRastreavel(caminho)) return
  carregar()?.('track', 'PageView')
}

/** Id que o navegador e o servidor (api/_lib/meta.js) mandam no mesmo evento: a Meta junta os dois e conta um. */
export function novoEventoId() {
  return `cad-${crypto.randomUUID()}`
}

/** Clique num botão de WhatsApp da landing. Só conta se o pixel já carregou (página pública). */
export function contato(onde: string) {
  window.fbq?.('track', 'Contact', { content_name: onde })
}

/** Conta criada. Só existe se o pixel já foi carregado (o cadastro é página pública). */
export function cadastroConcluido(eventoId: string) {
  window.fbq?.('track', 'CompleteRegistration', {}, { eventID: eventoId })
}
