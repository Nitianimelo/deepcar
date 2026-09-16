// Tela /admin — controle de usuários. Tudo aqui exige sessão de administrador.
//
//   GET    /api/admin/usuarios            lista (com busca ?q=)
//   POST   /api/admin/usuarios            cria { nome, email, senha, plano, papel, oficina }
//   PATCH  /api/admin/usuarios?id=...     muda { plano, papel, ativo, nome, oficina, senha }
//   DELETE /api/admin/usuarios?id=...     remove (as sessões vão junto)
import { sql, um } from '../_lib/db.js'
import { cifrarSenha, corpo, exigir } from '../_lib/sessao.js'

export const config = { runtime: 'nodejs' }

const PLANOS = ['free', 'pro']
const PAPEIS = ['usuario', 'admin']

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const admin = await exigir(req, res, { admin: true })
  if (!admin) return

  try {
    const id = req.query.id
    if (req.method === 'GET') {
      const q = `%${String(req.query.q ?? '').trim()}%`
      const linhas = await sql`
        select u.id, u.email, u.nome, u.oficina, u.plano, u.papel, u.ativo, u.criado_em, u.visto_em,
               (select count(*)::int from sessoes s where s.usuario_id = u.id and s.expira_em > now()) as sessoes
          from usuarios u
         where ${q} = '%%' or u.email ilike ${q} or u.nome ilike ${q} or u.oficina ilike ${q}
         order by u.criado_em desc
         limit 500`
      return res.status(200).json(linhas)
    }

    if (req.method === 'POST') {
      const d = corpo(req)
      const email = String(d.email ?? '').trim().toLowerCase()
      if (!email || !d.nome) return res.status(400).json({ erro: 'Informe nome e e-mail.' })
      if (String(d.senha ?? '').length < 8) return res.status(400).json({ erro: 'A senha precisa de pelo menos 8 caracteres.' })
      if (await um(sql`select 1 from usuarios where lower(email) = ${email}`)) {
        return res.status(409).json({ erro: 'Já existe uma conta com este e-mail.' })
      }
      const novo = await um(sql`
        insert into usuarios (email, senha, nome, oficina, plano, papel)
        values (${email}, ${await cifrarSenha(String(d.senha))}, ${String(d.nome).trim()},
                ${String(d.oficina ?? 'Minha oficina').trim()},
                ${PLANOS.includes(d.plano) ? d.plano : 'free'},
                ${PAPEIS.includes(d.papel) ? d.papel : 'usuario'})
        returning id, email, nome, oficina, plano, papel, ativo, criado_em, visto_em`)
      return res.status(201).json(novo)
    }

    if (!id) return res.status(400).json({ erro: 'Informe o id do usuário.' })

    if (req.method === 'PATCH') {
      const d = corpo(req)
      if (d.plano !== undefined && !PLANOS.includes(d.plano)) return res.status(400).json({ erro: 'Plano inválido.' })
      if (d.papel !== undefined && !PAPEIS.includes(d.papel)) return res.status(400).json({ erro: 'Papel inválido.' })
      // ninguém pode tirar o próprio acesso de administrador e ficar sem volta
      if (id === admin.id && (d.papel === 'usuario' || d.ativo === false)) {
        return res.status(400).json({ erro: 'Você não pode remover o próprio acesso de administrador.' })
      }
      const atualizado = await um(sql`
        update usuarios set
          plano   = coalesce(${d.plano ?? null}, plano),
          papel   = coalesce(${d.papel ?? null}, papel),
          ativo   = coalesce(${d.ativo ?? null}, ativo),
          nome    = coalesce(${d.nome ?? null}, nome),
          oficina = coalesce(${d.oficina ?? null}, oficina),
          senha   = coalesce(${d.senha ? await cifrarSenha(String(d.senha)) : null}, senha)
        where id = ${id}
        returning id, email, nome, oficina, plano, papel, ativo, criado_em, visto_em`)
      if (!atualizado) return res.status(404).json({ erro: 'Usuário não encontrado.' })
      // desativado ou com senha nova: as sessões abertas caem
      if (d.ativo === false || d.senha) await sql`delete from sessoes where usuario_id = ${id}`
      return res.status(200).json(atualizado)
    }

    if (req.method === 'DELETE') {
      if (id === admin.id) return res.status(400).json({ erro: 'Você não pode apagar a própria conta.' })
      const apagado = await um(sql`delete from usuarios where id = ${id} returning id`)
      if (!apagado) return res.status(404).json({ erro: 'Usuário não encontrado.' })
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE')
    return res.status(405).json({ erro: 'Método não suportado.' })
  } catch (err) {
    return res.status(err.status ?? 500).json({ erro: err.message ?? 'Falha na operação.' })
  }
}
