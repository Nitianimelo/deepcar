# CONTEXTO.md · Deepcar

Memória do projeto: **estado atual, pendências e histórico detalhado de tudo que foi feito.**
Regras de trabalho estão em `AGENTE.md`.

> **Obrigatório:** a cada modificação no repositório, adicione uma entrada no topo do **Histórico**
> (modelo na seção 10 do `AGENTE.md`) e atualize "Estado atual" e "Pendências" se mudarem.
> A atualização vai **no mesmo commit** da modificação.

---

## Estado atual (atualizado em 2026-09-16)

- **Produção:** Vercel, projeto `nitiani-melo/deepcar`, deploy automático do `main` do GitHub `Nitianimelo/deepcar`.
- **Funcionando em produção:**
  - Landing (`/`) com mockups de celular/tablet, selos das lojas e dois planos com preço: Pro (R$ 47,90/mês) e Full (R$ 59,90/mês). Textos comerciais fixos:
    subtítulo "15 mil modelos de veículos" e números "60 montadoras" / "98% da frota nacional".
    Faixa de montadoras da landing com os logos nas cores das marcas, sobre cartões claros.
  - Cadastro aberto (`/cadastro`: nome, e-mail, WhatsApp, senha) e login (`/login`) com sessão em cookie httpOnly de 30 dias no Neon.
  - Plano **free = 5 minutos de acesso**, contados a partir do primeiro acesso; depois bloqueia a tela e a API responde 402.
  - `/admin`: usuários (busca, plano, papel, bloquear, trocar senha, apagar, liberar novo teste, WhatsApp como link) e cofre de chaves.
  - Tela inicial `/app`: cards "Consultar por placa" e "Buscar esquema" e card "Últimas consultas" (localStorage, por conta).
    Botão "Início" no menu lateral (e o logo leva para lá).
  - Busca geral `/app/busca?q=` em todos os sistemas (modelo, motor, código, gerenciamento, fabricação e nome do sistema).
  - Plataforma `/app`: seções de injeção leve/diesel, ABS, elétrica e câmbio, com catálogo do acervo no R2.
  - Visualizador de esquemas (scroll contínuo, zoom, minimapa, modo leitura, claro/escuro) e impressão A4 com marca d'água.
  - Consulta por placa (`/app/veiculo/:placa`): Falcon Data Hub → modo simulado, com cache de 24 h em memória.
    `FALCON_TOKEN` gravado no cofre do banco (tabela `segredos`) em 2026-09-16: produção consulta o Falcon de verdade.
    Consulta real testada pelo usuário e funcionando. A ficha mostra também procedência (importado/nacional) e chassi.
- **Visual:** tema escuro em grafite azulado (fundo `#151b24`), todos os textos com contraste ≥ 4,5:1 sobre os cartões.
- **Banco (Neon):** migrações `001_inicial` e `002_whatsapp_e_teste_free`.
- **Último deploy verificado:** commit `aa74bde`, estado `success` (2026-09-16).

## Pendências e problemas conhecidos

- [ ] `README.md` desatualizado: a seção "Estado atual" ainda fala em login mock/localStorage, e a tabela da Vercel
      lista `LOGIN_USUARIO`/`LOGIN_SENHA`/`LOGIN_USUARIOS`, que as funções de `api/` não usam mais.
- [ ] `npm run dev` não suporta o fluxo de contas do Neon (`/api/login` antigo, sem `/api/registrar`, `/api/sessao`, `/api/admin/*`).
      Testar contas via `vercel dev` ou Preview Deployment.
- [ ] Scripts de acervo e do executável dependem de caminhos Windows (`E:\`).
- [ ] 12 avisos do oxlint (0 erros) em `src/`: `set-state-in-effect`, `exhaustive-deps`, `only-export-components`.
- [ ] Selos App Store / Google Play na landing ainda sem `href` real (`src/components/StoreBadges.tsx`).
- [ ] Assinatura/pagamento do plano pro não existe: a passagem para `pro` é manual no `/admin`.
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
