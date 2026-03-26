import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  // 1. Verify webhook signature (VITXI_WEBHOOK_SECRET)
  const signature = request.headers.get('x-vitxi-signature')
  const secret = process.env.VITXI_WEBHOOK_SECRET
  if (secret && signature !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const event = await request.json()
  const supabase = createAdminClient()

  // 2. Handle event types
  switch (event.type) {
    case 'call.started': {
      // Find agent by extension
      const { data: ext } = await supabase
        .from('vitxi_extensions')
        .select('agent_id')
        .eq('extension', event.extension)
        .single()

      await supabase.from('calls').insert({
        agent_id: ext?.agent_id,
        external_call_id: event.call_id,
        phone_number: event.caller_number || event.callee_number,
        direction: event.direction || 'inbound',
        status: 'active',
        started_at: event.timestamp || new Date().toISOString(),
        metadata: event,
      })

      if (ext?.agent_id) {
        await supabase
          .from('profiles')
          .update({ status: 'en_llamada' })
          .eq('id', ext.agent_id)
      }
      break
    }

    case 'call.ended': {
      await supabase
        .from('calls')
        .update({
          status: 'completed',
          ended_at: event.timestamp || new Date().toISOString(),
          duration_seconds: event.duration,
          recording_url: event.recording_url,
        })
        .eq('external_call_id', event.call_id)

      // Find agent and set back to disponible
      const { data: call } = await supabase
        .from('calls')
        .select('agent_id')
        .eq('external_call_id', event.call_id)
        .single()

      if (call?.agent_id) {
        await supabase
          .from('profiles')
          .update({ status: 'disponible' })
          .eq('id', call.agent_id)
      }
      break
    }

    case 'call.missed': {
      const { data: ext } = await supabase
        .from('vitxi_extensions')
        .select('agent_id')
        .eq('extension', event.extension)
        .single()

      await supabase.from('calls').insert({
        agent_id: ext?.agent_id,
        external_call_id: event.call_id,
        phone_number: event.caller_number,
        direction: 'inbound',
        status: 'missed',
        started_at: event.timestamp || new Date().toISOString(),
      })
      break
    }
  }

  return NextResponse.json({ ok: true })
}
