// O que a plataforma mostra para levar o teste até a assinatura (regras e contadores em lib/funil.ts):
//  - BoasVindas: na primeira entrada no início, 3 passos numa folha (components/Folha.tsx), apontando a placa e a busca.
//  - ConviteMomento: depois da primeira placa ou do 3º esquema, um convite para assinar (no início ou na placa,
//    nunca por cima do visualizador). Só no teste em andamento: com o teste vencido, o esquema embaçado já convida.
//  - DicaEsquema: na primeira vez que um esquema abre, um cartão na própria página (não cobre o desenho).
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Lightbulb, X } from 'lucide-react'
import { Destaque, Folha } from './Folha'
import { useAcesso } from '../lib/acesso'
import { restanteFree, tempoRestante } from '../lib/plano'
import { PLANOS_VENDA } from '../data/planos'
import { SECOES } from '../data/nav'
import {
  boasVindasVistas, conviteMostrado, convitePendente, dicaEsquemaVista, marcarBoasVindas, marcarDicaEsquema,
  ouvirMomentoDeValor,
} from '../lib/funil'

const PLANOS = '/app/conta?aba=plano'
const MENOR_PARCELA = PLANOS_VENDA.map((p) => p.precoAnual).sort((a, b) => Number(a.replace(',', '.')) - Number(b.replace(',', '.')))[0]

/** Conta no teste em andamento (admin e pagantes não veem nada disto). */
function useTesteAtivo() {
  const { sessao, testeAcabou } = useAcesso()
  const ativo = !!sessao && sessao.plano === 'free' && sessao.papel !== 'admin' && !testeAcabou
  return { ativo, sessao }
}

const botaoPrincipal = 'btn-primary inline-flex !h-12 w-full items-center justify-center gap-2 text-[15px]'
const botaoSecundario = 'inline-flex h-11 w-full items-center justify-center rounded-[10px] text-[14.5px] text-ink-3 hover:bg-bench-3 hover:text-ink-1'

export function BoasVindas() {
  const { pathname } = useLocation()
  const { ativo, sessao } = useTesteAtivo()
  const email = sessao?.email ?? ''
  const noInicio = pathname.replace(/\/$/, '') === '/app'
  const [passo, setPasso] = useState<0 | 1 | 2>(0)
  const [encerrada, setEncerrada] = useState(false)
  // decidido na renderização: também abre para quem chega ao início depois (vinha de um link direto)
  if (encerrada || !sessao || !ativo || !noInicio || !email || boasVindasVistas(email)) return null
  const encerrar = () => { marcarBoasVindas(email); setEncerrada(true) }
  const restante = restanteFree(sessao)
  const nome = sessao.nome?.split(' ')[0]
  // o /admin escolhe o que o teste libera: o texto não promete "todos os sistemas" quando não é o caso
  const tudoLiberado = !sessao.acesso || sessao.acesso.secoes.length >= SECOES.length

  // uma folha só para os três passos: trocar de folha mexeria no histórico (o voltar do Android) entre um passo e outro
  const passos = [
    {
      titulo: <>Bem-vindo ao Deepcar{nome ? `, ${nome}` : ''}!</>,
      texto: <>
        Seu teste grátis está valendo{restante && restante > 0 ? <>: <b className="font-semibold text-ink-1">{tempoRestante(restante)}</b></> : ''}
        {tudoLiberado
          ? ' com todos os sistemas liberados (injeção, ABS, elétrica e câmbio, do leve ao diesel).'
          : '. O que não está no teste abre borrado, com os planos que liberam.'} Quer ver como usar? Leva 20 segundos.
      </>,
      principal: <>Mostrar como usar <ArrowRight size={16} /></>,
      secundario: 'Agora não',
    },
    {
      titulo: '1 de 2 · Comece pela placa',
      texto: <>Digite a placa do carro no campo em destaque. O Deepcar mostra marca, modelo e ano, e já separa os esquemas que servem nele.</>,
      principal: <>Próximo <ArrowRight size={16} /></>,
      secundario: 'Pular',
    },
    {
      titulo: '2 de 2 · Ou procure pelo modelo',
      texto: <>Sem a placa? Digite o modelo, o motor ou o código. Pelo menu <b className="font-semibold text-ink-1">☰</b> você também navega por sistema e montadora.</>,
      principal: <>Começar a usar</>,
      secundario: null,
    },
  ] as const
  const atual = passos[passo]
  return (
    <>
      {passo === 1 && <Destaque alvo="placa" />}
      {passo === 2 && <Destaque alvo="busca" />}
      <Folha
        aberta
        semVeu={passo > 0}
        onFechar={encerrar}
        titulo={atual.titulo}
        acoes={<>
          <button type="button" data-foco onClick={() => (passo < 2 ? setPasso((passo + 1) as 1 | 2) : encerrar())} className={botaoPrincipal}>
            {atual.principal}
          </button>
          {atual.secundario && <button type="button" onClick={encerrar} className={botaoSecundario}>{atual.secundario}</button>}
        </>}
      >
        {atual.texto}
      </Folha>
    </>
  )
}

