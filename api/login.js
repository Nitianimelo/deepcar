// Vercel: POST /api/login. Mesma regra do servidor local (server/login.mjs).
// Usuarios vem das variaveis de ambiente do projeto (LOGIN_USUARIO/LOGIN_SENHA) ou,
// para varios usuarios, de LOGIN_USUARIOS com o JSON da lista.
import { autenticar, usuariosDe } from '../server/login.mjs'

export const config = { runtime: 'nodejs' }

function usuarios() {
  if (process.env.LOGIN_USUARIOS) {
    try {
      const lista = JSON.parse(process.env.LOGIN_USUARIOS)
      if (Array.isArray(lista) && lista.length) return lista
    } catch {
      // JSON invalido na variavel: cai para o caminho normal
    }
  }
  return usuariosDe(process.env)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ erro: 'Use POST.' })
  }
  try {
    // o runtime da Vercel ja entrega req.body como objeto quando o Content-Type e JSON
    const { usuario, senha } = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {})
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json(autenticar(usuario, senha, usuarios()))
  } catch (err) {
    return res.status(err.status ?? 500).json({ erro: err.message ?? 'Falha no login.' })
  }
}
