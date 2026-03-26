'use client'

import { motion } from 'motion/react'

// Loading spinner with animated dots
export function LoadingAnimation({ size = 120 }: { size?: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3" style={{ width: size, height: size }}>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-3 h-3 rounded-full bg-primary"
            animate={{ y: [0, -12, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
      <p className="text-label-sm text-on-surface-variant">Cargando...</p>
    </div>
  )
}

// Success checkmark animation
export function SuccessAnimation({ size = 80, message = 'Guardado exitosamente' }: { size?: number, message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="rounded-full bg-emerald-100 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <motion.svg
          viewBox="0 0 24 24"
          className="text-emerald-600"
          style={{ width: size * 0.5, height: size * 0.5 }}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <motion.path
            d="M5 13l4 4L19 7"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          />
        </motion.svg>
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-body-md text-emerald-700 font-medium"
      >
        {message}
      </motion.p>
    </div>
  )
}

// Empty state illustration
export function EmptyStateAnimation({ message = 'No hay datos', action }: { message?: string, action?: { label: string, onClick: () => void } }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-24 h-24 rounded-2xl bg-surface-container flex items-center justify-center"
      >
        <motion.svg
          viewBox="0 0 48 48"
          className="w-12 h-12 text-on-surface-variant"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <rect x="8" y="12" width="32" height="24" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M8 20h32" stroke="currentColor" strokeWidth="2" />
          <circle cx="24" cy="30" r="2" fill="currentColor" opacity="0.4" />
        </motion.svg>
      </motion.div>
      <p className="text-body-md text-on-surface-variant">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="text-sm font-medium text-primary hover:underline"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

// Error state
export function ErrorAnimation({ message = 'Algo salio mal', onRetry }: { message?: string, onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center"
      >
        <motion.svg
          viewBox="0 0 24 24"
          className="w-10 h-10 text-red-500"
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <path
            d="M12 2L2 22h20L12 2z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="17" r="1" fill="currentColor" />
        </motion.svg>
      </motion.div>
      <p className="text-body-md text-red-600">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm font-medium text-primary hover:underline">
          Reintentar
        </button>
      )}
    </div>
  )
}

// Celebration (first sale, goal reached)
export function CelebrationAnimation() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
    >
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{ background: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][i % 5] }}
          initial={{
            x: 0, y: 0, scale: 0, opacity: 1,
          }}
          animate={{
            x: (Math.random() - 0.5) * 400,
            y: (Math.random() - 0.5) * 400,
            scale: [0, 1, 0],
            opacity: [1, 1, 0],
          }}
          transition={{ duration: 1.5, delay: i * 0.05, ease: 'easeOut' }}
        />
      ))}
      <motion.svg
        viewBox="0 0 64 64"
        className="w-16 h-16"
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1] }}
        transition={{ duration: 0.5 }}
      >
        <circle cx="32" cy="32" r="28" fill="#fbbf24" opacity="0.2" />
        <path d="M32 16l4 8 9 1.5-6.5 6.5L40 41l-8-4-8 4 1.5-9L19 25.5l9-1.5z" fill="#fbbf24" />
      </motion.svg>
    </motion.div>
  )
}
