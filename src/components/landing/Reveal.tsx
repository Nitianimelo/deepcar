// Entrada no scroll: o bloco sobe, ganha opacidade e perde o desfoque quando aparece na tela, uma vez só.
// Mesmo efeito do "Reveal" (asanshay, via 21st.dev), feito com IntersectionObserver + CSS (.reveal em index.css)
// em vez da biblioteca motion: nada a mais no pacote da página.
import { useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  /** posição na sequência: cada passo atrasa 120 ms */
  index?: number
  as?: ElementType
  className?: string
  style?: CSSProperties
}

export function Reveal({ children, index = 0, as: Tag = 'div', className = '', style }: Props) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        el.classList.add('is-in')
        io.disconnect()
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Tag ref={ref} className={`reveal ${className}`} style={{ '--reveal-delay': `${index * 120}ms`, ...style } as CSSProperties}>
      {children}
    </Tag>
  )
}
