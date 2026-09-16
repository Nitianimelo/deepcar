// Plugin do Vite: serve a pasta de publicação do acervo em /acervo/* no servidor de desenvolvimento.
// Simula o R2 localmente: mesmo layout de caminhos, mesmos arquivos. Em produção VITE_ACERVO_URL aponta
// para o domínio do bucket e este plugin não participa.
import fs from 'node:fs'
import path from 'node:path'

const TIPOS = { '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg' }

export function acervoPlugin(env = process.env) {
  const raiz = path.resolve(env.ACERVO_DIR || 'E:\\deepcar-publicacao')
  return {
    name: 'deepcar-acervo-local',
    configureServer(server) {
      server.middlewares.use('/acervo', (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next()
        let rel
        try { rel = decodeURIComponent((req.url || '/').split('?')[0]) } catch { res.statusCode = 400; return res.end() }
        const arq = path.join(raiz, rel)
        if (!arq.startsWith(raiz + path.sep)) { res.statusCode = 403; return res.end() }
        fs.stat(arq, (err, st) => {
          if (err || !st.isFile()) { res.statusCode = 404; return res.end() }
          res.setHeader('Content-Type', TIPOS[path.extname(arq).toLowerCase()] ?? 'application/octet-stream')
          res.setHeader('Content-Length', st.size)
          // imagens não mudam de conteúdo sem mudar de nome de pasta; o catálogo sim
          res.setHeader('Cache-Control', arq.endsWith('.png') ? 'public, max-age=86400' : 'no-cache')
          if (req.method === 'HEAD') return res.end()
          fs.createReadStream(arq).pipe(res)
        })
      })
    },
  }
}
