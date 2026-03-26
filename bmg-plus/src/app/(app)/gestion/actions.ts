'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'

type GestionInsert = Database['public']['Tables']['gestiones']['Insert']
type SaleInsert = Database['public']['Tables']['sales']['Insert']

interface GestionInput {
  lead_id: string
  campaign_id: string
  organization_id: string
  tipificacion_id: string
  canal: GestionInsert['canal']
  medio?: string
  cotizacion?: boolean
  num_cotizacion?: string
  valor_poliza?: number
  observacion?: string
  retry_scheduled_at?: string
  next_contact_at?: string
}

interface SaleInput {
  nombre_cliente: string
  documento?: string
  telefono?: string
  correo?: string
  placa?: string
  ciudad?: string
  valor_prima: number
  num_poliza?: string
  tipo_seguro?: string
  medio_pago?: string
  fecha_emision?: string
  canal?: string
}

export async function submitGestion(
  gestionData: GestionInput,
  newLeadStatus: string | null,
  saleData?: SaleInput
) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  // 1. Create gestion
  const { data: gestion, error: gestionError } = await supabase
    .from('gestiones')
    .insert({
      ...gestionData,
      agent_id: user.id,
    } satisfies GestionInsert)
    .select()
    .single()

  if (gestionError) throw new Error('Error al crear gestion: ' + gestionError.message)

  // 2. Create sale if tipificacion = Venta
  if (saleData) {
    const { error: saleError } = await supabase
      .from('sales')
      .insert({
        ...saleData,
        lead_id: gestionData.lead_id,
        gestion_id: gestion.id,
        agent_id: user.id,
        campaign_id: gestionData.campaign_id,
        organization_id: gestionData.organization_id,
      } satisfies SaleInsert)

    if (saleError) throw new Error('Error al crear venta: ' + saleError.message)
  }

  // 3. Update lead status (if applicable)
  if (newLeadStatus) {
    const { error: leadError } = await supabase
      .from('leads')
      .update({ status: newLeadStatus as Database['public']['Enums']['lead_status'] })
      .eq('id', gestionData.lead_id)

    if (leadError) throw new Error('Error al actualizar lead: ' + leadError.message)
  }

  return { success: true, gestion }
}
