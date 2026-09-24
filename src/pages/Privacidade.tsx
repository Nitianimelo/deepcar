// /privacidade — política de privacidade do site e do app Android (a Google Play exige o endereço público).
// Descreve o que o código faz de fato: ao mudar coleta, provedor ou prazo, atualize este texto junto.
import { Link } from 'react-router-dom'
import { PaginaSimples } from '../components/PaginaSimples'
import { useTitulo } from '../lib/seo'

const EMAIL = (import.meta.env.VITE_SUPORTE_EMAIL as string | undefined) ?? 'nitiani@compilla.dev'
const ATUALIZADA_EM = '24 de setembro de 2026'

export default function Privacidade() {
  useTitulo('Política de privacidade · Deepcar')
  return (
    <PaginaSimples rotulo="Deepcar" titulo="Política de privacidade">
      <p className="text-ink-3">Atualizada em {ATUALIZADA_EM}. Vale para o site deepcar.app.br e para o aplicativo Deepcar para Android.</p>

      <h2>Quem somos</h2>
      <p>
        O Deepcar é uma plataforma de consulta de esquemas elétricos e informações técnicas automotivas para oficinas
        mecânicas. Somos o controlador dos dados pessoais descritos aqui, nos termos da Lei Geral de Proteção de Dados
        (Lei 13.709/2018). Fale com a gente pelo e-mail <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
      </p>

      <h2>O que coletamos e para quê</h2>
      <ul>
        <li>
          <b>Dados da conta:</b> nome, e-mail, WhatsApp e, se você informar, o nome da oficina. Servem para criar e
          identificar a sua conta, liberar o plano contratado e falar com você sobre ela. A senha é guardada cifrada
          (scrypt): nem a nossa equipe consegue lê-la.
        </li>
        <li>
          <b>Sessões e aparelhos:</b> para manter você conectado, guardamos um código de sessão (só a impressão digital
          dele fica no banco), o tipo de navegador ou aparelho e a data do último uso. Isso também controla quantos
          aparelhos o seu plano permite ao mesmo tempo.
        </li>
        <li>
          <b>Placas consultadas:</b> a placa que você digita é enviada ao nosso fornecedor de dados veiculares para
          identificar marca, modelo, ano e motorização. O resultado fica em memória no servidor por até 24 horas, para
          não repetir a consulta. O histórico das suas últimas consultas fica guardado só no seu aparelho.
        </li>
        <li>
          <b>Pagamentos:</b> as assinaturas são processadas pela Cakto. Recebemos dela o plano, o estado do pagamento e o
          e-mail do comprador, para liberar o acesso. Não recebemos nem guardamos dados de cartão.
        </li>
        <li>
          <b>Links compartilhados:</b> quando você compartilha um esquema, registramos o link, o esquema, quantas vezes
          ele foi aberto e um código aleatório do aparelho que abriu (para o limite de aberturas funcionar).
        </li>
        <li>
          <b>Preferências do aparelho:</b> tema do desenho, menu recolhido e as últimas consultas ficam no armazenamento
          local do navegador ou do app, e não são enviados para nós.
        </li>
      </ul>
      <p>
        Não vendemos dados, não exibimos anúncios e não usamos ferramentas de rastreamento de terceiros. O aplicativo não
        acessa contatos, localização, câmera, microfone nem arquivos do aparelho.
      </p>

      <h2>Com quem os dados são compartilhados</h2>
      <p>Só com os fornecedores necessários para o serviço funcionar, que tratam os dados em nosso nome:</p>
      <ul>
        <li>Vercel: hospedagem do site e do servidor.</li>
        <li>Neon: banco de dados onde ficam as contas.</li>
        <li>Cloudflare: armazenamento dos esquemas (não recebe dados pessoais).</li>
        <li>Cakto: processamento dos pagamentos.</li>
        <li>Falcon Data Hub: consulta dos dados do veículo a partir da placa.</li>
      </ul>
      <p>Também podemos informar dados quando uma lei ou ordem judicial exigir. Os dados trafegam sempre criptografados (HTTPS).</p>

      <h2>Por quanto tempo guardamos</h2>
      <p>
        Os dados da conta ficam guardados enquanto ela existir. As sessões vencem em 30 dias. Quando você exclui a conta,
        apagamos na hora o cadastro, as sessões e os links compartilhados. Os registros de pagamento recebidos da Cakto
        continuam guardados pelo prazo exigido pela legislação fiscal, sem ligação com a conta apagada.
      </p>

      <h2>Seus direitos</h2>
      <p>
        Você pode pedir acesso, correção, portabilidade ou exclusão dos seus dados, e tirar dúvidas sobre o tratamento,
        pelo e-mail <a href={`mailto:${EMAIL}`}>{EMAIL}</a>. Para apagar a conta sozinho, use a opção "Excluir conta" em
        Conta, no app ou no site, ou a página <Link to="/excluir-conta">Excluir conta</Link>.
      </p>

      <h2>Crianças</h2>
      <p>O Deepcar é uma ferramenta profissional e não é destinado a menores de 18 anos.</p>

      <h2>Mudanças nesta política</h2>
      <p>Quando esta política mudar, a data no topo desta página será atualizada. Mudanças importantes serão avisadas pelo e-mail da conta.</p>
    </PaginaSimples>
  )
}
