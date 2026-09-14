import type { LucideIcon } from 'lucide-react'
import { Cpu, Car, Truck, CircleDot, Zap, Cog } from 'lucide-react'

export type SectionKey = 'injecao-leve' | 'injecao-diesel' | 'abs' | 'eletrica' | 'cambio'

export type NavLeaf = { kind: 'leaf'; key: SectionKey; label: string; to: string; icon: LucideIcon }
export type NavGroup = { kind: 'group'; label: string; icon: LucideIcon; children: NavLeaf[] }
export type NavEntry = NavLeaf | NavGroup

export const NAV: NavEntry[] = [
  {
    kind: 'group',
    label: 'Injeção Eletrônica',
    icon: Cpu,
    children: [
      { kind: 'leaf', key: 'injecao-leve', label: 'Leve', to: '/app/injecao/leve', icon: Car },
      { kind: 'leaf', key: 'injecao-diesel', label: 'Diesel', to: '/app/injecao/diesel', icon: Truck },
    ],
  },
  { kind: 'leaf', key: 'abs', label: 'ABS', to: '/app/abs', icon: CircleDot },
  { kind: 'leaf', key: 'eletrica', label: 'Elétrica', to: '/app/eletrica', icon: Zap },
  { kind: 'leaf', key: 'cambio', label: 'Câmbio', to: '/app/cambio', icon: Cog },
]

export const SECTION_META: Record<SectionKey, { titulo: string; trilha: string[]; descricao: string }> = {
  'injecao-leve': {
    titulo: 'Injeção Eletrônica · Leve',
    trilha: ['Injeção Eletrônica', 'Leve'],
    descricao: 'Módulos de gerenciamento de motor ciclo Otto e flex.',
  },
  'injecao-diesel': {
    titulo: 'Injeção Eletrônica · Diesel',
    trilha: ['Injeção Eletrônica', 'Diesel'],
    descricao: 'Common rail, unidades injetoras e módulos EDC.',
  },
  abs: { titulo: 'ABS', trilha: ['ABS'], descricao: 'Módulos hidráulicos, sensores de roda e ESP.' },
  eletrica: { titulo: 'Elétrica', trilha: ['Elétrica'], descricao: 'Carga, partida, iluminação, BCM e conforto.' },
  cambio: { titulo: 'Câmbio', trilha: ['Câmbio'], descricao: 'Transmissões automáticas, CVT e automatizadas.' },
}
