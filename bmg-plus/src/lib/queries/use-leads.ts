'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useCampaignStore } from '@/stores/campaign-store'

export function useLeads(params?: {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  agentId?: string
  campaignId?: string
}) {
  const supabase = createClient()
  const activeCampaign = useCampaignStore((s) => s.activeCampaignId)
  const campaignId = params?.campaignId || activeCampaign

  return useQuery({
    queryKey: ['leads', { ...params, campaignId }],
    queryFn: async () => {
      const page = params?.page || 1
      const pageSize = params?.pageSize || 25
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let query = supabase
        .from('leads')
        .select(
          '*, profiles!leads_agent_id_fkey(full_name), campaigns(name, color)',
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(from, to)

      if (campaignId) query = query.eq('campaign_id', campaignId)
      if (params?.status) query = query.eq('status', params.status)
      if (params?.agentId) query = query.eq('agent_id', params.agentId)
      if (params?.search) query = query.textSearch('search_vector', params.search)

      const { data, error, count } = await query
      if (error) throw error
      return { data: data || [], count: count || 0 }
    },
  })
}

export function useLeadById(id: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['lead', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select(
          '*, profiles!leads_agent_id_fkey(full_name), campaigns(name, color, slug), campaign_bases(name)'
        )
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}
