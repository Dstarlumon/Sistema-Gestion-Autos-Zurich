'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { createClient } from '@/lib/supabase/client'
import { KpiCard } from '@/components/charts/kpi-card'
import { NivoBarChart } from '@/components/charts/nivo-bar-chart'
import { NivoLineChart } from '@/components/charts/nivo-line-chart'
import { PageHeader } from '@/components/shared/page-header'
import { StatusDot } from '@/components/shared/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useCampaigns } from '@/lib/queries/use-campaigns'
import { useCampaignStore } from '@/stores/campaign-store'
import { useAuthStore } from '@/stores/auth-store'
import { useRole } from '@/hooks/use-role'
import { useRealtime } from '@/hooks/use-realtime'
import { useRealtimeStore } from '@/stores/realtime-store'
import { formatCOP, formatPercent, formatDateTime, getInitials } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Dashboard page — first screen after login
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { isAgente, canSupervise } = useRole()
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const debounceRef = useRef<NodeJS.Timeout>(undefined)

  // Determine the agent filter for role-aware queries
  const agentFilter = isAgente ? user?.id ?? undefined : undefined

  // Realtime: invalidate dashboard stats on new gestiones/sales with 5s debounce
  const handleDashboardUpdate = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats-extended'] })
      queryClient.invalidateQueries({ queryKey: ['campaign-stats'] })
      queryClient.invalidateQueries({ queryKey: ['recent-activity'] })
      queryClient.invalidateQueries({ queryKey: ['weekly-trend'] })
      queryClient.invalidateQueries({ queryKey: ['agent-ranking'] })
    }, 5000)
  }, [queryClient])

  useRealtime({ table: 'gestiones', event: 'INSERT', onData: handleDashboardUpdate })
  useRealtime({ table: 'sales', event: 'INSERT', onData: handleDashboardUpdate })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={
          isAgente
            ? 'Tu rendimiento personal'
            : canSupervise
              ? 'Vista general de operaciones'
              : 'Resumen general'
        }
      />

      {/* KPI Row */}
      <KpiRow agentId={agentFilter} />

      {/* Section 1: Funnel + Campaign performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ConversionFunnel agentId={agentFilter} />
        <CampaignPerformance />
      </div>

      {/* Section 2: Agent Ranking + Weekly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AgentRanking />
        <WeeklyTrend />
      </div>

      {/* Section 3: Activity feed + Agent grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <RecentActivity agentId={agentFilter} />
        <ActiveAgents />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// KPI Row
// ---------------------------------------------------------------------------

function KpiRow({ agentId }: { agentId?: string }) {
  const { data, isLoading } = useDashboardStatsFiltered(agentId)

  const cards = useMemo(() => {
    const s = data ?? {
      totalGestiones: 0,
      contactados: 0,
      cotizados: 0,
      totalSales: 0,
      totalPrima: 0,
      conversionRate: 0,
      trends: { gestiones: null as number | null, sales: null as number | null, prima: null as number | null },
    }
    const trends = s.trends ?? { gestiones: null, sales: null, prima: null }

    const makeTrend = (val: number | null | undefined) =>
      val != null ? { value: val, isPositive: val > 0 } : undefined

    return [
      { label: 'Total Gestiones', value: s.totalGestiones, accent: '#3b82f6', trend: makeTrend(trends.gestiones) },
      { label: 'Contactados', value: s.contactados, accent: '#14b8a6' },
      { label: 'Cotizados', value: s.cotizados, accent: '#f59e0b' },
      { label: 'Ventas', value: s.totalSales, accent: '#22c55e', trend: makeTrend(trends.sales) },
      { label: 'Prima Total', value: s.totalPrima, accent: '#a855f7', format: formatCOP, trend: makeTrend(trends.prima) },
      { label: 'Conversion %', value: s.conversionRate * 100, accent: '#ef4444', format: (n: number) => `${n.toFixed(1)}%` },
    ]
  }, [data])

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-30 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((c, i) => (
        <KpiCard
          key={c.label}
          label={c.label}
          value={c.value}
          accent={c.accent}
          format={c.format}
          trend={c.trend}
          delay={i * 0.05}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Conversion Funnel
// ---------------------------------------------------------------------------

function ConversionFunnel({ agentId }: { agentId?: string }) {
  const { data, isLoading } = useDashboardStatsFiltered(agentId)

  const stages = useMemo(() => {
    if (!data) return []
    const total = data.totalGestiones || 1
    return [
      { label: 'Gestiones', count: data.totalGestiones, pct: 100, color: '#3b82f6' },
      { label: 'Contactados', count: data.contactados, pct: (data.contactados / total) * 100, color: '#14b8a6' },
      { label: 'Cotizados', count: data.cotizados, pct: (data.cotizados / total) * 100, color: '#f59e0b' },
      { label: 'Ventas', count: data.totalSales, pct: (data.totalSales / total) * 100, color: '#22c55e' },
    ]
  }, [data])

  return (
    <DashboardCard title="Embudo de Conversion" isLoading={isLoading}>
      <div className="space-y-3 py-2">
        {stages.map((stage, i) => (
          <motion.div
            key={stage.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1, duration: 0.3 }}
            className="space-y-1"
          >
            <div className="flex items-center justify-between text-body-md">
              <span className="text-on-surface font-medium">{stage.label}</span>
              <span className="text-on-surface-variant tabular-nums">
                {stage.count.toLocaleString()} ({stage.pct.toFixed(1)}%)
              </span>
            </div>
            <div className="h-7 rounded-md bg-surface-container overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(stage.pct, 2)}%` }}
                transition={{ delay: i * 0.1 + 0.2, duration: 0.6, ease: 'easeOut' }}
                className="h-full rounded-md flex items-center justify-end pr-2"
                style={{ backgroundColor: stage.color }}
              >
                {stage.pct >= 10 && (
                  <span className="text-[0.65rem] font-semibold text-white">
                    {stage.pct.toFixed(0)}%
                  </span>
                )}
              </motion.div>
            </div>
          </motion.div>
        ))}
      </div>
    </DashboardCard>
  )
}

// ---------------------------------------------------------------------------
// Campaign Performance Table
// ---------------------------------------------------------------------------

function CampaignPerformance() {
  const { data: campaigns, isLoading: campaignsLoading } = useCampaigns()
  const supabase = createClient()

  const { data: campaignStats, isLoading: statsLoading } = useQuery({
    queryKey: ['campaign-stats'],
    queryFn: async () => {
      if (!campaigns || campaigns.length === 0) return []

      const results = await Promise.all(
        campaigns.map(async (campaign) => {
          const [gestiones, sales] = await Promise.all([
            supabase
              .from('gestiones')
              .select('*', { count: 'exact', head: true })
              .eq('campaign_id', campaign.id),
            supabase
              .from('sales')
              .select('valor_prima')
              .eq('campaign_id', campaign.id),
          ])

          const gestionCount = gestiones.count || 0
          const salesData = sales.data || []
          const salesCount = salesData.length
          const prima = salesData.reduce(
            (sum, s) => sum + (Number(s.valor_prima) || 0),
            0
          )
          const conversion = gestionCount > 0 ? salesCount / gestionCount : 0

          return {
            id: campaign.id,
            name: campaign.name,
            color: campaign.color || '#6b7280',
            gestiones: gestionCount,
            ventas: salesCount,
            prima,
            conversion,
          }
        })
      )
      return results
    },
    enabled: !!campaigns && campaigns.length > 0,
  })

  const isLoading = campaignsLoading || statsLoading

  return (
    <DashboardCard title="Rendimiento por Campana" isLoading={isLoading}>
      <div className="overflow-x-auto -mx-5">
        <table className="w-full text-body-md">
          <thead>
            <tr className="border-b border-outline-variant/30">
              <th className="text-left text-label-sm text-on-surface-variant py-2 pl-5 pr-3">
                Campana
              </th>
              <th className="text-right text-label-sm text-on-surface-variant py-2 px-3">
                Gestiones
              </th>
              <th className="text-right text-label-sm text-on-surface-variant py-2 px-3">
                Ventas
              </th>
              <th className="text-right text-label-sm text-on-surface-variant py-2 px-3">
                Prima
              </th>
              <th className="text-right text-label-sm text-on-surface-variant py-2 pl-3 pr-5">
                Conv.
              </th>
            </tr>
          </thead>
          <tbody>
            {(campaignStats || []).map((c, i) => (
              <motion.tr
                key={c.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="border-b border-outline-variant/15 last:border-0 hover:bg-surface-container/50 transition-colors"
              >
                <td className="py-2.5 pl-5 pr-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="text-on-surface font-medium truncate">
                      {c.name}
                    </span>
                  </div>
                </td>
                <td className="text-right tabular-nums text-on-surface-variant py-2.5 px-3">
                  {c.gestiones.toLocaleString()}
                </td>
                <td className="text-right tabular-nums text-on-surface-variant py-2.5 px-3">
                  {c.ventas.toLocaleString()}
                </td>
                <td className="text-right tabular-nums text-on-surface-variant py-2.5 px-3">
                  {formatCOP(c.prima)}
                </td>
                <td className="text-right tabular-nums font-semibold py-2.5 pl-3 pr-5">
                  <span
                    className={cn(
                      c.conversion >= 0.1
                        ? 'text-emerald-600'
                        : c.conversion >= 0.05
                          ? 'text-amber-600'
                          : 'text-on-surface-variant'
                    )}
                  >
                    {formatPercent(c.conversion)}
                  </span>
                </td>
              </motion.tr>
            ))}
            {(!campaignStats || campaignStats.length === 0) && !isLoading && (
              <tr>
                <td
                  colSpan={5}
                  className="text-center text-on-surface-variant py-8"
                >
                  Sin campanas activas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DashboardCard>
  )
}

// ---------------------------------------------------------------------------
// Recent Activity Feed
// ---------------------------------------------------------------------------

function RecentActivity({ agentId }: { agentId?: string }) {
  const supabase = createClient()

  const { data: activities, isLoading } = useQuery({
    queryKey: ['recent-activity', agentId],
    queryFn: async () => {
      let query = supabase
        .from('gestiones')
        .select(
          'id, canal, created_at, observacion, profiles!gestiones_agent_id_fkey(full_name), leads!gestiones_lead_id_fkey(nombre)'
        )
        .order('created_at', { ascending: false })
        .limit(10)

      if (agentId) {
        query = query.eq('agent_id', agentId)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    refetchInterval: 30000,
  })

  const canalIcons: Record<string, string> = {
    telefono: '\u{1F4DE}',
    whatsapp: '\u{1F4AC}',
    email: '\u{1F4E7}',
    chatbot: '\u{1F916}',
  }

  return (
    <DashboardCard title="Actividad Reciente" isLoading={isLoading}>
      <div className="space-y-0.5 -mx-5">
        {(activities || []).map((a, i) => {
          const profileData = a.profiles as unknown as { full_name: string } | null
          const leadData = a.leads as unknown as { nombre: string } | null
          const agentName = profileData?.full_name || 'Agente'
          const leadName = leadData?.nombre || 'Lead'
          const icon = canalIcons[a.canal] || '\u{1F4CB}'

          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-start gap-3 px-5 py-2.5 hover:bg-surface-container/50 transition-colors"
            >
              {/* Icon */}
              <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-sm shrink-0 mt-0.5">
                {icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-body-md text-on-surface leading-snug">
                  <span className="font-semibold">{agentName}</span>{' '}
                  <span className="text-on-surface-variant">
                    registro gestion en
                  </span>{' '}
                  <span className="font-semibold">{leadName}</span>
                </p>
                <p className="text-[0.7rem] text-on-surface-variant mt-0.5">
                  {a.created_at ? formatDateTime(a.created_at) : ''}
                </p>
              </div>
            </motion.div>
          )
        })}
        {(!activities || activities.length === 0) && !isLoading && (
          <div className="text-center text-on-surface-variant py-8 px-5">
            Sin actividad reciente
          </div>
        )}
      </div>
    </DashboardCard>
  )
}

