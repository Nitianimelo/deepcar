import type { LucideIcon } from 'lucide-react'
import { Cpu, Car, Truck, CircleDot, Zap, Cog } from 'lucide-react'

export type SectionKey =
  | 'injecao-leve'
  | 'injecao-diesel'
  | 'abs'
  | 'eletrica'
  | 'eletrica-diesel'
  | 'cambio'
  | 'cambio-diesel'

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
  {
    kind: 'group',
    label: 'Elétrica',
    icon: Zap,
    children: [
      { kind: 'leaf', key: 'eletrica', label: 'Leve', to: '/app/eletrica/leve', icon: Car },
      { kind: 'leaf', key: 'eletrica-diesel', label: 'Diesel', to: '/app/eletrica/diesel', icon: Truck },
    ],
  },
  {
    kind: 'group',
    label: 'Câmbio',
    icon: Cog,
    children: [
      { kind: 'leaf', key: 'cambio', label: 'Leve', to: '/app/cambio/leve', icon: Car },
      { kind: 'leaf', key: 'cambio-diesel', label: 'Diesel', to: '/app/cambio/diesel', icon: Truck },
    ],
  },
]

/** Todas as seções, na ordem do menu. */
export const SECOES: SectionKey[] = NAV.flatMap((n) => (n.kind === 'group' ? n.children : [n])).map((n) => n.key)

export const SECTION_META: Record<SectionKey, { titulo: string; trilha: string[]; descricao: string }> = {
  'injecao-leve': {
    titulo: 'Injeção Eletrônica · Leve',
    trilha: ['Injeção Eletrônica', 'Leve'],
    descricao: 'Módulos de injeção e ignição de motores ciclo Otto e flex.',
  },
  'injecao-diesel': {
    titulo: 'Injeção Eletrônica · Diesel',
    trilha: ['Injeção Eletrônica', 'Diesel'],
    descricao: 'Common rail, unidades injetoras e módulos EDC.',
  },
  abs: { titulo: 'ABS', trilha: ['ABS'], descricao: 'Módulos hidráulicos, sensores de roda e ESP.' },
  eletrica: {
    titulo: 'Elétrica · Leve',
    trilha: ['Elétrica', 'Leve'],
    descricao: 'Carga, partida, iluminação, BCM e conforto.',
  },
  'eletrica-diesel': {
    titulo: 'Elétrica · Diesel',
    trilha: ['Elétrica', 'Diesel'],
    descricao: 'Carga, partida, painel e módulos de caminhões, ônibus e picapes diesel.',
  },
  cambio: {
    titulo: 'Câmbio · Leve',
    trilha: ['Câmbio', 'Leve'],
    descricao: 'Transmissões automáticas, CVT e automatizadas.',
  },
  'cambio-diesel': {
    titulo: 'Câmbio · Diesel',
    trilha: ['Câmbio', 'Diesel'],
    descricao: 'Transmissões automatizadas e conversores de caminhões, ônibus e picapes diesel.',
  },
}
