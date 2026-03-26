'use client'

import { ResponsiveSunburst } from '@nivo/sunburst'

interface SunburstNode {
  name: string
  value?: number
  children?: SunburstNode[]
}

interface NivoSunburstChartProps {
  data: SunburstNode
  height?: number
  colors?: { scheme: string }
  margin?: { top: number; right: number; bottom: number; left: number }
  emptyMessage?: string
}

export function NivoSunburstChart({
  data,
  height = 400,
  colors = { scheme: 'paired' },
  margin = { top: 10, right: 10, bottom: 10, left: 10 },
  emptyMessage = 'Sin datos',
}: NivoSunburstChartProps) {
  const hasChildren = data.children && data.children.length > 0

  if (!hasChildren) {
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
      <ResponsiveSunburst
        data={data}
        margin={margin}
        cornerRadius={2}
        colors={colors as Parameters<typeof ResponsiveSunburst>[0]['colors']}
        childColor={{ from: 'color', modifiers: [['brighter', 0.3]] }}
        borderWidth={1}
        borderColor={{ from: 'color', modifiers: [['darker', 0.3]] }}
        enableArcLabels={true}
        arcLabelsSkipAngle={10}
        theme={{ text: { fontSize: 11 } }}
      />
    </div>
  )
}
