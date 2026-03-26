'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type GestionInsert = Database['public']['Tables']['gestiones']['Insert']
type GestionRow = Database['public']['Tables']['gestiones']['Row']

export function useGestionesByLead(leadId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['gestiones', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gestiones')
        .select(
          '*, tipificacion_tree(id, name, parent_id, level), profiles!gestiones_agent_id_fkey(full_name)'
        )
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!leadId,
  })
}

export function useCreateGestion() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: GestionInsert) => {
      const { data, error } = await supabase
        .from('gestiones')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onMutate: async (newData) => {
      const leadId = newData.lead_id
      if (!leadId) return {}

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['gestiones', leadId] })

      // Snapshot previous value
      const prev = queryClient.getQueryData(['gestiones', leadId])

      // Optimistically add new gestion to the list
      queryClient.setQueryData(
        ['gestiones', leadId],
        (old: GestionRow[] | undefined) => [
          { ...newData, id: 'temp-' + Date.now(), created_at: new Date().toISOString() },
          ...(old || []),
        ]
      )

      return { prev, leadId }
    },
    onError: (_err, _newData, context) => {
      // Rollback on error
      if (context?.prev !== undefined && context?.leadId) {
        queryClient.setQueryData(['gestiones', context.leadId], context.prev)
      }
    },
    onSettled: (_data, _error, variables) => {
      // Always refetch after success or error
      const leadId = variables.lead_id
      if (leadId) {
        queryClient.invalidateQueries({ queryKey: ['gestiones', leadId] })
        queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
      }
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}
