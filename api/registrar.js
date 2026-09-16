// POST /api/registrar  { nome, email, whatsapp, senha }  → cria a conta (plano free) e já entra.
import { sql, um } from './_lib/db.js'
import { abrirJanelaFree, cifrarSenha, corpo, criarSessao, porCookie, publico } from './_lib/sessao.js'
import { emailValido, nomeValido, normalizarWhatsapp, senhaValida, SENHA_MINIMA } from './_lib/validar.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ erro: 'Use POST.' })
  }
  res.setHeader('Cache-Control', 'no-store')
  try {
    const dados = corpo(req)
    const nome = String(dados.nome ?? '').trim().replace(/\s+/g, ' ')
    const email = String(dados.email ?? '').trim().toLowerCase()
    const whatsapp = normalizarWhatsapp(dados.whatsapp)
    const senha = String(dados.senha ?? '')
    const oficina = String(dados.oficina ?? '').trim() || 'Minha oficina'

    // uma mensagem por campo, na ordem da tela: quem errar dois sabe qual corrigir primeiro
    if (!nomeValido(nome)) return res.status(400).json({ erro: 'Informe seu nome.', campo: 'nome' })
    if (!emailValido(email)) return res.status(400).json({ erro: 'E-mail inválido.', campo: 'email' })
    if (!whatsapp) return res.status(400).json({ erro: 'WhatsApp inválido. Use DDD + número, com o 9 na frente.', campo: 'whatsapp' })
    if (!senhaValida(senha)) {
      return res.status(400).json({ erro: `A senha precisa de pelo menos ${SENHA_MINIMA} caracteres.`, campo: 'senha' })
    }

    const existe = await um(sql`select 1 from usuarios where lower(email) = ${email}`)
    if (existe) return res.status(409).json({ erro: 'Já existe uma conta com este e-mail.', campo: 'email' })

    const u = await um(sql`
      insert into usuarios (email, senha, nome, oficina, whatsapp)
      values (${email}, ${await cifrarSenha(senha)}, ${nome}, ${oficina}, ${whatsapp})
      returning *`)

    // a conta nasce free: o relógio dos minutos começa aqui, porque o cadastro já entra no app
    const comJanela = await abrirJanelaFree(u)
    const { token, expira } = await criarSessao(u.id, req.headers['user-agent'])
    porCookie(res, token, expira)
    return res.status(201).json(publico(comJanela))
  } catch (err) {
    return res.status(err.status ?? 500).json({ erro: err.message ?? 'Não foi possível criar a conta.' })
  }
}
