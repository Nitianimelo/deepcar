// Exporta as páginas geradas pelo pipeline (paginas finais) para o formato publicado do Deepcar.
//
//   node scripts/exportar-acervo.mjs [--origem <paginas finais>] [--destino <pasta de publicação>]
//
// Saída (mesmo layout que vai para o R2):
//   catalogo/index.json            seções, totais e montadoras
//   catalogo/<secao>.json          uma linha por esquema (lista e busca)
//   esquemas/<secao>/<marca>/<slug>.json   dados do visualizador
//   img/<secao>/<marca>/<slug>/esquema-NN.png, minimapa.png   HARDLINKS para os PNGs originais
//
// Hardlink = segundo nome para o mesmo arquivo no mesmo disco: não ocupa espaço e não altera a matriz.
// Não publica PDF, caminho de origem nem nada interno do pipeline. Pode rodar de novo a qualquer momento:
// páginas incompletas (sem index.html) ficam de fora e entram na próxima execução.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
)
const ORIGEM = args.origem ?? 'E:\\Esquemas_Azul_Preto_20260908\\paginas finais'
const DESTINO = args.destino ?? 'E:\\deepcar-publicacao'

// pasta do acervo → chave de seção do front (src/data/nav.ts)
const SECOES = [
  { chave: 'injecao-leve', pasta: /^inje[çc][aã]o leve$/i },
  { chave: 'injecao-diesel', pasta: /^inje[çc][aã]o diesel$/i },
  { chave: 'abs', pasta: /^abs$/i },
  { chave: 'eletrica', pasta: /^eletrica leve$/i },
  { chave: 'cambio', pasta: /^cambio$/i },
]

const slug = (s) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x'

const decode = (s) =>
  s.replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim()

function lerPagina(pasta) {
  const html = fs.readFileSync(path.join(pasta, 'index.html'), 'utf8')
  const um = (re) => { const m = html.match(re); return m ? m[1] : null }

  const eyebrow = decode(um(/class="eyebrow">([\s\S]*?)<\/div>/) ?? '')
  const marca = eyebrow.split(' · ')[0] || null
  const modelo = decode(um(/<h1 id="title">([\s\S]*?)<\/h1>/) ?? '')
  const subtitulo = decode(um(/class="subtitle">([\s\S]*?)<\/p>/) ?? '')
  const specs = [...html.matchAll(/<div><dt>([\s\S]*?)<\/dt><dd>([\s\S]*?)<\/dd><\/div>/g)].map((m) => [decode(m[1]), decode(m[2])])

  const largura = +(um(/const DRAW_W = (\d+)/) ?? 0)
  const altura = +(um(/DRAW_H = (\d+)/) ?? 0)
  const secoesTxt = um(/const SECTIONS = (\[[\s\S]*?\]);\s*\n/)
  const secoes = secoesTxt ? JSON.parse(secoesTxt) : []
  const trechos = [...html.matchAll(/<img src="assets\/(esquema-\d+\.png)" width="(\d+)" height="(\d+)"/g)].map((m) => ({ arquivo: m[1], w: +m[2], h: +m[3] }))
  const mm = html.match(/<img src="assets\/minimapa\.png" width="(\d+)" height="(\d+)"/)
  const minimapa = mm ? { arquivo: 'minimapa.png', w: +mm[1], h: +mm[2] } : null

  return { marca, modelo, subtitulo, specs, largura, altura, secoes, trechos, minimapa }
}

// Assinatura barata do conjunto de imagens: tamanhos de todos os arquivos + hash do começo do primeiro e do minimapa.
// Páginas deduplicadas pelo pipeline (ex.: Bora e Golf AKL) têm cópias idênticas e passam a apontar para as mesmas imagens.
function assinatura(assets, arquivos) {
  const h = crypto.createHash('md5')
  for (const a of arquivos) h.update(`${a}:${fs.statSync(path.join(assets, a)).size};`)
  for (const a of [arquivos[0], 'minimapa.png']) {
    const fd = fs.openSync(path.join(assets, a), 'r')
    const buf = Buffer.alloc(65536)
    const n = fs.readSync(fd, buf, 0, buf.length, 0)
    fs.closeSync(fd)
    h.update(buf.subarray(0, n))
  }
  return h.digest('hex')
}

