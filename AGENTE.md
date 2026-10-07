# AGENTE.md · Deepcar

Instruções para **qualquer pessoa ou agente de IA** (Claude, Codex, Cursor, Copilot…) que for trabalhar
neste repositório. Leia este arquivo inteiro antes de mudar qualquer coisa.

---

## 0. Regras obrigatórias (não pule)

1. **Antes de começar:** leia `AGENTE.md` (este arquivo) e `CONTEXTO.md` (o que já foi feito, estado atual e pendências).
2. **Sincronize primeiro:** `git pull origin main`. Nunca comece a trabalhar sobre uma cópia desatualizada.
3. **A cada modificação, atualize `CONTEXTO.md`** com uma nova entrada no topo do **Histórico** (modelo na seção 11).
   Sem entrada no `CONTEXTO.md`, a modificação não está terminada.
4. **Se a mudança altera estrutura, comandos, variáveis, banco, rotas ou regras de trabalho, atualize também este `AGENTE.md`**
   (e o `README.md`, se o trecho estiver lá).
5. **A documentação vai no mesmo commit do código** que ela descreve. Nunca em commit separado "depois".
6. **Nada vai para o `main` sem `npm run build` passando.** Push no `main` = publicação imediata em produção.
7. **Mudou `db/`? Rode a migração no Neon antes do push** do código que depende dela (seção 6).
8. **Nunca commitar segredos** (`.env`, tokens, senhas, `DATABASE_URL`). Veja a seção 7.

---

## 1. O que é o projeto

Deepcar é uma plataforma web para mecânicos consultarem **esquemas elétricos automotivos**
(injeção leve e diesel, ABS, elétrica e câmbio), com consulta por placa, contas de usuário,
plano de teste (no site: **5 consultas** diferentes, sem número na tela; no app Android antigo: horas do /admin) e painel administrativo.

Stack: **React 19 + Vite 8 + TypeScript 6 + Tailwind CSS 4 + React Router 7**, funções serverless
Node na Vercel (`api/`) e Postgres no **Neon**.

---

## 2. Infraestrutura (onde cada coisa vive)

| Peça | Onde | Observação |
| --- | --- | --- |
| Código | GitHub `Nitianimelo/deepcar`, branch `main` | fonte da verdade |
| Front + API | Vercel, projeto `nitiani-melo/deepcar` | **deploy automático a cada push no `main`** (produção) |
| Domínio | **`deepcar.app.br`** (Registro.br, DNS delegado à Vercel: `ns1/ns2.vercel-dns.com`) | `www` e `deepcar.vercel.app` redirecionam (308) para o principal, com caminho e parâmetros (config de domínio na Vercel) |
| Banco | Neon (Postgres), ligado à Vercel pela integração | schema em `db/*.sql`, **não** é aplicado pelo deploy |
| Acervo (catálogo, esquemas, imagens) | Cloudflare R2 | **não** está no git nem na Vercel; front lê de `VITE_ACERVO_URL` |
| Segredos de infraestrutura | Variáveis de ambiente da Vercel | `DATABASE_URL`, `SESSAO_SEGREDO`, `SEGREDOS_CHAVE` |
| Chaves de API de terceiros | Cofre no banco (tabela `segredos`), editável em `/admin` | `FALCON_TOKEN`, `CAKTO_WEBHOOK_SECRET`, `CAKTO_PRODUTO_PRO/FULL`, `CAKTO_PRODUTO_PRO_ANUAL/FULL_ANUAL`, `META_CAPI_TOKEN` (`META_TEST_EVENT_CODE` só para testar), `FIREBASE_SERVICE_ACCOUNT` (JSON da conta de serviço, push do app) |
| Pagamento | Cakto: Pro e Full **mensais** (assinatura) e **anuais** (compra única de 12 meses, até 12x); webhook em `/api/webhooks/cakto` | troca o plano sozinha; MCP `cakto` no escopo de usuário |

Branch `main` não tem proteção: qualquer push publica. Por isso as regras da seção 0.

---

## 3. Fluxo de trabalho (passo a passo)

