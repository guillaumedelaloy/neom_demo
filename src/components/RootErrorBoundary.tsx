import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[RootErrorBoundary]', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (error) {
      return (
        <div
          style={{
            boxSizing: 'border-box',
            minHeight: '100vh',
            margin: 0,
            padding: 24,
            fontFamily: 'system-ui, sans-serif',
            background: '#0a0a0a',
            color: '#f5f5f5',
          }}
        >
          <h1 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 12px' }}>
            NEOM Cockpit could not start
          </h1>
          <pre
            style={{
              fontSize: 12,
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              opacity: 0.92,
              margin: 0,
            }}
          >
            {error.message}
          </pre>
          <p style={{ fontSize: 12, opacity: 0.7, marginTop: 16, maxWidth: 520 }}>
            Check the browser console (devtools) for the full stack. If you just upgraded dependencies, try
            clearing Vite cache: delete <code style={{ opacity: 0.9 }}>node_modules/.vite</code> and restart{' '}
            <code style={{ opacity: 0.9 }}>pnpm dev</code>.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}
