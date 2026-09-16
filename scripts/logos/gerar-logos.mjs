// Converte os logos de origem (SVG/PNG coloridos) em silhuetas monocromáticas uniformes para a interface.
//
//   node scripts/logos/gerar-logos.mjs <pasta com as fontes>
//
// Fontes: `fontes.json` (marca → arquivo + tratamento). Saída: public/marcas/<slug>.png (preto sobre transparente,
// margens cortadas, altura máx. 160 px) e src/data/marcas.json (slug, proporção). A interface usa a PNG como máscara
// CSS e pinta com a cor do tema, então todas as marcas ficam no mesmo estilo.
//
// Tratamentos:
//   "alfa"  — usa só o canal alfa (logos já monocromáticos, ex.: Simple Icons)
//   "tom"   — opacidade pela luminância normalizada: tons escuros opacos, claros/brancos somem (badges coloridos)
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const FONTES = path.resolve(process.argv[2] ?? '.')
const RAIZ = path.resolve(import.meta.dirname, '..', '..')
const SAIDA = path.join(RAIZ, 'public', 'marcas')
const cfg = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'fontes.json'), 'utf8'))
fs.mkdirSync(SAIDA, { recursive: true })

const EDGE = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find((p) => fs.existsSync(p))
const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-logos-'))
const edge = spawn(EDGE, ['--headless=new', '--remote-debugging-port=9334', `--user-data-dir=${perfil}`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let alvo
for (let i = 0; i < 40 && !alvo; i++) {
  await sleep(250)
  try { alvo = (await (await fetch('http://127.0.0.1:9334/json')).json()).find((t) => t.type === 'page') } catch { /* subindo */ }
}
const ws = new WebSocket(alvo.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let seq = 0
const pend = new Map()
ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const cdp = (method, params = {}) => new Promise((r) => { const id = ++seq; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })) })

// roda dentro do navegador: rasteriza, gera a máscara e corta as margens
const PROCESSAR = `async (dataUrl, modo, crop) => {
  const img = new Image(); img.src = dataUrl; await img.decode();
  let w = img.naturalWidth || 1024, h = img.naturalHeight || 1024;
  const esc = 1200 / Math.max(w, h); w = Math.round(w * esc); h = Math.round(h * esc);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0, w, h);
  if (crop) { const d = g.getImageData(Math.round(crop[0]*w), Math.round(crop[1]*h), Math.round(crop[2]*w), Math.round(crop[3]*h)); c.width = d.width; c.height = d.height; w = d.width; h = d.height; g.putImageData(d, 0, 0); }
  const px = g.getImageData(0, 0, w, h); const a = px.data;
  const lum = (i) => (0.2126 * a[i] + 0.7152 * a[i+1] + 0.0722 * a[i+2]) / 255;
  let minL = 1;
  if (modo === 'tom') for (let i = 0; i < a.length; i += 4) if (a[i+3] > 200) minL = Math.min(minL, lum(i));
  for (let i = 0; i < a.length; i += 4) {
    let al = a[i+3] / 255;
    if (modo === 'tom') {
      const t = (1 - lum(i)) / Math.max(0.2, 1 - minL);          // 1 = tom mais escuro do logo
      al *= Math.min(1, Math.max(0, (t - 0.12) / 0.5));          // brancos e quase brancos somem
    }
    a[i] = a[i+1] = a[i+2] = 0; a[i+3] = Math.round(al * 255);
  }
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a[(y*w + x)*4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  g.putImageData(px, 0, 0);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const escOut = Math.min(160 / ch, 480 / cw, 1);
  const o = document.createElement('canvas'); o.width = Math.round(cw * escOut); o.height = Math.round(ch * escOut);
  const og = o.getContext('2d'); og.imageSmoothingQuality = 'high'; og.drawImage(c, x0, y0, cw, ch, 0, 0, o.width, o.height);
  return { png: o.toDataURL('image/png'), w: o.width, h: o.height };
}`

const logos = {}
for (const [marca, f] of Object.entries(cfg)) {
  if (f.alias) continue
  const slug = f.slug
  {
    const arq = path.join(FONTES, f.arquivo)
    let buf = fs.readFileSync(arq)
    const ext = path.extname(arq).toLowerCase()
    if (ext === '.svg') {
      // SVG sem width/height rasteriza em 300x150 no Chrome; força tamanho grande pelo viewBox
      let s = buf.toString('utf8')
      const vb = s.match(/viewBox="([\d.\s-]+)"/)
      if (vb) {
        const [, , vw, vh] = vb[1].trim().split(/\s+/).map(Number)
        const k = 1200 / Math.max(vw, vh)
        s = s.replace(/<svg\b([^>]*)>/, (m, attrs) => `<svg${attrs.replace(/\s(width|height)="[^"]*"/g, '')} width="${Math.round(vw * k)}" height="${Math.round(vh * k)}">`)
      }
      buf = Buffer.from(s)
    }
    const dataUrl = `data:${ext === '.svg' ? 'image/svg+xml' : 'image/png'};base64,${buf.toString('base64')}`
    const r = await cdp('Runtime.evaluate', {
      expression: `(${PROCESSAR})(${JSON.stringify(dataUrl)}, ${JSON.stringify(f.modo ?? 'alfa')}, ${JSON.stringify(f.crop ?? null)})`,
      awaitPromise: true, returnByValue: true,
    })
    const v = r.result?.result?.value
    if (!v) { console.log('FALHOU', marca, JSON.stringify(r.result?.exceptionDetails ?? r).slice(0, 300)); continue }
    fs.writeFileSync(path.join(SAIDA, `${slug}.png`), Buffer.from(v.png.split(',')[1], 'base64'))
    logos[marca] = { arquivo: `/marcas/${slug}.png`, proporcao: +(v.w / v.h).toFixed(3) }
    console.log(`${marca.padEnd(24)} ${slug}.png ${v.w}x${v.h}`)
  }
}
// marcas que usam o logo de outra (ex.: "Ford Caminhões" → "Ford")
for (const [marca, f] of Object.entries(cfg)) if (f.alias && logos[f.alias]) logos[marca] = logos[f.alias]

const final = Object.fromEntries(Object.entries(logos).sort((a, b) => a[0].localeCompare(b[0], 'pt-BR')))
fs.writeFileSync(path.join(RAIZ, 'src', 'data', 'marcas.json'), JSON.stringify(final, null, 2) + '\n')
console.log(`${Object.keys(final).length} marcas com logo → src/data/marcas.json`)
ws.close()
edge.kill()
