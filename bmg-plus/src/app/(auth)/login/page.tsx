'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginFormData) {
    setError(null)
    const supabase = createClient()

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (signInError) {
      setError(signInError.message)
      return
    }

    router.push('/dashboard')
    router.refresh()
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
            Digital Architect
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
            <div className="flex items-center justify-between">
              <label className="text-white/50 text-xs font-medium uppercase tracking-wider">
                Security Key
              </label>
              <button
                type="button"
                className="text-[#66cfd0] text-xs hover:text-[#66cfd0]/80 transition-colors"
                tabIndex={-1}
              >
                Reset Access
              </button>
            </div>
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
                placeholder="••••••••••••"
                autoComplete="current-password"
                {...register('password')}
                className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white/90 placeholder:text-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-[#66cfd0]/50 focus:border-[#66cfd0]/50 transition-colors"
              />
            </div>
            {errors.password && (
              <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
            )}
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
                Initialize Core
                <span aria-hidden="true">&rarr;</span>
              </>
            )}
          </button>
        </form>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <div className="w-8 h-1 rounded-full bg-[#fa5058]" />
          <div className="w-8 h-1 rounded-full bg-[#66cfd0]/30" />
          <div className="w-8 h-1 rounded-full bg-white/10" />
        </div>

        {/* Footer */}
        <p className="text-white/20 text-xs text-center mt-6 tracking-wider uppercase">
          System v1.0 | Encrypted Auth
        </p>
      </div>

      {/* Bottom link */}
      <p className="text-white/40 text-sm mt-8">
        Don&apos;t have an architect account?{' '}
        <Link
          href="/register"
          className="text-[#66cfd0] hover:text-[#66cfd0]/80 font-medium transition-colors"
        >
          Request Deployment
        </Link>
      </p>
    </div>
  )
}
