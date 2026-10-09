// Tela /admin — controle de usuários. Tudo aqui exige sessão de administrador.
//
//   GET    /api/admin/usuarios            lista (com busca ?q=)
//   POST   /api/admin/usuarios            cria { nome, email, senha, whatsapp, plano, papel, oficina }
//   PATCH  /api/admin/usuarios?id=...     muda { plano, papel, ativo, nome, oficina, senha, whatsapp, liberarFree, encerrarSessoes }
//   DELETE /api/admin/usuarios?id=...     remove (as sessões vão junto)
//   GET    /api/admin/usuarios?acao=push  avisos já enviados + quantos aparelhos há por público
//   POST   /api/admin/usuarios?acao=push  { titulo, texto, publico: todos|teste|pagos, plataforma: todas|android|ios }
//          notificação nos apps (Android pelo Firebase, iPhone pelo APNs)
//          (fica aqui porque a Vercel Hobby aceita só 12 funções)
//   GET    /api/admin/usuarios?acao=logs&q=&tipo=&dias=&usuario=  registro de uso (eventos_uso) + resumo do período
import { sql, um } from '../_lib/db.js'
import { cifrarSenha, corpo, exigir } from '../_lib/sessao.js'
import { normalizarWhatsapp, SENHA_MINIMA } from '../_lib/validar.js'
import { enviarPush, NOMES_PUBLICO, PLATAFORMAS, tokensDoPublico } from '../_lib/push.js'

export const config = { runtime: 'nodejs' }

const PLANOS = ['free', 'pro', 'full']
const PAPEIS = ['usuario', 'admin']

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const admin = await exigir(req, res, { admin: true })
  if (!admin) return

  try {
    if (req.query.acao === 'push') return await avisos(req, res, admin)
    if (req.query.acao === 'logs') return await logs(req, res)
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
               u.assinatura_ciclo, u.plano_expira_em, u.origem,
               u.boas_vindas_em, u.primeira_placa_em, u.primeiro_esquema_em, u.consultas,
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
                  assinatura_status, assinatura_plano, assinatura_renova_em, assinatura_em_atraso, assinatura_origem, assinatura_ciclo, plano_expira_em`)
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
                  assinatura_status, assinatura_plano, assinatura_renova_em, assinatura_em_atraso, assinatura_origem, assinatura_ciclo, plano_expira_em`)
      if (!atualizado) return res.status(404).json({ erro: 'Usuário não encontrado.' })
      // desativado, com senha nova ou a pedido ("desconectar aparelhos"): as sessões abertas caem
      if (d.ativo === false || d.senha || d.encerrarSessoes === true) await sql`delete from sessoes where usuario_id = ${id}`
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

// Avisos no app (push). Título até 65 e texto até 240 caracteres (o que a notificação do Android mostra inteiro).
async function avisos(req, res, admin) {
  if (req.method === 'GET') {
    const [historico, contagem] = await Promise.all([
      sql`select n.id, n.titulo, n.texto, n.publico, n.aparelhos, n.entregues, n.enviado_em, u.nome as enviado_por
            from notificacoes n left join usuarios u on u.id = n.enviado_por order by n.enviado_em desc limit 30`,
      // aparelhos por público e plataforma: { todos: { todas, android, ios }, ... }
      Promise.all(NOMES_PUBLICO.map(async (p) => {
        const ap = await tokensDoPublico(p)
        return [p, { todas: ap.length, android: ap.filter((a) => (a.plataforma ?? 'android') === 'android').length, ios: ap.filter((a) => a.plataforma === 'ios').length }]
      })),
    ])
    return res.status(200).json({ historico, aparelhos: Object.fromEntries(contagem) })
  }
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Use GET ou POST.' })
  const d = corpo(req)
  const titulo = String(d.titulo ?? '').trim(), texto = String(d.texto ?? '').trim(), publico = String(d.publico ?? 'todos')
  if (!titulo || !texto) return res.status(400).json({ erro: 'Escreva o título e o texto.' })
  if (titulo.length > 65 || texto.length > 240) return res.status(400).json({ erro: 'Título até 65 e texto até 240 caracteres.' })
  const plataforma = PLATAFORMAS.includes(d.plataforma) ? d.plataforma : 'todas'
  const tokens = await tokensDoPublico(publico, plataforma)
  const entregues = await enviarPush(tokens, { titulo, texto, link: '/' })
  // o público guardado leva a plataforma quando não é "todas" (ex.: "teste · ios"): o histórico mostra para onde foi
  const rotulo = plataforma === 'todas' ? publico : `${publico} · ${plataforma}`
  await sql`insert into notificacoes (titulo, texto, publico, aparelhos, entregues, enviado_por)
            values (${titulo}, ${texto}, ${rotulo}, ${tokens.length}, ${entregues}, ${admin.id})`
  return res.status(200).json({ aparelhos: tokens.length, entregues })
}

