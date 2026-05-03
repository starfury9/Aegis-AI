import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AegisStudio from './AegisStudio.tsx'
import SiteLayout from './components/SiteLayout.tsx'
import DashboardPage from './pages/DashboardPage.tsx'
import DonatePage from './pages/DonatePage.tsx'
import LandingPage from './pages/LandingPage.tsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/donate" element={<DonatePage />} />
        </Route>
        <Route path="/app" element={<AegisStudio />} />
      </Routes>
    </BrowserRouter>
  )
}
