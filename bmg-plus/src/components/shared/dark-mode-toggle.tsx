'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { Sun, Moon } from 'lucide-react'

// Shared mutable store for dark-mode state
let listeners: Array<() => void> = []
function emitChange() { for (const l of listeners) l() }

function subscribe(onStoreChange: () => void) {
  listeners = [...listeners, onStoreChange]
  return () => { listeners = listeners.filter((l) => l !== onStoreChange) }
}

function getSnapshot(): boolean {
  return document.documentElement.classList.contains('dark')
}

function getServerSnapshot(): boolean {
  return false
}

/** Initialise dark-mode on first client render (runs once). */
let initialised = false
function ensureInit() {
  if (initialised || typeof window === 'undefined') return
  initialised = true
  const stored = localStorage.getItem('bmg-theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const shouldBeDark = stored === 'dark' || (!stored && prefersDark)
  document.documentElement.classList.toggle('dark', shouldBeDark)
}

export function DarkModeToggle() {
  ensureInit()
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const toggle = useCallback(() => {
    const newValue = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', newValue)
    localStorage.setItem('bmg-theme', newValue ? 'dark' : 'light')
    emitChange()
  }, [])

  return (
    <button
      onClick={toggle}
      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-white/10 transition-colors"
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
