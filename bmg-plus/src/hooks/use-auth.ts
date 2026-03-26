'use client'

import { useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import type { UserProfile } from '@/types/auth.types'

export function useAuth() {
  const { user, isLoading, isAuthenticated, setUser, setLoading, clear } = useAuthStore()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const getProfile = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
          clear()
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (profile) {
          setUser(profile as UserProfile)
        } else {
          clear()
        }
      } catch {
        clear()
      }
    }

    getProfile()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          clear()
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Re-fetch profile on sign in
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          if (profile) {
            setUser(profile as UserProfile)
          }
        }
      }
    )

    return () => { subscription.unsubscribe() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = async () => {
    await supabase.auth.signOut()
    clear()
  }

  return { user, isLoading, isAuthenticated, signOut }
}
