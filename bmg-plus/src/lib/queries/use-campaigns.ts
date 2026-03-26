'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useCampaigns() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data || []
    },
  })
}

export function useCampaignBases(campaignId: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['campaign-bases', campaignId],
    queryFn: async () => {
      if (!campaignId) return []
      const { data, error } = await supabase
        .from('campaign_bases')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data || []
    },
    enabled: !!campaignId,
  })
}
