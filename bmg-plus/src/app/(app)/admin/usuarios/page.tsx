'use client'

import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import { Dialog } from '@base-ui/react/dialog'
import { createClient } from '@/lib/supabase/client'
import { createUser as createUserAction } from './actions'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable, type Column } from '@/components/tables/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { useRole } from '@/hooks/use-role'
import { useCampaigns } from '@/lib/queries/use-campaigns'
import { getInitials } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import { ROLES } from '@/lib/utils/constants'
import type { Role } from '@/lib/utils/constants'
import { createUserSchema } from '@/lib/validations/user.schema'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Profile {
  id: string
  full_name: string
  phone: string | null
  avatar_url: string | null
  role: Role
  status: string
  is_active: boolean | null
  organization_id: string
  created_at: string | null
  updated_at: string | null
}

interface CampaignAgent {
  campaign_id: string
  campaigns: { name: string; color: string | null } | null
}

// ---------------------------------------------------------------------------
// Usuarios page — User CRUD
// ---------------------------------------------------------------------------

export default function UsuariosPage() {
  const { canAdmin } = useRole()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [deactivatingUser, setDeactivatingUser] = useState<Profile | null>(null)
  const [assigningUser, setAssigningUser] = useState<Profile | null>(null)

  if (!canAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="text-4xl">&#128274;</div>
          <h2 className="text-title-md text-on-surface">No tienes acceso</h2>
          <p className="text-body-md text-on-surface-variant">
            Solo los coordinadores pueden gestionar usuarios.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Gestion de Usuarios" subtitle="Administra perfiles, roles y asignaciones">
        <Button onClick={() => setShowCreateDialog(true)}>+ Nuevo Usuario</Button>
      </PageHeader>

      <div className="bg-surface-container-lowest rounded-xl shadow-ambient overflow-hidden">
        <UsersTable
          onEdit={setEditingUser}
          onDeactivate={setDeactivatingUser}
          onAssign={setAssigningUser}
        />
      </div>

      {/* Create user dialog */}
      <CreateUserDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />

      {/* Edit user dialog */}
      <EditUserDialog
        user={editingUser}
        onClose={() => setEditingUser(null)}
      />

      {/* Deactivate confirm */}
      <DeactivateDialog
        user={deactivatingUser}
        onClose={() => setDeactivatingUser(null)}
      />

      {/* Campaign assignment dialog */}
      <CampaignAssignDialog
        user={assigningUser}
        onClose={() => setAssigningUser(null)}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Users table
// ---------------------------------------------------------------------------

function UsersTable({
  onEdit,
  onDeactivate,
  onAssign,
}: {
  onEdit: (u: Profile) => void
  onDeactivate: (u: Profile) => void
  onAssign: (u: Profile) => void
}) {
  const supabase = createClient()

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name')
      if (error) throw error
      return (data || []) as Profile[]
    },
  })

  // Fetch campaign assignments for all users
  const { data: assignments } = useQuery({
    queryKey: ['admin-campaign-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_agents')
        .select('agent_id, campaign_id, campaigns(name, color)')
      if (error) throw error
      return (data || []) as unknown as (CampaignAgent & { agent_id: string })[]
    },
  })

  const assignmentMap = useMemo(() => {
    const map = new Map<string, CampaignAgent[]>()
    if (assignments) {
      for (const a of assignments) {
        const list = map.get(a.agent_id) || []
        list.push(a)
        map.set(a.agent_id, list)
      }
    }
    return map
  }, [assignments])

  const columns: Column<Profile>[] = useMemo(
    () => [
      {
        key: 'avatar',
        header: '',
        className: 'w-12',
        render: (row) => (
          <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center">
            <span className="text-[0.6rem] font-semibold text-on-surface">
              {getInitials(row.full_name)}
            </span>
          </div>
        ),
      },
      {
        key: 'full_name',
        header: 'Nombre',
        sortable: true,
        render: (row) => (
          <span className="font-medium text-on-surface">{row.full_name}</span>
        ),
      },
      {
        key: 'role',
        header: 'Rol',
        render: (row) => {
          const roleStyles: Record<string, string> = {
            coordinador: 'bg-purple-100 text-purple-800',
            supervisor: 'bg-blue-100 text-blue-800',
            agente: 'bg-emerald-100 text-emerald-800',
          }
          return (
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-[0.65rem] font-semibold capitalize',
                roleStyles[row.role] || 'bg-slate-100 text-slate-600',
              )}
            >
              {row.role}
            </span>
          )
        },
      },
      {
        key: 'is_active',
        header: 'Estado',
        render: (row) => (
          <StatusBadge
            status={row.is_active ? 'active' : 'inactive'}
            label={row.is_active ? 'Activo' : 'Inactivo'}
          />
        ),
      },
      {
        key: 'campaigns',
        header: 'Campanas',
        render: (row) => {
          const userAssignments = assignmentMap.get(row.id) || []
          if (userAssignments.length === 0) {
            return <span className="text-on-surface-variant text-xs">Sin asignar</span>
          }
          return (
            <div className="flex flex-wrap gap-1">
              {userAssignments.map((a) => (
                <span
                  key={a.campaign_id}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.6rem] font-medium bg-surface-container text-on-surface"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: a.campaigns?.color || '#6b7280' }}
                  />
                  {a.campaigns?.name || 'Campana'}
                </span>
              ))}
            </div>
          )
        },
      },
      {
        key: 'actions',
        header: 'Acciones',
        className: 'w-52',
        render: (row) => (
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(row) }}
              className="px-2 py-1 text-xs rounded-md hover:bg-surface-container text-on-surface-variant transition-colors"
            >
              Editar
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onAssign(row) }}
              className="px-2 py-1 text-xs rounded-md hover:bg-surface-container text-brand-primary transition-colors"
            >
              Campanas
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDeactivate(row) }}
              className={cn(
                'px-2 py-1 text-xs rounded-md transition-colors',
                row.is_active
                  ? 'hover:bg-red-50 text-red-600'
                  : 'hover:bg-emerald-50 text-emerald-600',
              )}
            >
              {row.is_active ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        ),
      },
    ],
    [assignmentMap, onEdit, onDeactivate, onAssign],
  )

  return (
    <DataTable
      columns={columns as unknown as Column<Record<string, unknown>>[]}
      data={(profiles || []) as unknown as Record<string, unknown>[]}
      isLoading={isLoading}
      emptyMessage="No hay usuarios registrados."
    />
  )
}

