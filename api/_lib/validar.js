// Validacao de cadastro. O navegador valida para dar resposta imediata;
// aqui e onde a regra realmente vale, porque a API tambem recebe chamada direta.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const emailValido = (v) => EMAIL_RE.test(String(v ?? '').trim())

/** Nome de gente: duas letras que seja, e nada de e-mail ou numero no lugar do nome. */
export function nomeValido(v) {
  const n = String(v ?? '').trim()
  return n.length >= 2 && n.length <= 80 && /\p{L}/u.test(n) && !/[@\d]/.test(n)
}

/**
 * WhatsApp brasileiro em digitos, com DDI: 5511987654321.
 * Devolve null quando nao da para aproveitar o que foi digitado.
 */
export function normalizarWhatsapp(bruto) {
  const digitos = String(bruto ?? '').replace(/\D/g, '')
  // 13 digitos = ja veio com o 55 na frente; 11 = so DDD + numero (DDD 55 existe, por isso o teste de tamanho)
  const local = digitos.startsWith('55') && digitos.length > 11 ? digitos.slice(2) : digitos
  if (local.length !== 11) return null
  const ddd = Number(local.slice(0, 2))
  if (ddd < 11 || ddd > 99) return null
  if (local[2] !== '9') return null // celular no Brasil sempre comeca com 9
  return `55${local}`
}

/** 5511987654321 → (11) 98765-4321, para as telas. */
export function formatarWhatsapp(guardado) {
  const d = String(guardado ?? '').replace(/\D/g, '')
  const local = d.startsWith('55') && d.length > 11 ? d.slice(2) : d
  if (local.length !== 11) return guardado ?? ''
  return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
}

export const SENHA_MINIMA = 8
export const senhaValida = (v) => String(v ?? '').length >= SENHA_MINIMA
