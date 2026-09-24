// /excluir-conta — apagar a própria conta pela web. A Google Play exige este endereço público além da
// opção dentro do app; quem chega sem sessão entra e volta para cá.
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { LockKeyhole, Trash2 } from 'lucide-react'
import { PaginaSimples } from '../components/PaginaSimples'
import { excluirConta, useSessao } from '../lib/auth'
import { useTitulo } from '../lib/seo'

const EMAIL = (import.meta.env.VITE_SUPORTE_EMAIL as string | undefined) ?? 'suporte@deepcar.com.br'

export default function ExcluirConta() {
  useTitulo('Excluir conta · Deepcar')
  const { session, conferindo } = useSessao()
  const [feito, setFeito] = useState(false)

  return (
    <PaginaSimples rotulo="Conta" titulo="Excluir sua conta">
      <p>
        Ao excluir a conta, apagamos na hora o seu cadastro (nome, e-mail, WhatsApp e oficina), as sessões abertas em
        todos os aparelhos e os links de esquema que você compartilhou. Não dá para desfazer.
      </p>
      <p>
        Os registros de pagamento continuam guardados pelo prazo da legislação fiscal, sem ligação com a conta. A exclusão
        não cancela uma assinatura mensal na Cakto: se você tem uma, peça o cancelamento pelo e-mail{' '}
        <a href={`mailto:${EMAIL}`}>{EMAIL}</a> antes de excluir a conta.
      </p>
      <p>
        Pelo aplicativo Android: <b>Conta → Excluir conta</b>. Detalhes na <Link to="/privacidade">política de privacidade</Link>.
      </p>

      <div className="mt-8 rounded-2xl border seam bg-bench-2 p-6 sm:p-7">
        {feito ? (
          <p role="status" className="text-ink-1">Sua conta foi excluída. Obrigado por ter usado o Deepcar.</p>
        ) : conferindo && !session ? (
          <div aria-busy="true" className="skeleton h-24 rounded-xl" />
        ) : session ? (
          <Formulario email={session.email} admin={session.papel === 'admin'} onFeito={() => setFeito(true)} />
        ) : (
          <>
            <p className="text-ink-2">Entre na conta que você quer excluir para continuar.</p>
            <Link
              to="/login"
              state={{ from: '/excluir-conta' }}
              className="btn-primary mt-5 inline-flex items-center justify-center px-6"
            >
              Entrar
            </Link>
            <p className="mt-4 text-[13px] text-ink-4">
              Não consegue entrar? Peça a exclusão pelo e-mail <a href={`mailto:${EMAIL}`}>{EMAIL}</a>, usando o e-mail da conta.
            </p>
          </>
        )}
      </div>
    </PaginaSimples>
  )
}

function Formulario({ email, admin, onFeito }: { email: string; admin: boolean; onFeito: () => void }) {
  const [senha, setSenha] = useState('')
  const [certeza, setCerteza] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!senha || !certeza) return
    setErro(null)
    setEnviando(true)
    try {
      await excluirConta(senha)
      onFeito()
    } catch (err) {
      setErro((err as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  if (admin) return <p className="text-ink-2">Conta de administrador ({email}) não pode ser excluída por aqui.</p>

  return (
    <form onSubmit={enviar} noValidate>
      <p className="text-ink-2">
        Conta conectada: <b className="font-medium text-ink-1">{email}</b>
      </p>
      <label className="mt-5 block">
        <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Confirme a sua senha</span>
        <span className="relative block">
          <LockKeyhole size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-4" />
          <input
            className="field pl-11"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            aria-invalid={!!erro}
          />
        </span>
      </label>
      <label className="mt-4 flex cursor-pointer items-start gap-3 text-[14px] text-ink-2">
        <input type="checkbox" checked={certeza} onChange={(e) => setCerteza(e.target.checked)} className="mt-1 h-4 w-4 flex-none accent-[#e5484d]" />
        Entendo que a conta e os dados dela serão apagados para sempre.
      </label>
      {erro && <p role="alert" className="mt-4 rounded-lg border border-fault/30 bg-fault/10 px-3.5 py-2.5 text-[13.5px] text-fault">{erro}</p>}
      <button
        type="submit"
        disabled={!senha || !certeza || enviando}
        className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-fault/40 bg-fault/15 text-[15px] font-medium text-fault transition-colors hover:bg-fault/25 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-6"
      >
        <Trash2 size={17} /> {enviando ? 'Excluindo…' : 'Excluir minha conta'}
      </button>
    </form>
  )
}
