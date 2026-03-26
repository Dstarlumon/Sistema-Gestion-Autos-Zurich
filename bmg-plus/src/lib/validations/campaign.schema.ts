import { z } from 'zod'

export const campaignSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido'),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9_-]+$/, 'Solo minusculas, numeros, guiones'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color hex invalido')
    .default('#3b82f6'),
  icon: z.string().default(''),
})

export type CampaignInput = z.infer<typeof campaignSchema>
