// Classes dos cartões claros de plano (landing e aba Plano da conta). Arquivo à parte para o PlanosLanding.tsx
// exportar só componentes (fast refresh do Vite).

/** Botão do cartão claro: cheio em azul no plano em destaque, contornado no outro. */
export const classeBotaoClaro = (cheio: boolean) =>
  `inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-escuro/50 focus-visible:ring-offset-2 ${
    cheio ? 'bg-azul-escuro text-white hover:bg-azul-escuro-hi' : 'border border-tinta-1/15 bg-papel-card text-tinta-1 hover:bg-papel'
  }`
