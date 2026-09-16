// Símbolo da montadora em silhueta monocromática (public/marcas/*.png usada como máscara CSS),
// pintado com a cor do texto atual: segue o tema e o hover sem precisar de versões por cor.
// `cor` troca a cor do texto por uma fixa (ex.: a cor oficial da marca na faixa da landing).
// Marcas sem logo (ex.: Effa) viram o nome escrito no mesmo peso visual.
import MARCAS from '../data/marcas.json'

type Logo = { arquivo: string; proporcao: number }
const LOGOS = MARCAS as Record<string, Logo>

export const temLogo = (marca: string) => marca in LOGOS

export function LogoMarca({ marca, altura = 32, larguraMax, cor, className = '' }: {
  marca: string
  altura?: number
  /** limita logotipos muito largos (wordmarks) */
  larguraMax?: number
  /** cor fixa no lugar da cor do texto */
  cor?: string
  className?: string
}) {
  const logo = LOGOS[marca]
  if (!logo) {
    return (
      <span
        role="img"
        aria-label={marca}
        className={`inline-grid place-items-center font-bold uppercase leading-none tracking-[0.12em] ${className}`}
        style={{ height: altura, fontSize: Math.round(altura * 0.5), color: cor }}
      >
        {marca}
      </span>
    )
  }
  const max = larguraMax ?? altura * 3.2
  const largura = Math.min(altura * logo.proporcao, max)
  return (
    <span
      role="img"
      aria-label={marca}
      className={`inline-block flex-none bg-current ${className}`}
      style={{
        width: largura,
        height: largura / logo.proporcao,
        backgroundColor: cor,
        maskImage: `url(${logo.arquivo})`,
        WebkitMaskImage: `url(${logo.arquivo})`,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
      }}
    />
  )
}
