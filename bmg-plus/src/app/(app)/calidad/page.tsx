'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { PageHeader } from '@/components/shared/page-header'
import { KpiCard } from '@/components/charts/kpi-card'
import { NivoFunnelChart } from '@/components/charts/nivo-funnel-chart'
import { NivoSunburstChart } from '@/components/charts/nivo-sunburst-chart'
import { NivoHeatMapChart } from '@/components/charts/nivo-heatmap-chart'
import { NivoLineChart } from '@/components/charts/nivo-line-chart'
import { TableFilters } from '@/components/tables/table-filters'
import { useCampaigns } from '@/lib/queries/use-campaigns'
import { useAgents } from '@/lib/queries/use-agents'
import { useCampaignStore } from '@/stores/campaign-store'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

// ============================================================
// Types
// ============================================================

interface TipificacionBreakdown {
  reason: string
  count: number
}

interface SourceQuality {
  source: string
  totalLeads: number
  pctApto: number
  pctVenta: number
}

// ============================================================
// Data fetching hooks
// ============================================================

function useCalidadData(filters: {
  campaignId?: string
  agentId?: string
  dateFrom?: string
  dateTo?: string
}) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['calidad-analytics', filters],
    queryFn: async () => {
      // --- Lead counts by status ---
      let leadsQuery = supabase
        .from('leads')
        .select('id, status, source, created_at')

      if (filters.campaignId) leadsQuery = leadsQuery.eq('campaign_id', filters.campaignId)
      if (filters.agentId) leadsQuery = leadsQuery.eq('agent_id', filters.agentId)
      if (filters.dateFrom) leadsQuery = leadsQuery.gte('created_at', filters.dateFrom)
      if (filters.dateTo) leadsQuery = leadsQuery.lte('created_at', filters.dateTo + 'T23:59:59')

      const { data: leads, error: leadsError } = await leadsQuery
      if (leadsError) throw leadsError

      // --- Gestiones with tipificacion ---
      let gestionesQuery = supabase
        .from('gestiones')
        .select('id, tipificacion_id, canal, created_at, lead_id, attempt_number, tipificacion_tree(name, parent_id, level)')

      if (filters.campaignId) gestionesQuery = gestionesQuery.eq('campaign_id', filters.campaignId)
      if (filters.agentId) gestionesQuery = gestionesQuery.eq('agent_id', filters.agentId)
      if (filters.dateFrom) gestionesQuery = gestionesQuery.gte('created_at', filters.dateFrom)
      if (filters.dateTo) gestionesQuery = gestionesQuery.lte('created_at', filters.dateTo + 'T23:59:59')

      const { data: gestiones, error: gestionesError } = await gestionesQuery
      if (gestionesError) throw gestionesError

      // --- Sales count ---
      let salesQuery = supabase
        .from('sales')
        .select('id, created_at, valor_prima')

      if (filters.campaignId) salesQuery = salesQuery.eq('campaign_id', filters.campaignId)
      if (filters.agentId) salesQuery = salesQuery.eq('agent_id', filters.agentId)
      if (filters.dateFrom) salesQuery = salesQuery.gte('created_at', filters.dateFrom)
      if (filters.dateTo) salesQuery = salesQuery.lte('created_at', filters.dateTo + 'T23:59:59')

      const { data: sales, error: salesError } = await salesQuery
      if (salesError) throw salesError

      return {
        leads: leads ?? [],
        gestiones: gestiones ?? [],
        sales: sales ?? [],
      }
    },
  })
}

/** Hook to fetch DB view data for heatmaps and recovery */
function useCalidadViews(filters: {
  campaignId?: string
}) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['calidad-views', filters],
    queryFn: async () => {
      // Weekday results view
      let weekdayQuery = supabase.from('lead_results_by_weekday').select('*')
      if (filters.campaignId) weekdayQuery = weekdayQuery.eq('campaign_id', filters.campaignId)

      // Hourly results view
      let hourQuery = supabase.from('lead_results_by_hour').select('*')
      if (filters.campaignId) hourQuery = hourQuery.eq('campaign_id', filters.campaignId)

      // No contact recovery view
      let recoveryQuery = supabase.from('no_contact_recovery').select('*')
      if (filters.campaignId) recoveryQuery = recoveryQuery.eq('campaign_id', filters.campaignId)

      // Lead contact attempts view
      let attemptsQuery = supabase.from('lead_contact_attempts').select('*')
      if (filters.campaignId) attemptsQuery = attemptsQuery.eq('campaign_id', filters.campaignId)

      const [weekdayRes, hourRes, recoveryRes, attemptsRes] = await Promise.all([
        weekdayQuery,
        hourQuery,
        recoveryQuery,
        attemptsQuery,
      ])

      return {
        weekdayData: weekdayRes.data ?? [],
        hourData: hourRes.data ?? [],
        recoveryData: recoveryRes.data ?? [],
        attemptsData: attemptsRes.data ?? [],
      }
    },
  })
}

