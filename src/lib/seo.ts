// Título da aba ao navegar dentro do site (o HTML de cada página pública já sai com o título certo do build:
// server/vitePaginasSeo.mjs). Volta ao anterior ao sair da tela.
import { useEffect } from 'react'

export const TITULO_PADRAO = 'Deepcar · Inteligência automotiva | Esquemas elétricos e diagramas'

export function useTitulo(titulo: string | null | undefined) {
  useEffect(() => {
    if (!titulo) return
    const antes = document.title
    document.title = titulo
    return () => { document.title = antes }
  }, [titulo])
}
