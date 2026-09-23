// O que o plano da conta libera, do jeito que as telas precisam perguntar.
// Quem decide é o servidor (api/_lib/planos.js): a consulta de placa responde 403 fora do plano.
// Aqui é só o desenho — cadeado no menu e a tela de "não faz parte do seu plano".
import { createContext, useContext } from 'react'
import type { SectionKey } from '../data/nav'
import { getSession, type Session } from './auth'

export const podeSecao = (s: Session | null, secao: SectionKey | string) =>
  !!s && (s.papel === 'admin' || !s.acesso || s.acesso.secoes.includes(secao))

export const podePlaca = (s: Session | null) => !!s && (s.papel === 'admin' || !s.acesso || s.acesso.placa)

/** A sessão mais recente que o AppLayout conhece (atualiza sozinha quando o plano muda). */
export const SessaoAtual = createContext<Session | null | undefined>(undefined)

export function useAcesso() {
  const doLayout = useContext(SessaoAtual)
  const sessao = doLayout === undefined ? getSession() : doLayout
  return {
    sessao,
    podeSecao: (secao: SectionKey | string) => podeSecao(sessao, secao),
    podePlaca: podePlaca(sessao),
  }
}
