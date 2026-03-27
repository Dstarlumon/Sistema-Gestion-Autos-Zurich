'use client'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'

export function HelpTooltip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="inline-flex ml-1 cursor-help">
            <Info size={14} className="text-on-surface-variant" />
          </span>
        }
      />
      <TooltipContent side="top" className="max-w-60 text-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}
