'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'motion/react'
import { TipificacionCascade } from '@/components/forms/tipificacion-cascade'
import { useCreateGestion } from '@/lib/queries/use-gestiones'
import { useCreateSale } from '@/lib/queries/use-sales'
import { useAuth } from '@/hooks/use-auth'
import { submitGestion } from '@/app/(app)/gestion/actions'
import { useQueryClient } from '@tanstack/react-query'
import {
  gestionSchema,
  gestionVentaSchema,
} from '@/lib/validations/gestion.schema'
import type { GestionVentaInput } from '@/lib/validations/gestion.schema'
import { CANALES } from '@/lib/utils/constants'
import { SuccessAnimation } from '@/components/lottie/animations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Phone,
  MessageCircle,
  Mail,
  Bot,
  Loader2,
  Send,
  CheckCircle2,
  BellRing,
} from 'lucide-react'

interface GestionFormProps {
  leadId: string
  campaignId: string
  leadData: {
    nombre: string
    telefono: string
    documento?: string
    correo?: string
    placa?: string
    ciudad?: string
  }
  onSuccess?: () => void
}

const CANAL_OPTIONS = [
  {
    value: 'telefono',
    label: 'Telefono',
    icon: <Phone className="size-3.5" />,
  },
  {
    value: 'whatsapp',
    label: 'WhatsApp',
    icon: <MessageCircle className="size-3.5" />,
  },
  { value: 'email', label: 'Email', icon: <Mail className="size-3.5" /> },
  { value: 'chatbot', label: 'Chatbot', icon: <Bot className="size-3.5" /> },
] as const

const TIPO_SEGURO_OPTIONS = [
  'Todo riesgo',
  'Basico',
  'RCE',
  'SOAT',
  'Responsabilidad Civil',
  'Otro',
]

const MEDIO_PAGO_OPTIONS = [
  'Tarjeta credito',
  'Tarjeta debito',
  'PSE',
  'Efectivo',
  'Transferencia',
  'Financiacion',
  'Otro',
]

const expandCollapseTransition = { duration: 0.25 }

/** Map tipificacion category to lead_status for DB update */
function mapCategoryToLeadStatus(rootCategory: string, leafName: string): string | null {
  if (leafName.toLowerCase().includes('venta')) return 'venta'
  if (leafName.toLowerCase().includes('en proceso') || leafName.toLowerCase().includes('pendiente')) return 'en_proceso'
  if (rootCategory === 'NO APTO') return 'no_apto'
  if (rootCategory.includes('NO COTIZA')) return 'cerrado'
  if (rootCategory === 'NO CONTACTO') return null // don't change status
  if (rootCategory === 'POSITIVO') return 'cotizado'
  return null // unknown — don't change
}

