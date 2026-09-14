// Selos das lojas desenhados em SVG inline (sem depender de imagem externa).
// Trocar o href quando os apps forem publicados.
function Badge({ href, topo, nome, icone }: { href: string; topo: string; nome: string; icone: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex h-[52px] items-center gap-2.5 rounded-[10px] border border-white/15 bg-[#0b0e13] pl-3 pr-4 text-left transition-colors hover:border-white/30 hover:bg-[#12161d]"
    >
      <span className="grid h-7 w-7 place-items-center">{icone}</span>
      <span className="leading-none">
        <span className="block text-[10px] text-ink-3">{topo}</span>
        <span className="mt-1 block text-[17px] font-semibold tracking-tight text-ink-1">{nome}</span>
      </span>
    </a>
  )
}

export function AppStoreBadge({ href = '#' }: { href?: string }) {
  return (
    <Badge
      href={href}
      topo="Baixar na"
      nome="App Store"
      icone={
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
          <path d="M16.365 12.77c-.026-2.633 2.15-3.897 2.247-3.958-1.225-1.79-3.13-2.035-3.807-2.063-1.622-.164-3.165.955-3.988.955-.82 0-2.09-.932-3.437-.906-1.768.026-3.4 1.028-4.31 2.612-1.838 3.187-.47 7.907 1.32 10.494.876 1.266 1.92 2.688 3.29 2.637 1.32-.053 1.82-.855 3.416-.855 1.596 0 2.045.855 3.44.83 1.42-.027 2.32-1.29 3.19-2.56 1.003-1.47 1.417-2.893 1.44-2.966-.03-.013-2.766-1.06-2.8-4.22zM13.75 5.04c.728-.882 1.218-2.108 1.084-3.33-1.048.042-2.316.698-3.068 1.578-.673.78-1.263 2.03-1.104 3.226 1.168.09 2.36-.594 3.088-1.474z" />
        </svg>
      }
    />
  )
}

export function PlayStoreBadge({ href = '#' }: { href?: string }) {
  return (
    <Badge
      href={href}
      topo="Disponível no"
      nome="Google Play"
      icone={
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
          <path d="M3.6 2.3c-.3.3-.5.8-.5 1.4v16.6c0 .6.2 1.1.5 1.4l.1.1 9.3-9.3v-.2L3.7 2.2l-.1.1z" fill="#3b8bff" />
          <path d="M16.1 15.6 13 12.5v-.2l3.1-3.1.1.1 3.7 2.1c1.1.6 1.1 1.6 0 2.2l-3.7 2.1-.1-.1z" fill="#ffd400" />
          <path d="M16.2 15.5 13 12.3 3.6 21.7c.4.4.9.4 1.6 0l11-6.2" fill="#ff4b4b" />
          <path d="M16.2 9.1 5.2 2.9c-.7-.4-1.2-.3-1.6 0l9.4 9.4 3.2-3.2z" fill="#3ddc84" />
        </svg>
      }
    />
  )
}