// ---------------------------------------------------------------------------
// Active Agents Grid (with Realtime)
// ---------------------------------------------------------------------------

function ActiveAgents() {
  const supabase = createClient()
  const { isAgente } = useRole()
  const agentStatuses = useRealtimeStore((s) => s.agentStatuses)
  const updateAgentStatus = useRealtimeStore((s) => s.updateAgentStatus)

  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, status, role, updated_at, avatar_url')
        .eq('is_active', true)
        .eq('role', 'agente')
        .order('full_name')
      if (error) throw error
      return data || []
    },
    enabled: !isAgente, // agents don't need to see the agent grid
  })

  // Seed the realtime store with initial data
  useEffect(() => {
    if (agents) {
      agents.forEach((agent) => {
        updateAgentStatus(agent.id, {
          id: agent.id,
          full_name: agent.full_name,
          status: agent.status,
          updated_at: agent.updated_at || '',
        })
      })
    }
  }, [agents, updateAgentStatus])

  // Subscribe to realtime profile changes
  const handleRealtimeUpdate = useCallback(
    (payload: { new: Record<string, unknown> }) => {
      const row = payload.new
      if (row && typeof row.id === 'string') {
        updateAgentStatus(row.id, {
          id: row.id as string,
          full_name: (row.full_name as string) || '',
          status: (row.status as string) || 'offline',
          updated_at: (row.updated_at as string) || '',
        })
      }
    },
    [updateAgentStatus]
  )

  useRealtime({
    table: 'profiles',
    event: 'UPDATE',
    filter: 'role=eq.agente',
    onData: handleRealtimeUpdate as Parameters<typeof useRealtime>[0]['onData'],
    enabled: !isAgente,
  })

  // Merge DB data with realtime updates
  const mergedAgents = useMemo(() => {
    if (!agents) return []
    return agents.map((agent) => {
      const realtimeData = agentStatuses.get(agent.id)
      return {
        ...agent,
        status: realtimeData?.status ?? agent.status,
      }
    })
  }, [agents, agentStatuses])

  if (isAgente) {
    return (
      <DashboardCard title="Agentes Activos">
        <div className="text-center text-on-surface-variant py-8">
          Vista disponible para supervisores
        </div>
      </DashboardCard>
    )
  }

  return (
    <DashboardCard title="Agentes Activos" isLoading={isLoading}>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {mergedAgents.map((agent, i) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-center gap-2.5 rounded-lg bg-surface-container-low p-3 transition-colors hover:bg-surface-container"
          >
            {/* Avatar with initials */}
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center">
                <span className="text-xs font-semibold text-on-surface">
                  {getInitials(agent.full_name)}
                </span>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5">
                <StatusDot status={agent.status} />
              </span>
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="text-body-md font-medium text-on-surface truncate leading-tight">
                {agent.full_name}
              </p>
              <p className="text-[0.65rem] text-on-surface-variant capitalize mt-0.5">
                {agent.status.replace(/_/g, ' ')}
              </p>
            </div>
          </motion.div>
        ))}
        {mergedAgents.length === 0 && !isLoading && (
          <div className="col-span-full text-center text-on-surface-variant py-8">
            Sin agentes activos
          </div>
        )}
      </div>
    </DashboardCard>
  )
}

