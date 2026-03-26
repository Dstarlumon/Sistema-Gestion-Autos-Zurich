'use client'

import { ResponsivePie } from '@nivo/pie'

interface PieDatum {
  id: string
  label: string
  value: number
}

interface NivoPieChartProps {
  data: PieDatum[]
  height?: number
  innerRadius?: number
  padAngle?: number
  cornerRadius?: number
  colors?: { scheme: string } | string[]
  margin?: { top: number; right: number; bottom: number; left: number }
  emptyMessage?: string
}

export function NivoPieChart({
  data,
  height = 300,
  innerRadius = 0.5,
  padAngle = 2,
  cornerRadius = 4,
  colors = { scheme: 'paired' },
  margin = { top: 20, right: 80, bottom: 20, left: 80 },
  emptyMessage = 'Sin datos',
}: NivoPieChartProps) {
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
      <ResponsivePie
        data={data}
        margin={margin}
        innerRadius={innerRadius}
        padAngle={padAngle}
        cornerRadius={cornerRadius}
        colors={colors as Parameters<typeof ResponsivePie>[0]['colors']}
        arcLinkLabelsSkipAngle={10}
        arcLinkLabelsTextColor="#666"
        arcLinkLabelsThickness={2}
        arcLabelsSkipAngle={10}
        theme={{ text: { fontSize: 11 } }}
      />
    </div>
  )
}
