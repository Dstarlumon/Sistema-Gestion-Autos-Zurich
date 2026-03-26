import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  // Verify webhook secret if configured
  const secret = process.env.CALLBELL_WEBHOOK_SECRET
  if (secret) {
    const signature = request.headers.get('x-callbell-signature')
    if (!signature || signature !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const event = await request.json()
  const supabase = createAdminClient()

  switch (event.type) {
    case 'message.created': {
      // Find or create conversation by external contact id
      const contactPhone = event.contact?.phone || event.phone_number
      const contactName = event.contact?.name || null

      if (!contactPhone) break

      // Upsert conversation
      const { data: conversation } = await supabase
        .from('conversations')
        .upsert(
          {
            external_id: event.conversation_id || contactPhone,
            contact_name: contactName,
            contact_phone: contactPhone,
            status: 'open',
            last_message_at: event.created_at || new Date().toISOString(),
          },
          { onConflict: 'external_id' },
        )
        .select('id')
        .single()

      if (conversation) {
        // Insert the message
        await supabase.from('messages').insert({
          conversation_id: conversation.id,
          direction: event.direction || 'inbound',
          content: event.text || event.body || null,
          media_url: event.media?.url || null,
          media_type: event.media?.type || null,
          status: event.status || 'delivered',
          created_at: event.created_at || new Date().toISOString(),
        })

        // Increment unread count for inbound messages
        if (event.direction !== 'outbound') {
          try {
            await supabase.rpc('increment_unread', {
              conv_id: conversation.id,
            })
          } catch {
            // Fallback: direct update if RPC doesn't exist yet
            await supabase
              .from('conversations')
              .update({
                unread_count: (conversation as Record<string, unknown>).unread_count
                  ? Number((conversation as Record<string, unknown>).unread_count) + 1
                  : 1,
              })
              .eq('id', conversation.id)
          }
        }
      }
      break
    }

    case 'message.updated': {
      // Update message status (e.g., delivered -> read)
      if (event.message_id && event.status) {
        await supabase
          .from('messages')
          .update({ status: event.status })
          .eq('id', event.message_id)
      }
      break
    }
  }

  return NextResponse.json({ ok: true })
}