// ---------------------------------------------------------------------------
// Create user dialog
// ---------------------------------------------------------------------------

function CreateUserDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('agente')
  const [error, setError] = useState('')

  const resetForm = useCallback(() => {
    setNombre('')
    setEmail('')
    setPassword('')
    setRole('agente')
    setError('')
  }, [])

  const createMutation = useMutation({
    mutationFn: async () => {
      // Validate input with Zod before calling the server action
      const parsed = createUserSchema.safeParse({
        full_name: nombre,
        email,
        password,
        role,
      })
      if (!parsed.success) {
        const firstError = parsed.error.issues[0]?.message || 'Datos invalidos'
        throw new Error(firstError)
      }

      // Use server action to create user via admin client
      // This avoids breaking the coordinator's session
      const result = await createUserAction({
        email: parsed.data.email,
        password: parsed.data.password,
        full_name: parsed.data.full_name,
        role: parsed.data.role,
      })
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] })
      queryClient.invalidateQueries({ queryKey: ['admin-counts'] })
      resetForm()
      onClose()
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Error al crear usuario')
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
            Nuevo Usuario
          </Dialog.Title>
          <Dialog.Description className="text-body-md text-on-surface-variant mt-1">
            El usuario recibira un correo de confirmacion para activar su cuenta.
          </Dialog.Description>

          <div className="space-y-4 mt-5">
            {/* Nombre */}
            <div>
              <label className="text-label-sm text-on-surface-variant block mb-1.5">
                Nombre completo
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface text-body-md border border-outline-variant/30 focus:border-brand-primary focus:outline-none transition-colors"
                placeholder="Juan Perez"
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-label-sm text-on-surface-variant block mb-1.5">
                Correo electronico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface text-body-md border border-outline-variant/30 focus:border-brand-primary focus:outline-none transition-colors"
                placeholder="usuario@empresa.com"
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-label-sm text-on-surface-variant block mb-1.5">
                Contrasena temporal
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface text-body-md border border-outline-variant/30 focus:border-brand-primary focus:outline-none transition-colors"
                placeholder="Minimo 6 caracteres"
              />
            </div>

            {/* Rol */}
            <div>
              <label className="text-label-sm text-on-surface-variant block mb-1.5">
                Rol
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface text-body-md border border-outline-variant/30 focus:border-brand-primary focus:outline-none transition-colors"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
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
              disabled={!nombre || !email || !password || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? 'Creando...' : 'Crear Usuario'}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ---------------------------------------------------------------------------
// Edit user dialog (role change + name)
// ---------------------------------------------------------------------------

