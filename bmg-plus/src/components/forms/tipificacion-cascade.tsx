'use client'

import { useMemo, useState, useCallback } from 'react'
import { useTipificaciones } from '@/lib/queries/use-tipificaciones'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface TipificacionCascadeProps {
  campaignId?: string | null
  value?: string // tipificacion_id
  onChange: (tipificacionId: string, rootCategory: string, leafName: string) => void
  error?: string
}

interface TipificacionNode {
  id: string
  name: string
  parent_id: string | null
  level: number
  campaign_id: string | null
  is_active: boolean | null
  sort_order: number | null
  organization_id: string
  created_at: string | null
}

export function TipificacionCascade({
  campaignId,
  value,
  onChange,
  error,
}: TipificacionCascadeProps) {
  const { data: tipificaciones = [], isLoading } = useTipificaciones(campaignId)

  const [localLevel1Id, setLevel1Id] = useState<string | null>(null)
  const [localLevel2Id, setLevel2Id] = useState<string | null>(null)
  const [localLevel3Id, setLevel3Id] = useState<string | null>(null)

  // Build the tree structure from the flat array
  const { roots, childrenMap } = useMemo(() => {
    const roots: TipificacionNode[] = []
    const childrenMap = new Map<string, TipificacionNode[]>()

    for (const item of tipificaciones as TipificacionNode[]) {
      if (!item.parent_id) {
        roots.push(item)
      } else {
        const siblings = childrenMap.get(item.parent_id) || []
        siblings.push(item)
        childrenMap.set(item.parent_id, siblings)
      }
    }

    return { roots, childrenMap }
  }, [tipificaciones])

  // Derive level IDs from the controlled `value` prop (no effect needed)
  const derivedLevels = useMemo(() => {
    if (!value || tipificaciones.length === 0) return null
    const selected = (tipificaciones as TipificacionNode[]).find((t) => t.id === value)
    if (!selected) return null

    if (selected.level === 1) {
      return { l1: selected.id, l2: null, l3: null }
    } else if (selected.level === 2) {
      return { l1: selected.parent_id, l2: selected.id, l3: null }
    } else if (selected.level === 3) {
      const parent = (tipificaciones as TipificacionNode[]).find(
        (t) => t.id === selected.parent_id
      )
      return { l1: parent?.parent_id ?? null, l2: selected.parent_id, l3: selected.id }
    }
    return null
  }, [value, tipificaciones])

  // Use derived levels when a controlled value is set, otherwise use local state
  const level1Id = derivedLevels?.l1 ?? localLevel1Id
  const level2Id = derivedLevels?.l2 ?? localLevel2Id
  const level3Id = derivedLevels?.l3 ?? localLevel3Id

  // Level 2 options based on level1 selection
  const level2Options = useMemo(() => {
    if (!level1Id) return []
    return childrenMap.get(level1Id) || []
  }, [level1Id, childrenMap])

  // Level 3 options based on level2 selection
  const level3Options = useMemo(() => {
    if (!level2Id) return []
    return childrenMap.get(level2Id) || []
  }, [level2Id, childrenMap])

  // Get the root category name for the current selection
  const getRootCategoryName = useCallback(
    (rootId: string | null): string => {
      if (!rootId) return ''
      const root = (tipificaciones as TipificacionNode[]).find(
        (t) => t.id === rootId
      )
      return root?.name ?? ''
    },
    [tipificaciones]
  )

  // Get any node's name by ID
  const getNodeName = useCallback(
    (nodeId: string | null): string => {
      if (!nodeId) return ''
      const node = (tipificaciones as TipificacionNode[]).find(
        (t) => t.id === nodeId
      )
      return node?.name ?? ''
    },
    [tipificaciones]
  )

  // Emit the deepest selected ID
  const emitChange = useCallback(
    (l1: string | null, l2: string | null, l3: string | null) => {
      const deepest = l3 || l2 || l1
      if (deepest) {
        const rootId = l1
        onChange(deepest, getRootCategoryName(rootId), getNodeName(deepest))
      }
    },
    [onChange, getRootCategoryName, getNodeName]
  )

  const handleLevel1Change = useCallback(
    (newValue: string | null) => {
      if (!newValue) return
      setLevel1Id(newValue)
      setLevel2Id(null)
      setLevel3Id(null)
      // If this root has no children, emit it directly
      const children = childrenMap.get(newValue) || []
      if (children.length === 0) {
        const rootName = getRootCategoryName(newValue)
        const leafName = getNodeName(newValue)
        onChange(newValue, rootName, leafName)
      }
    },
    [childrenMap, onChange, getRootCategoryName, getNodeName]
  )

  const handleLevel2Change = useCallback(
    (newValue: string | null) => {
      if (!newValue) return
      setLevel2Id(newValue)
      setLevel3Id(null)
      // If this item has no children, emit it
      const children = childrenMap.get(newValue) || []
      if (children.length === 0) {
        emitChange(level1Id, newValue, null)
      }
    },
    [childrenMap, emitChange, level1Id]
  )

  const handleLevel3Change = useCallback(
    (newValue: string | null) => {
      if (!newValue) return
      setLevel3Id(newValue)
      emitChange(level1Id, level2Id, newValue)
    },
    [emitChange, level1Id, level2Id]
  )

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-8 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Level 1 */}
      <div className="space-y-1.5">
        <Label>Categoria</Label>
        <Select value={level1Id} onValueChange={handleLevel1Change}>
          <SelectTrigger
            className={cn('w-full', error && !level1Id && 'border-destructive')}
          >
            <SelectValue placeholder="Selecciona categoria" />
          </SelectTrigger>
          <SelectContent>
            {roots.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Level 2 */}
      {level1Id && level2Options.length > 0 && (
        <div className="space-y-1.5">
          <Label>Subcategoria</Label>
          <Select value={level2Id} onValueChange={handleLevel2Change}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona subcategoria" />
            </SelectTrigger>
            <SelectContent>
              {level2Options.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Level 3 */}
      {level2Id && level3Options.length > 0 && (
        <div className="space-y-1.5">
          <Label>Detalle</Label>
          <Select value={level3Id} onValueChange={handleLevel3Change}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona detalle" />
            </SelectTrigger>
            <SelectContent>
              {level3Options.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
