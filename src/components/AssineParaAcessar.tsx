// Depois do teste gratuito a plataforma continua aberta: menu, montadoras, listas e busca funcionam.
// O que fecha é o conteúdo — o esquema aparece embaçado por trás do convite para assinar, e a consulta
// pela placa mostra o mesmo convite. O servidor também barra (402 em placa e compartilhar).
//
// O desenho embaçado é a primeira fatia do esquema numa <img> solta, nunca o visualizador: o visualizador
// tem tela cheia, e em tela cheia o filtro do pai não vale — o esquema apareceria nítido.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Lock, MessageCircle, Sparkles } from 'lucide-react'
import { linkCheckout, linkSuporte, temWhatsappSuporte } from '../lib/plano'
import { useAcesso } from '../lib/acesso'
import { urlImagem, type EsquemaDetalhe } from '../lib/acervo'
import { PLANOS_VENDA, precoDoCiclo, type Ciclo } from '../data/planos'
import { SeletorCiclo } from './SeletorCiclo'

/** O esquema embaçado, do tamanho do visualizador, com o convite por cima. */
export function EsquemaEmbacado({ d }: { d: EsquemaDetalhe }) {
  return (
    <div className="relative overflow-hidden rounded-xl border seam bg-[#10151c]" style={{ minHeight: 'min(80vh, 900px)' }}>
      <img
        src={urlImagem(d, d.trechos[0] ?? d.minimapa)}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-top opacity-95"
        // mesmo tom do desenho escuro do visualizador, e borrado o bastante para não servir de consulta
        style={{ filter: 'invert(1) hue-rotate(180deg) saturate(.35) blur(5px)', transform: 'scale(1.08)' }}
      />
      {/* a folha some para o fundo: o cartão fica legível em qualquer parte do desenho */}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-pit/0 via-pit/25 to-pit/75" />
      <div className="relative flex justify-center px-3 py-8 sm:px-6 sm:py-14">
        <ConviteAssinatura
          titulo="Assine um plano para acessar o sistema."
          oQue={`o esquema completo do ${d.marca} ${d.modelo} e todos os outros`}
        />
      </div>
    </div>
  )
}

/**
 * O cartão do convite: por que parou, os dois planos lado a lado e o checkout já preenchido.
 * Também serve a consulta por placa depois do teste.
 */
export function ConviteAssinatura({ titulo, oQue }: { titulo: string; oQue: string }) {
  const { sessao } = useAcesso()
  // quem abre no anual vê o menor preço por mês; é a mesma escolha da landing e da aba Plano
  const [ciclo, setCiclo] = useState<Ciclo>('anual')
  // a mesma tela vale quando o anual vence (api/_lib/sessao.js → vencerAnual)
  const anualVenceu = sessao?.assinatura?.status === 'expirada'
  const mensagem = anualVenceu
    ? 'Olá! Meu plano anual do Deepcar terminou e quero renovar.'
    : 'Olá! Terminei o teste gratuito do Deepcar e quero assinar para continuar consultando os esquemas.'

  return (
    <section
      aria-labelledby="convite-assinatura"
      className="w-full max-w-[640px] rounded-2xl border seam bg-bench-2/95 p-5 shadow-2xl backdrop-blur-md sm:p-8"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-full border border-trace/30 bg-trace/10 text-trace-hi">
          <Lock size={18} />
        </span>
        <p className="code text-[11px] uppercase tracking-[0.2em] text-ink-4">
          {anualVenceu ? 'Plano anual encerrado' : 'Teste gratuito encerrado'}
        </p>
      </div>

      <h2 id="convite-assinatura" className="mt-4 text-[24px] font-semibold leading-tight tracking-tight sm:text-[28px]">
        {anualVenceu ? 'Renove seu plano para acessar o sistema.' : titulo}
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
        Você continua navegando pelo acervo à vontade. Para abrir {oQue}, escolha um plano:
        o acesso libera na hora, aqui mesmo.
      </p>

      <SeletorCiclo ciclo={ciclo} onChange={setCiclo} className="mt-6 w-full sm:w-auto" />

      {/* Full primeiro: é o que abre qualquer esquema, leve ou diesel */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {[...PLANOS_VENDA].sort((a, b) => Number(b.destaque) - Number(a.destaque)).map((p) => (
          <a
            key={p.id}
            href={linkCheckout(p.id, sessao, ciclo)}
            target="_blank"
            rel="noreferrer"
            className={`group relative flex flex-col rounded-xl border p-4 transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-5 ${
              p.destaque ? 'border-trace/45 bg-trace/[0.07] hover:border-trace/70' : 'seam bg-bench-1 hover:border-[color:var(--seam-3)]'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[17px] font-semibold tracking-tight">{p.nome}</span>
              {p.destaque && (
                <span className="code inline-flex items-center gap-1 rounded-full border border-trace/35 bg-trace/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-trace-hi">
                  <Sparkles size={11} /> Completo
                </span>
              )}
            </div>
            <p className="mt-2 flex items-baseline gap-1">
              <span className="text-[12.5px] text-ink-4">R$</span>
              <span className="text-[28px] font-semibold leading-none tracking-[-0.02em]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {precoDoCiclo(p, ciclo)}
              </span>
              <span className="text-[12.5px] text-ink-4">/mês</span>
            </p>
            <ul className="mb-4 mt-3 space-y-1.5 text-[13px]">
              {p.resumo.map((i) => (
                <li key={i} className="flex items-start gap-2 text-ink-2">
                  <Check size={13} className="mt-[3px] flex-none text-trace/80" strokeWidth={2.5} /> {i}
                </li>
              ))}
            </ul>
            <span
              className={`mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-[10px] text-[14px] font-medium ${
                p.destaque ? 'btn-primary !h-11' : 'btn-ghost !h-11'
              }`}
            >
              Assinar {p.nome}{ciclo === 'anual' ? ' anual' : ''}
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </span>
          </a>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t seam-soft pt-4 text-[13px]">
        <p className="text-ink-4">Já assinou? O acesso libera sozinho, sem recarregar.</p>
        <div className="flex items-center gap-4">
          <Link to="/app/conta?aba=plano" className="text-trace hover:text-trace-hi">Comparar planos</Link>
          <a href={linkSuporte(mensagem)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-ink-3 hover:text-ink-1">
            <MessageCircle size={14} /> {temWhatsappSuporte ? 'WhatsApp' : 'Suporte'}
          </a>
        </div>
      </div>
    </section>
  )
}
