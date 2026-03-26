'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/shared/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { useRole } from '@/hooks/use-role'

// ---------------------------------------------------------------------------
// Admin Hub — coordinador-only landing with navigation cards
// ---------------------------------------------------------------------------

export default function AdminPage() {
  const { canAdmin } = useRole()

  if (!canAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="text-4xl">&#128274;</div>
          <h2 className="text-title-md text-on-surface">No tienes acceso</h2>
          <p className="text-body-md text-on-surface-variant">
            Solo los coordinadores pueden acceder al modulo de administracion.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administracion"
        subtitle="Configura usuarios, campanas, tipificaciones y la organizacion"
      />
      <AdminCards />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Admin navigation cards with live counts
// ---------------------------------------------------------------------------

function AdminCards() {
  const { counts, isLoading } = useAdminCounts()

  const cards = useMemo(
    () => [
      {
        title: 'Usuarios',
        href: '/admin/usuarios',
        icon: '\u{1F465}',
        description: 'Gestionar perfiles, roles y asignaciones de campana',
        count: counts.users,
        countLabel: 'usuarios activos',
      },
      {
        title: 'Campanas',
        href: '/admin/campanas',
        icon: '\u{1F4CB}',
        description: 'Crear campanas, asignar agentes y gestionar bases',
        count: counts.campaigns,
        countLabel: 'campanas activas',
      },
      {
        title: 'Tipificaciones',
        href: '/admin/tipificaciones',
        icon: '\u{1F333}',
        description: 'Editar el arbol de tipificaciones por niveles',
        count: counts.tipificaciones,
        countLabel: 'nodos en el arbol',
      },
      {
        title: 'Configuracion',
        href: '/admin/configuracion',
        icon: '\u{2699}\u{FE0F}',
        description: 'Ajustes de organizacion, SLA, integraciones y mas',
        count: null,
        countLabel: '',
      },
    ],
    [counts],
  )

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((card, i) => (
        <motion.div
          key={card.href}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07, duration: 0.3 }}
        >
          <Link href={card.href} className="block group">
            <div className="bg-surface-container-lowest rounded-xl shadow-ambient p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group-focus-visible:ring-2 group-focus-visible:ring-brand-primary">
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-2xl mb-4">
                {card.icon}
              </div>

              {/* Title */}
              <h3 className="text-title-md text-on-surface mb-1">
                {card.title}
              </h3>

              {/* Description */}
              <p className="text-body-md text-on-surface-variant leading-relaxed mb-3">
                {card.description}
              </p>

              {/* Count */}
              {card.count !== null && (
                <div className="text-label-sm text-on-surface-variant">
                  {isLoading ? (
                    <Skeleton className="h-3 w-20" />
                  ) : (
                    <span className="tabular-nums">
                      {card.count} {card.countLabel}
                    </span>
                  )}
                </div>
              )}
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Fetch counts for display on cards
// ---------------------------------------------------------------------------

function useAdminCounts() {
  const supabase = createClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-counts'],
    queryFn: async () => {
      const [users, campaigns, tipificaciones] = await Promise.all([
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true),
        supabase
          .from('campaigns')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true),
        supabase
          .from('tipificacion_tree')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true),
      ])

      return {
        users: users.count ?? 0,
        campaigns: campaigns.count ?? 0,
        tipificaciones: tipificaciones.count ?? 0,
      }
    },
  })

  return {
    counts: data ?? { users: 0, campaigns: 0, tipificaciones: 0 },
    isLoading,
  }
}
