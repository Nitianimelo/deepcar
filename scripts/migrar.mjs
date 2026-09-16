// Aplica os arquivos de db/*.sql no banco, em ordem.
//   node scripts/migrar.mjs
// Lê DATABASE_URL do ambiente ou de um .env na raiz (que fica fora do Git).
// Pode rodar de novo: o esquema é todo "if not exists".
import fs from 'node:fs'
import path from 'node:path'
import { neon } from '@neondatabase/serverless'

function carregarEnv() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const arq = path.join(process.cwd(), '.env')
  if (fs.existsSync(arq)) {
    for (const linha of fs.readFileSync(arq, 'utf8').split(/\r?\n/)) {
      const m = linha.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/)
      if (m) process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g, '')
    }
  }
  return process.env.DATABASE_URL
}

const url = carregarEnv()
if (!url) {
  console.error('DATABASE_URL não encontrada. Ponha no .env da raiz (veja .env.example).')
  process.exit(1)
}

const sql = neon(url)
const pasta = path.join(process.cwd(), 'db')
const arquivos = fs.readdirSync(pasta).filter((f) => f.endsWith('.sql')).sort()

for (const arq of arquivos) {
  const conteudo = fs.readFileSync(path.join(pasta, arq), 'utf8')
  process.stdout.write(`${arq} … `)
  try {
    // o driver HTTP aceita um comando por vez; o arquivo é dividido nos ";" de fim de linha,
    // preservando os corpos de função delimitados por $$
    for (const comando of dividir(conteudo)) await sql.query(comando)
    console.log('ok')
  } catch (err) {
    console.log('falhou')
    console.error(`  ${err.message}`)
    process.exit(1)
  }
}

console.log(`\n${arquivos.length} arquivo(s) aplicado(s).`)

function dividir(sqlTexto) {
  const comandos = []
  let atual = ''
  let dentroDeCorpo = false
  for (const linha of sqlTexto.split(/\r?\n/)) {
    if (/\$\$/.test(linha)) dentroDeCorpo = (linha.match(/\$\$/g).length % 2 === 1) ? !dentroDeCorpo : dentroDeCorpo
    atual += linha + '\n'
    if (!dentroDeCorpo && /;\s*(--.*)?$/.test(linha)) {
      const limpo = atual.trim()
      // só descarta o trecho se ele for *só* comentário: um comando quase sempre
      // vem precedido do comentário que o explica, e testar o começo o perdia calado
      if (limpo.split('\n').some((l) => l.trim() && !l.trim().startsWith('--'))) comandos.push(limpo)
      atual = ''
    }
  }
  if (atual.trim()) comandos.push(atual.trim())
  return comandos
}
