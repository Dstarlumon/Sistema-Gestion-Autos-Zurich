'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { useIsMobile, useIsTablet } from '@/hooks/use-media-query'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { CommandPalette } from '@/components/shared/command-palette'
import { PageTransition } from '@/components/shared/page-transition'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const isLoading = useAuthStore((s) => s.isLoading)
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()

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
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 bg-linear-to-br from-blue-600 to-blue-500 rounded-xl flex items-center justify-center animate-pulse">
            <span className="text-white font-extrabold text-sm">B+</span>
          </div>
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0ms]" />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:150ms]" />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
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
    </div>
  )
}
