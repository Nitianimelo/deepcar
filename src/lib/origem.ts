// De onde a pessoa chegou (UTM, fbclid, gclid, página de entrada), guardado no navegador até o cadastro.
// Vale o PRIMEIRO toque que traz campanha; uma visita direta depois não apaga a campanha que trouxe a pessoa.
// O fbclid é a exceção: vale o clique MAIS RECENTE, porque é com ele que a Meta liga a conversão ao anúncio
// (vira o `fbc` que o servidor manda na API de Conversões, mesmo quando o Safari apaga o cookie _fbc em 7 dias).
// Só roda em páginas públicas (mesmo filtro do pixel). Mudou o que é guardado? Atualize src/pages/Privacidade.tsx.
import { rotaRastreavel } from './pixel'

const CHAVE = 'deepcar.origem'
const CAMPOS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'] as const

export type Origem = Partial<Record<(typeof CAMPOS)[number], string>> & {
  entrada?: string
  referrer?: string
  em?: string
  /** fb.1.<ms>.<fbclid>: formato do cookie _fbc */
  fbc?: string
}

function ler(): Origem | null {
  try {
    const v = localStorage.getItem(CHAVE)
    return v ? (JSON.parse(v) as Origem) : null
  } catch {
    return null
  }
}

const temCampanha = (o: Origem | null) => !!o && CAMPOS.some((c) => o[c])

/** Chamada a cada troca de página pública. */
export function registrarChegada(caminho: string) {
  if (!rotaRastreavel(caminho)) return
  try {
    const q = new URLSearchParams(location.search)
    const agora: Origem = {}
    for (const c of CAMPOS) {
      const v = q.get(c)?.trim()
      if (v) agora[c] = v.slice(0, 200)
    }
    const salvo = ler()
    let novo = salvo
    if (!salvo || (!temCampanha(salvo) && temCampanha(agora))) {
      let referrer: string | undefined
      try { referrer = document.referrer ? new URL(document.referrer).host : undefined } catch { /* referrer estranho */ }
      if (referrer === location.host) referrer = undefined
      novo = { ...agora, entrada: caminho.slice(0, 120), referrer, em: new Date().toISOString() }
    }
    if (agora.fbclid && novo) novo = { ...novo, fbc: `fb.1.${Date.now()}.${agora.fbclid}` }
    if (novo !== salvo) localStorage.setItem(CHAVE, JSON.stringify(novo))
  } catch { /* sem armazenamento: segue sem origem */ }
}

/** O que vai junto no cadastro (POST /api/registrar). */
export const origemParaCadastro = () => ler() ?? undefined
