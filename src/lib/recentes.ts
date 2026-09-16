// Últimas consultas (placas e esquemas abertos), guardadas no navegador por conta.
// Servem à tela inicial e para reabrir uma placa sem gastar outra consulta no provedor:
// marca, modelo e ano de uma placa não mudam.
import { useEffect, useState } from 'react'
import { getSession } from './auth'
import type { Veiculo } from './placa'

type NovoRecente =
  | { tipo: 'placa'; placa: string; titulo: string; detalhe: string; veiculo: Veiculo }
  | { tipo: 'esquema'; id: string; titulo: string; detalhe: string }

export type Recente = NovoRecente & { em: number }

const MAXIMO = 12
const EVENTO = 'deepcar:recentes'

// cada conta vê só as próprias consultas, mesmo com duas pessoas no mesmo computador
const chave = () => `deepcar.recentes:${getSession()?.email ?? 'anonimo'}`
const identidade = (r: NovoRecente) => (r.tipo === 'placa' ? `placa:${r.placa}` : `esquema:${r.id}`)

function valido(r: unknown): r is Recente {
  const x = r as Partial<Recente> | null
  if (!x || typeof x.titulo !== 'string' || typeof x.em !== 'number') return false
  if (x.tipo === 'placa') return typeof x.placa === 'string' && !!x.veiculo
  return x.tipo === 'esquema' && typeof x.id === 'string'
}

export function lerRecentes(): Recente[] {
  try {
    const lista: unknown = JSON.parse(localStorage.getItem(chave()) ?? '[]')
    return Array.isArray(lista) ? lista.filter(valido) : []
  } catch {
    return []
  }
}

function gravar(lista: Recente[] | null) {
  try {
    if (lista) localStorage.setItem(chave(), JSON.stringify(lista))
    else localStorage.removeItem(chave())
  } catch { /* modo anônimo ou armazenamento cheio: a consulta segue sem histórico */ }
  window.dispatchEvent(new Event(EVENTO))
}

export function registrarRecente(novo: NovoRecente) {
  const id = identidade(novo)
  gravar([{ ...novo, em: Date.now() }, ...lerRecentes().filter((r) => identidade(r) !== id)].slice(0, MAXIMO))
}

export const limparRecentes = () => gravar(null)

/** Veículo já consultado nesta conta, para não repetir a chamada ao provedor. */
export function veiculoGuardado(placa: string): Veiculo | null {
  const r = lerRecentes().find((x) => x.tipo === 'placa' && x.placa === placa)
  return r?.tipo === 'placa' ? r.veiculo : null
}

export function useRecentes() {
  const [lista, setLista] = useState(lerRecentes)
  useEffect(() => {
    const atualizar = () => setLista(lerRecentes())
    window.addEventListener(EVENTO, atualizar)
    window.addEventListener('storage', atualizar) // outra aba
    return () => {
      window.removeEventListener(EVENTO, atualizar)
      window.removeEventListener('storage', atualizar)
    }
  }, [])
  return lista
}
