// O que o plano da conta libera, do jeito que as telas precisam perguntar.
// Quem decide é o servidor (api/_lib/planos.js): a consulta de placa responde 403 fora do plano.
// Aqui é só o desenho — cadeado no menu, a tela de "não faz parte do seu plano" e o esquema
// embaçado depois do teste gratuito.
import { createContext, useContext } from 'react'
import type { SectionKey } from '../data/nav'
import { getSession, type Session } from './auth'
import { restanteFree } from './plano'

export const podeSecao = (s: Session | null, secao: SectionKey | string) =>
  !!s && (s.papel === 'admin' || !s.acesso || s.acesso.secoes.includes(secao))

export const podePlaca = (s: Session | null) => !!s && (s.papel === 'admin' || !s.acesso || s.acesso.placa)

/** A sessão mais recente que o AppLayout conhece (atualiza sozinha quando o plano muda). */
export const SessaoAtual = createContext<Session | null | undefined>(undefined)

/** O AppLayout avisa quando o teste gratuito termina (o relógio dele vira na hora exata). */
export const TesteAcabou = createContext<boolean | undefined>(undefined)

/** Teste gratuito vencido: sem plano pago, os esquemas abrem embaçados, com o convite para assinar. */
export const testeAcabou = (s: Session | null) => {
  const r = restanteFree(s)
  return r !== null && r <= 0
}

export function useAcesso() {
  const doLayout = useContext(SessaoAtual)
  const sessao = doLayout === undefined ? getSession() : doLayout
  const acabouNoLayout = useContext(TesteAcabou)
  return {
    sessao,
    testeAcabou: acabouNoLayout ?? testeAcabou(sessao),
    podeSecao: (secao: SectionKey | string) => podeSecao(sessao, secao),
    podePlaca: podePlaca(sessao),
  }
}
