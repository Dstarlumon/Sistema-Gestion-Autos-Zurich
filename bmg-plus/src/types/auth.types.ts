import type { Role, AgentStatus } from '@/lib/utils/constants'

export interface UserProfile {
  id: string
  organization_id: string
  full_name: string
  phone: string | null
  avatar_url: string | null
  role: Role
  status: AgentStatus
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AuthState {
  user: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
}
