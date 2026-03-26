import { z } from 'zod'

export const leadUploadSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido'),
  telefono: z.string().min(7, 'Telefono invalido'),
  documento: z.string().optional(),
  correo: z.string().email('Correo invalido').optional().or(z.literal('')),
  ciudad: z.string().optional(),
  placa: z.string().optional(),
  source: z
    .enum(['inbound', 'chatbot', 'pauta', 'referido', 'organico', 'renovacion', 'otro'])
    .default('otro'),
})

export type LeadUploadInput = z.infer<typeof leadUploadSchema>
