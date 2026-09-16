# Deepcar · Esquemas elétricos automotivos

Interface web para mecânicos consultarem esquemas elétricos (injeção leve e diesel, ABS, elétrica e câmbio).

Stack: React 19 + Vite + TypeScript + Tailwind CSS 4 + React Router.

## Rodar

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # gera dist/
```

## Rotas

- `/` landing page (`src/pages/Landing.tsx`): hero com celular e tablet em CSS (`DeviceMockups.tsx`),
  selos App Store / Google Play (`StoreBadges.tsx`, trocar os `href` quando publicar), cobertura, planos sem valores.
- `/login` e `/app/*` plataforma.

## Estado atual

- Login mock (`src/lib/auth.ts`): qualquer e-mail válido com senha de 4+ caracteres entra. Sessão fica no localStorage.
- Catálogo e esquemas reais vêm do acervo publicado (ver abaixo), via `src/lib/acervo.ts`.
- Menu lateral em `src/data/nav.ts` (rótulos, rotas e ícones).
- Tokens de design em `src/index.css` (`@theme`).
- Logos: `public/brand/` (`*-light.png` são versões geradas para fundo escuro).

## Acervo de esquemas

As páginas geradas pelo pipeline (`E:\Esquemas_Azul_Preto_20260908\paginas finais`) são convertidas por
`node scripts/exportar-acervo.mjs` para a pasta de publicação (`E:\deepcar-publicacao`), com o mesmo layout que vai ao R2:

```
catalogo/index.json                     seções, totais, montadoras
catalogo/<secao>.json                   lista e busca (SectionPage, consulta por placa)
esquemas/<secao>/<marca>/<slug>.json    dados do visualizador (EsquemaViewer)
img/<secao>/<marca>/<slug>/esquema-NN.png, minimapa.png
```

- As imagens são **hardlinks** para os PNGs originais (mesmo disco): não ocupam espaço. Esquemas com desenho idêntico
  apontam para a mesma pasta de imagens. PDFs e caminhos de origem não são publicados.
- Rodar de novo é seguro; páginas ainda sem `index.html` entram na próxima execução.
- Desenvolvimento: o plugin `server/viteAcervoPlugin.mjs` serve `ACERVO_DIR` em `/acervo`. Produção: `VITE_ACERVO_URL`
  com o domínio do bucket.
- `Iniciar-Local.ps1` sobe tudo (Node portátil em `E:\ferramentas`); `-Exportar` reexporta antes.
- `scripts/capturar-telas.mjs` tira prints das rotas com o Edge headless (conferência visual).

## Publicar na Vercel

O front é estático; só o login e a consulta de placa precisam de servidor, e viram funções em `api/`.

1. Importar o repositório na Vercel (preset Vite; `vercel.json` já traz build, rewrites e cache).
2. Variáveis de ambiente do projeto:

| Variável | Para quê |
| --- | --- |
| `VITE_ACERVO_URL` | endereço público do bucket R2 (entra no bundle, é lido pelo navegador) |
| `LOGIN_USUARIO` / `LOGIN_SENHA` | login de um usuário; `LOGIN_NOME` e `LOGIN_OFICINA` são opcionais |
| `LOGIN_USUARIOS` | alternativa: JSON com a lista de usuários (mesmo formato do `config.json` do executável) |
| `FALCON_TOKEN` | consulta de placa real (Falcon Data Hub); sem ele a rota responde em modo simulado. Prefira gravar no cofre do `/admin` |
| `VITE_SUPORTE_WHATSAPP` | número (só dígitos, com DDI) do botão "Falar no WhatsApp" quando o teste grátis acaba |

3. As rotas do React Router dependem do rewrite em `vercel.json` (tudo que não é `/api` cai no `index.html`).

O acervo **não** vai para a Vercel: fica no R2 (`https://<bucket>.r2.dev` ou domínio próprio) e é enviado
por `E:\ferramentas\rclone\Enviar-Acervo-R2.ps1`. Os JSON sobem compactados com `Content-Encoding: gzip`
(o catálogo de injeção leve cai de 1,16 MB para 107 KB); as imagens vão com cache de um ano.

### Contas, sessão e administração (Neon)

Banco Postgres no Neon. Esquema em `db/*.sql`, aplicado em ordem por `node scripts/migrar.mjs`
(ou colado no editor SQL do Neon). Pode rodar de novo sem estragar nada: é tudo `if not exists`.

- **Senha** guardada com scrypt do próprio Node (`scrypt$<sal>$<hash>`), nunca em texto.
- **Sessão** num cookie httpOnly de 30 dias; no banco fica só o sha-256 do token. O navegador
  guarda apenas um retrato do perfil (`deepcar.perfil`), que serve para desenhar a tela e não
  libera nada: `api/admin/*` e a consulta de placa conferem o cookie no servidor.
- **Cadastro aberto** em `/cadastro` (plano free). Login em `/login`.
- **Plano free = 5 minutos de acesso** (`MINUTOS_FREE` em `api/_lib/sessao.js`, espelhado em `src/lib/plano.ts`).
  O relógio começa no **primeiro acesso**, não na criação da conta (`usuarios.free_expira_em`; nulo = ainda não
  começou). Acabou o tempo: a barra superior mostra o contador zerado, a tela do app é coberta por
  `BloqueioFree` (assinar, falar com o suporte ou sair) e o servidor responde **402** nas rotas de conteúdo
  (`exigir(req, res, { acesso: true })`). O front reconfere a sessão de minuto em minuto, então virar `pro`
  no `/admin` libera o acesso sem recarregar a página. Administrador nunca é barrado.
- **Cadastro pede nome, e-mail, WhatsApp e senha**, validados nos dois lados (`src/lib/validacao.ts` e
  `api/_lib/validar.js`). O WhatsApp é guardado só em dígitos com DDI (`5511987654321`) e aparece no `/admin`
  como link do WhatsApp.
- **`/admin`** (só para `papel = admin`): lista de usuários com busca, plano free/pro no dropdown,
  papel, bloquear, trocar senha, apagar; e o cofre de chaves de API.
- **Primeiro administrador**: configure `ADMIN_EMAIL` e `ADMIN_SENHA` na Vercel e chame
  `POST /api/admin/inicializar` uma vez. Só funciona enquanto não existe nenhum admin. Depois,
  apague as duas variáveis.
- **Cofre de chaves** (`segredos`): valores cifrados em AES-256-GCM com `SEGREDOS_CHAVE`.
  É de onde sai o `FALCON_TOKEN` em produção (`ambienteCom()` em `api/_lib/segredos.js`),
  editável pelo `/admin` sem novo deploy. `DATABASE_URL`, `SESSAO_SEGREDO` e a própria
  `SEGREDOS_CHAVE` ficam só nas variáveis da Vercel — o cofre recusa gravá-las.

| Rota | Para quê |
| --- | --- |
| `POST /api/registrar` · `POST /api/login` · `POST /api/sair` | conta e sessão |
| `GET /api/sessao` | quem está logado (o front confere ao abrir) |
| `GET/POST/PATCH/DELETE /api/admin/usuarios` | controle de usuários |
| `GET/PUT/DELETE /api/admin/segredos` | cofre de chaves |
| `GET /api/placa/:placa` | consulta de placa (exige sessão) |

### Peso da primeira visita

- Pacote inicial: ~97 KB comprimidos (só a landing). Login, plataforma, visualizador e impressão são
  carregados por rota (`lazy` em `src/App.tsx`).
- A grade de montadoras sai de `catalogo/index.json` (1 KB): o catálogo da seção só desce quando o
  mecânico escolhe a montadora ou começa a buscar. Passar o mouse já adianta o download.
- Fontes servidas pelo próprio site (`public/fonts`, geradas por `node scripts/baixar-fontes.mjs`);
  não há ida ao Google Fonts bloqueando a primeira pintura.
- `src/lib/acervo.ts` abre a conexão com o R2 (`preconnect`) assim que o app carrega.

## Consulta por placa

Campo de placa na barra superior → `/app/veiculo/:placa` mostra marca, modelo, ano, motor, procedência (importado/nacional), chassi e os sistemas
do catálogo compatíveis (regra em `sistemasDisponiveis()`, `src/pages/VeiculoPage.tsx`, ponto de extensão):
marca (com apelidos VW/GM…) + modelo + ano dentro da produção; por sistema, prefere os esquemas que citam a
cilindrada da placa e os que informam ano.

- Rota `GET /api/placa/:placa`: `api/placa/[placa].js` na Vercel e `server/vitePlacaPlugin.mjs` no dev.
  A lógica está em `server/placa/`, sem dependência do Vite:
  - `index.mjs` escolhe o provedor e guarda o cache; `veiculo.mjs` define o formato único do veículo;
  - `provedores/falcon.mjs` (Falcon Data Hub: `GET …/private/v1/vehicles/{placa}/search`; grátis 10 consultas/hora,
    Premium R$ 49,90/mês 1.000/hora) e `provedores/simulado.mjs` (placas de teste).
- Vale o primeiro provedor com credenciais (ver `.env.example`). Sem nenhuma: modo simulado.
- Resultados reais ficam em cache na memória da instância por 24 h (na Vercel a instância reinicia com frequência).
