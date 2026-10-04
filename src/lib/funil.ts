// Funil dentro da plataforma (só o site; o app Android tem o próprio código):
//  - marcos de ativação que vão para a conta (POST /api/sessao { evento: 'ativacao' }): boas-vindas concluídas e
//    primeiro esquema aberto. A primeira placa o servidor marca sozinho (api/placa). Aparecem no /admin.
//  - "momento de valor": depois da primeira placa encontrada ou do 3º esquema aberto, o convite para assinar
//    (components/Funil.tsx) fica pendente e aparece no início ou na placa, nunca por cima do visualizador.
// Tudo por conta e por aparelho no localStorage; sem armazenamento, nada aparece (melhor que repetir sempre).

export type Marco = 'boas_vindas' | 'esquema'

const k = (email: string, chave: string) => `deepcar.funil.${email.toLowerCase()}.${chave}`

function ler(email: string, chave: string) {
  try { return localStorage.getItem(k(email, chave)) } catch { return 'sem-armazenamento' }
}
function gravar(email: string, chave: string, valor: string) {
  try { localStorage.setItem(k(email, chave), valor) } catch { /* sem armazenamento */ }
}

/** Avisa o servidor uma vez por aparelho (o servidor guarda só a primeira data). */
export function marcarAtivacao(email: string, marco: Marco) {
  if (ler(email, `marco.${marco}`)) return
  gravar(email, `marco.${marco}`, '1')
  try {
    void fetch('/api/sessao', {
      method: 'POST',
      keepalive: true,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evento: 'ativacao', marco }),
    }).catch(() => {})
  } catch { /* sem fetch keepalive: fica sem o marco */ }
}

export const boasVindasVistas = (email: string) => !!ler(email, 'boas_vindas')
export const marcarBoasVindas = (email: string) => { gravar(email, 'boas_vindas', new Date().toISOString()); marcarAtivacao(email, 'boas_vindas') }

export const dicaEsquemaVista = (email: string) => !!ler(email, 'dica_esquema')
export const marcarDicaEsquema = (email: string) => gravar(email, 'dica_esquema', '1')

const EVENTO = 'deepcar:momento-de-valor'
const UM_DIA = 24 * 60 * 60 * 1000

/** Placa encontrada ou esquema aberto: conta e, no ponto certo, deixa o convite pendente. */
export function momentoDeValor(email: string, tipo: 'placa' | 'esquema') {
  const n = Number(ler(email, `conta.${tipo}`) ?? 0) + 1
  gravar(email, `conta.${tipo}`, String(n))
  if (tipo === 'esquema') marcarAtivacao(email, 'esquema')
  const chegou = tipo === 'placa' ? n === 1 : n === 3
  if (!chegou) return
  // no máximo um convite por dia, e só depois das boas-vindas (não empilha folhas no primeiro minuto)
  const ultimo = Number(ler(email, 'convite.em') ?? 0)
  if (Date.now() - ultimo < UM_DIA || !boasVindasVistas(email)) return
  gravar(email, 'convite.pendente', tipo)
  window.dispatchEvent(new Event(EVENTO))
}

export const convitePendente = (email: string) => {
  const v = ler(email, 'convite.pendente')
  return v === 'placa' || v === 'esquema' ? v : null
}
export function conviteMostrado(email: string) {
  try { localStorage.removeItem(k(email, 'convite.pendente')) } catch { /* sem armazenamento */ }
  gravar(email, 'convite.em', String(Date.now()))
}
export const ouvirMomentoDeValor = (fn: () => void) => {
  window.addEventListener(EVENTO, fn)
  return () => window.removeEventListener(EVENTO, fn)
}
