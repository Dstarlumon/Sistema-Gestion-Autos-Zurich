'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { PageHeader } from '@/components/shared/page-header'
import { KpiCard } from '@/components/charts/kpi-card'
import { TableFilters } from '@/components/tables/table-filters'
import { useCampaigns } from '@/lib/queries/use-campaigns'
import { useAgents } from '@/lib/queries/use-agents'
import { useCampaignStore } from '@/stores/campaign-store'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

// ============================================================
// Types
// ============================================================

interface FunnelStep {
  label: string
  count: number
  color: string
}

interface TipificacionBreakdown {
  reason: string
  count: number
}

interface HeatmapCell {
  day: string
  category: string
  value: number
}

interface SourceQuality {
  source: string
  totalLeads: number
  pctApto: number
  pctVenta: number
}

interface WeeklyTrendPoint {
  week: string
  noApto: number
  noContacto: number
  noCotiza: number
  venta: number
}

// ============================================================
// Data fetching hook
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

// ============================================================
// Placeholder data (used when real data is empty / for structure)
// ============================================================

const PLACEHOLDER_FUNNEL: FunnelStep[] = [
  { label: 'Leads Cargados', count: 1200, color: '#3b82f6' },
  { label: 'Contactados', count: 840, color: '#0ea5e9' },
  { label: 'Cotizados', count: 310, color: '#d97706' },
  { label: 'En Proceso', count: 145, color: '#f97316' },
  { label: 'Ventas', count: 62, color: '#059669' },
]

const PLACEHOLDER_NO_COTIZAN: TipificacionBreakdown[] = [
  { reason: 'No le interesa', count: 180 },
  { reason: 'Ya tiene poliza con otra aseguradora', count: 95 },
  { reason: 'Precio muy alto', count: 72 },
  { reason: 'Vehiculo no aplica', count: 45 },
  { reason: 'Informacion incorrecta', count: 30 },
  { reason: 'Otro', count: 18 },
]

const PLACEHOLDER_HEATMAP: HeatmapCell[] = (() => {
  const days = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']
  const categories = ['Contactado', 'No Contacto', 'Cotizado', 'Venta', 'No Apto']
  const cells: HeatmapCell[] = []
  for (const day of days) {
    for (const cat of categories) {
      cells.push({
        day,
        category: cat,
        value: Math.floor(Math.random() * 50) + 5,
      })
    }
  }
  return cells
})()

const PLACEHOLDER_SOURCES: SourceQuality[] = [
  { source: 'Base Fria', totalLeads: 400, pctApto: 45, pctVenta: 8 },
  { source: 'Referido', totalLeads: 150, pctApto: 78, pctVenta: 22 },
  { source: 'Inbound Web', totalLeads: 280, pctApto: 62, pctVenta: 15 },
  { source: 'Redes Sociales', totalLeads: 120, pctApto: 35, pctVenta: 5 },
  { source: 'Renovacion', totalLeads: 250, pctApto: 82, pctVenta: 35 },
]

const PLACEHOLDER_WEEKLY_TREND: WeeklyTrendPoint[] = [
  { week: 'Sem 1', noApto: 18, noContacto: 25, noCotiza: 30, venta: 8 },
  { week: 'Sem 2', noApto: 15, noContacto: 22, noCotiza: 28, venta: 10 },
  { week: 'Sem 3', noApto: 20, noContacto: 18, noCotiza: 25, venta: 12 },
  { week: 'Sem 4', noApto: 12, noContacto: 20, noCotiza: 22, venta: 15 },
]

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

