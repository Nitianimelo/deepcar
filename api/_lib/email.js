// E-mails da Deepcar pelo Resend (07/10/2026). Remetente "Deepcar <contato@deepcar.app.br>" (domínio verificado no
// Resend, DNS na Vercel; recebimento também no Resend). Respostas vão para o e-mail de suporte (reply_to).
// Chave no cofre: RESEND_API_KEY (só envio). Sem chave ou com erro, nunca derruba quem chamou.
// Modelo: tabela de 600 px com estilos em linha (o que Gmail/Outlook/Apple Mail respeitam), topo escuro com a logo
// branca (public/brand/email-logo.png), corpo claro, um botão principal e o rodapé com o WhatsApp do suporte.
import { segredo } from './segredos.js'

const DE = 'Deepcar <contato@deepcar.app.br>'
const RESPONDER_PARA = 'nitiani@compilla.dev'
export const SITE = 'https://deepcar.app.br'
const WHATSAPP = '554831973217'
const WHATSAPP_VISIVEL = '(48) 3197-3217'
const AZUL = '#2b7de9'

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Botão que funciona até no Outlook (tabela + link com padding). */
export const botao = (texto, url, cor = AZUL) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px"><tr><td style="border-radius:12px;background:${cor}">
  <a href="${esc(url)}" style="display:inline-block;padding:16px 30px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:12px">${esc(texto)}</a>
</td></tr></table>`

/** Casca comum: `previa` é o texto que aparece ao lado do assunto na caixa de entrada. */
export function modelo({ previa, titulo, corpo }) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(titulo)}</title></head>
<body style="margin:0;padding:0;background:#eef1f5">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(previa)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef1f5"><tr><td align="center" style="padding:28px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;border-radius:18px;overflow:hidden;background:#ffffff;box-shadow:0 6px 24px rgba(15,23,42,.08)">
    <tr><td style="background:#151b24;padding:30px 36px 26px">
      <a href="${SITE}" style="text-decoration:none"><img src="${SITE}/brand/email-logo.png" width="176" height="48" alt="Deepcar" style="display:block;border:0;outline:none;width:176px;height:48px"></a>
      <div style="margin-top:22px;height:3px;width:56px;border-radius:3px;background:${AZUL}"></div>
    </td></tr>
    <tr><td style="padding:36px 36px 30px;font-family:Arial,Helvetica,sans-serif;color:#0f1419">
      <h1 style="margin:0 0 14px;font-size:24px;line-height:1.3;font-weight:bold;color:#0f1419">${esc(titulo)}</h1>
      ${corpo}
    </td></tr>
    <tr><td style="padding:22px 36px 28px;background:#f6f8fa;border-top:1px solid #e6eaef;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#5b6675">
      Dúvida ou problema? Fale com a gente no WhatsApp
      <a href="https://wa.me/${WHATSAPP}" style="color:${AZUL};font-weight:bold;text-decoration:none">${WHATSAPP_VISIVEL}</a>
      ou responda este e-mail.<br>
      <span style="color:#8b98a5">Deepcar · esquemas elétricos automotivos · <a href="${SITE}" style="color:#8b98a5">deepcar.app.br</a></span>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`
}

/** Manda um e-mail. Devolve o id do Resend, ou null (sem chave ou falha). */
export async function enviarEmail({ para, assunto, html, texto, etiqueta }) {
  try {
    const chave = await segredo('RESEND_API_KEY')
    if (!chave || !para) return null
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: DE, to: [para], reply_to: RESPONDER_PARA, subject: assunto, html, text: texto,
        tags: etiqueta ? [{ name: 'tipo', value: etiqueta }] : undefined }),
      signal: AbortSignal.timeout(6000),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) { console.error('[email]', r.status, JSON.stringify(d).slice(0, 200)); return null }
    return d.id ?? null
  } catch (err) {
    console.error('[email]', err.message)
    return null
  }
}

export { esc, AZUL }
