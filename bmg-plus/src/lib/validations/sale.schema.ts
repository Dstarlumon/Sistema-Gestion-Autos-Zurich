import { z } from 'zod'

export const saleSchema = z.object({
  lead_id: z.string().uuid().optional(),
  gestion_id: z.string().uuid().optional(),
  campaign_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  agent_id: z.string().uuid(),
  nombre_cliente: z.string().min(1, 'Nombre es requerido'),
  documento: z.string().optional(),
  telefono: z.string().optional(),
  correo: z.string().email().optional().or(z.literal('')),
  placa: z.string().optional(),
  ciudad: z.string().optional(),
  valor_prima: z.number().positive('Prima debe ser mayor a 0'),
  num_poliza: z.string().optional(),
  tipo_seguro: z.string().optional(),
  canal: z.string().optional(),
  fuente: z.string().optional(),
  medio_pago: z.string().optional(),
  fecha_emision: z.string().optional(),
  fecha_cotizacion: z.string().optional(),
})

export type SaleInput = z.infer<typeof saleSchema>
