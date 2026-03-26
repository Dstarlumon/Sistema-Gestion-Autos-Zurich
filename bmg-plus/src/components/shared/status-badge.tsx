import { cn } from '@/lib/utils'

const STATUS_STYLES: Record<string, string> = {
  // Lead statuses
  nuevo: 'bg-blue-100 text-blue-800',
  contactado: 'bg-sky-100 text-sky-800',
  cotizado: 'bg-amber-100 text-amber-800',
  en_proceso: 'bg-orange-100 text-orange-800',
  venta: 'bg-emerald-100 text-emerald-800',
  no_apto: 'bg-red-100 text-red-800',
  cerrado: 'bg-slate-100 text-slate-600',
  // Agent statuses
  disponible: 'bg-emerald-100 text-emerald-800',
  en_llamada: 'bg-blue-100 text-blue-800',
  pausa: 'bg-amber-100 text-amber-800',
  offline: 'bg-slate-100 text-slate-500',
  // Alert severities
  alta: 'bg-red-100 text-red-800',
  media: 'bg-amber-100 text-amber-800',
  informativa: 'bg-blue-100 text-blue-800',
  // Renewal
  si: 'bg-emerald-100 text-emerald-800',
  no: 'bg-red-100 text-red-800',
  // Generic
  active: 'bg-emerald-100 text-emerald-800',
  inactive: 'bg-slate-100 text-slate-500',
}

interface StatusBadgeProps {
  status: string
  label?: string // override display text
  className?: string
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] || 'bg-slate-100 text-slate-600'
  const displayText = label || status.replace(/_/g, ' ')

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[0.65rem] font-semibold capitalize',
        style,
        className
      )}
    >
      {displayText}
    </span>
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
