// Assinatura Deepcar: trilha de circuito terminando em um pad, como no logo.
export function TracePad({ className = 'trace-pad' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 26 14" fill="none" aria-hidden="true">
      <path d="M0 7 H12" stroke="var(--color-trace)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="18" cy="7" r="4.5" stroke="var(--color-trace)" strokeWidth="2" fill="var(--color-pit)" />
      <circle cx="18" cy="7" r="1.6" fill="var(--color-trace)" className="pad-pulse" />
    </svg>
  )
}
