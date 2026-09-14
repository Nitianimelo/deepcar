// Plugin do Vite: expõe GET /api/placa/:placa no servidor de desenvolvimento.
// Mantém a chave da API fora do navegador. Em produção, mover a rota para o backend real.
import { consultarPlaca } from './placa.mjs'

export function placaApiPlugin(env = process.env) {
  return {
    name: 'deepcar-placa-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const m = req.url?.match(/^\/api\/placa\/([^/?]+)/)
        if (!m || req.method !== 'GET') return next()
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        try {
          const veiculo = await consultarPlaca(decodeURIComponent(m[1]), { ...process.env, ...env })
          res.statusCode = 200
          res.end(JSON.stringify(veiculo))
        } catch (err) {
          res.statusCode = err.status ?? 500
          res.end(JSON.stringify({ erro: err.message ?? 'Falha na consulta.' }))
        }
      })
    },
  }
}
