// Gera o Deepcar.exe (Node SEA) e monta a pasta autoexecutável completa.
//
//   node scripts/empacotar-exe.mjs [--destino E:\deepcar-autoexecutavel] [--acervo E:\deepcar-publicacao] [--sem-acervo]
//
// Resultado:
//   <destino>\Deepcar.exe     servidor + site embutidos (não precisa de Node instalado)
//   <destino>\config.json     porta, usuários (padrão nini / 1234), token do Falcon Data Hub
//   <destino>\acervo\         catálogo, esquemas e imagens (HARDLINKS: no mesmo disco não ocupa espaço extra)
//   <destino>\LEIA-ME.txt
//
// Ferramentas: postject e rcedit em E:\ferramentas\empacotar (npm install postject rcedit).
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawn, spawnSync } from 'node:child_process'
import { build } from 'rolldown'

const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => (a.startsWith('--') ? [a.slice(2), all[i + 1]?.startsWith('--') ? true : all[i + 1] ?? true] : null)).filter(Boolean))
const RAIZ = path.resolve(import.meta.dirname, '..')
const DESTINO = path.resolve(args.destino ?? 'E:\\deepcar-autoexecutavel')
const ACERVO = path.resolve(args.acervo ?? 'E:\\deepcar-publicacao')
const TOOLS = 'E:\\ferramentas\\empacotar\\node_modules'
const TMP = path.join(os.tmpdir(), 'deepcar-build-exe') // fora do projeto: o watcher do Vite não enxerga
const passo = (t) => console.log(`\n▸ ${t}`)
const rodar = (cmd, opts = {}) => {
  const r = spawnSync(cmd, { shell: true, stdio: 'inherit', cwd: RAIZ, ...opts })
  if (r.status !== 0) throw new Error(`falhou: ${cmd}`)
}

fs.rmSync(TMP, { recursive: true, force: true })
fs.mkdirSync(TMP, { recursive: true })
fs.mkdirSync(DESTINO, { recursive: true })

/* 1. site */
passo('Compilando o site (tsc + vite build)')
rodar('npx tsc -b && npx vite build')

/* 2. servidor em um arquivo CommonJS */
passo('Empacotando o servidor')
await build({
  input: path.join(RAIZ, 'server', 'app-local.mjs'),
  platform: 'node',
  logLevel: 'warn',
  output: { file: path.join(TMP, 'servidor.cjs'), format: 'cjs', codeSplitting: false },
})

/* 3. ícone .ico gerado a partir da marca (quadrado azul-marinho com o "D" branco) */
passo('Gerando o ícone')
await gerarIcone(path.join(RAIZ, 'public', 'brand', 'mark-light.png'), path.join(TMP, 'deepcar.ico'))

/* 4. blob SEA com o site embutido */
passo('Criando o executável')
const assets = {}
const listar = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? listar(path.join(dir, e.name)) : [path.join(dir, e.name)]))
for (const arq of listar(path.join(RAIZ, 'dist'))) assets[path.relative(RAIZ, arq).replace(/\\/g, '/')] = arq
fs.writeFileSync(path.join(TMP, 'sea-config.json'), JSON.stringify({
  main: path.join(TMP, 'servidor.cjs'),
  output: path.join(TMP, 'sea-prep.blob'),
  disableExperimentalSEAWarning: true,
  useCodeCache: false,
  useSnapshot: false,
  assets,
}, null, 2))
rodar(`"${process.execPath}" --experimental-sea-config "${path.join(TMP, 'sea-config.json')}"`)

