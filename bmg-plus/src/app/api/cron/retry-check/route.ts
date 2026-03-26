import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // 1. Find overdue retries
  const { data: overdue } = await supabase
    .from('gestiones')
    .select('id, lead_id, agent_id, retry_scheduled_at')
    .lte('retry_scheduled_at', new Date().toISOString())
    .eq('retry_notified', false)
    .not('retry_scheduled_at', 'is', null)
    .limit(200)

  let processedRetries = 0
  if (overdue && overdue.length > 0) {
    // Create notifications for each overdue retry
    const notifications = overdue
      .filter((g) => g.agent_id)
      .map((g) => ({
        user_id: g.agent_id!,
        title: 'Reintento programado vencido',
        message: 'Tienes un reintento pendiente que requiere atencion',
        type: 'retry_overdue',
        link: `/gestion/${g.lead_id}`,
        is_read: false,
      }))

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications)
    }

    // Mark as notified
    const ids = overdue.map((g) => g.id)
    await supabase
      .from('gestiones')
      .update({ retry_notified: true })
      .in('id', ids)

    processedRetries = overdue.length
  }

  // 2. Find agents that are "disponible" but have had no activity in 2+ hours
  //    (simplified check — only during work hours 7am-7pm Colombia)
  const now = new Date()
  const colombiaHour = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/Bogota' }),
  ).getHours()

  let inactiveCount = 0
  if (colombiaHour >= 7 && colombiaHour < 19) {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

    const { data: activeAgents } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('status', 'disponible')
      .eq('is_active', true)
      .eq('role', 'agente')

    if (activeAgents && activeAgents.length > 0) {
      for (const agent of activeAgents) {
        // Check if agent has any gestiones in the last 2 hours
        const { count } = await supabase
          .from('gestiones')
          .select('*', { count: 'exact', head: true })
          .eq('agent_id', agent.id)
          .gte('created_at', twoHoursAgo)

        if (!count || count === 0) {
          // Notify supervisor about inactive agent
          const { data: supervisors } = await supabase
            .from('profiles')
            .select('id')
            .in('role', ['supervisor', 'coordinador'])
            .eq('is_active', true)
            .limit(10)

          if (supervisors && supervisors.length > 0) {
            const notifs = supervisors.map((s) => ({
              user_id: s.id,
              title: 'Agente inactivo',
              message: `${agent.full_name} no ha registrado gestiones en las ultimas 2 horas`,
              type: 'agent_inactive',
              link: '/admin/usuarios',
              is_read: false,
            }))
            await supabase.from('notifications').insert(notifs)
          }
          inactiveCount++
        }
      }
    }
  }

  return NextResponse.json({
    processed_retries: processedRetries,
    inactive_agents: inactiveCount,
    timestamp: new Date().toISOString(),
  })
}
