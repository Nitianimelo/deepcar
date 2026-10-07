// Textos dos e-mails da Deepcar (o envio e a casca estão em email.js). Nada de prometer número de consultas do teste.
import { AZUL, botao, esc, modelo, SITE } from './email.js'

const PLAY = 'https://play.google.com/store/apps/details?id=deepcar.app.android'
const primeiro = (nome) => String(nome ?? '').trim().split(/\s+/)[0] || 'mecânico'
const p = (t) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#2b3440">${t}</p>`

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
${p(`Olá, <b>${esc(primeiro(u.nome))}</b>! Que bom ter você na Deepcar.`)}
${p('Você agora tem esquemas elétricos de <b>mais de 15 mil modelos</b>, do leve ao diesel, na palma da mão. O jeito mais rápido de ver o valor é com um carro de verdade: <b>o próximo que entrar na sua oficina</b>.')}
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
${p(`Olá, <b>${esc(primeiro(u.nome))}</b>.`)}
${p(`Recebemos um pedido para criar uma nova senha para a conta <b>${esc(u.email)}</b>. Toque no botão abaixo para escolher a nova senha:`)}
${botao('Criar nova senha', link)}
<p style="margin:18px 0 0;font-size:14.5px;line-height:1.6;color:#5b6675">O link vale por <b>1 hora</b> e só pode ser usado uma vez.</p>
<p style="margin:10px 0 0;font-size:14.5px;line-height:1.6;color:#5b6675">Não foi você? É só ignorar este e-mail: a sua senha atual continua valendo.</p>`
  return {
    assunto: 'Criar uma nova senha na Deepcar',
    html: modelo({ previa: 'O link para criar sua nova senha vale por 1 hora.', titulo: 'Vamos criar uma nova senha', corpo }),
    texto: `Olá, ${primeiro(u.nome)}.\n\nPara criar uma nova senha na Deepcar, abra este link (vale 1 hora, uma vez):\n${link}\n\nSe não foi você, ignore este e-mail.`,
  }
}
