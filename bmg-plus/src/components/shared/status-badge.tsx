import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

const STATUS_STYLES: Record<string, string> = {
  // Lead statuses
  nuevo: 'bg-blue-100 text-blue-800 border-blue-200',
  contactado: 'bg-sky-100 text-sky-800 border-sky-200',
  cotizado: 'bg-amber-100 text-amber-800 border-amber-200',
  en_proceso: 'bg-orange-100 text-orange-800 border-orange-200',
  venta: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  no_apto: 'bg-red-100 text-red-800 border-red-200',
  cerrado: 'bg-slate-100 text-slate-600 border-slate-200',
  // Agent statuses
  disponible: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  en_llamada: 'bg-blue-100 text-blue-800 border-blue-200',
  pausa: 'bg-amber-100 text-amber-800 border-amber-200',
  offline: 'bg-slate-100 text-slate-500 border-slate-200',
  // Alert severities
  alta: 'bg-red-100 text-red-800 border-red-200',
  media: 'bg-amber-100 text-amber-800 border-amber-200',
  informativa: 'bg-blue-100 text-blue-800 border-blue-200',
  // Renewal
  si: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  no: 'bg-red-100 text-red-800 border-red-200',
  // Generic
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-500 border-slate-200',
}

interface StatusBadgeProps {
  status: string
  label?: string // override display text
  className?: string
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] || 'bg-slate-100 text-slate-600 border-slate-200'
  const displayText = label || status.replace(/_/g, ' ')

  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-full text-[0.65rem] font-semibold capitalize',
        style,
        className
      )}
    >
      {displayText}
    </Badge>
  )
}

export function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    disponible: 'bg-emerald-500',
    en_llamada: 'bg-blue-500',
    pausa: 'bg-amber-500',
    offline: 'bg-slate-400',
  }

  return (
    <span
      className={cn(
        'inline-block w-2 h-2 rounded-full',
        colors[status] || 'bg-slate-400',
        status === 'disponible' && 'shadow-[0_0_0_2px_rgba(16,185,129,0.3)]'
      )}
    />
  )
}
