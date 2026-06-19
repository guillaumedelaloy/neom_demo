// Returns the API base URL. Empty string = same-origin (Vite dev proxy).
// Prefers NEXT_PUBLIC_API_URL (already set in Vercel) then VITE_API_BASE_URL.
export function getApiBase(): string {
  return import.meta.env.NEXT_PUBLIC_API_URL || import.meta.env.VITE_API_BASE_URL || ''
}