// ---------------------------------------------------------------------------
// Agent Ranking (horizontal bar chart)
// ---------------------------------------------------------------------------

function AgentRanking() {
  const supabase = createClient()
  const activeCampaign = useCampaignStore((s) => s.activeCampaignId)

  const { data: rankingData, isLoading } = useQuery({
    queryKey: ['agent-ranking', activeCampaign],
    queryFn: async () => {
      let query = supabase
        .from('gestiones')
        .select('agent_id, profiles!gestiones_agent_id_fkey(full_name)')

      if (activeCampaign) {
        query = query.eq('campaign_id', activeCampaign)
      }

      const { data, error } = await query
      if (error) throw error

      // Count gestiones per agent
      const counts: Record<string, { agente: string; gestiones: number }> = {}
      for (const g of (data ?? [])) {
        const profileData = g.profiles as unknown as { full_name: string } | null
        const name = profileData?.full_name ?? 'Sin agente'
        const id = g.agent_id
        if (!counts[id]) counts[id] = { agente: name, gestiones: 0 }
        counts[id].gestiones++
      }

      return Object.values(counts)
        .sort((a, b) => b.gestiones - a.gestiones)
        .slice(0, 10)
    },
  })

  return (
    <DashboardCard title="Ranking de Agentes" isLoading={isLoading}>
      <NivoBarChart
        data={rankingData ?? []}
        keys={['gestiones']}
        indexBy="agente"
        layout="horizontal"
        colors={['#66cfd0']}
        height={Math.max(250, (rankingData?.length ?? 0) * 35)}
        margin={{ top: 10, right: 30, bottom: 30, left: 120 }}
        emptyMessage="Sin datos de gestiones por agente"
      />
    </DashboardCard>
  )
}

