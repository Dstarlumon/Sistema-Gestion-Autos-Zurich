'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'

const STEPS = [
  {
    target: 'sidebar',
    title: 'Navegacion',
    description:
      'Usa la barra lateral para navegar entre modulos. Puedes colapsarla con Ctrl+B.',
  },
  {
    target: 'header',
    title: 'Barra Superior',
    description:
      'Busca leads con Ctrl+K, cambia de campana, y revisa notificaciones.',
  },
  {
    target: 'dashboard',
    title: 'Dashboard',
    description:
      'Tu vista general con KPIs en tiempo real, funnel de conversion y ranking de agentes.',
  },
  {
    target: 'gestion',
    title: 'Gestion Central',
    description:
      'El modulo principal. Aqui se registran todas las interacciones con leads.',
  },
  {
    target: 'admin',
    title: 'Administracion',
    description:
      'Configura campanas, usuarios, tipificaciones y la organizacion.',
  },
]

export function OnboardingTour() {
  const [step, setStep] = useState(0)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem('bmg-onboarding-complete')
    if (!seen) setShow(true)
  }, [])

  const complete = () => {
    localStorage.setItem('bmg-onboarding-complete', 'true')
    setShow(false)
  }

  if (!show) return null

  const current = STEPS[step]

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
        >
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-bold text-on-surface-variant">
                Paso {step + 1} de {STEPS.length}
              </span>
            </div>
            <h3 className="mb-2 text-xl font-bold text-on-surface">
              {current.title}
            </h3>
            <p className="text-body-md mb-6 text-on-surface-variant">
              {current.description}
            </p>

            <div className="flex items-center justify-between">
              <button
                onClick={complete}
                className="text-sm text-on-surface-variant hover:underline"
              >
                Saltar tour
              </button>
              <div className="flex gap-2">
                {step > 0 && (
                  <button
                    onClick={() => setStep((s) => s - 1)}
                    className="rounded-lg bg-surface-container px-4 py-2 text-sm font-medium"
                  >
                    Anterior
                  </button>
                )}
                {step < STEPS.length - 1 ? (
                  <button
                    onClick={() => setStep((s) => s + 1)}
                    className="gradient-primary rounded-lg px-4 py-2 text-sm font-medium text-white"
                  >
                    Siguiente
                  </button>
                ) : (
                  <button
                    onClick={complete}
                    className="gradient-primary rounded-lg px-4 py-2 text-sm font-medium text-white"
                  >
                    Comenzar
                  </button>
                )}
              </div>
            </div>

            {/* Progress dots */}
            <div className="mt-4 flex justify-center gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-2 w-2 rounded-full',
                    i === step ? 'bg-[#fa5058]' : 'bg-surface-container'
                  )}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
