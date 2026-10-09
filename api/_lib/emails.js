// Textos dos e-mails da Deepcar (o envio e a casca estão em email.js). Nada de prometer número de consultas do teste.
import { sql, um } from './db.js'
import { AZUL, botao, enviarEmail, esc, modelo, SITE } from './email.js'
import { segredo } from './segredos.js'

const PLAY = 'https://play.google.com/store/apps/details?id=deepcar.app.android'
const primeiro = (nome) => String(nome ?? '').trim().split(/\s+/)[0] || 'mecânico'
const p_ = (t) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#2b3440">${t}</p>`

function passo(n, titulo, texto) {
  return `<tr>
  <td valign="top" style="padding:0 14px 16px 0;width:34px"><div style="width:34px;height:34px;border-radius:17px;background:${AZUL};color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;line-height:34px;text-align:center">${n}</div></td>
  <td valign="top" style="padding:0 0 16px;font-family:Arial,Helvetica,sans-serif"><div style="font-size:16px;font-weight:bold;color:#0f1419">${titulo}</div><div style="margin-top:3px;font-size:14.5px;line-height:1.55;color:#5b6675">${texto}</div></td>
</tr>`
}

/** Boas-vindas logo depois do cadastro (site ou app). */
export function emailBoasVindas(u) {
  const link = `${SITE}/app?utm_source=email&utm_medium=boas_vindas`
  const corpo = `
${p_(`Olá, <b>${esc(primeiro(u.nome))}</b>! Que bom ter você na Deepcar.`)}
${p_('Você agora tem esquemas elétricos de <b>mais de 15 mil modelos</b>, do leve ao diesel, na palma da mão. O jeito mais rápido de ver o valor é com um carro de verdade: <b>o próximo que entrar na sua oficina</b>.')}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 4px;padding:22px 22px 6px;background:#f3f7fd;border:1px solid #dbe7f8;border-radius:14px">
  <tr><td colspan="2" style="padding:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:${AZUL}">Como usar em 30 segundos</td></tr>
  ${passo(1, 'Digite a placa', 'A Deepcar identifica montadora, modelo, ano e motor do carro.')}
  ${passo(2, 'Escolha o sistema', 'Injeção eletrônica, ABS, elétrica ou câmbio: só os esquemas que servem para aquele carro.')}
  ${passo(3, 'Vá direto ao componente', 'Use a busca de componentes e o zoom para achar o fio que interessa, sem folhear PDF.')}
</table>
${botao('Consultar minha primeira placa', link)}
<p style="margin:18px 0 0;font-size:14.5px;line-height:1.6;color:#5b6675">
  Usa Android? <a href="${PLAY}" style="color:${AZUL};font-weight:bold;text-decoration:none">Baixe o app Deepcar na Google Play</a> e entre com este mesmo e-mail.
</p>
<p style="margin:10px 0 0;font-size:14.5px;line-height:1.6;color:#5b6675">
  Esqueceu a senha? É só tocar em <b>"Esqueci a senha"</b> na tela de entrada.
</p>`
  return {
    assunto: `${primeiro(u.nome)}, sua conta na Deepcar está pronta`,
    html: modelo({ previa: 'Digite a placa e veja o esquema certo em segundos.', titulo: 'Sua conta está pronta. Bora para o primeiro carro?', corpo }),
    texto: `Olá, ${primeiro(u.nome)}! Sua conta na Deepcar está pronta.\n\nComo usar: 1) digite a placa; 2) escolha o sistema (injeção, ABS, elétrica, câmbio); 3) use a busca de componentes e o zoom.\n\nComece agora: ${link}\n\nApp Android: ${PLAY}\nSuporte no WhatsApp: (48) 3197-3217`,
  }
}

