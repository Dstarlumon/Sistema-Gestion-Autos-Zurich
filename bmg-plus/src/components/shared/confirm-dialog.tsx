'use client'

import { Dialog } from '@base-ui/react/dialog'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'default'
  isLoading?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'default',
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
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
            {title}
          </Dialog.Title>
          <Dialog.Description className="text-body-md text-on-surface-variant mt-2">
            {description}
          </Dialog.Description>

          <div className="flex items-center justify-end gap-3 mt-6">
            <Dialog.Close
              render={
                <Button variant="ghost" disabled={isLoading}>
                  {cancelText}
                </Button>
              }
            />
            <Button
              variant={variant === 'danger' ? 'destructive' : 'default'}
              disabled={isLoading}
              onClick={onConfirm}
            >
              {isLoading ? 'Procesando...' : confirmText}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
