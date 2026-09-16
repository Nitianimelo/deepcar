// Plugin do Vite: expõe GET /api/placa/:placa e POST /api/login no servidor de desenvolvimento.
// Mantém chaves e senhas fora do navegador. O Deepcar.exe usa os mesmos módulos (server/app-local.mjs).
import { consultarPlaca } from './placa/index.mjs'
import { autenticar, lerJson, usuariosDe } from './login.mjs'

export function placaApiPlugin(env = process.env) {
  return {
    name: 'deepcar-placa-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const json = (status, corpo) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(corpo))
        }

        if (req.url === '/api/login' && req.method === 'POST') {
          try {
            const { usuario, senha } = await lerJson(req)
            return json(200, autenticar(usuario, senha, usuariosDe({ ...process.env, ...env })))
          } catch (err) {
            return json(err.status ?? 500, { erro: err.message ?? 'Falha no login.' })
          }
        }

        const m = req.url?.match(/^\/api\/placa\/([^/?]+)/)
        if (!m || req.method !== 'GET') return next()
        try {
          const veiculo = await consultarPlaca(decodeURIComponent(m[1]), { ...process.env, ...env })
          json(200, veiculo)
        } catch (err) {
          json(err.status ?? 500, { erro: err.message ?? 'Falha na consulta.' })
        }
      })
    },
  }
}