const exe = path.join(TMP, 'Deepcar.exe')
fs.copyFileSync(process.execPath, exe)
rodar(`"${path.join(TOOLS, 'rcedit', 'bin', 'rcedit-x64.exe')}" "${exe}" --set-icon "${path.join(TMP, 'deepcar.ico')}" --set-version-string "ProductName" "Deepcar" --set-version-string "FileDescription" "Deepcar - Esquemas elétricos automotivos" --set-version-string "CompanyName" "Grupo Arcco" --set-version-string "LegalCopyright" "© ${new Date().getFullYear()} Deepcar" --set-version-string "OriginalFilename" "Deepcar.exe" --set-version-string "InternalName" "Deepcar" --set-file-version "1.0.0" --set-product-version "1.0.0"`)
rodar(`"${process.execPath}" "${path.join(TOOLS, 'postject', 'dist', 'cli.js')}" "${exe}" NODE_SEA_BLOB "${path.join(TMP, 'sea-prep.blob')}" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 --overwrite`)

/* 5. pasta final */
passo(`Montando ${DESTINO}`)
fs.copyFileSync(exe, path.join(DESTINO, 'Deepcar.exe'))
const cfg = path.join(DESTINO, 'config.json')
if (!fs.existsSync(cfg)) {
  fs.writeFileSync(cfg, JSON.stringify({
    porta: 5180,
    abrirNavegador: true,
    acervo: 'acervo',
    usuarios: [{ usuario: 'nini', senha: '1234', nome: 'Nini', oficina: 'Minha oficina', plano: 'Profissional' }],
    falconToken: '',
  }, null, 2))
}
fs.writeFileSync(path.join(DESTINO, 'LEIA-ME.txt'), '﻿' + leiame().replace(/\n/g, '\r\n'), 'utf8')

if (!args['sem-acervo']) {
  passo(`Espelhando o acervo com hardlinks (${ACERVO} → ${path.join(DESTINO, 'acervo')})`)
  const r = espelhar(ACERVO, path.join(DESTINO, 'acervo'))
  console.log(`  ${r.novos} arquivos ligados, ${r.iguais} já estavam, ${r.copiados} copiados (disco diferente)`)
}

fs.rmSync(TMP, { recursive: true, force: true })
passo('Pronto')
console.log(`  ${path.join(DESTINO, 'Deepcar.exe')}  (${(fs.statSync(path.join(DESTINO, 'Deepcar.exe')).size / 1048576).toFixed(0)} MB)`)

/* ── auxiliares ───────────────────────────────────────────────────── */

function espelhar(origem, destino) {
  let novos = 0, iguais = 0, copiados = 0
  const andar = (o, d) => {
    fs.mkdirSync(d, { recursive: true })
    for (const e of fs.readdirSync(o, { withFileTypes: true })) {
      const src = path.join(o, e.name), dst = path.join(d, e.name)
      if (e.isDirectory()) { andar(src, dst); continue }
      if (!e.isFile() || e.name === 'exportacao-problemas.txt') continue
      const s = fs.statSync(src)
      try {
        const t = fs.statSync(dst)
        if (t.ino === s.ino && t.size === s.size) { iguais++; continue }
        fs.unlinkSync(dst)
      } catch { /* não existe */ }
      try { fs.linkSync(src, dst); novos++ } catch { fs.copyFileSync(src, dst); copiados++ }
    }
  }
  andar(origem, destino)
  return { novos, iguais, copiados }
}

