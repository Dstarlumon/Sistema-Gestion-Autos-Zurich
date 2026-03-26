'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { useIsMobile, useIsTablet } from '@/hooks/use-media-query'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { CommandPalette } from '@/components/shared/command-palette'
import { PageTransition } from '@/components/shared/page-transition'
import { OnboardingTour } from '@/components/shared/onboarding-tour'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { LoadingAnimation } from '@/components/lottie/animations'
import type { UserProfile } from '@/types/auth.types'

interface AppShellProps {
  children: React.ReactNode
  initialProfile: UserProfile
}

export default function AppShell({ children, initialProfile }: AppShellProps) {
  const isLoading = useAuthStore((s) => s.isLoading)
  const setUser = useAuthStore((s) => s.setUser)
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()

  // Hydrate auth store with server-fetched profile
  useEffect(() => {
    if (initialProfile) {
      setUser(initialProfile)
    }
  }, [initialProfile, setUser])

  const openCommandPalette = useCallback(() => {
    setCommandPaletteOpen(true)
  }, [])

  useKeyboardShortcuts(openCommandPalette)

  // Auto-collapse sidebar on tablet
  useEffect(() => {
    if (isTablet && !collapsed) {
      setSidebarCollapsed(true)
    }
  }, [isTablet, collapsed, setSidebarCollapsed])

  // Compute margin: 0 on mobile (sidebar is a drawer), 64 collapsed, 260 expanded
  const sidebarMargin = isMobile ? 0 : collapsed ? 64 : 260

  // Loading skeleton while auth initializes
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <LoadingAnimation size={100} />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div
        className="flex-1 flex flex-col min-h-screen transition-[margin-left] duration-200 ease-in-out"
        style={{ marginLeft: sidebarMargin }}
      >
        <Header onOpenCommandPalette={openCommandPalette} />
        <main className="flex-1 p-3 sm:p-5 bg-surface-container-low overflow-y-auto">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      {/* Global command palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />

      {/* Onboarding tour for first-time users */}
      <OnboardingTour />
    </div>
  )
}
