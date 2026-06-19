import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initTheme } from './hooks/useTheme'
import { PasswordGate } from './components/PasswordGate'
import './index.css'
import App from './App.tsx'

initTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PasswordGate>
      <App />
    </PasswordGate>
  </StrictMode>,
)
