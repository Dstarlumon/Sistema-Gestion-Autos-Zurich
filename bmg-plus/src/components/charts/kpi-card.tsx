'use client'

import { useEffect, useState } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'motion/react'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  label: string
  value: number
  format?: (n: number) => string
  trend?: { value: number; isPositive: boolean }
  accent?: string
  subtitle?: string
  className?: string
  delay?: number
}

export function KpiCard({
  label,
  value,
  format,
  trend,
  accent,
  subtitle,
  className,
  delay = 0,
}: KpiCardProps) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) =>
    format ? format(Math.round(v)) : Math.round(v).toLocaleString(),
  )
  const [displayValue, setDisplayValue] = useState(format ? format(0) : '0')

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 1.2,
      delay,
      ease: 'easeOut',
    })
    const unsubscribe = rounded.on('change', (v) =>
      setDisplayValue(v as string),
    )
    return () => {
      controls.stop()
      unsubscribe()
    }
  }, [value, delay, count, rounded, format])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={cn(
        'bg-surface-container-lowest rounded-xl p-5 relative overflow-hidden',
        'shadow-ambient',
        className,
      )}
    >
      {accent && (
        <div
          className="absolute top-0 left-0 right-0 h-[3px]"
          style={{ background: accent }}
        />
      )}
      <p className="text-label-sm text-on-surface-variant mb-2">{label}</p>
      <p className="text-display-md text-on-surface tabular-nums">
        {displayValue}
      </p>
      <div className="flex items-center gap-2 mt-1">
        {trend && (
          <span
            className={cn(
              'text-xs font-semibold flex items-center gap-0.5',
              trend.isPositive ? 'text-emerald-600' : 'text-red-600',
            )}
          >
            {trend.isPositive ? '\u2191' : '\u2193'}{' '}
            {Math.abs(trend.value).toFixed(1)}%
          </span>
        )}
        {subtitle && (
          <span className="text-xs text-on-surface-variant">{subtitle}</span>
        )}
      </div>
    </motion.div>
  )
}