/** Link para criar uma senha nova (vale 1 hora, uma vez). */
export function emailRedefinirSenha(u, link) {
  const corpo = `
${p_(`Olá, <b>${esc(primeiro(u.nome))}</b>.`)}
${p_(`Recebemos um pedido para criar uma nova senha para a conta <b>${esc(u.email)}</b>. Toque no botão abaixo para escolher a nova senha:`)}
${botao('Criar nova senha', link)}
<p style="margin:18px 0 0;font-size:14.5px;line-height:1.6;color:#5b6675">O link vale por <b>1 hora</b> e só pode ser usado uma vez.</p>
<p style="margin:10px 0 0;font-size:14.5px;line-height:1.6;color:#5b6675">Não foi você? É só ignorar este e-mail: a sua senha atual continua valendo.</p>`
  return {
    assunto: 'Criar uma nova senha na Deepcar',
    html: modelo({ previa: 'O link para criar sua nova senha vale por 1 hora.', titulo: 'Vamos criar uma nova senha', corpo }),
    texto: `Olá, ${primeiro(u.nome)}.\n\nPara criar uma nova senha na Deepcar, abra este link (vale 1 hora, uma vez):\n${link}\n\nSe não foi você, ignore este e-mail.`,
  }
}

// O que cada plano libera, como na página de vendas (src/data/planos.ts → itens). Mudou lá? Mude aqui.
const PLANOS = {
  pro: { nome: 'Pro', aparelhos: 2, chamada: 'o essencial para carros leves',
    itens: ['Injeção eletrônica leve', 'ABS', 'Elétrica leve', 'Câmbio leve', 'Busca pela placa', 'App Android', 'Suporte no WhatsApp'] },
  full: { nome: 'Full', aparelhos: 4, chamada: 'tudo liberado, do leve ao diesel',
    itens: ['Injeção eletrônica leve e diesel', 'ABS', 'Elétrica leve e diesel', 'Câmbio leve e diesel', 'Busca pela placa', 'App Android', 'Suporte no WhatsApp'] },
}
const data = (d) => (d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' }) : null)

function linhaResumo(rotulo, valor) {
  return `<tr><td style="padding:9px 0;border-bottom:1px solid #e6eaef;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#5b6675">${rotulo}</td>
  <td align="right" style="padding:9px 0;border-bottom:1px solid #e6eaef;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#0f1419">${valor}</td></tr>`
}

/** Plano pago liberado (compra nova, troca de plano ou de ciclo). `u` = a conta já atualizada. */
export function emailCompra(u) {
  const p = PLANOS[u.plano] ?? PLANOS.pro
  const anual = u.assinatura_ciclo === 'anual'
  const play = u.assinatura_origem === 'play'
  const validade = anual ? data(u.plano_expira_em) : play ? data(u.play_expira_em) : data(u.assinatura_renova_em)
  const link = `${SITE}/app?utm_source=email&utm_medium=compra`
  const itens = p.itens.map((i) => `<tr>
    <td valign="top" style="padding:5px 10px 5px 0;width:22px"><div style="width:20px;height:20px;border-radius:10px;background:#e3f6ec;color:#16865a;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;line-height:20px;text-align:center">&#10003;</div></td>
    <td style="padding:5px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#2b3440">${i}</td></tr>`).join('')
  const gerenciar = play
    ? 'Sua assinatura é cobrada pela Google Play: para trocar o cartão ou cancelar, abra a Play Store → Pagamentos e assinaturas.'
    : `Para trocar o cartão, mudar de plano ou cancelar, fale com a gente no <a href="https://wa.me/554831973217" style="color:${AZUL};font-weight:bold;text-decoration:none">WhatsApp</a>.`
  const corpo = `
${p_(`Olá, <b>${esc(primeiro(u.nome))}</b>! Seu pagamento foi confirmado e o <b>plano ${p.nome}</b> já está ativo na sua conta: ${p.chamada}.`)}
${p_('Obrigado por confiar na Deepcar para o dia a dia da sua oficina. A partir de agora é placa digitada, esquema na tela e carro saindo mais rápido do elevador.')}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 6px;background:#f6f8fa;border:1px solid #e6eaef;border-radius:14px">
  <tr><td style="padding:20px 22px 12px">
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:${AZUL}">Sua assinatura</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px">
      ${linhaResumo('Plano', `Deepcar ${p.nome}`)}
      ${linhaResumo('Cobrança', anual ? 'Anual (12 meses)' : 'Mensal')}
      ${validade ? linhaResumo(anual ? 'Válido até' : 'Próxima renovação', validade) : ''}
      ${linhaResumo('Aparelhos ao mesmo tempo', `até ${p.aparelhos}`)}
      ${linhaResumo('Conta', esc(u.email))}
    </table>
  </td></tr>
</table>
<div style="margin:26px 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:${AZUL}">O que está liberado</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">${itens}</table>
${botao('Abrir a Deepcar', link)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 0;background:#f3f7fd;border:1px solid #dbe7f8;border-radius:14px">
  <tr><td style="padding:18px 22px;font-family:Arial,Helvetica,sans-serif;font-size:14.5px;line-height:1.6;color:#2b3440">
    <b>Para render mais:</b><br>
    &bull; Use no celular da bancada e no computador do balcão, com a mesma conta.<br>
    &bull; No Android, <a href="${PLAY}" style="color:${AZUL};font-weight:bold;text-decoration:none">baixe o app Deepcar</a> e entre com este e-mail.<br>
    &bull; Dentro do esquema, a busca de componentes leva direto ao fio que você procura.
  </td></tr>
</table>
<p style="margin:18px 0 0;font-size:13.5px;line-height:1.6;color:#5b6675">${gerenciar}</p>`
  return {
    assunto: `Bem-vindo ao Deepcar ${p.nome}, ${primeiro(u.nome)}!`,
    html: modelo({ previa: `Pagamento confirmado: o plano ${p.nome} já está ativo na sua conta.`, titulo: `Seja bem-vindo ao Deepcar ${p.nome}!`, corpo, selo: `Plano ${p.nome} ativo` }),
    texto: `Olá, ${primeiro(u.nome)}! Pagamento confirmado: o plano ${p.nome} já está ativo (${anual ? 'anual' : 'mensal'}${validade ? `, ${anual ? 'válido até' : 'renova em'} ${validade}` : ''}).\n\nLiberado: ${p.itens.join(', ')}.\n\nAbrir: ${link}\nApp Android: ${PLAY}\nSuporte no WhatsApp: (48) 3197-3217`,
  }
}

/**
 * Manda o e-mail de compra quando a conta passou a ter um plano pago novo (free → pago, troca de plano ou de ciclo).
 * Renovação (mesmo plano e ciclo) não manda. Nunca derruba quem chamou.
 */
export async function avisarCompra(antes, depois) {
  try {
    if (!depois || !['pro', 'full'].includes(depois.plano) || depois.papel === 'admin') return
    if (antes && antes.plano === depois.plano && antes.assinatura_ciclo === depois.assinatura_ciclo) return
    const m = emailCompra(depois)
    await Promise.all([
      enviarEmail({ para: depois.email, assunto: m.assunto, html: m.html, texto: m.texto, etiqueta: 'compra' }),
      avisarDono(antes, depois),
    ])
  } catch (err) {
    console.error('[email] compra:', err.message)
  }
}

// Checkout da Cakto (os mesmos de VITE_CAKTO_CHECKOUT_* na Vercel; mudou lá, mude aqui). Vai com e-mail/nome/telefone
// preenchidos, como linkCheckout() do site: o webhook acha a conta pelo e-mail.
const CHECKOUT = {
  mensal: { pro: 'https://pay.cakto.com.br/3c9ck5a_1126774', full: 'https://pay.cakto.com.br/vxd8vpe_1117560' },
  anual: { pro: 'https://pay.cakto.com.br/6ccodaw', full: 'https://pay.cakto.com.br/uigfpmf' },
}
// mesmos valores de src/data/planos.ts (mensal do 2º mês em diante, 1º mês com o cupom, anual por mês e à vista)
const PRECO = {
  pro: { mensal: '37,00', primeiro: '19,90', anual: '22,20', anualVista: '266,40' },
  full: { mensal: '49,90', primeiro: '19,90', anual: '29,94', anualVista: '359,28' },
}
// cupom da 1ª mensalidade (src/data/planos.ts → OFERTA): vai no link do checkout mensal
const CUPOM = { pro: 'DEEPCAR1990', full: 'DEEPCAR1990' }
// igual a OFERTA.ativa em src/data/planos.ts: só liga quando o cupom existir na Cakto (senão o e-mail promete o que o checkout não cobra)
const PRIMEIRO_MES = false
function checkout(plano, ciclo, u) {
  const q = new URLSearchParams({ email: u.email ?? '', name: u.nome ?? '', utm_source: 'email', utm_medium: 'teste_acabou', utm_campaign: `${plano}_${ciclo}` })
  if (u.whatsapp) q.set('phone', u.whatsapp)
  if (PRIMEIRO_MES && ciclo === 'mensal') q.set('coupon', CUPOM[plano])
  return `${CHECKOUT[ciclo][plano]}?${q}`
}

function cartaoPlano(id, u, destaque) {
  const p = PLANOS[id]
  const borda = destaque ? `2px solid ${AZUL}` : '1px solid #dfe5ec'
  const itens = p.itens.slice(0, 5).map((i) => `<div style="padding:3px 0;font-size:14.5px;color:#2b3440"><span style="color:#16865a;font-weight:bold">&#10003;</span>&nbsp; ${i}</div>`).join('')
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;border:${borda};border-radius:16px;background:#ffffff">
  <tr><td style="padding:22px 22px 20px;font-family:Arial,Helvetica,sans-serif">
    ${destaque ? `<div style="display:inline-block;margin-bottom:10px;padding:4px 10px;border-radius:999px;background:${AZUL};color:#ffffff;font-size:11px;font-weight:bold;letter-spacing:1.2px;text-transform:uppercase">Mais completo</div>` : ''}
    <div style="font-size:20px;font-weight:bold;color:#0f1419">Plano ${p.nome}</div>
    <div style="margin-top:2px;font-size:14px;color:#5b6675">${p.chamada[0].toUpperCase() + p.chamada.slice(1)} · até ${p.aparelhos} aparelhos</div>
    <div style="margin-top:14px"><span style="font-size:30px;font-weight:bold;color:#0f1419">R$&nbsp;${PRECO[id].anual}</span><span style="font-size:15px;color:#5b6675">/mês no plano anual (40% OFF)</span></div>
    <div style="margin-top:2px;font-size:13.5px;color:#5b6675">${PRIMEIRO_MES ? `ou 1º mês por R$ ${PRECO[id].primeiro} no mensal (depois R$ ${PRECO[id].mensal}/mês, sem fidelidade)` : `ou R$ ${PRECO[id].mensal}/mês no mensal, sem fidelidade`}</div>
    <div style="margin:14px 0 4px">${itens}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px"><tr><td style="border-radius:12px;background:${destaque ? AZUL : '#151b24'}">
      <a href="${esc(checkout(id, 'anual', u))}" style="display:inline-block;padding:14px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:12px">Assinar o ${p.nome} anual</a>
    </td></tr></table>
    <div style="margin-top:10px;font-size:14px"><a href="${esc(checkout(id, 'mensal', u))}" style="color:${AZUL};font-weight:bold;text-decoration:none">${PRIMEIRO_MES ? `Prefiro o ${p.nome} mensal: 1º mês por R$ ${PRECO[id].primeiro}` : `Prefiro o ${p.nome} mensal (R$ ${PRECO[id].mensal})`} &rarr;</a></div>
  </td></tr>
</table>`
}

/** Teste grátis encerrado: o que a pessoa perde, os dois planos com checkout preenchido e o WhatsApp para tirar dúvidas. */
export function emailTesteAcabou(u) {
  const zap = `https://wa.me/554831973217?text=${encodeURIComponent(`Olá! Meu teste na Deepcar acabou e quero saber qual plano é melhor para a minha oficina. Minha conta é ${u.email}.`)}`
  const usou = Number(u.consultas ?? 0) > 0
  const motivo = (t, d) => `<tr>
    <td valign="top" style="padding:0 12px 14px 0;width:26px;font-size:18px;line-height:24px">${t}</td>
    <td valign="top" style="padding:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#2b3440">${d}</td></tr>`
  const corpo = `
${p_(`Olá, <b>${esc(primeiro(u.nome))}</b>. ${usou ? 'Você já viu na prática como é abrir o esquema certo pela placa, em segundos.' : 'Você criou sua conta, mas não chegou a aproveitar o teste.'} Para continuar consultando, é só escolher um plano.`)}
${p_('Sua conta continua lá, com tudo do jeito que você deixou. Assinando agora, o acesso volta <b>na hora</b>, no celular e no computador.')}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 8px;padding:20px 20px 6px;background:#f3f7fd;border:1px solid #dbe7f8;border-radius:14px">
  <tr><td colspan="2" style="padding:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:${AZUL}">Por que vale a pena</td></tr>
  ${motivo('&#9201;', '<b>Menos tempo procurando.</b> Placa digitada, esquema na tela: sem folhear PDF nem pedir em grupo de WhatsApp.')}
  ${motivo('&#128295;', '<b>Diagnóstico mais certeiro.</b> Injeção, ABS, elétrica e câmbio de mais de 15 mil modelos, do leve ao diesel.')}
  ${motivo('&#128176;', '<b>Menos de R$ 1 por dia</b> no Pro anual. Um carro a mais por mês já paga o ano inteiro.')}
</table>
<div style="margin:26px 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:${AZUL}">Escolha o seu plano</div>
${cartaoPlano('full', u, true)}
${cartaoPlano('pro', u, false)}
<p style="margin:4px 0 0;font-size:13.5px;line-height:1.6;color:#5b6675">
  Pagamento por cartão (até 12x no anual) ou Pix, com compra protegida: você tem 7 dias para desistir e receber o dinheiro de volta.
  Usa o app Android? Também dá para assinar por lá, pela Google Play.
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 0;background:#f6f8fa;border:1px solid #e6eaef;border-radius:14px">
  <tr><td style="padding:20px 22px;font-family:Arial,Helvetica,sans-serif">
    <div style="font-size:16px;font-weight:bold;color:#0f1419">Ficou em dúvida sobre qual plano escolher?</div>
    <div style="margin-top:4px;font-size:14.5px;line-height:1.55;color:#5b6675">Conta pra gente o que a sua oficina atende que a gente indica o plano certo. Resposta rápida, sem compromisso.</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px"><tr><td style="border-radius:12px;background:#25d366">
      <a href="${esc(zap)}" style="display:inline-block;padding:13px 22px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#0b2e1a;text-decoration:none;border-radius:12px">Falar no WhatsApp</a>
    </td></tr></table>
  </td></tr>
</table>`
  return {
    assunto: `${primeiro(u.nome)}, seu teste grátis na Deepcar acabou`,
    html: modelo({ previa: PRIMEIRO_MES ? 'Sua conta continua lá. Volte com o 1º mês por R$ 19,90 ou o anual com 40% OFF.' : 'Sua conta continua lá. Volte com o plano anual com 40% OFF.', titulo: 'Seu teste grátis acabou. Bora continuar?', corpo }),
    texto: `Olá, ${primeiro(u.nome)}. Seu teste grátis na Deepcar terminou. Assine e o acesso volta na hora.\n\nFull (leve e diesel, 4 aparelhos): R$ 29,94/mês no anual (40% OFF) ou ${PRIMEIRO_MES ? '1º mês por R$ 19,90 no mensal (depois R$ 49,90)' : 'R$ 49,90 no mensal'}\n  anual: ${checkout('full', 'anual', u)}\n  mensal: ${checkout('full', 'mensal', u)}\nPro (leves, 2 aparelhos): R$ 22,20/mês no anual (40% OFF) ou ${PRIMEIRO_MES ? '1º mês por R$ 19,90 no mensal (depois R$ 37,00)' : 'R$ 37,00 no mensal'}\n  anual: ${checkout('pro', 'anual', u)}\n  mensal: ${checkout('pro', 'mensal', u)}\n\nDúvida? WhatsApp (48) 3197-3217: ${zap}`,
  }
}

/** "Seu teste acabou" por e-mail, uma vez por conta. Nunca derruba quem chamou. */
export async function avisarTesteAcabouEmail(usuarioId) {
  try {
    const u = await um(sql`update usuarios set email_teste_acabou_em = now()
                            where id = ${usuarioId} and email_teste_acabou_em is null and plano = 'free' and papel <> 'admin' and ativo
                            returning id, nome, email, whatsapp, consultas`)
    if (!u) return
    const m = emailTesteAcabou(u)
    await enviarEmail({ para: u.email, assunto: m.assunto, html: m.html, texto: m.texto, etiqueta: 'teste_acabou' })
  } catch (err) {
    console.error('[email] teste acabou:', err.message)
  }
}

const ORIGEM = { play: 'Google Play (app Android)', cakto: 'Cakto (site)', manual: 'vinculado no /admin' }

/** "Nova venda" para o dono (cofre AVISO_VENDAS_EMAIL; sem ele, não manda). O repositório é público: o e-mail fica no cofre. */
async function avisarDono(antes, u) {
  const para = await segredo('AVISO_VENDAS_EMAIL')
  if (!para) return
  const p = PLANOS[u.plano] ?? PLANOS.pro
  const anual = u.assinatura_ciclo === 'anual'
  const troca = antes && ['pro', 'full'].includes(antes.plano) ? ` (antes: ${PLANOS[antes.plano]?.nome} ${antes.assinatura_ciclo ?? ''})` : ''
  const zap = u.whatsapp ? `https://wa.me/${u.whatsapp}` : null
  const corpo = `
${p_(`<b>${esc(u.nome)}</b> assinou o <b>${p.nome} ${anual ? 'anual' : 'mensal'}</b>${esc(troca)}.`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0 6px;background:#f6f8fa;border:1px solid #e6eaef;border-radius:14px">
  <tr><td style="padding:14px 22px 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    ${linhaResumo('Plano', `${p.nome} ${anual ? 'anual' : 'mensal'}`)}
    ${linhaResumo('Pagou por', ORIGEM[u.assinatura_origem] ?? esc(u.assinatura_origem ?? '-'))}
    ${linhaResumo('E-mail', esc(u.email))}
    ${linhaResumo('WhatsApp', u.whatsapp ? `<a href="${zap}" style="color:${AZUL};text-decoration:none">${esc(u.whatsapp)}</a>` : '-')}
    ${linhaResumo('Cadastro', data(u.criado_em) ?? '-')}
  </table></td></tr>
</table>
${botao('Ver no /admin', `${SITE}/admin`)}`
  await enviarEmail({
    para, etiqueta: 'aviso_venda',
    assunto: `Nova venda: ${p.nome} ${anual ? 'anual' : 'mensal'} · ${u.nome} · ${u.assinatura_origem === 'play' ? 'Google Play' : u.assinatura_origem === 'cakto' ? 'Cakto' : 'manual'}`,
    html: modelo({ previa: `${u.nome} assinou o ${p.nome}.`, titulo: 'Nova venda na Deepcar', corpo, selo: 'Nova venda' }),
    texto: `${u.nome} (${u.email}, ${u.whatsapp ?? 'sem WhatsApp'}) assinou o ${p.nome} ${anual ? 'anual' : 'mensal'} por ${ORIGEM[u.assinatura_origem] ?? u.assinatura_origem}${troca}.`,
  })
}
