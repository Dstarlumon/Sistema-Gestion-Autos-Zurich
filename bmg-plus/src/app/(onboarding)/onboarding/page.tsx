'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { motion } from 'motion/react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { createOrganization } from './actions'
import { LoadingAnimation } from '@/components/lottie/animations'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { TooltipProvider } from '@/components/ui/tooltip'
import { HelpTooltip } from '@/components/shared/help-tooltip'

/* ============================================================
   Zod schema
   ============================================================ */
const onboardingSchema = z.object({
  name: z.string().min(2, 'Minimo 2 caracteres'),
  industry: z.string().min(1, 'Selecciona una industria'),
})

type OnboardingFormData = z.infer<typeof onboardingSchema>

/* ============================================================
   Industry options (16 + Otro)
   ============================================================ */
const INDUSTRIES = [
  { value: 'tecnologia', label: 'Tecnologia y Software' },
  { value: 'financiero', label: 'Servicios Financieros / Banca' },
  { value: 'seguros', label: 'Seguros' },
  { value: 'salud', label: 'Salud y Farmaceutica' },
  { value: 'telecomunicaciones', label: 'Telecomunicaciones' },
  { value: 'educacion', label: 'Educacion' },
  { value: 'logistica', label: 'Logistica y Transporte' },
  { value: 'retail', label: 'Comercio / Retail / E-commerce' },
  { value: 'energia', label: 'Energia y Petroleo' },
  { value: 'manufactura', label: 'Manufactura e Industria' },
  { value: 'consultoria', label: 'Consultoria y Servicios Profesionales' },
  { value: 'marketing', label: 'Marketing y Publicidad' },
  { value: 'gobierno', label: 'Gobierno y Sector Publico' },
  { value: 'bpo', label: 'BPO / Contact Center' },
  { value: 'turismo', label: 'Turismo y Hoteleria' },
  { value: 'otro', label: 'Otro' },
] as const

/* Stepper removed — single-step onboarding */

/* ============================================================
   Step 1 — Organization (name + industry Select dropdown)
   ============================================================ */
function StepOrganization({
  register,
  errors,
  selectedIndustry,
  onSelectIndustry,
}: {
  register: ReturnType<typeof useForm<OnboardingFormData>>['register']
  errors: ReturnType<typeof useForm<OnboardingFormData>>['formState']['errors']
  selectedIndustry: string
  onSelectIndustry: (value: string | null) => void
}) {
  return (
    <motion.div
      key="step-1"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="space-y-6"
    >
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-white">Tu Organizacion</h2>
        <p className="text-white/40 text-sm mt-1">Cuentanos sobre tu empresa</p>
      </div>

      {/* Organization name */}
      <div className="space-y-1.5">
        <label className="text-white/50 text-xs font-medium uppercase tracking-wider">
          Nombre de la organizacion
        </label>
        <input
          type="text"
          placeholder="Ej: BPO Colombia S.A.S"
          {...register('name')}
          className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white/90 placeholder:text-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-[#66cfd0]/50 focus:border-[#66cfd0]/50 transition-colors"
        />
        {errors.name && (
          <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>
        )}
      </div>

      {/* Industry Select dropdown */}
      <div className="space-y-1.5">
        <label className="text-white/50 text-xs font-medium uppercase tracking-wider inline-flex items-center">
          Industria
          <HelpTooltip text="Selecciona el sector de tu empresa. Esto nos ayuda a personalizar tu experiencia." />
        </label>
        <Select value={selectedIndustry} onValueChange={onSelectIndustry}>
          <SelectTrigger className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white/90 text-sm h-auto focus:ring-2 focus:ring-[#66cfd0]/50 focus:border-[#66cfd0]/50 transition-colors data-placeholder:text-white/25">
            <SelectValue placeholder="Selecciona una industria" />
          </SelectTrigger>
          <SelectContent className="bg-[#222831] border border-white/10">
            {INDUSTRIES.map((industry) => (
              <SelectItem
                key={industry.value}
                value={industry.value}
                className="text-white/90 focus:bg-white/10 focus:text-white"
              >
                {industry.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.industry && (
          <p className="text-red-400 text-xs mt-1">{errors.industry.message}</p>
        )}
      </div>
    </motion.div>
  )
}

/* StepTeam removed — team invites handled from /admin/usuarios */

/* ============================================================
   Main Page
   ============================================================ */
export default function OnboardingPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: '',
      industry: '',
    },
  })

  const selectedIndustry = watch('industry')

  const handleSelectIndustry = useCallback((value: string | null) => {
    setValue('industry', value ?? '', { shouldValidate: true })
  }, [setValue])

  const onSubmit = useCallback(async (data: OnboardingFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      await createOrganization({
        name: data.name,
        industry: data.industry,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear la organizacion')
      setIsSubmitting(false)
    }
  }, [])

  /* --- Loading overlay --- */
  if (isSubmitting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <LoadingAnimation size={100} />
          <p className="text-white/60 text-sm font-medium">
            Creando tu organizacion...
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-2xl"
        >
          {/* Glassmorphic card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 sm:p-10">
            {/* Logo */}
            <div className="text-center mb-6">
              <Image
                src="/images/bmg-plus-icon.svg"
                alt="BMG+"
                width={48}
                height={48}
                className="rounded-xl inline-block mb-3"
              />
              <h1 className="text-2xl font-bold text-white tracking-tight">BMG+</h1>
              <p className="text-white/40 text-xs mt-1 tracking-widest uppercase">
                Configuracion Inicial
              </p>
            </div>

            {/* Form — single step */}
            <form onSubmit={handleSubmit(onSubmit)}>
              <StepOrganization
                register={register}
                errors={errors}
                selectedIndustry={selectedIndustry}
                onSelectIndustry={handleSelectIndustry}
              />

              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mt-6"
                >
                  <p className="text-red-400 text-sm">{error}</p>
                </motion.div>
              )}

              {/* Submit button */}
              <div className="flex justify-end mt-8">
                <button
                  type="submit"
                  className="bg-linear-to-r from-[#fa5058] to-[#66cfd0] hover:from-[#fb6a70] hover:to-[#7dd8d9] text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 flex items-center gap-2"
                >
                  Comenzar
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>
            </form>
          </div>

          {/* Footer */}
          <p className="text-white/20 text-xs text-center mt-6 tracking-wider uppercase">
            BMG+ Digital Architect | Onboarding
          </p>
        </motion.div>
      </div>
    </TooltipProvider>
  )
}
