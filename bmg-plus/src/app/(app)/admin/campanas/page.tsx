'use client'

import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import { Dialog } from '@base-ui/react/dialog'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useRole } from '@/hooks/use-role'
import { useAuthStore } from '@/stores/auth-store'
import { campaignSchema, type CampaignInput } from '@/lib/validations/campaign.schema'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Campaign {
  id: string
  organization_id: string
  name: string
  slug: string
  color: string | null
  icon: string | null
  is_active: boolean | null
  created_at: string | null
}

interface CampaignBase {
  id: string
  campaign_id: string
  name: string
  is_active: boolean | null
  created_at: string | null
}

interface CampaignAgentRow {
  agent_id: string
  campaign_id: string
  profiles: { id: string; full_name: string; role: string } | null
}

// ---------------------------------------------------------------------------
// Campanas page — Campaign CRUD
// ---------------------------------------------------------------------------

export default function CampanasPage() {
  const { canAdmin } = useRole()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null)

  if (!canAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="text-4xl">&#128274;</div>
          <h2 className="text-title-md text-on-surface">No tienes acceso</h2>
          <p className="text-body-md text-on-surface-variant">
            Solo los coordinadores pueden gestionar campanas.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Gestion de Campanas" subtitle="Crea campanas, asigna agentes y gestiona bases">
        <Button onClick={() => setShowCreateDialog(true)}>+ Nueva Campana</Button>
      </PageHeader>

      <CampaignGrid
        expandedCampaign={expandedCampaign}
        onToggleExpand={(id) =>
          setExpandedCampaign((prev) => (prev === id ? null : id))
        }
      />

      <CreateCampaignDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Campaign cards grid
// ---------------------------------------------------------------------------

function CampaignGrid({
  expandedCampaign,
  onToggleExpand,
}: {
  expandedCampaign: string | null
  onToggleExpand: (id: string) => void
}) {
  const supabase = createClient()

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['admin-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('name')
      if (error) throw error
      return (data || []) as Campaign[]
    },
  })

  // Fetch agent counts per campaign
  const { data: agentCounts } = useQuery({
    queryKey: ['admin-campaign-agent-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_agents')
        .select('campaign_id')
      if (error) throw error
      const counts = new Map<string, number>()
      for (const row of data || []) {
        counts.set(row.campaign_id, (counts.get(row.campaign_id) || 0) + 1)
      }
      return counts
    },
  })

  // Fetch base counts per campaign
  const { data: baseCounts } = useQuery({
    queryKey: ['admin-campaign-base-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_bases')
        .select('campaign_id, is_active')
      if (error) throw error
      const counts = new Map<string, number>()
      for (const row of data || []) {
        if (row.is_active) {
          counts.set(row.campaign_id, (counts.get(row.campaign_id) || 0) + 1)
        }
      }
      return counts
    },
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    )
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="text-center py-16 text-on-surface-variant text-body-md">
        No hay campanas creadas. Crea la primera con el boton de arriba.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {campaigns.map((campaign, i) => (
        <motion.div
          key={campaign.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
        >
          <CampaignCard
            campaign={campaign}
            agentCount={agentCounts?.get(campaign.id) || 0}
            baseCount={baseCounts?.get(campaign.id) || 0}
            isExpanded={expandedCampaign === campaign.id}
            onToggleExpand={() => onToggleExpand(campaign.id)}
          />
        </motion.div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Single campaign card (collapsible)
// ---------------------------------------------------------------------------

function CampaignCard({
  campaign,
  agentCount,
  baseCount,
  isExpanded,
  onToggleExpand,
}: {
  campaign: Campaign
  agentCount: number
  baseCount: number
  isExpanded: boolean
  onToggleExpand: () => void
}) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const toggleActiveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('campaigns')
        .update({ is_active: !campaign.is_active })
        .eq('id', campaign.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['admin-counts'] })
    },
  })

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-ambient overflow-hidden">
      {/* Color accent bar */}
      <div
        className="h-1.5"
        style={{ backgroundColor: campaign.color || '#6b7280' }}
      />

      {/* Card header */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
              style={{
                backgroundColor: `${campaign.color || '#6b7280'}20`,
              }}
            >
              {campaign.icon || '\u{1F4CB}'}
            </div>
            <div>
              <h3 className="text-title-md text-on-surface">{campaign.name}</h3>
              <p className="text-[0.65rem] text-on-surface-variant font-mono">
                {campaign.slug}
              </p>
            </div>
          </div>
          <StatusBadge
            status={campaign.is_active ? 'active' : 'inactive'}
            label={campaign.is_active ? 'Activa' : 'Inactiva'}
          />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-body-md text-on-surface-variant mb-4">
          <span className="tabular-nums">{agentCount} agentes</span>
          <span className="text-outline-variant">|</span>
          <span className="tabular-nums">{baseCount} bases</span>
          <span className="text-outline-variant">|</span>
          <div className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded border border-outline-variant/30"
              style={{ backgroundColor: campaign.color || '#6b7280' }}
            />
            <span className="font-mono text-xs">{campaign.color || '#6b7280'}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleExpand}
            className="px-3 py-1.5 text-xs rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface transition-colors"
          >
            {isExpanded ? 'Cerrar' : 'Editar / Detalles'}
          </button>
          <button
            onClick={() => toggleActiveMutation.mutate()}
            disabled={toggleActiveMutation.isPending}
            className={cn(
              'px-3 py-1.5 text-xs rounded-lg transition-colors',
              campaign.is_active
                ? 'hover:bg-red-50 text-red-600'
                : 'hover:bg-emerald-50 text-emerald-600',
            )}
          >
            {campaign.is_active ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      </div>

      {/* Expanded section */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t border-outline-variant/20 p-5 space-y-6">
              <CampaignEditSection campaign={campaign} />
              <CampaignAgentsSection campaignId={campaign.id} />
              <CampaignBasesSection campaignId={campaign.id} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inline edit section for campaign name/slug/color/icon
// ---------------------------------------------------------------------------

function CampaignEditSection({ campaign }: { campaign: Campaign }) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const [name, setName] = useState(campaign.name)
  const [slug, setSlug] = useState(campaign.slug)
  const [color, setColor] = useState(campaign.color || '#3b82f6')
  const [icon, setIcon] = useState(campaign.icon || '')

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('campaigns')
        .update({ name, slug, color, icon: icon || null })
        .eq('id', campaign.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] })
    },
  })

  const generateSlug = useCallback((val: string) => {
    return val
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_-]/g, '')
  }, [])

  return (
    <div>
      <h4 className="text-label-sm text-on-surface-variant mb-3">
        DATOS DE CAMPANA
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[0.65rem] text-on-surface-variant block mb-1">
            Nombre
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setSlug(generateSlug(e.target.value))
            }}
            className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface text-body-md border border-outline-variant/30 focus:border-brand-primary focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="text-[0.65rem] text-on-surface-variant block mb-1">
            Slug
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface text-body-md border border-outline-variant/30 focus:border-brand-primary focus:outline-none transition-colors font-mono text-xs"
          />
        </div>
        <div>
          <label className="text-[0.65rem] text-on-surface-variant block mb-1">
            Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-10 h-10 rounded-lg border border-outline-variant/30 cursor-pointer p-0.5"
            />
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-surface-container-low text-on-surface text-body-md border border-outline-variant/30 focus:border-brand-primary focus:outline-none transition-colors font-mono text-xs"
              placeholder="#3b82f6"
            />
          </div>
        </div>
        <div>
          <label className="text-[0.65rem] text-on-surface-variant block mb-1">
            Icono (emoji o texto)
          </label>
          <input
            type="text"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface text-body-md border border-outline-variant/30 focus:border-brand-primary focus:outline-none transition-colors"
            placeholder="&#128663;"
          />
        </div>
      </div>
      <div className="mt-3">
        <Button
          size="sm"
          disabled={!name || !slug || updateMutation.isPending}
          onClick={() => updateMutation.mutate()}
        >
          {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Agents assigned to campaign
// ---------------------------------------------------------------------------

function CampaignAgentsSection({ campaignId }: { campaignId: string }) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [addingAgent, setAddingAgent] = useState(false)

  // Fetch assigned agents
  const { data: assignedAgents } = useQuery({
    queryKey: ['campaign-assigned-agents', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_agents')
        .select('agent_id, campaign_id, profiles(id, full_name, role)')
        .eq('campaign_id', campaignId)
      if (error) throw error
      return (data || []) as unknown as CampaignAgentRow[]
    },
  })

  // Fetch all active agents for the add select
  const { data: allAgents } = useQuery({
    queryKey: ['all-active-agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('is_active', true)
        .in('role', ['agente', 'supervisor'])
        .order('full_name')
      if (error) throw error
      return data || []
    },
    enabled: addingAgent,
  })

  const assignedIds = useMemo(
    () => new Set((assignedAgents || []).map((a) => a.agent_id)),
    [assignedAgents],
  )

  const availableAgents = useMemo(
    () => (allAgents || []).filter((a) => !assignedIds.has(a.id)),
    [allAgents, assignedIds],
  )

  const removeMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const { error } = await supabase
        .from('campaign_agents')
        .delete()
        .eq('campaign_id', campaignId)
        .eq('agent_id', agentId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-assigned-agents', campaignId] })
      queryClient.invalidateQueries({ queryKey: ['admin-campaign-agent-counts'] })
      queryClient.invalidateQueries({ queryKey: ['admin-campaign-assignments'] })
    },
  })

  const addMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const { error } = await supabase
        .from('campaign_agents')
        .insert({ campaign_id: campaignId, agent_id: agentId })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-assigned-agents', campaignId] })
      queryClient.invalidateQueries({ queryKey: ['admin-campaign-agent-counts'] })
      queryClient.invalidateQueries({ queryKey: ['admin-campaign-assignments'] })
      setAddingAgent(false)
    },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-label-sm text-on-surface-variant">
          AGENTES ASIGNADOS
        </h4>
        <button
          onClick={() => setAddingAgent(!addingAgent)}
          className="text-xs text-brand-primary hover:underline"
        >
          {addingAgent ? 'Cancelar' : '+ Agregar agente'}
        </button>
      </div>

      {/* Add agent select */}
      <AnimatePresence>
        {addingAgent && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-3"
          >
            <select
              onChange={(e) => {
                if (e.target.value) addMutation.mutate(e.target.value)
              }}
              className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface text-body-md border border-outline-variant/30 focus:border-brand-primary focus:outline-none transition-colors"
              defaultValue=""
            >
              <option value="" disabled>
                Seleccionar agente...
              </option>
              {availableAgents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.full_name} ({a.role})
                </option>
              ))}
            </select>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assigned agent list */}
      <div className="space-y-1.5">
        {(assignedAgents || []).map((row) => (
          <div
            key={row.agent_id}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-container-low"
          >
            <span className="text-body-md text-on-surface">
              {row.profiles?.full_name || 'Agente'}
              <span className="text-on-surface-variant text-xs ml-2">
                ({row.profiles?.role})
              </span>
            </span>
            <button
              onClick={() => removeMutation.mutate(row.agent_id)}
              disabled={removeMutation.isPending}
              className="text-xs text-red-500 hover:text-red-700 transition-colors"
            >
              Remover
            </button>
          </div>
        ))}
        {(!assignedAgents || assignedAgents.length === 0) && (
          <p className="text-xs text-on-surface-variant py-2">
            Sin agentes asignados
          </p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Bases section per campaign
// ---------------------------------------------------------------------------

function CampaignBasesSection({ campaignId }: { campaignId: string }) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [newBaseName, setNewBaseName] = useState('')
  const [editingBase, setEditingBase] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const { data: bases } = useQuery({
    queryKey: ['campaign-bases-admin', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_bases')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('name')
      if (error) throw error
      return (data || []) as CampaignBase[]
    },
  })

  const addBaseMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('campaign_bases')
        .insert({ campaign_id: campaignId, name: newBaseName })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-bases-admin', campaignId] })
      queryClient.invalidateQueries({ queryKey: ['admin-campaign-base-counts'] })
      setNewBaseName('')
    },
  })

  const updateBaseMutation = useMutation({
    mutationFn: async ({ baseId, name }: { baseId: string; name: string }) => {
      const { error } = await supabase
        .from('campaign_bases')
        .update({ name })
        .eq('id', baseId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-bases-admin', campaignId] })
      setEditingBase(null)
    },
  })

  const toggleBaseMutation = useMutation({
    mutationFn: async ({ baseId, isActive }: { baseId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('campaign_bases')
        .update({ is_active: !isActive })
        .eq('id', baseId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-bases-admin', campaignId] })
      queryClient.invalidateQueries({ queryKey: ['admin-campaign-base-counts'] })
    },
  })

  return (
    <div>
      <h4 className="text-label-sm text-on-surface-variant mb-3">
        BASES DE DATOS
      </h4>

      {/* New base input */}
      <div className="flex items-center gap-2 mb-3">
        <input
          type="text"
          value={newBaseName}
          onChange={(e) => setNewBaseName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newBaseName.trim()) addBaseMutation.mutate()
          }}
          className="flex-1 px-3 py-2 rounded-lg bg-surface-container-low text-on-surface text-body-md border border-outline-variant/30 focus:border-brand-primary focus:outline-none transition-colors"
          placeholder="Nombre de nueva base..."
        />
        <Button
          size="sm"
          disabled={!newBaseName.trim() || addBaseMutation.isPending}
          onClick={() => addBaseMutation.mutate()}
        >
          + Base
        </Button>
      </div>

      {/* Base list */}
      <div className="space-y-1.5">
        {(bases || []).map((base) => (
          <div
            key={base.id}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-container-low"
          >
            {editingBase === base.id ? (
              <div className="flex items-center gap-2 flex-1 mr-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && editName.trim()) {
                      updateBaseMutation.mutate({ baseId: base.id, name: editName })
                    }
                    if (e.key === 'Escape') setEditingBase(null)
                  }}
                  className="flex-1 px-2 py-1 rounded bg-surface text-on-surface text-body-md border border-outline-variant/30 focus:border-brand-primary focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={() =>
                    updateBaseMutation.mutate({ baseId: base.id, name: editName })
                  }
                  className="text-xs text-brand-primary hover:underline"
                >
                  OK
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-body-md text-on-surface">{base.name}</span>
                <StatusBadge
                  status={base.is_active ? 'active' : 'inactive'}
                  label={base.is_active ? 'Activa' : 'Inactiva'}
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              {editingBase !== base.id && (
                <button
                  onClick={() => {
                    setEditingBase(base.id)
                    setEditName(base.name)
                  }}
                  className="text-xs text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  Editar
                </button>
              )}
              <button
                onClick={() =>
                  toggleBaseMutation.mutate({
                    baseId: base.id,
                    isActive: !!base.is_active,
                  })
                }
                className={cn(
                  'text-xs transition-colors',
                  base.is_active
                    ? 'text-red-500 hover:text-red-700'
                    : 'text-emerald-500 hover:text-emerald-700',
                )}
              >
                {base.is_active ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        ))}
        {(!bases || bases.length === 0) && (
          <p className="text-xs text-on-surface-variant py-2">
            Sin bases creadas
          </p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Create campaign dialog
// ---------------------------------------------------------------------------

function CreateCampaignDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [icon, setIcon] = useState('')
  const [error, setError] = useState('')

  const resetForm = useCallback(() => {
    setName('')
    setSlug('')
    setColor('#3b82f6')
    setIcon('')
    setError('')
  }, [])

  const generateSlug = useCallback((val: string) => {
    return val
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_-]/g, '')
  }, [])

  const createMutation = useMutation({
    mutationFn: async () => {
      // Validate with Zod
      const input: CampaignInput = { name, slug, color, icon }
      const result = campaignSchema.safeParse(input)
      if (!result.success) {
        throw new Error(result.error.issues[0]?.message || 'Datos invalidos')
      }

      const { error: insertError } = await supabase.from('campaigns').insert({
        organization_id: currentUser?.organization_id || '',
        name: result.data.name,
        slug: result.data.slug,
        color: result.data.color,
        icon: result.data.icon || null,
      })
      if (insertError) throw insertError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['admin-counts'] })
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      resetForm()
      onClose()
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Error al crear campana')
    },
  })

  const handleClose = useCallback(() => {
    resetForm()
    onClose()
  }, [resetForm, onClose])

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            'fixed inset-0 z-50 bg-black/40',
            'transition-opacity duration-200',
            'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
          )}
        />
        <Dialog.Popup
          className={cn(
            'fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'w-full max-w-lg rounded-2xl p-6',
            'glass shadow-ambient',
            'transition-all duration-200',
            'data-[starting-style]:opacity-0 data-[starting-style]:scale-95',
            'data-[ending-style]:opacity-0 data-[ending-style]:scale-95',
          )}
        >
          <Dialog.Title className="text-title-md text-on-surface">
            Nueva Campana
          </Dialog.Title>
          <Dialog.Description className="text-body-md text-on-surface-variant mt-1">
            Configura los datos basicos de la campana.
          </Dialog.Description>

          <div className="space-y-4 mt-5">
            {/* Name */}
            <div>
              <label className="text-label-sm text-on-surface-variant block mb-1.5">
                Nombre
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setSlug(generateSlug(e.target.value))
                }}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface text-body-md border border-outline-variant/30 focus:border-brand-primary focus:outline-none transition-colors"
                placeholder="Autos 2026"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="text-label-sm text-on-surface-variant block mb-1.5">
                Slug (auto-generado)
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface text-body-md border border-outline-variant/30 focus:border-brand-primary focus:outline-none transition-colors font-mono text-xs"
                placeholder="autos_2026"
              />
            </div>

            {/* Color */}
            <div>
              <label className="text-label-sm text-on-surface-variant block mb-1.5">
                Color de campana
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-12 h-10 rounded-lg border border-outline-variant/30 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-surface-container-low text-on-surface text-body-md border border-outline-variant/30 focus:border-brand-primary focus:outline-none transition-colors font-mono text-xs"
                />
                {/* Preview bar */}
                <div
                  className="h-10 w-20 rounded-lg"
                  style={{ backgroundColor: color }}
                />
              </div>
            </div>

            {/* Icon */}
            <div>
              <label className="text-label-sm text-on-surface-variant block mb-1.5">
                Icono (emoji)
              </label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface text-body-md border border-outline-variant/30 focus:border-brand-primary focus:outline-none transition-colors"
                placeholder="&#128663; &#127968; &#128188;"
              />
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6">
            <Dialog.Close
              render={
                <Button variant="ghost" disabled={createMutation.isPending}>
                  Cancelar
                </Button>
              }
            />
            <Button
              disabled={!name || !slug || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? 'Creando...' : 'Crear Campana'}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
