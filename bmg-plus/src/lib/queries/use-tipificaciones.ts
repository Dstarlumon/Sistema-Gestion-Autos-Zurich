'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useTipificaciones(campaignId?: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['tipificaciones', campaignId],
    queryFn: async () => {
      let query = supabase
        .from('tipificacion_tree')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
        .order('name')

      // Get global tipificaciones (campaign_id is null) or campaign-specific
      if (campaignId) {
        query = query.or(`campaign_id.is.null,campaign_id.eq.${campaignId}`)
      } else {
        query = query.is('campaign_id', null)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
  })
}
