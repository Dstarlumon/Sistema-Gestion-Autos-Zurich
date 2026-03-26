'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import { createClient } from '@/lib/supabase/client'
import { KpiCard } from '@/components/charts/kpi-card'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge, StatusDot } from '@/components/shared/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'
import { useRealtimeStore } from '@/stores/realtime-store'
import { useRealtime } from '@/hooks/use-realtime'
import { useRole } from '@/hooks/use-role'
import { formatTime, getInitials } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import type { PauseType } from '@/lib/utils/constants'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PauseRow {
  id: string
  agent_id: string
  pause_type: PauseType
  started_at: string | null
  ended_at: string | null
}

interface AgentProfile {
  id: string
  full_name: string
  status: string
  role: string
  avatar_url: string | null
  is_active: boolean | null
}

// ---------------------------------------------------------------------------
// Pause config
// ---------------------------------------------------------------------------

const PAUSE_OPTIONS: {
  type: PauseType | 'disponible'
  label: string
  icon: string
  color: string
  bgClass: string
}[] = [
  {
    type: 'disponible',
    label: 'Disponible',
    icon: '\u2705',
    color: '#22c55e',
    bgClass: 'bg-emerald-500 hover:bg-emerald-600 text-white',
  },
  {
    type: 'almuerzo',
    label: 'Almuerzo',
    icon: '\uD83C\uDF5D',
    color: '#f59e0b',
    bgClass: 'bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 dark:text-amber-300',
  },
  {
    type: 'break',
    label: 'Break',
    icon: '\u2615',
    color: '#8b5cf6',
    bgClass: 'bg-violet-100 hover:bg-violet-200 text-violet-800 dark:bg-violet-900/40 dark:hover:bg-violet-900/60 dark:text-violet-300',
  },
  {
    type: 'bano',
    label: 'Bano',
    icon: '\uD83D\uDEBB',
    color: '#06b6d4',
    bgClass: 'bg-cyan-100 hover:bg-cyan-200 text-cyan-800 dark:bg-cyan-900/40 dark:hover:bg-cyan-900/60 dark:text-cyan-300',
  },
  {
    type: 'capacitacion',
    label: 'Capacitacion',
    icon: '\uD83D\uDCDA',
    color: '#3b82f6',
    bgClass: 'bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 dark:text-blue-300',
  },
  {
    type: 'retroalimentacion',
    label: 'Retroalimentacion',
    icon: '\uD83D\uDCDD',
    color: '#ec4899',
    bgClass: 'bg-pink-100 hover:bg-pink-200 text-pink-800 dark:bg-pink-900/40 dark:hover:bg-pink-900/60 dark:text-pink-300',
  },
  {
    type: 'otro',
    label: 'Otro',
    icon: '\u23F8\uFE0F',
    color: '#6b7280',
    bgClass: 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300',
  },
]

// ---------------------------------------------------------------------------
// Page — routes to Agent or Supervisor view
// ---------------------------------------------------------------------------

export default function PausasPage() {
  const { isAgente, canSupervise } = useRole()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pausas"
        subtitle={
          isAgente
            ? 'Gestiona tu estado y pausas'
            : 'Estado de los agentes en tiempo real'
        }
      />

      {isAgente ? <AgentView /> : <SupervisorView />}
    </div>
  )
}

// ===========================================================================================
// AGENT VIEW
// ===========================================================================================

