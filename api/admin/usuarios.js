// Tela /admin — controle de usuários. Tudo aqui exige sessão de administrador.
//
//   GET    /api/admin/usuarios            lista (com busca ?q=)
//   POST   /api/admin/usuarios            cria { nome, email, senha, whatsapp, plano, papel, oficina }
//   PATCH  /api/admin/usuarios?id=...     muda { plano, papel, ativo, nome, oficina, senha, whatsapp, liberarFree }
//   DELETE /api/admin/usuarios?id=...     remove (as sessões vão junto)
import { sql, um } from '../_lib/db.js'
import { cifrarSenha, corpo, exigir } from '../_lib/sessao.js'
import { normalizarWhatsapp, SENHA_MINIMA } from '../_lib/validar.js'

export const config = { runtime: 'nodejs' }

const PLANOS = ['free', 'pro', 'full']
const PAPEIS = ['usuario', 'admin']

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const admin = await exigir(req, res, { admin: true })
  if (!admin) return

  try {
    const id = req.query.id
    if (req.method === 'GET') {
      const termo = String(req.query.q ?? '').trim()
      const q = `%${termo}%`
      // busca por telefone: "(11) 98765" tem que achar 5511987654321, então compara só dígitos
      const digitos = termo.replace(/\D/g, '')
      const qDigitos = digitos ? `%${digitos}%` : null
      const linhas = await sql`
        select u.id, u.email, u.nome, u.oficina, u.plano, u.papel, u.ativo, u.criado_em, u.visto_em,
               u.whatsapp, u.free_expira_em, u.assinatura_status, u.assinatura_plano,
               u.assinatura_renova_em, u.assinatura_em_atraso, u.assinatura_origem,
               (select count(*)::int from sessoes s where s.usuario_id = u.id and s.expira_em > now()) as sessoes
          from usuarios u
         where ${q} = '%%' or u.email ilike ${q} or u.nome ilike ${q} or u.oficina ilike ${q}
                          or (${qDigitos}::text is not null and coalesce(u.whatsapp, '') ilike ${qDigitos})
         order by u.criado_em desc
         limit 500`
      return res.status(200).json(linhas)
    }

    if (req.method === 'POST') {
      const d = corpo(req)
      const email = String(d.email ?? '').trim().toLowerCase()
      if (!email || !d.nome) return res.status(400).json({ erro: 'Informe nome e e-mail.' })
      if (String(d.senha ?? '').length < SENHA_MINIMA) return res.status(400).json({ erro: `A senha precisa de pelo menos ${SENHA_MINIMA} caracteres.` })
      if (await um(sql`select 1 from usuarios where lower(email) = ${email}`)) {
        return res.status(409).json({ erro: 'Já existe uma conta com este e-mail.' })
      }
      const novo = await um(sql`
        insert into usuarios (email, senha, nome, oficina, plano, papel, whatsapp)
        values (${email}, ${await cifrarSenha(String(d.senha))}, ${String(d.nome).trim()},
                ${String(d.oficina ?? 'Minha oficina').trim() || 'Minha oficina'},
                ${PLANOS.includes(d.plano) ? d.plano : 'free'},
                ${PAPEIS.includes(d.papel) ? d.papel : 'usuario'},
                ${normalizarWhatsapp(d.whatsapp)})
        returning id, email, nome, oficina, plano, papel, ativo, criado_em, visto_em, whatsapp, free_expira_em,
                  assinatura_status, assinatura_plano, assinatura_renova_em, assinatura_em_atraso, assinatura_origem`)
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
      // redefinição de senha pelo administrador: mesma regra do cadastro
      if (d.senha !== undefined && (typeof d.senha !== 'string' || d.senha.length < SENHA_MINIMA)) {
        return res.status(400).json({ erro: `A senha precisa de pelo menos ${SENHA_MINIMA} caracteres.` })
      }
      if (d.whatsapp !== undefined && d.whatsapp !== null && d.whatsapp !== '' && !normalizarWhatsapp(d.whatsapp)) {
        return res.status(400).json({ erro: 'WhatsApp inválido. Use DDD + número, com o 9 na frente.' })
      }
      // zerar o relógio do teste: pedido explícito, ou troca de plano (quem volta para o
      // free ganha uma janela nova, quem vira pro deixa de ter relógio)
      const zerarFree = d.liberarFree === true || d.plano !== undefined
      // plano mexido a mao: um chargeback posterior nao desfaz a decisao do administrador
      const manual = d.plano !== undefined

      const atualizado = await um(sql`
        update usuarios set
          plano    = coalesce(${d.plano ?? null}, plano),
          papel    = coalesce(${d.papel ?? null}, papel),
          ativo    = coalesce(${d.ativo ?? null}, ativo),
          nome     = coalesce(${d.nome ?? null}, nome),
          oficina  = coalesce(${d.oficina ?? null}, oficina),
          whatsapp = coalesce(${d.whatsapp ? normalizarWhatsapp(d.whatsapp) : null}, whatsapp),
          senha    = coalesce(${d.senha ? await cifrarSenha(String(d.senha)) : null}, senha),
          free_expira_em = case when ${zerarFree}::boolean then null else free_expira_em end,
          assinatura_origem = case when ${manual}::boolean then 'manual' else assinatura_origem end,
          assinatura_status = case when ${manual}::boolean then 'manual' else assinatura_status end,
          assinatura_atualizada_em = case when ${manual}::boolean then now() else assinatura_atualizada_em end
        where id = ${id}
        returning id, email, nome, oficina, plano, papel, ativo, criado_em, visto_em, whatsapp, free_expira_em,
                  assinatura_status, assinatura_plano, assinatura_renova_em, assinatura_em_atraso, assinatura_origem`)
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
