'use client'

import { ResponsiveHeatMap } from '@nivo/heatmap'

interface HeatMapDatum {
  id: string
  data: { x: string; y: number }[]
}

interface NivoHeatMapChartProps {
  data: HeatMapDatum[]
  height?: number
  margin?: { top: number; right: number; bottom: number; left: number }
  emptyMessage?: string
}

export function NivoHeatMapChart({
  data,
  height = 300,
  margin = { top: 30, right: 30, bottom: 30, left: 80 },
  emptyMessage = 'Sin datos',
}: NivoHeatMapChartProps) {
  if (!data || data.length === 0) {
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
      <ResponsiveHeatMap
        data={data}
        margin={margin}
        colors={{
          type: 'sequential',
          scheme: 'blues',
        }}
        emptyColor="#f0f0f0"
        borderWidth={1}
        borderColor="#ffffff"
        theme={{
          text: { fontSize: 10 },
          axis: {
            ticks: { text: { fontSize: 10 } },
          },
        }}
      />
    </div>
  )
}
