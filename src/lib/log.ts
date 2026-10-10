// Registro do que a pessoa faz (páginas, buscas, placas, esquemas, planos, erros), salvo no nosso banco e visto no
// /admin → Logs. Pedido do dono (07/10/2026): mapear onde o cadastro trava, sem sobrecarregar a Vercel. Por isso os
// eventos ficam numa fila e vão em LOTE (até 40), a cada 30 s ou quando a aba some (sendBeacon), não um por clique.
// Leve de propósito: entra no pacote da landing. Nada de senha, e-mail digitado ou dado de pagamento aqui.
import { visitanteId } from './pixel'

type Item = { tipo: string; detalhe?: Record<string, unknown>; rota: string; em: string }

const fila: Item[] = []
let timer: number | undefined

function enviar(usarBeacon: boolean) {
  if (timer) { window.clearTimeout(timer); timer = undefined }
  if (!fila.length) return
  const itens = fila.splice(0, 40)
  const corpo = JSON.stringify({ evento: 'log', visitante: visitanteId(), itens })
  try {
    if (usarBeacon && navigator.sendBeacon) {
      navigator.sendBeacon('/api/sessao', new Blob([corpo], { type: 'application/json' }))
    } else {
      void fetch('/api/sessao', { method: 'POST', keepalive: true, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: corpo }).catch(() => {})
    }
  } catch { /* sem rede: perde o lote, não atrapalha ninguém */ }
  if (fila.length) agendar()
}

function agendar() {
  if (!timer) timer = window.setTimeout(() => enviar(false), 30_000)
}

let ligado = false
function ligar() {
  if (ligado) return
  ligado = true
  // aba escondida / saindo: manda o que tiver (sendBeacon sobrevive ao fechar)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') enviar(true) })
  window.addEventListener('pagehide', () => enviar(true))
}

/** Anota um evento. `detalhe`: só o necessário (placa, termo, id do esquema, plano...). */
export function registrar(tipo: string, detalhe?: Record<string, unknown>) {
  try {
    ligar()
    // a rota nunca leva o código do link de senha (/redefinir-senha?t=…)
    fila.push({ tipo, detalhe, rota: (location.pathname + location.search).replace(/([?&]t=)[^&]+/, '$1oculto'), em: new Date().toISOString() })
    if (fila.length >= 40) enviar(false)
    else agendar()
  } catch { /* nunca quebra a tela */ }
}
