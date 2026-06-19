/**
 * Keep this file tiny: only `react-dom/client` is imported statically so that if the rest of the
 * graph fails (Vite prebundle, router, Tailwind, etc.), we can still show a DOM fallback instead of
 * leaving the user stuck on "Loading NEOM Cockpit…" from `index.html`.
 */
import { mountFatal } from './mountFatal'

const el = document.getElementById('root')
if (!el) {
  const pre = document.createElement('pre')
  pre.style.cssText = 'color:#f5f5f5;padding:16px;margin:0;font-family:system-ui,sans-serif'
  pre.textContent = 'Configuration error: index.html is missing <div id="root">.'
  document.body.append(pre)
} else {
  void import('./bootstrap')
    .then((mod) => {
      mod.mountApp(el)
    })
    .catch((err: unknown) => {
      console.error('[neom-boot] failed to load bootstrap bundle', err)
      mountFatal(el, err instanceof Error ? err : new Error(String(err)))
    })
}
