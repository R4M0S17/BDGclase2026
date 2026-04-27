import { useUIStore } from '@/stores/uiStore'
import { setAccessToken } from '@/lib/auth/authHelpers'

// DEV BYPASS: simula el redirect OAuth sin backend real
export function redirectToOAuth(): void {
  setAccessToken('mock-token-dev-' + Date.now())
  useUIStore.getState().setCurrentUser({
    id: 'usr-001',
    name: 'Ana García',
    role: 'admin',
  })
}

export function extractTokenFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')
  if (token) {
    const clean = window.location.pathname
    window.history.replaceState({}, '', clean)
  }
  return token
}
