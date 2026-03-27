'use client'

import { useState, useCallback, useSyncExternalStore } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import { useRole } from '@/hooks/use-role'

const ONBOARDING_KEY = 'bmg-onboarding-complete'
let onboardingListeners: Array<() => void> = []
function emitOnboardingChange() { for (const l of onboardingListeners) l() }
function subscribeOnboarding(cb: () => void) {
  onboardingListeners = [...onboardingListeners, cb]
  return () => { onboardingListeners = onboardingListeners.filter((l) => l !== cb) }
}
function getOnboardingSeen() { return localStorage.getItem(ONBOARDING_KEY) === 'true' }
function getOnboardingSeenServer() { return true }

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
  const { isCoordinador } = useRole()
  const [step, setStep] = useState(0)
  const seen = useSyncExternalStore(subscribeOnboarding, getOnboardingSeen, getOnboardingSeenServer)
  const show = isCoordinador && !seen

  const complete = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    emitOnboardingChange()
  }, [])

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
            className="w-full max-w-md rounded-2xl bg-[#222831] p-8 shadow-2xl border border-white/10"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">
                Paso {step + 1} de {STEPS.length}
              </span>
            </div>
            <h3 className="mb-2 text-xl font-bold text-white">
              {current.title}
            </h3>
            <p className="text-sm mb-6 text-slate-300 leading-relaxed">
              {current.description}
            </p>

            <div className="flex items-center justify-between">
              <button
                onClick={complete}
                className="text-sm text-slate-400 hover:text-white hover:underline transition-colors"
              >
                Saltar tour
              </button>
              <div className="flex gap-2">
                {step > 0 && (
                  <button
                    onClick={() => setStep((s) => s - 1)}
                    className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/15 transition-colors"
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
                    i === step ? 'bg-[#fa5058]' : 'bg-white/20'
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
