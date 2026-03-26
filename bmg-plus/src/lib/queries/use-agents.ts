'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useAgents(campaignId?: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['agents', campaignId],
    queryFn: async () => {
      if (campaignId) {
        const { data, error } = await supabase
          .from('campaign_agents')
          .select('profiles(*)')
          .eq('campaign_id', campaignId)
        if (error) throw error
        return (data || [])
          .map((d: Record<string, unknown>) => d.profiles)
          .filter(Boolean)
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .in('role', ['agente', 'supervisor'])
        .order('full_name')
      if (error) throw error
      return data || []
    },
  })
}