// ["09/1998 a 05/2005", "08/1999 a 2004"] → "1998 a 2005"; "em diante" mantém o aberto
function faixaProducao(valores) {
  const anos = valores.flatMap((v) => v.match(/\b(19|20)\d{2}\b/g) ?? []).map(Number)
  if (!anos.length) return null
  const aberto = valores.some((v) => /em diante/i.test(v))
  const ini = Math.min(...anos), fim = Math.max(...anos)
  return aberto ? `${ini} em diante` : ini === fim ? String(ini) : `${ini} a ${fim}`
}

function hardlink(src, dst) {
  try {
    const d = fs.statSync(dst)
    const s = fs.statSync(src)
    if (d.ino === s.ino && d.size === s.size) return false
    fs.unlinkSync(dst)
  } catch { /* não existe */ }
  fs.linkSync(src, dst)
  return true
}

const escreverJson = (arq, dados) => {
  fs.mkdirSync(path.dirname(arq), { recursive: true })
  fs.writeFileSync(arq, JSON.stringify(dados))
}

// ── varredura ──────────────────────────────────────────────────────────
const inicio = Date.now()
const porAssinatura = new Map() // assinatura → pasta publicada das imagens
const indice = { gerado: new Date().toISOString(), secoes: {} }
const problemas = []
let links = 0, reaproveitadas = 0, repetidas = 0

