'use client'

interface TableFiltersProps {
  children: React.ReactNode
  onReset?: () => void
}

export function TableFilters({ children, onReset }: TableFiltersProps) {
  return (
    <div className="flex gap-3 flex-wrap items-end mb-4 p-4 bg-surface-container-low rounded-xl">
      {children}
      {onReset && (
        <button
          onClick={onReset}
          className="text-xs text-on-surface-variant hover:text-on-surface transition-colors"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  )
}
