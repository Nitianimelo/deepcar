// Login local: confere usuário e senha contra uma lista simples (config.json do executável ou variáveis de ambiente).
// Sem dependência do Vite: usado pelo servidor de desenvolvimento e pelo Deepcar.exe.
//
// Padrão quando nada é configurado: usuário "nini", senha "1234".

export const USUARIOS_PADRAO = [{ usuario: 'nini', senha: '1234', nome: 'Nini', oficina: 'Minha oficina', plano: 'Profissional' }]

export function usuariosDe(env = process.env, config = null) {
  if (config?.usuarios?.length) return config.usuarios
  if (env.LOGIN_USUARIO && env.LOGIN_SENHA) {
    return [{ usuario: env.LOGIN_USUARIO, senha: env.LOGIN_SENHA, nome: env.LOGIN_NOME || env.LOGIN_USUARIO, oficina: env.LOGIN_OFICINA || 'Minha oficina', plano: 'Profissional' }]
  }
  return USUARIOS_PADRAO
}

const norm = (s) => String(s ?? '').trim().toLowerCase()

/** Retorna a sessão (sem a senha) ou lança erro com status 401. */
export function autenticar(usuario, senha, usuarios) {
  const u = usuarios.find((x) => norm(x.usuario) === norm(usuario))
  if (!u || String(u.senha) !== String(senha ?? '')) {
    throw Object.assign(new Error('Usuário ou senha incorretos.'), { status: 401 })
  }
  return { nome: u.nome || u.usuario, email: u.usuario, oficina: u.oficina || 'Minha oficina', plano: u.plano || 'Profissional' }
}

/** Lê o corpo JSON de uma requisição Node (http.IncomingMessage). */
export function lerJson(req, limite = 16 * 1024) {
  return new Promise((resolve, reject) => {
    let dados = ''
    req.on('data', (c) => { dados += c; if (dados.length > limite) { reject(Object.assign(new Error('Requisição grande demais.'), { status: 413 })); req.destroy() } })
    req.on('end', () => { try { resolve(dados ? JSON.parse(dados) : {}) } catch { reject(Object.assign(new Error('JSON inválido.'), { status: 400 })) } })
    req.on('error', reject)
  })
}
