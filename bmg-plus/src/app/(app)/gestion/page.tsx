'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { TableFilters } from '@/components/tables/table-filters'
import { DataTable, type Column } from '@/components/tables/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { useLeads } from '@/lib/queries/use-leads'
import { useCampaigns } from '@/lib/queries/use-campaigns'
import { useAgents } from '@/lib/queries/use-agents'
import { useCampaignStore } from '@/stores/campaign-store'
import { formatDate, formatPhone } from '@/lib/utils/format'
import { LEAD_STATUSES } from '@/lib/utils/constants'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function GestionPage() {
  const router = useRouter()

  // Filter state
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [agentId, setAgentId] = useState<string | null>(null)
  const [campaignFilter, setCampaignFilter] = useState<string | null>(null)

  // Global campaign store
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId)
  const effectiveCampaignId = campaignFilter || activeCampaignId || undefined

  // Data queries
  const { data: campaigns = [] } = useCampaigns()
  const { data: agents = [] } = useAgents(effectiveCampaignId)
  const { data: leadsResult, isLoading } = useLeads({
    page,
    pageSize,
    search: search || undefined,
    status: status || undefined,
    agentId: agentId || undefined,
    campaignId: effectiveCampaignId,
  })

  const leads = leadsResult?.data ?? []
  const totalCount = leadsResult?.count ?? 0

  // Reset all filters
  const handleReset = useCallback(() => {
    setSearch('')
    setStatus(null)
    setAgentId(null)
    setCampaignFilter(null)
    setPage(1)
  }, [])

  // Navigate to lead detail on row click
  const handleRowClick = useCallback(
    (row: Record<string, unknown>) => {
      router.push(`/gestion/${row.id as string}`)
    },
    [router]
  )

  // When any filter changes, reset to page 1
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value)
      setPage(1)
    },
    []
  )

  const handleStatusChange = useCallback((val: string | null) => {
    setStatus(val)
    setPage(1)
  }, [])

  const handleAgentChange = useCallback((val: string | null) => {
    setAgentId(val)
    setPage(1)
  }, [])

  const handleCampaignChange = useCallback((val: string | null) => {
    setCampaignFilter(val)
    setPage(1)
  }, [])

  // Table columns
  const columns: Column<Record<string, unknown>>[] = useMemo(
    () => [
      {
        key: 'nombre',
        header: 'Nombre',
        sortable: true,
        render: (row) => (
          <span className="font-medium text-on-surface">
            {row.nombre as string}
          </span>
        ),
      },
      {
        key: 'telefono',
        header: 'Telefono',
        render: (row) => formatPhone(row.telefono as string),
      },
      {
        key: 'campaign',
        header: 'Campana',
        render: (row) => {
          const campaign = row.campaigns as {
            name: string
            color: string | null
          } | null
          if (!campaign) return '\u2014'
          return (
            <span
              className="inline-flex items-center gap-1.5 text-xs font-medium"
            >
              <span
                className="inline-block size-2 rounded-full"
                style={{ backgroundColor: campaign.color ?? '#6b7280' }}
              />
              {campaign.name}
            </span>
          )
        },
      },
      {
        key: 'agent',
        header: 'Agente',
        render: (row) => {
          const profile = row.profiles as { full_name: string } | null
          return profile?.full_name ?? '\u2014'
        },
      },
      {
        key: 'status',
        header: 'Estado',
        render: (row) => {
          const s = row.status as string | null
          if (!s) return '\u2014'
          return <StatusBadge status={s} />
        },
      },
      {
        key: 'created_at',
        header: 'Creado',
        sortable: true,
        render: (row) => {
          const d = row.created_at as string | null
          return d ? formatDate(d) : '\u2014'
        },
      },
    ],
    []
  )

  return (
    <div>
      <PageHeader
        title="Gestion de Leads"
        subtitle={`${totalCount} leads en total`}
      />

      {/* Filters */}
      <TableFilters onReset={handleReset}>
        {/* Campaign select */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Campana</Label>
          <Select
            value={campaignFilter}
            onValueChange={handleCampaignChange}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map(
                (c: Record<string, unknown>) => (
                  <SelectItem key={c.id as string} value={c.id as string}>
                    {c.name as string}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Status select */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Estado</Label>
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-35">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  <span className="capitalize">{s.replace(/_/g, ' ')}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Agent select */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Agente</Label>
          <Select value={agentId} onValueChange={handleAgentChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              {(agents as Record<string, unknown>[]).map((a) => (
                <SelectItem key={a.id as string} value={a.id as string}>
                  {a.full_name as string}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Buscar</Label>
          <Input
            value={search}
            onChange={handleSearchChange}
            placeholder="Nombre, telefono, documento..."
            className="w-55"
          />
        </div>
      </TableFilters>

      {/* Data table */}
      <div className="rounded-xl bg-surface-container-lowest shadow-ambient">
        <DataTable
          columns={columns}
          data={leads as Record<string, unknown>[]}
          isLoading={isLoading}
          emptyMessage="No se encontraron leads con los filtros seleccionados."
          onRowClick={handleRowClick}
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={setPage}
        />
      </div>
    </div>
  )
}
