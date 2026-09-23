# CONTEXTO.md · Deepcar

Memória do projeto: **estado atual, pendências e histórico detalhado de tudo que foi feito.**
Regras de trabalho estão em `AGENTE.md`.

> **Obrigatório:** a cada modificação no repositório, adicione uma entrada no topo do **Histórico**
> (modelo na seção 10 do `AGENTE.md`) e atualize "Estado atual" e "Pendências" se mudarem.
> A atualização vai **no mesmo commit** da modificação.

---

## Estado atual (atualizado em 2026-09-23)

- **Produção:** Vercel, projeto `nitiani-melo/deepcar`, deploy automático do `main` do GitHub `Nitianimelo/deepcar`.
- **Funcionando em produção:**
  - Landing (`/`) com mockups de celular/tablet, selos das lojas e dois planos com chave **Mensal/Anual** (abre no anual):
    Pro (R$ 47,90/mês ou R$ 29,90/mês no anual) e Full (R$ 59,90/mês ou R$ 37,90/mês no anual). A tela mostra só o valor
    por mês; o 12x (pagamento único de 12 meses) só aparece no checkout da Cakto.
    Dobras: hero → cobertura (60 montadoras / 98% da frota + faixa de logos) → busca por placa (`#placa`) → planos → rodapé. Textos comerciais fixos:
    subtítulo "15 mil modelos de veículos" e números "60 montadoras" / "98% da frota nacional".
    Faixa de montadoras da landing com os logos nas cores das marcas, sobre cartões claros.
    Movimento na landing (`src/components/landing/`): fundo com pulsos de corrente na grade, entrada das dobras no scroll,
    barra de progresso no cabeçalho e cards de plano com holofote, borda viva no Full e preço contando.
  - Cadastro aberto (`/cadastro`: nome, e-mail, WhatsApp, senha) e login (`/login`) com sessão em cookie httpOnly de 30 dias no Neon.
  - Plano **free = 10 minutos de acesso**, contados a partir do primeiro acesso; depois bloqueia a tela e a API responde 402.
  - **Pagamento pela Cakto**: produtos Pro (R$ 47,90) e Full (R$ 59,90) mensais, e **Pro Anual (R$ 358,80) e Full Anual
    (R$ 454,80)** como compra única de 12 meses em até 12x; webhook em `/api/webhooks/cakto` que troca o plano sozinho,
    pendências para quem paga sem conta e aba "Assinaturas" no `/admin`. O anual vence sozinho (`vencerAnual`).
  - `/admin`: usuários (busca, plano, papel, bloquear, trocar senha, apagar, liberar novo teste, WhatsApp como link) e cofre de chaves.
  - Tela inicial `/app`: cards "Consultar por placa" e "Buscar esquema" e card "Últimas consultas" (localStorage, por conta).
    Botão "Início" no menu lateral (e o logo leva para lá).
  - Busca geral `/app/busca?q=` em todos os sistemas (modelo, motor, código, gerenciamento, fabricação e nome do sistema).
  - Plataforma `/app`: seções de injeção (Leve/Diesel), ABS, elétrica (Leve/Diesel) e câmbio (Leve/Diesel), com catálogo do acervo no R2.
  - Visualizador de esquemas (scroll contínuo, zoom e pinça, minimapa, tela cheia, seletor de componentes com busca, claro/escuro) e impressão A4 com marca d'água.
  - Busca rápida Ctrl+K / ⌘K em qualquer tela do app (placa, esquemas, últimas consultas).
  - Consulta por placa (`/app/veiculo/:placa`): Falcon Data Hub → modo simulado, com cache de 24 h em memória.
    `FALCON_TOKEN` gravado no cofre do banco (tabela `segredos`) em 2026-09-16: produção consulta o Falcon de verdade.
    Consulta real testada pelo usuário e funcionando. A ficha mostra também procedência (importado/nacional) e chassi.
- **Visual:** tema escuro em grafite azulado (fundo `#151b24`), todos os textos com contraste ≥ 4,5:1 sobre os cartões.
- **Banco (Neon):** migrações `001_inicial` a `004_plano_anual` aplicadas.
- **Último deploy verificado:** commit `b100d52`, estado `success` (2026-09-16).

## Pendências e problemas conhecidos

- [ ] `README.md` desatualizado: a seção "Estado atual" ainda fala em login mock/localStorage, e a tabela da Vercel
      lista `LOGIN_USUARIO`/`LOGIN_SENHA`/`LOGIN_USUARIOS`, que as funções de `api/` não usam mais.
- [ ] `npm run dev` não suporta o fluxo de contas do Neon (`/api/login` antigo, sem `/api/registrar`, `/api/sessao`, `/api/admin/*`).
      Testar contas via `vercel dev` ou Preview Deployment.
