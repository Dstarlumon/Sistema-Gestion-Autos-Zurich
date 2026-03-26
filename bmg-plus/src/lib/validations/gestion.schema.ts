import { z } from 'zod'

export const gestionSchema = z.object({
  lead_id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  tipificacion_id: z.string().uuid('Selecciona una tipificacion'),
  canal: z.enum(['telefono', 'whatsapp', 'email', 'chatbot']),
  medio: z.string().optional(),
  cotizacion: z.boolean().default(false),
  num_cotizacion: z.string().optional(),
  valor_poliza: z.number().positive().optional(),
  observacion: z.string().optional(),
  retry_scheduled_at: z.string().datetime().optional(),
  next_contact_at: z.string().datetime().optional(),
})

// Extended schema when tipificacion = Venta
export const gestionVentaSchema = gestionSchema.extend({
  valor_prima: z.number().positive('Prima es requerida'),
  num_poliza: z.string().min(1, 'Numero de poliza es requerido'),
  tipo_seguro: z.string().min(1, 'Tipo de seguro es requerido'),
  medio_pago: z.string().optional(),
  fecha_emision: z.string().optional(),
})

export type GestionInput = z.infer<typeof gestionSchema>
export type GestionVentaInput = z.infer<typeof gestionVentaSchema>
