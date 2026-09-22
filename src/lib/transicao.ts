// Título que "voa" da lista até o cabeçalho do esquema na troca de tela (View Transitions).
// O nome só pode existir em um elemento por vez: é dado à linha clicada no instante do clique
// (antes do navegador fotografar a tela antiga), e o <h1> do EsquemaPage tem o mesmo nome.
import type { MouseEvent } from 'react'

export function marcarTitulo(e: MouseEvent<HTMLElement>) {
  const alvo = e.currentTarget.querySelector<HTMLElement>('[data-titulo]')
  if (!alvo) return
  alvo.style.viewTransitionName = 'titulo-esquema'
  // se a navegação não acontecer (Ctrl+clique abre outra aba), a linha não pode ficar com o nome
  setTimeout(() => { alvo.style.viewTransitionName = '' }, 800)
}
