// Teste grátis por consultas (regra no servidor: api/_lib/consultas.js). Cada esquema aberto avisa o servidor, que
// conta e responde se pode abrir. A tela não mostra quantas consultas sobram (decisão do dono, 07/10/2026): quando
// acabam, o servidor encerra o teste e o resto que já existe cuida do bloqueio (esquema borrado, planos no início).

const SESSAO_MUDOU = 'deepcar:sessao-mudou'

/** Pede ao relógio do teste (useLimiteFree) para reconferir a sessão agora, sem esperar o intervalo. */
export const avisarSessaoMudou = () => window.dispatchEvent(new Event(SESSAO_MUDOU))

export function ouvirSessaoMudou(fn: () => void) {
  window.addEventListener(SESSAO_MUDOU, fn)
  return () => window.removeEventListener(SESSAO_MUDOU, fn)
}

/**
 * Esquema aberto por quem está no teste: true = pode ver. Falha de rede ou do servidor libera (melhor que travar quem
 * está com o carro na bancada); o corte que vale é o do servidor, na próxima conferência da sessão.
 */
export async function liberarEsquema(id: string): Promise<boolean> {
  try {
    const res = await fetch('/api/sessao', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evento: 'consulta', item: id }),
    })
    if (!res.ok) return true
    const { liberado } = (await res.json()) as { liberado?: boolean }
    if (liberado === false) {
      avisarSessaoMudou()
      return false
    }
    return true
  } catch {
    return true
  }
}
