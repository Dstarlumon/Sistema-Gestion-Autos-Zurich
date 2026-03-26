import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Minimo 6 caracteres'),
})

export const registerSchema = z
  .object({
    full_name: z.string().min(2, 'Nombre es requerido'),
    email: z.string().email('Email invalido'),
    password: z.string().min(6, 'Minimo 6 caracteres'),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Las contrasenas no coinciden',
    path: ['confirm_password'],
  })

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
