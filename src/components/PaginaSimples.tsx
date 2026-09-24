// Casca das páginas públicas de texto (privacidade, exclusão de conta): logo, conteúdo e rodapé.
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function PaginaSimples({ rotulo, titulo, children }: { rotulo: string; titulo: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-pit">
      <header className="border-b seam bg-bench-1">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <Link to="/" aria-label="Deepcar, página inicial">
            <img src="/brand/logo-h-light.png" alt="Deepcar" className="h-7 w-auto select-none" draggable={false} />
          </Link>
          <Link to="/login" className="text-[14px] text-ink-3 hover:text-ink-1">Entrar</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
        <p className="code text-[11px] uppercase tracking-[0.2em] text-ink-4">{rotulo}</p>
        <h1 className="mt-2 text-[30px] font-semibold leading-tight tracking-tight sm:text-4xl">{titulo}</h1>
        <div className="texto-legal mt-8">{children}</div>
      </main>
      <footer className="border-t seam">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-x-6 gap-y-2 px-5 py-6 text-[13px] text-ink-4">
          <span className="code">© {new Date().getFullYear()} Deepcar</span>
          <Link to="/privacidade" className="hover:text-ink-2">Privacidade</Link>
          <Link to="/excluir-conta" className="hover:text-ink-2">Excluir conta</Link>
        </div>
      </footer>
    </div>
  )
}
