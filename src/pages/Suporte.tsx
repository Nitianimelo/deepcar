// /suporte — contato e ajuda rápida. A App Store exige um endereço público de suporte (URL de suporte da ficha).
import { Link } from 'react-router-dom'
import { PaginaSimples } from '../components/PaginaSimples'
import { IconeWhatsapp } from '../components/IconeWhatsapp'
import { emailSuporte, linkWhatsapp } from '../lib/suporte'
import { useTitulo } from '../lib/seo'

export default function Suporte() {
  useTitulo('Suporte · Deepcar')
  const whatsapp = linkWhatsapp('Olá! Preciso de ajuda com o Deepcar.')

  return (
    <PaginaSimples rotulo="Ajuda" titulo="Suporte">
      <p>
        Dúvida sobre um esquema, problema para entrar ou alguma questão sobre a assinatura? Fale com a nossa equipe.
      </p>

      <div className="not-prose mt-6 flex flex-wrap gap-3">
        {whatsapp && (
          <a href={whatsapp} target="_blank" rel="noopener" className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#25d366] px-5 font-medium text-[#0b2a17] hover:brightness-105">
            <IconeWhatsapp size={20} /> Falar no WhatsApp
          </a>
        )}
        <a href={`mailto:${emailSuporte}?subject=${encodeURIComponent('Suporte Deepcar')}`} className="inline-flex h-12 items-center rounded-xl border seam px-5 text-ink-1 hover:bg-bench-2">
          {emailSuporte}
        </a>
      </div>

      <h2>Perguntas frequentes</h2>
      <p>
        <b>Esqueci a senha.</b> Na tela de entrada, toque em "Esqueci a senha" e siga o link que chega no seu e-mail. Pela
        web: <Link to="/esqueci-senha">deepcar.app.br/esqueci-senha</Link>.
      </p>
      <p>
        <b>Como cancelo a assinatura?</b> Depende de onde ela foi feita. No iPhone: Ajustes → [seu nome] → Assinaturas →
        Deepcar. No Android: Google Play → Perfil → Pagamentos e assinaturas → Assinaturas. Pelo site: fale com a gente
        no WhatsApp ou no e-mail acima. O acesso continua até o fim do período já pago.
      </p>
      <p>
        <b>Posso usar a mesma conta no site e no app?</b> Sim. A conta e o plano valem no site, no app para iPhone e no
        app para Android, respeitando o limite de aparelhos do plano.
      </p>
      <p>
        <b>Não achei o esquema do meu carro.</b> Tente a consulta pela placa ou busque pelo motor ou pelo sistema. Se
        mesmo assim não encontrar, mande a placa ou o modelo pelo WhatsApp que a gente verifica.
      </p>
      <p>
        <b>Quero apagar minha conta.</b> No app: Conta → Excluir conta. Pela web: <Link to="/excluir-conta">deepcar.app.br/excluir-conta</Link>.
        Os detalhes do que guardamos estão na <Link to="/privacidade">política de privacidade</Link>.
      </p>
    </PaginaSimples>
  )
}
