// Modo simulado: sem credencial de provedor nenhum, responde só as placas de teste abaixo.
import { erro, montarVeiculo } from '../veiculo.mjs'

const PLACAS = {
  AAA0000: { marca: 'CHEVROLET', modelo: 'ONIX 1.0 TURBO', anoFabricacao: 2021, anoModelo: 2022, combustivel: 'FLEX', cor: 'BRANCA', motor: 'B10XFT', cilindradas: 999, potencia: 116 },
  ABC1D23: { marca: 'VOLKSWAGEN', modelo: 'GOL 1.6 MSI', anoFabricacao: 2015, anoModelo: 2016, combustivel: 'FLEX', cor: 'PRATA', motor: 'CWS', cilindradas: 1598, potencia: 120 },
  BRA2E19: { marca: 'TOYOTA', modelo: 'HILUX CD SRX 2.8 4X4', anoFabricacao: 2020, anoModelo: 2020, combustivel: 'DIESEL', cor: 'PRETA', motor: '1GD-FTV', cilindradas: 2755, potencia: 204 },
  FIA1T23: { marca: 'FIAT', modelo: 'ARGO DRIVE 1.3', anoFabricacao: 2019, anoModelo: 2020, combustivel: 'FLEX', cor: 'VERMELHA', motor: 'FIREFLY', cilindradas: 1332, potencia: 109 },
  HON2C24: { marca: 'HONDA', modelo: 'CIVIC EXL 2.0 CVT', anoFabricacao: 2018, anoModelo: 2018, combustivel: 'FLEX', cor: 'CINZA', motor: 'R20Z', cilindradas: 1997, potencia: 155 },
}

export const configurado = () => true

export async function consultar(placa) {
  await new Promise((r) => setTimeout(r, 400))
  const d = PLACAS[placa]
  if (!d) throw erro(`Veículo não encontrado (modo simulado). Placas de teste: ${Object.keys(PLACAS).join(', ')}`, 404)
  return montarVeiculo({ ...d, placa, municipio: 'CURITIBA', uf: 'PR' }, 'simulado')
}
