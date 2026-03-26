import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // 1. Agent scorecard generation — compute daily stats per agent
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)
  const yesterdayISO = yesterday.toISOString()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayISO = todayStart.toISOString()

  const { data: agents } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'agente')
    .eq('is_active', true)

  let scorecardsGenerated = 0
  if (agents && agents.length > 0) {
    for (const agent of agents) {
      // Count gestiones yesterday
      const { count: gestionesCount } = await supabase
        .from('gestiones')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agent.id)
        .gte('created_at', yesterdayISO)
        .lt('created_at', todayISO)

      // Count sales yesterday
      const { data: salesData } = await supabase
        .from('sales')
        .select('valor_prima')
        .eq('agent_id', agent.id)
        .gte('created_at', yesterdayISO)
        .lt('created_at', todayISO)

      const salesCount = salesData?.length || 0
      const totalPrima = (salesData || []).reduce(
        (sum, s) => sum + (Number(s.valor_prima) || 0),
        0,
      )

      // Count calls yesterday
      const { count: callsCount } = await supabase
        .from('calls')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agent.id)
        .gte('started_at', yesterdayISO)
        .lt('started_at', todayISO)

      // Upsert daily scorecard
      await supabase.from('agent_scorecards').upsert(
        {
          agent_id: agent.id,
          date: yesterday.toISOString().split('T')[0],
          gestiones_count: gestionesCount || 0,
          sales_count: salesCount,
          total_prima: totalPrima,
          calls_count: callsCount || 0,
          conversion_rate:
            gestionesCount && gestionesCount > 0
              ? Number(((salesCount / gestionesCount) * 100).toFixed(2))
              : 0,
        },
        { onConflict: 'agent_id,date' },
      )

      scorecardsGenerated++
    }
  }

  // 2. Daily summary notification for coordinadores
  const { data: coordinadores } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'coordinador')
    .eq('is_active', true)

  if (coordinadores && coordinadores.length > 0) {
    // Get yesterday's totals
    const { count: totalGestiones } = await supabase
      .from('gestiones')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterdayISO)
      .lt('created_at', todayISO)

    const { data: totalSales } = await supabase
      .from('sales')
      .select('valor_prima')
      .gte('created_at', yesterdayISO)
      .lt('created_at', todayISO)

    const salesTotal = totalSales?.length || 0
    const primaTotal = (totalSales || []).reduce(
      (sum, s) => sum + (Number(s.valor_prima) || 0),
      0,
    )

    const dateLabel = yesterday.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

    const notifications = coordinadores.map((c) => ({
      user_id: c.id,
      title: `Resumen diario - ${dateLabel}`,
      message: `Gestiones: ${totalGestiones || 0} | Ventas: ${salesTotal} | Prima: $${primaTotal.toLocaleString('es-CO')}`,
      type: 'daily_summary',
      link: '/reportes',
      is_read: false,
    }))

    await supabase.from('notifications').insert(notifications)
  }

  // 3. Cleanup old read notifications (> 30 days)
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString()

  const { count: deletedNotifs } = await supabase
    .from('notifications')
    .delete({ count: 'exact' })
    .eq('is_read', true)
    .lt('created_at', thirtyDaysAgo)

  return NextResponse.json({
    scorecards_generated: scorecardsGenerated,
    notifications_cleaned: deletedNotifs || 0,
    date_processed: yesterday.toISOString().split('T')[0],
    timestamp: new Date().toISOString(),
  })
}
