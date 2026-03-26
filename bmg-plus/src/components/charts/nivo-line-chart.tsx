'use client'

import { ResponsiveLine } from '@nivo/line'

export type LineSerieData = {
  id: string
  data: readonly { x: string | number | null; y: number | null }[]
}

interface NivoLineChartProps {
  data: LineSerieData[]
  height?: number
  enableArea?: boolean
  areaOpacity?: number
  colors?: string[]
  margin?: { top: number; right: number; bottom: number; left: number }
  emptyMessage?: string
}

export function NivoLineChart({
  data,
  height = 300,
  enableArea = false,
  areaOpacity = 0.15,
  colors = ['#fa5058'],
  margin = { top: 10, right: 30, bottom: 40, left: 80 },
  emptyMessage = 'Sin datos',
}: NivoLineChartProps) {
  const hasData = data.length > 0 && data.some((s) => s.data.length > 0)

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
      <ResponsiveLine
        data={data}
        margin={margin}
        xScale={{ type: 'point' }}
        yScale={{ type: 'linear', min: 0, stacked: false }}
        enableArea={enableArea}
        areaOpacity={areaOpacity}
        colors={colors}
        pointSize={6}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serieColor' }}
        useMesh={true}
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
