import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from './app-shell'
import type { UserProfile } from '@/types/auth.types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Check if user needs onboarding (no organization linked)
  if (!profile.organization_id) {
    redirect('/onboarding')
  }

  return <AppShell initialProfile={profile as UserProfile}>{children}</AppShell>
}
