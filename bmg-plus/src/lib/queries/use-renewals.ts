'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useCampaignStore } from '@/stores/campaign-store'

export function useRenewals(params?: {
  page?: number
  pageSize?: number
  campaignId?: string
  agentId?: string
}) {
  const supabase = createClient()
  const activeCampaign = useCampaignStore((s) => s.activeCampaignId)
  const campaignId = params?.campaignId || activeCampaign

  return useQuery({
    queryKey: ['renewals', { ...params, campaignId }],
    queryFn: async () => {
      const page = params?.page || 1
      const pageSize = params?.pageSize || 25
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let query = supabase
        .from('renewals')
        .select('*, profiles!renewals_agent_id_fkey(full_name), campaigns(name, color)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (campaignId) query = query.eq('campaign_id', campaignId)
      if (params?.agentId) query = query.eq('agent_id', params.agentId)

      const { data, error, count } = await query
      if (error) throw error
      return { data: data || [], count: count || 0 }
    },
  })
}

export function useCreateRenewal() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const { data, error } = await supabase
        .from('renewals')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renewals'] })
    },
  })
}
