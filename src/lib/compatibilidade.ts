// Quais esquemas do catálogo servem para o veículo consultado pela placa.
import { NAV, type SectionKey } from '../data/nav'
import type { Esquema } from './acervo'
import type { Veiculo } from './placa'

/* ── Ponto de extensão ───────────────────────────────────────────────
   Decide quais esquemas se aplicam ao veículo consultado.
   Hoje: casa montadora (com apelidos) + primeira palavra do modelo + ano dentro da produção.
   Substituir por regra própria (tabela de compatibilidade, API, etc.).  */
const APELIDOS: Record<string, string> = {
  vw: 'volkswagen', 'vw volkswagen': 'volkswagen', gm: 'chevrolet', 'gm chevrolet': 'chevrolet', chev: 'chevrolet',
  mercedes: 'mercedes benz', 'm benz': 'mercedes benz', mb: 'mercedes benz', citroen: 'citroen',
  'land rover': 'land rover', lr: 'land rover', 'jac motors': 'jac', 'caoa chery': 'chery', 'caoa hyundai': 'hyundai',
}
export const marcaCanonica = (s: string | null | undefined) => {
  const n = norm(s).replace(/-/g, ' ')
  return APELIDOS[n] ?? n
}

export function sistemasDisponiveis(v: Veiculo, esquemas: Esquema[]) {
  // bases de placa às vezes trazem "VW/GOL 1.6" no modelo e a marca vazia
  let marcaV = v.marca, modeloV = v.modelo ?? ''
  if (modeloV.includes('/')) {
    const [a, ...b] = modeloV.split('/')
    if (!marcaV || marcaCanonica(a) === marcaCanonica(marcaV)) { marcaV = marcaV || a; modeloV = b.join(' ') }
  }
  const marca = marcaCanonica(marcaV)
  const modelo1 = norm(modeloV).replace(/[^a-z0-9 ]/g, ' ').split(' ').find((t) => t.length > 1) ?? ''
  const ano = v.anoModelo ?? v.anoFabricacao

  // alguns nomes de arquivo trazem o ano na motorização ("2.4 Diesel 08 1997 a 08 2001")
  const producaoDe = (e: Esquema) => e.producao ?? [e.motorizacao, e.gerenciamento].filter(Boolean).join(' ')
  let compativeis = esquemas.filter((e) => {
    if (marcaCanonica(e.marca) !== marca || !modelo1) return false
    const m = norm(e.modelo).replace(/[^a-z0-9 ]/g, ' ').split(' ')
    if (!m.includes(modelo1)) return false
    if (ano && !anoNaFaixa(ano, producaoDe(e))) return false
    return true
  })

  // Refinos por sistema (motor antes do ano): num sistema em que algum esquema passa no critério,
  // ficam só os que passam; nos demais sistemas nada é removido.
  const refinar = (criterio: (e: Esquema) => boolean) => {
    const secoes = new Set(compativeis.filter(criterio).map((e) => e.secao))
    compativeis = compativeis.filter((e) => !secoes.has(e.secao) || criterio(e))
  }
  // cilindrada da placa (1598 cm³ → "1.6")
  if (v.cilindradas && v.cilindradas > 500) {
    const litros = (Math.round(v.cilindradas / 100) / 10).toFixed(1)
    const re = new RegExp(`(^|[^0-9.])${litros.replace('.', '\\.')}(?![0-9])`)
    refinar((e) => re.test(`${e.motorizacao ?? ''} ${e.modelo}`))
  }
  // esquema com ano que confirma o veículo dispensa os que não informam ano
  if (ano) refinar((e) => /\b(19|20)\d{2}\b/.test(producaoDe(e)))

  const porSecao = new Map<SectionKey, Esquema[]>()
  for (const e of compativeis) porSecao.set(e.secao, [...(porSecao.get(e.secao) ?? []), e])

  // mantém a ordem do menu
  const ordem = NAV.flatMap((n) => (n.kind === 'group' ? n.children : [n]))
  return ordem
    .filter((n) => porSecao.has(n.key))
    .map((n) => ({ key: n.key, icon: n.icon, esquemas: porSecao.get(n.key)! }))
}

function norm(s: string | null | undefined) {
  return (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

// "1997 a 2001", "06/2018 em diante", "2012 a 2017"; sem ano legível não exclui o esquema
function anoNaFaixa(ano: number, producao: string | null) {
  const anos = (producao ?? '').match(/\b(19|20)\d{2}\b/g)?.map(Number) ?? []
  if (!anos.length) return true
  const ini = Math.min(...anos)
  const fim = /em diante/i.test(producao ?? '') ? 9999 : Math.max(...anos)
  return ano >= ini && ano <= fim
}
