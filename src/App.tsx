import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { CeoIntelligenceProvider } from './intelligence/CeoIntelligenceProvider'
import { AppLayout } from './components/layout/AppLayout'
import { Landing } from './pages/Landing'
import { ExecutiveSummary } from './pages/ExecutiveSummary'
import { Enablers } from './pages/Enablers'
import { Exploration } from './pages/Exploration'
import { GrowthPortfolio } from './pages/GrowthPortfolio'
import { People } from './pages/People'
import { Financials } from './pages/Financials'
import { RiskFinance } from './pages/RiskFinance'
import { SafetyEsg } from './pages/SafetyEsg'
import { StrategyStatus } from './pages/StrategyStatus'
import { Technology } from './pages/Technology'

export default function App() {
  return (
    <BrowserRouter>
      <CeoIntelligenceProvider>
        <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Landing />} />
          <Route path="dashboard" element={<ExecutiveSummary />} />
          <Route path="strategy-status" element={<StrategyStatus />} />
          <Route path="portfolio" element={<GrowthPortfolio />} />
          <Route path="enablers" element={<Enablers />} />
          <Route path="exploration" element={<Exploration />} />
          <Route path="technology" element={<Technology />} />
          <Route path="people" element={<People />} />
          <Route path="safety-esg" element={<SafetyEsg />} />
          <Route path="financials" element={<Financials />} />
          <Route path="risks" element={<RiskFinance />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </CeoIntelligenceProvider>
    </BrowserRouter>
  )
}
