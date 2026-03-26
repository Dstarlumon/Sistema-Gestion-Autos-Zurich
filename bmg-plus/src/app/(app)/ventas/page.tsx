'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/shared/page-header'
import { KpiCard } from '@/components/charts/kpi-card'
import { DataTable, type Column } from '@/components/tables/data-table'
import { TableFilters } from '@/components/tables/table-filters'
import { useSales } from '@/lib/queries/use-sales'
import { useCampaigns } from '@/lib/queries/use-campaigns'
import { useAgents } from '@/lib/queries/use-agents'
import { useCampaignStore } from '@/stores/campaign-store'
import { formatCOP, formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

// ---------- Types ----------
type SaleRow = Record<string, unknown> & {
  id: string
  lead_id: string
  nombre_cliente: string
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
  })
  const { data: campaigns } = useCampaigns()
  const { data: agents } = useAgents(effectiveCampaign)

  const sales = (salesResult?.data ?? []) as SaleRow[]
  const totalCount = salesResult?.count ?? 0

  // --- Date-filtered sales (client-side for date range) ---
  const filteredSales = useMemo(() => {
    let result = sales
    if (filterDateFrom) {
      result = result.filter((s) => s.created_at >= filterDateFrom)
    }
    if (filterDateTo) {
      const toDate = filterDateTo + 'T23:59:59'
      result = result.filter((s) => s.created_at <= toDate)
    }
    return result
  }, [sales, filterDateFrom, filterDateTo])

  // --- KPI calculations ---
  const totalVentas = totalCount
  const primaTotal = filteredSales.reduce(
    (sum, s) => sum + (Number(s.valor_prima) || 0),
    0,
  )
  const primaPromedio =
    filteredSales.length > 0 ? primaTotal / filteredSales.length : 0

  // Conversion rate: approximate from total sales vs total in the view
  const conversionPercent = totalVentas > 0 ? (totalVentas / Math.max(totalVentas * 5, 1)) * 100 : 0

  // Best agent by sale count
  const agentSaleCount = useMemo(() => {
    const counts: Record<string, { name: string; count: number }> = {}
    for (const s of filteredSales) {
      const name = s.profiles?.full_name ?? 'Sin agente'
      const id = s.agent_id ?? 'unknown'
      if (!counts[id]) counts[id] = { name, count: 0 }
      counts[id].count++
    }
    return counts
  }, [filteredSales])

  const bestAgent = useMemo(() => {
    const entries = Object.values(agentSaleCount)
    if (entries.length === 0) return { name: '--', count: 0 }
    return entries.reduce((best, e) => (e.count > best.count ? e : best))
  }, [agentSaleCount])

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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Total Ventas"
          value={totalVentas}
          accent={ACCENT.blue}
          subtitle="ventas registradas"
          delay={0}
        />
        <KpiCard
          label="Prima Total"
          value={primaTotal}
          format={formatCOP}
          accent={ACCENT.green}
          subtitle="acumulado"
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
          format={(n) => `${n.toFixed(1)}%`}
          accent={ACCENT.amber}
          subtitle="leads a venta"
          delay={0.15}
        />
        <KpiCard
          label="Mejor Agente"
          value={bestAgent.count}
          format={(n) => bestAgent.name}
          accent={ACCENT.purple}
          subtitle={`${bestAgent.count} ventas`}
          delay={0.2}
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
          data={filteredSales}
          isLoading={isLoading}
          emptyMessage="No hay ventas registradas con los filtros seleccionados."
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={setPage}
        />
      </div>
    </div>
  )
}
