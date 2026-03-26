'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import { createClient } from '@/lib/supabase/client'
import { KpiCard } from '@/components/charts/kpi-card'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useRealtime } from '@/hooks/use-realtime'
import { useRole } from '@/hooks/use-role'
import { formatPhone, formatDateTime, formatTime } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import { CAMPAIGN_COLORS } from '@/lib/utils/constants'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CallRow {
  id: string
  agent_id: string | null
  phone_number: string | null
  direction: 'inbound' | 'outbound'
  status: 'ringing' | 'active' | 'completed' | 'missed'
  duration_seconds: number | null
  recording_url: string | null
  started_at: string
  ended_at: string | null
  metadata: Record<string, unknown> | null
  profiles?: { full_name: string } | null
  campaigns?: { name: string; slug: string; color: string | null } | null
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LlamadasPage() {
  const { canSupervise } = useRole()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Centro de Llamadas"
        subtitle="Monitoreo en tiempo real de llamadas Vitxi"
      />

      {/* Vitxi integration banner */}
      <VitxiBanner />

      {/* KPI row */}
      <CallKpiRow />

      {/* Queued / Ringing calls */}
      <QueuedCallsSection />

      {/* Active calls */}
      <ActiveCallsSection />

      {/* Recent recordings */}
      <RecentRecordingsSection />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Vitxi Banner
// ---------------------------------------------------------------------------

function VitxiBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200/60 px-4 py-3 dark:bg-amber-950/30 dark:border-amber-800/40"
    >
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 shrink-0">
        <svg
          className="w-4 h-4 text-amber-600 dark:text-amber-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
      </div>
      <p className="text-body-md text-amber-800 dark:text-amber-200">
        Configura la integracion Vitxi en{' '}
        <span className="font-semibold">Administracion</span> para ver
        llamadas en vivo
      </p>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// KPI Row
// ---------------------------------------------------------------------------

function CallKpiRow() {
  const supabase = createClient()

  const { data, isLoading } = useQuery({
    queryKey: ['call-kpis'],
    queryFn: async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayISO = today.toISOString()

      const [activeCalls, availableAgents, pausedAgents, todayCalls] =
        await Promise.all([
          supabase
            .from('calls')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active'),
          supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'agente')
            .eq('is_active', true)
            .eq('status', 'disponible'),
          supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'agente')
            .eq('is_active', true)
            .eq('status', 'pausa'),
          supabase
            .from('calls')
            .select('*', { count: 'exact', head: true })
            .gte('started_at', todayISO),
        ])

      return {
        active: activeCalls.count || 0,
        available: availableAgents.count || 0,
        paused: pausedAgents.count || 0,
        todayTotal: todayCalls.count || 0,
      }
    },
    refetchInterval: 15000,
  })

  const cards = useMemo(() => {
    const s = data ?? { active: 0, available: 0, paused: 0, todayTotal: 0 }
    return [
      { label: 'Llamadas Activas', value: s.active, accent: '#3b82f6' },
      { label: 'Disponibles', value: s.available, accent: '#22c55e' },
      { label: 'En Pausa', value: s.paused, accent: '#f59e0b' },
      { label: 'Total Hoy', value: s.todayTotal, accent: '#a855f7' },
    ]
  }, [data])

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-30 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c, i) => (
        <KpiCard
          key={c.label}
          label={c.label}
          value={c.value}
          accent={c.accent}
          delay={i * 0.05}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Queued / Ringing Calls Section
// ---------------------------------------------------------------------------

function QueuedCallsSection() {
  const supabase = createClient()
  const qc = useQueryClient()

  const { data: queuedCalls = [], isLoading } = useQuery({
    queryKey: ['queued-calls'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calls')
        .select(
          'id, agent_id, phone_number, direction, status, duration_seconds, started_at, ended_at, metadata, recording_url, profiles!calls_agent_id_fkey(full_name)'
        )
        .eq('status', 'ringing')
        .order('started_at', { ascending: true })

      if (error) throw error
      return (data || []) as unknown as CallRow[]
    },
    refetchInterval: 5000,
  })

  // Realtime updates — patch the query cache directly (no local state sync needed)
  const handleRealtimeQueued = useCallback(
    (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
      const row = payload.new as unknown as CallRow | undefined
      const oldRow = payload.old as unknown as CallRow | undefined

      qc.setQueryData<CallRow[]>(['queued-calls'], (prev = []) => {
        if (payload.eventType === 'INSERT' && row?.status === 'ringing') {
          return [...prev, row]
        }
        if (payload.eventType === 'UPDATE') {
          if (row?.status !== 'ringing') {
            return prev.filter((c) => c.id !== row?.id)
          }
          return prev.map((c) => (c.id === row?.id ? { ...c, ...row } : c))
        }
        if (payload.eventType === 'DELETE' && oldRow) {
          return prev.filter((c) => c.id !== oldRow.id)
        }
        return prev
      })
    },
    [qc]
  )

  useRealtime({
    table: 'calls',
    event: '*',
    onData: handleRealtimeQueued as Parameters<typeof useRealtime>[0]['onData'],
  })

  if (!isLoading && queuedCalls.length === 0) return null

  return (
    <SectionCard title="Cola de Espera" count={queuedCalls.length}>
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {queuedCalls.map((call, i) => {
              const profileData = call.profiles as unknown as { full_name: string } | null
              const agentName = profileData?.full_name || 'Sin asignar'
              const phone = call.phone_number ? formatPhone(call.phone_number) : 'Sin numero'

              return (
                <motion.div
                  key={call.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03 }}
                  className="relative bg-surface-container-lowest rounded-xl shadow-ambient overflow-hidden border-l-3 border-amber-400"
                >
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-body-md font-semibold text-on-surface truncate">
                          {agentName}
                        </p>
                        <p className="text-[0.75rem] text-on-surface-variant tabular-nums mt-0.5">
                          {phone}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                        </span>
                        <span className="text-[0.7rem] font-semibold text-amber-600 dark:text-amber-400">
                          Timbrando
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[0.7rem] text-on-surface-variant">
                      <span>{call.direction === 'inbound' ? 'Entrante' : 'Saliente'}</span>
                      <span className="tabular-nums">
                        {call.started_at ? formatTime(call.started_at) : ''}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Active Calls Section
// ---------------------------------------------------------------------------

function ActiveCallsSection() {
  const supabase = createClient()
  const qc = useQueryClient()

  const { data: activeCalls = [], isLoading } = useQuery({
    queryKey: ['active-calls'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calls')
        .select(
          'id, agent_id, phone_number, direction, status, duration_seconds, started_at, ended_at, metadata, recording_url, profiles!calls_agent_id_fkey(full_name)'
        )
        .eq('status', 'active')
        .order('started_at', { ascending: false })

      if (error) throw error
      return (data || []) as unknown as CallRow[]
    },
    refetchInterval: 10000,
  })

  // Realtime updates — patch the query cache directly
  const handleRealtimeCall = useCallback(
    (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
      const row = payload.new as unknown as CallRow | undefined
      const oldRow = payload.old as unknown as CallRow | undefined

      qc.setQueryData<CallRow[]>(['active-calls'], (prev = []) => {
        if (payload.eventType === 'INSERT' && row?.status === 'active') {
          return [row, ...prev]
        }
        if (payload.eventType === 'UPDATE') {
          if (row?.status !== 'active') {
            return prev.filter((c) => c.id !== row?.id)
          }
          return prev.map((c) => (c.id === row?.id ? { ...c, ...row } : c))
        }
        if (payload.eventType === 'DELETE' && oldRow) {
          return prev.filter((c) => c.id !== oldRow.id)
        }
        return prev
      })
    },
    [qc]
  )

  useRealtime({
    table: 'calls',
    event: '*',
    onData: handleRealtimeCall as Parameters<typeof useRealtime>[0]['onData'],
  })

  return (
    <SectionCard title="Llamadas en Curso" count={activeCalls.length}>
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : activeCalls.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-surface-container flex items-center justify-center">
            <svg
              className="w-6 h-6 text-on-surface-variant"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
              />
            </svg>
          </div>
          <p className="text-body-md text-on-surface-variant">
            No hay llamadas activas en este momento
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {activeCalls.map((call, i) => (
              <ActiveCallCard key={call.id} call={call} index={i} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Active Call Card
// ---------------------------------------------------------------------------

function ActiveCallCard({ call, index }: { call: CallRow; index: number }) {
  const { canSupervise } = useRole()
  const profileData = call.profiles as unknown as { full_name: string } | null
  const agentName = profileData?.full_name || 'Agente desconocido'
  const phone = call.phone_number ? formatPhone(call.phone_number) : 'Sin numero'
  const campaignName =
    (call.metadata as Record<string, unknown> | null)?.campaign_name as string | undefined
  const campaignSlug =
    (call.metadata as Record<string, unknown> | null)?.campaign_slug as string | undefined
  const campaignColor = campaignSlug
    ? CAMPAIGN_COLORS[campaignSlug] || '#6b7280'
    : '#6b7280'

  const [spyLoading, setSpyLoading] = useState(false)
  const [whisperLoading, setWhisperLoading] = useState(false)

  const handleSpy = useCallback(async () => {
    setSpyLoading(true)
    try {
      const res = await fetch('/api/vitxi/spy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          call_id: call.id,
          extension: 'supervisor',
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        console.error('Spy error:', err)
      }
    } catch (err) {
      console.error('Spy request failed:', err)
    } finally {
      setSpyLoading(false)
    }
  }, [call.id])

  const handleWhisper = useCallback(async () => {
    setWhisperLoading(true)
    try {
      const res = await fetch('/api/vitxi/whisper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          call_id: call.id,
          extension: 'supervisor',
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        console.error('Whisper error:', err)
      }
    } catch (err) {
      console.error('Whisper request failed:', err)
    } finally {
      setWhisperLoading(false)
    }
  }, [call.id])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.03 }}
      className="relative bg-surface-container-lowest rounded-xl shadow-ambient overflow-hidden"
      style={{ borderLeft: `3px solid ${campaignColor}` }}
    >
      <div className="p-4 space-y-3">
        {/* Agent + direction */}
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-body-md font-semibold text-on-surface truncate">
              {agentName}
            </p>
            <p className="text-[0.75rem] text-on-surface-variant tabular-nums mt-0.5">
              {phone}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            {/* Direction icon */}
            <div
              className={cn(
                'flex items-center justify-center w-7 h-7 rounded-lg',
                call.direction === 'inbound'
                  ? 'bg-blue-100 dark:bg-blue-900/40'
                  : 'bg-emerald-100 dark:bg-emerald-900/40'
              )}
            >
              {call.direction === 'inbound' ? (
                <svg
                  className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3"
                  />
                </svg>
              ) : (
                <svg
                  className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18"
                  />
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Duration timer */}
        <CallTimer startedAt={call.started_at} />

        {/* Campaign badge */}
        {campaignName && (
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[0.6rem] font-semibold text-white"
            style={{ backgroundColor: campaignColor }}
          >
            {campaignName}
          </span>
        )}

        {/* Action buttons — connected to Vitxi proxy routes */}
        {canSupervise && (
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              disabled={spyLoading}
              onClick={handleSpy}
              className="flex-1 text-[0.7rem]"
            >
              <svg
                className="w-3.5 h-3.5 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
                />
              </svg>
              {spyLoading ? 'Conectando...' : 'Escuchar'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={whisperLoading}
              onClick={handleWhisper}
              className="flex-1 text-[0.7rem]"
            >
              <svg
                className="w-3.5 h-3.5 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
                />
              </svg>
              {whisperLoading ? 'Conectando...' : 'Susurrar'}
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Call Timer (live elapsed)
// ---------------------------------------------------------------------------

function CallTimer({ startedAt }: { startedAt: string }) {
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
    <div className="flex items-center gap-2">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
      </span>
      <span className="text-title-md tabular-nums text-on-surface">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Recent Recordings Section
// ---------------------------------------------------------------------------

function RecentRecordingsSection() {
  const supabase = createClient()

  const { data: recordings, isLoading } = useQuery({
    queryKey: ['recent-recordings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calls')
        .select(
          'id, agent_id, phone_number, direction, status, duration_seconds, started_at, ended_at, recording_url, metadata, profiles!calls_agent_id_fkey(full_name)'
        )
        .eq('status', 'completed')
        .order('ended_at', { ascending: false })
        .limit(20)

      if (error) throw error
      return (data || []) as unknown as CallRow[]
    },
    refetchInterval: 30000,
  })

  return (
    <SectionCard title="Grabaciones Recientes">
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : !recordings || recordings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-body-md text-on-surface-variant">
            No hay grabaciones recientes
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-body-md">
            <thead>
              <tr className="border-b border-outline-variant/30">
                <th className="text-left text-label-sm text-on-surface-variant py-2 pl-5 pr-3">
                  Fecha
                </th>
                <th className="text-left text-label-sm text-on-surface-variant py-2 px-3">
                  Agente
                </th>
                <th className="text-left text-label-sm text-on-surface-variant py-2 px-3">
                  Telefono
                </th>
                <th className="text-right text-label-sm text-on-surface-variant py-2 px-3">
                  Duracion
                </th>
                <th className="text-center text-label-sm text-on-surface-variant py-2 px-3">
                  Direccion
                </th>
                <th className="text-left text-label-sm text-on-surface-variant py-2 px-3">
                  Campana
                </th>
                <th className="text-center text-label-sm text-on-surface-variant py-2 pl-3 pr-5">
                  Audio
                </th>
              </tr>
            </thead>
            <tbody>
              {recordings.map((rec, i) => {
                const profileData = rec.profiles as unknown as {
                  full_name: string
                } | null
                const agentName = profileData?.full_name || 'Agente'
                const campaignName =
                  (rec.metadata as Record<string, unknown> | null)
                    ?.campaign_name as string | undefined

                return (
                  <motion.tr
                    key={rec.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-outline-variant/15 last:border-0 hover:bg-surface-container/50 transition-colors"
                  >
                    <td className="py-2.5 pl-5 pr-3 text-on-surface-variant tabular-nums">
                      {rec.ended_at ? formatDateTime(rec.ended_at) : '--'}
                    </td>
                    <td className="py-2.5 px-3 text-on-surface font-medium">
                      {agentName}
                    </td>
                    <td className="py-2.5 px-3 text-on-surface-variant tabular-nums">
                      {rec.phone_number
                        ? formatPhone(rec.phone_number)
                        : '--'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-on-surface-variant tabular-nums">
                      {rec.duration_seconds != null
                        ? `${Math.floor(rec.duration_seconds / 60)}:${String(rec.duration_seconds % 60).padStart(2, '0')}`
                        : '--'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <StatusBadge
                        status={
                          rec.direction === 'inbound' ? 'informativa' : 'active'
                        }
                        label={
                          rec.direction === 'inbound' ? 'Entrante' : 'Saliente'
                        }
                      />
                    </td>
                    <td className="py-2.5 px-3 text-on-surface-variant">
                      {campaignName || '--'}
                    </td>
                    <td className="py-2.5 pl-3 pr-5 text-center">
                      {rec.recording_url ? (
                        <audio
                          controls
                          preload="none"
                          className="h-7 max-w-45 mx-auto"
                        >
                          <source src={rec.recording_url} />
                        </audio>
                      ) : (
                        <span className="text-[0.65rem] text-on-surface-variant">
                          Sin audio
                        </span>
                      )}
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Section Card wrapper
// ---------------------------------------------------------------------------

function SectionCard({
  title,
  count,
  children,
}: {
  title: string
  count?: number
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-surface-container-lowest rounded-xl shadow-ambient overflow-hidden"
    >
      <div className="px-5 pt-5 pb-3 flex items-center gap-2">
        <h2 className="text-title-md text-on-surface">{title}</h2>
        {count != null && count > 0 && (
          <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-blue-100 text-blue-700 text-[0.65rem] font-semibold dark:bg-blue-900/40 dark:text-blue-300">
            {count}
          </span>
        )}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </motion.div>
  )
}