export function GestionForm({
  leadId,
  campaignId,
  leadData,
  onSuccess,
}: GestionFormProps) {
  const { user } = useAuth()
  const createGestion = useCreateGestion()
  const createSale = useCreateSale()
  const queryClient = useQueryClient()

  // Track root category and specific tipificacion name
  const [rootCategory, setRootCategory] = useState('')
  const [tipificacionName, setTipificacionName] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [retryNotify, setRetryNotify] = useState(false)

  // Determine which conditional section to show
  const isNoContacto = rootCategory.toUpperCase() === 'NO CONTACTO'
  const isVenta = tipificacionName.toLowerCase().includes('venta')
  const isEnProceso =
    tipificacionName.toLowerCase().includes('en proceso') ||
    tipificacionName.toLowerCase().includes('pendiente inspeccion') ||
    tipificacionName.toLowerCase().includes('pendiente inspección')

  // Pick schema dynamically based on tipificacion
  const activeSchema = isVenta ? gestionVentaSchema : gestionSchema

  // Keep a ref to the current schema so the resolver always uses the latest version.
  // react-hook-form captures the resolver at init time, so we use a wrapper that
  // delegates to the current ref value — ensuring validation stays in sync with
  // the active schema when switching between VENTA and non-VENTA tipificaciones.
  const schemaRef = useRef(activeSchema)
  schemaRef.current = activeSchema

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const dynamicResolver = useCallback(async (values: any, context: any, options: any) => {
    const resolver = zodResolver(schemaRef.current as any)
    return resolver(values, context, options)
  }, [])
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    watch,
    trigger,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<GestionVentaInput>({
    resolver: dynamicResolver,
    defaultValues: {
      lead_id: leadId,
      campaign_id: campaignId,
      organization_id: user?.organization_id ?? '',
      canal: 'telefono',
      observacion: '',
      cotizacion: false,
    },
  })

  // Re-validate when schema changes (VENTA <-> non-VENTA switch)
  const prevIsVenta = useRef(isVenta)
  useEffect(() => {
    if (prevIsVenta.current !== isVenta && isDirty) {
      trigger()
    }
    prevIsVenta.current = isVenta
  }, [isVenta, trigger, isDirty])

  const cotizacionValue = watch('cotizacion')

  const handleTipificacionChange = useCallback(
    (tipificacionId: string, rootCat: string, leafName: string) => {
      setValue('tipificacion_id', tipificacionId, { shouldValidate: true })
      setRootCategory(rootCat)
      setTipificacionName(leafName)
    },
    [setValue]
  )

  const [serverError, setServerError] = useState<string | null>(null)

  const onSubmit = async (data: GestionVentaInput) => {
    if (!user) return

    setServerError(null)

    try {
      // Build gestion payload for server action
      const gestionData = {
        lead_id: data.lead_id,
        campaign_id: campaignId,
        organization_id: user.organization_id,
        tipificacion_id: data.tipificacion_id,
        canal: data.canal,
        medio: data.medio || undefined,
        cotizacion: data.cotizacion ?? false,
        num_cotizacion: data.num_cotizacion || undefined,
        valor_poliza: data.valor_poliza || undefined,
        observacion: data.observacion || undefined,
        retry_scheduled_at: data.retry_scheduled_at || undefined,
        next_contact_at: data.next_contact_at || undefined,
        retry_notified: isNoContacto ? !retryNotify : undefined,
      }

      // Build sale payload if Venta
      const saleData = isVenta
        ? {
            nombre_cliente: leadData.nombre,
            telefono: leadData.telefono,
            documento: leadData.documento || undefined,
            correo: leadData.correo || undefined,
            placa: leadData.placa || undefined,
            ciudad: leadData.ciudad || undefined,
            valor_prima: data.valor_prima!,
            num_poliza: data.num_poliza || undefined,
            tipo_seguro: data.tipo_seguro || undefined,
            medio_pago: data.medio_pago || undefined,
            fecha_emision: data.fecha_emision || undefined,
            canal: data.canal,
          }
        : undefined

      const newStatus = mapCategoryToLeadStatus(rootCategory, tipificacionName)

      // Single server action handles gestion + sale + lead update atomically
      await submitGestion(gestionData, newStatus, saleData)

      // Invalidate relevant queries after successful server action
      queryClient.invalidateQueries({ queryKey: ['gestiones', leadId] })
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      if (isVenta) {
        queryClient.invalidateQueries({ queryKey: ['sales'] })
      }

      // Show success and reset
      setShowSuccess(true)
      reset({
        lead_id: leadId,
        campaign_id: campaignId,
        organization_id: user?.organization_id ?? '',
        canal: 'telefono',
        observacion: '',
        cotizacion: false,
      })
      setRootCategory('')
      setTipificacionName('')
      setRetryNotify(false)

      setTimeout(() => setShowSuccess(false), 3000)
      onSuccess?.()
    } catch (error) {
      console.error('Error creating gestion:', error)
      setServerError(error instanceof Error ? error.message : 'Error al guardar la gestion')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* ---- Always visible: Tipificacion, Canal, Observacion ---- */}
      <div className="space-y-4">
        {/* Tipificacion Cascade */}
        <TipificacionCascade
          campaignId={campaignId}
          value={watch('tipificacion_id')}
          onChange={handleTipificacionChange}
          error={errors.tipificacion_id?.message}
        />

        {/* Canal radio group */}
        <div className="space-y-1.5">
          <Label>Canal de contacto</Label>
          <Controller
            name="canal"
            control={control}
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={(val) => field.onChange(val)}
                className="flex flex-wrap gap-2"
              >
                {CANAL_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={cn(
                      'flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                      field.value === opt.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    <RadioGroupItem
                      value={opt.value}
                      className="sr-only"
                    />
                    {opt.icon}
                    {opt.label}
                  </label>
                ))}
              </RadioGroup>
            )}
          />
          {errors.canal && (
            <p className="text-xs text-destructive">
              {errors.canal.message}
            </p>
          )}
        </div>

        {/* Observacion */}
        <div className="space-y-1.5">
          <Label htmlFor="observacion">Observacion</Label>
          <Textarea
            id="observacion"
            placeholder="Notas de la gestion..."
            {...register('observacion')}
          />
        </div>
      </div>

      {/* ---- Conditional: NO CONTACTO — retry scheduling ---- */}
      <AnimatePresence>
        {isNoContacto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={expandCollapseTransition}
            style={{ overflow: 'hidden' }}
          >
            <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
              <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Programar reintento
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="retry-date" className="text-xs">
                    Fecha
                  </Label>
                  <Input
                    id="retry-date"
                    type="date"
                    onChange={(e) => {
                      const date = e.target.value
                      const time =
                        (
                          document.getElementById(
                            'retry-time'
                          ) as HTMLInputElement
                        )?.value || '09:00'
                      if (date) {
                        setValue(
                          'retry_scheduled_at',
                          `${date}T${time}:00.000Z`
                        )
                      }
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="retry-time" className="text-xs">
                    Hora
                  </Label>
                  <Input
                    id="retry-time"
                    type="time"
                    defaultValue="09:00"
                    onChange={(e) => {
                      const time = e.target.value
                      const date =
                        (
                          document.getElementById(
                            'retry-date'
                          ) as HTMLInputElement
                        )?.value || ''
                      if (date && time) {
                        setValue(
                          'retry_scheduled_at',
                          `${date}T${time}:00.000Z`
                        )
                      }
                    }}
                  />
                </div>
              </div>

              {/* Notify before retry */}
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={retryNotify}
                  onCheckedChange={(checked) => setRetryNotify(checked)}
                />
                <span className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300">
                  <BellRing className="size-3" />
                  Notificarme 15 min antes
                </span>
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Conditional: VENTA — sale details ---- */}
      <AnimatePresence>
        {isVenta && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={expandCollapseTransition}
            style={{ overflow: 'hidden' }}
          >
            <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
              <h4 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                Datos de venta
              </h4>

              <div className="grid grid-cols-2 gap-3">
                {/* Valor prima */}
                <div className="space-y-1.5">
                  <Label htmlFor="valor_prima" className="text-xs">
                    Valor prima *
                  </Label>
                  <Input
                    id="valor_prima"
                    type="number"
                    placeholder="0"
                    {...register('valor_prima', { valueAsNumber: true })}
                    className={cn(
                      errors.valor_prima && 'border-destructive'
                    )}
                  />
                  {errors.valor_prima && (
                    <p className="text-xs text-destructive">
                      {errors.valor_prima.message}
                    </p>
                  )}
                </div>

                {/* Num poliza */}
                <div className="space-y-1.5">
                  <Label htmlFor="num_poliza" className="text-xs">
                    No. Poliza *
                  </Label>
                  <Input
                    id="num_poliza"
                    placeholder="Numero de poliza"
                    {...register('num_poliza')}
                    className={cn(
                      errors.num_poliza && 'border-destructive'
                    )}
                  />
                  {errors.num_poliza && (
                    <p className="text-xs text-destructive">
                      {errors.num_poliza.message}
                    </p>
                  )}
                </div>

                {/* Tipo seguro */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo seguro *</Label>
                  <Controller
                    name="tipo_seguro"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value ?? undefined}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          className={cn(
                            'w-full',
                            errors.tipo_seguro && 'border-destructive'
                          )}
                        >
                          <SelectValue placeholder="Selecciona" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPO_SEGURO_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.tipo_seguro && (
                    <p className="text-xs text-destructive">
                      {errors.tipo_seguro.message}
                    </p>
                  )}
                </div>

                {/* Medio pago */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Medio de pago</Label>
                  <Controller
                    name="medio_pago"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value ?? undefined}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecciona" />
                        </SelectTrigger>
                        <SelectContent>
                          {MEDIO_PAGO_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {/* Fecha emision */}
                <div className="space-y-1.5">
                  <Label htmlFor="fecha_emision" className="text-xs">
                    Fecha emision
                  </Label>
                  <Input
                    id="fecha_emision"
                    type="date"
                    {...register('fecha_emision')}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Conditional: EN PROCESO / PENDIENTE INSPECCION ---- */}
      <AnimatePresence>
        {isEnProceso && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={expandCollapseTransition}
            style={{ overflow: 'hidden' }}
          >
            <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
              <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                Datos de seguimiento
              </h4>

              {/* Cotizacion radio */}
              <div className="space-y-1.5">
                <Label className="text-xs">Cotizacion realizada?</Label>
                <Controller
                  name="cotizacion"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup
                      value={field.value ? 'si' : 'no'}
                      onValueChange={(val) =>
                        field.onChange(val === 'si')
                      }
                      className="flex gap-3"
                    >
                      <label className="flex items-center gap-1.5 text-sm">
                        <RadioGroupItem value="si" />
                        Si
                      </label>
                      <label className="flex items-center gap-1.5 text-sm">
                        <RadioGroupItem value="no" />
                        No
                      </label>
                    </RadioGroup>
                  )}
                />
              </div>

              {/* Num cotizacion (conditional on cotizacion=true) */}
              <AnimatePresence>
                {cotizacionValue && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={expandCollapseTransition}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="num_cotizacion" className="text-xs">
                          No. Cotizacion
                        </Label>
                        <Input
                          id="num_cotizacion"
                          placeholder="Numero de cotizacion"
                          {...register('num_cotizacion')}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="valor_poliza" className="text-xs">
                          Valor poliza
                        </Label>
                        <Input
                          id="valor_poliza"
                          type="number"
                          placeholder="0"
                          {...register('valor_poliza', {
                            valueAsNumber: true,
                          })}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Next contact date */}
              <div className="space-y-1.5">
                <Label htmlFor="next-date" className="text-xs">
                  Proximo contacto
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="next-date"
                    type="date"
                    className="flex-1"
                    onChange={(e) => {
                      const date = e.target.value
                      const time =
                        (
                          document.getElementById(
                            'next-time'
                          ) as HTMLInputElement
                        )?.value || '09:00'
                      if (date) {
                        setValue(
                          'next_contact_at',
                          `${date}T${time}:00.000Z`
                        )
                      }
                    }}
                  />
                  <Input
                    id="next-time"
                    type="time"
                    defaultValue="09:00"
                    className="w-24"
                    onChange={(e) => {
                      const time = e.target.value
                      const date =
                        (
                          document.getElementById(
                            'next-date'
                          ) as HTMLInputElement
                        )?.value || ''
                      if (date && time) {
                        setValue(
                          'next_contact_at',
                          `${date}T${time}:00.000Z`
                        )
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Submit ---- */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          type="submit"
          disabled={isSubmitting || createGestion.isPending}
          size="lg"
          className="gap-2"
        >
          {isSubmitting || createGestion.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Send className="size-4" />
              Registrar gestion
            </>
          )}
        </Button>

        {/* Success animation */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <SuccessAnimation size={48} message="Gestión registrada" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error message */}
      {(serverError || createGestion.isError || createSale.isError) && (
        <p className="text-sm text-destructive">
          {serverError || 'Error al guardar la gestion. Intenta de nuevo.'}
        </p>
      )}
    </form>
  )
}
