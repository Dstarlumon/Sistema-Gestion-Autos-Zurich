'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/shared/page-header'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useRole } from '@/hooks/use-role'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TipificacionNode {
  id: string
  organization_id: string
  campaign_id: string | null
  parent_id: string | null
  name: string
  level: number
  sort_order: number | null
  is_active: boolean | null
  created_at: string | null
}

interface TreeNode extends TipificacionNode {
  children: TreeNode[]
}

// ---------------------------------------------------------------------------
// Tipificaciones page — Tree Editor
// ---------------------------------------------------------------------------

export default function TipificacionesPage() {
  const { canAdmin } = useRole()

  if (!canAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="text-4xl">&#128274;</div>
          <h2 className="text-title-md text-on-surface">No tienes acceso</h2>
          <p className="text-body-md text-on-surface-variant">
            Solo los coordinadores pueden editar tipificaciones.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Arbol de Tipificaciones"
        subtitle="Gestiona la estructura jerarquica de tipificaciones (hasta 3 niveles)"
      />
      <TipificacionTree />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tree component
// ---------------------------------------------------------------------------

function TipificacionTree() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)
  const [addingRoot, setAddingRoot] = useState(false)
  const [newRootName, setNewRootName] = useState('')

  // Fetch ALL tipificaciones (not just active ones, for admin view)
  const { data: nodes, isLoading } = useQuery({
    queryKey: ['admin-tipificaciones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tipificacion_tree')
        .select('*')
        .order('sort_order')
        .order('name')
      if (error) throw error
      return (data || []) as TipificacionNode[]
    },
  })

  // Build tree structure
  const tree = useMemo(() => {
    if (!nodes) return []
    const nodeMap = new Map<string, TreeNode>()
    const roots: TreeNode[] = []

    // Create tree nodes
    for (const node of nodes) {
      nodeMap.set(node.id, { ...node, children: [] })
    }

    // Build hierarchy
    for (const node of nodes) {
      const treeNode = nodeMap.get(node.id)!
      if (node.parent_id && nodeMap.has(node.parent_id)) {
        nodeMap.get(node.parent_id)!.children.push(treeNode)
      } else if (!node.parent_id) {
        roots.push(treeNode)
      }
    }

    return roots
  }, [nodes])

  // Add root node mutation
  const addRootMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('tipificacion_tree').insert({
        organization_id: currentUser?.organization_id || '',
        name: newRootName,
        level: 1,
        sort_order: (tree.length + 1) * 10,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tipificaciones'] })
      queryClient.invalidateQueries({ queryKey: ['admin-counts'] })
      setNewRootName('')
      setAddingRoot(false)
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Add root node */}
      <div className="mb-4">
        {addingRoot ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={newRootName}
              onChange={(e) => setNewRootName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newRootName.trim()) addRootMutation.mutate()
                if (e.key === 'Escape') { setAddingRoot(false); setNewRootName('') }
              }}
              className="flex-1 max-w-md px-3 py-2 rounded-lg bg-surface-container-low text-on-surface text-body-md border border-outline-variant/30 focus:border-brand-primary focus:outline-none transition-colors"
              placeholder="Nombre del nodo raiz (ej: NO CONTACTO)"
              autoFocus
            />
            <Button
              size="sm"
              disabled={!newRootName.trim() || addRootMutation.isPending}
              onClick={() => addRootMutation.mutate()}
            >
              Crear
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setAddingRoot(false); setNewRootName('') }}
            >
              Cancelar
            </Button>
          </motion.div>
        ) : (
          <Button onClick={() => setAddingRoot(true)} variant="outline">
            + Agregar nodo raiz (Nivel 1)
          </Button>
        )}
      </div>

      {/* Tree */}
      {tree.length === 0 && (
        <div className="text-center py-16 text-on-surface-variant text-body-md">
          No hay tipificaciones creadas. Agrega el primer nodo raiz.
        </div>
      )}

      {tree.map((node, i) => (
        <motion.div
          key={node.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
        >
          <TreeNodeItem node={node} depth={0} />
        </motion.div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tree node item (recursive)
// ---------------------------------------------------------------------------

function TreeNodeItem({ node, depth }: { node: TreeNode; depth: number }) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)

  const [expanded, setExpanded] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(node.name)
  const [addingChild, setAddingChild] = useState(false)
  const [childName, setChildName] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const hasChildren = node.children.length > 0
  const canAddChild = node.level < 3 // max 3 levels
  const canDelete = !hasChildren // can only delete leaf nodes

  // Level styling
  const levelStyles = {
    0: 'bg-surface-container-lowest shadow-ambient rounded-xl',
    1: 'bg-surface-container-low rounded-lg ml-6',
    2: 'bg-surface-container rounded-lg ml-6',
  }
  const levelTextStyles = {
    0: 'font-bold text-on-surface',
    1: 'font-medium text-on-surface',
    2: 'font-normal text-on-surface-variant',
  }
  const levelBadgeStyles = {
    1: 'bg-blue-100 text-blue-800',
    2: 'bg-amber-100 text-amber-800',
    3: 'bg-slate-100 text-slate-600',
  }

  // Rename mutation
  const renameMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('tipificacion_tree')
        .update({ name: editName })
        .eq('id', node.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tipificaciones'] })
      setEditing(false)
    },
  })

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('tipificacion_tree')
        .update({ is_active: !node.is_active })
        .eq('id', node.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tipificaciones'] })
      queryClient.invalidateQueries({ queryKey: ['admin-counts'] })
    },
  })

  // Add child mutation
  const addChildMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('tipificacion_tree').insert({
        organization_id: currentUser?.organization_id || '',
        parent_id: node.id,
        campaign_id: node.campaign_id,
        name: childName,
        level: node.level + 1,
        sort_order: (node.children.length + 1) * 10,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tipificaciones'] })
      queryClient.invalidateQueries({ queryKey: ['admin-counts'] })
      setChildName('')
      setAddingChild(false)
      setExpanded(true)
    },
  })

  // Delete mutation (soft delete: set is_active=false)
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('tipificacion_tree')
        .update({ is_active: false })
        .eq('id', node.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tipificaciones'] })
      queryClient.invalidateQueries({ queryKey: ['admin-counts'] })
      setDeleteDialogOpen(false)
    },
  })

  return (
    <div className={cn('transition-colors', levelStyles[depth as keyof typeof levelStyles] || '')}>
      {/* Node header */}
      <div className="flex items-center gap-2 px-4 py-3">
        {/* Expand/collapse */}
        {hasChildren || canAddChild ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-container transition-colors shrink-0"
          >
            <span
              className={cn(
                'text-on-surface-variant text-sm transition-transform duration-200',
                expanded && 'rotate-90',
              )}
            >
              &#9654;
            </span>
          </button>
        ) : (
          <div className="w-6 h-6 shrink-0" />
        )}

        {/* Level badge */}
        <span
          className={cn(
            'inline-flex items-center px-1.5 py-0.5 rounded text-[0.6rem] font-semibold shrink-0',
            levelBadgeStyles[node.level as keyof typeof levelBadgeStyles] || 'bg-slate-100 text-slate-600',
          )}
        >
          N{node.level}
        </span>

        {/* Name (editable) */}
        {editing ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && editName.trim()) renameMutation.mutate()
                if (e.key === 'Escape') { setEditing(false); setEditName(node.name) }
              }}
              className="flex-1 px-2 py-1 rounded bg-surface text-on-surface text-body-md border border-outline-variant/30 focus:border-brand-primary focus:outline-none"
              autoFocus
            />
            <button
              onClick={() => renameMutation.mutate()}
              className="text-xs text-brand-primary hover:underline"
            >
              OK
            </button>
            <button
              onClick={() => { setEditing(false); setEditName(node.name) }}
              className="text-xs text-on-surface-variant hover:underline"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <span
            className={cn(
              'text-body-md flex-1',
              levelTextStyles[depth as keyof typeof levelTextStyles] || 'text-on-surface',
              !node.is_active && 'opacity-40 line-through',
            )}
          >
            {node.name}
          </span>
        )}

        {/* Active/inactive indicator */}
        {!editing && (
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Toggle active */}
            <button
              onClick={() => toggleActiveMutation.mutate()}
              disabled={toggleActiveMutation.isPending}
              className={cn(
                'relative w-8 h-4.5 rounded-full transition-colors',
                node.is_active ? 'bg-emerald-500' : 'bg-slate-300',
              )}
              title={node.is_active ? 'Desactivar' : 'Activar'}
            >
              <span
                className={cn(
                  'absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform shadow-sm',
                  node.is_active ? 'translate-x-4' : 'translate-x-0.5',
                )}
              />
            </button>

            {/* Edit */}
            <button
              onClick={() => { setEditing(true); setEditName(node.name) }}
              className="px-2 py-1 text-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded transition-colors"
            >
              Editar
            </button>

            {/* Add child */}
            {canAddChild && (
              <button
                onClick={() => { setAddingChild(true); setExpanded(true) }}
                className="px-2 py-1 text-xs text-brand-primary hover:bg-brand-primary/10 rounded transition-colors"
              >
                + Hijo
              </button>
            )}

            {/* Delete (only for leaf nodes) */}
            {canDelete && (
              <button
                onClick={() => setDeleteDialogOpen(true)}
                className="px-2 py-1 text-xs text-red-500 hover:bg-red-500/10 rounded transition-colors"
              >
                Eliminar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Eliminar tipificacion"
        description={`Se desactivara "${node.name}". Los registros existentes no se veran afectados.`}
        confirmText="Eliminar"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />

      {/* Children */}
      <AnimatePresence>
        {expanded && (hasChildren || addingChild) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden pb-2 px-2"
          >
            {/* Add child input */}
            {addingChild && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 ml-6 mb-2 mt-1"
              >
                <span
                  className={cn(
                    'inline-flex items-center px-1.5 py-0.5 rounded text-[0.6rem] font-semibold shrink-0',
                    levelBadgeStyles[(node.level + 1) as keyof typeof levelBadgeStyles] || 'bg-slate-100 text-slate-600',
                  )}
                >
                  N{node.level + 1}
                </span>
                <input
                  type="text"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && childName.trim()) addChildMutation.mutate()
                    if (e.key === 'Escape') { setAddingChild(false); setChildName('') }
                  }}
                  className="flex-1 max-w-sm px-2 py-1.5 rounded-lg bg-surface-container-low text-on-surface text-body-md border border-outline-variant/30 focus:border-brand-primary focus:outline-none transition-colors"
                  placeholder="Nombre del nodo hijo..."
                  autoFocus
                />
                <Button
                  size="xs"
                  disabled={!childName.trim() || addChildMutation.isPending}
                  onClick={() => addChildMutation.mutate()}
                >
                  Crear
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => { setAddingChild(false); setChildName('') }}
                >
                  Cancelar
                </Button>
              </motion.div>
            )}

            {/* Child nodes */}
            {node.children.map((child) => (
              <TreeNodeItem key={child.id} node={child} depth={depth + 1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
