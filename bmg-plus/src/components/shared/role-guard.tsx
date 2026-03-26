'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRole } from '@/hooks/use-role'
import type { Role } from '@/lib/utils/constants'

interface RoleGuardProps {
  allowed: Role[]
  children: React.ReactNode
  fallback?: React.ReactNode
  redirect?: string
}

export function RoleGuard({ allowed, children, fallback = null, redirect }: RoleGuardProps) {
  const { hasRole } = useRole()
  const router = useRouter()
  const authorized = hasRole(...allowed)

  useEffect(() => {
    if (!authorized && redirect) {
      router.replace(redirect)
    }
  }, [authorized, redirect, router])

  if (!authorized) {
    // When redirecting, render nothing to avoid flash of fallback content
    if (redirect) return null
    return <>{fallback}</>
  }

  return <>{children}</>
}
