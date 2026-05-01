import axios from 'axios'
import { clearAccessToken, getAccessToken, setAccessToken } from '@/lib/auth/authHelpers'
import { useUIStore } from '@/stores/uiStore'
import { API } from './endpoints'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // envía la httpOnly cookie del refresh token
})

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (import.meta.env.DEV) {
    const role = useUIStore.getState().currentUser?.role
    config.headers['X-Dev-Role'] = role === 'admin' ? 'admin' : 'user'
  }
  return config
})

// --- Refresh token con deduplicación de múltiples tabs (EC-A) ---
let isRefreshing = false
let refreshQueue: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token!)
  })
  refreshQueue = []
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject })
      }).then((newToken) => {
        original.headers.Authorization = `Bearer ${newToken}`
        return apiClient(original)
      })
    }

    original._retry = true
    isRefreshing = true

    try {
      const { data } = await axios.post<{ accessToken: string }>(
        `${BASE_URL}${API.auth.refresh}`,
        {},
        { withCredentials: true },
      )
      setAccessToken(data.accessToken)
      processQueue(null, data.accessToken)
      original.headers.Authorization = `Bearer ${data.accessToken}`
      return apiClient(original)
    } catch (refreshError) {
      processQueue(refreshError, null)
      clearAccessToken()
      window.location.href = '/login'
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)
