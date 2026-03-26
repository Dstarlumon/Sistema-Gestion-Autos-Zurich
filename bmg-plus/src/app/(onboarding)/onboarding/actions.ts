'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

interface TeamMember {
  email: string
  role: 'agente' | 'supervisor'
}

interface OnboardingData {
  name: string
  industry: string
  config: {
    timezone: string
    currency: string
    sla_hours: number
    max_pause_minutes: number
    daily_goal: number
  }
  teamMembers?: TeamMember[]
}

export async function createOrganization(data: OnboardingData) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  // 1. Create organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: data.name,
      industry: data.industry,
      plan: 'starter',
      config: data.config,
    })
    .select('id')
    .single()

  if (orgError || !org) throw new Error('Error al crear organizacion: ' + orgError?.message)

  // 2. Link coordinator profile to organization
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ organization_id: org.id })
    .eq('id', user.id)

  if (profileError) throw new Error('Error al vincular perfil')

  // 3. Seed campaigns based on industry
  const campaignsByIndustry: Record<string, Array<{ name: string; slug: string; color: string; icon: string }>> = {
    seguros: [
      { name: 'Autos', slug: 'autos', color: '#3b82f6', icon: '🚗' },
      { name: 'Hogar', slug: 'hogar', color: '#059669', icon: '🏠' },
      { name: 'Hogar Renovaciones', slug: 'hogar_renov', color: '#0d9488', icon: '🔄' },
      { name: 'Arrendamiento', slug: 'arrendamiento', color: '#7c3aed', icon: '🏢' },
      { name: 'Pymes', slug: 'pymes', color: '#d97706', icon: '🏪' },
      { name: 'DirecTV', slug: 'directv', color: '#dc2626', icon: '📺' },
      { name: 'Inbound/Chatbot', slug: 'inbound', color: '#0284c7', icon: '📞' },
    ],
    telecomunicaciones: [
      { name: 'Movil', slug: 'movil', color: '#3b82f6', icon: '📱' },
      { name: 'Internet', slug: 'internet', color: '#059669', icon: '🌐' },
      { name: 'TV', slug: 'tv', color: '#dc2626', icon: '📺' },
      { name: 'Convergente', slug: 'convergente', color: '#7c3aed', icon: '📦' },
    ],
    financiero: [
      { name: 'Creditos', slug: 'creditos', color: '#3b82f6', icon: '💳' },
      { name: 'Tarjetas', slug: 'tarjetas', color: '#d97706', icon: '💰' },
      { name: 'Cuentas', slug: 'cuentas', color: '#059669', icon: '🏦' },
      { name: 'Seguros', slug: 'seguros', color: '#7c3aed', icon: '🛡️' },
    ],
    salud: [
      { name: 'EPS', slug: 'eps', color: '#059669', icon: '🏥' },
      { name: 'Medicina Prepagada', slug: 'medicina', color: '#3b82f6', icon: '💊' },
      { name: 'Citas', slug: 'citas', color: '#d97706', icon: '📅' },
    ],
    otro: [
      { name: 'General', slug: 'general', color: '#3b82f6', icon: '📋' },
    ],
  }

  const campaigns = campaignsByIndustry[data.industry] || campaignsByIndustry.otro

  const { data: createdCampaigns } = await supabase
    .from('campaigns')
    .insert(campaigns.map(c => ({ ...c, organization_id: org.id })))
    .select('id, slug')

  // 4. Seed campaign bases per campaign
  if (createdCampaigns) {
    const bases = createdCampaigns.flatMap(c => {
      const defaultBases = ['Directo', 'Pauta', 'Inbound', 'Chatbot']
      return defaultBases.map(name => ({ campaign_id: c.id, name }))
    })
    await supabase.from('campaign_bases').insert(bases)
  }

  // 5. Seed FULL tipificacion tree (all 33 nodes, not just roots)
  const orgId = org.id

  // Level 1 roots
  const roots = [
    { name: 'NO APTO', level: 1, sort_order: 1 },
    { name: 'NO CONTACTO', level: 1, sort_order: 2 },
    { name: 'CONTACTADO - NO COTIZA', level: 1, sort_order: 3 },
    { name: 'POSITIVO', level: 1, sort_order: 4 },
  ]

  const { data: rootNodes } = await supabase
    .from('tipificacion_tree')
    .insert(roots.map(r => ({ ...r, organization_id: orgId })))
    .select('id, name')

  if (rootNodes) {
    const rootMap = Object.fromEntries(rootNodes.map(r => [r.name, r.id]))

    const children = [
      // NO APTO children
      { parent_id: rootMap['NO APTO'], name: 'Cliente Ya Tiene Seguro Con Zurich Intermediario', level: 2, sort_order: 1 },
      { parent_id: rootMap['NO APTO'], name: 'Cliente Ya Tiene Seguro Con Zurich Directo', level: 2, sort_order: 2 },
      { parent_id: rootMap['NO APTO'], name: 'Esta Asesorado Por Un Asesor Zurich', level: 2, sort_order: 3 },
      { parent_id: rootMap['NO APTO'], name: 'Es Un Intermediario De Zurich', level: 2, sort_order: 4 },
      { parent_id: rootMap['NO APTO'], name: 'Registro Duplicado', level: 2, sort_order: 5 },
      { parent_id: rootMap['NO APTO'], name: 'Servicio al cliente', level: 2, sort_order: 6 },
      // NO CONTACTO children
      { parent_id: rootMap['NO CONTACTO'], name: 'No contesta', level: 2, sort_order: 1 },
      { parent_id: rootMap['NO CONTACTO'], name: 'Cliente cuelga - Llamada caida', level: 2, sort_order: 2 },
      { parent_id: rootMap['NO CONTACTO'], name: 'Datos No Corresponden (Numero - Rpl)', level: 2, sort_order: 3 },
      { parent_id: rootMap['NO CONTACTO'], name: 'No contacto - sin datos', level: 2, sort_order: 4 },
      { parent_id: rootMap['NO CONTACTO'], name: 'Buzon de voz', level: 2, sort_order: 5 },
      // CONTACTADO - NO COTIZA children
      { parent_id: rootMap['CONTACTADO - NO COTIZA'], name: 'No esta interesado en comprar', level: 2, sort_order: 1 },
      { parent_id: rootMap['CONTACTADO - NO COTIZA'], name: 'Volver a llamar', level: 2, sort_order: 2 },
      { parent_id: rootMap['CONTACTADO - NO COTIZA'], name: 'Contacto con tercero', level: 2, sort_order: 3 },
      { parent_id: rootMap['CONTACTADO - NO COTIZA'], name: 'Interesado en otro producto', level: 2, sort_order: 4 },
      { parent_id: rootMap['CONTACTADO - NO COTIZA'], name: 'Interesado en SOAT', level: 2, sort_order: 5 },
      { parent_id: rootMap['CONTACTADO - NO COTIZA'], name: 'Vendio el vehiculo', level: 2, sort_order: 6 },
      { parent_id: rootMap['CONTACTADO - NO COTIZA'], name: 'Cliente informa que no se registro', level: 2, sort_order: 7 },
      { parent_id: rootMap['CONTACTADO - NO COTIZA'], name: 'Mala experiencia con Zurich', level: 2, sort_order: 8 },
      { parent_id: rootMap['CONTACTADO - NO COTIZA'], name: 'No asegurable por MARCA', level: 2, sort_order: 9 },
      { parent_id: rootMap['CONTACTADO - NO COTIZA'], name: 'No asegurable por POLITICAS', level: 2, sort_order: 10 },
      { parent_id: rootMap['CONTACTADO - NO COTIZA'], name: 'Ya lo compro con otra compania', level: 2, sort_order: 11 },
      { parent_id: rootMap['CONTACTADO - NO COTIZA'], name: 'Se decidio con otra compania', level: 2, sort_order: 12 },
      { parent_id: rootMap['CONTACTADO - NO COTIZA'], name: 'Solo esta cotizando', level: 2, sort_order: 13 },
      { parent_id: rootMap['CONTACTADO - NO COTIZA'], name: 'Precio con otra aseguradora', level: 2, sort_order: 14 },
      { parent_id: rootMap['CONTACTADO - NO COTIZA'], name: 'No venta', level: 2, sort_order: 15 },
      // POSITIVO children
      { parent_id: rootMap['POSITIVO'], name: 'En proceso', level: 2, sort_order: 1 },
      { parent_id: rootMap['POSITIVO'], name: 'Pendiente inspeccion', level: 2, sort_order: 2 },
      { parent_id: rootMap['POSITIVO'], name: 'Venta', level: 2, sort_order: 3 },
    ]

    await supabase
      .from('tipificacion_tree')
      .insert(children.map(c => ({ ...c, organization_id: orgId })))
  }

  // 6. Create team members if provided
  if (data.teamMembers && data.teamMembers.length > 0) {
    const admin = createAdminClient()

    for (const member of data.teamMembers) {
      try {
        const { data: newUser } = await admin.auth.admin.createUser({
          email: member.email,
          password: Math.random().toString(36).slice(-10) + 'A1!', // temp password
          email_confirm: true,
          user_metadata: { full_name: member.email.split('@')[0] },
        })

        if (newUser?.user) {
          // Set org_id and role
          await admin.from('profiles')
            .update({ organization_id: org.id, role: member.role })
            .eq('id', newUser.user.id)
        }
      } catch (e) {
        // Skip failed invites, don't block the whole flow
        console.error('Failed to create team member:', member.email, e)
      }
    }
  }

  redirect('/dashboard')
}