```bash
git pull origin main            # 1. sincronizar
npm ci                          # 2. dependências (se node_modules não existir ou o lock mudou)
# 3. fazer a mudança
npm run build                   # 4. OBRIGATÓRIO: tsc + vite build (é o mesmo build da Vercel)
npm run lint                    # 5. oxlint: erros bloqueiam; avisos existentes são conhecidos (seção 9)
# 6. se mexeu em db/: node scripts/migrar.mjs  (com DATABASE_URL de produção, ANTES do push)
# 7. atualizar CONTEXTO.md (e AGENTE.md/README.md se for o caso)
git add -A && git commit -m "Verbo no infinitivo descrevendo a mudanca"
git push origin main            # 8. publica em produção
```

9. **Confirmar o deploy.** No painel da Vercel ou pelo terminal:
   ```bash
   gh api repos/Nitianimelo/deepcar/commits/$(git rev-parse HEAD)/statuses --jq '.[0] | {state, description, target_url}'
   ```
   `state: success` = no ar. `failure` = abrir o `target_url`, ler o log, corrigir e publicar de novo
   (ou `git revert` do commit, se produção quebrou e a correção vai demorar).

**Mudança grande ou arriscada?** Trabalhe numa branch (`git checkout -b nome`), faça push da branch e use o
*Preview Deployment* que a Vercel cria para testar antes do merge no `main`.

**Estilo de commit** (segue o histórico): título em português, verbo no infinitivo, sem ponto final
(`Corrigir a divisao do SQL na migracao`). Corpo explicando o **porquê** quando não for óbvio.

---

## 4. Comandos

