// Arte de fundo para a tela de login: trilhas de circuito que se
// energizam ao carregar. Só decoração, sem semântica.
export function CircuitArt() {
  const traces = [
    'M-20 120 H180 L240 180 H520 L560 220 H720',
    'M-20 260 H120 L160 300 H420 L470 350 H760',
    'M-20 420 H260 L300 380 H480 L540 440 H700',
    'M-20 560 H80 L130 510 H380 L420 550 H640',
  ]
  const pads = [
    [720, 220], [760, 350], [700, 440], [640, 550],
  ]
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 800 700"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      aria-hidden="true"
    >
      {traces.map((d, i) => (
        <path
          key={i}
          d={d}
          stroke="rgba(74,141,255,0.09)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="trace-anim"
          style={{ animationDelay: `${i * 180}ms` }}
        />
      ))}
      {pads.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="9" stroke="rgba(74,141,255,0.22)" strokeWidth="2" fill="var(--color-pit)" />
          <circle cx={x} cy={y} r="3" fill="var(--color-trace)" className="pad-pulse" style={{ animationDelay: `${i * 400}ms` }} />
        </g>
      ))}
    </svg>
  )
}
