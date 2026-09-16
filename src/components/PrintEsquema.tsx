// Documento de impressão do esquema: folhas A4 brancas, independentes da tela escura do app.
//
// O desenho é um só (fatias contíguas). A paginação distribui esse desenho contínuo pelas folhas usando toda a
// área útil, cortando de preferência nas emendas entre fatias (pontos que o pipeline já escolheu como limpos).
// Quando não há emenda perto, corta no limite da folha com uma pequena sobreposição e avisa "continua".
// É montado só na hora de imprimir (portal no <body>), espera todas as imagens e então chama window.print().
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { SECTION_META } from '../data/nav'
import { rotulo, urlImagem, type EsquemaDetalhe } from '../lib/acervo'
import { MarcaDagua } from './MarcaDagua'

/* Medidas da folha A4 em mm */
const LARG_UTIL = 192          // 210 − 9 − 9
const ALT_UTIL = 280.5         // 296.5 − 9 − 7 (altura um pouco abaixo de 297 evita folha em branco por arredondamento)
const CAB_1 = 33               // cabeçalho completo da 1ª folha
const CAB_N = 15               // cabeçalho compacto das demais
const RODAPE = 8
const RESPIRO = 3              // espaço entre o cabeçalho e o desenho
const SOBREPOE = 0.035         // fração da janela repetida quando o corte não cai numa emenda
const EMENDA_MIN = 0.55        // só corta numa emenda se ela usar ao menos 55% da folha

/** `repetido`: px do topo desta janela que já apareceram no fim da folha anterior */
type Janela = { de: number; ate: number; continua: boolean; continuacao: boolean; repetido: number }

const alturaDesenho = (folha: number) => ALT_UTIL - (folha === 0 ? CAB_1 : CAB_N) - RODAPE - RESPIRO

export function paginar(d: EsquemaDetalhe): Janela[] {
  const W = d.largura
  const emendas: number[] = []
  let y = 0
  for (const t of d.trechos) { y += t.h; emendas.push(y) }
  const H = y
  const caixa = (i: number) => alturaDesenho(i) / LARG_UTIL // altura/largura da área do desenho

  const out: Janela[] = []
  let pos = 0, repetido = 0
  for (let i = 0; pos < H - 1 && i < 500; i++) {
    const cap = W * caixa(i)
    const base = { continuacao: repetido > 0, repetido }
    // o resto cabe tolerando reduzir até 20% a largura: última folha (evita uma folha final quase vazia)
    if (H - pos <= cap * 1.25) { out.push({ de: pos, ate: H, continua: false, ...base }); break }
    const limite = pos + cap
    const emenda = [...emendas].reverse().find((e) => e <= limite && e > pos + cap * EMENDA_MIN)
    if (emenda) {
      out.push({ de: pos, ate: emenda, continua: false, ...base })
      pos = emenda; repetido = 0
    } else {
      out.push({ de: pos, ate: limite, continua: true, ...base })
      repetido = cap * SOBREPOE
      pos = limite - repetido
    }
  }
  return out
}

export function PrintEsquema({ d, onPronto }: { d: EsquemaDetalhe; onPronto: () => void }) {
  const janelas = useMemo(() => paginar(d), [d])
  const raiz = useRef<HTMLDivElement>(null)
  const meta = SECTION_META[d.secao]
  const hoje = new Date().toLocaleDateString('pt-BR')
  const titulo = `${d.marca} ${d.modelo}`

  // espera todas as imagens do documento (e o decode) antes de liberar a impressão
  useLayoutEffect(() => {
    const imgs = [...(raiz.current?.querySelectorAll('img') ?? [])]
    let vivo = true
    Promise.all(imgs.map((i) => (i.complete ? i.decode().catch(() => {}) : new Promise((r) => { i.onload = i.onerror = r }))))
      .then(() => new Promise((r) => setTimeout(r, 150)))
      .then(() => { if (vivo) onPronto() })
    return () => { vivo = false }
  }, [janelas]) // eslint-disable-line react-hooks/exhaustive-deps

  // título do arquivo quando o usuário escolhe "Salvar como PDF"
  useEffect(() => {
    const antes = document.title
    document.title = `Deepcar · ${titulo} · ${meta.titulo}`
    return () => { document.title = antes }
  }, [titulo, meta.titulo])

  let yAcum = 0
  const topos = d.trechos.map((t) => { const y = yAcum; yAcum += t.h; return y })

  return createPortal(
    <div ref={raiz} className="print-doc" aria-hidden="true">
      {janelas.map((j, i) => {
        const primeira = i === 0
        const areaAlt = alturaDesenho(i)
        const altCheia = (LARG_UTIL * (j.ate - j.de)) / d.largura
        const escala = Math.min(1, areaAlt / altCheia)
        const largura = LARG_UTIL * escala
        const k = largura / d.largura // mm por px do desenho
        return (
          <section key={i} className="folha">
            {primeira ? (
              <header className="folha-cab-1">
                <div className="folha-topo">
                  <img src="/brand/logo-h.png" alt="Deepcar" className="folha-logo" />
                  <span className="folha-sistema">Esquema elétrico · {meta.titulo}</span>
                </div>
                <h1 className="folha-titulo">{titulo}</h1>
                {d.specs.length > 0 && (
                  <dl className="folha-specs">
                    {d.specs.map(([rot, v]) => (
                      <div key={rot}><dt>{rotulo(rot)}</dt><dd>{v}</dd></div>
                    ))}
                  </dl>
                )}
              </header>
            ) : (
              <header className="folha-cab-n">
                <img src="/brand/logo-h.png" alt="Deepcar" className="folha-logo-p" />
                <span className="folha-cab-titulo">{titulo}</span>
                <span className="folha-sistema">{meta.titulo}</span>
              </header>
            )}

            <div className="folha-area" style={{ height: `${areaAlt + RESPIRO}mm` }}>
              <div className="folha-desenho" style={{ width: `${largura}mm`, height: `${(j.ate - j.de) * k}mm` }}>
                {d.trechos.map((t, ti) => {
                  const topo = topos[ti]
                  if (topo + t.h <= j.de || topo >= j.ate) return null
                  return (
                    <img
                      key={t.arquivo}
                      src={urlImagem(d, t)}
                      alt=""
                      loading="eager"
                      decoding="sync"
                      style={{ top: `${(topo - j.de) * k}mm`, height: `${t.h * k}mm` }}
                    />
                  )
                })}
                <MarcaDagua escuro={false} />
                {j.continuacao && (
                  // faixa repetida da folha anterior: marcada para o mecânico não contar o trecho duas vezes
                  <div className="folha-repetido" style={{ height: `${j.repetido * k}mm` }}>
                    <span>Repetido da folha {i}</span>
                  </div>
                )}
              </div>
            </div>

            <footer className="folha-rodape">
              <span>Deepcar · Esquemas elétricos automotivos · Impresso em {hoje}</span>
              <span className="folha-continua">{j.continua ? 'Continua na próxima folha ↓' : ''}</span>
              <span className="folha-num">Folha {i + 1} de {janelas.length}</span>
            </footer>
          </section>
        )
      })}
    </div>,
    document.body,
  )
}
