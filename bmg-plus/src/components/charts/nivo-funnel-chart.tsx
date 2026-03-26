'use client'

import { ResponsiveFunnel } from '@nivo/funnel'

type FunnelDatum = {
  id: string
  value: number
  label: string
  [key: string]: string | number
}

interface NivoFunnelChartProps {
  data: FunnelDatum[]
  height?: number
  colors?: string[]
  margin?: { top: number; right: number; bottom: number; left: number }
  emptyMessage?: string
}

export function NivoFunnelChart({
  data,
  height = 400,
  colors = ['#3b82f6', '#66cfd0', '#d97706', '#fa5058', '#059669'],
  margin = { top: 20, right: 20, bottom: 20, left: 20 },
  emptyMessage = 'Sin datos',
}: NivoFunnelChartProps) {
  const hasData = data.length > 0 && data.some((d) => d.value > 0)

  if (!hasData) {
    return (
      <div
        className="flex items-center justify-center text-on-surface-variant text-sm"
        style={{ height }}
      >
        {emptyMessage}
      </div>
    )
  }

  return (
    <div style={{ height }}>
      <ResponsiveFunnel
        data={data}
        margin={margin}
        colors={colors}
        borderWidth={0}
        labelColor={{ from: 'color', modifiers: [['darker', 3]] }}
        theme={{ text: { fontSize: 12 } }}
      />
    </div>
  )
}
