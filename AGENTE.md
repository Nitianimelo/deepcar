# AGENTE.md · Deepcar

Instruções para **qualquer pessoa ou agente de IA** (Claude, Codex, Cursor, Copilot…) que for trabalhar
neste repositório. Leia este arquivo inteiro antes de mudar qualquer coisa.

---

## 0. Regras obrigatórias (não pule)

1. **Antes de começar:** leia `AGENTE.md` (este arquivo) e `CONTEXTO.md` (o que já foi feito, estado atual e pendências).
2. **Sincronize primeiro:** `git pull origin main`. Nunca comece a trabalhar sobre uma cópia desatualizada.
3. **A cada modificação, atualize `CONTEXTO.md`** com uma nova entrada no topo do **Histórico** (modelo na seção 10).
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
plano free com tempo limitado e painel administrativo.

Stack: **React 19 + Vite 8 + TypeScript 6 + Tailwind CSS 4 + React Router 7**, funções serverless
Node na Vercel (`api/`) e Postgres no **Neon**.

---

## 2. Infraestrutura (onde cada coisa vive)

| Peça | Onde | Observação |
| --- | --- | --- |
| Código | GitHub `Nitianimelo/deepcar`, branch `main` | fonte da verdade |
| Front + API | Vercel, projeto `nitiani-melo/deepcar` | **deploy automático a cada push no `main`** (produção) |
| Banco | Neon (Postgres), ligado à Vercel pela integração | schema em `db/*.sql`, **não** é aplicado pelo deploy |
| Acervo (catálogo, esquemas, imagens) | Cloudflare R2 | **não** está no git nem na Vercel; front lê de `VITE_ACERVO_URL` |
| Segredos de infraestrutura | Variáveis de ambiente da Vercel | `DATABASE_URL`, `SESSAO_SEGREDO`, `SEGREDOS_CHAVE` |
| Chaves de API de terceiros | Cofre no banco (tabela `segredos`), editável em `/admin` | ex.: `APIBRASIL_BEARER_TOKEN`, `APIBRASIL_DEVICE_TOKEN` |

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
| `node scripts/exportar-acervo.mjs` | gera a pasta de publicação do acervo (máquina Windows, caminhos `E:\`) |
| `node scripts/baixar-fontes.mjs` | baixa as fontes para `public/fonts` |
| `node scripts/capturar-telas.mjs` | prints das rotas com Edge headless (conferência visual) |
| `node scripts/empacotar-exe.mjs` | gera o `Deepcar.exe` offline (Node SEA, Windows) |

---

## 5. Mapa do código

```
api/                      funções serverless da Vercel (JavaScript, Node)
  _lib/db.js              conexão Neon por HTTP (sql`...`, um())
  _lib/sessao.js          scrypt, sessão em cookie, exigir(), MINUTOS_FREE, publico()
  _lib/segredos.js        cofre AES-256-GCM (segredo(), ambienteCom(), guardar())
  _lib/validar.js         validação de cadastro (regra que vale de verdade)
  login.js registrar.js sair.js sessao.js
  admin/usuarios.js admin/segredos.js admin/inicializar.js
  placa/[placa].js        consulta de placa (exige sessão + acesso)
db/                       migrações SQL numeradas, idempotentes
server/                   lógica Node reaproveitável
  placa/index.mjs         consulta de placa: escolhe o provedor + cache 24h (VARIAVEIS_PLACA = chaves lidas)
  placa/veiculo.mjs       formato único do veículo, normalizarPlaca()
  placa/provedores/       apibrasil.mjs (principal), consultarplaca.mjs (pago), simulado.mjs (placas de teste)
  login.mjs               login ANTIGO por variáveis (usado só pelo Vite dev e pelo .exe)
  app-local.mjs           servidor do Deepcar.exe
  vitePlacaPlugin.mjs     /api/placa e /api/login no `npm run dev`
  viteAcervoPlugin.mjs    serve ACERVO_DIR em /acervo no `npm run dev`
src/
  App.tsx                 rotas (lazy por página)
  pages/                  Landing, Login, Cadastro, Admin, SectionPage, EsquemaPage, VeiculoPage, Conta
  layouts/AppLayout.tsx   casca do /app (sidebar, barra, LimiteFree)
  components/             EsquemaViewer, PrintEsquema, Sidebar, LimiteFree, LogoMarca, Tooltips…
  lib/auth.ts             cliente de sessão (cookie no servidor; localStorage só guarda retrato do perfil)
  lib/plano.ts            relógio do plano free no navegador (espelha MINUTOS_FREE)
  lib/validacao.ts        validação de cadastro no navegador (espelha api/_lib/validar.js)
  lib/acervo.ts           leitura do acervo (VITE_ACERVO_URL ou /acervo)
  data/nav.ts             menu lateral e metadados das seções
  data/marcas.json        montadoras
  index.css               tokens de design (@theme do Tailwind)
public/                   brand/, marcas/ (logos), fonts/
scripts/                  migração, admin, acervo, fontes, logos, capturas, empacotamento
vercel.json               build, rewrite SPA (tudo que não é /api → index.html), cache, headers
```

### Rotas
- Front: `/`, `/login`, `/cadastro`, `/admin`, `/app/injecao/leve|diesel`, `/app/abs`, `/app/eletrica`,
  `/app/cambio`, `/app/esquema/*`, `/app/veiculo/:placa`, `/app/conta`.
- API: `POST /api/registrar`, `POST /api/login`, `POST /api/sair`, `GET /api/sessao`,
  `GET|POST|PATCH|DELETE /api/admin/usuarios`, `GET|PUT|DELETE /api/admin/segredos`,
  `POST /api/admin/inicializar`, `GET /api/placa/:placa`.

---

## 6. Banco de dados (Neon)

- Tabelas: `usuarios` (plano `free|pro`, papel `usuario|admin`, `ativo`, `whatsapp`, `free_expira_em`),
  `sessoes` (sha-256 do token), `segredos` (valores cifrados). Função `limpar_sessoes()`.
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
- Rotas que entregam conteúdo usam `acesso: true` (free vencido → 402). Rotas autenticadas respondem `Cache-Control: private, no-store`.
- Senha: scrypt (`scrypt$sal$hash`). Login responde a mesma mensagem para e-mail inexistente e senha errada.

---

## 8. Convenções

- Código, nomes e comentários em **português** (`usuario`, `sessao`, `exigir`, `conferirSessao`).
- Comentários explicam o **porquê**, não o quê. Em `api/` os comentários estão sem acento; siga o arquivo.
- Regras duplicadas navegador/servidor **precisam mudar juntas**:
  - `MINUTOS_FREE`: `api/_lib/sessao.js` ↔ `src/lib/plano.ts`
  - validação de cadastro: `api/_lib/validar.js` ↔ `src/lib/validacao.ts`
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
- `npm run lint` já tem 13 avisos (0 erros), principalmente `set-state-in-effect`, `exhaustive-deps` e `only-export-components`, espalhados por `src/`. Não são erros; não aumente a lista (compare a contagem antes e depois da mudança).
- Prints do `capturar-telas.mjs` (Edge headless) cortam a largura: não confunda com layout quebrado (ver commit `31b1313`).
- Pasta local dentro do iCloud Drive pode corromper o `.git` (arquivos duplicados tipo `index 2`). Prefira clonar fora do iCloud.
- Deploy da Vercel não roda migração nem copia o acervo.

---

## 10. Como registrar no CONTEXTO.md

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