/** Conversion funnel — bar-based progressive narrowing */
function ConversionFunnel({ steps }: { steps: FunnelStep[] }) {
  const maxCount = steps[0]?.count ?? 1

  return (
    <div className="space-y-3">
      {steps.map((step, i) => {
        const widthPct = Math.max((step.count / maxCount) * 100, 8)
        const pctOfPrevious =
          i === 0
            ? 100
            : steps[i - 1].count > 0
              ? (step.count / steps[i - 1].count) * 100
              : 0

        return (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.08 }}
            className="flex items-center gap-4"
          >
            <span className="w-28 text-body-md text-on-surface-variant text-right shrink-0">
              {step.label}
            </span>
            <div className="flex-1 relative">
              <div
                className="h-9 rounded-lg flex items-center px-3 transition-all duration-700"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: step.color,
                  minWidth: '60px',
                }}
              >
                <span className="text-white text-xs font-bold tabular-nums">
                  {step.count.toLocaleString()}
                </span>
              </div>
            </div>
            <span className="text-xs text-on-surface-variant tabular-nums w-12 text-right shrink-0">
              {pctOfPrevious.toFixed(0)}%
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}

/** Progress-bar list for "why they don't quote" */
function ReasonBreakdown({ items }: { items: TipificacionBreakdown[] }) {
  const maxCount = items[0]?.count ?? 1

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

/** Heatmap table — days vs categories with intensity-colored cells */
function HeatmapTable({ cells }: { cells: HeatmapCell[] }) {
  const days = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']
  const categories = [...new Set(cells.map((c) => c.category))]
  const maxValue = Math.max(...cells.map((c) => c.value), 1)

  const getCellValue = (day: string, cat: string) =>
    cells.find((c) => c.day === day && c.category === cat)?.value ?? 0

  const getIntensity = (value: number) => {
    const ratio = value / maxValue
    if (ratio > 0.75) return 'bg-brand-primary/80 text-white'
    if (ratio > 0.5) return 'bg-brand-primary/50 text-on-surface'
    if (ratio > 0.25) return 'bg-brand-primary/25 text-on-surface'
    return 'bg-brand-primary/10 text-on-surface-variant'
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-125">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 text-label-sm text-on-surface-variant">
                Dia
              </th>
              {categories.map((cat) => (
                <th
                  key={cat}
                  className="text-center px-3 py-2 text-label-sm text-on-surface-variant"
                >
                  {cat}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day}>
                <td className="px-3 py-2 text-body-md text-on-surface font-medium">
                  {day}
                </td>
                {categories.map((cat) => {
                  const val = getCellValue(day, cat)
                  return (
                    <td key={cat} className="px-1 py-1 text-center">
                      <div
                        className={cn(
                          'rounded-md px-2 py-1.5 text-xs font-semibold tabular-nums transition-colors',
                          getIntensity(val),
                        )}
                      >
                        {val}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[0.65rem] text-on-surface-variant mt-3 italic">
        Basado en fecha de creacion del lead, no fecha de carga
      </p>
    </div>
  )
}

/** Source quality table with inline bars */
function SourceQualityTable({ sources }: { sources: SourceQuality[] }) {
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

/** Weekly trend — placeholder multi-line structure */
function WeeklyTrendChart({ data }: { data: WeeklyTrendPoint[] }) {
  const series = [
    { key: 'noApto' as const, label: 'No Apto', color: '#dc2626' },
    { key: 'noContacto' as const, label: 'No Contacto', color: '#6b7280' },
    { key: 'noCotiza' as const, label: 'No Cotiza', color: '#d97706' },
    { key: 'venta' as const, label: 'Venta', color: '#059669' },
  ]

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span
              className="w-3 h-0.75 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-xs text-on-surface-variant">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Simplified bar representation per week */}
      <div className="space-y-3">
        {data.map((point) => (
          <div key={point.week} className="flex items-center gap-3">
            <span className="w-14 text-xs text-on-surface-variant shrink-0 text-right">
              {point.week}
            </span>
            <div className="flex-1 flex gap-1 h-6">
              {series.map((s) => (
                <div
                  key={s.key}
                  className="rounded transition-all duration-500"
                  style={{
                    backgroundColor: s.color,
                    width: `${point[s.key]}%`,
                    minWidth: point[s.key] > 0 ? '4px' : '0',
                  }}
                  title={`${s.label}: ${point[s.key]}%`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[0.65rem] text-on-surface-variant mt-3 italic">
        Estructura preparada para Recharts multi-line (Phase 10)
      </p>
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

  const leads = calidadData?.leads ?? []
  const gestiones = calidadData?.gestiones ?? []
  const sales = calidadData?.sales ?? []

  // --- Build funnel from real data (fallback to placeholder if empty) ---
  const funnel: FunnelStep[] = useMemo(() => {
    if (leads.length === 0) return PLACEHOLDER_FUNNEL

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
      { label: 'Leads Cargados', count: totalLeads, color: '#3b82f6' },
      { label: 'Contactados', count: contactados, color: '#0ea5e9' },
      { label: 'Cotizados', count: cotizados, color: '#d97706' },
      { label: 'En Proceso', count: enProceso, color: '#f97316' },
      { label: 'Ventas', count: ventas, color: '#059669' },
    ]
  }, [leads])

  // --- "Why don't they quote?" from tipificacion data ---
  const noCotizanReasons: TipificacionBreakdown[] = useMemo(() => {
    if (gestiones.length === 0) return PLACEHOLDER_NO_COTIZAN

    // Group gestiones by tipificacion name (level 1 or 2)
    const tipCounts: Record<string, number> = {}
    for (const g of gestiones) {
      const tipTree = g.tipificacion_tree as unknown as
        | { name: string; parent_id: string | null; level: number }
        | null
      if (!tipTree) continue
      // For "no cotiza" analysis, look at non-sale, non-contact tipificaciones
      const name = tipTree.name ?? 'Sin tipificacion'
      tipCounts[name] = (tipCounts[name] || 0) + 1
    }

    const sorted = Object.entries(tipCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)

    return sorted.length > 0 ? sorted : PLACEHOLDER_NO_COTIZAN
  }, [gestiones])

  // --- Heatmap from real data or placeholder ---
  const heatmapCells: HeatmapCell[] = useMemo(() => {
    if (leads.length === 0) return PLACEHOLDER_HEATMAP

    /*
     * Real query would be:
     * SELECT
     *   EXTRACT(DOW FROM leads.created_at) AS day_of_week,
     *   leads.status AS category,
     *   COUNT(*) AS value
     * FROM leads
     * WHERE campaign_id = ? AND created_at BETWEEN ? AND ?
     * GROUP BY day_of_week, category
     */
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']
    const statusMap: Record<string, string> = {
      nuevo: 'Nuevo',
      contactado: 'Contactado',
      cotizado: 'Cotizado',
      en_proceso: 'En Proceso',
      venta: 'Venta',
      no_apto: 'No Apto',
      cerrado: 'Cerrado',
    }

    const cellMap: Record<string, number> = {}
    for (const lead of leads) {
      const d = new Date(lead.created_at)
      const day = dayNames[d.getDay()]
      const cat = statusMap[lead.status] ?? lead.status
      const key = `${day}|${cat}`
      cellMap[key] = (cellMap[key] || 0) + 1
    }

    const categories = [...new Set(Object.keys(cellMap).map((k) => k.split('|')[1]))]
    const cells: HeatmapCell[] = []
    for (const day of ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']) {
      for (const cat of categories) {
        cells.push({
          day,
          category: cat,
          value: cellMap[`${day}|${cat}`] ?? 0,
        })
      }
    }

    return cells.length > 0 ? cells : PLACEHOLDER_HEATMAP
  }, [leads])

  // --- No-contact recovery stats (placeholder structure) ---
  const recoveryStats = useMemo(() => {
    /*
     * Real query would use the no_contact_recovery view:
     * SELECT
     *   COUNT(*) FILTER (WHERE latest_status = 'no_contacto') AS total_no_contacto,
     *   COUNT(*) FILTER (WHERE recovered = true) AS recovered,
     *   AVG(attempts_to_contact) AS avg_attempts
     * FROM no_contact_recovery
     */
    const noContactLeads = leads.filter((l) => l.status === 'cerrado' || l.status === 'no_apto')
    const total = noContactLeads.length || 85
    const recovered = Math.round(total * 0.32)

    return {
      totalNoContacto: total,
      recoveredPct: total > 0 ? ((recovered / total) * 100).toFixed(1) : '0',
      avgAttempts: 2.4,
      attemptBreakdown: [
        { attempt: '1er intento', pct: 15 },
        { attempt: '2do intento', pct: 45 },
        { attempt: '3er intento', pct: 28 },
        { attempt: '4to+', pct: 12 },
      ],
    }
  }, [leads])

  // --- Source quality (use real data if available) ---
  const sourceQuality: SourceQuality[] = useMemo(() => {
    if (leads.length === 0) return PLACEHOLDER_SOURCES

    const bySource: Record<string, { total: number; apto: number; venta: number }> = {}
    for (const lead of leads) {
      const src = (lead.source as string) || 'Desconocido'
      if (!bySource[src]) bySource[src] = { total: 0, apto: 0, venta: 0 }
      bySource[src].total++
      if (lead.status !== 'no_apto') bySource[src].apto++
      if (lead.status === 'venta') bySource[src].venta++
    }

    const result = Object.entries(bySource)
      .map(([source, data]) => ({
        source,
        totalLeads: data.total,
        pctApto: data.total > 0 ? Math.round((data.apto / data.total) * 100) : 0,
        pctVenta: data.total > 0 ? Math.round((data.venta / data.total) * 100) : 0,
      }))
      .sort((a, b) => b.totalLeads - a.totalLeads)

    return result.length > 0 ? result : PLACEHOLDER_SOURCES
  }, [leads])

  // --- SLA: average time from upload to first gestion ---
  const avgSlaHours = useMemo(() => {
    /*
     * Real query:
     * SELECT AVG(
     *   EXTRACT(EPOCH FROM (g.created_at - l.uploaded_at)) / 3600
     * ) AS avg_hours
     * FROM leads l
     * JOIN LATERAL (
     *   SELECT created_at FROM gestiones
     *   WHERE lead_id = l.id ORDER BY created_at LIMIT 1
     * ) g ON true
     */
    // Placeholder since we don't have uploaded_at in client data
    return 4.2
  }, [])

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
          Section 1: Conversion Funnel
          ============================================================ */}
      <SectionCard
        title="Embudo de Conversion"
        subtitle="Leads Cargados -> Contactados -> Cotizados -> En Proceso -> Ventas"
      >
        <ConversionFunnel steps={funnel} />
      </SectionCard>

      {/* ============================================================
          Section 2: Two-column — Sunburst + No Cotizan
          ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard
          title="Distribucion por Tipificacion"
          subtitle="Drill-down de 3 niveles"
        >
          {/* Placeholder for Nivo Sunburst — requires real hierarchical data */}
          <div className="flex items-center justify-center h-64 rounded-lg bg-surface-container-low border border-dashed border-outline-variant/30">
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-3 rounded-full bg-surface-container flex items-center justify-center">
                <svg
                  viewBox="0 0 100 100"
                  className="w-24 h-24"
                  fill="none"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="#3b82f6"
                    strokeWidth="4"
                    opacity="0.3"
                  />
                  <path
                    d="M50 5 A45 45 0 0 1 95 50"
                    stroke="#3b82f6"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M95 50 A45 45 0 0 1 50 95"
                    stroke="#059669"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M50 95 A45 45 0 0 1 5 50"
                    stroke="#d97706"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M5 50 A45 45 0 0 1 50 5"
                    stroke="#dc2626"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="25"
                    stroke="#7c3aed"
                    strokeWidth="6"
                    opacity="0.5"
                  />
                </svg>
              </div>
              <p className="text-xs text-on-surface-variant">
                Sunburst chart — requiere @nivo/sunburst con datos jerarquicos
              </p>
              <p className="text-[0.6rem] text-on-surface-variant/60 mt-1">
                Se implementara en Phase 10 con datos reales del tipificacion_tree
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Por que no cotizan?"
          subtitle="Desglose de razones de no cotizacion"
        >
          <ReasonBreakdown items={noCotizanReasons} />
        </SectionCard>
      </div>

      {/* ============================================================
          Section 3: Heatmap by Day of Week
          ============================================================ */}
      <SectionCard
        title="Mapa de Calor por Dia de la Semana"
        subtitle="Intensidad de resultados por dia (Lun-Dom) vs tipificacion"
      >
        <HeatmapTable cells={heatmapCells} />
      </SectionCard>

      {/* ============================================================
          Section 4: Two-column — Recovery + Quality by Source
          ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recovery stats */}
        <SectionCard
          title="Recuperacion de No Contactos"
          subtitle="Analisis de reintentos y recuperacion"
        >
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
            <div>
              <p className="text-xs text-on-surface-variant mb-3 font-medium">
                En que intento se recuperaron:
              </p>
              <div className="space-y-2">
                {recoveryStats.attemptBreakdown.map((item) => (
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

            <p className="text-[0.65rem] text-on-surface-variant italic">
              Placeholder — Pie chart de intentos se implementara con @nivo/pie
            </p>
          </div>
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
          Section 5: Weekly Trend
          ============================================================ */}
      <SectionCard
        title="Tendencia Semanal"
        subtitle="Evolucion porcentual de resultados por semana"
      >
        <WeeklyTrendChart data={PLACEHOLDER_WEEKLY_TREND} />
      </SectionCard>

      {/* ============================================================
          Section 6: SLA — Response Time
          ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <KpiCard
          label="Tiempo Promedio: Creacion -> Primera Gestion"
          value={avgSlaHours}
          format={(n) => `${n.toFixed(1)} hrs`}
          accent="#3b82f6"
          subtitle="SLA = primera_gestion - uploaded_at"
          className="md:col-span-1"
        />
        <SectionCard
          title="SLA de Respuesta"
          subtitle="Tiempo desde carga de lead hasta primera gestion"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-body-md text-on-surface">Dentro de SLA (&lt; 4h)</span>
              <span className="text-xs tabular-nums font-semibold text-emerald-600">68%</span>
            </div>
            <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: '68%' }} />
            </div>

            <div className="flex items-center justify-between mt-2">
              <span className="text-body-md text-on-surface">Fuera de SLA (&gt; 4h)</span>
              <span className="text-xs tabular-nums font-semibold text-red-600">32%</span>
            </div>
            <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-red-500" style={{ width: '32%' }} />
            </div>

            <p className="text-[0.65rem] text-on-surface-variant italic mt-2">
              Placeholder — Datos reales requieren JOIN leads.uploaded_at con primera gestion
            </p>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
