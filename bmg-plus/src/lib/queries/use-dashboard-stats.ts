'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useCampaignStore } from '@/stores/campaign-store'

export function useDashboardStats() {
  const supabase = createClient()
  const activeCampaign = useCampaignStore((s) => s.activeCampaignId)

  return useQuery({
    queryKey: ['dashboard-stats', activeCampaign],
    queryFn: async () => {
      let leadsQuery = supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
      let salesQuery = supabase.from('sales').select('valor_prima')
      let gestionesQuery = supabase
        .from('gestiones')
        .select('*', { count: 'exact', head: true })

      if (activeCampaign) {
        leadsQuery = leadsQuery.eq('campaign_id', activeCampaign)
        salesQuery = salesQuery.eq('campaign_id', activeCampaign)
        gestionesQuery = gestionesQuery.eq('campaign_id', activeCampaign)
      }

      const [leads, sales, gestiones] = await Promise.all([
        leadsQuery,
        salesQuery,
        gestionesQuery,
      ])

      const totalLeads = leads.count || 0
      const totalGestiones = gestiones.count || 0
      const salesData = sales.data || []
      const totalSales = salesData.length
      const totalPrima = salesData.reduce(
        (sum, s) => sum + (Number(s.valor_prima) || 0),
        0
      )
      const conversionRate = totalLeads > 0 ? totalSales / totalLeads : 0

      return {
        totalLeads,
        totalGestiones,
        totalSales,
        totalPrima,
        conversionRate,
      }
    },
    refetchInterval: 30000, // refresh every 30s
  })
}
