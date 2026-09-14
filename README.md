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
- Catálogo de exemplo em `src/data/esquemas.ts`. Trocar por API quando o backend existir.
- Menu lateral em `src/data/nav.ts` (rótulos, rotas e ícones).
- Tokens de design em `src/index.css` (`@theme`).
- Logos: `public/brand/` (`*-light.png` são versões geradas para fundo escuro).

## Consulta por placa

Campo de placa na barra superior → `/app/veiculo/:placa` mostra marca, modelo, ano, motor e os sistemas
do catálogo compatíveis (regra em `sistemasDisponiveis()`, `src/pages/VeiculoPage.tsx`, ponto de extensão).

- Rota `GET /api/placa/:placa` servida pelo plugin `server/vitePlacaPlugin.mjs` (dev). A lógica está em
  `server/placa.mjs`, sem dependência do Vite, para mover a um backend real.
- Provedores (escolhidos por variáveis do `.env`, ver `.env.example`): Falcon Data Hub (plano grátis = 10 consultas/hora;
  Premium R$ 49,90/mês = 1.000/hora), Consultar Placa (R$ 0,31/consulta) ou modo simulado (sem chave).
- Resultados reais ficam em cache na memória do servidor por 24 h, então repetir a mesma placa não gasta cota.
