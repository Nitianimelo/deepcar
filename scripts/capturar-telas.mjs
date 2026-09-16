// Captura telas do front local com o Edge headless via DevTools Protocol (sem dependências).
//   node scripts/capturar-telas.mjs <saida> <url1> [url2 ...]   (largura via --w=1440 --h=900)
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const flags = Object.fromEntries(process.argv.filter((a) => a.startsWith('--')).map((a) => { const i = a.indexOf('='); return [a.slice(2, i), a.slice(i + 1)] }))
const [saida, ...urls] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const W = +(flags.w ?? 1440), H = +(flags.h ?? 900), ROLAR = +(flags.rolar ?? 0), ESPERA = +(flags.espera ?? 2500)
const EDGE = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find((p) => fs.existsSync(p))
fs.mkdirSync(saida, { recursive: true })

const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-shot-'))
const edge = spawn(EDGE, ['--headless=new', '--remote-debugging-port=9333', `--user-data-dir=${perfil}`, `--window-size=${W},${H}`, '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let alvo
for (let i = 0; i < 40 && !alvo; i++) {
  await sleep(250)
  try { alvo = (await (await fetch('http://127.0.0.1:9333/json')).json()).find((t) => t.type === 'page') } catch { /* ainda subindo */ }
}
const ws = new WebSocket(alvo.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let seq = 0
const pend = new Map()
ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const cdp = (method, params = {}) => new Promise((r) => { const id = ++seq; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })) })

await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 700 })
await cdp('Page.enable')
// sessão de teste: grava no localStorage antes de abrir as rotas protegidas (--sem-sessao para testar o login de verdade)
const origem = new URL(urls[0]).origin
if (!('sem-sessao' in flags)) {
  await cdp('Page.navigate', { url: origem + '/login' })
  await sleep(1500)
  await cdp('Runtime.evaluate', { expression: `localStorage.setItem('deepcar.session', JSON.stringify({nome:'Teste',email:'teste@oficina.com',oficina:'Oficina Central',plano:'Profissional'}))` })
}

for (const [i, url] of urls.entries()) {
  await cdp('Page.navigate', { url })
  await sleep(ESPERA)
  if (ROLAR) {
    await cdp('Runtime.evaluate', { expression: `(document.querySelector('main')||document.scrollingElement).scrollTop += ${ROLAR}` })
    await sleep(1500)
  }
  // --digitar="seletor=valor;seletor=valor": preenche campos controlados pelo React
  for (const par of (flags.digitar ?? '').split(';').filter(Boolean)) {
    const i = par.lastIndexOf('=')
    const [sel, val] = [par.slice(0, i), par.slice(i + 1)]
    await cdp('Runtime.evaluate', {
      expression: `(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return;
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(val)});
        el.dispatchEvent(new Event('input', { bubbles: true })) })()`,
    })
    await sleep(150)
  }
  // --clicar="seletor1;seletor2": clica em sequência (ex.: botões pelo aria-label)
  for (const sel of (flags.clicar ?? '').split(';').filter(Boolean)) {
    await cdp('Runtime.evaluate', { expression: `document.querySelector(${JSON.stringify(sel)})?.click()` })
    await sleep(1200)
  }
  // --hover="seletor": para o mouse sobre o elemento (para fotografar dicas)
  if (flags.hover) {
    const r = await cdp('Runtime.evaluate', {
      expression: `(() => { const b = document.querySelector(${JSON.stringify(flags.hover)})?.getBoundingClientRect(); return b ? [b.left + b.width / 2, b.top + b.height / 2] : null })()`,
      returnByValue: true,
    })
    const p = r.result?.result?.value
    if (p) {
      await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p[0] - 30, y: p[1] + 30 })
      await sleep(100)
      await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p[0], y: p[1] })
      await sleep(900)
    } else console.log('hover: elemento não encontrado', flags.hover)
  }
  const erros = await cdp('Runtime.evaluate', { expression: `document.body.innerText.slice(0,160).replace(/\\n/g,' | ')`, returnByValue: true })
  const shot = await cdp('Page.captureScreenshot', { format: 'png' })
  const arq = path.join(saida, `${String(i + 1).padStart(2, '0')}-${W}.png`)
  fs.writeFileSync(arq, Buffer.from(shot.result.data, 'base64'))
  console.log(arq, '→', erros.result?.result?.value)
}
ws.close()
edge.kill()