// ---------------------------------------------------------------------------
// Weekly Trend (line chart)
// ---------------------------------------------------------------------------

function WeeklyTrend() {
  const supabase = createClient()
  const activeCampaign = useCampaignStore((s) => s.activeCampaignId)

  const { data: trendData, isLoading } = useQuery({
    queryKey: ['weekly-trend', activeCampaign],
    queryFn: async () => {
      let gestionesQuery = supabase
        .from('gestiones')
        .select('created_at')
        .order('created_at', { ascending: true })

      let salesQuery = supabase
        .from('sales')
        .select('created_at')
        .order('created_at', { ascending: true })

      if (activeCampaign) {
        gestionesQuery = gestionesQuery.eq('campaign_id', activeCampaign)
        salesQuery = salesQuery.eq('campaign_id', activeCampaign)
      }

      const [gestionesRes, salesRes] = await Promise.all([gestionesQuery, salesQuery])

      const gestionesByWeek: Record<string, number> = {}
      for (const g of (gestionesRes.data ?? [])) {
        if (!g.created_at) continue
        const d = new Date(g.created_at)
        const startOfYear = new Date(d.getFullYear(), 0, 1)
        const weekNum = Math.ceil(
          ((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7,
        )
        const key = `Sem ${weekNum}`
        gestionesByWeek[key] = (gestionesByWeek[key] || 0) + 1
      }

      const salesByWeek: Record<string, number> = {}
      for (const s of (salesRes.data ?? [])) {
        if (!s.created_at) continue
        const d = new Date(s.created_at)
        const startOfYear = new Date(d.getFullYear(), 0, 1)
        const weekNum = Math.ceil(
          ((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7,
        )
        const key = `Sem ${weekNum}`
        salesByWeek[key] = (salesByWeek[key] || 0) + 1
      }

      const allWeeks = [...new Set([...Object.keys(gestionesByWeek), ...Object.keys(salesByWeek)])]
        .sort((a, b) => {
          const numA = parseInt(a.replace('Sem ', ''), 10)
          const numB = parseInt(b.replace('Sem ', ''), 10)
          return numA - numB
        })

      return [
        {
          id: 'Gestiones',
          data: allWeeks.map((w) => ({ x: w, y: gestionesByWeek[w] ?? 0 })),
        },
        {
          id: 'Ventas',
          data: allWeeks.map((w) => ({ x: w, y: salesByWeek[w] ?? 0 })),
        },
      ]
    },
  })

  return (
    <DashboardCard title="Tendencia Semanal" isLoading={isLoading}>
      <NivoLineChart
        data={trendData ?? []}
        height={300}
        enableArea={false}
        colors={['#3b82f6', '#059669']}
        margin={{ top: 10, right: 30, bottom: 40, left: 50 }}
        emptyMessage="Sin datos de tendencia semanal"
      />
    </DashboardCard>
  )
}

// ---------------------------------------------------------------------------
// Shared card wrapper
// ---------------------------------------------------------------------------

function DashboardCard({
  title,
  isLoading,
  children,
}: {
  title: string
  isLoading?: boolean
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-surface-container-lowest rounded-xl shadow-ambient overflow-hidden"
    >
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-title-md text-on-surface">{title}</h2>
      </div>
      <div className="px-5 pb-5">
        {isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : (
          children
        )}
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Extended dashboard stats hook (adds contactados + cotizados counts)
// ---------------------------------------------------------------------------

function useDashboardStatsFiltered(agentId?: string) {
  const supabase = createClient()
  const activeCampaign = useCampaignStore((s) => s.activeCampaignId)

  return useQuery({
    queryKey: ['dashboard-stats-extended', activeCampaign, agentId],
    queryFn: async () => {
      // Current week boundaries
      const now = new Date()
      const dayOfWeek = now.getDay()
      const currentWeekStart = new Date(now)
      currentWeekStart.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
      currentWeekStart.setHours(0, 0, 0, 0)

      const prevWeekStart = new Date(currentWeekStart)
      prevWeekStart.setDate(prevWeekStart.getDate() - 7)
      const prevWeekEnd = new Date(currentWeekStart)
      prevWeekEnd.setMilliseconds(-1)

      const currentWeekISO = currentWeekStart.toISOString()
      const prevWeekStartISO = prevWeekStart.toISOString()
      const prevWeekEndISO = prevWeekEnd.toISOString()

      // Helper to apply common filters
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const applyFilters = (query: any) => {
        let q = query
        if (activeCampaign) q = q.eq('campaign_id', activeCampaign)
        if (agentId) q = q.eq('agent_id', agentId)
        return q
      }

      // Gestiones count
      let gestionesQuery = supabase
        .from('gestiones')
        .select('*', { count: 'exact', head: true })
      // Leads contactados
      let contactadosQuery = supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .in('status', ['contactado', 'cotizado', 'en_proceso', 'venta'])
      // Leads cotizados
      let cotizadosQuery = supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .in('status', ['cotizado', 'en_proceso', 'venta'])
      // Sales
      let salesQuery = supabase.from('sales').select('valor_prima')
      // Total leads for conversion
      let leadsQuery = supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })

      // Previous week gestiones & sales for trend
      let prevGestionesQuery = supabase
        .from('gestiones')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', prevWeekStartISO)
        .lte('created_at', prevWeekEndISO)
      let prevSalesQuery = supabase
        .from('sales')
        .select('valor_prima')
        .gte('created_at', prevWeekStartISO)
        .lte('created_at', prevWeekEndISO)

      // Current week gestiones & sales for trend
      let currGestionesQuery = supabase
        .from('gestiones')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', currentWeekISO)
      let currSalesQuery = supabase
        .from('sales')
        .select('valor_prima')
        .gte('created_at', currentWeekISO)

      if (activeCampaign) {
        gestionesQuery = gestionesQuery.eq('campaign_id', activeCampaign)
        contactadosQuery = contactadosQuery.eq('campaign_id', activeCampaign)
        cotizadosQuery = cotizadosQuery.eq('campaign_id', activeCampaign)
        salesQuery = salesQuery.eq('campaign_id', activeCampaign)
        leadsQuery = leadsQuery.eq('campaign_id', activeCampaign)
        prevGestionesQuery = prevGestionesQuery.eq('campaign_id', activeCampaign)
        prevSalesQuery = prevSalesQuery.eq('campaign_id', activeCampaign)
        currGestionesQuery = currGestionesQuery.eq('campaign_id', activeCampaign)
        currSalesQuery = currSalesQuery.eq('campaign_id', activeCampaign)
      }

      if (agentId) {
        gestionesQuery = gestionesQuery.eq('agent_id', agentId)
        contactadosQuery = contactadosQuery.eq('agent_id', agentId)
        cotizadosQuery = cotizadosQuery.eq('agent_id', agentId)
        salesQuery = salesQuery.eq('agent_id', agentId)
        leadsQuery = leadsQuery.eq('agent_id', agentId)
        prevGestionesQuery = prevGestionesQuery.eq('agent_id', agentId)
        prevSalesQuery = prevSalesQuery.eq('agent_id', agentId)
        currGestionesQuery = currGestionesQuery.eq('agent_id', agentId)
        currSalesQuery = currSalesQuery.eq('agent_id', agentId)
      }

      const [
        gestiones, contactados, cotizados, sales, leads,
        prevGestiones, prevSales, currGestiones, currSales,
      ] = await Promise.all([
        gestionesQuery,
        contactadosQuery,
        cotizadosQuery,
        salesQuery,
        leadsQuery,
        prevGestionesQuery,
        prevSalesQuery,
        currGestionesQuery,
        currSalesQuery,
      ])

      const totalGestiones = gestiones.count || 0
      const totalContactados = contactados.count || 0
      const totalCotizados = cotizados.count || 0
      const salesData = sales.data || []
      const totalSales = salesData.length
      const totalPrima = salesData.reduce(
        (sum, s) => sum + (Number(s.valor_prima) || 0),
        0
      )
      const totalLeads = leads.count || 0
      const conversionRate = totalLeads > 0 ? totalSales / totalLeads : 0

      // Trend calculations (current week vs previous week)
      const prevGestionesCount = prevGestiones.count || 0
      const prevSalesData = prevSales.data || []
      const prevSalesCount = prevSalesData.length
      const prevPrima = prevSalesData.reduce(
        (sum, s) => sum + (Number(s.valor_prima) || 0), 0
      )

      const currGestionesCount = currGestiones.count || 0
      const currSalesData = currSales.data || []
      const currSalesCount = currSalesData.length
      const currPrima = currSalesData.reduce(
        (sum, s) => sum + (Number(s.valor_prima) || 0), 0
      )

      const calcTrend = (curr: number, prev: number) => {
        if (prev === 0) return curr > 0 ? null : null // No previous data, no trend
        return ((curr - prev) / prev) * 100
      }

      return {
        totalGestiones,
        contactados: totalContactados,
        cotizados: totalCotizados,
        totalSales,
        totalPrima,
        conversionRate,
        trends: {
          gestiones: calcTrend(currGestionesCount, prevGestionesCount),
          sales: calcTrend(currSalesCount, prevSalesCount),
          prima: calcTrend(currPrima, prevPrima),
        },
      }
    },
    refetchInterval: 30000,
  })
}
