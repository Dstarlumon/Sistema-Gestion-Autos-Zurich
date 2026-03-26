'use client'

import { useMemo } from 'react'
import { motion } from 'motion/react'
import { useGestionesByLead } from '@/lib/queries/use-gestiones'
import { StatusBadge } from '@/components/shared/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime, formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import {
  Phone,
  MessageCircle,
  Mail,
  Bot,
  Clock,
  Upload,
} from 'lucide-react'

interface TimelineProps {
  leadId: string
  leadCreatedAt: string
  leadUploadedAt?: string
  uploadedByName?: string
}

// Color dot by root tipificacion category
const CATEGORY_DOT_COLORS: Record<string, string> = {
  'NO CONTACTO': 'bg-amber-500',
  'NO APTO': 'bg-red-500',
  'NO COTIZA': 'bg-slate-400',
  POSITIVO: 'bg-emerald-500',
}

const CANAL_ICONS: Record<string, React.ReactNode> = {
  telefono: <Phone className="size-3" />,
  whatsapp: <MessageCircle className="size-3" />,
  email: <Mail className="size-3" />,
  chatbot: <Bot className="size-3" />,
}

const CANAL_LABELS: Record<string, string> = {
  telefono: 'Telefono',
  whatsapp: 'WhatsApp',
  email: 'Email',
  chatbot: 'Chatbot',
}

/** Build the tipificacion display name from the joined tipificacion_tree data */
function buildTipificacionPath(gestion: Record<string, unknown>): string {
  const tip = gestion.tipificacion_tree as {
    name: string
    parent_id: string | null
    level: number
  } | null
  if (!tip) return ''
  return tip.name
}

/** Get the root category from gestion's tipificacion tree */
function getRootCategory(gestion: Record<string, unknown>): string {
  const tip = gestion.tipificacion_tree as {
    name: string
    parent_id: string | null
    level: number
  } | null
  if (!tip) return ''
  return tip.name
}

export function Timeline({
  leadId,
  leadCreatedAt,
  leadUploadedAt,
  uploadedByName,
}: TimelineProps) {
  const { data: gestiones, isLoading } = useGestionesByLead(leadId)

  // Determine dot color for each gestion by matching root category
  const gestionItems = useMemo(() => {
    if (!gestiones) return []
    return gestiones.map((g: Record<string, unknown>) => {
      const rootCat = getRootCategory(g)
      const dotColor =
        Object.entries(CATEGORY_DOT_COLORS).find(([key]) =>
          rootCat.toUpperCase().includes(key)
        )?.[1] ?? 'bg-slate-400'
      return { ...g, dotColor, rootCategory: rootCat }
    })
  }, [gestiones])

  if (isLoading) {
    return (
      <div className="space-y-4 py-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-3 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!gestionItems.length) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        Sin gestiones aun
      </div>
    )
  }

  return (
    <div className="relative pl-6">
      {/* Vertical line */}
      <div className="absolute left-1.75 top-2 bottom-2 w-px bg-border" />

      {/* Gestion nodes */}
      {gestionItems.map(
        (
          gestion: Record<string, unknown> & {
            dotColor: string
            rootCategory: string
          },
          index: number
        ) => {
          const profiles = gestion.profiles as {
            full_name: string
          } | null
          const agentName = profiles?.full_name ?? 'Agente'
          const canal = gestion.canal as string
          const observacion = gestion.observacion as string | null
          const attemptNumber = gestion.attempt_number as number | null
          const createdAt = gestion.created_at as string
          const retryScheduledAt =
            gestion.retry_scheduled_at as string | null
          const tipPath = buildTipificacionPath(gestion)

          return (
            <motion.div
              key={gestion.id as string}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: index * 0.05 }}
              className="relative mb-4 last:mb-0"
            >
              {/* Dot */}
              <div
                className={cn(
                  'absolute -left-6 top-1.5 size-3.5 rounded-full ring-2 ring-background',
                  gestion.dotColor
                )}
              />

              {/* Content card */}
              <div className="rounded-lg bg-surface-container-low p-3 shadow-ambient">
                {/* Header row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {attemptNumber != null && (
                      <span className="text-label-sm text-muted-foreground">
                        #{attemptNumber}
                      </span>
                    )}
                    <span className="text-xs font-medium text-foreground">
                      {agentName}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(createdAt)}
                  </span>
                </div>

                {/* Canal badge + tipificacion */}
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {canal && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
                      {CANAL_ICONS[canal]}
                      {CANAL_LABELS[canal] ?? canal}
                    </span>
                  )}
                  {tipPath && (
                    <StatusBadge
                      status={gestion.rootCategory
                        .toLowerCase()
                        .replace(/\s+/g, '_')}
                      label={tipPath}
                    />
                  )}
                </div>

                {/* Observation */}
                {observacion && (
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {observacion}
                  </p>
                )}

                {/* Retry scheduled */}
                {retryScheduledAt && (
                  <div className="mt-1.5 flex items-center gap-1 text-xs text-amber-600">
                    <Clock className="size-3" />
                    <span>
                      Reintento: {formatDateTime(retryScheduledAt)}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )
        }
      )}

      {/* Bottom entry: Lead created */}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{
          duration: 0.25,
          delay: gestionItems.length * 0.05,
        }}
        className="relative"
      >
        {/* Dot */}
        <div className="absolute -left-6 top-1.5 size-3.5 rounded-full bg-blue-500 ring-2 ring-background" />

        <div className="rounded-lg bg-surface-container-low p-3 shadow-ambient">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Upload className="size-3" />
            <span>
              Lead creado &mdash; {formatDate(leadCreatedAt)}
              {leadUploadedAt && (
                <>
                  {' '}
                  (cargado {formatDate(leadUploadedAt)}
                  {uploadedByName && <> por {uploadedByName}</>})
                </>
              )}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