for (const acervo of fs.readdirSync(ORIGEM, { withFileTypes: true })) {
  if (!acervo.isDirectory()) continue
  const secao = SECOES.find((s) => s.pasta.test(acervo.name))
  if (!secao) { problemas.push(`acervo ignorado: ${acervo.name}`); continue }

  const catalogo = []
  const ids = new Set()
  const linhas = new Set()
  const marcas = new Map()

  for (const marcaDir of fs.readdirSync(path.join(ORIGEM, acervo.name), { withFileTypes: true })) {
    if (!marcaDir.isDirectory() || marcaDir.name.startsWith('.')) continue
    const marcaPasta = path.join(ORIGEM, acervo.name, marcaDir.name)

    for (const pag of fs.readdirSync(marcaPasta, { withFileTypes: true })) {
      if (!pag.isDirectory() || pag.name.startsWith('.')) continue // ex.: pasta temporária ".Q7_...tmp"
      const pasta = path.join(marcaPasta, pag.name)
      const assets = path.join(pasta, 'assets')
      if (!fs.existsSync(path.join(pasta, 'index.html'))) { problemas.push(`sem index.html: ${acervo.name}\\${marcaDir.name}\\${pag.name}`); continue }

      let p
      try { p = lerPagina(pasta) } catch (e) { problemas.push(`erro lendo ${pag.name}: ${e.message}`); continue }
      if (!p.trechos.length || !p.minimapa || !p.largura) { problemas.push(`página sem desenho: ${acervo.name}\\${marcaDir.name}\\${pag.name}`); continue }
      const faltando = [...p.trechos.map((t) => t.arquivo), 'minimapa.png'].filter((a) => !fs.existsSync(path.join(assets, a)))
      if (faltando.length) { problemas.push(`imagem ausente (${faltando.join(', ')}): ${pag.name}`); continue }

      const marcaNome = p.marca ?? marcaDir.name
      const marcaSlug = slug(marcaDir.name)
      let s = slug(pag.name), n = 2
      while (ids.has(`${marcaSlug}/${s}`)) s = `${slug(pag.name)}-${n++}`
      const id = `${secao.chave}/${marcaSlug}/${s}`
      ids.add(`${marcaSlug}/${s}`)

      // imagens: reaproveita se o conjunto idêntico já foi publicado
      const arquivos = p.trechos.map((t) => t.arquivo)
      const ass = assinatura(assets, arquivos)
      let imgDir = porAssinatura.get(ass)
      if (imgDir) reaproveitadas++
      else {
        imgDir = `img/${id}`
        porAssinatura.set(ass, imgDir)
        fs.mkdirSync(path.join(DESTINO, imgDir), { recursive: true })
        for (const a of [...arquivos, 'minimapa.png']) if (hardlink(path.join(assets, a), path.join(DESTINO, imgDir, a))) links++
      }

      // grupos deduplicados pelo pipeline geram a mesma página em cada PDF-membro (ex.: "Bora / Golf" nas pastas
      // do Bora e do Golf): mesma marca, título, especificações e desenho viram uma linha só no catálogo
      const chaveLinha = `${marcaNome}|${p.modelo}|${JSON.stringify(p.specs)}|${imgDir}`
      if (linhas.has(chaveLinha)) { repetidas++; continue }
      linhas.add(chaveLinha)

      const spec = (rotulo) => p.specs.find(([k]) => k.toLowerCase() === rotulo)?.[1] ?? null
      // grupos com vários modelos trazem "Bora · 1J2 — produção", "Golf · 9B1 — produção": vira uma faixa única
      const producao = spec('produção') ?? faixaProducao(p.specs.filter(([k]) => /produção$/i.test(k)).map(([, v]) => v))
      const componentes = p.secoes.flatMap(([, itens]) => itens).filter(([cid]) => cid !== 'inicio').length
      const gerado = fs.statSync(path.join(pasta, 'index.html')).mtime.toISOString().slice(0, 10)

      catalogo.push({
        id, secao: secao.chave, marca: marcaNome, modelo: p.modelo,
        motorizacao: spec('motorização'), codigoMotor: spec('código do motor'),
        gerenciamento: spec('gerenciamento'), producao, chassi: spec('chassi'),
        componentes, trechos: p.trechos.length, gerado,
      })
      marcas.set(marcaNome, (marcas.get(marcaNome) ?? 0) + 1)

      escreverJson(path.join(DESTINO, 'esquemas', `${id}.json`), {
        id, secao: secao.chave, marca: marcaNome, modelo: p.modelo, subtitulo: p.subtitulo, specs: p.specs,
        largura: p.largura, altura: p.altura, secoes: p.secoes, imagens: imgDir,
        trechos: p.trechos, minimapa: p.minimapa, gerado,
      })
    }
  }

  catalogo.sort((a, b) => a.marca.localeCompare(b.marca, 'pt-BR') || a.modelo.localeCompare(b.modelo, 'pt-BR', { numeric: true }))
  escreverJson(path.join(DESTINO, 'catalogo', `${secao.chave}.json`), catalogo)
  indice.secoes[secao.chave] = {
    total: catalogo.length,
    marcas: [...marcas].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR')).map(([nome, total]) => ({ nome, total })),
  }
  console.log(`${secao.chave.padEnd(15)} ${String(catalogo.length).padStart(5)} esquemas, ${marcas.size} montadoras`)
}

escreverJson(path.join(DESTINO, 'catalogo', 'index.json'), indice)
fs.writeFileSync(path.join(DESTINO, 'exportacao-problemas.txt'), problemas.join('\n'))
console.log(`hardlinks novos: ${links} · esquemas reaproveitando imagens idênticas: ${reaproveitadas} · linhas repetidas omitidas: ${repetidas}`)
console.log(`avisos: ${problemas.length} (ver ${path.join(DESTINO, 'exportacao-problemas.txt')})`)
console.log(`tempo: ${((Date.now() - inicio) / 1000).toFixed(0)} s`)
