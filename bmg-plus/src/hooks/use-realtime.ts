'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface UseRealtimeOptions {
  table: string
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  filter?: string
  schema?: string
  onData: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
  enabled?: boolean
}

export function useRealtime({
  table,
  event = '*',
  filter,
  schema = 'public',
  onData,
  enabled = true,
}: UseRealtimeOptions) {
  const supabase = createClient()

  useEffect(() => {
    if (!enabled) return

    const channelName = `realtime:${table}:${filter || 'all'}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event, schema, table, filter },
        (payload) => onData(payload)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, event, filter, schema, enabled])
}
