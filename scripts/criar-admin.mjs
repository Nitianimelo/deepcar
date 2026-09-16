// Cria (ou promove) o administrador direto no banco, sem passar pela web.
//   node scripts/criar-admin.mjs contato@oficina.com.br "senha forte" "Nome"
// Lê DATABASE_URL do ambiente ou do .env da raiz. A senha vai com scrypt, igual à do site.
import fs from 'node:fs'
import path from 'node:path'
import { randomBytes, scrypt } from 'node:crypto'
import { promisify } from 'node:util'
import { neon } from '@neondatabase/serverless'

const scryptAsync = promisify(scrypt)

if (!process.env.DATABASE_URL) {
  const arq = path.join(process.cwd(), '.env')
  if (fs.existsSync(arq)) {
    for (const linha of fs.readFileSync(arq, 'utf8').split(/\r?\n/)) {
      const m = linha.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/)
      if (m) process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g, '')
    }
  }
}

const [email, senha, nome = 'Administrador'] = process.argv.slice(2)
if (!process.env.DATABASE_URL) { console.error('DATABASE_URL não encontrada (.env da raiz).'); process.exit(1) }
if (!email || !senha || senha.length < 8) {
  console.error('Uso: node scripts/criar-admin.mjs <email> <senha de 8+ caracteres> [nome]')
  process.exit(1)
}

const sal = randomBytes(16)
const hash = await scryptAsync(senha, sal, 64)
const guardada = `scrypt$${sal.toString('base64')}$${hash.toString('base64')}`

const sql = neon(process.env.DATABASE_URL)
const [u] = await sql`
  insert into usuarios (email, senha, nome, oficina, plano, papel)
  values (${email.toLowerCase()}, ${guardada}, ${nome}, 'Deepcar', 'pro', 'admin')
  on conflict (lower(email)) do update
    set senha = excluded.senha, papel = 'admin', plano = 'pro', ativo = true
  returning id, email, nome, papel, plano`

console.log(`admin pronto: ${u.email} (${u.papel}, plano ${u.plano})`)
console.log('Entre em /login e depois abra /admin.')
