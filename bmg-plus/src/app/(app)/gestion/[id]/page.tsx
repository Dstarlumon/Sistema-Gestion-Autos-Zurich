'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useLeadById } from '@/lib/queries/use-leads'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Timeline } from '@/components/gestion/timeline'
import { GestionForm } from '@/components/gestion/gestion-form'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { formatDate, formatPhone } from '@/lib/utils/format'
import {
  ArrowLeft,
  Phone,
  Mail,
  FileText,
  MapPin,
  Car,
  Calendar,
  Upload,
} from 'lucide-react'

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { data: lead, isLoading } = useLeadById(id)

  if (isLoading) {
    return <LeadDetailSkeleton />
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-body-md text-muted-foreground">
          Lead no encontrado.
        </p>
        <Button
          variant="ghost"
          className="mt-4"
          onClick={() => router.push('/gestion')}
        >
          <ArrowLeft className="size-4" />
          Volver a lista
        </Button>
      </div>
    )
  }

  const campaign = lead.campaigns as {
    name: string
    color: string | null
    slug: string
  } | null
  const agent = lead.profiles as { full_name: string } | null
  const status = lead.status as string | null

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/gestion')}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <PageHeader
          title={lead.nombre as string}
          subtitle={agent?.full_name ? `Asignado a ${agent.full_name}` : undefined}
        >
          {status && <StatusBadge status={status} className="text-xs" />}
          {campaign && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
              style={{ backgroundColor: campaign.color ?? '#6b7280' }}
            >
              {campaign.name}
            </span>
          )}
        </PageHeader>
      </div>

      {/* Split layout */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Left panel: 2/5 — Lead info + Timeline */}
        <div className="w-full lg:w-2/5 space-y-5">
          {/* Lead info card */}
          <div className="rounded-xl bg-surface-container-lowest p-5 shadow-ambient">
            <h2 className="text-title-md text-on-surface mb-4">
              Informacion del Lead
            </h2>
            <dl className="space-y-3">
              <InfoRow
                icon={<Phone className="size-4" />}
                label="Telefono"
                value={formatPhone(lead.telefono as string)}
              />
              {lead.documento && (
                <InfoRow
                  icon={<FileText className="size-4" />}
                  label="Documento"
                  value={lead.documento as string}
                />
              )}
              {lead.correo && (
                <InfoRow
                  icon={<Mail className="size-4" />}
                  label="Correo"
                  value={lead.correo as string}
                />
              )}
              {lead.ciudad && (
                <InfoRow
                  icon={<MapPin className="size-4" />}
                  label="Ciudad"
                  value={lead.ciudad as string}
                />
              )}
              {lead.placa && (
                <InfoRow
                  icon={<Car className="size-4" />}
                  label="Placa"
                  value={lead.placa as string}
                />
              )}
              <InfoRow
                icon={<Calendar className="size-4" />}
                label="Creado"
                value={formatDate(lead.created_at as string)}
              />
              {lead.uploaded_at && (
                <InfoRow
                  icon={<Upload className="size-4" />}
                  label="Cargado"
                  value={formatDate(lead.uploaded_at as string)}
                />
              )}
            </dl>
          </div>

          {/* Timeline */}
          <div className="rounded-xl bg-surface-container-lowest p-5 shadow-ambient">
            <h2 className="text-title-md text-on-surface mb-4">
              Historial de Gestiones
            </h2>
            <Timeline
              leadId={id}
              leadCreatedAt={lead.created_at as string}
              leadUploadedAt={lead.uploaded_at as string}
            />
          </div>
        </div>

        {/* Right panel: 3/5 — Gestion Form */}
        <div className="w-full lg:w-3/5">
          <div className="rounded-xl bg-surface-container-lowest p-5 shadow-ambient">
            <h2 className="text-title-md text-on-surface mb-4">
              Nueva Gestion
            </h2>
            <GestionForm
              leadId={id}
              campaignId={lead.campaign_id as string}
              leadData={{
                nombre: lead.nombre as string,
                telefono: lead.telefono as string,
                documento: (lead.documento as string) ?? undefined,
                correo: (lead.correo as string) ?? undefined,
                placa: (lead.placa as string) ?? undefined,
                ciudad: (lead.ciudad as string) ?? undefined,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Helper Components                                                   */
/* ------------------------------------------------------------------ */

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div>
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="text-body-md text-on-surface">{value}</dd>
      </div>
    </div>
  )
}

function LeadDetailSkeleton() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="size-8 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="flex flex-col lg:flex-row gap-5">
        <div className="w-full lg:w-2/5 space-y-5">
          <div className="rounded-xl bg-surface-container-lowest p-5 shadow-ambient">
            <Skeleton className="h-5 w-40 mb-4" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 mb-3">
                <Skeleton className="size-4 rounded" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-surface-container-lowest p-5 shadow-ambient">
            <Skeleton className="h-5 w-48 mb-4" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3 mb-3">
                <Skeleton className="size-3.5 rounded-full" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="w-full lg:w-3/5">
          <div className="rounded-xl bg-surface-container-lowest p-5 shadow-ambient">
            <Skeleton className="h-5 w-36 mb-4" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
