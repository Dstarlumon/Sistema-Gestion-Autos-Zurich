'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyStateAnimation } from '@/components/lottie/animations'

const MotionTableRow = motion.create(TableRow)

export interface Column<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  isLoading?: boolean
  emptyMessage?: string
  onRowClick?: (row: T) => void
  page?: number
  pageSize?: number
  totalCount?: number
  onPageChange?: (page: number) => void
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  onSort?: (key: string) => void
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <TableRow>
      {Array.from({ length: cols }).map((_, i) => (
        <TableCell key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-surface-container animate-pulse" />
        </TableCell>
      ))}
    </TableRow>
  )
}

function SortIndicator({
  active,
  direction,
}: {
  active: boolean
  direction?: 'asc' | 'desc'
}) {
  if (!active) {
    return (
      <span className="text-on-surface-variant/40 ml-1 select-none">
        {'\u2195'}
      </span>
    )
  }
  return (
    <span className="text-brand-primary ml-1 select-none">
      {direction === 'asc' ? '\u2191' : '\u2193'}
    </span>
  )
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No hay datos disponibles.',
  onRowClick,
  page = 1,
  pageSize = 10,
  totalCount,
  onPageChange,
  sortBy,
  sortDir,
  onSort,
}: DataTableProps<T>) {
  const totalPages =
    totalCount != null ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1
  const showPagination = totalCount != null && onPageChange != null

  // Track previous row IDs to detect newly-added rows.
  // Uses "adjusting state during render" pattern: compare previous vs current
  // data during render itself, which avoids reading refs during render.
  const [prevIds, setPrevIds] = useState<Set<string | number>>(new Set())
  const currentIds = useMemo(
    () => new Set(data.map((row, i) => (row.id as string | number) ?? i)),
    [data],
  )

  let newRowIds = new Set<string | number>()
  if (currentIds !== prevIds) {
    const ids = new Set<string | number>()
    currentIds.forEach((id) => {
      if (prevIds.size > 0 && !prevIds.has(id)) ids.add(id)
    })
    newRowIds = ids
    setPrevIds(currentIds)
  }

  // Stable key for crossfade when dataset changes (filter/sort)
  const dataKey = data.map((d) => (d as Record<string, unknown>).id ?? '').join(',')

  return (
    <div className="w-full">
      {/* Table */}
      <Table className="min-w-150">
        {/* Header */}
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  'text-left px-4 py-3 text-label-sm text-on-surface-variant',
                  col.sortable && 'cursor-pointer select-none',
                  col.className,
                )}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                <span className="inline-flex items-center">
                  {col.header}
                  {col.sortable && (
                    <SortIndicator
                      active={sortBy === col.key}
                      direction={sortBy === col.key ? sortDir : undefined}
                    />
                  )}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        {/* Body with crossfade on data change */}
        <AnimatePresence mode="wait">
          <TableBody key={dataKey}>
            {/* Loading skeleton */}
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <SkeletonRow key={`skeleton-${i}`} cols={columns.length} />
              ))}

            {/* Empty state */}
            {!isLoading && data.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <EmptyStateAnimation message={emptyMessage} />
                </TableCell>
              </TableRow>
            )}

            {/* Data rows */}
            {!isLoading &&
              data.map((row, rowIndex) => {
                const rowId = (row.id as string | number) ?? rowIndex
                const isNewRow = newRowIds.has(rowId)

                return (
                  <MotionTableRow
                    key={rowId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.2,
                      delay: rowIndex * 0.02,
                      ease: 'easeOut',
                    }}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      'transition-colors duration-500',
                      'hover:bg-surface-container-low',
                      onRowClick && 'cursor-pointer',
                      isNewRow && 'bg-emerald-50/70',
                    )}
                  >
                    {columns.map((col) => (
                      <TableCell
                        key={col.key}
                        className={cn(
                          'px-4 py-3 text-body-md text-on-surface',
                          col.className,
                        )}
                      >
                        {col.render
                          ? col.render(row)
                          : (row[col.key] as React.ReactNode) ?? '\u2014'}
                      </TableCell>
                    ))}
                  </MotionTableRow>
                )
              })}
          </TableBody>
        </AnimatePresence>
      </Table>

      {/* Pagination */}
      {showPagination && (
        <div className="flex items-center justify-between px-4 pt-4 mt-2">
          <span className="text-xs text-on-surface-variant">
            Mostrando {Math.min((page - 1) * pageSize + 1, totalCount ?? 0)}
            {' \u2013 '}
            {Math.min(page * pageSize, totalCount ?? 0)} de {totalCount}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
              className={cn(
                'px-3 py-1.5 text-xs rounded-lg transition-colors',
                'bg-surface-container-low text-on-surface',
                'hover:bg-surface-container',
                'disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              Anterior
            </button>
            <span className="text-xs text-on-surface-variant tabular-nums">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}
              className={cn(
                'px-3 py-1.5 text-xs rounded-lg transition-colors',
                'bg-surface-container-low text-on-surface',
                'hover:bg-surface-container',
                'disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
