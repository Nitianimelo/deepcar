// /privacidade — política de privacidade do site e dos apps Android e iPhone (a Google Play e a App Store exigem o endereço público).
// Descreve o que o código faz de fato: ao mudar coleta, provedor ou prazo, atualize este texto junto.
import { Link } from 'react-router-dom'
import { PaginaSimples } from '../components/PaginaSimples'
import { useTitulo } from '../lib/seo'

const EMAIL = (import.meta.env.VITE_SUPORTE_EMAIL as string | undefined) ?? 'contato@deepcar.app.br'
const ATUALIZADA_EM = '8 de outubro de 2026'

export default function Privacidade() {
  useTitulo('Política de privacidade · Deepcar')
  return (
    <PaginaSimples rotulo="Deepcar" titulo="Política de privacidade">
      <p className="text-ink-3">Atualizada em {ATUALIZADA_EM}. Vale para o site deepcar.app.br e para os aplicativos Deepcar para Android e para iPhone.</p>

      <h2>Quem somos</h2>
      <p>
        O Deepcar é uma plataforma de consulta de esquemas elétricos e informações técnicas automotivas para oficinas
        mecânicas, da Inttus Soluções Tecnológicas Ltda (CNPJ 50.256.051/0001-57). Somos o controlador dos dados pessoais descritos aqui, nos termos da Lei Geral de Proteção de Dados
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
          <b>Pagamentos:</b> as assinaturas feitas no site são processadas pela Cakto. Recebemos dela o plano, o estado do
          pagamento e o e-mail do comprador, para liberar o acesso. As assinaturas feitas no aplicativo para Android são
          processadas pela Google Play: recebemos o código da compra, o plano e até quando ele vale, e consultamos a Google
          para confirmar renovações e cancelamentos. As assinaturas feitas no aplicativo para iPhone são processadas pela
          App Store: recebemos da Apple o comprovante da compra (código da transação, plano, até quando vale e um código
          ligado à sua conta da Deepcar), e a Apple nos avisa de renovações, cancelamentos e reembolsos. Não recebemos nem
          guardamos dados de cartão.
        </li>
        <li>
          <b>Registro de uso:</b> guardamos o que você faz no site e no aplicativo (páginas abertas, buscas e quantos
          resultados tiveram, placas consultadas, esquemas abertos, quando vê os planos ou toca em assinar, erros), com a
          data, o tipo de aparelho e um código anônimo do navegador. Serve para entender onde o serviço falha e melhorá-lo.
          Fica no nosso banco de dados por até 120 dias e não é compartilhado.
        </li>
        <li>
          <b>Notificações (só nos aplicativos):</b> se você permitir, guardamos um código do aparelho, ligado à sua conta,
          para enviar avisos como o fim do teste grátis e novidades da Deepcar. No Android o código é gerado pelo Firebase
          Cloud Messaging (Google); no iPhone, pelo serviço de notificações da Apple (APNs). Dá para desligar nas
          configurações do aparelho; o código é apagado quando o aplicativo é desinstalado ou a conta é excluída.
        </li>
        <li>
          <b>Links compartilhados:</b> quando você compartilha um esquema, registramos o link, o esquema, quantas vezes
          ele foi aberto e um código aleatório do aparelho que abriu (para o limite de aberturas funcionar).
        </li>
        <li>
          <b>Anúncios (só no site):</b> nas páginas públicas do site (página inicial, cadastro, login e esta política)
          usamos o Pixel da Meta para medir os nossos anúncios no Facebook e no Instagram. Ele registra a visita à página
          a criação de conta e o clique nos botões de WhatsApp, junto com o endereço da página, dados técnicos do navegador
          e cookies da própria Meta. Junto vão o país (Brasil) e um código aleatório que o site cria e guarda no seu
          navegador para reconhecer visitas do mesmo aparelho; se você já tem conta e entrou por este navegador, vão também
          o e-mail, o WhatsApp e o nome, sempre em formato irreversível (hash), feito pelo próprio pixel antes do envio.
          Quando você cria a conta pelo site, clica para assinar um plano ou assina, o nosso
          servidor também avisa a Meta (API de Conversões) com o e-mail, o WhatsApp e o nome em formato irreversível (hash),
          o endereço IP, o navegador, os identificadores de anúncio da Meta (cookies _fbp/_fbc) e o código aleatório do
          navegador, para ela saber se a conta ou a compra veio de um anúncio. Para isso guardamos, junto da conta, o IP, o
          navegador, esses identificadores e o código aleatório do momento do cadastro. Dentro da plataforma, nos esquemas, nas placas consultadas e nos links compartilhados nada
          disso é enviado: no aviso de assinatura vai só o plano escolhido. Os aplicativos para Android e iPhone não usam o pixel nem rastreiam você entre apps, e cadastros feitos por eles não são
          informados à Meta. Para limitar o uso desses dados em anúncios, use as configurações de
          anúncios da sua conta da Meta ou bloqueie cookies de terceiros no navegador.
        </li>
        <li>
          <b>Primeiros passos na plataforma:</b> guardamos a data em que você concluiu as boas-vindas, fez a primeira
          consulta por placa e abriu o primeiro esquema (só a data, não qual placa nem qual esquema), para melhorarmos o
          começo de uso da plataforma.
        </li>
        <li>
          <b>De onde você chegou (só no site):</b> se você chegou por um link de campanha ou anúncio, guardamos no navegador
          e, ao criar a conta, junto dela, os parâmetros desse link (utm_source, utm_campaign e semelhantes, fbclid, gclid),
          a primeira página visitada, o site que trouxe você e a data. Serve para sabermos quais divulgações trazem clientes.
        </li>
        <li>
          <b>Preferências do aparelho:</b> tema do desenho, menu recolhido e as últimas consultas ficam no armazenamento
          local do navegador ou do app, e não são enviados para nós.
        </li>
      </ul>
      <p>
        Não vendemos dados e não exibimos anúncios. Fora o Pixel da Meta nas páginas públicas do site, descrito acima,
        não usamos ferramentas de rastreamento de terceiros. O aplicativo não acessa contatos, localização, câmera,
        microfone nem arquivos do aparelho.
      </p>

      <h2>Com quem os dados são compartilhados</h2>
      <p>Só com os fornecedores necessários para o serviço funcionar, que tratam os dados em nosso nome:</p>
      <ul>
        <li>Vercel: hospedagem do site e do servidor.</li>
        <li>Neon: banco de dados onde ficam as contas.</li>
        <li>Cloudflare: armazenamento dos esquemas (não recebe dados pessoais).</li>
        <li>Cakto: processamento dos pagamentos feitos no site.</li>
        <li>Google (Google Play e Firebase): pagamentos feitos no aplicativo para Android e envio das notificações.</li>
        <li>Apple (App Store e APNs): pagamentos feitos no aplicativo para iPhone e envio das notificações.</li>
        <li>Resend: envio dos e-mails da Deepcar (boas-vindas e criação de nova senha), com o seu nome e e-mail.</li>
        <li>Falcon Data Hub: consulta dos dados do veículo a partir da placa.</li>
        <li>Meta (Facebook/Instagram): medição dos anúncios (pixel nas páginas públicas do site e aviso de cadastro e compra).</li>
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
