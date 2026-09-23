// Depois do build, grava um HTML próprio para as páginas públicas além da home (dist/<rota>/index.html),
// com título, descrição, canônico e prévia certos. A Vercel serve o arquivo antes do rewrite do SPA, então
// o Google e o WhatsApp leem o cabeçalho da página certa sem rodar JavaScript. O app carrega igual.
import fs from 'node:fs'
import path from 'node:path'

const SITE = 'https://deepcar.app.br'

export const PAGINAS = [
  {
    rota: 'cadastro',
    titulo: 'Criar conta grátis · Deepcar',
    descricao: 'Crie sua conta no Deepcar e consulte esquemas elétricos de injeção, ABS, elétrica e câmbio de mais de 15 mil modelos. Grátis, sem cartão.',
    indexar: true,
  },
  {
    rota: 'login',
    titulo: 'Entrar · Deepcar',
    descricao: 'Acesse sua conta Deepcar: esquemas elétricos e diagramas automotivos com consulta pela placa.',
    indexar: false,
  },
]

const escapar = (t) => t.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

function trocar(html, p) {
  const url = `${SITE}/${p.rota}`
  const t = escapar(p.titulo), d = escapar(p.descricao)
  const regras = [
    [/<title>[^<]*<\/title>/, `<title>${t}</title>`],
    [/(<meta name="description" content=")[^"]*(")/, `$1${d}$2`],
    [/(<meta name="robots" content=")[^"]*(")/, `$1${p.indexar ? 'index, follow, max-image-preview:large' : 'noindex, follow'}$2`],
    [/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`],
    [/(<link rel="alternate" hreflang="pt-BR" href=")[^"]*(")/, `$1${url}$2`],
    [/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`],
    [/(<meta property="og:title" content=")[^"]*(")/, `$1${t}$2`],
    [/(<meta property="og:description" content=")[^"]*(")/, `$1${d}$2`],
    [/(<meta name="twitter:title" content=")[^"]*(")/, `$1${t}$2`],
    [/(<meta name="twitter:description" content=")[^"]*(")/, `$1${d}$2`],
  ]
  for (const [de, para] of regras) {
    if (!de.test(html)) throw new Error(`paginas-seo: não achei ${de} no index.html`)
    html = html.replace(de, para)
  }
  return html
}

export function paginasSeoPlugin() {
  let saida = 'dist'
  return {
    name: 'deepcar-paginas-seo',
    apply: 'build',
    configResolved(c) { saida = path.resolve(c.root, c.build.outDir) },
    closeBundle() {
      const base = fs.readFileSync(path.join(saida, 'index.html'), 'utf8')
      for (const p of PAGINAS) {
        fs.mkdirSync(path.join(saida, p.rota), { recursive: true })
        fs.writeFileSync(path.join(saida, p.rota, 'index.html'), trocar(base, p))
      }
    },
  }
}
