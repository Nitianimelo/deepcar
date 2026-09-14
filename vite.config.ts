import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { placaApiPlugin } from './server/vitePlacaPlugin.mjs'

export default defineConfig(({ mode }) => {
  // carrega TODAS as variáveis do .env (prefixo vazio) só para o lado do servidor;
  // nada disso vai para o bundle do navegador.
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), placaApiPlugin(env)],
  }
})
