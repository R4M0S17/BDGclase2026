import type { ReactNode } from 'react'
import { useUIStore } from '@/stores/uiStore'
import type { Role } from '@/types'

interface Props {
  allowedRoles: Role[]
  children: ReactNode
  fallback?: ReactNode
}

export default function RoleGuard({ allowedRoles, children, fallback = null }: Props) {
  const currentUser = useUIStore((s) => s.currentUser)
  if (!currentUser || !allowedRoles.includes(currentUser.role as Role)) {
    return <>{fallback}</>
  }
  return <>{children}</>
}
