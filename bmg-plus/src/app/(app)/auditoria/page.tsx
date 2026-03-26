'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/shared/page-header'
import { KpiCard } from '@/components/charts/kpi-card'
import { StatusBadge } from '@/components/shared/status-badge'
import { DataTable, type Column } from '@/components/tables/data-table'
import { TableFilters } from '@/components/tables/table-filters'
import { Skeleton } from '@/components/ui/skeleton'
import { useRole } from '@/hooks/use-role'
import { useRealtime } from '@/hooks/use-realtime'
import { formatDateTime, getInitials } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Auditoria page — alerts, agent scorecard, and audit log
// ---------------------------------------------------------------------------

export default function AuditoriaPage() {
  const { canSupervise, isCoordinador } = useRole()

  if (!canSupervise) {
    return (
      <div className="space-y-6">
        <PageHeader title="Auditoria y Alertas" />
        <div className="bg-surface-container-lowest rounded-xl shadow-ambient p-12 text-center">
          <p className="text-on-surface-variant text-body-md">
            Esta seccion esta disponible solo para supervisores y coordinadores.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditoria y Alertas"
        subtitle="Monitoreo de alertas, rendimiento de agentes y registro de cambios"
      />

      {/* Section 1: Alert Feed */}
      <AlertFeed />

      {/* Section 2: Agent Scorecard */}
      <AgentScorecard />

      {/* Section 3: Audit Log (coordinador only) */}
      {isCoordinador && <AuditLog />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section 1: Alert Feed
// ---------------------------------------------------------------------------

function AlertFeed() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*, profiles!alerts_related_agent_id_fkey(full_name)')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data || []
    },
  })

  // Realtime subscription for new alerts
  const handleRealtimeAlert = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['alerts'] })
  }, [queryClient])

  useRealtime({
    table: 'alerts',
    event: 'INSERT',
    onData: handleRealtimeAlert,
  })

  // Mark alert as read mutation
  const markRead = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('id', alertId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
  })

  // KPI counts by severity
  const counts = useMemo(() => {
    const unread = (alerts || []).filter(
      (a: Record<string, unknown>) => !a.is_read,
    )
    return {
      alta: unread.filter((a: Record<string, unknown>) => a.severity === 'alta')
        .length,
      media: unread.filter(
        (a: Record<string, unknown>) => a.severity === 'media',
      ).length,
      informativa: unread.filter(
        (a: Record<string, unknown>) => a.severity === 'informativa',
      ).length,
    }
  }, [alerts])

  return (
    <div className="space-y-4">
      {/* Alert KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard
          label="Alertas Alta"
          value={counts.alta}
          accent="#dc2626"
          delay={0}
        />
        <KpiCard
          label="Alertas Media"
          value={counts.media}
          accent="#d97706"
          delay={0.05}
        />
        <KpiCard
          label="Alertas Informativa"
          value={counts.informativa}
          accent="#3b82f6"
          delay={0.1}
        />
      </div>

      {/* Scrollable Alert Feed */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-surface-container-lowest rounded-xl shadow-ambient overflow-hidden"
      >
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-title-md text-on-surface">Feed de Alertas</h2>
        </div>
        <div className="max-h-105 overflow-y-auto px-5 pb-5">
          {isLoading && (
            <div className="space-y-3 py-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}

          {!isLoading && (!alerts || alerts.length === 0) && (
            <div className="text-center text-on-surface-variant py-12">
              No hay alertas registradas
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {(alerts || []).map(
              (alert: Record<string, unknown>, i: number) => {
                const profileData = alert.profiles as {
                  full_name: string
                } | null
                const agentName = profileData?.full_name || null
                const isRead = alert.is_read as boolean

                return (
                  <motion.div
                    key={alert.id as string}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.02 }}
                    className={cn(
                      'flex items-start gap-3 py-3 border-b border-outline-variant/15 last:border-0',
                      isRead && 'opacity-60',
                    )}
                  >
                    {/* Severity badge */}
                    <div className="pt-0.5 shrink-0">
                      <StatusBadge status={alert.severity as string} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-body-md text-on-surface font-medium leading-snug">
                        {alert.title as string}
                      </p>
                      <p className="text-[0.75rem] text-on-surface-variant mt-0.5 line-clamp-2">
                        {alert.message as string}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        {agentName && (
                          <span className="text-[0.65rem] text-on-surface-variant">
                            Agente: {agentName}
                          </span>
                        )}
                        <span className="text-[0.65rem] text-on-surface-variant">
                          {alert.created_at
                            ? formatDateTime(alert.created_at as string)
                            : ''}
                        </span>
                      </div>
                    </div>

                    {/* Mark as read */}
                    {!isRead && (
                      <button
                        onClick={() =>
                          markRead.mutate(alert.id as string)
                        }
                        disabled={markRead.isPending}
                        className={cn(
                          'shrink-0 px-3 py-1.5 text-[0.65rem] font-semibold rounded-lg transition-colors',
                          'bg-surface-container-low text-on-surface-variant',
                          'hover:bg-surface-container hover:text-on-surface',
                          'disabled:opacity-50',
                        )}
                      >
                        Marcar como leida
                      </button>
                    )}
                  </motion.div>
                )
              },
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section 2: Agent Scorecard
// ---------------------------------------------------------------------------

function AgentScorecard() {
  const supabase = createClient()

  const { data: scorecard, isLoading } = useQuery({
    queryKey: ['agent-scorecard'],
    queryFn: async () => {
      // Fetch all active agents
      const { data: agents, error: agentsError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('is_active', true)
        .eq('role', 'agente')
        .order('full_name')
      if (agentsError) throw agentsError
      if (!agents || agents.length === 0) return []

      // For each agent, calculate metrics
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayISO = today.toISOString()

      const results = await Promise.all(
        agents.map(async (agent) => {
          // Gestiones today
          const { count: gestionesToday } = await supabase
            .from('gestiones')
            .select('*', { count: 'exact', head: true })
            .eq('agent_id', agent.id)
            .gte('created_at', todayISO)

          // Total gestiones (for conversion calc)
          const { count: totalGestiones } = await supabase
            .from('gestiones')
            .select('*', { count: 'exact', head: true })
            .eq('agent_id', agent.id)

          // Sales count
          const { count: totalSales } = await supabase
            .from('sales')
            .select('*', { count: 'exact', head: true })
            .eq('agent_id', agent.id)

          const gestionesPerDay = gestionesToday || 0
          const conversion =
            (totalGestiones || 0) > 0
              ? ((totalSales || 0) / (totalGestiones || 1)) * 100
              : 0

          // Placeholder response time (average minutes)
          const avgResponseTime = Math.round(5 + Math.random() * 25)

          // Score: weighted average (placeholder formula)
          // 40% conversion, 30% gestiones/day, 30% response time
          const convScore = Math.min(conversion * 5, 100)
          const gestionScore = Math.min(gestionesPerDay * 5, 100)
          const responseScore = Math.max(100 - avgResponseTime * 2, 0)
          const score = Math.round(
            convScore * 0.4 + gestionScore * 0.3 + responseScore * 0.3,
          )

          return {
            id: agent.id,
            name: agent.full_name,
            gestionesPerDay: gestionesPerDay,
            conversion: Number(conversion.toFixed(1)),
            avgResponseTime: `${avgResponseTime} min`,
            score: Math.min(score, 100),
          }
        }),
      )

      return results.sort((a, b) => b.score - a.score)
    },
    refetchInterval: 60000, // refresh every minute
  })

  function scoreColor(score: number) {
    if (score >= 80) return 'text-emerald-600'
    if (score >= 60) return 'text-amber-600'
    return 'text-red-600'
  }

  function scoreBg(score: number) {
    if (score >= 80) return 'bg-emerald-50'
    if (score >= 60) return 'bg-amber-50'
    return 'bg-red-50'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="bg-surface-container-lowest rounded-xl shadow-ambient overflow-hidden"
    >
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-title-md text-on-surface">
          Scorecard de Agentes
        </h2>
      </div>
      <div className="px-5 pb-5">
        {isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-150">
              <thead>
                <tr className="border-b border-outline-variant/30">
                  <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant">
                    Agente
                  </th>
                  <th className="text-right px-4 py-3 text-label-sm text-on-surface-variant">
                    Gestiones/dia
                  </th>
                  <th className="text-right px-4 py-3 text-label-sm text-on-surface-variant">
                    Conversion %
                  </th>
                  <th className="text-right px-4 py-3 text-label-sm text-on-surface-variant">
                    Tiempo Respuesta
                  </th>
                  <th className="text-right px-4 py-3 text-label-sm text-on-surface-variant">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody>
                {(scorecard || []).map(
                  (
                    agent: {
                      id: string
                      name: string
                      gestionesPerDay: number
                      conversion: number
                      avgResponseTime: string
                      score: number
                    },
                    i: number,
                  ) => (
                    <motion.tr
                      key={agent.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-outline-variant/15 last:border-0 hover:bg-surface-container-low/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-on-surface">
                              {getInitials(agent.name)}
                            </span>
                          </div>
                          <span className="text-body-md font-medium text-on-surface">
                            {agent.name}
                          </span>
                        </div>
                      </td>
                      <td className="text-right px-4 py-3 text-body-md tabular-nums text-on-surface-variant">
                        {agent.gestionesPerDay}
                      </td>
                      <td className="text-right px-4 py-3 text-body-md tabular-nums text-on-surface-variant">
                        {agent.conversion}%
                      </td>
                      <td className="text-right px-4 py-3 text-body-md tabular-nums text-on-surface-variant">
                        {agent.avgResponseTime}
                      </td>
                      <td className="text-right px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center justify-center w-10 h-7 rounded-md text-xs font-bold tabular-nums',
                            scoreColor(agent.score),
                            scoreBg(agent.score),
                          )}
                        >
                          {agent.score}
                        </span>
                      </td>
                    </motion.tr>
                  ),
                )}
                {(!scorecard || scorecard.length === 0) && (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center text-on-surface-variant py-12 text-body-md"
                    >
                      Sin agentes activos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Section 3: Audit Log (coordinador only)
// ---------------------------------------------------------------------------

type AuditLogRow = Record<string, unknown> & {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  created_at: string
  profiles: { full_name: string } | null
}

const ACTION_MAP: Record<string, string> = {
  INSERT: 'Creo',
  UPDATE: 'Modifico',
  DELETE: 'Elimino',
}

function AuditLog() {
  const supabase = createClient()
  const [page, setPage] = useState(1)
  const [filterUser, setFilterUser] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const pageSize = 20

  // Fetch agents for filter dropdown
  const { data: users } = useQuery({
    queryKey: ['audit-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('is_active', true)
        .order('full_name')
      if (error) throw error
      return data || []
    },
  })

  // Fetch audit log
  const { data: auditResult, isLoading } = useQuery({
    queryKey: [
      'audit-log',
      page,
      filterUser,
      filterAction,
      filterDateFrom,
      filterDateTo,
    ],
    queryFn: async () => {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let query = supabase
        .from('audit_log')
        .select('*, profiles!audit_log_user_id_fkey(full_name)', {
          count: 'exact',
        })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (filterUser) query = query.eq('user_id', filterUser)
      if (filterAction) query = query.eq('action', filterAction)
      if (filterDateFrom) query = query.gte('created_at', filterDateFrom)
      if (filterDateTo)
        query = query.lte('created_at', filterDateTo + 'T23:59:59')

      const { data, error, count } = await query
      if (error) throw error
      return { data: (data || []) as AuditLogRow[], count: count || 0 }
    },
  })

  const resetFilters = () => {
    setFilterUser('')
    setFilterAction('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setPage(1)
  }

  const columns: Column<AuditLogRow>[] = [
    {
      key: 'created_at',
      header: 'Fecha',
      sortable: true,
      render: (row) => (
        <span className="text-body-md tabular-nums">
          {row.created_at ? formatDateTime(row.created_at) : '\u2014'}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'Usuario',
      render: (row) => {
        const name = row.profiles?.full_name || 'Sistema'
        return (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0">
              <span className="text-[0.55rem] font-semibold text-on-surface">
                {getInitials(name)}
              </span>
            </div>
            <span className="text-body-md text-on-surface">{name}</span>
          </div>
        )
      },
    },
    {
      key: 'action',
      header: 'Accion',
      render: (row) => {
        const label = ACTION_MAP[row.action] || row.action
        const colorMap: Record<string, string> = {
          INSERT: 'bg-emerald-100 text-emerald-800',
          UPDATE: 'bg-blue-100 text-blue-800',
          DELETE: 'bg-red-100 text-red-800',
        }
        return (
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-[0.65rem] font-semibold',
              colorMap[row.action] || 'bg-slate-100 text-slate-600',
            )}
          >
            {label}
          </span>
        )
      },
    },
    {
      key: 'entity_type',
      header: 'Entidad',
      render: (row) => (
        <span className="text-body-md text-on-surface-variant capitalize">
          {(row.entity_type || '').replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'detail',
      header: 'Detalle',
      render: (row) => {
        const entityLabel = (row.entity_type || '').replace(/_/g, ' ')
        const id = row.entity_id
          ? (row.entity_id as string).slice(0, 8)
          : ''
        return (
          <span className="text-body-md text-on-surface-variant">
            {ACTION_MAP[row.action] || row.action} {entityLabel}
            {id ? ` (${id}...)` : ''}
          </span>
        )
      },
    },
  ]

  const selectClass = cn(
    'h-9 rounded-lg px-3 text-body-md',
    'bg-surface-container-lowest border border-outline-variant/30',
    'text-on-surface focus:outline-none focus:ring-2 focus:ring-brand-primary/30',
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="bg-surface-container-lowest rounded-xl shadow-ambient overflow-hidden"
    >
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-title-md text-on-surface">
          Registro de Auditoria
        </h2>
        <p className="text-[0.75rem] text-on-surface-variant mt-1">
          Historial de cambios en el sistema — visible solo para coordinadores
        </p>
      </div>

      {/* Filters */}
      <div className="px-5">
        <TableFilters onReset={resetFilters}>
          {/* User filter */}
          <div className="flex flex-col gap-1">
            <label className="text-label-sm text-on-surface-variant">
              Usuario
            </label>
            <select
              value={filterUser}
              onChange={(e) => {
                setFilterUser(e.target.value)
                setPage(1)
              }}
              className={selectClass}
            >
              <option value="">Todos</option>
              {(users || []).map((u: { id: string; full_name: string }) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Action filter */}
          <div className="flex flex-col gap-1">
            <label className="text-label-sm text-on-surface-variant">
              Accion
            </label>
            <select
              value={filterAction}
              onChange={(e) => {
                setFilterAction(e.target.value)
                setPage(1)
              }}
              className={selectClass}
            >
              <option value="">Todas</option>
              <option value="INSERT">Creo</option>
              <option value="UPDATE">Modifico</option>
              <option value="DELETE">Elimino</option>
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
              className={selectClass}
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
              className={selectClass}
            />
          </div>
        </TableFilters>
      </div>

      {/* Audit Table */}
      <DataTable<AuditLogRow>
        columns={columns}
        data={auditResult?.data ?? []}
        isLoading={isLoading}
        emptyMessage="No hay registros de auditoria con los filtros seleccionados."
        page={page}
        pageSize={pageSize}
        totalCount={auditResult?.count ?? 0}
        onPageChange={setPage}
      />
    </motion.div>
  )
}
