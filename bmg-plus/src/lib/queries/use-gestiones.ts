'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type GestionInsert = Database['public']['Tables']['gestiones']['Insert']

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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['gestiones', data.lead_id] })
      queryClient.invalidateQueries({ queryKey: ['lead', data.lead_id] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}
