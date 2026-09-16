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
| `FALCON_TOKEN` | consulta de placa real; sem ele a rota responde em modo simulado |

3. As rotas do React Router dependem do rewrite em `vercel.json` (tudo que não é `/api` cai no `index.html`).

O acervo **não** vai para a Vercel: fica no R2 (`https://<bucket>.r2.dev` ou domínio próprio) e é enviado
por `E:\ferramentas\rclone\Enviar-Acervo-R2.ps1`. Os JSON sobem compactados com `Content-Encoding: gzip`
(o catálogo de injeção leve cai de 1,16 MB para 107 KB); as imagens vão com cache de um ano.

### Peso da primeira visita

- Pacote inicial: ~97 KB comprimidos (só a landing). Login, plataforma, visualizador e impressão são
  carregados por rota (`lazy` em `src/App.tsx`).
- A grade de montadoras sai de `catalogo/index.json` (1 KB): o catálogo da seção só desce quando o
  mecânico escolhe a montadora ou começa a buscar. Passar o mouse já adianta o download.
- Fontes servidas pelo próprio site (`public/fonts`, geradas por `node scripts/baixar-fontes.mjs`);
  não há ida ao Google Fonts bloqueando a primeira pintura.
- `src/lib/acervo.ts` abre a conexão com o R2 (`preconnect`) assim que o app carrega.

## Consulta por placa

Campo de placa na barra superior → `/app/veiculo/:placa` mostra marca, modelo, ano, motor e os sistemas
do catálogo compatíveis (regra em `sistemasDisponiveis()`, `src/pages/VeiculoPage.tsx`, ponto de extensão):
marca (com apelidos VW/GM…) + modelo + ano dentro da produção; por sistema, prefere os esquemas que citam a
cilindrada da placa e os que informam ano.

- Rota `GET /api/placa/:placa` servida pelo plugin `server/vitePlacaPlugin.mjs` (dev). A lógica está em
  `server/placa.mjs`, sem dependência do Vite, para mover a um backend real.
- Provedores (escolhidos por variáveis do `.env`, ver `.env.example`): Falcon Data Hub (plano grátis = 10 consultas/hora;
  Premium R$ 49,90/mês = 1.000/hora), Consultar Placa (R$ 0,31/consulta) ou modo simulado (sem chave).
- Resultados reais ficam em cache na memória do servidor por 24 h, então repetir a mesma placa não gasta cota.