// ============================================================
// Section Card wrapper
// ============================================================

function SectionCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'bg-surface-container-lowest rounded-xl p-6 shadow-ambient',
        className,
      )}
    >
      <h3 className="text-title-md text-on-surface mb-1">{title}</h3>
      {subtitle && (
        <p className="text-xs text-on-surface-variant mb-4">{subtitle}</p>
      )}
      {!subtitle && <div className="mb-4" />}
      {children}
    </motion.div>
  )
}

// ============================================================
// Sub-components
// ============================================================

/** Progress-bar list for "why they don't quote" */
function ReasonBreakdown({ items }: { items: TipificacionBreakdown[] }) {
  const maxCount = items[0]?.count ?? 1

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-on-surface-variant text-sm">
        Sin datos suficientes
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <motion.div
          key={item.reason}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.05 }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-body-md text-on-surface">{item.reason}</span>
            <span className="text-xs text-on-surface-variant tabular-nums font-semibold">
              {item.count}
            </span>
          </div>
          <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-700"
              style={{ width: `${(item.count / maxCount) * 100}%` }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  )
}

/** Source quality table with inline bars */
function SourceQualityTable({ sources }: { sources: SourceQuality[] }) {
  if (sources.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-on-surface-variant text-sm">
        Sin datos suficientes
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left px-3 py-2 text-label-sm text-on-surface-variant">
              Fuente
            </th>
            <th className="text-center px-3 py-2 text-label-sm text-on-surface-variant">
              Leads
            </th>
            <th className="text-left px-3 py-2 text-label-sm text-on-surface-variant">
              % Apto
            </th>
            <th className="text-left px-3 py-2 text-label-sm text-on-surface-variant">
              % Venta
            </th>
          </tr>
        </thead>
        <tbody>
          {sources.map((s) => (
            <tr key={s.source} className="hover:bg-surface-container-low transition-colors">
              <td className="px-3 py-2.5 text-body-md text-on-surface font-medium">
                {s.source}
              </td>
              <td className="px-3 py-2.5 text-body-md text-on-surface-variant text-center tabular-nums">
                {s.totalLeads}
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${s.pctApto}%` }}
                    />
                  </div>
                  <span className="text-xs tabular-nums text-on-surface-variant w-10 text-right">
                    {s.pctApto}%
                  </span>
                </div>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${s.pctVenta}%` }}
                    />
                  </div>
                  <span className="text-xs tabular-nums text-on-surface-variant w-10 text-right">
                    {s.pctVenta}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ============================================================
// Main Page
// ============================================================

export default function CalidadPage() {
  // --- Global campaign filter ---
  const activeCampaign = useCampaignStore((s) => s.activeCampaignId)

  // --- Local filters ---
  const [filterCampaign, setFilterCampaign] = useState<string>('')
  const [filterAgent, setFilterAgent] = useState<string>('')
  const [filterDateFrom, setFilterDateFrom] = useState<string>('')
  const [filterDateTo, setFilterDateTo] = useState<string>('')

  const effectiveCampaign = filterCampaign || activeCampaign || undefined

  // --- Data hooks ---
  const { data: campaigns } = useCampaigns()
  const { data: agents } = useAgents(effectiveCampaign)
  const { data: calidadData, isLoading } = useCalidadData({
    campaignId: effectiveCampaign,
    agentId: filterAgent || undefined,
    dateFrom: filterDateFrom || undefined,
    dateTo: filterDateTo || undefined,
  })
  const { data: viewsData } = useCalidadViews({
    campaignId: effectiveCampaign,
  })

  const leads = calidadData?.leads ?? []
  const gestiones = calidadData?.gestiones ?? []
  const sales = calidadData?.sales ?? []
  const weekdayData = viewsData?.weekdayData ?? []
  const hourData = viewsData?.hourData ?? []
  const recoveryData = viewsData?.recoveryData ?? []
  const attemptsData = viewsData?.attemptsData ?? []

  // --- Build funnel from real data ---
  const funnelData = useMemo(() => {
    if (leads.length === 0) return []

    const totalLeads = leads.length
    const contactados = leads.filter(
      (l) => l.status !== 'nuevo' && l.status !== 'no_apto',
    ).length
    const cotizados = leads.filter(
      (l) => l.status === 'cotizado' || l.status === 'en_proceso' || l.status === 'venta',
    ).length
    const enProceso = leads.filter(
      (l) => l.status === 'en_proceso' || l.status === 'venta',
    ).length
    const ventas = leads.filter((l) => l.status === 'venta').length

    return [
      { id: 'Leads', value: totalLeads, label: 'Leads Cargados' },
      { id: 'Contactados', value: contactados, label: 'Contactados' },
      { id: 'Cotizados', value: cotizados, label: 'Cotizados' },
      { id: 'En Proceso', value: enProceso, label: 'En Proceso' },
      { id: 'Ventas', value: ventas, label: 'Ventas' },
    ]
  }, [leads])

  // --- Sunburst: build tree from tipificacion data ---
  const sunburstData = useMemo(() => {
    if (gestiones.length === 0) return { name: 'Leads', children: [] }

    // Group gestiones by tipificacion parent and child
    const groups: Record<string, Record<string, number>> = {}
    for (const g of gestiones) {
      const tipTree = g.tipificacion_tree as unknown as
        | { name: string; parent_id: string | null; level: number }
        | null
      if (!tipTree) continue

      const parentName = tipTree.parent_id ? 'Subcategoria' : tipTree.name
      const childName = tipTree.parent_id ? tipTree.name : 'General'

      if (!groups[parentName]) groups[parentName] = {}
      groups[parentName][childName] = (groups[parentName][childName] || 0) + 1
    }

    return {
      name: 'Leads',
      children: Object.entries(groups).map(([parentName, children]) => ({
        name: parentName,
        children: Object.entries(children).map(([childName, count]) => ({
          name: childName,
          value: count,
        })),
      })),
    }
  }, [gestiones])

  // --- "Why don't they quote?" from tipificacion data ---
  const noCotizanReasons: TipificacionBreakdown[] = useMemo(() => {
    if (gestiones.length === 0) return []

    const tipCounts: Record<string, number> = {}
    for (const g of gestiones) {
      const tipTree = g.tipificacion_tree as unknown as
        | { name: string; parent_id: string | null; level: number }
        | null
      if (!tipTree) continue
      const name = tipTree.name ?? 'Sin tipificacion'
      tipCounts[name] = (tipCounts[name] || 0) + 1
    }

    return Object.entries(tipCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [gestiones])

  // --- Weekday heatmap from DB view ---
  const weekdayHeatmapData = useMemo(() => {
    if (weekdayData.length === 0) return []

    const dayNames: Record<number, string> = {
      0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mie', 4: 'Jue', 5: 'Vie', 6: 'Sab',
    }
    const days = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']
    const categories = [...new Set(weekdayData.map((d) => d.root_category ?? 'Otro'))]

    return days.map((day) => ({
      id: day,
      data: categories.map((cat) => {
        const match = weekdayData.find((d) => {
          const dayName = dayNames[d.day_of_week ?? 0] ?? 'Otro'
          return dayName === day && (d.root_category ?? 'Otro') === cat
        })
        return { x: cat, y: match?.total ?? 0 }
      }),
    }))
  }, [weekdayData])

  // --- Hour heatmap from DB view ---
  const hourHeatmapData = useMemo(() => {
    if (hourData.length === 0) return []

    const categories = [...new Set(hourData.map((d) => d.root_category ?? 'Otro'))]
    const hours = [...new Set(hourData.map((d) => d.hour_of_day ?? 0))].sort((a, b) => a - b)

    return hours.map((hour) => ({
      id: `${String(hour).padStart(2, '0')}:00`,
      data: categories.map((cat) => {
        const match = hourData.find(
          (d) => (d.hour_of_day ?? 0) === hour && (d.root_category ?? 'Otro') === cat,
        )
        return { x: cat, y: match?.total ?? 0 }
      }),
    }))
  }, [hourData])

  // --- Recovery stats from DB view (no fabricated data) ---
  const recoveryStats = useMemo(() => {
    if (recoveryData.length === 0) {
      return {
        totalNoContacto: 0,
        recoveredCount: 0,
        recoveredPct: '0',
        avgAttempts: 0,
        hasData: false,
      }
    }

    const totalNoContacto = recoveryData.length
    const recovered = recoveryData.filter((r) => r.was_recovered === true)
    const recoveredCount = recovered.length
    const recoveredPct = totalNoContacto > 0
      ? ((recoveredCount / totalNoContacto) * 100).toFixed(1)
      : '0'

    // Average total_attempts from the view
    const totalAttempts = recoveryData.reduce(
      (sum, r) => sum + (r.total_attempts ?? 0),
      0,
    )
    const avgAttempts = totalNoContacto > 0
      ? Number((totalAttempts / totalNoContacto).toFixed(1))
      : 0

    return {
      totalNoContacto,
      recoveredCount,
      recoveredPct,
      avgAttempts,
      hasData: true,
    }
  }, [recoveryData])

  // --- Attempt breakdown from DB view ---
  const attemptBreakdown = useMemo(() => {
    if (recoveryData.length === 0) return []

    const recovered = recoveryData.filter((r) => r.was_recovered === true)
    if (recovered.length === 0) return []

    const buckets: Record<string, number> = {
      '1er intento': 0,
      '2do intento': 0,
      '3er intento': 0,
      '4to+': 0,
    }

    for (const r of recovered) {
      const attempt = r.recovery_at_attempt ?? 0
      if (attempt <= 1) buckets['1er intento']++
      else if (attempt === 2) buckets['2do intento']++
      else if (attempt === 3) buckets['3er intento']++
      else buckets['4to+']++
    }

    const total = recovered.length
    return Object.entries(buckets)
      .map(([attempt, count]) => ({
        attempt,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .filter((b) => b.pct > 0)
  }, [recoveryData])

  // --- Source quality (from real data) ---
  const sourceQuality: SourceQuality[] = useMemo(() => {
    if (leads.length === 0) return []

    const bySource: Record<string, { total: number; apto: number; venta: number }> = {}
    for (const lead of leads) {
      const src = (lead.source as string) || 'Desconocido'
      if (!bySource[src]) bySource[src] = { total: 0, apto: 0, venta: 0 }
      bySource[src].total++
      if (lead.status !== 'no_apto') bySource[src].apto++
      if (lead.status === 'venta') bySource[src].venta++
    }

    return Object.entries(bySource)
      .map(([source, data]) => ({
        source,
        totalLeads: data.total,
        pctApto: data.total > 0 ? Math.round((data.apto / data.total) * 100) : 0,
        pctVenta: data.total > 0 ? Math.round((data.venta / data.total) * 100) : 0,
      }))
      .sort((a, b) => b.totalLeads - a.totalLeads)
  }, [leads])

  // --- SLA: compute from contact attempts view ---
  const avgSlaHours = useMemo(() => {
    if (attemptsData.length === 0) return null
    // Use the first_attempt_at field from the view
    const withFirstAttempt = attemptsData.filter(
      (a) => a.first_attempt_at != null,
    )
    if (withFirstAttempt.length === 0) return null

    // Average days between attempts as proxy for SLA
    const totalAvg = withFirstAttempt.reduce(
      (sum, a) => sum + (a.avg_days_between_attempts ?? 0),
      0,
    )
    const avgDays = totalAvg / withFirstAttempt.length
    return Number((avgDays * 24).toFixed(1))
  }, [attemptsData])

  // --- Weekly trend from real gestion data ---
  const weeklyTrendData = useMemo(() => {
    if (gestiones.length === 0) return []

    const weekMap: Record<string, Record<string, number>> = {}

    for (const g of gestiones) {
      if (!g.created_at) continue
      const d = new Date(g.created_at)
      // Get ISO week number
      const startOfYear = new Date(d.getFullYear(), 0, 1)
      const weekNum = Math.ceil(
        ((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7,
      )
      const weekKey = `Sem ${weekNum}`

      const tipTree = g.tipificacion_tree as unknown as
        | { name: string; parent_id: string | null; level: number }
        | null
      const category = tipTree?.name ?? 'Sin tipificacion'

      if (!weekMap[weekKey]) weekMap[weekKey] = {}
      weekMap[weekKey][category] = (weekMap[weekKey][category] || 0) + 1
    }

    // Get top 4 categories
    const allCategories: Record<string, number> = {}
    for (const week of Object.values(weekMap)) {
      for (const [cat, count] of Object.entries(week)) {
        allCategories[cat] = (allCategories[cat] || 0) + count
      }
    }
    const topCategories = Object.entries(allCategories)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4)
      .map(([cat]) => cat)

    const colors = ['#dc2626', '#6b7280', '#d97706', '#059669']

    return topCategories.map((cat, i) => ({
      id: cat,
      color: colors[i % colors.length],
      data: Object.entries(weekMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, cats]) => ({
          x: week,
          y: cats[cat] ?? 0,
        })),
    }))
  }, [gestiones])

  // --- Reset filters ---
  const resetFilters = () => {
    setFilterCampaign('')
    setFilterAgent('')
    setFilterDateFrom('')
    setFilterDateTo('')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Calidad de Leads"
        subtitle="Analisis profundo de resultados"
      />

      {/* Filter Bar */}
      <TableFilters onReset={resetFilters}>
        <div className="flex flex-col gap-1">
          <label className="text-label-sm text-on-surface-variant">
            Campana
          </label>
          <select
            value={filterCampaign}
            onChange={(e) => setFilterCampaign(e.target.value)}
            className={cn(
              'h-9 rounded-lg px-3 text-body-md',
              'bg-surface-container-lowest border border-outline-variant/30',
              'text-on-surface focus:outline-none focus:ring-2 focus:ring-brand-primary/30',
            )}
          >
            <option value="">Todas</option>
            {(campaigns ?? []).map((c: Record<string, unknown>) => (
              <option key={c.id as string} value={c.id as string}>
                {c.name as string}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-label-sm text-on-surface-variant">
            Agente
          </label>
          <select
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value)}
            className={cn(
              'h-9 rounded-lg px-3 text-body-md',
              'bg-surface-container-lowest border border-outline-variant/30',
              'text-on-surface focus:outline-none focus:ring-2 focus:ring-brand-primary/30',
            )}
          >
            <option value="">Todos</option>
            {(agents ?? []).map((a: Record<string, unknown>) => (
              <option key={a.id as string} value={a.id as string}>
                {a.full_name as string}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-label-sm text-on-surface-variant">Desde</label>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className={cn(
              'h-9 rounded-lg px-3 text-body-md',
              'bg-surface-container-lowest border border-outline-variant/30',
              'text-on-surface focus:outline-none focus:ring-2 focus:ring-brand-primary/30',
            )}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-label-sm text-on-surface-variant">Hasta</label>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className={cn(
              'h-9 rounded-lg px-3 text-body-md',
              'bg-surface-container-lowest border border-outline-variant/30',
              'text-on-surface focus:outline-none focus:ring-2 focus:ring-brand-primary/30',
            )}
          />
        </div>
      </TableFilters>

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
        </div>
      )}

      {/* ============================================================
          Section 1: Conversion Funnel (Nivo Funnel)
          ============================================================ */}
      <SectionCard
        title="Embudo de Conversion"
        subtitle="Leads Cargados -> Contactados -> Cotizados -> En Proceso -> Ventas"
      >
        <NivoFunnelChart
          data={funnelData}
          height={400}
          colors={['#3b82f6', '#66cfd0', '#d97706', '#fa5058', '#059669']}
          emptyMessage="Sin datos suficientes para el embudo"
        />
      </SectionCard>

      {/* ============================================================
          Section 2: Two-column — Sunburst + No Cotizan
          ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard
          title="Distribucion por Tipificacion"
          subtitle="Drill-down de categorias"
        >
          <NivoSunburstChart
            data={sunburstData}
            height={400}
            colors={{ scheme: 'paired' }}
            emptyMessage="Sin datos de tipificacion disponibles"
          />
        </SectionCard>

        <SectionCard
          title="Por que no cotizan?"
          subtitle="Desglose de razones de no cotizacion"
        >
          <ReasonBreakdown items={noCotizanReasons} />
        </SectionCard>
      </div>

      {/* ============================================================
          Section 3: Heatmaps — Day of Week + Hour of Day (Nivo HeatMap)
          ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard
          title="Mapa de Calor por Dia de la Semana"
          subtitle="Resultados por dia (Lun-Dom) vs categoria"
        >
          <NivoHeatMapChart
            data={weekdayHeatmapData}
            height={300}
            margin={{ top: 30, right: 30, bottom: 30, left: 60 }}
            emptyMessage="Sin datos de resultados por dia"
          />
        </SectionCard>

        <SectionCard
          title="Mapa de Calor por Hora del Dia"
          subtitle="Resultados por hora vs categoria"
        >
          <NivoHeatMapChart
            data={hourHeatmapData}
            height={300}
            margin={{ top: 30, right: 30, bottom: 30, left: 60 }}
            emptyMessage="Sin datos de resultados por hora"
          />
        </SectionCard>
      </div>

      {/* ============================================================
          Section 4: Two-column — Recovery + Quality by Source
          ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recovery stats — from DB view */}
        <SectionCard
          title="Recuperacion de No Contactos"
          subtitle="Analisis de reintentos y recuperacion"
        >
          {recoveryStats.hasData ? (
            <div className="space-y-5">
              {/* Summary KPIs */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-display-md text-on-surface" style={{ fontSize: '1.75rem' }}>
                    {recoveryStats.totalNoContacto}
                  </p>
                  <p className="text-label-sm text-on-surface-variant mt-1">
                    Total No Contacto
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-display-md text-emerald-600" style={{ fontSize: '1.75rem' }}>
                    {recoveryStats.recoveredPct}%
                  </p>
                  <p className="text-label-sm text-on-surface-variant mt-1">
                    Recuperados
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-display-md text-on-surface" style={{ fontSize: '1.75rem' }}>
                    {recoveryStats.avgAttempts}
                  </p>
                  <p className="text-label-sm text-on-surface-variant mt-1">
                    Prom. Intentos
                  </p>
                </div>
              </div>

              {/* At which attempt they were recovered */}
              {attemptBreakdown.length > 0 && (
                <div>
                  <p className="text-xs text-on-surface-variant mb-3 font-medium">
                    En que intento se recuperaron:
                  </p>
                  <div className="space-y-2">
                    {attemptBreakdown.map((item) => (
                      <div key={item.attempt} className="flex items-center gap-3">
                        <span className="w-24 text-xs text-on-surface-variant shrink-0">
                          {item.attempt}
                        </span>
                        <div className="flex-1 h-5 bg-surface-container rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-brand-primary/70 transition-all duration-500"
                            style={{ width: `${item.pct}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-on-surface-variant w-8 text-right">
                          {item.pct}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-on-surface-variant text-sm">
              Sin datos suficientes
            </div>
          )}
        </SectionCard>

        {/* Quality by source */}
        <SectionCard
          title="Calidad por Fuente"
          subtitle="Porcentaje de leads aptos y ventas por origen"
        >
          <SourceQualityTable sources={sourceQuality} />
        </SectionCard>
      </div>

      {/* ============================================================
          Section 5: Weekly Trend (Nivo Line)
          ============================================================ */}
      <SectionCard
        title="Tendencia Semanal"
        subtitle="Evolucion de resultados por semana y categoria"
      >
        <NivoLineChart
          data={weeklyTrendData}
          height={350}
          enableArea={false}
          colors={['#dc2626', '#6b7280', '#d97706', '#059669']}
          margin={{ top: 10, right: 30, bottom: 40, left: 50 }}
          emptyMessage="Sin datos suficientes para tendencia semanal"
        />
      </SectionCard>

      {/* ============================================================
          Section 6: SLA — Response Time (computed from DB)
          ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <KpiCard
          label="Tiempo Promedio entre Intentos"
          value={avgSlaHours ?? 0}
          format={(n) => n > 0 ? `${n.toFixed(1)} hrs` : 'Sin datos'}
          accent="#3b82f6"
          subtitle={avgSlaHours !== null ? 'promedio entre gestiones' : 'sin datos suficientes'}
          className="md:col-span-1"
        />
        <SectionCard
          title="Metricas de Contacto"
          subtitle="Resumen de intentos de contacto desde la vista de BD"
        >
          {attemptsData.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-body-md text-on-surface">Leads con intentos registrados</span>
                <span className="text-xs tabular-nums font-semibold text-on-surface">
                  {attemptsData.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-body-md text-on-surface">Promedio de intentos por lead</span>
                <span className="text-xs tabular-nums font-semibold text-on-surface">
                  {(
                    attemptsData.reduce((sum, a) => sum + (a.total_attempts ?? 0), 0) /
                    attemptsData.length
                  ).toFixed(1)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-body-md text-on-surface">Leads con reintento programado</span>
                <span className="text-xs tabular-nums font-semibold text-on-surface">
                  {attemptsData.filter((a) => a.next_scheduled_retry !== null).length}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-on-surface-variant text-sm">
              Sin datos suficientes
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
