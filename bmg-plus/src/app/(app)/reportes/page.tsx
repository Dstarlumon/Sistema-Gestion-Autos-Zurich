'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/shared/page-header'
import { KpiCard } from '@/components/charts/kpi-card'
import { DataTable, type Column } from '@/components/tables/data-table'
import { TableFilters } from '@/components/tables/table-filters'
import { Skeleton } from '@/components/ui/skeleton'
import { useCampaigns } from '@/lib/queries/use-campaigns'
import { useAgents } from '@/lib/queries/use-agents'
import { useRole } from '@/hooks/use-role'
import { formatCOP, formatPercent } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Reportes page — advanced reports with filters and export
// ---------------------------------------------------------------------------

export default function ReportesPage() {
  const { canSupervise } = useRole()

  // --- Filters ---
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([])
  const [selectedAgent, setSelectedAgent] = useState('')
  const [isExporting, setIsExporting] = useState<'csv' | 'excel' | null>(null)

  // --- Data sources ---
  const { data: campaigns } = useCampaigns()
  const { data: agents } = useAgents()

  // --- Export handler ---
  const handleExport = useCallback(
    async (type: 'csv' | 'excel') => {
      setIsExporting(type)
      try {
        const filters: Record<string, unknown> = {}
        if (selectedCampaigns.length === 1) filters.campaign_id = selectedCampaigns[0]
        if (dateFrom) filters.date_from = dateFrom
        if (dateTo) filters.date_to = dateTo

        const res = await fetch('/api/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, module: 'gestiones', filters }),
        })

        if (!res.ok) {
          const errText = await res.text()
          throw new Error(errText || 'Error al exportar')
        }

        // Trigger browser download
        const blob = await res.blob()
        const ext = type === 'csv' ? 'csv' : 'xlsx'
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `gestiones_export.${ext}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (err) {
        console.error('Export error:', err)
      } finally {
        setIsExporting(null)
      }
    },
    [selectedCampaigns, dateFrom, dateTo],
  )

  if (!canSupervise) {
    return (
      <div className="space-y-6">
        <PageHeader title="Reportes" />
        <div className="bg-surface-container-lowest rounded-xl shadow-ambient p-12 text-center">
          <p className="text-on-surface-variant text-body-md">
            Esta seccion esta disponible solo para supervisores y coordinadores.
          </p>
        </div>
      </div>
    )
  }

  const resetFilters = () => {
    setDateFrom('')
    setDateTo('')
    setSelectedCampaigns([])
    setSelectedAgent('')
  }

  const toggleCampaign = (id: string) => {
    setSelectedCampaigns((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with export buttons */}
      <PageHeader
        title="Reportes"
        subtitle="Analisis consolidado de rendimiento por campana, agente y periodo"
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('excel')}
            disabled={isExporting !== null}
            className={cn(
              'px-4 py-2 text-xs font-semibold rounded-lg transition-colors',
              'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            {isExporting === 'excel' ? 'Exportando...' : 'Exportar Excel'}
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={isExporting !== null}
            className={cn(
              'px-4 py-2 text-xs font-semibold rounded-lg transition-colors',
              'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            {isExporting === 'csv' ? 'Exportando...' : 'Exportar CSV'}
          </button>
        </div>
      </PageHeader>

      {/* Filter Bar */}
      <FilterBar
        dateFrom={dateFrom}
        dateTo={dateTo}
        selectedCampaigns={selectedCampaigns}
        selectedAgent={selectedAgent}
        campaigns={campaigns || []}
        agents={agents || []}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onToggleCampaign={toggleCampaign}
        onAgentChange={setSelectedAgent}
        onReset={resetFilters}
      />

      {/* Section 1: KPI Summary */}
      <KpiSummary
        dateFrom={dateFrom}
        dateTo={dateTo}
        campaignIds={selectedCampaigns}
        agentId={selectedAgent}
      />

      {/* Section 2: Rendimiento por Agente */}
      <AgentPerformance
        dateFrom={dateFrom}
        dateTo={dateTo}
        campaignIds={selectedCampaigns}
        agentId={selectedAgent}
      />

      {/* Section 3: Distribucion de Tipificaciones */}
      <TipificacionBreakdown
        dateFrom={dateFrom}
        dateTo={dateTo}
        campaignIds={selectedCampaigns}
      />

      {/* Section 4: Performance por Fuente */}
      <SourcePerformance
        dateFrom={dateFrom}
        dateTo={dateTo}
        campaignIds={selectedCampaigns}
      />

      {/* Section 5: Tendencia Mensual */}
      <MonthlyTrend
        dateFrom={dateFrom}
        dateTo={dateTo}
        campaignIds={selectedCampaigns}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

interface FilterBarProps {
  dateFrom: string
  dateTo: string
  selectedCampaigns: string[]
  selectedAgent: string
  campaigns: Record<string, unknown>[]
  agents: Record<string, unknown>[]
  onDateFromChange: (v: string) => void
  onDateToChange: (v: string) => void
  onToggleCampaign: (id: string) => void
  onAgentChange: (v: string) => void
  onReset: () => void
}

function FilterBar({
  dateFrom,
  dateTo,
  selectedCampaigns,
  selectedAgent,
  campaigns,
  agents,
  onDateFromChange,
  onDateToChange,
  onToggleCampaign,
  onAgentChange,
  onReset,
}: FilterBarProps) {
  const inputClass = cn(
    'h-9 rounded-lg px-3 text-body-md',
    'bg-surface-container-lowest border border-outline-variant/30',
    'text-on-surface focus:outline-none focus:ring-2 focus:ring-brand-primary/30',
  )

  return (
    <TableFilters onReset={onReset}>
      {/* Date from */}
      <div className="flex flex-col gap-1">
        <label className="text-label-sm text-on-surface-variant">Desde</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Date to */}
      <div className="flex flex-col gap-1">
        <label className="text-label-sm text-on-surface-variant">Hasta</label>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Campaign multi-select (checkboxes) */}
      <div className="flex flex-col gap-1">
        <label className="text-label-sm text-on-surface-variant">
          Campanas
        </label>
        <div className="flex flex-wrap gap-2">
          {campaigns.map((c) => {
            const id = c.id as string
            const name = c.name as string
            const color = (c.color as string) || '#6b7280'
            const isSelected = selectedCampaigns.includes(id)
            return (
              <button
                key={id}
                onClick={() => onToggleCampaign(id)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.65rem] font-semibold transition-all',
                  isSelected
                    ? 'ring-2 ring-offset-1'
                    : 'opacity-60 hover:opacity-100',
                )}
                style={{
                  backgroundColor: `${color}18`,
                  color: color,
                  ...(isSelected ? { ringColor: color } : {}),
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Agent select */}
      <div className="flex flex-col gap-1">
        <label className="text-label-sm text-on-surface-variant">Agente</label>
        <select
          value={selectedAgent}
          onChange={(e) => onAgentChange(e.target.value)}
          className={inputClass}
        >
          <option value="">Todos</option>
          {agents.map((a) => (
            <option key={a.id as string} value={a.id as string}>
              {a.full_name as string}
            </option>
          ))}
        </select>
      </div>
    </TableFilters>
  )
}

// ---------------------------------------------------------------------------
// Shared filter params type
// ---------------------------------------------------------------------------

interface FilterParams {
  dateFrom: string
  dateTo: string
  campaignIds: string[]
  agentId?: string
}

// ---------------------------------------------------------------------------
// Section 1: KPI Summary Row
// ---------------------------------------------------------------------------

function KpiSummary({ dateFrom, dateTo, campaignIds, agentId }: FilterParams) {
  const supabase = createClient()

  const { data, isLoading } = useQuery({
    queryKey: ['reportes-kpi', dateFrom, dateTo, campaignIds, agentId],
    queryFn: async () => {
      // Build gestiones query
      let gQuery = supabase
        .from('gestiones')
        .select('*', { count: 'exact', head: true })
      let contactadosQuery = supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .in('status', ['contactado', 'cotizado', 'en_proceso', 'venta'])
      let salesQuery = supabase.from('sales').select('valor_prima')
      let leadsQuery = supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })

      // Apply filters
      if (campaignIds.length > 0) {
        gQuery = gQuery.in('campaign_id', campaignIds)
        contactadosQuery = contactadosQuery.in('campaign_id', campaignIds)
        salesQuery = salesQuery.in('campaign_id', campaignIds)
        leadsQuery = leadsQuery.in('campaign_id', campaignIds)
      }
      if (agentId) {
        gQuery = gQuery.eq('agent_id', agentId)
        contactadosQuery = contactadosQuery.eq('agent_id', agentId)
        salesQuery = salesQuery.eq('agent_id', agentId)
        leadsQuery = leadsQuery.eq('agent_id', agentId)
      }
      if (dateFrom) {
        gQuery = gQuery.gte('created_at', dateFrom)
        contactadosQuery = contactadosQuery.gte('created_at', dateFrom)
        salesQuery = salesQuery.gte('created_at', dateFrom)
        leadsQuery = leadsQuery.gte('created_at', dateFrom)
      }
      if (dateTo) {
        const toEnd = dateTo + 'T23:59:59'
        gQuery = gQuery.lte('created_at', toEnd)
        contactadosQuery = contactadosQuery.lte('created_at', toEnd)
        salesQuery = salesQuery.lte('created_at', toEnd)
        leadsQuery = leadsQuery.lte('created_at', toEnd)
      }

      const [gestiones, contactados, sales, leads] = await Promise.all([
        gQuery,
        contactadosQuery,
        salesQuery,
        leadsQuery,
      ])

      const totalGestiones = gestiones.count || 0
      const totalContactados = contactados.count || 0
      const salesData = sales.data || []
      const totalSales = salesData.length
      const totalPrima = salesData.reduce(
        (sum, s) => sum + (Number(s.valor_prima) || 0),
        0,
      )
      const totalLeads = leads.count || 0
      const efectividad =
        totalGestiones > 0 ? totalContactados / totalGestiones : 0
      const conversion = totalLeads > 0 ? totalSales / totalLeads : 0

      return {
        totalGestiones,
        totalContactados,
        efectividad,
        totalSales,
        totalPrima,
        conversion,
      }
    },
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-30 rounded-xl" />
        ))}
      </div>
    )
  }

  const s = data ?? {
    totalGestiones: 0,
    totalContactados: 0,
    efectividad: 0,
    totalSales: 0,
    totalPrima: 0,
    conversion: 0,
  }

  const cards = [
    { label: 'Gestiones', value: s.totalGestiones, accent: '#3b82f6' },
    { label: 'Contactados', value: s.totalContactados, accent: '#14b8a6' },
    {
      label: 'Efectividad %',
      value: s.efectividad * 100,
      accent: '#f59e0b',
      format: (n: number) => `${n.toFixed(1)}%`,
    },
    { label: 'Ventas', value: s.totalSales, accent: '#22c55e' },
    {
      label: 'Prima Total',
      value: s.totalPrima,
      accent: '#a855f7',
      format: formatCOP,
    },
    {
      label: 'Conversion %',
      value: s.conversion * 100,
      accent: '#ef4444',
      format: (n: number) => `${n.toFixed(1)}%`,
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((c, i) => (
        <KpiCard
          key={c.label}
          label={c.label}
          value={c.value}
          accent={c.accent}
          format={c.format}
          delay={i * 0.05}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section 2: Rendimiento por Agente
// ---------------------------------------------------------------------------

type AgentRow = Record<string, unknown> & {
  id: string
  name: string
  gestiones: number
  contactados: number
  cotizados: number
  ventas: number
  prima: number
  conversion: number
}

function AgentPerformance({
  dateFrom,
  dateTo,
  campaignIds,
  agentId,
}: FilterParams) {
  const supabase = createClient()

  const { data, isLoading } = useQuery({
    queryKey: [
      'reportes-agent-performance',
      dateFrom,
      dateTo,
      campaignIds,
      agentId,
    ],
    queryFn: async () => {
      // Fetch agents first
      let agentsQuery = supabase
        .from('profiles')
        .select('id, full_name')
        .eq('is_active', true)
        .eq('role', 'agente')
        .order('full_name')

      if (agentId) {
        agentsQuery = agentsQuery.eq('id', agentId)
      }

      const { data: agentsList, error } = await agentsQuery
      if (error) throw error
      if (!agentsList || agentsList.length === 0) return []

      const results = await Promise.all(
        agentsList.map(async (agent) => {
          // Gestiones
          let gQuery = supabase
            .from('gestiones')
            .select('*', { count: 'exact', head: true })
            .eq('agent_id', agent.id)
          // Contactados
          let cQuery = supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('agent_id', agent.id)
            .in('status', ['contactado', 'cotizado', 'en_proceso', 'venta'])
          // Cotizados
          let qQuery = supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('agent_id', agent.id)
            .in('status', ['cotizado', 'en_proceso', 'venta'])
          // Sales
          let sQuery = supabase
            .from('sales')
            .select('valor_prima')
            .eq('agent_id', agent.id)

          // Apply shared filters
          if (campaignIds.length > 0) {
            gQuery = gQuery.in('campaign_id', campaignIds)
            cQuery = cQuery.in('campaign_id', campaignIds)
            qQuery = qQuery.in('campaign_id', campaignIds)
            sQuery = sQuery.in('campaign_id', campaignIds)
          }
          if (dateFrom) {
            gQuery = gQuery.gte('created_at', dateFrom)
            cQuery = cQuery.gte('created_at', dateFrom)
            qQuery = qQuery.gte('created_at', dateFrom)
            sQuery = sQuery.gte('created_at', dateFrom)
          }
          if (dateTo) {
            const toEnd = dateTo + 'T23:59:59'
            gQuery = gQuery.lte('created_at', toEnd)
            cQuery = cQuery.lte('created_at', toEnd)
            qQuery = qQuery.lte('created_at', toEnd)
            sQuery = sQuery.lte('created_at', toEnd)
          }

          const [gestiones, contactados, cotizados, sales] = await Promise.all([
            gQuery,
            cQuery,
            qQuery,
            sQuery,
          ])

          const gestionCount = gestiones.count || 0
          const contactadoCount = contactados.count || 0
          const cotizadoCount = cotizados.count || 0
          const salesData = sales.data || []
          const ventasCount = salesData.length
          const prima = salesData.reduce(
            (sum, s) => sum + (Number(s.valor_prima) || 0),
            0,
          )
          const conversion =
            gestionCount > 0 ? (ventasCount / gestionCount) * 100 : 0

          return {
            id: agent.id,
            name: agent.full_name,
            gestiones: gestionCount,
            contactados: contactadoCount,
            cotizados: cotizadoCount,
            ventas: ventasCount,
            prima,
            conversion: Number(conversion.toFixed(1)),
          } as AgentRow
        }),
      )

      return results.sort((a, b) => b.ventas - a.ventas)
    },
  })

  const columns: Column<AgentRow>[] = [
    {
      key: 'name',
      header: 'Agente',
      render: (row) => (
        <span className="font-medium text-on-surface">{row.name}</span>
      ),
    },
    {
      key: 'gestiones',
      header: 'Gestiones',
      className: 'text-right',
      sortable: true,
      render: (row) => (
        <span className="tabular-nums">{row.gestiones.toLocaleString()}</span>
      ),
    },
    {
      key: 'contactados',
      header: 'Contactados',
      className: 'text-right',
      render: (row) => (
        <span className="tabular-nums">
          {row.contactados.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'cotizados',
      header: 'Cotizados',
      className: 'text-right',
      render: (row) => (
        <span className="tabular-nums">{row.cotizados.toLocaleString()}</span>
      ),
    },
    {
      key: 'ventas',
      header: 'Ventas',
      className: 'text-right',
      sortable: true,
      render: (row) => (
        <span className="tabular-nums font-semibold text-emerald-700">
          {row.ventas.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'prima',
      header: 'Prima',
      className: 'text-right',
      sortable: true,
      render: (row) => (
        <span className="tabular-nums">{formatCOP(row.prima)}</span>
      ),
    },
    {
      key: 'conversion',
      header: 'Conversion %',
      className: 'text-right',
      sortable: true,
      render: (row) => (
        <span
          className={cn(
            'tabular-nums font-semibold',
            row.conversion >= 10
              ? 'text-emerald-600'
              : row.conversion >= 5
                ? 'text-amber-600'
                : 'text-on-surface-variant',
          )}
        >
          {row.conversion}%
        </span>
      ),
    },
  ]

  return (
    <SectionCard title="Rendimiento por Agente" delay={0.1}>
      <DataTable<AgentRow>
        columns={columns}
        data={data || []}
        isLoading={isLoading}
        emptyMessage="No hay datos de agentes para los filtros seleccionados."
      />
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Section 3: Distribucion de Tipificaciones
// ---------------------------------------------------------------------------

type TipRow = Record<string, unknown> & {
  id: string
  name: string
  count: number
  percent: number
}

function TipificacionBreakdown({
  dateFrom,
  dateTo,
  campaignIds,
}: Omit<FilterParams, 'agentId'>) {
  const supabase = createClient()

  const { data, isLoading } = useQuery({
    queryKey: ['reportes-tipificaciones', dateFrom, dateTo, campaignIds],
    queryFn: async () => {
      // Get all gestiones with tipificacion
      let query = supabase
        .from('gestiones')
        .select('tipificacion_id, tipificacion_tree!inner(id, name, level)')

      if (campaignIds.length > 0) {
        query = query.in('campaign_id', campaignIds)
      }
      if (dateFrom) query = query.gte('created_at', dateFrom)
      if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59')

      const { data: rows, error } = await query.limit(5000)
      if (error) throw error
      if (!rows || rows.length === 0) return []

      // Group by tipificacion level 1 name
      const counts: Record<string, number> = {}
      for (const row of rows) {
        const tip = row.tipificacion_tree as unknown as {
          id: string
          name: string
          level: number
        } | null
        if (tip) {
          const name = tip.name
          counts[name] = (counts[name] || 0) + 1
        }
      }

      const total = rows.length
      const result: TipRow[] = Object.entries(counts)
        .map(([name, count]) => ({
          id: name,
          name,
          count,
          percent: Number(((count / total) * 100).toFixed(1)),
        }))
        .sort((a, b) => b.count - a.count)

      return result
    },
  })

  const columns: Column<TipRow>[] = [
    {
      key: 'name',
      header: 'Tipificacion Nivel 1',
      render: (row) => (
        <span className="font-medium text-on-surface">{row.name}</span>
      ),
    },
    {
      key: 'count',
      header: 'Conteo',
      className: 'text-right',
      sortable: true,
      render: (row) => (
        <span className="tabular-nums">{row.count.toLocaleString()}</span>
      ),
    },
    {
      key: 'percent',
      header: '%',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <div className="w-16 h-2 rounded-full bg-surface-container overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-primary"
              style={{ width: `${Math.min(row.percent, 100)}%` }}
            />
          </div>
          <span className="tabular-nums text-on-surface-variant w-12 text-right">
            {row.percent}%
          </span>
        </div>
      ),
    },
  ]

  return (
    <SectionCard title="Distribucion de Tipificaciones" delay={0.15}>
      <div className="mb-4 p-3 rounded-lg bg-surface-container-low">
        <p className="text-[0.75rem] text-on-surface-variant">
          Grafico de tipificaciones — se implementara con Nivo en Phase 10
        </p>
      </div>
      <DataTable<TipRow>
        columns={columns}
        data={data || []}
        isLoading={isLoading}
        emptyMessage="No hay datos de tipificaciones para los filtros seleccionados."
      />
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Section 4: Performance por Fuente
// ---------------------------------------------------------------------------

type SourceRow = Record<string, unknown> & {
  id: string
  source: string
  leads: number
  contactadosPct: number
  ventas: number
  conversion: number
}

function SourcePerformance({
  dateFrom,
  dateTo,
  campaignIds,
}: Omit<FilterParams, 'agentId'>) {
  const supabase = createClient()

  const { data, isLoading } = useQuery({
    queryKey: ['reportes-source', dateFrom, dateTo, campaignIds],
    queryFn: async () => {
      // Fetch leads with their status and source
      let query = supabase.from('leads').select('id, source, status')

      if (campaignIds.length > 0) {
        query = query.in('campaign_id', campaignIds)
      }
      if (dateFrom) query = query.gte('created_at', dateFrom)
      if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59')

      const { data: rows, error } = await query.limit(10000)
      if (error) throw error
      if (!rows || rows.length === 0) return []

      // Group by source
      const sources: Record<
        string,
        { total: number; contactados: number; ventas: number }
      > = {}

      for (const lead of rows) {
        const src = (lead.source as string) || 'sin_fuente'
        if (!sources[src]) sources[src] = { total: 0, contactados: 0, ventas: 0 }
        sources[src].total++
        if (
          ['contactado', 'cotizado', 'en_proceso', 'venta'].includes(
            lead.status,
          )
        ) {
          sources[src].contactados++
        }
        if (lead.status === 'venta') {
          sources[src].ventas++
        }
      }

      const result: SourceRow[] = Object.entries(sources)
        .map(([source, stats]) => ({
          id: source,
          source: source.replace(/_/g, ' '),
          leads: stats.total,
          contactadosPct:
            stats.total > 0
              ? Number(((stats.contactados / stats.total) * 100).toFixed(1))
              : 0,
          ventas: stats.ventas,
          conversion:
            stats.total > 0
              ? Number(((stats.ventas / stats.total) * 100).toFixed(1))
              : 0,
        }))
        .sort((a, b) => b.leads - a.leads)

      return result
    },
  })

  const columns: Column<SourceRow>[] = [
    {
      key: 'source',
      header: 'Fuente',
      render: (row) => (
        <span className="font-medium text-on-surface capitalize">
          {row.source}
        </span>
      ),
    },
    {
      key: 'leads',
      header: 'Leads',
      className: 'text-right',
      sortable: true,
      render: (row) => (
        <span className="tabular-nums">{row.leads.toLocaleString()}</span>
      ),
    },
    {
      key: 'contactadosPct',
      header: 'Contactados %',
      className: 'text-right',
      render: (row) => (
        <span className="tabular-nums">{row.contactadosPct}%</span>
      ),
    },
    {
      key: 'ventas',
      header: 'Ventas',
      className: 'text-right',
      sortable: true,
      render: (row) => (
        <span className="tabular-nums font-semibold text-emerald-700">
          {row.ventas.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'conversion',
      header: 'Conversion %',
      className: 'text-right',
      render: (row) => (
        <span
          className={cn(
            'tabular-nums font-semibold',
            row.conversion >= 10
              ? 'text-emerald-600'
              : row.conversion >= 5
                ? 'text-amber-600'
                : 'text-on-surface-variant',
          )}
        >
          {row.conversion}%
        </span>
      ),
    },
  ]

  return (
    <SectionCard title="Performance por Fuente" delay={0.2}>
      <DataTable<SourceRow>
        columns={columns}
        data={data || []}
        isLoading={isLoading}
        emptyMessage="No hay datos de fuentes para los filtros seleccionados."
      />
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Section 5: Tendencia Mensual
// ---------------------------------------------------------------------------

type MonthRow = Record<string, unknown> & {
  id: string
  month: string
  gestiones: number
  ventas: number
  prima: number
  conversion: number
}

function MonthlyTrend({
  dateFrom,
  dateTo,
  campaignIds,
}: Omit<FilterParams, 'agentId'>) {
  const supabase = createClient()

  const { data, isLoading } = useQuery({
    queryKey: ['reportes-monthly', dateFrom, dateTo, campaignIds],
    queryFn: async () => {
      // Fetch gestiones with dates
      let gQuery = supabase.from('gestiones').select('created_at')
      let sQuery = supabase.from('sales').select('created_at, valor_prima')

      if (campaignIds.length > 0) {
        gQuery = gQuery.in('campaign_id', campaignIds)
        sQuery = sQuery.in('campaign_id', campaignIds)
      }
      if (dateFrom) {
        gQuery = gQuery.gte('created_at', dateFrom)
        sQuery = sQuery.gte('created_at', dateFrom)
      }
      if (dateTo) {
        const toEnd = dateTo + 'T23:59:59'
        gQuery = gQuery.lte('created_at', toEnd)
        sQuery = sQuery.lte('created_at', toEnd)
      }

      const [gestiones, sales] = await Promise.all([
        gQuery.limit(10000),
        sQuery.limit(10000),
      ])

      const gData = gestiones.data || []
      const sData = sales.data || []

      // Group by month
      const months: Record<
        string,
        { gestiones: number; ventas: number; prima: number }
      > = {}

      for (const g of gData) {
        const m = (g.created_at as string).slice(0, 7) // YYYY-MM
        if (!months[m]) months[m] = { gestiones: 0, ventas: 0, prima: 0 }
        months[m].gestiones++
      }

      for (const s of sData) {
        const m = (s.created_at as string).slice(0, 7)
        if (!months[m]) months[m] = { gestiones: 0, ventas: 0, prima: 0 }
        months[m].ventas++
        months[m].prima += Number(s.valor_prima) || 0
      }

      const result: MonthRow[] = Object.entries(months)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, stats]) => ({
          id: month,
          month: formatMonthLabel(month),
          gestiones: stats.gestiones,
          ventas: stats.ventas,
          prima: stats.prima,
          conversion:
            stats.gestiones > 0
              ? Number(((stats.ventas / stats.gestiones) * 100).toFixed(1))
              : 0,
        }))

      return result
    },
  })

  const columns: Column<MonthRow>[] = [
    {
      key: 'month',
      header: 'Mes',
      render: (row) => (
        <span className="font-medium text-on-surface">{row.month}</span>
      ),
    },
    {
      key: 'gestiones',
      header: 'Gestiones',
      className: 'text-right',
      render: (row) => (
        <span className="tabular-nums">{row.gestiones.toLocaleString()}</span>
      ),
    },
    {
      key: 'ventas',
      header: 'Ventas',
      className: 'text-right',
      render: (row) => (
        <span className="tabular-nums font-semibold text-emerald-700">
          {row.ventas.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'prima',
      header: 'Prima',
      className: 'text-right',
      render: (row) => (
        <span className="tabular-nums">{formatCOP(row.prima)}</span>
      ),
    },
    {
      key: 'conversion',
      header: 'Conversion %',
      className: 'text-right',
      render: (row) => (
        <span
          className={cn(
            'tabular-nums font-semibold',
            row.conversion >= 10
              ? 'text-emerald-600'
              : row.conversion >= 5
                ? 'text-amber-600'
                : 'text-on-surface-variant',
          )}
        >
          {row.conversion}%
        </span>
      ),
    },
  ]

  return (
    <SectionCard title="Tendencia Mensual" delay={0.25}>
      <div className="mb-4 p-3 rounded-lg bg-surface-container-low">
        <p className="text-[0.75rem] text-on-surface-variant">
          Grafico de tendencia — se implementara con Recharts en Phase 10
        </p>
      </div>
      <DataTable<MonthRow>
        columns={columns}
        data={data || []}
        isLoading={isLoading}
        emptyMessage="No hay datos mensuales para los filtros seleccionados."
      />
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Shared section card wrapper
// ---------------------------------------------------------------------------

function SectionCard({
  title,
  delay = 0,
  children,
}: {
  title: string
  delay?: number
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="bg-surface-container-lowest rounded-xl shadow-ambient overflow-hidden"
    >
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-title-md text-on-surface">{title}</h2>
      </div>
      <div className="px-5 pb-5">{children}</div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Utility: format YYYY-MM to readable month
// ---------------------------------------------------------------------------

function formatMonthLabel(yyyymm: string): string {
  const [year, month] = yyyymm.split('-')
  const monthNames = [
    'Ene',
    'Feb',
    'Mar',
    'Abr',
    'May',
    'Jun',
    'Jul',
    'Ago',
    'Sep',
    'Oct',
    'Nov',
    'Dic',
  ]
  const idx = parseInt(month, 10) - 1
  return `${monthNames[idx] || month} ${year}`
}
