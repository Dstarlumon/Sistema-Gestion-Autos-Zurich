import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Role } from '@/lib/utils/constants'

export async function POST(request: NextRequest) {
  // 1. Authenticate the user via session cookie
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // 2. Fetch profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 })
  }

  const role = profile.role as Role
  if (!['supervisor', 'coordinador'].includes(role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { type, module, filters } = await request.json()

  // 3. Fetch data based on module, applying role-based filtering
  let data: Record<string, unknown>[] = []

  if (module === 'leads' || module === 'gestiones') {
    let query = supabase.from(module).select('*')

    // Role-based filtering
    if (role === 'supervisor') {
      // Supervisors see data from their assigned campaigns
      const { data: assignments } = await supabase
        .from('campaign_agents')
        .select('campaign_id')
        .eq('agent_id', user.id)
      const campaignIds = (assignments || []).map((a) => a.campaign_id)
      if (campaignIds.length > 0) {
        query = query.in('campaign_id', campaignIds)
      } else {
        // Supervisor with no campaigns sees nothing
        return NextResponse.json({ data: [], count: 0 })
      }
    }
    // coordinador sees all — no extra filter needed

    if (filters?.campaign_id) query = query.eq('campaign_id', filters.campaign_id)
    if (filters?.date_from) query = query.gte('created_at', filters.date_from)
    if (filters?.date_to) query = query.lte('created_at', filters.date_to)
    const { data: rows } = await query.limit(10000)
    data = rows || []
  } else if (module === 'sales') {
    let query = supabase.from('sales').select('*')

    // Role-based filtering
    if (role === 'supervisor') {
      const { data: assignments } = await supabase
        .from('campaign_agents')
        .select('campaign_id')
        .eq('agent_id', user.id)
      const campaignIds = (assignments || []).map((a) => a.campaign_id)
      if (campaignIds.length > 0) {
        query = query.in('campaign_id', campaignIds)
      } else {
        return NextResponse.json({ data: [], count: 0 })
      }
    }

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

  if (type === 'excel') {
    // Excel export using exceljs
    if (data.length === 0) {
      return new NextResponse('No data', { status: 404 })
    }

    const ExcelJS = (await import('exceljs')).default
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet(module)

    // Add headers
    const headers = Object.keys(data[0])
    sheet.addRow(headers)

    // Style header row
    const headerRow = sheet.getRow(1)
    headerRow.font = { bold: true }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8E8E8' },
    }

    // Add data rows
    for (const row of data) {
      sheet.addRow(headers.map((h) => row[h] ?? ''))
    }

    // Auto-fit columns
    for (const column of sheet.columns) {
      column.width = 18
    }

    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer as ArrayBuffer, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${module}_export.xlsx"`,
      },
    })
  }

  if (type === 'pdf') {
    // Generate a printable HTML report styled for PDF printing
    if (data.length === 0) {
      return new NextResponse('No data', { status: 404 })
    }
    const headers = Object.keys(data[0])
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reporte ${module}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 2cm; }
          h1 { color: #222831; font-size: 18px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 1em; }
          th { background: #222831; color: white; padding: 8px; text-align: left; }
          td { padding: 6px 8px; border-bottom: 1px solid #eee; }
          tr:nth-child(even) td { background: #f8f9fa; }
          .meta { color: #666; font-size: 12px; margin-bottom: 1em; }
          @media print { body { margin: 1cm; } }
        </style>
      </head>
      <body>
        <h1>BMG+ — Reporte de ${module}</h1>
        <p class="meta">Generado: ${new Date().toLocaleString('es-CO')}</p>
        <table>
          <thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
          <tbody>${data.map((row) => `<tr>${headers.map((h) => `<td>${row[h] ?? ''}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </body>
      </html>
    `
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="${module}_report.html"`,
      },
    })
  }

  // Default: return JSON
  return NextResponse.json({ data, count: data.length })
}
