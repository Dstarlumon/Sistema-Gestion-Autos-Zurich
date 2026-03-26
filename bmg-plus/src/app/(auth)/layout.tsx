'use client'

import dynamic from 'next/dynamic'

const LoginScene = dynamic(() => import('@/components/three/login-scene'), {
  ssr: false,
  loading: () => null,
})

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0f172a] relative overflow-hidden">
      <LoginScene />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
