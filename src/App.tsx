import { Navigate, Route, Routes } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import AppLayout from './layouts/AppLayout'
import SectionPage from './pages/SectionPage'
import EsquemaPage from './pages/EsquemaPage'
import Conta from './pages/Conta'
import VeiculoPage from './pages/VeiculoPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Navigate to="/app/injecao/leve" replace />} />
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
  )
}
