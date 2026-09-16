import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { placaApiPlugin } from './server/vitePlacaPlugin.mjs'
import { acervoPlugin } from './server/viteAcervoPlugin.mjs'

export default defineConfig(({ mode }) => {
  // carrega TODAS as variáveis do .env (prefixo vazio) só para o lado do servidor;
  // nada disso vai para o bundle do navegador.
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), placaApiPlugin(env), acervoPlugin(env)],
    // o empacotamento do Deepcar.exe escreve binários grandes; o watcher não deve tocar neles
    server: { watch: { ignored: ['**/build-exe/**', '**/dist/**'] } },
  }
})
