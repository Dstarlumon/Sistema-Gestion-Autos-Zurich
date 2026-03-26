'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { KpiCard } from '@/components/charts/kpi-card'
import { NivoBarChart } from '@/components/charts/nivo-bar-chart'
import { NivoLineChart } from '@/components/charts/nivo-line-chart'
import { NivoPieChart } from '@/components/charts/nivo-pie-chart'
import { DataTable, type Column } from '@/components/tables/data-table'
import { TableFilters } from '@/components/tables/table-filters'
import { useSales } from '@/lib/queries/use-sales'
import { useCampaigns } from '@/lib/queries/use-campaigns'
import { useAgents } from '@/lib/queries/use-agents'
import { useCampaignStore } from '@/stores/campaign-store'
import { createClient } from '@/lib/supabase/client'
import { formatCOP, formatDate, formatPercent } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

// ---------- Types ----------
type SaleRow = Record<string, unknown> & {
  id: string
  lead_id: string
  nombre_cliente: string
  documento: string | null
  valor_prima: number
  num_poliza: string
  tipo_seguro: string
  canal: string
  created_at: string
  agent_id: string
  campaign_id: string
  profiles: { full_name: string } | null
  campaigns: { name: string; color: string } | null
}

// ---------- Accent Colors ----------
const ACCENT = {
  blue: '#3b82f6',
  green: '#059669',
  teal: '#0d9488',
  amber: '#d97706',
  purple: '#7c3aed',
}

// ---------- Hook: fetch ALL sales for charts + KPIs ----------
function useAllSalesStats(filters: {
  campaignId?: string
  agentId?: string
}) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['all-sales-stats', filters],
    queryFn: async () => {
      let query = supabase
        .from('sales')
        .select(
          'id, agent_id, valor_prima, campaign_id, created_at, profiles!sales_agent_id_fkey(full_name), campaigns(name)',
        )

      if (filters.campaignId) query = query.eq('campaign_id', filters.campaignId)
      if (filters.agentId) query = query.eq('agent_id', filters.agentId)

      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
  })
}

// ---------- Hook: total count for KPIs ----------
function useSalesCount(filters: {
  campaignId?: string
  agentId?: string
}) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['sales-count', filters],
    queryFn: async () => {
      let query = supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })

      if (filters.campaignId) query = query.eq('campaign_id', filters.campaignId)
      if (filters.agentId) query = query.eq('agent_id', filters.agentId)

      const { count, error } = await query
      if (error) throw error
      return count ?? 0
    },
  })
}

// ---------- Hook: total leads count for conversion % ----------
function useLeadsCount(filters: {
  campaignId?: string
  agentId?: string
}) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['leads-count', filters],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })

      if (filters.campaignId) query = query.eq('campaign_id', filters.campaignId)
      if (filters.agentId) query = query.eq('agent_id', filters.agentId)

      const { count, error } = await query
      if (error) throw error
      return count ?? 0
    },
  })
}

// ---------- Hook: weekly trend for sales KPIs ----------
function useSalesTrend(filters: {
  campaignId?: string
  agentId?: string
}) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['sales-trend', filters],
    queryFn: async () => {
      const now = new Date()
      const dayOfWeek = now.getDay()
      const currentWeekStart = new Date(now)
      currentWeekStart.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
      currentWeekStart.setHours(0, 0, 0, 0)

      const prevWeekStart = new Date(currentWeekStart)
      prevWeekStart.setDate(prevWeekStart.getDate() - 7)
      const prevWeekEnd = new Date(currentWeekStart)
      prevWeekEnd.setMilliseconds(-1)

      let currQuery = supabase
        .from('sales')
        .select('valor_prima')
        .gte('created_at', currentWeekStart.toISOString())
      let prevQuery = supabase
        .from('sales')
        .select('valor_prima')
        .gte('created_at', prevWeekStart.toISOString())
        .lte('created_at', prevWeekEnd.toISOString())

      if (filters.campaignId) {
        currQuery = currQuery.eq('campaign_id', filters.campaignId)
        prevQuery = prevQuery.eq('campaign_id', filters.campaignId)
      }
      if (filters.agentId) {
        currQuery = currQuery.eq('agent_id', filters.agentId)
        prevQuery = prevQuery.eq('agent_id', filters.agentId)
      }

      const [curr, prev] = await Promise.all([currQuery, prevQuery])
      const currData = curr.data || []
      const prevData = prev.data || []

      const currCount = currData.length
      const prevCount = prevData.length
      const currPrima = currData.reduce((s, r) => s + (Number(r.valor_prima) || 0), 0)
      const prevPrima = prevData.reduce((s, r) => s + (Number(r.valor_prima) || 0), 0)

      const calcTrend = (c: number, p: number) => {
        if (p === 0) return c > 0 ? null : null
        return ((c - p) / p) * 100
      }

      return {
        salesTrend: calcTrend(currCount, prevCount),
        primaTrend: calcTrend(currPrima, prevPrima),
      }
    },
  })
}

