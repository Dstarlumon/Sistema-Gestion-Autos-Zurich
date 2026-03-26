'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/stores/ui-store'

export function useKeyboardShortcuts(onOpenCommandPalette: () => void) {
  const router = useRouter()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore shortcuts when typing in inputs, textareas, or contenteditable
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Still allow Ctrl/Cmd+K even in inputs (command palette)
        const mod = e.metaKey || e.ctrlKey
        if (mod && e.key === 'k') {
          e.preventDefault()
          onOpenCommandPalette()
        }
        return
      }

      const mod = e.metaKey || e.ctrlKey

      // Ctrl/Cmd + K: Command palette
      if (mod && e.key === 'k') {
        e.preventDefault()
        onOpenCommandPalette()
        return
      }

      // Ctrl/Cmd + D: Dashboard
      if (mod && e.key === 'd') {
        e.preventDefault()
        router.push('/dashboard')
        return
      }

      // Ctrl/Cmd + N: Nueva gestion (go to gestion)
      if (mod && e.key === 'n') {
        e.preventDefault()
        router.push('/gestion')
        return
      }

      // Ctrl/Cmd + B: Toggle sidebar
      if (mod && e.key === 'b') {
        e.preventDefault()
        useUIStore.getState().toggleSidebar()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router, onOpenCommandPalette])
}