- [ ] Scripts de acervo e do executável dependem de caminhos Windows (`E:\`).
- [ ] 13 avisos do oxlint (0 erros) em `src/`: `set-state-in-effect`, `exhaustive-deps`, `only-export-components`.
- [ ] Selos App Store / Google Play na landing ainda sem `href` real (`src/components/StoreBadges.tsx`).
- [ ] A foto da dobra `#placa` é gerada por IA: a tela do celular tem nomes de montadora com erro de grafia
      ("Chewolet", "Citrofo", "Alfa Roemo"). No tamanho exibido não se lê, mas vale trocar por foto real quando houver.
- [ ] **Anual "sem juros" precisa ser ligado no painel da Cakto** (Pro Anual e Full Anual → parcelamento sem juros /
      produtor absorve os juros): a API pública ignora `absorbInstallmentInterest`. Enquanto estiver desligado, o cliente
      paga juros no parcelado e a parcela no checkout fica acima dos R$ 29,90 / R$ 37,90 por mês que a tela mostra.
- [ ] Boleto não está habilitado na conta da Cakto (a API recusa `boleto` nos produtos). Habilitar no painel, se quiser.
- [ ] Quem passa do mensal para o anual precisa cancelar a mensal pelo suporte (a tela avisa); não há cancelamento automático.
- [ ] Fazer uma compra real de validação (pode estornar em seguida) para ver o caminho inteiro com produto verdadeiro:
      o evento de teste da Cakto usa um produto fictício e por isso nunca chega a liberar plano.
- [ ] Bloqueio de sistemas por plano (Pro sem diesel nem câmbio) e limite de dispositivos (2/4): fora do escopo desta
      entrega, pendente de decidir como separar leve/diesel nas seções Elétrica e Câmbio.
- [ ] Portal do assinante (trocar cartão, cancelar) — hoje isso é feito pelo painel da Cakto.
- [ ] Planos da landing (Pro e Full) ainda não existem no sistema: o banco só conhece `free`/`pro`, não há plano `full`,
      os sistemas não são liberados por plano e o limite de dispositivos (2 ou 4) não é aplicado. Os botões levam ao cadastro grátis.
- [ ] Barra superior do app no celular com plano Free: o contador de tempo aperta o campo de placa (o texto "Placa · ABC1D23" aparece cortado). No Início não acontece mais (o campo não aparece lá); nas outras telas continua.
- [ ] Conferir numa placa real se chassi e procedência aparecem (nomes dos campos não estão na documentação pública
      do Falcon; se não aparecerem, mandar a resposta bruta para ajustar `achar()` em `provedores/falcon.mjs`). Confirmar com o Falcon se o endereço
      `beta.falcon-server.com.br/data-hub` é o definitivo. Plano grátis = 10 consultas/hora para todos os usuários juntos.
- [ ] Limpar variáveis antigas na Vercel que não são mais lidas ou ficam por baixo do cofre: `FALCON_TOKEN` (o valor do
      cofre tem prioridade), `CONSULTARPLACA_EMAIL` e `CONSULTARPLACA_API_KEY` (provedor removido).
- [ ] Trocar o token do Falcon por um novo no painel deles e regravar no `/admin` (o atual circulou em conversa).
- [ ] Cache de placas no Neon (modelo e ano não mudam: cada placa seria consultada uma única vez). Precisa de migração.
- [ ] Coerência de texto: o hero diz "só precisa digitar a placa do carro", mas na tabela a busca pela placa aparece só no Full.

---

## Histórico (mais recente primeiro)

### 2026-09-23 · Anual sem destaque de economia: só o valor por mês
- **Quem:** Claude Code (Opus 5.5), a pedido de Nitiani
- **Pedido:** tela mais limpa. Manter a chave Mensal/Anual, mas no anual mostrar só "R$ 37,90/mês" (Full) e
  "R$ 29,90/mês" (Pro), sem economia, sem 12x e sem total: o cliente só vê que é dividido em 12x no checkout.
- **O que mudou:**
  - `CardPlano` (landing) e aba Plano da `Conta`: tiradas a mensalidade riscada, o "12x", o total por ano, o
    "economize R$" e a linha "Cobrança mensal, cancele quando quiser"; os dois ciclos mostram "R$ X /mês".
  - `SeletorCiclo`: sem o selo "−37%".
  - `LimiteFree`: botões "Assinar Full · R$ 37,90/mês" no anual (antes "12x R$ 37,90").
  - Rodapé da aba Plano: saiu a frase sobre 12x no cartão / à vista no PIX.
  - `src/data/planos.ts`: removidos `totalAnual`, `economiaAnual`, `descontoAnual` e `reais`, sem uso.
  - O resto continua igual: chave abrindo no anual, links de checkout, "válido até" para quem tem o anual, webhook.
- **Banco / Variáveis / Cakto:** sem mudança.
- **Verificação:** build ok; oxlint 13 avisos; capturas (WebKit) da landing no anual e no mensal e da tela de fim do teste.
- **Pendências:** as mesmas (ligar "sem juros" nos anuais no painel da Cakto, para a parcela bater com o valor mostrado).

### 2026-09-23 · Planos anuais (Pro e Full em 12x) com chave Mensal/Anual
- **Quem:** Claude Code (Opus 5.5), a pedido de Nitiani
- **Pedido:** acrescentar Pro e Full anuais — Pro 12x R$ 29,90 e Full 12x R$ 37,90 — com uma chave que troca os preços
  entre mensal e anual na landing e no painel, e deixar cadastrado e funcionando na Cakto (1 a 12x, Pix etc.).
- **Na Cakto (produção):** dois produtos novos, **pagamento único** (a credencial não tem escopo de ofertas, então não dá
  para criar assinatura com recorrência anual pela API; e compra única é o que permite parcelar em 12x):
  - "Plataforma Deepcar - Plano Pro Anual" `9ba85bad-6609-4237-bb09-518fbea7f01d`, R$ 358,80, checkout
    `https://pay.cakto.com.br/6ccodaw`
  - "Plataforma Deepcar - Plano Full Anual" `f9302199-9ff2-4b8c-a4d2-ac27bae48983`, R$ 454,80, checkout
    `https://pay.cakto.com.br/uigfpmf`
  - Parcelamento até 12x (confirmado no checkout), cartão, Pix, PicPay, Apple Pay, Google Pay e 3DS. **Boleto recusado**
    pela API (não habilitado na conta). **"Sem juros" não pega pela API** (ver Pendências). Garantia padrão 7 dias.
  - Webhook 69384 agora cobre os 4 produtos (mesmos 12 eventos; `secret` conferido igual antes e depois).
  - Um produto duplicado de teste foi criado e apagado (`80192dfd…`, status `deleted`).
- **Banco:** `db/004_plano_anual.sql` **aplicado no Neon** — `usuarios.assinatura_ciclo` (`mensal|anual`),
  `usuarios.plano_expira_em`, `assinaturas_pendentes.ciclo`; contas pagas antigas marcadas como `mensal`.
- **Cofre:** `CAKTO_PRODUTO_PRO_ANUAL` e `CAKTO_PRODUTO_FULL_ANUAL` gravados (e os dois mensais conferidos).
- **Vercel:** `VITE_CAKTO_CHECKOUT_PRO_ANUAL` e `VITE_CAKTO_CHECKOUT_FULL_ANUAL` em Production e Preview.
- **API:**
  - `_lib/cakto.js`: `planoDoProduto()` devolve `{ plano, ciclo }` (tabela `PRODUTOS` com as 4 chaves do cofre).
  - `_lib/assinatura.js`: `aplicarNaConta()` grava o ciclo; no anual soma 1 ano a partir do fim do anual que ainda vale
    (renovar antes não perde dias) ou da data do pagamento (pendência consumida depois); a mesma compra reentregue não
    soma outro ano. `derrubarParaFree()` respeita quem tem os dois ciclos: cancelar a mensal mantém o anual no prazo, e
    reembolso do anual mantém uma mensal ativa. Pendências guardam o ciclo.
  - `_lib/sessao.js`: `vencerAnual()` — anual vencido volta a `free` (`assinatura_status = 'expirada'`, sem teste novo)
    na sessão conferida e no login; admin e plano manual não vencem. `publico()` expõe `assinatura.ciclo` e `validoAte`.
  - `admin/usuarios.js` e `admin/assinaturas.js` devolvem ciclo e validade.
- **Front:**
  - `src/data/planos.ts`: `precoAnual` por plano, `precoDoCiclo`, `totalAnual`, `economiaAnual`, `descontoAnual` (37%).
  - `src/components/SeletorCiclo.tsx` (novo): chave Mensal/Anual (radiogroup, setas do teclado, selo −37%).
  - Landing: chave acima dos cartões (abre no **anual**); `CardPlano` mostra "12x R$ 29,90", a mensalidade cheia riscada,
    o total por ano e quanto economiza; o preço anima do valor atual ao novo quando a chave troca.
  - Conta → Plano: chave, preço por ciclo, "Assinar Pro anual" / "Passar para anual" / "Trocar para Full anual",
    "válido até dd/mm/aaaa" para o anual e aviso para cancelar a mensal ao passar para o anual.
  - Tela de fim do teste (`LimiteFree`): chave e botões por ciclo; quando o anual vence, o título vira "Seu plano anual terminou."
  - `/admin`: pastilha "· anual · até dd/mm/aaaa" e estado "anual vencido"; pendências marcam "anual".
- **Verificação:** build ok; oxlint 13 avisos (sem novos). Webhook testado com `vercel dev` contra o banco de produção e
  conta descartável, 11 cenários conferindo o banco a cada passo: anual sem conta → pendente com ciclo; cadastro consome →
  pro/anual +1 ano; reentrega do mesmo pedido não soma; nova compra anual soma (+2 anos); mensal por cima e cancelada →
  anual segura; vencimento → free/expirada; recompra após vencer → +1 ano de hoje; reembolso do anual → free; mensal
  aprovada/cancelada segue igual. Dados de teste apagados. Capturas (WebKit) da landing em 1280 e 390 px nas duas
  posições da chave, da Conta com anual ativo e da tela de anual vencido.
- **Pendências:** ligar "sem juros" nos dois produtos anuais no painel da Cakto; boleto; compra real de validação do anual.

### 2026-09-22 · Tela cheia do esquema corrigida, navegação por componente e movimento na plataforma
- **Quem:** Claude Code (Opus 5.5), a pedido de Nitiani
- **Pedido:** corrigir a tela cheia do esquema (estava com bug), facilitar a navegação e aplicar na plataforma interna
  (início e esquemas) o movimento discreto recomendado.
- **Bug da tela cheia (reproduzido e corrigido):** o "Modo de leitura" saía pelo **Esc sem guardar a posição** e o
  esquema voltava ao topo (só o botão preservava). Além disso, não era tela cheia de verdade: a barra do navegador ficava.
- **O que mudou:**
  - `src/components/EsquemaViewer.tsx`:
    - "Modo de leitura" virou **Tela cheia** (botão, tecla **F**): pede a tela cheia do navegador (API Fullscreen) e,
      onde ela não existe (Safari do iPhone), fica a sobreposição de antes. Toda saída (botão, F, Esc, Esc do próprio
      navegador) passa por `sair()`, que guarda o ponto do desenho. Em tela cheia do navegador a saída espera o
      `fullscreenchange`: restaurar antes disso deixava a página sem altura e jogava ao topo (achado no teste).
    - `measureFit` mantém no topo o mesmo ponto do desenho quando a largura muda (entrar/sair da tela cheia, girar o
      tablet, recolher o menu).
    - **Pinça com dois dedos** no celular/tablet amplia o desenho (não a página); os botões −/+ ficam do tablet para cima.
    - Anterior/próximo componente agora aparece também no celular.
    - Fatias do desenho: brilho na cor da folha enquanto baixam e aparecem suaves. Antes, no tema escuro, a fatia ainda
      não carregada aparecia como bloco claro (o filtro de inversão clareava o fundo dela).
  - `src/components/SeletorComponente.tsx` (novo): no lugar do `<select>`, botão com o componente atual e a posição
    ("18/41") que abre lista com busca, agrupada, com setas/Enter e tecla **/** para abrir. Fica dentro do visualizador
    para funcionar na tela cheia.
  - `src/components/Tooltips.tsx`: o balão vai para dentro do elemento em tela cheia (senão sumia nela).
  - `src/components/PaletaBusca.tsx` (novo) + `AppLayout.tsx`: **busca rápida Ctrl+K / ⌘K** de qualquer tela: placa
    válida vira "Consultar placa", texto busca no catálogo inteiro (mesma regra do `/app/busca`), vazio mostra as últimas
    consultas; botão "Buscar" na barra superior (a partir do tablet).
  - Troca de telas com **View Transitions** (`viewTransition` nos links do menu, lista, início, placa e voltar): a tela
    cruza em ~140 ms e o título do esquema "voa" da linha clicada até o cabeçalho (`src/lib/transicao.ts`, nome
    `titulo-esquema` no `<h1>` do `EsquemaPage`). Navegador sem suporte troca na hora.
  - Carregamentos: `animate-pulse` trocado por brilho passando (`.skeleton`) em seção, busca, esquema e placa. A consulta
    de placa ganhou linha de leitura passando e, depois de 5 s, avisa que a base está demorando.
  - Itens das últimas consultas e cartões de sistemas da placa entram em sequência rápida (`.surge`).
  - `src/index.css`: bloco "Plataforma: movimento curto e funcional". Tudo desliga com `prefers-reduced-motion`.
  - `AGENTE.md`: mapa do código com os componentes novos (inclusive os da landing do commit anterior).
- **Banco / Variáveis:** sem mudança.
- **Verificação:** `npm run build` ok; oxlint 13 avisos (os mesmos de antes; os novos que apareceram no meio foram
  resolvidos). No navegador (WebKit, `vite` com o acervo do R2 e sessão simulada), esquema real Alfa Romeo 145:
  tela cheia do navegador ativa; saída por botão, F e Esc voltando exatamente ao mesmo ponto (42,7% → 42,7%); busca
  "sonda" + Enter no seletor pulou para a Sonda Lambda; no celular (390 px) barra com seletor, anterior/próximo, tema e
  tela cheia, sem rolagem horizontal e sem blocos claros; Ctrl+K "gol 1.6" → 56 esquemas, Enter abre o esquema;
  clique na lista abre o esquema com a transição; sem erros no console.
- **Não testado:** pinça em aparelho real (o navegador de teste não simula dois dedos) e a tela cheia no iPad.
- **Pendências:** nenhuma nova.

### 2026-09-22 · Landing com movimento: scroll, fundo animado e cards de plano
- **Quem:** Claude Code (Opus 5.5), a pedido de Nitiani
- **Pedido:** usar o MCP do 21st.dev para melhorar e animar o scroll, o fundo e os cards dos planos, deixando mais
  profissional. Só a landing.
- **Do 21st.dev:** consultados "Grid Beam" (cult-ui) e "Reveal" (asanshay); adaptados, não instalados. A cota grátis
  do MCP é de 2 componentes por dia, então o "Card Spotlight" foi refeito em CSS a partir da descrição.
- **O que mudou:**
  - `src/components/landing/GridBeam.tsx` (novo): canvas com pulsos de luz correndo pelas linhas de uma grade (corrente
    numa trilha), cruzamentos acendem quando dois pulsos se encontram. Paleta azul do produto com um fio de verde; células
    quadradas pelo tamanho do bloco; **para** fora da tela, com a aba oculta e com `prefers-reduced-motion` (desenha um
    quadro parado). Sem dependência nova (o original usava `cn`/shadcn).
  - `src/components/landing/Reveal.tsx` (novo): entrada no scroll (sobe, aparece e desfoca → nítido) com atraso em
    sequência, por IntersectionObserver + CSS, em vez da biblioteca `motion` do original.
  - `src/components/landing/CardPlano.tsx` (novo): card de plano saiu de `Landing.tsx`. Holofote segue o ponteiro
    (preenchimento + borda acesa), cartão sobe no hover, preço conta de 0 até o valor ao aparecer, itens entram em
    sequência. No Full: borda viva girando (conic-gradient com `@property --ang`), halo verde pulsando atrás, selo com
    ponto pulsando e brilho atravessando o botão.
  - `src/pages/Landing.tsx`: hero com as luzes do fundo derivando devagar e o `GridBeam` no lugar da grade estática;
    celular e tablet flutuando de leve (a animação fica no aparelho e a posição no invólucro, para os transforms não
    brigarem); todas as dobras entram com `Reveal`; seção de planos com rótulo "Assinatura mensal" e o `GridBeam`
    ao fundo. Cabeçalho ganha barra fina de progresso de leitura e fica mais denso com sombra depois de rolar.
  - `src/index.css`: bloco "Landing: movimento" (rolagem suave nos links âncora só quando `.landing` existe,
    `scroll-margin-top` para o cabeçalho fixo, `.reveal`, `.plano*`, animações). Tudo desliga com `prefers-reduced-motion`.
  - Textos, preços e links não mudaram.
- **Banco:** sem mudança.
- **Variáveis/infra:** sem mudança. Nenhuma dependência nova.
- **Verificação:** `npm run build` ok; oxlint 13 avisos (os mesmos; nada nos arquivos novos); no navegador (WebKit,
  `vite preview`) 1440×900 e 390×844: hero, cabeçalho com progresso, cards com hover/holofote, contagem do preço,
  itens e brilho do botão; sem rolagem horizontal no celular; sem erros no console.
- **Pendências:** nenhuma.

### 2026-09-21 · Aba "Plano" na conta e teste gratuito de 10 minutos
- **Quem:** Claude Code (Opus 5), a pedido de Nitiani
- **O que mudou:**
  - `src/pages/Conta.tsx`: a tela ganhou abas **Conta** e **Plano**. Na aba Plano: o plano atual com o estado da
    assinatura e a próxima cobrança; para quem está no teste, quanto resta dos 10 minutos; os dois planos lado a lado com
    preço, itens e botão **Assinar** (ou **Trocar para Full** para quem já paga, e "Plano ativo" no plano vigente);
    rodapé explicando que o pagamento é pela Cakto e link para o suporte (trocar cartão, cancelar). O checkout abre com
    nome, e-mail e telefone preenchidos.
  - `src/data/planos.ts` (novo): nome, preço, público e itens de cada plano num lugar só. A landing e a conta leem daqui,
    e `PRECOS` em `src/lib/plano.ts` passou a derivar deste arquivo — antes o preço estava escrito em dois lugares.
  - **Teste gratuito de 5 → 10 minutos**: `MINUTOS_FREE` em `api/_lib/sessao.js` e `src/lib/plano.ts` (as duas cópias
    mudam juntas, regra do AGENTE.md §8). Vale para quem ainda não começou o teste; quem já tem `free_expira_em` gravado
    mantém a janela antiga (o admin pode liberar um teste novo pelo `/admin`).
- **Verificação:** build ok; oxlint 13 avisos (sem novos); no navegador, com sessão simulada: conta free vê "Assinar Pro"
  e "Assinar Full" com os links reais e o e-mail preenchido; conta Pro vê "Plano ativo" no Pro e "Trocar para Full";
  contador mostrando 7:00 dos 10 minutos. Capturas em 1280×900 e 390×844.
- **Pendências:** nenhuma nova.

### 2026-09-21 · Pagamento pela Cakto: a assinatura troca o plano sozinha
- **Quem:** Claude Code (Opus 5), a pedido de Nitiani
- **Pedido:** criar a oferta de R$ 47,90 (a de R$ 59,90 já existia) e integrar os webhooks para o pagamento liberar o
  acesso e trocar o plano, tudo integrado ao painel do admin.
- **Na Cakto (produção):** produto **"Plataforma Deepcar - Plano Pro"** criado (`b5e5701c-82d4-43a9-a040-1ff960a60368`,
  R$ 47,90, assinatura); webhook **id 69384** apontando para `https://deepcar.vercel.app/api/webhooks/cakto`, nos dois
  produtos, com 12 eventos. O `secret` do webhook veio em `fields.secret` (não no corpo da criação).
- **Cofre do `/admin`:** `CAKTO_WEBHOOK_SECRET`, `CAKTO_PRODUTO_PRO`, `CAKTO_PRODUTO_FULL` (gravadas e conferidas).
- **Banco:** `db/003_assinaturas_cakto.sql` aplicado — plano aceita `full`, 9 colunas de assinatura em `usuarios`,
  tabela `cakto_eventos` (idempotência + auditoria) e `assinaturas_pendentes` (pagou sem ter conta).
- **API:** `_lib/cakto.js` (prova da origem, evento→ação, produto→plano), `_lib/assinatura.js` (ativar, derrubar,
  atraso, consumir pendência, vincular), `webhooks/cakto.js` (rota pública) e `admin/assinaturas.js`.
  `registrar.js` e `login.js` consomem a pendência; `admin/usuarios.js` aceita `full` e marca `assinatura_origem='manual'`
  quando o admin mexe no plano (assim um chargeback não desfaz a decisão dele); `_lib/sessao.js` expõe o estado da
  assinatura sem ids de cobrança.
- **Front:** tipo `Plano` com `full`; `linkCheckout()` leva ao checkout com e-mail/nome/telefone preenchidos; a tela de
  fim do teste passa a ter "Assinar Full" e "Assinar Pro"; a Conta mostra o estado da assinatura e a próxima cobrança;
  o `/admin` ganhou a opção Full, a pastilha de estado por usuário e a aba **Assinaturas** (pendentes com vincular/
  descartar e os últimos eventos com filtro de problemas).
- **Descoberta importante:** na Vercel **não dá para conferir o HMAC** do webhook — o runtime consome o corpo antes do
  handler e não expõe `rawBody` (medido: `readableEnded: true`, sem `req.rawBody`). A validação usa o campo `secret` do
  corpo (a outra forma documentada pela Cakto), e a janela de 5 minutos continua sendo exigida quando o cabeçalho de
  tempo vem junto. O código ainda tenta o HMAC primeiro, para o dia em que rodar num runtime que entregue os bytes.
- **Verificação:** `vercel dev` contra o banco de produção com conta descartável — 12 cenários (compra aprovada, entrega
  repetida → `repetido`, assinatura criada, atraso, atraso recuperado, produto desconhecido → erro, evento informativo →
  ignorado, reembolso, secret certo sem assinatura → aceito, secret errado → 401, timestamp velho → 401) e uma sequência
  encadeada conferindo o banco a cada passo: aprovado → `full/ativa`; atraso → `em_atraso` **sem perder o acesso**;
  recuperado → `ativa`; cancelado → `free/cancelada`; nova compra → `full`; chargeback → `free/chargeback`.
  O cadastro com o e-mail de uma compra pendente criou a conta **já no plano pago**. Dados de teste apagados depois
  (44 eventos, 2 pendências e a conta); as 3 contas reais ficaram intactas. `npm run build` ok; oxlint 13 avisos
  (1 novo, mesmo padrão da aba de chaves).
- **Conferido em produção (depois do deploy):** `POST /api/webhooks/cakto` com segredo errado → 401; evento de teste
  disparado pela própria Cakto (`webhook_event_test_create`, evento `purchase_approved`) chegou, foi autenticado e
  gravado em `cakto_eventos` como `erro: produto desconhecido` — o payload de teste da Cakto usa um produto fictício,
  então esse é o resultado certo. Registro de teste apagado depois.
- **Links de checkout** (do painel, em Production e Preview na Vercel; o `short_id` do produto não serve):
  `VITE_CAKTO_CHECKOUT_PRO = https://pay.cakto.com.br/3c9ck5a_1126774` e
  `VITE_CAKTO_CHECKOUT_FULL = https://pay.cakto.com.br/vxd8vpe_1117560`. As duas páginas confirmam preço e
  **renovação mensal**. Como são `VITE_*`, trocar o link exige novo deploy.
- **Pendências:** bloqueio por plano e limite de dispositivos; portal do assinante; uma compra real de validação.

### 2026-09-21 · Cakto (gateway de pagamento) conectado via MCP
- **Quem:** Claude Code (Opus 5), a pedido de Nitiani
- **Pedido:** conectar ao MCP da Cakto para integrar pagamentos; credenciais guardadas localmente.
- **O que foi feito (nada de código ainda):**
  - Credenciais em `~/.config/deepcar/cakto.env` (permissão 600, **fora do repositório**): `CAKTO_MCP_URL`,
    `CAKTO_CLIENT_ID`, `CAKTO_CLIENT_SECRET`.
  - Servidor MCP registrado no **escopo de usuário** (`~/.claude.json`, vale em qualquer projeto, não vai para o Git):
    `claude mcp add --scope user --transport http cakto https://mcp.cakto.com.br` com os cabeçalhos
    `X-Cakto-Client-Id` / `X-Cakto-Client-Secret`. Status `✔ Connected`. Para remover: `claude mcp remove cakto -s user`.
  - Credencial conferida (`cakto_whoami`): ambiente **produção**, base `https://api.cakto.com.br`, escopos `read`, `write`,
    `products`, `orders`, `payments`, `subscriptions`, `webhooks`. O token expira e é renovado pelo próprio MCP.
  - Catálogo: 59 endpoints em 11 grupos — products (11), subscriptions (11), webhook (8), orders (6), order-bumps (6),
    offers (5), withdrawals (3), installment-interest (3), balance (2), customers (2), payments (1).
  - Eventos de webhook úteis para o produto: `purchase_approved`, `purchase_refused`, `refund`, `chargeback`,
    `subscription_created`, `subscription_canceled`, `subscription_late`, `subscription_late_recovered`,
    `subscription_paused`, `subscription_renewal_*`, `pix_gerado`, `boleto_gerado`, `checkout_abandonment`.
  - Ferramentas do MCP: `cakto_search_api`, `cakto_list_endpoints`, `cakto_get_endpoint`, `cakto_call` (escrita só com
    `confirm=true`, com preview antes), `cakto_search_docs`, `cakto_get_guide`, `cakto_list_webhook_events`, `cakto_whoami`.
- **Atenção:** a credencial é de **produção e tem escopo de escrita**; nunca commitar, e trocar a chave se ela vazar.
- **Pendências:** modelar Pro/Full na Cakto e no banco, checkout no app e webhook que muda o plano automaticamente.

### 2026-09-18 · Revisão dos submenus: dica do grupo e redirecionamento com filtro
- **Quem:** Claude Code (Opus 5), a pedido de Nitiani ("revisa algum possível bug")
- **O que mudou:**
  - `src/components/Sidebar.tsx`: a dica (`data-tip`) do cabeçalho de grupo estava escrita à mão para injeção
    ("Injeção leve (Otto e flex) e diesel") e passou a aparecer igual em Elétrica e Câmbio depois do commit anterior.
    Agora é montada do próprio grupo: "Elétrica: Leve e Diesel" / "Recolher Elétrica".
  - `src/App.tsx`: novo componente `Redireciona`, que mantém a query ao mandar `/app/eletrica` e `/app/cambio` para
    `/leve`. O `<Navigate>` anterior descartava a busca, então link salvo com `?marca=Volvo` caía na grade de montadoras.
- **Revisado e sem mudança necessária:** `compatibilidade.ts`, `busca.ts`, `ListaEsquemas`, `PrintEsquema` e
  `EsquemaPage` derivam tudo de `NAV`/`SECTION_META`; o plano free não filtra por seção; os logos das marcas novas
  (Scania, MAN, Marcopolo, Troller, Mahindra…) já existem em `public/marcas`.
- **Efeito colateral bom:** com a marca de nome limpo nas seções diesel, a consulta por placa passa a achá-las —
  antes, "Scania Caminhões" nunca casava com a marca da placa.
- **Atenção (não é defeito):** `/app/busca` e a consulta por placa baixam o catálogo de **todas** as seções, que agora
  são 7 (mais ~1,2 MB não comprimido). Se incomodar, o caminho é buscar por seção sob demanda.
- **Banco / Variáveis:** sem mudança.
- **Verificação:** `npm run build` e `npm run lint` (0 erros). No acervo: 1.198 fichas e 38.085 imagens nas seções
  `-diesel`, nenhuma sobra `-truck`, e amostra de 20 modelos conferida por HTTP (ficha + última imagem + minimapa).
- **Pendências:** as mesmas do commit anterior.

### 2026-09-18 · Submenus Leve/Diesel em Elétrica e Câmbio
- **Quem:** Claude Code (Opus 5), a pedido de Nitiani
- **Pedido:** o acervo de caminhões, ônibus e picapes diesel (elétrica e câmbio) acabou de subir para o R2 e precisa
  aparecer como submenu, do mesmo jeito que a injeção já tem Leve e Diesel.
- **O que mudou:**
  - `src/data/nav.ts`: `SectionKey` ganhou `eletrica-diesel` e `cambio-diesel`; Elétrica e Câmbio deixaram de ser itens
    soltos e viraram grupos com os filhos **Leve** e **Diesel** (mesmos ícones da injeção: `Car` e `Truck`).
    `SECTION_META` ganhou as duas seções novas e os títulos das antigas viraram "Elétrica · Leve" e "Câmbio · Leve".
  - `src/lib/acervo.ts`: `rotaSecao` virou uma tabela `ROTAS` (antes era um encadeado de ternários só para a injeção).
  - `src/App.tsx`: rotas `eletrica/leve`, `eletrica/diesel`, `cambio/leve`, `cambio/diesel`; `/app/eletrica` e
    `/app/cambio` continuam existindo como redirecionamento para `/leve`, para não quebrar link salvo.
  - Nada mais precisou mudar: menu, busca, compatibilidade por placa e impressão já derivam de `NAV`/`SECTION_META`.
- **Acervo (R2):** seções novas `eletrica-diesel` (884 esquemas, 25 marcas) e `cambio-diesel` (314, 17 marcas), geradas
  pelo pipeline em `E:\Esquemas_Azul_Preto_20260908` (`Publicar-R2.ps1`, `Reorganizar-Diesel-R2.ps1`). As marcas ficam
  com o nome limpo ("Scania"), porque a seção já diz que é diesel. `catalogo/eletrica.json` e `catalogo/cambio.json`
  voltaram ao conteúdo de antes (1.527 e 1.335), e o `index.json` agora tem 7 seções.
- **Banco:** sem mudança.
- **Variáveis/infra:** sem mudança (mesmo bucket e mesma `VITE_ACERVO_URL`).
- **Verificação:** `npm run build` e `npm run lint` (0 erros; os 12 avisos conhecidos continuam). Conferido no ar que o
  JSON das seções novas e as imagens respondem no domínio público do R2.
- **Pendências:** 14 PDFs de câmbio diesel ficaram sem esquema (esquema em blocos, sem coluna do módulo; detalhes no
  README do pipeline) e o plano Free continua sem separar o que cada seção libera.

### 2026-09-18 · Página de vendas: sem os "5 minutos", "manual técnico" na dobra da placa e CTA verde
- **Quem:** Claude Code (Opus 5), a pedido de Nitiani
- **O que mudou (só a landing):**
  - **Fora a menção aos minutos grátis:** saiu "Grátis por 5 minutos, sem cartão." da dobra da placa e o texto dos planos
    virou "A conta gratuita abre na hora, sem cartão, para você conhecer o acervo por dentro.". `MINUTOS_FREE` não é mais
    importado na landing (segue no app e no cadastro, onde descreve o limite real do plano).
  - **"esquema" → "manual técnico"** na dobra `#placa`: título "O manual técnico certo em um toque.", parágrafo
    ("…já mostra os manuais técnicos daquele veículo…") e o terceiro passo ("Abra o manual técnico"). As outras dobras e o
    app continuam com "esquema".
  - **CTA verde:** nova classe `.btn-cta` em `src/index.css` (degradê `#0f7d54` → `#0b6243`, texto branco com contraste
    5,1:1) usada nos botões da landing (cabeçalho, hero, dobra da placa, "Testar gratuitamente" e plano Full). O `.btn-primary`
    azul continua valendo no app, no login e no cadastro. Os detalhes do card Full (borda, sombra, filete e selo) passaram
    de azul para verde para não brigar com o botão.
- **Verificação:** build ok; oxlint 12 avisos; no navegador: nenhuma ocorrência de "minutos" na página, "esquema" zerado na
  dobra da placa (2 de "manual técnico"), botão com o degradê verde aplicado; capturas do hero, cobertura, placa e planos.
- **Pendências:** nenhuma.

### 2026-09-17 · Foto da dobra "Busca por placa" sem moldura e em tamanho cheio
- **Quem:** Claude Code (Opus 5), a pedido de Nitiani
- **Pedido:** a foto estava com borda e pequena demais para o espaço; deixar mais bonita.
- **O que mudou (`src/pages/Landing.tsx`, `BuscaPlaca`):**
  - Saíram a moldura (`border seam`, fundo e cantos arredondados de todos os lados) e a altura livre da imagem.
  - A foto passa a **encher a coluna** (360 px no celular, 460 px em tablet, 600 px no desktop) com `object-cover` e
    enquadramento em 62%/45%, que centraliza o celular e as mãos em vez do fundo da oficina.
  - **Sangra** até a borda da tela: largura total no celular e, no desktop, até o limite da janela à direita, com canto
    arredondado só à esquerda.
  - Dissolve no fundo em vez de terminar numa linha: degradê na base sempre e um degradê lateral **só no desktop** (onde o
    texto fica ao lado). No celular esse lateral escurecia o mecânico sem motivo, e foi limitado a `lg`.
  - Colunas reequilibradas (`0.92fr / 1fr`), dando mais espaço à imagem.
  - Assets refeitos na resolução cheia do original: `oficina-placa-1536.{webp,jpg}` (86 KB / 168 KB) e
    `oficina-placa-900.{webp,jpg}` (41 KB / 72 KB); a variante de 1400 px foi removida.
- **Verificação:** build ok; capturas 1440×1000, 1280, 1024×900 e 390×844; sem rolagem horizontal em nenhuma largura.
- **Pendências:** nenhuma.

### 2026-09-17 · Foto real na dobra "Busca por placa"
- **Quem:** Claude Code (Opus 5), a pedido de Nitiani
- **Pedido:** usar a imagem que estava em `~/Downloads` (mecânico de uniforme Deepcar com o app aberto no celular, na oficina).
- **O que mudou:**
  - `public/landing/oficina-placa-{900,1400}.{webp,jpg}` (novos): o PNG original tinha 2,0 MB; virou 1400 px e 900 px de
    largura, em WebP (37–69 KB) com JPEG de reserva (67–133 KB).
  - `src/pages/Landing.tsx` (`BuscaPlaca`): o mockup `<Phone>` deu lugar à foto, num `<picture>` com `srcSet`/`sizes`
    (o celular baixa a versão de 900 px), `loading="lazy"`, `width`/`height` para não pular o layout, texto alternativo
    descritivo, moldura arredondada e um degradê na base para assentar no fundo escuro. O `<Phone>` continua no hero.
- **Verificação:** build ok; capturas 1440×1000 e 390×844; no celular o navegador escolheu `oficina-placa-900.webp` (37 KB).
- **Pendências:** a foto é gerada por IA e a tela do celular tem nomes de montadora com erro de grafia; ilegíveis no tamanho
  exibido, mas vale trocar por foto real quando houver.

### 2026-09-17 · Dobra "Busca por placa" na página de vendas
- **Quem:** Claude Code (Opus 5), a pedido de Nitiani
- **Pedido:** dobra nova mostrando a busca por placa, com foto de um rapaz usando a plataforma no celular. O texto de
  referência era a copy da Simplo ("Manuais Simplo… A BUSCA PLACA"), para adaptar à nossa plataforma.
- **O que mudou (`src/pages/Landing.tsx`):** nova seção `BuscaPlaca` (`#placa`), entre cobertura e planos:
  - Copy **reescrita** com nossas palavras (não copiada da concorrente, sem menção a Manuais Simplo): rótulo "Busca por
    placa", título "O esquema certo em um toque.", parágrafo sobre identificar montadora, modelo, ano e motorização e já
    mostrar os sistemas compatíveis.
  - Três passos numerados (digite a placa → veja o veículo → abra o esquema) e botão "Testar com uma placa" para `/cadastro`,
    com a observação "Grátis por 5 minutos, sem cartão".
  - Ilustração: o **mockup de celular do próprio produto** (`Phone` de `DeviceMockups`), que já mostra a placa BRA-2E19,
    a ficha do Hilux e os sistemas disponíveis. Não usei foto de banco de imagens (licença paga) nem foto inventada;
    se o usuário mandar uma foto real, basta trocar o `<Phone>` pela imagem (anotado nas pendências).
- **Verificação:** build ok; capturas 1440×1000 e 390×844 (texto e celular), sem rolagem horizontal.
- **Pendências:** trocar o mockup por foto real, se houver.

### 2026-09-17 · Botão "Entrar" some no celular (corrigido)
- **Quem:** Claude Code (Opus 5), a pedido de Nitiani
- **Bug:** na página de vendas, o cabeçalho só mostrava "Criar conta grátis" no celular. Quem já tinha conta não achava o
  login. Causa: o link "Entrar" estava com `hidden ... sm:inline-flex`, escondido abaixo de 640 px.
- **O que mudou (`src/pages/Landing.tsx`, `Header`):** "Entrar" aparece em qualquer largura; no celular o logo fica um
  pouco menor (h-6), o espaçamento do cabeçalho diminui (gap/padding) e os dois botões ganham padding e fonte menores,
  com `whitespace-nowrap`, para caberem lado a lado.
- **Verificação:** build ok; no navegador, os dois botões visíveis e sem rolagem horizontal em 320, 360, 390, 430, 768 e
  1280 px; capturas do cabeçalho em 320 e 390.
- **Pendências:** nenhuma.

### 2026-09-17 · Visual dos cards de planos (só design)
- **Quem:** Claude Code (Opus 5), a pedido de Nitiani
- **Pedido:** deixar os cards de plano mais premium e profissionais, sem "cara de IA". Só o design; textos e itens iguais.
- **O que mudou (`src/pages/Landing.tsx`, função `Planos`):**
  - Os dois cards passam a usar a mesma superfície (`bench-1`) — antes o destaque mudava o fundo, o que parecia erro.
    O Full se distingue por borda azul discreta, sombra projetada e um filete de luz no topo.
  - Selo "Mais completo": era pílula azul preenchida, virou texto pequeno em mono (mesma linguagem dos rótulos do app).
  - Preço maior (44 px), com números tabulares e "R$" / "/mês" em tom secundário; linhas finas separam descrição, preço e itens.
  - Itens com check menor e mais discreto (`trace/70`); a lista do Full (11 itens) vai em **duas colunas de texto** a partir de
    `sm` (`columns-2` + `break-inside-avoid`), o que encurta o card e alinha as alturas. Primeira tentativa com `grid` de 2
    colunas abria buracos quando um item quebrava em duas linhas.
  - Botões com a mesma altura nos dois cards; no Pro, a borda acende no hover.
- **Verificação:** build ok; capturas 1440×1000, 820×900 e 390×844 (Full sem cortes e cards da mesma altura).
- **Pendências:** nenhuma.

### 2026-09-17 · Redefinição de senha pelo administrador
- **Quem:** Claude Code (Opus 5), a pedido de Nitiani
- **Pedido:** no `/admin`, o administrador poder recuperar/editar a senha dos usuários.
- **O que mudou:**
  - `src/pages/Admin.tsx`: botão de chave em cada linha de usuário abre o diálogo "Redefinir senha": campo com mostrar/esconder,
    botão que **gera** uma senha fácil de ditar (ex.: `k7mq-4hzt`, sem 0/O, 1/l/I, com `crypto.getRandomValues`), mínimo de 8
    caracteres. Depois de salvar mostra a senha para **copiar** e o botão **Enviar pelo WhatsApp** (número da pessoa, mensagem
    com e-mail, senha e link de login). Avisa que as sessões abertas da conta são encerradas; na própria conta oferece
    "Entrar de novo". Fecha com Esc, clique fora ou X. A senha não é guardada em lugar nenhum além do hash no banco.
  - `api/admin/usuarios.js`: PATCH passa a recusar senha com menos de `SENHA_MINIMA` (8) caracteres; antes aceitava qualquer
    tamanho. POST usa a mesma constante. (O PATCH já cifrava com scrypt e derrubava as sessões ao trocar a senha.)
  - `src/pages/Login.tsx`: "Esqueci a senha" deixava de fazer qualquer coisa; agora abre o contato do suporte (WhatsApp de
    `VITE_SUPORTE_WHATSAPP` ou e-mail de `VITE_SUPORTE_EMAIL`) com a mensagem pronta e o e-mail digitado.
  - `src/lib/plano.ts`: `linkSuporte()` aceita o assunto do e-mail (padrão continua "Deepcar · assinatura").
- **Banco / Variáveis:** sem mudança.
- **Verificação:** `node --check` na API; build ok; oxlint 12 avisos (sem novos); no navegador com admin e API simulados:
  salvar desativado vazio e com 3 caracteres, senha gerada enviada no PATCH do usuário certo, senha exibida, link do WhatsApp
  com o número e a senha, aviso na própria conta, Esc fecha, "Esqueci a senha" com o e-mail digitado; sem erros de página.
- **Pendências:** nenhuma.

### 2026-09-17 · Nova copy do painel lateral do cadastro
- **Quem:** Claude Code (Opus 5), a pedido de Nitiani
- **Pedido:** tirar do cadastro o mesmo tipo de copy removida do login ("Abra o esquema certo antes de encostar o multímetro.").
- **O que mudou:**
  - `src/pages/Cadastro.tsx`: título "Comece grátis e consulte o primeiro carro agora."; itens alinhados com a página de
    vendas: "Mais de 15 mil modelos: injeção eletrônica, elétrica, ABS e câmbio", "60 montadoras e 98% da frota nacional,
    do leve ao diesel", "Consulta pela placa no celular, no tablet ou no computador". Antes os itens usavam números calculados
    do acervo (10.522 esquemas, 55 montadoras), que contradiziam a landing; a página deixou de baixar o índice do R2.
  - `src/lib/acervo.ts`: removida `resumoAcervo()`, sem uso em nenhuma tela.
- **Verificação:** build ok; oxlint 12 avisos (sem novos); captura do cadastro 1440×900.
- **Pendências:** nenhuma.

### 2026-09-16 · Nova copy da tela de login e "Grupo Arcco" fora dos rodapés
- **Quem:** Claude Code (Opus 5), a pedido de Nitiani
- **Pedido:** trocar a copy do painel lateral do login ("Esquemas elétricos automotivos, na bancada." / "…para quem está
  com o multímetro na mão."), sem "esquemas elétricos" nem "bancada"; tirar "Grupo Arcco" do rodapé.
- **O que mudou:**
  - `src/pages/Login.tsx`: título "Inteligência automotiva para a sua oficina."; texto "Injeção eletrônica, elétrica, ABS e
    câmbio de mais de 15 mil modelos, do leve ao diesel. Digite a placa e encontre o que precisa no celular, no tablet ou
    no computador." (mesmo tom da página de vendas).
  - Rodapé "© ano Deepcar · Grupo Arcco" virou "© ano Deepcar" em `Landing.tsx`, `Login.tsx` e `Cadastro.tsx`.
- **Verificação:** build ok; captura do login 1440×900; rodapé da landing conferido no navegador.
- **Pendências:** nenhuma.

### 2026-09-16 · Título da aba e metadados de SEO/compartilhamento
- **Quem:** Claude Code (Opus 5), a pedido de Nitiani
- **Pedido:** trocar o título da aba ("Deepcar · Esquemas elétricos") para "Deepcar · Inteligência automotiva" com esquemas
  elétricos e diagramas, e melhorar o SEO pelos metadados.
- **O que mudou:**
  - `index.html`: título "Deepcar · Inteligência automotiva | Esquemas elétricos e diagramas"; `description` (≤ 155
    caracteres) e `keywords`; `robots`; URL canônica `https://deepcar.vercel.app/`; `apple-touch-icon`; Open Graph
    (WhatsApp/Facebook/LinkedIn) e Twitter Card com imagem grande; JSON-LD `SoftwareApplication` com a faixa de preço
    dos planos (R$ 47,90 a R$ 59,90).
  - `public/brand/compartilhar.jpg` (novo, 1200×630, 68 KB): imagem de prévia do link, feita com as fontes, cores e logo
    do site (renderizada no navegador e salva em JPEG).
  - `public/robots.txt` (novo): libera `/`, bloqueia `/app`, `/admin` e `/api/`, aponta o sitemap.
  - `public/sitemap.xml` (novo): `/`, `/cadastro` e `/login`.
  - Atenção: se o site ganhar domínio próprio, trocar `deepcar.vercel.app` em `index.html`, `robots.txt` e `sitemap.xml`.
- **Banco / Variáveis:** sem mudança.
- **Verificação:** JSON-LD e sitemap validados como JSON/XML; build ok; em produção `robots.txt`, `sitemap.xml` e a
  imagem respondem com o tipo certo (não caem no rewrite do SPA) e o HTML traz o título novo.
- **Pendências:** cadastrar o site e o sitemap no Google Search Console.

### 2026-09-16 · Campo de placa da barra superior escondido no Início
- **Quem:** Claude Code (Opus 5), a pedido de Nitiani
- **Pedido:** a consulta por placa aparecia duas vezes na tela inicial (barra superior e painel da página).
- **O que mudou:** `src/layouts/AppLayout.tsx` não mostra o `PlateSearch` quando a rota é `/app` (com ou sem barra final);
  no lugar entra um espaçador, e o contador do plano Free continua à direita. Nas demais telas do app o campo segue na barra.
- **Verificação:** build ok; oxlint 12 avisos (sem novos); no navegador o campo da barra aparece 0 vez em `/app` e `/app/`
  e 1 vez em `/app/injecao/leve`, `/app/veiculo/:placa` e `/app/busca`; capturas 1280×800 e 390×844.
- **Pendências:** nenhuma.

### 2026-09-16 · Tela inicial com visual mais natural (menos "cara de template")
- **Quem:** Claude Code (Fable 5.1), a pedido de Nitiani
- **Pedido:** os cards da tela inicial estavam com cara de IA (ícone em quadradinho, título + descrição + campo + botão,
  dois cards idênticos). Deixar mais premium e natural, com mudanças pontuais.
- **O que mudou (`src/pages/Inicio.tsx`):**
  - Saudação pelo horário ("Bom dia/Boa tarde/Boa noite, Carlos.") e uma linha de apoio; saiu o "Início" em cima.
  - Os dois cards viraram **um painel** dividido ao meio (placa à esquerda, busca à direita; empilha no celular), sem
    ícones decorativos. Cada metade tem só o rótulo em mono (padrão das outras telas) com uma dica curta à direita
    (escondida no celular) e o campo.
  - Campo de placa desenhado como placa: faixa azul-marinho à esquerda com "BR" (referência à Mercosul), letras grandes
    em mono, botão de seta dentro do campo (acende quando a placa é válida). `size={7}` + `min-w-0` para não vazar no celular.
  - Campo de busca com lupa e botão de seta dentro, mesma altura do de placa.
  - Últimas consultas: rótulo em mono fora do card, "Limpar" como texto discreto, itens sem caixinha de ícone, tempo
    relativo alinhado à direita; vazio com borda tracejada e texto curto.
- **Verificação:** build ok; oxlint sem aviso no arquivo; capturas 1280×800 (normal e com placa digitada) e 390×844
  (com histórico e vazio); largura do painel conferida no celular.
- **Pendências:** nenhuma.

### 2026-09-16 · Tela inicial com consulta, busca geral e últimas consultas; código reorganizado
- **Quem:** Claude Code (Opus 5), a pedido de Nitiani
- **Pedido:** ao abrir o sistema ele ia direto para Injeção Leve. Criar uma tela inicial com botão de consultar por placa e
  de consultar por nome/sistema/palavra-chave, um card com as últimas consultas (guardadas no navegador) e um botão de
  início. Deixar o código organizado.
- **O que mudou:**
  - `src/pages/Inicio.tsx` (novo, rota índice de `/app`, antes redirecionava para `/app/injecao/leve`): saudação com o
    primeiro nome; card "Consultar por placa" (valida e abre `/app/veiculo/:placa`); card "Buscar esquema" (abre
    `/app/busca?q=`); card "Últimas consultas" com ícone por tipo, detalhe, tempo relativo ("há 12 min", "ontem") e "Limpar".
  - `src/pages/Busca.tsx` (novo, `/app/busca?q=`): busca em todas as seções de uma vez; o termo fica na URL; lista acompanha
    a digitação (`useDeferredValue`); mostra contagem e o nome do sistema em cada linha. Inclui o nome do sistema na busca
    ("abs gol", "hilux diesel").
  - `src/lib/recentes.ts` (novo): até 12 itens em `localStorage` na chave `deepcar.recentes:<email>` (cada conta vê só as
    suas); tipos `placa` (guarda o veículo retornado) e `esquema`; atualiza a tela na hora (evento) e entre abas (`storage`);
    ignora itens inválidos e JSON quebrado. `veiculoGuardado()` faz a `VeiculoPage` reabrir uma placa já consultada **sem
    nova chamada ao Falcon** (economiza a cota de 10/hora).
  - `src/lib/busca.ts` (novo): `normalizar`, `termosDe`, `indexar` (texto de cada esquema montado uma vez) e `filtrar`.
  - `src/lib/compatibilidade.ts` (novo): `sistemasDisponiveis()` e `marcaCanonica()` saíram de `VeiculoPage.tsx` sem mudança
    de regra (some o aviso de lint `only-export-components`).
  - `src/components/ListaEsquemas.tsx` (novo): lista com carregamento em lotes que era interna da `SectionPage`, agora
    compartilhada com a busca (prop `mostrarSecao`).
  - `src/pages/SectionPage.tsx`: usa `ListaEsquemas` e `lib/busca` (mesmo comportamento).
  - `src/pages/VeiculoPage.tsx`: usa `lib/compatibilidade`, reaproveita veículo guardado e registra a consulta.
  - `src/pages/EsquemaPage.tsx`: registra o esquema aberto nas últimas consultas.
  - `src/components/Sidebar.tsx`: item "Início" no topo do menu (ícone casa, também no menu recolhido); logo leva a `/app`.
  - `src/data/nav.ts`: `SECOES` (todas as seções na ordem do menu). `src/lib/placa.ts`: `normalizarPlaca()`.
  - `src/App.tsx`: rotas `index → Inicio` e `busca`.
  - `AGENTE.md` (mapa do código e rotas) e `README.md` atualizados.
- **Banco / Variáveis:** sem mudança.
- **Verificação:** `vite` dev com acervo de teste e sessão simulada, no navegador: `/app` abre o início; placa → ficha;
  botão Início volta; último item aparece ("HONDA CIVIC EXL 2.0 CVT · HON-2C24 · 2018 · agora") na chave por conta;
  reabrir pelo histórico fez 0 chamadas a `/api/placa`; busca "abs gol" → 1 esquema com o rótulo ABS; sem erros no console;
  campos com 48 px no celular (bug de altura corrigido antes de publicar); JSON inválido no histórico mostra lista vazia.
  `npm run build` ok; oxlint 12 avisos (antes 13), 0 erros. Obs.: no `npm run dev` a 1ª consulta de placa chama a API
  2 vezes por causa do `StrictMode` do React; em produção é 1 chamada.
- **Pendências:** nenhuma.

### 2026-09-16 · Procedência (importado/nacional) e chassi na consulta por placa
- **Quem:** Claude Code (Opus 5), a pedido de Nitiani
- **Pedido:** a consulta real pelo Falcon funcionou; mostrar também se o veículo é importado e o chassi, que a API devolve.
- **Observação:** o exemplo público da documentação do Falcon não lista esses campos (e diz que o chassi não é exposto por
  LGPD/CONTRAN, então pode vir mascarado). Para não gastar cota com teste, a leitura aceita vários nomes.
- **O que mudou:**
  - `server/placa/veiculo.mjs`: `montarVeiculo()` ganha `chassi` (texto) e `importado` (true/false/null); nova função
    `importado()` que entende true/false, 1/0, S/N, SIM/NÃO, IMPORTADO/NACIONAL, ESTRANGEIRO.
  - `server/placa/provedores/falcon.mjs`: `achar()` procura, sem diferenciar maiúsculas e também um nível abaixo
    (ex.: `data.veiculo`, `data.extra`): chassi em `chassi`, `chassis`, `numero_chassi`, `num_chassi`, `chassi_mascarado`;
    importado em `importado`, `procedencia`, `nacionalidade`, `is_importado`.
  - `server/placa/provedores/simulado.mjs`: placas de teste com chassi mascarado; HON2C24 é importada.
  - `src/lib/placa.ts`: tipo `Veiculo` com `chassi` e `importado`.
  - `src/pages/VeiculoPage.tsx`: ficha mostra "Procedência: Importado/Nacional" (só quando a base informa) e "Chassi"
    (fonte monoespaçada, linha inteira no celular para não quebrar no meio). Textos longos da ficha quebram linha.
- **Banco / Variáveis:** sem mudança.
- **Verificação:** teste do provedor (cenários anteriores + 7 de chassi/importado: nomes variados, aninhados, vazio, valor
  desconhecido, simulado); `node --check`; `npm run build` ok; oxlint com os mesmos 13 avisos; capturas da ficha em
  390×844 e 1280×720. Nenhuma consulta real ao Falcon foi feita.
- **Pendências:** usuário testa numa placa real se os dois campos aparecem.

### 2026-09-16 · Token do Falcon gravado no cofre do banco de produção
- **Quem:** Claude Code (Opus 5), a pedido de Nitiani
- **Pedido:** colocar a chave do Falcon no cofre do banco para o sistema buscar de lá.
- **O que foi feito (sem mudança de código):**
  - Vercel CLI (logada como `nitiani-1296`, time `nitiani-melo`) usada para baixar as variáveis de produção numa pasta
    temporária fora do repositório; só `DATABASE_URL` e `SEGREDOS_CHAVE` foram usadas.
  - Gravado com a própria função `guardar()` de `api/_lib/segredos.js`: chave `FALCON_TOKEN`, valor cifrado em AES-256-GCM,
    descrição "Falcon Data Hub · consulta de placa". Cofre estava vazio antes.
  - Conferido: o valor no banco está cifrado e `segredo('FALCON_TOKEN')` devolve o token certo. O Falcon **não** foi chamado
    (para não gastar a cota). Pasta temporária com variáveis e token apagada; nada foi para o Git.
  - Achado: a Vercel já tinha `FALCON_TOKEN`, `CONSULTARPLACA_EMAIL` e `CONSULTARPLACA_API_KEY` como variáveis sensíveis
    (valores não legíveis). O cofre tem prioridade sobre elas (`segredo()` lê o banco antes de `process.env`).
- **Banco:** 1 linha em `segredos` (`FALCON_TOKEN`). Sem migração.
- **Verificação:** leitura do cofre igual ao token; teste real de placa fica com o usuário.
- **Pendências:** testar placa real; limpar variáveis antigas na Vercel; trocar o token depois.

### 2026-09-16 · Volta ao Falcon Data Hub; APIBrasil e Consultar Placa removidos
- **Quem:** Claude Code (Opus 5), a pedido de Nitiani
- **Contexto:** APIBrasil sem cota grátis de placa (exige PJ e saldo). O repositório `marcelopcosta2025/consulta-placa-apI`
  (raspagem do anycar.com.br) foi avaliado e descartado: a página que ele lia não existe mais (404) e os dados hoje saem de
  uma API interna do checkout pago do AnyCar, proibida a robôs no `robots.txt`. Decisão: voltar ao Falcon, que tem plano grátis.
- **O que mudou:**
  - `server/placa/provedores/falcon.mjs` (novo, a partir do código antigo do commit `9c22114`, revisado):
    `GET {FALCON_BASE_URL}/private/v1/vehicles/{placa}/search` com `Authorization: Bearer`, tempo máximo de 10 s,
    mensagens para token inválido (401/403), limite do plano (429, com minutos pela mensagem ou pelo cabeçalho de reset),
    placa não encontrada, falha de rede e demora. Correção em relação ao código antigo: todo 404 virava "placa não encontrada";
    agora 404 com outra mensagem (ex.: rota errada) aparece como erro de configuração.
  - Removidos `provedores/apibrasil.mjs` e `provedores/consultarplaca.mjs`. `server/placa/` ficou com `index.mjs`,
    `veiculo.mjs`, `provedores/falcon.mjs` e `provedores/simulado.mjs`.
  - `server/placa/index.mjs`: `PROVEDORES = [falcon, simulado]`, `VARIAVEIS_PLACA = ['FALCON_TOKEN', 'FALCON_BASE_URL']`.
  - `src/lib/placa.ts`: `origem` = `'falcon' | 'simulado'`. `src/pages/Admin.tsx`: exemplo de chave `FALCON_TOKEN`.
  - Deepcar.exe (`server/app-local.mjs`, `scripts/empacotar-exe.mjs`): `config.json` volta a usar `falconToken`.
  - `.env.example`, `README.md`, `AGENTE.md` e comentários do cofre atualizados.
- **Banco:** sem mudança.
- **Variáveis/infra:** `FALCON_TOKEN` (opcional `FALCON_BASE_URL`) no `/admin` → Chaves de API. As chaves `APIBRASIL_*`
  nunca foram gravadas, nada a limpar.
- **Verificação:** teste do provedor com 24 cenários (sucesso, só `ano`, base customizada, cache, 401, 403, 429 com minutos
  na mensagem, 429 com cabeçalho de reset, 429 sem JSON, 404 de placa, 404 vazio, 404 de rota, `success: false`, dados vazios,
  500, tempo esgotado, falha de rede, placa inválida sem chamar a rede, modo simulado sem rede); `node --check`;
  `npm run build` ok; oxlint com os mesmos 13 avisos; `vite` dev respondendo `/api/placa` (simulado, não encontrada, inválida).
- **Pendências:** gravar o `FALCON_TOKEN` e testar uma placa real; cache de placas no Neon.

### 2026-09-16 · Teste da conta APIBrasil e mensagem correta para conta sem plano
- **Quem:** Claude Code (Opus 5), a pedido de Nitiani
- **Pedido:** ver se a consulta funciona só com o Bearer Token do plano gratuito.
- **Teste (só chamadas sem custo; token guardado em arquivo temporário fora do repositório e apagado):**
  - `GET /plan` sem plano; `GET /balance` saldo R$ 0,00; `GET /devices` "Você não possui um plano ativo".
  - `POST /vehicles/dados` → HTTP 404 "Plano ativo não encontrado."
  - `POST /consulta/veiculos/credits` em homologação: sem `tipo` → "Essa API não está disponível para esse endpoint";
    com `tipo` agregados-simples / agregados-propria / agregados-basica → HTTP 403 "exclusiva para usuarios PJ".
  - Catálogo (`GET /apis`, `GET /plans`): APIs de placa por crédito de R$ 0,02 a R$ 3,20; plano device-based com veículos
    é o Data Plus, R$ 384/mês. **Não existe mais cota grátis de placa.**
- **Conclusão:** com esse token não dá para consultar placas. Ver pendência "Consulta de placa real".
- **O que mudou:** `server/placa/provedores/apibrasil.mjs` tratava todo HTTP 404 como "Placa não encontrada"; a APIBrasil usa
  404 também para "Plano ativo não encontrado". Agora mensagem com "plano" vira erro de configuração ("Conta da APIBrasil sem
  plano ativo…", HTTP 502) e só é "placa não encontrada" quando a mensagem fala de placa/veículo ou o 404 vem sem mensagem.
- **Banco / Variáveis:** sem mudança. Nenhuma credencial foi gravada no código, no `/admin` ou no Git.
- **Verificação:** teste do provedor com os cenários anteriores + conta sem plano + API indisponível; `node --check`.
- **Pendências:** decisão sobre o fornecedor de placa.

### 2026-09-16 · Consulta de placa pela APIBrasil e provedores organizados em módulos
- **Quem:** Claude Code (Opus 5), a pedido de Nitiani
- **Pedido:** trocar o Falcon Data Hub (produção estava em modo simulado, fornecedor difícil) pela APIBrasil e organizar o código.
  Só são necessários modelo e ano.
- **Pesquisa:** não há fonte pública gratuita de placa → veículo (RENAVAM só via SERPRO pago; dados abertos da Senatran
  são agregados; Sinesp Cidadão só por engenharia reversa, instável e contra os termos). APIBrasil tem plano grátis diário.
- **O que mudou:**
  - `server/placa.mjs` virou a pasta `server/placa/`:
    - `index.mjs`: `consultarPlaca()`, cache de 24 h, lista `PROVEDORES` em ordem e `VARIAVEIS_PLACA` (chaves que a rota lê do cofre).
    - `veiculo.mjs`: `normalizarPlaca()`, `montarVeiculo()` (formato único para o front) e `erro()`.
    - `provedores/apibrasil.mjs` (novo, principal): `POST https://gateway.apibrasil.io/api/v2/vehicles/dados` com
      `Authorization: Bearer` + `DeviceToken`, corpo `{ placa }`, tempo máximo 10 s. Lê o envelope `{ error, message, response }`
      procurando cada campo por vários nomes (maiúsculas/minúsculas, snake/camel, dentro de `extra`). Mensagens claras para
      credencial inválida (401), plano/device (402/403), cota (429 ou `error: true` com "limite"), placa inexistente e demora.
    - `provedores/consultarplaca.mjs`: alternativa paga, mesma lógica de antes, agora isolada.
    - `provedores/simulado.mjs`: placas de teste de antes.
    - **Falcon Data Hub removido** (código, variáveis `FALCON_TOKEN`/`FALCON_BASE_URL`).
  - `api/placa/[placa].js`: importa `server/placa/index.mjs` e busca no cofre as chaves de `VARIAVEIS_PLACA`.
  - `server/vitePlacaPlugin.mjs`, `server/app-local.mjs`, `scripts/empacotar-exe.mjs`: novo caminho; o `config.json` do
    Deepcar.exe troca `falconToken` por `apibrasilBearerToken` e `apibrasilDeviceToken`.
  - `src/lib/placa.ts`: `origem` passa a ser `'apibrasil' | 'consultarplaca' | 'simulado'`.
  - `src/pages/Admin.tsx`: exemplo do campo de chave virou `APIBRASIL_BEARER_TOKEN`. Comentários do cofre atualizados.
  - `.env.example`, `README.md` e `AGENTE.md` atualizados.
- **Banco:** sem mudança.
- **Variáveis/infra:** novas chaves `APIBRASIL_BEARER_TOKEN` e `APIBRASIL_DEVICE_TOKEN` (opcional `APIBRASIL_BASE_URL`),
  a gravar no `/admin` → Chaves de API. Enquanto não forem gravadas, produção segue no modo simulado.
- **Verificação:** teste com respostas simuladas da APIBrasil (sucesso com campos em maiúsculas/`extra`, snake_case, cache,
  401, 402, 404, 429, `error: true` de cota, resposta vazia, 500, tempo esgotado, placa inválida, escolha de provedor);
  `node --check` nos arquivos do servidor; `npm run build` ok; oxlint com os mesmos 13 avisos; `vite` dev respondendo
  `/api/placa` no modo simulado.
- **Pendências:** gravar as credenciais e testar uma placa real; cache de placas no Neon.

### 2026-09-16 · Paleta mais clara para leitura com brilho baixo (landing e plataforma)
- **Quem:** Claude Code (Opus 5), a pedido de Nitiani
- **Pedido:** com brilho de tela baixo as informações ficavam pouco legíveis; o preto estava escuro demais. Clarear a paleta
  da página de vendas e da plataforma.
- **Diagnóstico (contraste WCAG medido):** fundo quase preto (`#0a0d12`) e degraus fundo→painel→cartão de só 4–9%;
  `ink-4` (rótulos, placeholders, dicas) com 2,3:1 sobre os cartões e `ink-3` com 4,8:1 (mínimo recomendado 4,5:1).
- **O que mudou:**
  - `src/index.css` (tokens do `@theme`, valem para o site inteiro):
    | token | antes | depois |
    | --- | --- | --- |
    | `pit` (fundo) | `#0a0d12` | `#151b24` |
    | `bench-1` (painéis, sidebar) | `#0e1218` | `#1a212b` |
    | `bench-2` (cartões) | `#131922` | `#212a36` |
    | `bench-3` (hover) | `#19212c` | `#2a3443` |
    | `well` (inputs) | `#080b0f` | `#10151c` |
    | `ink-1` | `#f1f4f9` | `#f3f6fa` |
    | `ink-2` | `#b4bdcb` | `#cfd6e1` |
    | `ink-3` | `#7b8697` | `#a3aebd` |
    | `ink-4` | `#4b5464` | `#8793a4` |
    Bordas `--seam-1/2/3` de 0,07/0,045/0,14 para 0,10/0,07/0,18; grade de fundo 0,028→0,035; barra de rolagem e fundo
    das dicas (`#1a2230`→`#2c3647`) acompanharam.
  - Contraste resultante sobre os cartões: `ink-2` 9,9:1, `ink-3` 6,5:1, `ink-4` 4,7:1 (sobre o fundo: 11,8 / 7,7 / 5,6).
  - `src/components/EsquemaViewer.tsx`: fundo da folha no modo desenho escuro `#06090d`→`#10151c`.
  - `index.html`: `theme-color` `#0A0D12`→`#151B24` (cor da barra do navegador no celular).
  - Não mudou: azul de acento (`trace`), botões, cores semânticas, selos das lojas, impressão A4 (fundo branco).
- **Banco:** sem mudança.
- **Variáveis/infra:** sem mudança.
- **Verificação:** capturas em `vite` dev (landing hero e planos 1440×900; app desktop; lista de esquemas e login 390×844);
  `npm run build` ok; oxlint com os mesmos 13 avisos.
- **Pendências:** notado nas capturas (não é da paleta): no celular com plano Free, o contador aperta o campo de placa na barra superior.

### 2026-09-16 · Dados do esquema legíveis no celular (modelo, motorização, sistema e fabricação)
- **Quem:** Claude Code (Opus 5), a pedido de Nitiani
- **Pedido:** nas telas de celular, ao buscar o modelo, as informações de modelo, fabricação e sistema apareciam cortadas ou ilegíveis.
- **Causa:** em `SectionPage` (lista de esquemas) o nome do modelo tinha `truncate` e motorização, sistema e fabricação eram
  juntados numa única linha de 12 px, cinza-escuro, também com `truncate`: textos longos perdiam o final (a fabricação
  quase nunca aparecia). A lista de esquemas da consulta por placa (`VeiculoPage`) tinha o mesmo padrão em todas as larguras.
- **O que mudou:**
  - Novo `src/components/DetalhesEsquema.tsx`: mostra Motorização, Sistema (código do motor · gerenciamento) e Fabricação,
    um por linha, com rótulo, texto inteiro quebrando linha (`break-words`), 13 px e contraste maior. Campos vazios não aparecem.
  - `src/pages/SectionPage.tsx`: no celular (< `md`) o nome do modelo quebra linha em vez de cortar e os detalhes usam `DetalhesEsquema`.
    No desktop a tabela de colunas continua igual; a coluna Motorização ganhou dica (`data-tip`) com o texto completo quando é longo.
  - `src/pages/VeiculoPage.tsx`: lista de esquemas por sistema usa `DetalhesEsquema` e nome do modelo sem corte.
  - Documentação: contagem real de avisos do lint corrigida para 13 no `AGENTE.md` e aqui (antes dizia 5, contagem errada).
- **Banco:** sem mudança.
- **Variáveis/infra:** sem mudança.
- **Verificação:** reproduzido e conferido com `vite` dev + acervo de teste com textos longos + sessão e placa simuladas no navegador
  (390×844 na lista e na consulta por placa; 1280×700 no desktop). `npm run build` ok; oxlint com os mesmos 13 avisos de antes.
- **Pendências:** nenhuma.

### 2026-09-16 · Planos Pro e Full com preços na página de vendas
- **Quem:** Claude Code (Opus 5), a pedido de Nitiani
- **Pedido:** substituir os planos da landing por dois:
  - **Pro — R$ 47,90/mês:** injeção eletrônica leve, ABS, elétrica leve, 2 dispositivos conectados, app mobile, suporte.
  - **Full — R$ 59,90/mês:** injeção eletrônica leve e diesel, ABS, elétrica leve e diesel, câmbio leve e diesel,
    4 dispositivos conectados, busca pela placa, app mobile, suporte.
- **O que mudou (`src/pages/Landing.tsx`, função `Planos`):**
  - Saíram os planos antigos Oficina, Profissional e Rede (sem preço; o Rede tinha botão "Falar com a equipe" no WhatsApp).
  - Cada cartão mostra nome, uma linha de público ("Para a oficina de veículos leves." / "Para a oficina que atende do leve ao diesel."),
    preço grande em R$ por mês e a lista de itens. Full em destaque, com selo "Mais completo" (antes "Mais usado").
  - Grade de 2 colunas centralizada (máx. 880 px); no celular, um cartão por linha.
  - Texto ao lado do título: saiu "Valores em breve."; ficou "A conta gratuita abre na hora e dá 5 minutos de acesso…".
  - Os dois botões são "Criar conta grátis" → `/cadastro`, porque ainda não há pagamento. Import `linkSuporte` removido da landing.
- **Banco:** sem mudança (ver pendência sobre planos no sistema).
- **Variáveis/infra:** sem mudança.
- **Verificação:** `npm run build` ok; oxlint sem avisos em `Landing.tsx`; capturas em 1440×1000 e 390×844.
- **Pendências:** implementar os planos Pro/Full de verdade (banco, liberação por sistema, limite de dispositivos, pagamento).

### 2026-09-16 · Logos coloridos na faixa de montadoras da página de vendas
- **Quem:** Claude Code (Opus 5), a pedido de Nitiani
- **Pedido:** deixar coloridas as montadoras que passam na faixa da página de vendas (só na landing, não no app).
- **O que mudou:**
  - `src/components/MarcasStrip.tsx`: mapa `CORES` com a cor oficial (ou predominante) de cada uma das 55 marcas;
    marca sem cor no mapa sai grafite (`#2B2F36`). Cartões passaram de escuros para claros (`#F4F6F9`), porque muitas
    cores de marca (azul-marinho da Ford, VW, Hyundai, Scania…) sumiriam no fundo escuro. Hover sobe o cartão 2 px.
  - `src/components/LogoMarca.tsx`: nova prop opcional `cor`, que substitui a cor do texto. Sem ela, nada muda:
    os logos das páginas do app (`SectionPage`, `VeiculoPage`, `EsquemaPage`, `DeviceMockups`) seguem monocromáticos.
  - Por que não os logos originais multicoloridos: as fontes em `scripts/logos/fontes/` são quase todas silhuetas
    monocromáticas (Simple Icons) e `public/marcas/*.png` são máscaras. Cada logo sai em **uma** cor (ex.: BMW todo azul,
    sem os quadrantes). Logos multicoloridos exigiriam novos arquivos de origem.
  - Para ajustar a cor de uma marca: editar `CORES` em `MarcasStrip.tsx`.
- **Banco:** sem mudança.
- **Variáveis/infra:** sem mudança.
- **Verificação:** `npm run build` ok; capturas do build em 1440×900 com a faixa em três posições (todas as marcas conferidas).
- **Pendências:** nenhuma.

### 2026-09-16 · Novos textos da página de vendas (subtítulo e números de cobertura)
- **Quem:** Claude Code (Opus 5), a pedido de Nitiani
- **Pedido:** trocar o subtítulo da primeira dobra; na seção de cobertura mostrar só "60 montadoras" e
  "98% da frota nacional" e tirar "com os módulos que de fato passam pelo seu elevador".
- **O que mudou (`src/pages/Landing.tsx`):**
  - Subtítulo do hero: "Informações técnicas de mais de 15 mil modelos de veículos: só precisa digitar a placa do carro.
    Injeção eletrônica, elétrica, ABS e câmbio. No celular, no tablet ou no computador da sua oficina."
    (antes: "Mais de N mil esquemas elétricos…", com N calculado do acervo).
  - Seção Cobertura: parágrafo termina em "…caminhões e importados."; os três números (esquemas elétricos,
    montadoras e sistemas, calculados do acervo) viraram dois números **fixos**: `60` montadoras e `98%` da frota nacional.
  - Como a landing não exibe mais números do acervo, deixou de baixar `catalogo/index.json` e de importar `src/lib/acervo`
    (a página abre sem ir ao R2). Para alterar esses números, editar o texto direto em `Landing.tsx`.
  - Não mudou: `src/pages/Cadastro.tsx` ainda mostra números calculados do acervo.
- **Banco:** sem mudança.
- **Variáveis/infra:** sem mudança.
- **Verificação:** `npm run build` ok; lint sem erros novos; capturas do build (`vite preview`) em 1440×900 e 390×844 conferidas.
- **Pendências:** nenhuma.

### 2026-09-16 · Documentação para trabalho em equipe (AGENTE.md e CONTEXTO.md)
- **Quem:** Claude Code (Opus 5), a pedido de Nitiani
- **Pedido:** garantir que qualquer pessoa ou agente consiga trabalhar no repositório, com instruções claras,
  e um arquivo de contexto que registre tudo o que é feito, atualizado a cada modificação.
- **O que mudou:**
  - Pasta local (`deepcar-main`, baixada em ZIP, sem `.git`) conectada ao GitHub `Nitianimelo/deepcar`.
    Antes de conectar, o conteúdo foi comparado com o `origin/main` (`31b1313`): idêntico, nada perdido.
  - Criado `AGENTE.md`: regras obrigatórias, infraestrutura, fluxo de trabalho com build/lint/deploy,
    comandos, mapa do código, banco e migrações, segurança, convenções, armadilhas e modelo de registro.
  - Criado `CONTEXTO.md` (este arquivo): estado atual, pendências e histórico reconstruído dos commits anteriores.
  - Criados `CLAUDE.md` e `AGENTS.md` apenas apontando para `AGENTE.md` e `CONTEXTO.md`, porque as ferramentas
    de IA (Claude Code, Codex, Cursor e outras) leem esses nomes automaticamente.
- **Banco:** sem mudança.
- **Variáveis/infra:** sem mudança.
- **Verificação:** `npm ci` + `npm run build` ok; `npm run lint` com 0 erros e 5 avisos já existentes;
  deploy de `31b1313` com status `success` na Vercel.
- **Commit:** este commit ("Documentar o fluxo de trabalho em AGENTE.md e CONTEXTO.md").
- **Pendências:** corrigir os trechos desatualizados do `README.md` (listados acima).

### 2026-09-15 23:24 · Reverter correção de "vazamento" das telas de conta no celular (`31b1313`)
- Reverte `85bdcd4`. Não havia vazamento: o corte só aparecia nas capturas do Edge headless (viewport de 492 px
  salvando recorte de 430 px). Medido com o CSS publicado, o cartão cabe (container 412, conteúdo 408).
- Arquivos: `src/pages/Cadastro.tsx`, `src/pages/Login.tsx`.

### 2026-09-15 23:20 · Corrigir o vazamento das telas de conta no celular (`85bdcd4`)
- Ajuste de largura dos cartões de login e cadastro. **Revertido** logo depois (ver acima).

### 2026-09-15 23:17 · Cadastro com WhatsApp e limite de 5 minutos no plano free (`b793189`)
- Cadastro pede nome, e-mail, WhatsApp e senha, com validação campo a campo no navegador (`src/lib/validacao.ts`)
  e a mesma regra no servidor (`api/_lib/validar.js`): máscara de telefone, medidor de força da senha,
  erro exibido só depois de sair do campo. WhatsApp guardado como dígitos com DDI (`5511987654321`).
- Plano free com 5 minutos (`MINUTOS_FREE`). O relógio começa no primeiro acesso e fica em `usuarios.free_expira_em`.
  Ao zerar: contador na barra, `LimiteFree` cobre o app (assinar, falar com o suporte, sair) e o servidor responde 402.
  O front reconfere a sessão a cada minuto, então mudar para `pro` no `/admin` libera sem recarregar. Admin nunca é barrado.
- `/admin` mostra o WhatsApp como link, a situação do teste e um botão para liberar um teste novo.
- Migração nova: `db/002_whatsapp_e_teste_free.sql` (colunas `whatsapp`, `free_expira_em` e índice parcial).
- Variáveis novas: `VITE_SUPORTE_WHATSAPP`, `VITE_SUPORTE_EMAIL`.
- Arquivos: `api/_lib/sessao.js`, `api/_lib/validar.js`, `api/admin/usuarios.js`, `api/login.js`, `api/placa/[placa].js`,
  `api/registrar.js`, `api/sessao.js`, `src/components/LimiteFree.tsx`, `src/layouts/AppLayout.tsx`, `src/lib/auth.ts`,
  `src/lib/plano.ts`, `src/lib/validacao.ts`, `src/pages/Admin.tsx`, `src/pages/Cadastro.tsx`, `src/pages/Conta.tsx`,
  `src/pages/Landing.tsx`, `.env.example`, `README.md`.

### 2026-09-15 22:44 · Corrigir a divisão do SQL na migração (`38531e5`)
- Bug: `scripts/migrar.mjs` descartava todo comando precedido de comentário (testava se o trecho começava com `--`),
  inclusive os `create table`, deixando o banco vazio sem erro. Agora só descarta trechos que são apenas comentário.

### 2026-09-15 22:29 · Scripts de migração e de criação do admin (`1571635`)
- `scripts/migrar.mjs`: aplica `db/*.sql` em ordem (`DATABASE_URL` do ambiente ou do `.env`), pode rodar de novo.
- `scripts/criar-admin.mjs`: cria ou promove admin pela linha de comando, com a mesma senha scrypt do site.

### 2026-09-15 22:16 · Contas no Neon: cadastro, sessão em cookie, /admin e cofre de chaves (`7034b45`)
- `db/001_inicial.sql`: `usuarios` (plano free/pro, papel), `sessoes`, `segredos`, função `limpar_sessoes()`.
- Senha com scrypt; sessão em cookie httpOnly de 30 dias com só o sha-256 do token no banco;
  localStorage guarda apenas um retrato do perfil.
- API: `registrar`, `login`, `sair`, `sessao`, `admin/usuarios`, `admin/segredos`, `admin/inicializar`.
- `/cadastro` aberto (free) e `/admin` com busca, plano, papel, bloqueio, troca de senha, remoção e cofre.
- Cofre em AES-256-GCM com `SEGREDOS_CHAVE`; `DATABASE_URL`, `SESSAO_SEGREDO` e `SEGREDOS_CHAVE` só na Vercel.
- Consulta de placa passa a exigir sessão e lê `FALCON_TOKEN` do cofre.
- Dependência nova: `@neondatabase/serverless`.

### 2026-09-15 21:53 · Preparar publicação na Vercel e acelerar a primeira visita (`737bc79`)
- `api/login.js` e `api/placa/[placa].js` (reaproveitando `server/`); `vercel.json` com rewrite SPA, cache e headers de segurança.
- Rotas com `lazy()`: landing com ~97 KB comprimidos.
- Grade de montadoras vem de `catalogo/index.json` (1 KB); catálogo da seção só baixa ao escolher/buscar; hover pré-carrega.
- Fontes servidas pelo próprio site (`public/fonts`, `scripts/baixar-fontes.mjs`); `acervo.ts` faz preconnect com o R2.

### 2026-09-15 21:37 · Acervo real, visualizador de esquemas e acabamento da interface (`a84a8b6`)
- Catálogo e esquemas do acervo publicado (`src/lib/acervo.ts`): `/acervo` no dev (`server/viteAcervoPlugin.mjs`) e `VITE_ACERVO_URL` no R2.
- `EsquemaViewer` (scroll contínuo, zoom ancorado, minimapa, modo leitura, claro/escuro) e `PrintEsquema` (folhas A4).
- Consulta por placa casa marca, modelo e ano e refina por sistema.
- Logos das montadoras (`public/marcas`, `LogoMarca`, `MarcasStrip`), dicas `data-tip`, marca d'água.
- Scripts: exportação do acervo, geração de logos, empacotamento do `.exe`, capturas de tela; `Iniciar-Local.ps1`.

### 2026-09-14 17:27 · Primeira versão (`1b88c6b`)
- Landing, login, plataforma com sidebar e consulta por placa (Falcon Data Hub). Base React + Vite + Tailwind.
