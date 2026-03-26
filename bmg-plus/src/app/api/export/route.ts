import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const { type, module, filters } = await request.json()
  const supabase = createAdminClient()

  // Fetch data based on module
  let data: Record<string, unknown>[] = []

  if (module === 'leads' || module === 'gestiones') {
    let query = supabase.from(module).select('*')
    if (filters?.campaign_id) query = query.eq('campaign_id', filters.campaign_id)
    if (filters?.date_from) query = query.gte('created_at', filters.date_from)
    if (filters?.date_to) query = query.lte('created_at', filters.date_to)
    const { data: rows } = await query.limit(10000)
    data = rows || []
  } else if (module === 'sales') {
    let query = supabase.from('sales').select('*')
    if (filters?.campaign_id) query = query.eq('campaign_id', filters.campaign_id)
    if (filters?.date_from) query = query.gte('created_at', filters.date_from)
    if (filters?.date_to) query = query.lte('created_at', filters.date_to)
    const { data: rows } = await query.limit(10000)
    data = rows || []
  }

  if (type === 'csv') {
    // Simple CSV export
    if (data.length === 0) {
      return new NextResponse('No data', { status: 404 })
    }
    const headers = Object.keys(data[0])
    const csv = [
      headers.join(','),
      ...data.map((row) =>
        headers.map((h) => JSON.stringify(row[h] ?? '')).join(','),
      ),
    ].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${module}_export.csv"`,
      },
    })
  }

  // Default: return JSON
  return NextResponse.json({ data, count: data.length })
}
