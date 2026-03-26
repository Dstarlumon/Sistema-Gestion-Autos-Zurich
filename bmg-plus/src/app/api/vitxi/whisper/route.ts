import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  // Authenticate user
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify supervisor/coordinador role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || !['supervisor', 'coordinador'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { call_id, extension, message } = await request.json()

  if (!call_id || !extension) {
    return NextResponse.json(
      { error: 'call_id and extension are required' },
      { status: 400 },
    )
  }

  const vitxiUrl = process.env.VITXI_API_URL
  const vitxiKey = process.env.VITXI_API_KEY

  if (!vitxiUrl || !vitxiKey) {
    return NextResponse.json(
      { error: 'Vitxi not configured' },
      { status: 503 },
    )
  }

  try {
    const res = await fetch(`${vitxiUrl}/calls/whisper`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${vitxiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        call_id,
        supervisor_extension: extension,
        message,
      }),
    })
    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(
        { error: data.message || 'Vitxi API error' },
        { status: res.status },
      )
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Vitxi API error' }, { status: 502 })
  }
}
