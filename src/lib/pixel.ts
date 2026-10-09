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

const VISITANTE = 'deepcar.visitante'
/**
 * Id anônimo e fixo deste navegador. Vai no pixel como external_id desde a primeira visita e o servidor manda o mesmo
 * no cadastro, no checkout e na compra (api/_lib/meta.js): assim a Meta liga as visitas anônimas à pessoa.
 * Não identifica ninguém sozinho (é um sorteio).
 */
export function visitanteId(): string | undefined {
  try {
    let id = localStorage.getItem(VISITANTE)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(VISITANTE, id)
    }
    return id
  } catch {
    return undefined // modo anônimo / armazenamento bloqueado
  }
}

type Correspondencia = { email?: string; whatsapp?: string | null; nome?: string }

/**
 * "Correspondência avançada" do pixel: sem ela a Meta recebe PageView e Contact sem nada que ligue a uma pessoa
 * (qualidade 6,1/10 em 07/10/2026). O fbevents.js normaliza e faz o sha-256 de tudo antes de enviar.
 * E-mail, WhatsApp e nome só existem para quem já tem conta neste navegador (retrato em deepcar.perfil).
 */
function correspondencia(extra: Correspondencia = {}) {
  let perfil: Correspondencia = {}
  try {
    perfil = JSON.parse(localStorage.getItem('deepcar.perfil') ?? '{}') ?? {}
  } catch { /* sem perfil */ }
  const p = { ...perfil, ...extra }
  const [fn, ...resto] = String(p.nome ?? '').trim().toLowerCase().split(/\s+/)
  const ph = String(p.whatsapp ?? '').replace(/\D/g, '')
  const dados: Record<string, string> = { country: 'br' }
  const v = visitanteId()
  if (v) dados.external_id = v
  if (p.email) dados.em = String(p.email).trim().toLowerCase()
  if (ph) dados.ph = ph.length <= 11 ? `55${ph}` : ph
  if (fn) dados.fn = fn
  if (resto.length) dados.ln = resto[resto.length - 1]
  return dados
}

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
  fbq('init', PIXEL_ID, correspondencia())
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

/**
 * Clique em "Assinar" (09/10/2026, funil página → checkout): InitiateCheckout no navegador com o mesmo eventID que o
 * servidor manda pela API de Conversões (plano.ts → avisarCheckout); a Meta junta os dois. Só sai onde o pixel já
 * carregou (páginas públicas); dentro do /app vai só o do servidor.
 */
export function iniciarCheckout(eventoId: string, dados: { plano: string; ciclo: string; valor?: number }) {
  window.fbq?.('track', 'InitiateCheckout', {
    value: dados.valor, currency: 'BRL', content_name: `${dados.plano} ${dados.ciclo}`,
    content_ids: [`${dados.plano}-${dados.ciclo}`], content_type: 'product', num_items: 1,
  }, { eventID: eventoId })
}

/**
 * Leitura da página de vendas para a Meta (09/10/2026): eventos personalizados para montar públicos de remarketing
 * ("rolou 75% e não comprou", "viu os planos"). `RolagemPagina` { pct: 25|50|75|100 } e `ViuSecao` { secao }.
 * Só onde o pixel já carregou (página pública); não leva nada da pessoa além do que o pixel já tem.
 */
export function eventoLeitura(nome: 'RolagemPagina' | 'ViuSecao', dados: Record<string, string | number>) {
  window.fbq?.('trackCustom', nome, dados)
}

/** A seção de planos da página de vendas apareceu na tela (uma vez por página vista): ViewContent. */
export function viuPlanos() {
  window.fbq?.('track', 'ViewContent', { content_name: 'planos', content_type: 'product_group' })
}

/** Conta criada. Só existe se o pixel já foi carregado (o cadastro é página pública). */
export function cadastroConcluido(eventoId: string, pessoa?: Correspondencia) {
  // agora a Meta pode receber os dados da pessoa também pelo navegador (o servidor já manda os mesmos)
  if (pessoa) window.fbq?.('init', PIXEL_ID, correspondencia(pessoa))
  window.fbq?.('track', 'CompleteRegistration', {}, { eventID: eventoId })
  // cadastro também é o Lead do funil (o CRM manda Contact para quem só chamou no WhatsApp). Os dois juntos porque a
  // campanha publicada otimiza por CompleteRegistration e a Meta não deixa trocar o evento de um conjunto publicado.
  window.fbq?.('track', 'Lead', {}, { eventID: `lead-${eventoId}` })
}