// Registro de uso (src/lib/log.ts do site/app). Filtros: q (nome/e-mail), tipo, usuario (id), dias (1-90, padrão 7).
async function logs(req, res) {
  const dias = Math.min(90, Math.max(1, Number(req.query.dias) || 7))
  const q = String(req.query.q ?? '').trim()
  const tipo = String(req.query.tipo ?? '').trim()
  const usuario = /^[0-9a-f-]{36}$/.test(String(req.query.usuario ?? '')) ? String(req.query.usuario) : null
  const busca = q ? `%${q}%` : null
  // aparelho: '' (tudo), 'site', 'android' (app Android), 'ios' (app iPhone)
  const aparelho = ['site', 'android', 'ios'].includes(req.query.aparelho) ? req.query.aparelho : ''
  const [eventos, porTipo, semResultado, placasErro, assinar, navegador, leitura, secoes] = await Promise.all([
    sql`select e.id, e.tipo, e.detalhe, e.rota, e.aparelho, e.em, e.visitante, u.id as usuario_id, u.nome, u.email, u.plano
          from eventos_uso e left join usuarios u on u.id = e.usuario_id
         where e.em > now() - make_interval(days => ${dias})
           and (${tipo}::text = '' or e.tipo = ${tipo})
           and (${usuario}::uuid is null or e.usuario_id = ${usuario}::uuid)
           and (${aparelho} = '' or (${aparelho} = 'site' and coalesce(e.aparelho, '') not like '%· app%')
                or (${aparelho} = 'android' and e.aparelho like 'Android · app%') or (${aparelho} = 'ios' and e.aparelho like 'iPhone · app%'))
           and (${busca}::text is null or u.nome ilike ${busca} or u.email ilike ${busca} or e.visitante ilike ${busca})
         order by e.em desc limit 400`,
    sql`select tipo, count(*)::int n, count(distinct coalesce(usuario_id::text, visitante))::int pessoas
          from eventos_uso where em > now() - make_interval(days => ${dias}) group by 1 order by 2 desc`,
    sql`select lower(detalhe->>'termo') termo, count(*)::int n from eventos_uso
         where tipo = 'busca' and (detalhe->>'resultados')::int = 0 and em > now() - make_interval(days => ${dias})
         group by 1 order by 2 desc limit 15`,
    sql`select detalhe->>'erro' erro, count(*)::int n from eventos_uso
         where tipo = 'placa_erro' and em > now() - make_interval(days => ${dias}) group by 1 order by 2 desc limit 10`,
    sql`select u.id, u.nome, u.email, u.plano, count(*)::int cliques, max(e.em) ultimo
          from eventos_uso e join usuarios u on u.id = e.usuario_id
         where e.tipo = 'clicou_assinar' and e.em > now() - make_interval(days => ${dias})
         group by 1,2,3,4 order by max(e.em) desc limit 30`,
    sql`select detalhe->>'so' so, detalhe->>'acao' acao, count(*)::int n from eventos_uso
         where tipo = 'navegador_interno' and em > now() - make_interval(days => ${dias}) group by 1,2 order by 1,3 desc`,
    // página de vendas por aparelho: quem chegou, quem rolou metade, tempo mediano e quem abriu o cadastro
    sql`with e as (select coalesce(usuario_id::text, visitante) quem, tipo, rota, detalhe,
                          case when aparelho like 'iPhone%' then 'iPhone' when aparelho like 'Android%' then 'Android'
                               when aparelho like 'Windows%' or aparelho like 'Mac%' then 'Computador' else 'Outro' end so
                     from eventos_uso where em > now() - make_interval(days => ${dias})),
             vis as (select distinct quem, so from e where tipo = 'pagina' and (rota = '/' or rota like '/?%'))
        select v.so, count(*)::int visitantes,
               count(*) filter (where exists (select 1 from e where e.quem = v.quem and e.tipo = 'rolou' and (e.detalhe->>'pct')::int >= 50))::int rolou_metade,
               (select percentile_cont(0.5) within group (order by (detalhe->>'segundos')::int)::int from e
                 where e.so = v.so and e.tipo = 'saiu_landing' and e.quem in (select quem from vis where vis.so = v.so)) segundos_mediana,
               count(*) filter (where exists (select 1 from e where e.quem = v.quem and e.tipo = 'pagina' and e.rota like '/cadastro%'))::int abriu_cadastro,
               count(*) filter (where exists (select 1 from e where e.quem = v.quem and e.tipo = 'cadastro'))::int cadastrou
          from vis v group by v.so order by 2 desc`,
    // funil da página de vendas por seção (09/10/2026): de quem abriu a página, quantos viram cada seção, clicaram em
    // "Pegar oferta" e em assinar (checkout). Por aparelho, igual à tabela de cima.
    sql`with e as (select coalesce(usuario_id::text, visitante) quem, tipo, rota, detalhe,
                          case when aparelho like 'iPhone%' then 'iPhone' when aparelho like 'Android%' then 'Android'
                               when aparelho like 'Windows%' or aparelho like 'Mac%' then 'Computador' else 'Outro' end so
                     from eventos_uso where em > now() - make_interval(days => ${dias})),
             vis as (select distinct quem, so from e where tipo = 'pagina' and (rota = '/' or rota like '/?%'))
        select v.so, count(*)::int visitantes,
               count(*) filter (where exists (select 1 from e where e.quem = v.quem and e.tipo = 'viu_secao' and e.detalhe->>'secao' = 'como-funciona'))::int tour,
               count(*) filter (where exists (select 1 from e where e.quem = v.quem and e.tipo = 'viu_secao' and e.detalhe->>'secao' = 'seu-carro'))::int busca,
               count(*) filter (where exists (select 1 from e where e.quem = v.quem and e.tipo = 'viu_secao' and e.detalhe->>'secao' = 'planos'))::int planos,
               count(*) filter (where exists (select 1 from e where e.quem = v.quem and e.tipo = 'viu_secao' and e.detalhe->>'secao' = 'faq'))::int faq,
               count(*) filter (where exists (select 1 from e where e.quem = v.quem and e.tipo = 'pegar_oferta'))::int oferta,
               count(*) filter (where exists (select 1 from e where e.quem = v.quem and e.tipo = 'clicou_assinar'))::int assinar
          from vis v group by v.so order by 2 desc`,
  ])
  return res.status(200).json({ dias, eventos, resumo: { porTipo, semResultado, placasErro, assinar, navegador, leitura, secoes } })
}
