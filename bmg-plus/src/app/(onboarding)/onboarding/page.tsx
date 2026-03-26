'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'motion/react'
import { useForm, useFieldArray } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { createOrganization } from './actions'
import { LoadingAnimation } from '@/components/lottie/animations'

/* ============================================================
   Zod schema
   ============================================================ */
const onboardingSchema = z.object({
  name: z.string().min(2, 'Minimo 2 caracteres'),
  industry: z.string().min(1, 'Selecciona una industria'),
  timezone: z.string(),
  currency: z.string(),
  sla_hours: z.number().min(1),
  max_pause_minutes: z.number().min(1),
  daily_goal: z.number().min(1),
  teamMembers: z.array(z.object({
    email: z.string().email('Email invalido'),
    role: z.enum(['agente', 'supervisor']),
  })).optional(),
})

type OnboardingFormData = z.infer<typeof onboardingSchema>

/* ============================================================
   Industry options
   ============================================================ */
const INDUSTRIES = [
  {
    value: 'seguros',
    icon: '🏢',
    title: 'Seguros',
    description: 'Campanas de seguros, cotizaciones, renovaciones',
  },
  {
    value: 'telecomunicaciones',
    icon: '📡',
    title: 'Telecomunicaciones',
    description: 'Servicios moviles, internet, TV',
  },
  {
    value: 'financiero',
    icon: '💳',
    title: 'Financiero',
    description: 'Creditos, tarjetas, cuentas bancarias',
  },
  {
    value: 'salud',
    icon: '🏥',
    title: 'Salud',
    description: 'EPS, medicina prepagada, citas',
  },
  {
    value: 'otro',
    icon: '📋',
    title: 'Otro',
    description: 'Configuracion personalizada',
  },
] as const

