'use client'

import { ResponsiveBar, type BarDatum } from '@nivo/bar'

interface NivoBarChartProps {
  data: BarDatum[]
  keys: string[]
  indexBy: string
  layout?: 'horizontal' | 'vertical'
  colors?: string[]
  height?: number
  margin?: { top: number; right: number; bottom: number; left: number }
  emptyMessage?: string
}

export function NivoBarChart({
  data,
  keys,
  indexBy,
  layout = 'vertical',
  colors = ['#66cfd0'],
  height = 300,
  margin = { top: 10, right: 30, bottom: 40, left: 120 },
  emptyMessage = 'Sin datos',
}: NivoBarChartProps) {
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
      <ResponsiveBar
        data={data}
        keys={keys}
        indexBy={indexBy}
        layout={layout}
        margin={margin}
        colors={colors}
        borderRadius={4}
        labelSkipWidth={12}
        labelSkipHeight={12}
        padding={0.3}
        theme={{
          text: { fontSize: 11 },
          axis: {
            ticks: { text: { fontSize: 11 } },
          },
          grid: { line: { stroke: '#e0e0e0', strokeWidth: 1 } },
        }}
      />
    </div>
  )
}
