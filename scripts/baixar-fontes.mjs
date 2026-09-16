// Baixa as fontes do Google e grava em public/fonts, com as regras @font-face prontas.
// Rodar só quando mudar a família ou o peso:  node scripts/baixar-fontes.mjs
// A saída vai para o console; o bloco fica no topo de src/index.css.
import fs from 'node:fs'
import path from 'node:path'

const CSS = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap'
const SUBSETS = new Set(['latin', 'latin-ext']) // o resto (cirílico, grego, vietnamita) não é usado
const DESTINO = path.join(process.cwd(), 'public', 'fonts')
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

const css = await (await fetch(CSS, { headers: { 'User-Agent': UA } })).text()
fs.mkdirSync(DESTINO, { recursive: true })

const regras = []
for (const m of css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g)) {
  const [, subset, bloco] = m
  if (!SUBSETS.has(subset)) continue
  const familia = bloco.match(/font-family:\s*'([^']+)'/)[1]
  const peso = bloco.match(/font-weight:\s*(\d+)/)[1]
  const url = bloco.match(/src:\s*url\(([^)]+)\)/)[1]
  const unicode = bloco.match(/unicode-range:\s*([^;]+);/)[1]
  const nome = `${familia.toLowerCase().replace(/\s+/g, '-')}-${peso}-${subset}.woff2`
  const bytes = Buffer.from(await (await fetch(url)).arrayBuffer())
  fs.writeFileSync(path.join(DESTINO, nome), bytes)
  regras.push(
    `@font-face { font-family: '${familia}'; font-style: normal; font-weight: ${peso}; font-display: swap; ` +
      `src: url('/fonts/${nome}') format('woff2'); unicode-range: ${unicode}; }`,
  )
}

console.log(regras.join('\n'))
console.error(`\n${regras.length} arquivos em ${DESTINO}`)
