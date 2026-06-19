import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'neom-theme'

export type ThemeMode = 'light' | 'dark'

function getStored(): ThemeMode | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    /* ignore */
  }
  return null
}

function getSystem(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readMode(): ThemeMode {
  /* NEOM web experience is dark-first; honor explicit choice or system preference after first visit. */
  return getStored() ?? 'dark'
}

function apply(mode: ThemeMode) {
  document.documentElement.classList.toggle('dark', mode === 'dark')
}

let mode: ThemeMode = readMode()
const listeners = new Set<() => void>()

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

function getSnapshot() {
  return mode
}

function getServerSnapshot(): ThemeMode {
  return 'dark'
}

export function initTheme() {
  mode = readMode()
  apply(mode)
  if (typeof window === 'undefined') return
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getStored() != null) return
    mode = getSystem()
    apply(mode)
    listeners.forEach((l) => l())
  })
}

export function useTheme() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setTheme = useCallback((next: ThemeMode) => {
    mode = next
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
    apply(next)
    listeners.forEach((l) => l())
  }, [])

  const toggle = useCallback(() => {
    setTheme(current === 'dark' ? 'light' : 'dark')
  }, [current, setTheme])

  return { theme: current, setTheme, toggle }
}
