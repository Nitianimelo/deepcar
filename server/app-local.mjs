// Servidor do Deepcar.exe: site compilado + acervo + login + consulta de placa, tudo na máquina local.
//
// Estrutura esperada ao lado do executável:
//   Deepcar.exe
//   config.json   (criado na primeira execução: porta, pasta do acervo, usuários)
//   acervo\       (catalogo, esquemas, img — mesmo layout do R2)
//
// O site (dist/) vai embutido no executável como "assets" do Node SEA. Rodando fora do executável
// (node server/app-local.mjs), lê de ./dist.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { exec } from 'node:child_process'
import sea from 'node:sea'
import { consultarPlaca } from './placa.mjs'
import { autenticar, lerJson, USUARIOS_PADRAO } from './login.mjs'

const noExecutavel = sea.isSea()

const PASTA = noExecutavel ? path.dirname(process.execPath) : process.cwd()
const ARQ_CONFIG = path.join(PASTA, 'config.json')

const CONFIG_PADRAO = {
  porta: 5180,
  abrirNavegador: true,
  acervo: 'acervo',
  usuarios: USUARIOS_PADRAO,
  falconToken: '',
}

function carregarConfig() {
  if (!fs.existsSync(ARQ_CONFIG)) fs.writeFileSync(ARQ_CONFIG, JSON.stringify(CONFIG_PADRAO, null, 2))
  try {
    return { ...CONFIG_PADRAO, ...JSON.parse(fs.readFileSync(ARQ_CONFIG, 'utf8').replace(/^﻿/, '')) }
  } catch (e) {
    console.log(`  ! config.json inválido (${e.message}); usando padrão.`)
    return CONFIG_PADRAO
  }
}

const cfg = carregarConfig()
const ACERVO = path.resolve(PASTA, cfg.acervo)

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
}
const tipo = (p) => TIPOS[path.extname(p).toLowerCase()] ?? 'application/octet-stream'

/* ── site: assets embutidos ou pasta dist ─────────────────────────── */
const DIST = path.resolve(process.env.DEEPCAR_DIST || 'dist') // fora do executável: rodar a partir da raiz do projeto
function lerSite(rel) {
  const chave = `dist/${rel}`.replace(/\\/g, '/')
  if (noExecutavel) {
    try { return Buffer.from(sea.getAsset(chave)) } catch { return null }
  }
  const arq = path.join(DIST, rel)
  if (!arq.startsWith(DIST) || !fs.existsSync(arq) || !fs.statSync(arq).isFile()) return null
  return fs.readFileSync(arq)
}

/* ── servidor ─────────────────────────────────────────────────────── */
const json = (res, status, corpo) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(corpo))
}

const servidor = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://local')
    let caminho
    try { caminho = decodeURIComponent(url.pathname) } catch { res.writeHead(400); return res.end() }

    if (caminho === '/api/login' && req.method === 'POST') {
      try {
        const { usuario, senha } = await lerJson(req)
        return json(res, 200, autenticar(usuario, senha, cfg.usuarios?.length ? cfg.usuarios : USUARIOS_PADRAO))
      } catch (e) { return json(res, e.status ?? 500, { erro: e.message }) }
    }

    const placa = caminho.match(/^\/api\/placa\/([^/]+)$/)
    if (placa && req.method === 'GET') {
      try { return json(res, 200, await consultarPlaca(placa[1], { ...process.env, FALCON_TOKEN: cfg.falconToken || process.env.FALCON_TOKEN })) }
      catch (e) { return json(res, e.status ?? 500, { erro: e.message }) }
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end() }

    // acervo: arquivos grandes, servidos do disco em streaming
    if (caminho.startsWith('/acervo/')) {
      const arq = path.join(ACERVO, caminho.slice('/acervo/'.length))
      if (!arq.startsWith(ACERVO + path.sep)) { res.writeHead(403); return res.end() }
      fs.stat(arq, (err, st) => {
        if (err || !st.isFile()) { res.writeHead(404); return res.end() }
        res.writeHead(200, {
          'Content-Type': tipo(arq),
          'Content-Length': st.size,
          'Cache-Control': arq.endsWith('.png') ? 'public, max-age=604800' : 'no-cache',
        })
        if (req.method === 'HEAD') return res.end()
        fs.createReadStream(arq).pipe(res)
      })
      return
    }

    // site: arquivo existente ou index.html (rotas do React Router)
    const rel = caminho.replace(/^\/+/, '') || 'index.html'
    let corpo = lerSite(rel)
    let arquivo = rel
    if (!corpo) { corpo = lerSite('index.html'); arquivo = 'index.html' }
    if (!corpo) { res.writeHead(500); return res.end('Site não encontrado no executável.') }
    res.writeHead(200, {
      'Content-Type': tipo(arquivo),
      'Content-Length': corpo.length,
      'Cache-Control': arquivo.startsWith('assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    })
    res.end(req.method === 'HEAD' ? undefined : corpo)
  } catch (e) {
    console.log('  ! erro:', e.message)
    if (!res.headersSent) res.writeHead(500)
    res.end()
  }
})

function escutar(porta, tentativas = 20) {
  return new Promise((resolve, reject) => {
    servidor.once('error', (e) => {
      if (e.code === 'EADDRINUSE' && tentativas > 0) resolve(escutar(porta + 1, tentativas - 1))
      else reject(e)
    })
    servidor.listen(porta, '127.0.0.1', () => resolve(porta))
  })
}

/* ── início ───────────────────────────────────────────────────────── */
async function iniciar() {
process.title = 'Deepcar'
const temAcervo = fs.existsSync(path.join(ACERVO, 'catalogo', 'index.json'))
const porta = await escutar(Number(cfg.porta) || 5180)
const endereco = `http://localhost:${porta}`

console.log('')
console.log('  ██████╗ ███████╗███████╗██████╗  ██████╗ █████╗ ██████╗ ')
console.log('  ██╔══██╗██╔════╝██╔════╝██╔══██╗██╔════╝██╔══██╗██╔══██╗')
console.log('  ██║  ██║█████╗  █████╗  ██████╔╝██║     ███████║██████╔╝')
console.log('  ██║  ██║██╔══╝  ██╔══╝  ██╔═══╝ ██║     ██╔══██║██╔══██╗')
console.log('  ██████╔╝███████╗███████╗██║     ╚██████╗██║  ██║██║  ██║')
console.log('  ╚═════╝ ╚══════╝╚══════╝╚═╝      ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝')
console.log('')
console.log(`  Deepcar aberto em  ${endereco}`)
console.log(`  Acervo:            ${ACERVO}${temAcervo ? '' : '   (NÃO ENCONTRADO: os esquemas não vão aparecer)'}`)
console.log(`  Configuração:      ${ARQ_CONFIG}`)
console.log('')
console.log('  Mantenha esta janela aberta enquanto usa o Deepcar. Para encerrar, feche a janela.')
console.log('')

if (cfg.abrirNavegador !== false) exec(`start "" "${endereco}"`, { windowsHide: true })
}

iniciar().catch((e) => {
  console.log('')
  console.log(`  Não foi possível iniciar o Deepcar: ${e.message}`)
  console.log('  Pressione Enter para fechar.')
  process.stdin.resume()
  process.stdin.once('data', () => process.exit(1))
})
