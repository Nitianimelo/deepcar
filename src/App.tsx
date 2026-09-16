import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Landing from './pages/Landing'

// Só a landing entra no pacote inicial. O resto chega quando a rota é aberta —
// quem só visita a página inicial não baixa o visualizador nem a impressão.
const Login = lazy(() => import('./pages/Login'))
const Cadastro = lazy(() => import('./pages/Cadastro'))
const Admin = lazy(() => import('./pages/Admin'))
const AppLayout = lazy(() => import('./layouts/AppLayout'))
const Inicio = lazy(() => import('./pages/Inicio'))
const Busca = lazy(() => import('./pages/Busca'))
const SectionPage = lazy(() => import('./pages/SectionPage'))
const EsquemaPage = lazy(() => import('./pages/EsquemaPage'))
const Conta = lazy(() => import('./pages/Conta'))
const VeiculoPage = lazy(() => import('./pages/VeiculoPage'))

export default function App() {
  return (
    <Suspense fallback={<div aria-busy="true" className="min-h-screen bg-bench-1" />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Inicio />} />
          <Route path="busca" element={<Busca />} />
          <Route path="injecao/leve" element={<SectionPage secao="injecao-leve" />} />
          <Route path="injecao/diesel" element={<SectionPage secao="injecao-diesel" />} />
          <Route path="abs" element={<SectionPage secao="abs" />} />
          <Route path="eletrica" element={<SectionPage secao="eletrica" />} />
          <Route path="cambio" element={<SectionPage secao="cambio" />} />
          <Route path="esquema/*" element={<EsquemaPage />} />
          <Route path="veiculo/:placa" element={<VeiculoPage />} />
          <Route path="conta" element={<Conta />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
