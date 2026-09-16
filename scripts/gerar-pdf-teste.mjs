// Gera o PDF de impressão de uma rota com o Edge headless (mesmo motor do Chrome) e salva páginas em PNG para conferência.
//   node scripts/gerar-pdf-teste.mjs <url> <saida.pdf> [--acao=<js a executar antes de imprimir>]
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const flags = Object.fromEntries(process.argv.filter((a) => a.startsWith('--')).map((a) => { const i = a.indexOf('='); return [a.slice(2, i), a.slice(i + 1)] }))
const [url, saida] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const EDGE = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find((p) => fs.existsSync(p))
const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-pdf-'))
const edge = spawn(EDGE, ['--headless=new', '--remote-debugging-port=9335', `--user-data-dir=${perfil}`, '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let alvo
for (let i = 0; i < 40 && !alvo; i++) { await sleep(250); try { alvo = (await (await fetch('http://127.0.0.1:9335/json')).json()).find((t) => t.type === 'page') } catch { /* */ } }
const ws = new WebSocket(alvo.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let seq = 0; const pend = new Map()
ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const cdp = (method, params = {}) => new Promise((r) => { const id = ++seq; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })) })

await cdp('Page.enable')
const origem = new URL(url).origin
await cdp('Page.navigate', { url: origem + '/login' }); await sleep(1500)
await cdp('Runtime.evaluate', { expression: `localStorage.setItem('deepcar.session', JSON.stringify({nome:'Teste',email:'teste@oficina.com',oficina:'Oficina Central',plano:'Profissional'}))` })
await cdp('Page.navigate', { url }); await sleep(3500)
if (flags.acao) { await cdp('Runtime.evaluate', { expression: flags.acao, awaitPromise: true }); }
// espera todas as imagens do documento carregarem (inclusive as preguiçosas forçadas)
await cdp('Runtime.evaluate', {
  expression: `Promise.all([...document.images].map(i => { i.loading = 'eager'; return i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r }) })).then(() => new Promise(r => setTimeout(r, 800)))`,
  awaitPromise: true,
})
const pdf = await cdp('Page.printToPDF', { preferCSSPageSize: true, printBackground: true })
if (!pdf.result) { console.log('falhou', JSON.stringify(pdf).slice(0, 400)); process.exit(1) }
fs.writeFileSync(saida, Buffer.from(pdf.result.data, 'base64'))
console.log('PDF salvo:', saida, Math.round(fs.statSync(saida).size / 1024), 'KB')
ws.close(); edge.kill()