export function ConviteMomento() {
  const { pathname } = useLocation()
  const nav = useNavigate()
  const { ativo, sessao } = useTesteAtivo()
  const email = sessao?.email ?? ''
  const [tipo, setTipo] = useState<'placa' | 'esquema' | null>(null)
  // só no início e na placa: nunca por cima do visualizador do esquema
  const lugarCerto = pathname.replace(/\/$/, '') === '/app' || pathname.startsWith('/app/veiculo/')

  useEffect(() => {
    if (!ativo || !email || !lugarCerto) return
    let t = 0
    const conferir = () => {
      const p = convitePendente(email)
      if (!p) return
      window.clearTimeout(t)
      // espera a pessoa ver o resultado antes de oferecer o plano
      t = window.setTimeout(() => { if (convitePendente(email)) { conviteMostrado(email); setTipo(p) } }, 2500)
    }
    conferir()
    const parar = ouvirMomentoDeValor(conferir)
    return () => { parar(); window.clearTimeout(t) }
  }, [ativo, email, lugarCerto])

  if (!tipo || !sessao) return null
  const restante = restanteFree(sessao)
  const fechar = () => setTipo(null)
  return (
    <Folha
      aberta
      onFechar={fechar}
      titulo={tipo === 'placa' ? 'Achou pela placa? É assim todo dia.' : 'Você já abriu 3 esquemas.'}
      acoes={<>
        <button type="button" data-foco onClick={() => { setTipo(null); nav(PLANOS, { replace: true }) }} className={botaoPrincipal}>
          Ver planos <ArrowRight size={16} />
        </button>
        <button type="button" onClick={fechar} className={botaoSecundario}>Continuar testando</button>
      </>}
    >
      Assine e mantenha a placa e os esquemas liberados o ano inteiro: <b className="font-semibold text-ink-1">a partir de 12x de R$ {MENOR_PARCELA}</b> no
      cartão, ou à vista no Pix.
      {restante && restante > 0 ? <> Seu teste ainda tem <b className="font-semibold text-ink-1">{tempoRestante(restante)}</b>.</> : null}
    </Folha>
  )
}

/** Primeira vez num esquema: um cartão em cima do desenho, dentro da página (rola junto, não cobre nada). */
export function DicaEsquema() {
  const { sessao } = useAcesso()
  const email = sessao?.email ?? ''
  const [visivel, setVisivel] = useState(() => !!email && !dicaEsquemaVista(email))
  if (!visivel) return null
  const fechar = () => { marcarDicaEsquema(email); setVisivel(false) }
  return (
    <aside className="mb-3 rounded-xl border border-trace/30 bg-trace/[0.08] p-4 text-[14px] text-ink-2" aria-label="Como usar o esquema">
      <div className="flex items-start gap-3">
        <Lightbulb size={18} className="mt-0.5 flex-none text-trace-hi" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink-1">Como usar o esquema</p>
          <ul className="mt-1.5 grid gap-1 leading-relaxed">
            <li>• Toque no <b className="font-medium text-ink-1">nome do componente</b>, no alto do desenho, para buscar uma peça e ir direto a ela.</li>
            <li>• <b className="font-medium text-ink-1">Dois dedos</b> aproximam o desenho (no computador: + e −, ou Ctrl + rolagem).</li>
            <li>• As <b className="font-medium text-ink-1">setas</b> passam ao componente anterior e ao próximo.</li>
          </ul>
        </div>
        <button type="button" onClick={fechar} aria-label="Fechar dica" className="-mr-1 -mt-1 grid h-10 w-10 flex-none place-items-center rounded-lg text-ink-3 hover:bg-bench-3 hover:text-ink-1">
          <X size={17} />
        </button>
      </div>
      <button type="button" onClick={fechar} className="mt-2 h-10 rounded-lg px-3 text-[13.5px] font-medium text-trace-hi hover:bg-trace/10">Entendi</button>
    </aside>
  )
}
