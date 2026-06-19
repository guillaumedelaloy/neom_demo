import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initTheme } from './hooks/useTheme'
import { PasswordGate } from './components/PasswordGate'
import { RootErrorBoundary } from './components/RootErrorBoundary'
import './index.css'
import App from './App.tsx'

/** Separated from `main.tsx` so a dynamic `import()` can catch load/eval failures before React mounts. */
export function mountApp(container: HTMLElement) {
  initTheme()
  const root = createRoot(container)
  root.render(
    <StrictMode>
      <RootErrorBoundary>
        <PasswordGate>
          <App />
        </PasswordGate>
      </RootErrorBoundary>
    </StrictMode>,
  )
}
