import { z } from 'zod'

export const renewalSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido'),
  telefono: z.string().min(7, 'Teléfono inválido'),
  documento: z.string().optional(),
  num_poliza_original: z.string().optional(),
  fecha_vencimiento: z.string().optional(),
  placa: z.string().optional(),
  valor_actual: z.number().positive().optional(),
  valor_renovacion: z.number().positive().optional(),
  se_renovo: z.enum(['si', 'no', 'en_proceso']).default('en_proceso'),
  razon_no_renovacion: z.string().optional(),
  medio: z.string().optional(),
  observacion: z.string().optional(),
})

export type RenewalInput = z.infer<typeof renewalSchema>
