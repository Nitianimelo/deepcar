import type { SectionKey } from './nav'

export type Esquema = {
  id: string
  secao: SectionKey
  montadora: string
  modelo: string
  motor: string
  anos: string
  modulo: string
  conectores: number
  paginas: number
  atualizado: string
}

// Dados de exemplo. Substituir pelo catálogo real.
export const ESQUEMAS: Esquema[] = [
  { id: 'e001', secao: 'injecao-leve', montadora: 'Volkswagen', modelo: 'Gol G6', motor: '1.6 8V EA111 Flex', anos: '2013–2016', modulo: 'Bosch ME 7.5.30', conectores: 4, paginas: 6, atualizado: '2026-08-12' },
  { id: 'e002', secao: 'injecao-leve', montadora: 'Fiat', modelo: 'Argo', motor: '1.3 Firefly Flex', anos: '2018–2024', modulo: 'Magneti Marelli 8GMF', conectores: 3, paginas: 8, atualizado: '2026-07-30' },
  { id: 'e003', secao: 'injecao-leve', montadora: 'Chevrolet', modelo: 'Onix', motor: '1.0 Turbo CSS', anos: '2020–2025', modulo: 'Delphi MT35', conectores: 4, paginas: 9, atualizado: '2026-09-02' },
  { id: 'e004', secao: 'injecao-leve', montadora: 'Toyota', modelo: 'Corolla', motor: '2.0 Dynamic Force', anos: '2020–2025', modulo: 'Denso 89661', conectores: 5, paginas: 11, atualizado: '2026-06-18' },
  { id: 'e005', secao: 'injecao-leve', montadora: 'Hyundai', modelo: 'HB20', motor: '1.0 TGDI', anos: '2020–2025', modulo: 'Kefico GDI', conectores: 3, paginas: 7, atualizado: '2026-08-25' },
  { id: 'e006', secao: 'injecao-leve', montadora: 'Honda', modelo: 'Civic G10', motor: '2.0 i-VTEC', anos: '2017–2021', modulo: 'Keihin PGM-FI', conectores: 4, paginas: 8, atualizado: '2026-05-09' },

  { id: 'e101', secao: 'injecao-diesel', montadora: 'Toyota', modelo: 'Hilux', motor: '2.8 1GD-FTV', anos: '2016–2024', modulo: 'Denso EDC', conectores: 5, paginas: 12, atualizado: '2026-08-21' },
  { id: 'e102', secao: 'injecao-diesel', montadora: 'Volkswagen', modelo: 'Amarok', motor: '2.0 TDI Biturbo', anos: '2011–2022', modulo: 'Bosch EDC17', conectores: 4, paginas: 10, atualizado: '2026-07-02' },
  { id: 'e103', secao: 'injecao-diesel', montadora: 'Mercedes-Benz', modelo: 'Sprinter 415', motor: '2.2 CDI OM651', anos: '2013–2019', modulo: 'Bosch EDC17CP57', conectores: 6, paginas: 14, atualizado: '2026-09-05' },
  { id: 'e104', secao: 'injecao-diesel', montadora: 'Ford', modelo: 'Ranger', motor: '3.2 Duratorq', anos: '2013–2019', modulo: 'Siemens SID209', conectores: 4, paginas: 11, atualizado: '2026-04-14' },
  { id: 'e105', secao: 'injecao-diesel', montadora: 'Iveco', modelo: 'Daily 35S14', motor: '3.0 F1C', anos: '2014–2021', modulo: 'Bosch EDC17C49', conectores: 5, paginas: 13, atualizado: '2026-06-27' },

  { id: 'e201', secao: 'abs', montadora: 'Chevrolet', modelo: 'Onix', motor: '—', anos: '2013–2019', modulo: 'Bosch ABS 9.0', conectores: 1, paginas: 4, atualizado: '2026-08-03' },
  { id: 'e202', secao: 'abs', montadora: 'Fiat', modelo: 'Toro', motor: '—', anos: '2016–2024', modulo: 'Bosch ESP 9.1', conectores: 1, paginas: 5, atualizado: '2026-07-19' },
  { id: 'e203', secao: 'abs', montadora: 'Volkswagen', modelo: 'Polo', motor: '—', anos: '2018–2024', modulo: 'Continental MK100', conectores: 1, paginas: 5, atualizado: '2026-09-01' },
  { id: 'e204', secao: 'abs', montadora: 'Renault', modelo: 'Duster', motor: '—', anos: '2012–2020', modulo: 'Bosch ABS 8.1', conectores: 1, paginas: 4, atualizado: '2026-03-28' },

  { id: 'e301', secao: 'eletrica', montadora: 'Volkswagen', modelo: 'Gol G6', motor: '—', anos: '2013–2016', modulo: 'BCM Delphi', conectores: 7, paginas: 18, atualizado: '2026-08-30' },
  { id: 'e302', secao: 'eletrica', montadora: 'Fiat', modelo: 'Strada', motor: '—', anos: '2020–2025', modulo: 'Body Computer', conectores: 8, paginas: 21, atualizado: '2026-09-08' },
  { id: 'e303', secao: 'eletrica', montadora: 'Chevrolet', modelo: 'S10', motor: '—', anos: '2012–2019', modulo: 'BCM GM', conectores: 9, paginas: 24, atualizado: '2026-05-22' },
  { id: 'e304', secao: 'eletrica', montadora: 'Jeep', modelo: 'Renegade', motor: '—', anos: '2015–2024', modulo: 'BCM Continental', conectores: 8, paginas: 22, atualizado: '2026-07-11' },
  { id: 'e305', secao: 'eletrica', montadora: 'Toyota', modelo: 'Hilux', motor: '—', anos: '2016–2024', modulo: 'Main Body ECU', conectores: 10, paginas: 26, atualizado: '2026-08-15' },

  { id: 'e401', secao: 'cambio', montadora: 'Honda', modelo: 'Civic G10', motor: 'CVT', anos: '2017–2021', modulo: 'TCM Honda', conectores: 2, paginas: 6, atualizado: '2026-06-05' },
  { id: 'e402', secao: 'cambio', montadora: 'Volkswagen', modelo: 'Jetta', motor: 'DSG DQ200', anos: '2011–2018', modulo: 'Mecatrônica', conectores: 1, paginas: 7, atualizado: '2026-08-09' },
  { id: 'e403', secao: 'cambio', montadora: 'Chevrolet', modelo: 'Cruze', motor: 'AT 6T40', anos: '2012–2016', modulo: 'TCM GM', conectores: 2, paginas: 6, atualizado: '2026-04-30' },
  { id: 'e404', secao: 'cambio', montadora: 'Fiat', modelo: 'Uno', motor: 'Dualogic', anos: '2010–2020', modulo: 'Magneti Marelli CFC', conectores: 2, paginas: 5, atualizado: '2026-07-24' },
]

export function esquemasDaSecao(secao: SectionKey) {
  return ESQUEMAS.filter((e) => e.secao === secao)
}
export function esquemaPorId(id: string) {
  return ESQUEMAS.find((e) => e.id === id)
}