export default function VentasPage() {
  // --- Global campaign filter ---
  const activeCampaign = useCampaignStore((s) => s.activeCampaignId)

  // --- Local filters ---
  const [page, setPage] = useState(1)
  const [filterCampaign, setFilterCampaign] = useState<string>('')
  const [filterAgent, setFilterAgent] = useState<string>('')
  const [filterDateFrom, setFilterDateFrom] = useState<string>('')
  const [filterDateTo, setFilterDateTo] = useState<string>('')
  const pageSize = 25

  // The effective campaign: local filter > global store
  const effectiveCampaign = filterCampaign || activeCampaign || undefined

  // --- Data hooks ---
  const { data: salesResult, isLoading } = useSales({
    page,
    pageSize,
    campaignId: effectiveCampaign,
    agentId: filterAgent || undefined,
    dateFrom: filterDateFrom || undefined,
    dateTo: filterDateTo || undefined,
  })
  const { data: campaigns } = useCampaigns()
  const { data: agents } = useAgents(effectiveCampaign)

  // Full dataset for charts and KPIs (not paginated)
  const { data: allSales } = useAllSalesStats({
    campaignId: effectiveCampaign,
    agentId: filterAgent || undefined,
  })
  const { data: fullCount } = useSalesCount({
    campaignId: effectiveCampaign,
    agentId: filterAgent || undefined,
  })

  // Leads count for conversion % calculation
  const { data: leadsCount } = useLeadsCount({
    campaignId: effectiveCampaign,
    agentId: filterAgent || undefined,
  })

  // Weekly trend for KPI indicators
  const { data: trendData } = useSalesTrend({
    campaignId: effectiveCampaign,
    agentId: filterAgent || undefined,
  })

  const makeTrend = (val: number | null | undefined) =>
    val != null ? { value: val, isPositive: val > 0 } : undefined

  const sales = (salesResult?.data ?? []) as SaleRow[]
  const totalCount = salesResult?.count ?? 0

  // --- KPI calculations (from full dataset) ---
  const totalVentas = fullCount ?? totalCount

  const primaTotal = useMemo(() => {
    if (!allSales || allSales.length === 0) return 0
    return allSales.reduce((sum, s) => sum + (Number(s.valor_prima) || 0), 0)
  }, [allSales])

  const primaPromedio = useMemo(() => {
    if (!allSales || allSales.length === 0) return 0
    const total = allSales.reduce((sum, s) => sum + (Number(s.valor_prima) || 0), 0)
    return total / allSales.length
  }, [allSales])

  // Unique agents who made sales
  const uniqueAgents = useMemo(() => {
    if (!allSales) return 0
    return new Set(allSales.map((s) => s.agent_id)).size
  }, [allSales])

  // Conversion %: total sales / total leads
  const conversionPercent = useMemo(() => {
    const totalSales = fullCount ?? 0
    const totalLeads = leadsCount ?? 0
    return totalSales > 0 && totalLeads > 0
      ? (totalSales / totalLeads) * 100
      : 0
  }, [fullCount, leadsCount])

  // Best agent by sale count (from full dataset)
  const agentSaleCount = useMemo(() => {
    const counts: Record<string, { name: string; count: number }> = {}
    for (const s of (allSales ?? [])) {
      const profileData = s.profiles as unknown as { full_name: string } | null
      const name = profileData?.full_name ?? 'Sin agente'
      const id = s.agent_id ?? 'unknown'
      if (!counts[id]) counts[id] = { name, count: 0 }
      counts[id].count++
    }
    return counts
  }, [allSales])

  const bestAgent = useMemo(() => {
    const entries = Object.values(agentSaleCount)
    if (entries.length === 0) return { name: '--', count: 0 }
    return entries.reduce((best, e) => (e.count > best.count ? e : best))
  }, [agentSaleCount])

  // --- Chart data computations ---

  // Chart 1: Sales by Agent (horizontal bar)
  const salesByAgent = useMemo(() => {
    if (!allSales || allSales.length === 0) return []
    const counts: Record<string, { agente: string; ventas: number }> = {}
    for (const s of allSales) {
      const profileData = s.profiles as unknown as { full_name: string } | null
      const name = profileData?.full_name ?? 'Sin agente'
      if (!counts[name]) counts[name] = { agente: name, ventas: 0 }
      counts[name].ventas++
    }
    return Object.values(counts)
      .sort((a, b) => b.ventas - a.ventas)
      .slice(0, 10)
  }, [allSales])

  // Chart 2: Monthly Prima (line/area)
  const monthlyPrimaData = useMemo(() => {
    if (!allSales || allSales.length === 0) return []
    const monthMap: Record<string, number> = {}
    for (const s of allSales) {
      if (!s.created_at) continue
      const d = new Date(s.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthMap[key] = (monthMap[key] || 0) + (Number(s.valor_prima) || 0)
    }
    const sorted = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
    return sorted.map(([month, total]) => ({ x: month, y: total }))
  }, [allSales])

  // Chart 3: Sales by Campaign (pie)
  const salesByCampaign = useMemo(() => {
    if (!allSales || allSales.length === 0) return []
    const counts: Record<string, { id: string; label: string; value: number }> = {}
    for (const s of allSales) {
      const campaignData = s.campaigns as unknown as { name: string } | null
      const name = campaignData?.name ?? 'Sin campana'
      if (!counts[name]) counts[name] = { id: name, label: name, value: 0 }
      counts[name].value++
    }
    return Object.values(counts).sort((a, b) => b.value - a.value)
  }, [allSales])

  // --- Reset filters ---
  const resetFilters = () => {
    setFilterCampaign('')
    setFilterAgent('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setPage(1)
  }

  // --- Table columns ---
  const columns: Column<SaleRow>[] = [
    {
      key: 'created_at',
      header: 'Fecha',
      sortable: true,
      render: (row) => (
        <span className="text-body-md tabular-nums">
          {formatDate(row.created_at)}
        </span>
      ),
    },
    {
      key: 'nombre_cliente',
      header: 'Cliente',
      render: (row) => (
        <span className="font-medium text-on-surface">
          {row.nombre_cliente || '\u2014'}
        </span>
      ),
    },
    {
      key: 'documento',
      header: 'Documento',
      render: (row) => (
        <span className="tabular-nums text-on-surface-variant">
          {row.documento || '\u2014'}
        </span>
      ),
    },
    {
      key: 'campaign',
      header: 'Campana',
      render: (row) => {
        const campaign = row.campaigns
        if (!campaign) return '\u2014'
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[0.65rem] font-semibold"
            style={{
              backgroundColor: `${campaign.color}18`,
              color: campaign.color,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: campaign.color }}
            />
            {campaign.name}
          </span>
        )
      },
    },
    {
      key: 'agent',
      header: 'Agente',
      render: (row) => row.profiles?.full_name ?? '\u2014',
    },
    {
      key: 'valor_prima',
      header: 'Prima',
      sortable: true,
      className: 'text-right',
      render: (row) => (
        <span className="tabular-nums font-semibold text-emerald-700">
          {formatCOP(Number(row.valor_prima) || 0)}
        </span>
      ),
    },
    {
      key: 'num_poliza',
      header: 'Poliza',
      render: (row) => (
        <span className="tabular-nums text-on-surface-variant">
          {row.num_poliza || '\u2014'}
        </span>
      ),
    },
    {
      key: 'tipo_seguro',
      header: 'Tipo Seguro',
      render: (row) => row.tipo_seguro || '\u2014',
    },
    {
      key: 'canal',
      header: 'Canal',
      render: (row) => (
        <span className="capitalize text-on-surface-variant">
          {row.canal || '\u2014'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (row) => (
        <Link
          href={`/gestion/${row.lead_id}`}
          className="text-xs font-medium text-brand-primary hover:underline"
        >
          Ver Lead
        </Link>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Ventas"
        subtitle="Registro consolidado de ventas generadas desde gestion"
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard
          label="Total Ventas"
          value={totalVentas}
          accent={ACCENT.blue}
          subtitle="ventas registradas"
          trend={makeTrend(trendData?.salesTrend)}
          delay={0}
        />
        <KpiCard
          label="Prima Total"
          value={primaTotal}
          format={formatCOP}
          accent={ACCENT.green}
          subtitle="acumulado"
          trend={makeTrend(trendData?.primaTrend)}
          delay={0.05}
        />
        <KpiCard
          label="Prima Promedio"
          value={primaPromedio}
          format={formatCOP}
          accent={ACCENT.teal}
          subtitle="por venta"
          delay={0.1}
        />
        <KpiCard
          label="Conversion %"
          value={conversionPercent}
          format={(n: number) => `${n.toFixed(1)}%`}
          accent="#ef4444"
          subtitle={`${leadsCount ?? 0} leads`}
          delay={0.15}
        />
        <KpiCard
          label="Agentes Activos"
          value={uniqueAgents}
          accent={ACCENT.amber}
          subtitle="con ventas"
          delay={0.2}
        />
        <KpiCard
          label="Mejor Agente"
          value={bestAgent.count}
          format={() => bestAgent.name}
          accent={ACCENT.purple}
          subtitle={`${bestAgent.count} ventas`}
          delay={0.25}
        />
      </div>

      {/* Filters + Table Card */}
      <div className="bg-surface-container-lowest rounded-xl shadow-ambient overflow-hidden">
        {/* Filters */}
        <TableFilters onReset={resetFilters}>
          {/* Campaign filter */}
          <div className="flex flex-col gap-1">
            <label className="text-label-sm text-on-surface-variant">
              Campana
            </label>
            <select
              value={filterCampaign}
              onChange={(e) => {
                setFilterCampaign(e.target.value)
                setPage(1)
              }}
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

          {/* Agent filter */}
          <div className="flex flex-col gap-1">
            <label className="text-label-sm text-on-surface-variant">
              Agente
            </label>
            <select
              value={filterAgent}
              onChange={(e) => {
                setFilterAgent(e.target.value)
                setPage(1)
              }}
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

          {/* Date range */}
          <div className="flex flex-col gap-1">
            <label className="text-label-sm text-on-surface-variant">
              Desde
            </label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => {
                setFilterDateFrom(e.target.value)
                setPage(1)
              }}
              className={cn(
                'h-9 rounded-lg px-3 text-body-md',
                'bg-surface-container-lowest border border-outline-variant/30',
                'text-on-surface focus:outline-none focus:ring-2 focus:ring-brand-primary/30',
              )}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-label-sm text-on-surface-variant">
              Hasta
            </label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => {
                setFilterDateTo(e.target.value)
                setPage(1)
              }}
              className={cn(
                'h-9 rounded-lg px-3 text-body-md',
                'bg-surface-container-lowest border border-outline-variant/30',
                'text-on-surface focus:outline-none focus:ring-2 focus:ring-brand-primary/30',
              )}
            />
          </div>
        </TableFilters>

        {/* Data Table */}
        <DataTable<SaleRow>
          columns={columns}
          data={sales}
          isLoading={isLoading}
          emptyMessage="No hay ventas registradas con los filtros seleccionados."
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={setPage}
        />
      </div>

      {/* ============================================================
          Charts Section
          ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Sales by Agent (horizontal bar) */}
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-ambient">
          <h3 className="text-title-md text-on-surface mb-1">Ventas por Agente</h3>
          <p className="text-xs text-on-surface-variant mb-4">Top 10 agentes por cantidad de ventas</p>
          <NivoBarChart
            data={salesByAgent}
            keys={['ventas']}
            indexBy="agente"
            layout="horizontal"
            colors={['#66cfd0']}
            height={Math.max(300, salesByAgent.length * 40)}
            margin={{ top: 10, right: 30, bottom: 40, left: 120 }}
            emptyMessage="Sin datos de ventas por agente"
          />
        </div>

        {/* Chart 3: Sales by Campaign (pie) */}
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-ambient">
          <h3 className="text-title-md text-on-surface mb-1">Ventas por Campana</h3>
          <p className="text-xs text-on-surface-variant mb-4">Distribucion de ventas por campana</p>
          <NivoPieChart
            data={salesByCampaign}
            height={300}
            colors={{ scheme: 'paired' }}
            emptyMessage="Sin datos de ventas por campana"
          />
        </div>
      </div>

      {/* Chart 2: Monthly Prima (line/area) — full width */}
      <div className="bg-surface-container-lowest rounded-xl p-6 shadow-ambient">
        <h3 className="text-title-md text-on-surface mb-1">Prima Mensual</h3>
        <p className="text-xs text-on-surface-variant mb-4">Evolucion mensual de prima acumulada</p>
        <NivoLineChart
          data={[
            {
              id: 'Prima',
              data: monthlyPrimaData,
            },
          ]}
          height={300}
          enableArea={true}
          areaOpacity={0.15}
          colors={['#fa5058']}
          margin={{ top: 10, right: 30, bottom: 40, left: 80 }}
          emptyMessage="Sin datos de prima mensual"
        />
      </div>
    </div>
  )
}
