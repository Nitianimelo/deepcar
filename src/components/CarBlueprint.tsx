// Carro em traço de esquema (vista lateral) com trilhas saindo dos quatro
// sistemas que a plataforma cobre. Elemento central do painel de login.
export function CarBlueprint({ className = '' }: { className?: string }) {
  const line = 'rgba(180,196,220,0.85)'
  const soft = 'rgba(180,196,220,0.35)'
  const trace = 'var(--color-trace)'

  const pontos: { x: number; y: number; lx: number; ly: number; rotulo: string; anchor?: 'start' | 'end' }[] = [
    { x: 690, y: 128, lx: 770, ly: 40, rotulo: 'INJEÇÃO' },
    { x: 630, y: 202, lx: 740, ly: 292, rotulo: 'ABS' },
    { x: 470, y: 100, lx: 470, ly: 30, rotulo: 'ELÉTRICA' },
    { x: 400, y: 214, lx: 300, ly: 292, rotulo: 'CÂMBIO', anchor: 'end' },
  ]

  return (
    <svg className={className} viewBox="0 0 860 320" fill="none" aria-hidden="true">
      {/* carroceria */}
      <path
        d="M 34 200 L 34 176 C 34 164 46 156 78 150 L 158 140 C 210 96 288 76 388 74 L 482 74 C 562 76 632 104 690 134 L 758 144 C 786 148 798 162 798 184 L 798 200 L 720 200 A 62 62 0 0 0 540 200 L 280 200 A 62 62 0 0 0 100 200 Z"
        stroke={line} strokeWidth="2" strokeLinejoin="round"
      />
      {/* vidros */}
      <path d="M 190 138 C 236 104 300 90 386 88 L 436 88 L 436 138 Z" stroke={soft} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M 452 88 L 486 88 C 548 90 604 112 648 136 L 452 138 Z" stroke={soft} strokeWidth="1.5" strokeLinejoin="round" />
      {/* porta, maçaneta, faróis */}
      <path d="M 444 140 L 448 198" stroke={soft} strokeWidth="1.5" />
      <path d="M 470 156 L 496 156" stroke={soft} strokeWidth="2" strokeLinecap="round" />
      <path d="M 762 150 L 790 158" stroke={line} strokeWidth="2" strokeLinecap="round" />
      <path d="M 40 160 L 62 156" stroke={line} strokeWidth="2" strokeLinecap="round" />
      {/* linha de cintura */}
      <path d="M 160 148 L 740 148" stroke={soft} strokeWidth="1" strokeDasharray="3 6" />
      {/* rodas */}
      {[190, 630].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="200" r="46" stroke={line} strokeWidth="2" />
          <circle cx={cx} cy="200" r="27" stroke={soft} strokeWidth="1.5" />
          <circle cx={cx} cy="200" r="5" fill={soft} />
          {[0, 72, 144, 216, 288].map((a) => (
            <line
              key={a}
              x1={cx} y1="200"
              x2={cx + 26 * Math.cos((a * Math.PI) / 180)} y2={200 + 26 * Math.sin((a * Math.PI) / 180)}
              stroke={soft} strokeWidth="1.5"
            />
          ))}
        </g>
      ))}
      {/* solo */}
      <path d="M 0 250 L 860 250" stroke={soft} strokeWidth="1" strokeDasharray="2 8" />

      {/* trilhas dos sistemas: ponto no carro → cotovelo → pad + rótulo */}
      {pontos.map((p, i) => {
        const midY = p.ly + (p.y > p.ly ? 22 : -22)
        const d = `M ${p.x} ${p.y} L ${p.x} ${midY} L ${p.lx} ${midY} L ${p.lx} ${p.ly}`
        const anchor = p.anchor ?? 'start'
        return (
          <g key={p.rotulo}>
            <path d={d} stroke={trace} strokeWidth="2" strokeLinejoin="round" className="trace-anim" style={{ animationDelay: `${300 + i * 220}ms` }} />
            <circle cx={p.x} cy={p.y} r="4" fill="var(--color-pit)" stroke={trace} strokeWidth="2" />
            <circle cx={p.lx} cy={p.ly} r="5.5" fill="var(--color-pit)" stroke={trace} strokeWidth="2" />
            <circle cx={p.lx} cy={p.ly} r="2" fill={trace} className="pad-pulse" style={{ animationDelay: `${i * 500}ms` }} />
            <text
              x={p.lx + (anchor === 'end' ? -12 : 12)} y={p.ly + 4}
              textAnchor={anchor}
              fill="var(--color-trace-hi)" fontSize="15" fontFamily="JetBrains Mono, monospace" letterSpacing="0.18em"
            >
              {p.rotulo}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
