'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useCampaignStore } from '@/stores/campaign-store'
import type { Database } from '@/types/database.types'

type SaleInsert = Database['public']['Tables']['sales']['Insert']

export function useSales(params?: {
  page?: number
  pageSize?: number
  campaignId?: string
  agentId?: string
  dateFrom?: string
  dateTo?: string
}) {
  const supabase = createClient()
  const activeCampaign = useCampaignStore((s) => s.activeCampaignId)
  const campaignId = params?.campaignId || activeCampaign

  return useQuery({
    queryKey: ['sales', { ...params, campaignId }],
    queryFn: async () => {
      const page = params?.page || 1
      const pageSize = params?.pageSize || 25
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let query = supabase
        .from('sales')
        .select(
          '*, profiles!sales_agent_id_fkey(full_name), campaigns(name, color)',
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(from, to)

      if (campaignId) query = query.eq('campaign_id', campaignId)
      if (params?.agentId) query = query.eq('agent_id', params.agentId)
      if (params?.dateFrom) query = query.gte('created_at', params.dateFrom)
      if (params?.dateTo) query = query.lte('created_at', params.dateTo + 'T23:59:59')

      const { data, error, count } = await query
      if (error) throw error
      return { data: data || [], count: count || 0 }
    },
  })
}

export function useCreateSale() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: SaleInsert) => {
      const { data, error } = await supabase
        .from('sales')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onMutate: async (newData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['sales'] })

      // Snapshot previous value (for the default sales list)
      const prev = queryClient.getQueryData(['sales'])

      return { prev }
    },
    onError: (_err, _newData, context) => {
      // Rollback on error
      if (context?.prev !== undefined) {
        queryClient.setQueryData(['sales'], context.prev)
      }
    },
    onSettled: () => {
      // Always refetch after success or error
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}
