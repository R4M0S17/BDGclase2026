import { useUIStore } from '@/stores/uiStore'

export function getAccessToken(): string | null {
  return useUIStore.getState().accessToken
}

export function setAccessToken(token: string): void {
  useUIStore.getState().setAccessToken(token)
}

export function clearAccessToken(): void {
  useUIStore.getState().setAccessToken(null)
  useUIStore.getState().setCurrentUser(null)
}

export function isAuthenticated(): boolean {
  return useUIStore.getState().accessToken !== null
}