| Comando | Faz |
| --- | --- |
| `npm run dev` | Vite em http://localhost:5173 (veja limitações na seção 9) |
| `npm run build` | `tsc -b && vite build` → `dist/` |
| `npm run lint` | oxlint (`.oxlintrc.json`) |
| `npm run preview` | serve o `dist/` |
| `node scripts/migrar.mjs` | aplica `db/*.sql` em ordem no banco da `DATABASE_URL` (ambiente ou `.env`) |
| `node scripts/criar-admin.mjs <email> <senha> [nome]` | cria/promove administrador direto no banco |
| `node scripts/testar-webhook.mjs [url] [email]` | dispara eventos da Cakto assinados contra a rota do webhook |
| `node scripts/exportar-acervo.mjs` | gera a pasta de publicação do acervo (máquina Windows, caminhos `E:\`) |
| `node scripts/baixar-fontes.mjs` | baixa as fontes para `public/fonts` |
| `node scripts/capturar-telas.mjs` | prints das rotas com Edge headless (conferência visual) |
| `node scripts/empacotar-exe.mjs` | gera o `Deepcar.exe` offline (Node SEA, Windows) |

---

## 5. Mapa do código

```
api/                      funções serverless da Vercel (JavaScript, Node)
  _lib/db.js              conexão Neon por HTTP (sql`...`, um())
  _lib/sessao.js          scrypt, sessão em cookie, exigir(), abrirJanelaFree() (tempo do teste vem do /admin), publico()
  _lib/segredos.js        cofre AES-256-GCM (segredo(), ambienteCom(), guardar())
  _lib/validar.js         validação de cadastro (regra que vale de verdade)
  _lib/cakto.js           webhook da Cakto: prova a origem, evento→ação, produto→plano
  _lib/assinatura.js      o que um pagamento faz com a conta (ativar, derrubar, atraso, pendente)
  _lib/email.js           e-mail pelo Resend (cofre RESEND_API_KEY, de e reply_to contato@deepcar.app.br; respostas caem no Receiving do Resend) + modelo HTML com a logo
  _lib/emails.js          textos: emailBoasVindas (no cadastro), emailRedefinirSenha e emailCompra; avisarCompra(antes, depois) sai de
                          aplicarNaConta (Cakto, pendência, /admin vincular) e aplicarPlay (Google Play) só em compra nova ou troca de plano/ciclo
  _lib/google.js          token OAuth da conta de serviço (FIREBASE_SERVICE_ACCOUNT) para FCM e Android Publisher
  _lib/push.js            notificações do app (FCM v1): enviarPush(), avisarTesteAcabou(), públicos do /admin
  _lib/play.js            assinatura pela Google Play: registrarCompraPlay() (confere + reconhece), conferirPlay() na sessão
  _lib/consultas.js       teste grátis por consultas: podeConsultar()/registrarConsulta() (CONSULTAS_TESTE = 5), encerra o teste no banco
  _lib/planos.js          o que cada plano libera (sistemas, placa, aparelhos), duração do teste (minutosTeste()), acessoDe(), limitarDispositivos()
  admin/planos.js         GET/PUT das regras por plano (aba Planos do /admin)
  compartilhar.js         link de esquema que abre 2 vezes: POST cria (sessão + sistema no plano), GET abre/expira
  webhooks/cakto.js       rota pública que recebe os eventos da Cakto
  admin/assinaturas.js    pendências sem conta e histórico de eventos
  login.js registrar.js sair.js sessao.js
  admin/usuarios.js admin/segredos.js admin/inicializar.js
  placa/[placa].js        consulta de placa (exige sessão + acesso)
db/                       migrações SQL numeradas, idempotentes
server/                   lógica Node reaproveitável
  placa/index.mjs         consulta de placa: escolhe o provedor + cache 24h (VARIAVEIS_PLACA = chaves lidas)
  placa/veiculo.mjs       formato único do veículo, normalizarPlaca()
  placa/provedores/       falcon.mjs (Falcon Data Hub), simulado.mjs (placas de teste, quando não há token)
  login.mjs               login ANTIGO por variáveis (usado só pelo Vite dev e pelo .exe)
  app-local.mjs           servidor do Deepcar.exe
  vitePlacaPlugin.mjs     /api/placa e /api/login no `npm run dev`
  vitePaginasSeo.mjs      no build, grava dist/cadastro e dist/login com título/descrição/canônico próprios (SEO)
  viteAcervoPlugin.mjs    serve ACERVO_DIR em /acervo no `npm run dev`
src/
  App.tsx                 rotas (lazy por página)
  pages/                  Landing, Login, Cadastro, Admin, Inicio (/app), Busca, SectionPage, EsquemaPage, VeiculoPage, Conta,
                          Compartilhado (/c/:token, esquema recebido por link, sem conta, em tela cheia),
                          Privacidade (/privacidade) e ExcluirConta (/excluir-conta), com a casca components/PaginaSimples.tsx,
                          Obrigado (/obrigado, para onde a Cakto manda quem pagou; noindex)
  layouts/AppLayout.tsx   casca do /app (sidebar, barra, selo do teste)
  components/             ListaEsquemas (lista da seção e da busca), DetalhesEsquema, EsquemaViewer, CompartilharEsquema, Sidebar, LimiteFree, LogoMarca, Tooltips…
  components/SeletorComponente.tsx  lista com busca dos componentes do esquema (tecla /), dentro do EsquemaViewer
  components/PaletaBusca.tsx        busca rápida Ctrl+K / ⌘K de qualquer tela do app (placa, esquema, últimas consultas)
  components/landing/     GridBeam (fundo animado), Reveal (entrada no scroll): só a landing. PlanosLanding: seção de planos
                          da landing (fundo cinza-claro, cartões brancos, tokens --color-papel*/tinta-*/azul-escuro);
                          exporta CartaoPlanoClaro/ChaveCiclo, usados também na aba Plano da conta e em todo convite
  components/landing/BotaoWhatsapp.tsx  botão flutuante do WhatsApp (só na landing); components/IconeWhatsapp.tsx: ícone da marca
  components/Folha.tsx    folha que sobe de baixo (+ Destaque): sem desfoque, voltar do Android fecha (estado no histórico)
  components/Funil.tsx    BoasVindas (3 passos no início), ConviteMomento (após 1ª placa / 3º esquema), DicaEsquema
  lib/log.ts              registro de uso: registrar(tipo, detalhe) em fila, lote de até 40 a cada 30 s ou ao esconder a aba (sendBeacon) → POST /api/sessao { evento: 'log' } → eventos_uso; /admin → Logs
  components/NavegadorInterno.tsx  navegador do Instagram/Facebook/TikTok: iPhone → Safari (x-safari-https) no /cadastro; Android → Play Store ou Chrome (intent://); com a query da campanha
  lib/consulta.ts         liberarEsquema() (POST /api/sessao evento consulta) e o sinal para o layout reconferir a sessão
  lib/funil.ts            regras do funil no navegador (por conta e aparelho) e marcos de ativação → POST /api/sessao
  lib/seo.ts              useTitulo(): título da aba ao navegar (páginas públicas já saem certas do build)
  lib/transicao.ts        marcarTitulo(): título que "voa" da lista ao cabeçalho do esquema (View Transitions)
  lib/auth.ts             cliente de sessão (cookie no servidor; localStorage só guarda retrato do perfil)
  lib/plano.ts            relógio do teste no navegador (duração vem na sessão: testeMinutos; duracaoTeste() nos textos) e reconferência da sessão
  lib/acesso.tsx          podeSecao()/podePlaca() e useAcesso() (com testeAcabou): cadeado no menu, faixa e esquema borrado
  components/LimiteFree.tsx     plano free: SeloTeste (barra, computador), AssinarNoMenu (menu lateral), AvisoTopo (faixa no celular)
  components/AssineParaAcessar.tsx  todo bloqueio leva a assinar: EsquemaEmbacado (borrado; teste vencido ou "Somente no plano X"),
                          ConviteAssinatura (cartões claros, só os planos que liberam), AvisoSistemaBloqueado (faixa da lista)
  lib/suporte.ts          WhatsApp/e-mail de suporte (VITE_SUPORTE_WHATSAPP), sem dependências: a landing usa
  lib/validacao.ts        validação de cadastro no navegador (espelha api/_lib/validar.js)
  lib/acervo.ts           leitura do acervo (VITE_ACERVO_URL ou /acervo)
  lib/busca.ts            busca de texto no catálogo (normalizar, indexar, filtrar)
  lib/compatibilidade.ts  quais esquemas servem para o veículo da placa (sistemasDisponiveis)
  lib/recentes.ts         últimas consultas no localStorage, por conta; reaproveita veículo já consultado
  lib/placa.ts            cliente de /api/placa, formatar/validar/normalizar placa
  data/nav.ts             menu lateral, SECOES e metadados das seções
  data/marcas.json        montadoras
  index.css               tokens de design (@theme do Tailwind)
public/                   brand/, marcas/ (logos), fonts/
scripts/                  migração, admin, acervo, fontes, logos, capturas, empacotamento
vercel.json               build, rewrite SPA (tudo que não é /api → index.html), cache, headers
```

### Rotas
- Front: `/`, `/login`, `/cadastro`, `/admin`, `/c/:token` (link compartilhado, público), `/obrigado` (retorno da Cakto
  depois do pagamento: espera o webhook liberar o plano e entra em `/app`; sem sessão manda ao login), `/app` (início), `/app/busca?q=`, `/app/injecao/leve|diesel`, `/app/abs`, `/app/eletrica`,
  `/app/cambio`, `/app/esquema/*`, `/app/veiculo/:placa`, `/app/conta`, `/privacidade` e `/excluir-conta` (públicas,
  exigidas pela Google Play para o app Android).
- API: `POST /api/registrar` (`GET` devolve `{ testeMinutos }` para a página de cadastro), `POST /api/login` (`?acao=esqueci` { email } manda o link de nova senha; `?acao=redefinir` { token, senha } grava e derruba as sessões), `POST /api/sair`, `GET /api/sessao`, `DELETE /api/sessao` (exclui a própria conta, pede a senha), `POST /api/sessao` (`evento: 'checkout'` → InitiateCheckout na Meta; `evento: 'ativacao'` → marco de primeiros passos; `evento: 'consulta', item` → conta o esquema aberto no teste e responde `{ liberado }`; `evento: 'play', token` → assinatura feita no app; `evento: 'push', token` → aparelho para notificação; `evento: 'log'` → lote do registro de uso, aceito SEM login), `GET /api/admin/usuarios?acao=logs` (eventos + resumo), `GET|POST /api/admin/usuarios?acao=push` (avisos no app), `GET /api/admin/assinaturas?acao=cron` (cron diário 13h UTC, `CRON_SECRET`),
  `GET|POST|PATCH|DELETE /api/admin/usuarios`, `GET|PUT /api/admin/planos`, `GET|PUT|DELETE /api/admin/segredos`,
  `POST /api/admin/inicializar`, `GET /api/placa/:placa`, `POST|GET /api/compartilhar`.
- **Limite da Vercel (plano Hobby): 12 funções em `api/`** (sem contar `_lib/`), e o projeto já está com 12. Rota nova
  precisa entrar num arquivo existente (por método ou `?acao=`) ou o deploy falha.

---

## 6. Banco de dados (Neon)

- Tabelas: `usuarios` (plano `free|pro|full`, papel `usuario|admin`, `ativo`, `whatsapp`, `free_expira_em`, `origem` (UTM/fbclid do
  cadastro pelo site), `rastreio_meta` (fbp/fbc/IP/navegador do cadastro, usado no Purchase), `boas_vindas_em`/`primeira_placa_em`/
  `primeiro_esquema_em` (ativação, no /admin), colunas
  `assinatura_*`, `assinatura_ciclo` `mensal|anual` e `plano_expira_em` = fim do anual), `sessoes` (sha-256 do token),
  `segredos` (valores cifrados), `cakto_eventos`, `assinaturas_pendentes` (com `ciclo`), `compartilhamentos`
  (sha-256 do link, esquema, `limite` 2, `aberturas`, `visitantes` = aparelho → 1ª abertura), `consultas` (conta × item
  `esquema:<id>`/`placa:<PLACA>`, uma linha por coisa diferente consultada, db/010) e `usuarios.consultas` (o total;
  o CRM lê por `crm_leitura`). Função `limpar_sessoes()`.
- **App 1.3.0 (Google Play e push, db/011):** `usuarios.play_*` (token, produto, expira, estado), `aparelhos_push`, `notificacoes`,
  `usuarios.push_teste_acabou_em`. Conta paga no app tem `assinatura_origem = 'play'` (a Cakto não mexe nela).
  O app novo manda `X-Deepcar-App: <versão>`: com ele, mesmo com agente Dalvik, vale o teste por consultas do site.
- **Teste grátis por consultas (desde 07/10/2026):** no site o teste vale 5 consultas diferentes (`api/_lib/consultas.js`);
  repetir o mesmo esquema/placa não gasta; a 5ª ganha 30 min de folga e a 6ª nova encerra o teste (`free_expira_em = now()`),
  e daí tudo que já existia para teste vencido vale (402, borrado, planos no início). Prazo de segurança no site: 7 dias
  (`DIAS_TESTE_SITE`). Conta criada pelo app ou primeiro acesso pelo app (`User-Agent` `Dalvik/`, `ehApp()`) fica com o
  prazo de horas do /admin, porque o app antigo não avisa os esquemas abertos; a placa conta no app também (servidor).
- **Acesso por plano:** tabela `planos_acesso` (plano → `secoes[]`, `placa`, `dispositivos`; na linha `free`, `minutos_teste` =
  duração do teste, db/009), editável no /admin → Planos. Sistema fora do plano **não some**: a lista abre e o esquema abre
  borrado com "Somente no plano X" (`planosQueLiberam`/`textoSomente` em `src/data/planos.ts`).
  Padrão: Pro = injeção leve, ABS, elétrica leve, 2 aparelhos, com placa; Full = tudo, 4 aparelhos; Free (teste) = tudo, 2.
  Admin sempre vê tudo. `sessoes.visto_em` guarda o último uso; o limite derruba o aparelho parado há mais tempo no login.
  **O servidor barra a placa (403); os sistemas são barrados só na tela**, porque o acervo é lido direto do R2 público
  (ver Pendências no CONTEXTO.md). Mudar as chaves de seção exige mudar `src/data/nav.ts` e `api/_lib/planos.js` juntos.
- **Plano anual:** a Cakto não avisa o fim de uma compra única. Quem corta é `vencerAnual()` em `api/_lib/sessao.js`,
  a cada sessão conferida e no login (plano volta a `free`, `assinatura_status = 'expirada'`).
- **Toda mudança de schema = novo arquivo** `db/NNN_descricao.sql` (próximo número em sequência).
  **Nunca edite** um arquivo já aplicado em produção.
- Migrações **idempotentes**: `if not exists`, `add column if not exists`, `create or replace`.
  `migrar.mjs` roda todos os arquivos sempre, então precisam aguentar rodar de novo.
- Cada comando termina com `;` no fim da linha (o `migrar.mjs` divide por isso; corpos `$$` são respeitados).
- **Ordem de publicação:** migração primeiro, push depois. Mudanças destrutivas (drop/rename) em duas etapas:
  1) código para de usar a coluna, publica; 2) nova migração remove.
- Para rodar: `DATABASE_URL="postgres://..." node scripts/migrar.mjs` (a URL está nas variáveis da Vercel / painel do Neon).

---

## 7. Segurança e segredos

- `.env` está no `.gitignore`. Use `.env.example` como referência e **mantenha-o atualizado** ao criar variável nova.
- Variáveis `VITE_*` **entram no bundle público**. Nunca ponha segredo com prefixo `VITE_`.
- `DATABASE_URL`, `SESSAO_SEGREDO`, `SEGREDOS_CHAVE` ficam só na Vercel; o cofre recusa gravá-las.
- `ADMIN_EMAIL`/`ADMIN_SENHA`: só para o primeiro `POST /api/admin/inicializar`; apagar da Vercel depois.
- Toda rota protegida confere a sessão no servidor com `exigir(req, res, { admin?, acesso? })`.
  O localStorage (`deepcar.perfil`) só desenha a tela e **nunca** libera acesso.
- Rotas que entregam conteúdo usam `acesso: true` (free vencido → 402). Teste vencido **não trava a navegação**: o
  esquema abre embaçado e a placa mostra o convite (`AssineParaAcessar.tsx`); o borrado nunca usa o `EsquemaViewer`
  (em tela cheia o filtro do pai deixa de valer). Rotas autenticadas respondem `Cache-Control: private, no-store`.
- Senha: scrypt (`scrypt$sal$hash`). Login responde a mesma mensagem para e-mail inexistente e senha errada.

---

## 8. Convenções

- Código, nomes e comentários em **português** (`usuario`, `sessao`, `exigir`, `conferirSessao`).
- Comentários explicam o **porquê**, não o quê. Em `api/` os comentários estão sem acento; siga o arquivo.
- Regras duplicadas navegador/servidor **precisam mudar juntas**:
  - teste por consultas: `CONSULTAS_TESTE` (api/_lib/consultas.js) só existe no servidor; a tela nunca mostra o número
  - duração do teste (só app Android antigo; o site usa `DIAS_TESTE_SITE`): vale o /admin → Planos (`planos_acesso.minutos_teste`); `MINUTOS_TESTE_PADRAO` (api/_lib/planos.js) ↔
    `MINUTOS_FREE` (src/lib/plano.ts) é só o padrão quando o admin não definiu
  - validação de cadastro: `api/_lib/validar.js` ↔ `src/lib/validacao.ts`
  - chaves das seções: `src/data/nav.ts` ↔ `api/_lib/planos.js` (`SECOES`) ↔ `db/005` (valores iniciais)
  - o que cada plano libera: `api/_lib/planos.js` (`PADRAO`, vale o que estiver no /admin → Planos) ↔ `secoes`/`placa`/`aparelhos`
    de `src/data/planos.ts` (o que os cartões mostram). Mudou a regra de um plano no /admin? Atualize os cartões também.
  A regra que vale é a do servidor; a do navegador só dá resposta imediata.
- Páginas novas entram com `lazy()` em `src/App.tsx` (a landing é a única no pacote inicial).
- Estilo: tokens de `src/index.css`; não espalhar cores fixas.
- Não commitar arquivos gerados (`dist/`, `build-exe/`, `node_modules/`).

---

## 9. Armadilhas conhecidas

- **Login/cadastro não funcionam no `npm run dev`.** O plugin do Vite (`server/vitePlacaPlugin.mjs`) ainda expõe o
  `/api/login` antigo (usuário/senha das variáveis) e não existem `/api/registrar`, `/api/sessao` e `/api/admin/*`
  no dev. Para testar contas: `npx vercel dev` (com as variáveis puxadas via `vercel env pull`) ou um Preview Deployment.
- **Acervo local** depende de `ACERVO_DIR` (padrão `E:\deepcar-publicacao`, máquina Windows). Sem ele, catálogo vazio no dev.
- `Iniciar-Local.ps1`, `exportar-acervo.mjs` e `empacotar-exe.mjs` usam caminhos `E:\` e ferramentas Windows.
- `npm run lint` já tem 10 avisos (0 erros), principalmente `set-state-in-effect`, `exhaustive-deps` e `only-export-components`, espalhados por `src/`. Não são erros; não aumente a lista (compare a contagem antes e depois da mudança).
- Prints do `capturar-telas.mjs` (Edge headless) cortam a largura: não confunda com layout quebrado (ver commit `31b1313`).
- Pasta local dentro do iCloud Drive pode corromper o `.git` (arquivos duplicados tipo `index 2`). Para trabalhar, clone
  em `~/Developer/deepcar` (fora do iCloud) e **apague a cópia no fim**: o dono quer o SSD livre. A cópia de referência no
  Mac fica no iCloud em `Grupo Inttus/deepcar-main` (sem `node_modules`/`dist`); a fonte da verdade é o GitHub.
- Deploy da Vercel não roda migração nem copia o acervo.
- **Celular de entrada é o público** (87% das contas usam celular; Galaxy A03/A12, Moto g04s, Redmi). Nada de
  `backdrop-filter`/`filter: blur` no celular em telas do app (fica atrás de `md:`); animação só com opacity/transform.
  Dica por `data-tip` não aparece no toque: o que o celular precisa saber vai em texto visível.
- **Folha (components/Folha.tsx) empilha um estado no histórico.** Trocar de folha no meio de um fluxo (desmontar e
  montar outra) faz o "voltar" fechar a seguinte: mantenha uma folha só e troque o conteúdo (ver BoasVindas).
- **Pixel da Meta (`src/lib/pixel.ts`) só roda nas páginas públicas.** Nunca carregue em `/app`, `/admin` ou `/c/`
  (a URL leva placa e token). Página privada nova fora desses prefixos? Inclua em `PRIVADAS`.
  Eventos da Meta: `PageView` e `Contact` (botões de WhatsApp da landing) só pelo pixel; `CompleteRegistration` pelo
  pixel + API de Conversões (mesmo eventID), e junto um `Lead` (eventID `lead-<id do cadastro>`), porque no funil o
  cadastro é o Lead (o CRM de WhatsApp manda `Contact` para quem só chamou no WhatsApp); `InitiateCheckout` (clique em assinar, `avisarCheckout` → `POST /api/sessao`)
  e `Purchase` (webhook da Cakto) só pela API (`api/_lib/meta.js`). O cadastro só vai para a Meta quando vem do site
  (`evento_id` no corpo). Não use isso nas rotas do app Android.
- **Correspondência avançada (07/10/2026):** o pixel inicia com `country: br`, `external_id` = id anônimo do navegador
  (`visitanteId()`, localStorage `deepcar.visitante`) e, se há retrato da conta (`deepcar.perfil`), e-mail/WhatsApp/nome
  (o fbevents faz o hash). O servidor manda o MESMO visitante no `external_id` (junto do id da conta) no cadastro,
  checkout e compra (`usuarios.rastreio_meta.visitante`). Mudou um lado? Mude o outro.
- **Origem e rastreio:** `src/lib/origem.ts` guarda no navegador o primeiro toque com campanha (UTM, fbclid, gclid) e o
  fbclid mais recente (vira `fbc`); o cadastro manda e o servidor grava em `usuarios.origem` / `rastreio_meta`. O webhook
  usa o `rastreio_meta` no Purchase (sem navegador a Meta recebe como `system_generated`). Origem aparece no /admin.
- **Política de privacidade (`src/pages/Privacidade.tsx`) descreve o que o código coleta.** Mudou coleta, fornecedor ou
  prazo? Atualize o texto e a data no mesmo commit. Ela é o endereço declarado na Google Play.
- **SEO:** metatags e dados estruturados (JSON-LD) ficam no `index.html`; página pública nova = entrada em
  `PAGINAS` de `server/vitePaginasSeo.mjs` + `public/sitemap.xml`. Mudou preço? Atualize também os `offers` do JSON-LD.
  Rotas privadas respondem `X-Robots-Tag: noindex` (vercel.json). `deepcar.vercel.app` redireciona para o domínio.

---

## 10. App Android e Google Play

O app Android **não está neste repositório**. Ele vive só no iCloud do dono:
`Arquivos das empresas/Grupo Inttus/deepcar-android` (código, `.aab`, chave de upload, histórico git em bundle).
Lá estão `AGENTE.md` (como compilar e publicar, como operar o Play Console) e `CONTEXTO.md` (estado, contas e
**credenciais** — que não podem vir para cá, porque **este repositório é público**).

- Pacote na Play: `deepcar.app.android`. Conta de organização "Inttus Soluções Tecnológicas Ltda". Versão 1.1.0 publicada
  (Produção, Brasil). Link da loja: `LINK_GOOGLE_PLAY` em `src/components/StoreBadges.tsx` (selo da landing e menu lateral).
- O app usa a API deste site (`https://deepcar.app.br/api/*`) pelo HTTP nativo, com o cookie `deepcar_sessao`
  reenviado no cabeçalho `Cookie`. Mudar nome/formato do cookie, rotas ou respostas de `api/login`, `api/sessao`,
  `api/registrar`, `api/sair`, `api/placa`, `api/compartilhar` **quebra o app instalado** nos celulares: mantenha
  compatibilidade ou avise que precisa de versão nova do app.
- `DELETE /api/sessao` (excluir conta) e as páginas `/privacidade` e `/excluir-conta` são **exigência da Google Play**:
  não remover. A política precisa descrever o que o site **e o app** coletam; mudou coleta ou fornecedor, atualize
  `src/pages/Privacidade.tsx` e avise que a "Segurança dos dados" no Play Console também muda.
- Existe a conta `revisao.play@deepcar.app.br` com plano Full manual: é a do revisor da Google. **Não apagar**, não
  rebaixar e não trocar a senha (a senha está no CONTEXTO.md do app, no iCloud).
- O app **não** mostra preço nem checkout (política de Pagamentos da Play). Mudança de preço/plano no site não exige
  mudar o app, exceto a lista do que cada plano inclui (`ITENS_PLANO` no app ↔ `src/data/planos.ts`), os minutos do
  teste (`MINUTOS_FREE`) e as chaves das seções.
- E-mail de suporte/contato público: `nitiani@compilla.dev` (padrão de `VITE_SUPORTE_EMAIL`). WhatsApp de suporte:
  `VITE_SUPORTE_WHATSAPP` na Vercel (55 + DDD + número); vazio = botão da landing some e o suporte cai no e-mail.

---

## 11. Como registrar no CONTEXTO.md

Adicione **no topo** da seção "Histórico" do `CONTEXTO.md`:

```markdown
### AAAA-MM-DD · Título curto da mudança
- **Quem:** nome da pessoa ou agente
- **Pedido:** o que foi pedido e por quê
- **O que mudou:** arquivos e comportamento, em detalhe suficiente para outra pessoa continuar
- **Banco:** migração nova? já aplicada no Neon? (ou "sem mudança")
- **Variáveis/infra:** variável nova na Vercel, cofre, R2? (ou "sem mudança")
- **Verificação:** build, lint, teste manual, status do deploy
- **Commit:** hash curto (preencha após o commit, ou descreva no próprio commit)
- **Pendências:** o que ficou para depois
```

Atualize também as seções **"Estado atual"** e **"Pendências"** do `CONTEXTO.md` se elas mudaram.
