'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useRole } from '@/hooks/use-role'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Config types
// ---------------------------------------------------------------------------

interface OrgConfig {
  timezone?: string
  currency?: string
  max_pause_minutes?: number
  sla_max_hours?: number
  daily_goal?: number
  vitxi_api_url?: string
  vitxi_api_key?: string
  vitxi_webhook_secret?: string
  callbell_api_key?: string
}

interface Organization {
  id: string
  name: string
  logo_url: string | null
  config: OrgConfig | null
  created_at: string | null
  updated_at: string | null
}

// ---------------------------------------------------------------------------
// Configuracion page
// ---------------------------------------------------------------------------

export default function ConfiguracionPage() {
  const { canAdmin } = useRole()

  if (!canAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="text-4xl">&#128274;</div>
          <h2 className="text-title-md text-on-surface">No tienes acceso</h2>
          <p className="text-body-md text-on-surface-variant">
            Solo los coordinadores pueden editar la configuracion.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuracion General"
        subtitle="Ajustes de organizacion, operacion e integraciones"
      />
      <ConfigSections />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Config sections
// ---------------------------------------------------------------------------

function ConfigSections() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)

  const { data: org, isLoading } = useQuery({
    queryKey: ['admin-organization'],
    queryFn: async () => {
      if (!currentUser?.organization_id) return null
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', currentUser.organization_id)
        .single()
      if (error) throw error
      return data as Organization
    },
    enabled: !!currentUser?.organization_id,
  })

  // Organization state
  const [orgName, setOrgName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')

  // Operation state
  const [timezone, setTimezone] = useState('America/Bogota')
  const [currency, setCurrency] = useState('COP')
  const [maxPause, setMaxPause] = useState(60)
  const [slaHours, setSlaHours] = useState(24)
  const [dailyGoal, setDailyGoal] = useState(30)

  // Integration state
  const [vitxiUrl, setVitxiUrl] = useState('')
  const [vitxiKey, setVitxiKey] = useState('')
  const [vitxiSecret, setVitxiSecret] = useState('')
  const [callbellKey, setCallbellKey] = useState('')

  // Sync state from fetched data
  useEffect(() => {
    if (org) {
      setOrgName(org.name || '')
      setLogoUrl(org.logo_url || '')
      const config = org.config || {}
      setTimezone(config.timezone || 'America/Bogota')
      setCurrency(config.currency || 'COP')
      setMaxPause(config.max_pause_minutes || 60)
      setSlaHours(config.sla_max_hours || 24)
      setDailyGoal(config.daily_goal || 30)
      setVitxiUrl(config.vitxi_api_url || '')
      setVitxiKey(config.vitxi_api_key || '')
      setVitxiSecret(config.vitxi_webhook_secret || '')
      setCallbellKey(config.callbell_api_key || '')
    }
  }, [org])

  // Save organization info mutation
  const saveOrgMutation = useMutation({
    mutationFn: async () => {
      if (!org) return
      const { error } = await supabase
        .from('organizations')
        .update({
          name: orgName,
          logo_url: logoUrl || null,
        })
        .eq('id', org.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-organization'] })
    },
  })

  // Save operation config mutation
  const saveOperationMutation = useMutation({
    mutationFn: async () => {
      if (!org) return
      const currentConfig = (org.config || {}) as OrgConfig
      const updatedConfig: OrgConfig = {
        ...currentConfig,
        timezone,
        currency,
        max_pause_minutes: maxPause,
        sla_max_hours: slaHours,
        daily_goal: dailyGoal,
      }
      const { error } = await supabase
        .from('organizations')
        .update({ config: updatedConfig })
        .eq('id', org.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-organization'] })
    },
  })

  // Save integration config mutation
  const saveIntegrationMutation = useMutation({
    mutationFn: async () => {
      if (!org) return
      const currentConfig = (org.config || {}) as OrgConfig
      const updatedConfig: OrgConfig = {
        ...currentConfig,
        vitxi_api_url: vitxiUrl || undefined,
        vitxi_api_key: vitxiKey || undefined,
        vitxi_webhook_secret: vitxiSecret || undefined,
        callbell_api_key: callbellKey || undefined,
      }
      const { error } = await supabase
        .from('organizations')
        .update({ config: updatedConfig })
        .eq('id', org.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-organization'] })
    },
  })

  // Vitxi connection test
  const [vitxiTestResult, setVitxiTestResult] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')

  const testVitxiConnection = useCallback(async () => {
    if (!vitxiUrl) return
    setVitxiTestResult('testing')
    try {
      const response = await fetch(vitxiUrl, {
        method: 'GET',
        headers: vitxiKey ? { Authorization: `Bearer ${vitxiKey}` } : {},
        signal: AbortSignal.timeout(5000),
      })
      setVitxiTestResult(response.ok ? 'success' : 'error')
    } catch {
      setVitxiTestResult('error')
    }
    // Reset after 3 seconds
    setTimeout(() => setVitxiTestResult('idle'), 3000)
  }, [vitxiUrl, vitxiKey])

  if (isLoading) {
    return (
      <div className="space-y-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Section 1: Organization */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0, duration: 0.3 }}
      >
        <ConfigCard
          title="Organizacion"
          description="Datos basicos de tu empresa"
          isSaving={saveOrgMutation.isPending}
          isSuccess={saveOrgMutation.isSuccess}
          onSave={() => saveOrgMutation.mutate()}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-label-sm text-on-surface-variant block mb-1.5">
                Nombre de la organizacion
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface text-body-md border border-outline-variant/30 focus:border-brand-primary focus:outline-none transition-colors"
                placeholder="BMG Colombia"
              />
            </div>
            <div>
              <label className="text-label-sm text-on-surface-variant block mb-1.5">
                URL del logo
              </label>
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface text-body-md border border-outline-variant/30 focus:border-brand-primary focus:outline-none transition-colors"
                placeholder="https://ejemplo.com/logo.png"
              />
            </div>
          </div>
          {logoUrl && (
            <div className="mt-3 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              </div>
              <span className="text-xs text-on-surface-variant">Vista previa</span>
            </div>
          )}
        </ConfigCard>
      </motion.div>

      {/* Section 2: Operation */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.07, duration: 0.3 }}
      >
        <ConfigCard
          title="Operacion"
          description="Configuracion de zona horaria, SLA y metas"
          isSaving={saveOperationMutation.isPending}
          isSuccess={saveOperationMutation.isSuccess}
          onSave={() => saveOperationMutation.mutate()}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-label-sm text-on-surface-variant block mb-1.5">
                Zona horaria
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface text-body-md border border-outline-variant/30 focus:border-brand-primary focus:outline-none transition-colors"
              >
                <option value="America/Bogota">America/Bogota (UTC-5)</option>
                <option value="America/Mexico_City">America/Mexico_City (UTC-6)</option>
                <option value="America/Lima">America/Lima (UTC-5)</option>
                <option value="America/Santiago">America/Santiago (UTC-3/-4)</option>
                <option value="America/Buenos_Aires">America/Buenos_Aires (UTC-3)</option>
                <option value="America/Sao_Paulo">America/Sao_Paulo (UTC-3)</option>
                <option value="America/New_York">America/New_York (UTC-5/-4)</option>
              </select>
            </div>
            <div>
              <label className="text-label-sm text-on-surface-variant block mb-1.5">
                Moneda
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface text-body-md border border-outline-variant/30 focus:border-brand-primary focus:outline-none transition-colors"
              >
                <option value="COP">COP (Peso colombiano)</option>
                <option value="MXN">MXN (Peso mexicano)</option>
                <option value="USD">USD (Dolar estadounidense)</option>
                <option value="PEN">PEN (Sol peruano)</option>
              </select>
            </div>
            <div>
              <label className="text-label-sm text-on-surface-variant block mb-1.5">
                Max. pausa (minutos)
              </label>
              <input
                type="number"
                min={5}
                max={240}
                value={maxPause}
                onChange={(e) => setMaxPause(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface text-body-md border border-outline-variant/30 focus:border-brand-primary focus:outline-none transition-colors tabular-nums"
              />
            </div>
            <div>
              <label className="text-label-sm text-on-surface-variant block mb-1.5">
                SLA maximo (horas)
              </label>
              <input
                type="number"
                min={1}
                max={168}
                value={slaHours}
                onChange={(e) => setSlaHours(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface text-body-md border border-outline-variant/30 focus:border-brand-primary focus:outline-none transition-colors tabular-nums"
              />
              <p className="text-[0.6rem] text-on-surface-variant mt-1">
                Tiempo maximo para primera gestion de un lead
              </p>
            </div>
            <div>
              <label className="text-label-sm text-on-surface-variant block mb-1.5">
                Meta gestiones diarias
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={dailyGoal}
                onChange={(e) => setDailyGoal(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface text-body-md border border-outline-variant/30 focus:border-brand-primary focus:outline-none transition-colors tabular-nums"
              />
              <p className="text-[0.6rem] text-on-surface-variant mt-1">
                Gestiones esperadas por agente al dia
              </p>
            </div>
          </div>
        </ConfigCard>
      </motion.div>

      {/* Section 3: Integrations */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14, duration: 0.3 }}
      >
        <ConfigCard
          title="Integraciones"
          description="Conexion con servicios externos"
          isSaving={saveIntegrationMutation.isPending}
          isSuccess={saveIntegrationMutation.isSuccess}
          onSave={() => saveIntegrationMutation.mutate()}
        >
          {/* Vitxi */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-label-sm text-on-surface">VITXI / VitalPBX</h4>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[0.6rem] font-semibold bg-emerald-100 text-emerald-800">
                Disponible
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-label-sm text-on-surface-variant block mb-1.5">
                  API URL
                </label>
                <input
                  type="text"
                  value={vitxiUrl}
                  onChange={(e) => setVitxiUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface text-body-md border border-outline-variant/30 focus:border-brand-primary focus:outline-none transition-colors"
                  placeholder="https://vitxi.ejemplo.com/api/v1"
                />
              </div>
              <div>
                <label className="text-label-sm text-on-surface-variant block mb-1.5">
                  API Key
                </label>
                <input
                  type="password"
                  value={vitxiKey}
                  onChange={(e) => setVitxiKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface text-body-md border border-outline-variant/30 focus:border-brand-primary focus:outline-none transition-colors"
                  placeholder="vt_xxxxxxxxxxxx"
                />
              </div>
              <div>
                <label className="text-label-sm text-on-surface-variant block mb-1.5">
                  Webhook Secret
                </label>
                <input
                  type="password"
                  value={vitxiSecret}
                  onChange={(e) => setVitxiSecret(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface text-body-md border border-outline-variant/30 focus:border-brand-primary focus:outline-none transition-colors"
                  placeholder="whsec_xxxxxxxxxxxx"
                />
              </div>
            </div>

            {/* Connection test */}
            <div className="flex items-center gap-3">
              <button
                onClick={testVitxiConnection}
                disabled={!vitxiUrl || vitxiTestResult === 'testing'}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-lg transition-colors',
                  'bg-surface-container-low hover:bg-surface-container text-on-surface',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                )}
              >
                {vitxiTestResult === 'testing' ? 'Probando...' : 'Probar conexion'}
              </button>
              {vitxiTestResult === 'success' && (
                <span className="text-xs text-emerald-600 font-medium">
                  Conexion exitosa
                </span>
              )}
              {vitxiTestResult === 'error' && (
                <span className="text-xs text-red-600 font-medium">
                  Error de conexion
                </span>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-outline-variant/20 my-5" />

          {/* Callbell */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-label-sm text-on-surface">CALLBELL / WHATSAPP</h4>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[0.6rem] font-semibold bg-amber-100 text-amber-800">
                Proximamente
              </span>
            </div>

            <div>
              <label className="text-label-sm text-on-surface-variant block mb-1.5">
                API Key
              </label>
              <input
                type="password"
                value={callbellKey}
                onChange={(e) => setCallbellKey(e.target.value)}
                disabled
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface-variant text-body-md border border-outline-variant/30 opacity-50 cursor-not-allowed"
                placeholder="Disponible en una proxima version"
              />
            </div>
          </div>

          {/* Environment variables note */}
          <div className="border-t border-outline-variant/20 my-5" />
          <div className="rounded-lg bg-surface-container-low p-4">
            <p className="text-label-sm text-on-surface-variant mb-1.5">
              NOTA SOBRE VARIABLES DE ENTORNO
            </p>
            <p className="text-body-md text-on-surface-variant leading-relaxed">
              Las claves API guardadas aqui se almacenan en la base de datos para referencia.
              Para que las integraciones funcionen en produccion, configura las variables
              de entorno correspondientes en{' '}
              <span className="font-semibold text-on-surface">
                Vercel Dashboard &rarr; Settings &rarr; Environment Variables
              </span>:
            </p>
            <div className="mt-2 space-y-1">
              <code className="block text-xs font-mono text-on-surface-variant bg-surface-container px-2 py-1 rounded">
                VITXI_API_URL, VITXI_API_KEY, VITXI_WEBHOOK_SECRET
              </code>
              <code className="block text-xs font-mono text-on-surface-variant bg-surface-container px-2 py-1 rounded">
                CALLBELL_API_KEY (cuando este disponible)
              </code>
            </div>
          </div>
        </ConfigCard>
      </motion.div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Reusable config card wrapper
// ---------------------------------------------------------------------------

function ConfigCard({
  title,
  description,
  children,
  isSaving,
  isSuccess,
  onSave,
}: {
  title: string
  description: string
  children: React.ReactNode
  isSaving: boolean
  isSuccess: boolean
  onSave: () => void
}) {
  const [showSaved, setShowSaved] = useState(false)

  // Show "Guardado" briefly after success
  useEffect(() => {
    if (isSuccess) {
      setShowSaved(true)
      const timer = setTimeout(() => setShowSaved(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [isSuccess])

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-ambient overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-title-md text-on-surface">{title}</h3>
            <p className="text-body-md text-on-surface-variant mt-0.5">
              {description}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {showSaved && (
              <motion.span
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-emerald-600 font-medium"
              >
                Guardado
              </motion.span>
            )}
            <Button
              size="sm"
              disabled={isSaving}
              onClick={onSave}
            >
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
