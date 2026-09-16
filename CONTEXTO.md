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
  - Landing (`/`) com mockups de celular/tablet, selos das lojas e planos sem valores.
  - Cadastro aberto (`/cadastro`: nome, e-mail, WhatsApp, senha) e login (`/login`) com sessão em cookie httpOnly de 30 dias no Neon.
  - Plano **free = 5 minutos de acesso**, contados a partir do primeiro acesso; depois bloqueia a tela e a API responde 402.
  - `/admin`: usuários (busca, plano, papel, bloquear, trocar senha, apagar, liberar novo teste, WhatsApp como link) e cofre de chaves.
  - Plataforma `/app`: seções de injeção leve/diesel, ABS, elétrica e câmbio, com catálogo do acervo no R2.
  - Visualizador de esquemas (scroll contínuo, zoom, minimapa, modo leitura, claro/escuro) e impressão A4 com marca d'água.
  - Consulta por placa (`/app/veiculo/:placa`): Falcon Data Hub → Consultar Placa → modo simulado, com cache de 24 h.
- **Banco (Neon):** migrações `001_inicial` e `002_whatsapp_e_teste_free`.
- **Último deploy verificado:** commit `31b1313`, estado `success` (2026-09-16).

## Pendências e problemas conhecidos

- [ ] `README.md` desatualizado: a seção "Estado atual" ainda fala em login mock/localStorage, e a tabela da Vercel
      lista `LOGIN_USUARIO`/`LOGIN_SENHA`/`LOGIN_USUARIOS`, que as funções de `api/` não usam mais.
- [ ] `npm run dev` não suporta o fluxo de contas do Neon (`/api/login` antigo, sem `/api/registrar`, `/api/sessao`, `/api/admin/*`).
      Testar contas via `vercel dev` ou Preview Deployment.
- [ ] Scripts de acervo e do executável dependem de caminhos Windows (`E:\`).
- [ ] 5 avisos do oxlint (`set-state-in-effect`/`exhaustive-deps`) em `src/lib/acervo.ts`, `src/pages/Admin.tsx`, `src/pages/SectionPage.tsx`.
- [ ] Selos App Store / Google Play na landing ainda sem `href` real (`src/components/StoreBadges.tsx`).
- [ ] Assinatura/pagamento do plano pro não existe: a passagem para `pro` é manual no `/admin`.

---

## Histórico (mais recente primeiro)

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
