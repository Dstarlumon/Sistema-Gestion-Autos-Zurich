'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function createUser(data: {
  email: string
  password: string
  full_name: string
  role: string
}) {
  // Verify caller is coordinador
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'coordinador') throw new Error('No autorizado')

  // Use admin client to create user without affecting current session
  const admin = createAdminClient()
  const { data: newUser, error } = await admin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true, // auto-confirm
    user_metadata: { full_name: data.full_name },
  })

  if (error) throw new Error(error.message)

  // Update the profile role (trigger creates it as 'agente', we may need to promote)
  if (data.role !== 'agente' && newUser.user) {
    await admin
      .from('profiles')
      .update({ role: data.role })
      .eq('id', newUser.user.id)
  }

  return { success: true, userId: newUser.user?.id }
}