const TIMEZONES = [
  { value: 'America/Bogota', label: 'Bogota (GMT-5)' },
  { value: 'America/Mexico_City', label: 'Ciudad de Mexico (GMT-6)' },
  { value: 'America/Lima', label: 'Lima (GMT-5)' },
  { value: 'America/Santiago', label: 'Santiago (GMT-4)' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires (GMT-3)' },
  { value: 'America/New_York', label: 'New York (GMT-5)' },
]

const CURRENCIES = [
  { value: 'COP', label: 'COP — Peso Colombiano' },
  { value: 'USD', label: 'USD — Dolar Americano' },
  { value: 'MXN', label: 'MXN — Peso Mexicano' },
  { value: 'PEN', label: 'PEN — Sol Peruano' },
  { value: 'CLP', label: 'CLP — Peso Chileno' },
  { value: 'ARS', label: 'ARS — Peso Argentino' },
]

/* ============================================================
   Stepper component
   ============================================================ */
function Stepper({ currentStep }: { currentStep: number }) {
  const steps = [
    { number: 1, label: 'Organizacion' },
    { number: 2, label: 'Configuracion' },
    { number: 3, label: 'Equipo' },
  ]

  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((step, i) => (
        <div key={step.number} className="flex items-center">
          {/* Step circle */}
          <div className="flex flex-col items-center">
            <motion.div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                currentStep >= step.number
                  ? 'gradient-primary text-white shadow-lg shadow-[#fa5058]/20'
                  : 'bg-white/10 text-white/40 border border-white/10'
              }`}
              animate={currentStep === step.number ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              {currentStep > step.number ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step.number
              )}
            </motion.div>
            <span className={`text-xs mt-1.5 font-medium transition-colors ${
              currentStep >= step.number ? 'text-white/80' : 'text-white/30'
            }`}>
              {step.label}
            </span>
          </div>

          {/* Connector line */}
          {i < steps.length - 1 && (
            <div className="w-16 sm:w-24 h-0.5 mx-2 mb-5 rounded-full overflow-hidden bg-white/10">
              <motion.div
                className="h-full gradient-primary rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: currentStep > step.number ? '100%' : '0%' }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ============================================================
   Step 1 — Organization
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
  onSelectIndustry: (value: string) => void
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

      {/* Industry radio cards */}
      <div className="space-y-1.5">
        <label className="text-white/50 text-xs font-medium uppercase tracking-wider">
          Industria
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          {INDUSTRIES.map((industry) => (
            <button
              key={industry.value}
              type="button"
              onClick={() => onSelectIndustry(industry.value)}
              className={`relative text-left p-4 rounded-xl border transition-all duration-200 ${
                selectedIndustry === industry.value
                  ? 'border-transparent bg-white/10 ring-2 ring-[#66cfd0]/60 shadow-lg shadow-[#66cfd0]/10'
                  : 'border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20'
              }`}
            >
              {selectedIndustry === industry.value && (
                <motion.div
                  layoutId="industry-indicator"
                  className="absolute inset-0 rounded-xl border-2 border-[#66cfd0]/60"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <div className="flex items-start gap-3">
                <span className="text-2xl" role="img" aria-label={industry.title}>
                  {industry.icon}
                </span>
                <div>
                  <p className="text-white font-semibold text-sm">{industry.title}</p>
                  <p className="text-white/40 text-xs mt-0.5">{industry.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
        {errors.industry && (
          <p className="text-red-400 text-xs mt-1">{errors.industry.message}</p>
        )}
      </div>
    </motion.div>
  )
}

/* ============================================================
   Step 2 — Configuration
   ============================================================ */
function StepConfiguration({
  register,
  errors,
}: {
  register: ReturnType<typeof useForm<OnboardingFormData>>['register']
  errors: ReturnType<typeof useForm<OnboardingFormData>>['formState']['errors']
}) {
  const inputClass = 'w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white/90 text-sm focus:outline-none focus:ring-2 focus:ring-[#66cfd0]/50 focus:border-[#66cfd0]/50 transition-colors'
  const selectClass = `${inputClass} appearance-none cursor-pointer`
  const labelClass = 'text-white/50 text-xs font-medium uppercase tracking-wider'

  return (
    <motion.div
      key="step-2"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="space-y-6"
    >
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-white">Configuracion Operativa</h2>
        <p className="text-white/40 text-sm mt-1">Ajusta los parametros de tu operacion</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Timezone */}
        <div className="space-y-1.5">
          <label className={labelClass}>Zona horaria</label>
          <div className="relative">
            <select {...register('timezone')} className={selectClass}>
              {TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value} className="bg-[#222831] text-white">
                  {tz.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/30">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>
        </div>

        {/* Currency */}
        <div className="space-y-1.5">
          <label className={labelClass}>Moneda</label>
          <div className="relative">
            <select {...register('currency')} className={selectClass}>
              {CURRENCIES.map(c => (
                <option key={c.value} value={c.value} className="bg-[#222831] text-white">
                  {c.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/30">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>
        </div>

        {/* SLA hours */}
        <div className="space-y-1.5">
          <label className={labelClass}>SLA maximo (horas)</label>
          <input
            type="number"
            min={1}
            {...register('sla_hours', { valueAsNumber: true })}
            className={inputClass}
          />
          {errors.sla_hours && (
            <p className="text-red-400 text-xs mt-1">{errors.sla_hours.message}</p>
          )}
        </div>

        {/* Max pause minutes */}
        <div className="space-y-1.5">
          <label className={labelClass}>Maximo pausa (minutos)</label>
          <input
            type="number"
            min={1}
            {...register('max_pause_minutes', { valueAsNumber: true })}
            className={inputClass}
          />
          {errors.max_pause_minutes && (
            <p className="text-red-400 text-xs mt-1">{errors.max_pause_minutes.message}</p>
          )}
        </div>

        {/* Daily goal */}
        <div className="space-y-1.5 sm:col-span-2">
          <label className={labelClass}>Meta gestiones diarias</label>
          <input
            type="number"
            min={1}
            {...register('daily_goal', { valueAsNumber: true })}
            className={inputClass}
          />
          {errors.daily_goal && (
            <p className="text-red-400 text-xs mt-1">{errors.daily_goal.message}</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ============================================================
   Step 3 — Team
   ============================================================ */
function StepTeam({
  fields,
  append,
  remove,
  register,
  errors,
}: {
  fields: Array<{ id: string; email: string; role: 'agente' | 'supervisor' }>
  append: (value: { email: string; role: 'agente' | 'supervisor' }) => void
  remove: (index: number) => void
  register: ReturnType<typeof useForm<OnboardingFormData>>['register']
  errors: ReturnType<typeof useForm<OnboardingFormData>>['formState']['errors']
}) {
  const inputClass = 'w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white/90 placeholder:text-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-[#66cfd0]/50 focus:border-[#66cfd0]/50 transition-colors'

  return (
    <motion.div
      key="step-3"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="space-y-6"
    >
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-white">Invita a tu Equipo</h2>
        <p className="text-white/40 text-sm mt-1">Agrega a tus primeros agentes (opcional)</p>
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {fields.map((field, index) => (
            <motion.div
              key={field.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-3"
            >
              {/* Email */}
              <div className="flex-1 space-y-1">
                <input
                  type="email"
                  placeholder="correo@empresa.com"
                  {...register(`teamMembers.${index}.email`)}
                  className={inputClass}
                />
                {errors.teamMembers?.[index]?.email && (
                  <p className="text-red-400 text-xs">{errors.teamMembers[index].email?.message}</p>
                )}
              </div>

              {/* Role selector */}
              <div className="relative">
                <select
                  {...register(`teamMembers.${index}.role`)}
                  className="bg-white/5 border border-white/10 rounded-lg py-3 px-4 pr-8 text-white/90 text-sm focus:outline-none focus:ring-2 focus:ring-[#66cfd0]/50 focus:border-[#66cfd0]/50 transition-colors appearance-none cursor-pointer"
                >
                  <option value="agente" className="bg-[#222831] text-white">Agente</option>
                  <option value="supervisor" className="bg-[#222831] text-white">Supervisor</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/30">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => remove(index)}
                className="mt-2.5 text-white/30 hover:text-red-400 transition-colors"
                aria-label="Eliminar miembro"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add button */}
        <button
          type="button"
          onClick={() => append({ email: '', role: 'agente' })}
          className="flex items-center gap-2 text-[#66cfd0] text-sm font-medium hover:text-[#66cfd0]/80 transition-colors py-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Agregar otro
        </button>
      </div>
    </motion.div>
  )
}

/* ============================================================
   Main Page
   ============================================================ */
export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [direction, setDirection] = useState(1) // 1 = forward, -1 = backward

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: '',
      industry: '',
      timezone: 'America/Bogota',
      currency: 'COP',
      sla_hours: 24,
      max_pause_minutes: 60,
      daily_goal: 30,
      teamMembers: [],
    },
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = form

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'teamMembers',
  })

  const selectedIndustry = watch('industry')

  const handleSelectIndustry = useCallback((value: string) => {
    setValue('industry', value, { shouldValidate: true })
  }, [setValue])

  const goNext = useCallback(async () => {
    let valid = false

    if (step === 1) {
      valid = await trigger(['name', 'industry'])
    } else if (step === 2) {
      valid = await trigger(['timezone', 'currency', 'sla_hours', 'max_pause_minutes', 'daily_goal'])
    } else {
      valid = true
    }

    if (valid && step < 3) {
      setDirection(1)
      setStep(s => s + 1)
    }
  }, [step, trigger])

  const goBack = useCallback(() => {
    if (step > 1) {
      setDirection(-1)
      setStep(s => s - 1)
    }
  }, [step])

  const onSubmit = useCallback(async (data: OnboardingFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Filter out empty team members
      const validMembers = (data.teamMembers || []).filter(m => m.email.trim() !== '')

      await createOrganization({
        name: data.name,
        industry: data.industry,
        config: {
          timezone: data.timezone,
          currency: data.currency,
          sla_hours: data.sla_hours,
          max_pause_minutes: data.max_pause_minutes,
          daily_goal: data.daily_goal,
        },
        teamMembers: validMembers.length > 0 ? validMembers : undefined,
      })
      // redirect happens inside the action
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear la organizacion')
      setIsSubmitting(false)
    }
  }, [])

  const handleSkipTeam = useCallback(() => {
    // Remove all team members and submit
    while (fields.length > 0) {
      remove(0)
    }
    handleSubmit(onSubmit)()
  }, [fields.length, remove, handleSubmit, onSubmit])

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

          {/* Stepper */}
          <Stepper currentStep={step} />

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Step content with animation */}
            <AnimatePresence mode="wait" custom={direction}>
              {step === 1 && (
                <StepOrganization
                  register={register}
                  errors={errors}
                  selectedIndustry={selectedIndustry}
                  onSelectIndustry={handleSelectIndustry}
                />
              )}
              {step === 2 && (
                <StepConfiguration
                  register={register}
                  errors={errors}
                />
              )}
              {step === 3 && (
                <StepTeam
                  fields={fields}
                  append={append}
                  remove={remove}
                  register={register}
                  errors={errors}
                />
              )}
            </AnimatePresence>

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

            {/* Navigation buttons */}
            <div className="flex items-center justify-between mt-8 gap-4">
              {/* Back button */}
              {step > 1 ? (
                <button
                  type="button"
                  onClick={goBack}
                  className="flex items-center gap-2 text-white/50 hover:text-white/80 text-sm font-medium transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5" />
                    <path d="M12 19l-7-7 7-7" />
                  </svg>
                  Atras
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-3">
                {/* Skip link for step 3 */}
                {step === 3 && (
                  <button
                    type="button"
                    onClick={handleSkipTeam}
                    className="text-white/40 hover:text-white/60 text-sm transition-colors"
                  >
                    Omitir
                  </button>
                )}

                {/* Next / Submit button */}
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="bg-linear-to-r from-[#fa5058] to-[#66cfd0] hover:from-[#fb6a70] hover:to-[#7dd8d9] text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 flex items-center gap-2"
                  >
                    Siguiente
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14" />
                      <path d="M12 5l7 7-7 7" />
                    </svg>
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="bg-linear-to-r from-[#fa5058] to-[#66cfd0] hover:from-[#fb6a70] hover:to-[#7dd8d9] text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 flex items-center gap-2"
                  >
                    Finalizar
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-white/20 text-xs text-center mt-6 tracking-wider uppercase">
          BMG+ Digital Architect | Onboarding
        </p>
      </motion.div>
    </div>
  )
}
