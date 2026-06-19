/** Plain DOM — no React — so we can render even when the app bundle fails to import. */

export function mountFatal(container: HTMLElement, err: Error) {
  container.replaceChildren()

  const wrap = document.createElement('div')
  wrap.style.cssText =
    'box-sizing:border-box;min-height:100vh;padding:24px;font-family:system-ui,sans-serif;background:#0a0a0a;color:#f5f5f5'

  const h1 = document.createElement('h1')
  h1.style.cssText = 'font-size:1.1rem;font-weight:600;margin:0 0 12px'
  h1.textContent = 'NEOM Cockpit failed to load'

  const p = document.createElement('p')
  p.style.cssText = 'font-size:13px;line-height:1.55;opacity:0.92;margin:0 0 14px;max-width:52rem'
  p.textContent =
    'The JavaScript bundle did not finish loading. After changing Vite config, delete node_modules/.vite and restart pnpm dev. Full reset: rm -rf node_modules node_modules/.vite, pnpm install, pnpm dev:stack. See README §5. Stack:'

  const pre = document.createElement('pre')
  pre.style.cssText =
    'font-size:11px;line-height:1.45;white-space:pre-wrap;word-break:break-word;margin:0;padding:14px;background:#111;border-radius:6px;overflow:auto;max-height:55vh'
  pre.textContent = `${err.message}\n\n${err.stack ?? '(no stack)'}`

  wrap.append(h1, p, pre)
  container.append(wrap)
}