async function gerarIcone(markPng, saidaIco) {
  const EDGE = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find((p) => fs.existsSync(p))
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-ico-'))
  const edge = spawn(EDGE, ['--headless=new', '--remote-debugging-port=9337', `--user-data-dir=${perfil}`, 'about:blank'], { stdio: 'ignore' })
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  let alvo
  for (let i = 0; i < 40 && !alvo; i++) { await sleep(250); try { alvo = (await (await fetch('http://127.0.0.1:9337/json')).json()).find((t) => t.type === 'page') } catch { /* */ } }
  const ws = new WebSocket(alvo.webSocketDebuggerUrl)
  await new Promise((r) => ws.addEventListener('open', r, { once: true }))
  let seq = 0; const pend = new Map()
  ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
  const cdp = (method, params = {}) => new Promise((r) => { const id = ++seq; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })) })
  const dataUrl = `data:image/png;base64,${fs.readFileSync(markPng).toString('base64')}`
  const r = await cdp('Runtime.evaluate', {
    awaitPromise: true, returnByValue: true,
    expression: `(async () => {
      const img = new Image(); img.src = ${JSON.stringify(dataUrl)}; await img.decode();
      const out = [];
      for (const s of [256, 48, 32, 24, 16]) {
        const c = document.createElement('canvas'); c.width = c.height = s; const g = c.getContext('2d');
        const r = s * 0.22; g.fillStyle = '#0e3a76';
        g.beginPath(); g.moveTo(r, 0); g.arcTo(s, 0, s, s, r); g.arcTo(s, s, 0, s, r); g.arcTo(0, s, 0, 0, r); g.arcTo(0, 0, s, 0, r); g.closePath(); g.fill();
        const pad = s * (s <= 24 ? 0.1 : 0.16), w = s - pad * 2, h = w * img.naturalHeight / img.naturalWidth;
        g.imageSmoothingQuality = 'high'; g.drawImage(img, pad, (s - h) / 2, w, h);
        out.push([s, c.toDataURL('image/png').split(',')[1]]);
      }
      return out;
    })()`,
  })
  ws.close(); edge.kill()
  const pngs = r.result.result.value.map(([s, b64]) => [s, Buffer.from(b64, 'base64')])
  // ICO com imagens PNG embutidas (aceito pelo Windows Vista em diante)
  const cab = Buffer.alloc(6 + 16 * pngs.length)
  cab.writeUInt16LE(0, 0); cab.writeUInt16LE(1, 2); cab.writeUInt16LE(pngs.length, 4)
  let offset = cab.length
  pngs.forEach(([s, buf], i) => {
    const o = 6 + i * 16
    cab.writeUInt8(s >= 256 ? 0 : s, o); cab.writeUInt8(s >= 256 ? 0 : s, o + 1)
    cab.writeUInt8(0, o + 2); cab.writeUInt8(0, o + 3)
    cab.writeUInt16LE(1, o + 4); cab.writeUInt16LE(32, o + 6)
    cab.writeUInt32LE(buf.length, o + 8); cab.writeUInt32LE(offset, o + 12)
    offset += buf.length
  })
  fs.writeFileSync(saidaIco, Buffer.concat([cab, ...pngs.map(([, b]) => b)]))
}

function leiame() {
  return `DEEPCAR · ESQUEMAS ELÉTRICOS AUTOMOTIVOS
========================================

COMO ABRIR
  Dê dois cliques em Deepcar.exe.
  Uma janela preta abre (é o servidor) e o navegador abre sozinho no Deepcar.
  Mantenha a janela preta aberta enquanto usa. Para encerrar, feche a janela.

LOGIN
  Usuário: nini
  Senha:   1234

  Para trocar a senha ou criar outros usuários, edite o arquivo config.json
  (com o Deepcar fechado) na lista "usuarios".

CELULAR / TABLET
  O Deepcar atende só este computador (endereço http://localhost:5180).

CONSULTA POR PLACA
  Sem configuração, funciona em modo de demonstração com as placas:
  ABC1D23, FIA1T23, HON2C24, BRA2E19, AAA0000.
  Para consultar placas reais, coloque o token do Falcon Data Hub em
  "falconToken" no config.json.

PASTA "acervo"
  Contém o catálogo e as imagens dos esquemas. Não apague nem mova.
  Neste disco (E:) os arquivos são ligações para o acervo original e não
  ocupam espaço extra. Copiar a pasta para outro disco copia o acervo
  inteiro (cerca de 60 GB).

PROBLEMAS
  - Se a porta 5180 estiver ocupada, o Deepcar usa a próxima livre;
    o endereço certo aparece na janela preta.
  - Se o navegador não abrir sozinho, abra http://localhost:5180 à mão.
`
}