function AgentView() {
  const supabase = createClient()
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [updating, setUpdating] = useState(false)

  // Current user's profile status
  const currentStatus = user?.status ?? 'offline'

  // Active pause (if any)
  const { data: activePause, isLoading: pauseLoading } = useQuery({
    queryKey: ['active-pause', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const { data, error } = await supabase
        .from('agent_pauses')
        .select('*')
        .eq('agent_id', user.id)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      return data as PauseRow | null
    },
    enabled: !!user?.id,
    refetchInterval: 10000,
  })

  // Today's pause history
  const { data: todayPauses, isLoading: historyLoading } = useQuery({
    queryKey: ['pause-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const { data, error } = await supabase
        .from('agent_pauses')
        .select('*')
        .eq('agent_id', user.id)
        .gte('started_at', today.toISOString())
        .order('started_at', { ascending: false })

      if (error) throw error
      return (data || []) as PauseRow[]
    },
    enabled: !!user?.id,
    refetchInterval: 15000,
  })

  // Handle status change
  const handleStatusChange = async (type: PauseType | 'disponible') => {
    if (!user?.id || updating) return
    setUpdating(true)

    try {
      if (type === 'disponible') {
        // End current pause if exists
        if (activePause) {
          await supabase
            .from('agent_pauses')
            .update({ ended_at: new Date().toISOString() })
            .eq('id', activePause.id)
        }
        // Set status to disponible
        await supabase
          .from('profiles')
          .update({ status: 'disponible', updated_at: new Date().toISOString() })
          .eq('id', user.id)
      } else {
        // End current pause if exists
        if (activePause) {
          await supabase
            .from('agent_pauses')
            .update({ ended_at: new Date().toISOString() })
            .eq('id', activePause.id)
        }
        // Create new pause
        await supabase.from('agent_pauses').insert({
          agent_id: user.id,
          pause_type: type,
          started_at: new Date().toISOString(),
        })
        // Set status to pausa
        await supabase
          .from('profiles')
          .update({ status: 'pausa', updated_at: new Date().toISOString() })
          .eq('id', user.id)
      }

      // Refetch data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['active-pause', user.id] }),
        queryClient.invalidateQueries({ queryKey: ['pause-history', user.id] }),
      ])
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error updating status:', err)
    } finally {
      setUpdating(false)
    }
  }

  const activePauseOption = activePause
    ? PAUSE_OPTIONS.find((p) => p.type === activePause.pause_type)
    : null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Current status */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface-container-lowest rounded-xl shadow-ambient p-6 text-center"
      >
        <p className="text-label-sm text-on-surface-variant mb-3">
          TU ESTADO ACTUAL
        </p>

        {currentStatus === 'pausa' && activePause ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl">
                {activePauseOption?.icon || '\u23F8\uFE0F'}
              </span>
              <StatusBadge
                status="pausa"
                label={activePauseOption?.label || activePause.pause_type}
                className="text-base px-4 py-1.5"
              />
            </div>
            {/* Active pause timer */}
            {activePause.started_at && (
              <PauseTimer startedAt={activePause.started_at} />
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <StatusDot status={currentStatus} />
            <span className="text-display-md text-on-surface capitalize">
              {currentStatus.replace(/_/g, ' ')}
            </span>
          </div>
        )}
      </motion.div>

      {/* Status change buttons */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-surface-container-lowest rounded-xl shadow-ambient p-5"
      >
        <h2 className="text-title-md text-on-surface mb-4">Cambiar Estado</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {PAUSE_OPTIONS.map((opt) => {
            const isActive =
              opt.type === 'disponible'
                ? currentStatus === 'disponible'
                : activePause?.pause_type === opt.type &&
                  currentStatus === 'pausa'

            return (
              <button
                key={opt.type}
                type="button"
                disabled={updating || isActive}
                onClick={() => handleStatusChange(opt.type)}
                className={cn(
                  'flex items-center gap-2.5 px-4 py-3 rounded-xl text-left transition-all font-medium text-sm',
                  opt.bgClass,
                  isActive && 'ring-2 ring-offset-2 ring-offset-surface-container-lowest',
                  updating && 'opacity-50 cursor-not-allowed'
                )}
                style={isActive ? { '--tw-ring-color': opt.color } as React.CSSProperties : undefined}
              >
                <span className="text-lg">{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            )
          })}
        </div>
      </motion.div>

      {/* Today's pause history */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-surface-container-lowest rounded-xl shadow-ambient overflow-hidden"
      >
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-title-md text-on-surface">Pausas de Hoy</h2>
        </div>
        <div className="px-5 pb-5">
          {historyLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : !todayPauses || todayPauses.length === 0 ? (
            <p className="text-body-md text-on-surface-variant py-6 text-center">
              Sin pausas registradas hoy
            </p>
          ) : (
            <div className="space-y-2">
              {todayPauses.map((pause, i) => {
                const opt = PAUSE_OPTIONS.find(
                  (p) => p.type === pause.pause_type
                )
                const isActive = !pause.ended_at

                return (
                  <motion.div
                    key={pause.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={cn(
                      'flex items-center justify-between px-4 py-3 rounded-lg',
                      isActive
                        ? 'bg-amber-50 dark:bg-amber-950/30'
                        : 'bg-surface-container-low'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base">{opt?.icon || '\u23F8\uFE0F'}</span>
                      <div>
                        <p className="text-body-md font-medium text-on-surface">
                          {opt?.label || pause.pause_type}
                        </p>
                        <p className="text-[0.7rem] text-on-surface-variant tabular-nums">
                          {pause.started_at
                            ? formatTime(pause.started_at)
                            : '--'}
                          {pause.ended_at
                            ? ` - ${formatTime(pause.ended_at)}`
                            : ' - En curso'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {isActive ? (
                        <span className="text-[0.7rem] font-semibold text-amber-600 dark:text-amber-400">
                          Activa
                        </span>
                      ) : (
                        <PauseDuration pause={pause} />
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pause Timer (large, for agent view)
// ---------------------------------------------------------------------------

function PauseTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const start = new Date(startedAt).getTime()
    const tick = () => {
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }
    tick()
    intervalRef.current = setInterval(tick, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [startedAt])

  const hours = Math.floor(elapsed / 3600)
  const minutes = Math.floor((elapsed % 3600) / 60)
  const seconds = elapsed % 60

  return (
    <p className="text-display-md tabular-nums text-on-surface">
      {hours > 0 && `${String(hours).padStart(2, '0')}:`}
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </p>
  )
}

// ---------------------------------------------------------------------------
// Pause Duration (for history items)
// ---------------------------------------------------------------------------

function PauseDuration({ pause }: { pause: PauseRow }) {
  if (!pause.started_at || !pause.ended_at) return null

  const start = new Date(pause.started_at).getTime()
  const end = new Date(pause.ended_at).getTime()
  const durationSec = Math.floor((end - start) / 1000)
  const mins = Math.floor(durationSec / 60)
  const secs = durationSec % 60

  return (
    <span className="text-[0.75rem] text-on-surface-variant tabular-nums font-medium">
      {mins}m {String(secs).padStart(2, '0')}s
    </span>
  )
}

// ===========================================================================================
// SUPERVISOR VIEW
// ===========================================================================================

function SupervisorView() {
  const supabase = createClient()
  const agentStatuses = useRealtimeStore((s) => s.agentStatuses)
  const updateAgentStatus = useRealtimeStore((s) => s.updateAgentStatus)

  // Fetch all agent profiles
  const { data: agents, isLoading } = useQuery({
    queryKey: ['pausas-agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, status, role, avatar_url, is_active')
        .eq('is_active', true)
        .eq('role', 'agente')
        .order('full_name')

      if (error) throw error
      return (data || []) as AgentProfile[]
    },
    refetchInterval: 30000,
  })

  // Fetch active pauses for all agents
  const { data: activePauses } = useQuery({
    queryKey: ['all-active-pauses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_pauses')
        .select('*')
        .is('ended_at', null)

      if (error) throw error
      return (data || []) as PauseRow[]
    },
    refetchInterval: 15000,
  })

  // Seed realtime store
  useEffect(() => {
    if (agents) {
      agents.forEach((agent) => {
        updateAgentStatus(agent.id, {
          id: agent.id,
          full_name: agent.full_name,
          status: agent.status,
          updated_at: '',
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
  })

  // Merge DB data with realtime, sorted by status priority
  const STATUS_ORDER: Record<string, number> = {
    disponible: 0,
    en_llamada: 1,
    pausa: 2,
    offline: 3,
  }

  const mergedAgents = useMemo(() => {
    if (!agents) return []
    return agents
      .map((agent) => {
        const realtimeData = agentStatuses.get(agent.id)
        const agentPause = activePauses?.find((p) => p.agent_id === agent.id)
        return {
          ...agent,
          status: realtimeData?.status ?? agent.status,
          activePause: agentPause || null,
        }
      })
      .sort(
        (a, b) =>
          (STATUS_ORDER[a.status] ?? 4) - (STATUS_ORDER[b.status] ?? 4)
      )
  }, [agents, agentStatuses, activePauses])

  // KPI counts
  const kpis = useMemo(() => {
    const counts = { disponible: 0, en_llamada: 0, pausa: 0, offline: 0 }
    mergedAgents.forEach((a) => {
      const s = a.status as keyof typeof counts
      if (s in counts) counts[s]++
    })
    return counts
  }, [mergedAgents])

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-30 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label="Disponibles"
            value={kpis.disponible}
            accent="#22c55e"
            delay={0}
          />
          <KpiCard
            label="En Llamada"
            value={kpis.en_llamada}
            accent="#3b82f6"
            delay={0.05}
          />
          <KpiCard
            label="En Pausa"
            value={kpis.pausa}
            accent="#f59e0b"
            delay={0.1}
          />
          <KpiCard
            label="Offline"
            value={kpis.offline}
            accent="#6b7280"
            delay={0.15}
          />
        </div>
      )}

      {/* Agent grid */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-surface-container-lowest rounded-xl shadow-ambient overflow-hidden"
      >
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-title-md text-on-surface">
            Agentes ({mergedAgents.length})
          </h2>
        </div>
        <div className="px-5 pb-5">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : mergedAgents.length === 0 ? (
            <p className="text-body-md text-on-surface-variant py-8 text-center">
              Sin agentes activos
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              <AnimatePresence mode="popLayout">
                {mergedAgents.map((agent, i) => (
                  <SupervisorAgentCard
                    key={agent.id}
                    agent={agent}
                    index={i}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Supervisor Agent Card
// ---------------------------------------------------------------------------

/** Max pause duration in minutes before abuse highlighting */
const PAUSE_ABUSE_THRESHOLD_MINUTES = 60

function SupervisorAgentCard({
  agent,
  index,
}: {
  agent: AgentProfile & { activePause: PauseRow | null }
  index: number
}) {
  const pauseOption = agent.activePause
    ? PAUSE_OPTIONS.find((p) => p.type === agent.activePause?.pause_type)
    : null

  // Check if agent's pause exceeds the threshold
  const isAbuse = (() => {
    if (agent.status !== 'pausa' || !agent.activePause?.started_at) return false
    const start = new Date(agent.activePause.started_at).getTime()
    const elapsedMinutes = (Date.now() - start) / 60_000
    return elapsedMinutes > PAUSE_ABUSE_THRESHOLD_MINUTES
  })()

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.02 }}
      className={cn(
        'flex items-center gap-3 rounded-xl p-4 transition-colors',
        agent.status === 'disponible' && 'bg-emerald-50/60 dark:bg-emerald-950/20',
        agent.status === 'en_llamada' && 'bg-blue-50/60 dark:bg-blue-950/20',
        agent.status === 'pausa' && !isAbuse && 'bg-amber-50/60 dark:bg-amber-950/20',
        agent.status === 'offline' && 'bg-slate-50/60 dark:bg-slate-900/20',
        isAbuse && 'bg-red-50/60 dark:bg-red-950/20 ring-2 ring-red-500/60'
      )}
    >
      {/* Avatar with status dot */}
      <div className="relative shrink-0">
        <div className="w-11 h-11 rounded-full bg-surface-container-highest flex items-center justify-center">
          <span className="text-sm font-semibold text-on-surface">
            {getInitials(agent.full_name)}
          </span>
        </div>
        <span className="absolute -bottom-0.5 -right-0.5">
          <StatusDot status={agent.status} />
        </span>
        {/* Pulsing red dot for pause abuse */}
        {isAbuse && (
          <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-body-md font-medium text-on-surface truncate leading-tight">
          {agent.full_name}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <StatusBadge
            status={agent.status}
            label={agent.status.replace(/_/g, ' ')}
          />
          {isAbuse && (
            <span className="text-[0.6rem] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
              Exceso
            </span>
          )}
        </div>
        {/* Pause details */}
        {agent.status === 'pausa' && agent.activePause && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-xs">{pauseOption?.icon || '\u23F8\uFE0F'}</span>
            <span className="text-[0.7rem] text-on-surface-variant font-medium">
              {pauseOption?.label || agent.activePause.pause_type}
            </span>
            {agent.activePause.started_at && (
              <AgentPauseElapsed startedAt={agent.activePause.started_at} />
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Agent Pause Elapsed (small, for supervisor cards)
// ---------------------------------------------------------------------------

function AgentPauseElapsed({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const start = new Date(startedAt).getTime()
    const tick = () => {
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }
    tick()
    intervalRef.current = setInterval(tick, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [startedAt])

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60

  return (
    <span className="text-[0.65rem] tabular-nums text-amber-600 dark:text-amber-400 font-semibold">
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  )
}
