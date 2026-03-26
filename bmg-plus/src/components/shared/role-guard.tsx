'use client'

import { useRole } from '@/hooks/use-role'
import type { Role } from '@/lib/utils/constants'

interface RoleGuardProps {
  allowed: Role[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RoleGuard({ allowed, children, fallback = null }: RoleGuardProps) {
  const { hasRole } = useRole()

  if (!hasRole(...allowed)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
