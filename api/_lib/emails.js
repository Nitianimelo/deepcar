// Textos dos e-mails da Deepcar (o envio e a casca estão em email.js). Nada de prometer número de consultas do teste.
import { AZUL, botao, enviarEmail, esc, modelo, SITE } from './email.js'

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
    await enviarEmail({ para: depois.email, assunto: m.assunto, html: m.html, texto: m.texto, etiqueta: 'compra' })
  } catch (err) {
    console.error('[email] compra:', err.message)
  }
}
