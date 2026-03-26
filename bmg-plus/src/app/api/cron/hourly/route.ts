import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // 1. SLA breach detection — leads without gestiones beyond config.sla_hours
  const defaultSlaHours = 24
  let slaHours = defaultSlaHours

  // Try to fetch SLA config
  const { data: config } = await supabase
    .from('organization_config')
    .select('value')
    .eq('key', 'sla_hours')
    .single()

  if (config?.value) {
    slaHours = Number(config.value) || defaultSlaHours
  }

  const slaThreshold = new Date(
    Date.now() - slaHours * 60 * 60 * 1000,
  ).toISOString()

  // Find leads that are still "nuevo" and older than the SLA threshold
  const { data: breachedLeads } = await supabase
    .from('leads')
    .select('id, agent_id, campaign_id')
    .eq('status', 'nuevo')
    .lte('created_at', slaThreshold)
    .limit(100)

  let slaBreaches = 0
  if (breachedLeads && breachedLeads.length > 0) {
    // Notify supervisors and coordinadores about SLA breaches
    const { data: supervisors } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['supervisor', 'coordinador'])
      .eq('is_active', true)
      .limit(20)

    if (supervisors && supervisors.length > 0) {
      const notifications = supervisors.map((s) => ({
        user_id: s.id,
        title: 'Alerta SLA',
        message: `${breachedLeads.length} lead(s) superaron el tiempo SLA de ${slaHours}h sin gestion`,
        type: 'sla_breach',
        link: '/gestion',
        is_read: false,
      }))
      await supabase.from('notifications').insert(notifications)
    }

    // Also notify assigned agents
    const agentNotifs = breachedLeads
      .filter((l) => l.agent_id)
      .map((l) => ({
        user_id: l.agent_id!,
        title: 'Lead sin gestionar',
        message: `Tienes un lead que ha superado el SLA de ${slaHours}h`,
        type: 'sla_breach',
        link: `/gestion/${l.id}`,
        is_read: false,
      }))

    if (agentNotifs.length > 0) {
      await supabase.from('notifications').insert(agentNotifs)
    }

    slaBreaches = breachedLeads.length
  }

  // 2. Quality score calculation placeholder
  //    In future phases, this will compute quality scores for agents
  //    based on call recordings, tipificacion accuracy, etc.
  const qualityScoresProcessed = 0

  return NextResponse.json({
    sla_breaches: slaBreaches,
    quality_scores_processed: qualityScoresProcessed,
    sla_hours: slaHours,
    timestamp: new Date().toISOString(),
  })
}
