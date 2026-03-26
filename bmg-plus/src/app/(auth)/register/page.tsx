'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { verifyInviteCode } from './actions'

const registerSchema = z
  .object({
    fullName: z.string().min(1, 'Full name is required'),
    email: z.string().email('Enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    inviteCode: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type RegisterFormData = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  async function onSubmit(data: RegisterFormData) {
    setError(null)
    setSuccess(false)

    // Validate invite code server-side
    const codeResult = await verifyInviteCode(data.inviteCode || '')
    if (codeResult.required && !codeResult.valid) {
      setError('Código de invitación inválido o vacío. Contacta a tu administrador.')
      return
    }

    const supabase = createClient()

    const { error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          // Role is assigned server-side by the handle_new_user trigger.
          // Never trust client-provided role.
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    setSuccess(true)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Main card */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-10 w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <img src="/images/bmg-plus-icon.svg" alt="BMG+" className="w-14 h-14 rounded-xl inline-block mb-4" />
          <h1 className="text-2xl font-bold text-white tracking-tight">BMG+</h1>
          <p className="text-white/40 text-xs mt-1 tracking-widest uppercase">
            Deployment Request
          </p>
        </div>

        {/* Success state */}
        {success ? (
          <div className="space-y-6">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-4 text-center">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-emerald-400 mx-auto mb-3"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <p className="text-emerald-400 text-sm font-medium">
                Account created successfully
              </p>
              <p className="text-white/40 text-xs mt-2">
                Please check your email to verify your account before logging in.
              </p>
            </div>
            <Link
              href="/login"
              className="block w-full bg-linear-to-r from-[#fa5058] to-[#66cfd0] hover:from-[#fb6a70] hover:to-[#7dd8d9] text-white font-semibold py-3 rounded-lg transition-all duration-200 text-center"
            >
              Return to Login
            </Link>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Full name field */}
            <div className="space-y-1.5">
              <label className="text-white/50 text-xs font-medium uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white/30"
                  >
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="John Doe"
                  autoComplete="name"
                  {...register('fullName')}
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white/90 placeholder:text-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-[#66cfd0]/50 focus:border-[#66cfd0]/50 transition-colors"
                />
              </div>
              {errors.fullName && (
                <p className="text-red-400 text-xs mt-1">{errors.fullName.message}</p>
              )}
            </div>

            {/* Email field */}
            <div className="space-y-1.5">
              <label className="text-white/50 text-xs font-medium uppercase tracking-wider">
                Work Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white/30"
                  >
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </div>
                <input
                  type="email"
                  placeholder="architect@bmg.plus"
                  autoComplete="email"
                  {...register('email')}
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white/90 placeholder:text-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-[#66cfd0]/50 focus:border-[#66cfd0]/50 transition-colors"
                />
              </div>
              {errors.email && (
                <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <label className="text-white/50 text-xs font-medium uppercase tracking-wider">
                Security Key
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white/30"
                  >
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <input
                  type="password"
                  placeholder="Min. 6 characters"
                  autoComplete="new-password"
                  {...register('password')}
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white/90 placeholder:text-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-[#66cfd0]/50 focus:border-[#66cfd0]/50 transition-colors"
                />
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm password field */}
            <div className="space-y-1.5">
              <label className="text-white/50 text-xs font-medium uppercase tracking-wider">
                Confirm Security Key
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white/30"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <input
                  type="password"
                  placeholder="Re-enter security key"
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white/90 placeholder:text-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-[#66cfd0]/50 focus:border-[#66cfd0]/50 transition-colors"
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-red-400 text-xs mt-1">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Invite code field */}
            <div className="space-y-1.5">
              <label className="text-white/50 text-xs font-medium uppercase tracking-wider">
                Invite Code
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white/30"
                  >
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Enter invite code"
                  autoComplete="off"
                  {...register('inviteCode')}
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white/90 placeholder:text-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-[#66cfd0]/50 focus:border-[#66cfd0]/50 transition-colors"
                />
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-linear-to-r from-[#fa5058] to-[#66cfd0] hover:from-[#fb6a70] hover:to-[#7dd8d9] text-white font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <>
                  Deploy Account
                  <span aria-hidden="true">&rarr;</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer */}
        <p className="text-white/20 text-xs text-center mt-6 tracking-wider uppercase">
          System v1.0 | Encrypted Auth
        </p>
      </div>

      {/* Bottom link */}
      <p className="text-white/40 text-sm mt-8">
        Already have an architect account?{' '}
        <Link
          href="/login"
          className="text-[#66cfd0] hover:text-[#66cfd0]/80 font-medium transition-colors"
        >
          Initialize Core
        </Link>
      </p>
    </div>
  )
}
