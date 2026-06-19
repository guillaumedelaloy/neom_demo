import { useState, type ReactNode } from 'react'
import { getApiBase } from '../lib/api'

const STORAGE_KEY = 'ma-auth-ok'

// Baked in at build time — optional fallback if backend has no credentials or is unreachable
const BAKED_USER = import.meta.env.VITE_BASIC_AUTH_USER?.trim() ?? ''
const BAKED_PASS = import.meta.env.VITE_BASIC_AUTH_PASS?.trim() ?? ''

function getStoredAuth(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === '1' } catch { return false }
}

function setStoredAuth() {
  try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* ignore */ }
}

export function PasswordGate({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(getStoredAuth)
  const [user, setUser]     = useState('')
  const [pass, setPass]     = useState('')
  const [error, setError]   = useState(false)
  const [loading, setLoading] = useState(false)

  if (authed) return <>{children}</>

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(false)
    try {
      const res = await fetch(`${getApiBase()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.trim(), password: pass }),
      })
      const data = await res.json() as { enabled: boolean; ok: boolean }
      if (data.ok && data.enabled) {
        setStoredAuth()
        setAuthed(true)
      } else if (!data.enabled && BAKED_USER && BAKED_PASS) {
        // Backend has no credentials set — fall back to baked-in Vercel env vars
        if (user.trim() === BAKED_USER && pass === BAKED_PASS) {
          setStoredAuth()
          setAuthed(true)
        } else {
          setError(true)
          setPass('')
        }
      } else if (!data.enabled) {
        // Auth fully disabled on both backend and frontend
        setStoredAuth()
        setAuthed(true)
      } else {
        setError(true)
        setPass('')
      }
    } catch {
      // Backend unreachable — fall back to baked-in env vars if available
      if (BAKED_USER && BAKED_PASS) {
        if (user.trim() === BAKED_USER && pass === BAKED_PASS) {
          setStoredAuth()
          setAuthed(true)
        } else {
          setError(true)
          setPass('')
        }
      } else {
        // No credentials anywhere — fail open for local dev
        setStoredAuth()
        setAuthed(true)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-ma-bg">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-sm border border-ma-line bg-ma-elevated p-8 shadow-[0_4px_24px_rgba(15,18,16,0.12)]"
      >
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-sm border border-ma-accent/35 bg-ma-accent/10 text-ma-accent text-sm font-bold">N</span>
          <div>
            <p className="text-[13px] font-semibold text-ma-ink">NEOM CEO Cockpit</p>
            <p className="text-[11px] text-ma-muted">Sign in to continue</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-ma-muted" htmlFor="pg-user">Username</label>
            <input
              id="pg-user"
              type="text"
              autoComplete="username"
              value={user}
              onChange={e => { setUser(e.target.value); setError(false) }}
              className="w-full rounded-sm border border-ma-line bg-ma-surface px-3 py-2 text-[13px] text-ma-ink outline-none ring-ma-accent/30 placeholder:text-ma-muted focus:border-ma-accent/40 focus:ring-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-ma-muted" htmlFor="pg-pass">Password</label>
            <input
              id="pg-pass"
              type="password"
              autoComplete="current-password"
              value={pass}
              onChange={e => { setPass(e.target.value); setError(false) }}
              className="w-full rounded-sm border border-ma-line bg-ma-surface px-3 py-2 text-[13px] text-ma-ink outline-none ring-ma-accent/30 placeholder:text-ma-muted focus:border-ma-accent/40 focus:ring-2"
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 border-l-2 border-ma-amber-warn pl-3 text-[11px] text-ma-amber-warn">
            Invalid credentials — try again.
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded-sm border border-ma-accent/50 bg-ma-accent/15 py-2 text-[12px] font-semibold text-ma-ink transition hover:bg-ma-accent/25 active:translate-y-px disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
