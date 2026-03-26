'use client'

import { useAuthStore } from '@/stores/auth-store'
import type { Role } from '@/lib/utils/constants'

export function useRole() {
  const user = useAuthStore((s) => s.user)
  const role = user?.role ?? null

  const isCoordinador = role === 'coordinador'
  const isSupervisor = role === 'supervisor'
  const isAgente = role === 'agente'
  const canSupervise = isCoordinador || isSupervisor
  const canAdmin = isCoordinador

  const hasRole = (...roles: Role[]) => role ? roles.includes(role) : false

  return { role, isCoordinador, isSupervisor, isAgente, canSupervise, canAdmin, hasRole }
}
