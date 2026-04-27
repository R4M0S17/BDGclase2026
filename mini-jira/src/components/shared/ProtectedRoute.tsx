import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useUIStore } from '@/stores/uiStore'

interface Props {
  children: ReactNode
}

export default function ProtectedRoute({ children }: Props) {
  const accessToken = useUIStore((s) => s.accessToken)
  if (!accessToken) return <Navigate to="/login" replace />
  return <>{children}</>
}