function EditUserDialog({
  user,
  onClose,
}: {
  user: Profile | null
  onClose: () => void
}) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const [nombre, setNombre] = useState('')
  const [role, setRole] = useState<Role>('agente')
  const [phone, setPhone] = useState('')

  // Sync state when user changes
  const open = user !== null
  const currentUser = user

  // Reset form when user changes
  useMemo(() => {
    if (currentUser) {
      setNombre(currentUser.full_name)
      setRole(currentUser.role)
      setPhone(currentUser.phone || '')
    }
  }, [currentUser])

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser) return
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: nombre,
          role,
          phone: phone || null,
        })
        .eq('id', currentUser.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] })
      onClose()
    },
  })

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => { if (!isOpen) onClose() }}
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
            Editar Usuario
          </Dialog.Title>
          <Dialog.Description className="text-body-md text-on-surface-variant mt-1">
            Modifica el nombre, rol o telefono del usuario.
          </Dialog.Description>

          <div className="space-y-4 mt-5">
            <div>
              <label className="text-label-sm text-on-surface-variant block mb-1.5">
                Nombre completo
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface text-body-md border border-outline-variant/30 focus:border-brand-primary focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="text-label-sm text-on-surface-variant block mb-1.5">
                Telefono
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface text-body-md border border-outline-variant/30 focus:border-brand-primary focus:outline-none transition-colors"
                placeholder="3001234567"
              />
            </div>

            <div>
              <label className="text-label-sm text-on-surface-variant block mb-1.5">
                Rol
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface text-body-md border border-outline-variant/30 focus:border-brand-primary focus:outline-none transition-colors"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6">
            <Dialog.Close
              render={
                <Button variant="ghost" disabled={updateMutation.isPending}>
                  Cancelar
                </Button>
              }
            />
            <Button
              disabled={!nombre || updateMutation.isPending}
              onClick={() => updateMutation.mutate()}
            >
              {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ---------------------------------------------------------------------------
// Deactivate / Activate user
// ---------------------------------------------------------------------------

function DeactivateDialog({
  user,
  onClose,
}: {
  user: Profile | null
  onClose: () => void
}) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const toggleMutation = useMutation({
    mutationFn: async () => {
      if (!user) return
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !user.is_active })
        .eq('id', user.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] })
      queryClient.invalidateQueries({ queryKey: ['admin-counts'] })
      onClose()
    },
  })

  const isActivating = user ? !user.is_active : false

  return (
    <ConfirmDialog
      open={user !== null}
      onClose={onClose}
      onConfirm={() => toggleMutation.mutate()}
      title={isActivating ? 'Activar usuario' : 'Desactivar usuario'}
      description={
        isActivating
          ? `Se activara la cuenta de ${user?.full_name}. Podra acceder nuevamente al sistema.`
          : `Se desactivara la cuenta de ${user?.full_name}. No podra acceder al sistema hasta que se reactive.`
      }
      confirmText={isActivating ? 'Activar' : 'Desactivar'}
      variant={isActivating ? 'default' : 'danger'}
      isLoading={toggleMutation.isPending}
    />
  )
}

// ---------------------------------------------------------------------------
// Campaign assignment dialog
// ---------------------------------------------------------------------------

function CampaignAssignDialog({
  user,
  onClose,
}: {
  user: Profile | null
  onClose: () => void
}) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { data: campaigns } = useCampaigns()

  // Fetch current assignments for this user
  const { data: userAssignments } = useQuery({
    queryKey: ['user-campaign-assignments', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from('campaign_agents')
        .select('campaign_id')
        .eq('agent_id', user.id)
      if (error) throw error
      return (data || []).map((d) => d.campaign_id)
    },
    enabled: !!user,
  })

  const assignedSet = useMemo(
    () => new Set(userAssignments || []),
    [userAssignments],
  )

  const toggleCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      if (!user) return
      if (assignedSet.has(campaignId)) {
        const { error } = await supabase
          .from('campaign_agents')
          .delete()
          .eq('agent_id', user.id)
          .eq('campaign_id', campaignId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('campaign_agents')
          .insert({ agent_id: user.id, campaign_id: campaignId })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-campaign-assignments', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['admin-campaign-assignments'] })
    },
  })

  return (
    <Dialog.Root
      open={user !== null}
      onOpenChange={(isOpen) => { if (!isOpen) onClose() }}
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
            'w-full max-w-md rounded-2xl p-6',
            'glass shadow-ambient',
            'transition-all duration-200',
            'data-[starting-style]:opacity-0 data-[starting-style]:scale-95',
            'data-[ending-style]:opacity-0 data-[ending-style]:scale-95',
          )}
        >
          <Dialog.Title className="text-title-md text-on-surface">
            Asignar Campanas
          </Dialog.Title>
          <Dialog.Description className="text-body-md text-on-surface-variant mt-1">
            Selecciona las campanas para{' '}
            <span className="font-semibold">{user?.full_name}</span>
          </Dialog.Description>

          <div className="space-y-2 mt-5 max-h-72 overflow-y-auto">
            {(campaigns || []).map((campaign) => {
              const isAssigned = assignedSet.has(campaign.id)
              return (
                <button
                  key={campaign.id}
                  onClick={() => toggleCampaign.mutate(campaign.id)}
                  disabled={toggleCampaign.isPending}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left',
                    isAssigned
                      ? 'bg-brand-primary/10 border border-brand-primary/30'
                      : 'bg-surface-container-low hover:bg-surface-container border border-transparent',
                  )}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: campaign.color || '#6b7280' }}
                  />
                  <span className="text-body-md text-on-surface flex-1">
                    {campaign.name}
                  </span>
                  {isAssigned && (
                    <span className="text-xs text-brand-primary font-semibold">
                      Asignado
                    </span>
                  )}
                </button>
              )
            })}
            {(!campaigns || campaigns.length === 0) && (
              <p className="text-body-md text-on-surface-variant text-center py-4">
                No hay campanas disponibles
              </p>
            )}
          </div>

          <div className="flex items-center justify-end mt-6">
            <Dialog.Close
              render={<Button variant="ghost">Cerrar</Button>}
            />
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
