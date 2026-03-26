'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('bmg-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldBeDark = stored === 'dark' || (!stored && prefersDark)
    setIsDark(shouldBeDark)
    document.documentElement.classList.toggle('dark', shouldBeDark)
  }, [])

  const toggle = () => {
    const newValue = !isDark
    setIsDark(newValue)
    localStorage.setItem('bmg-theme', newValue ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', newValue)
  }

  // Avoid hydration mismatch — render a neutral placeholder until mounted
  if (!mounted) {
    return (
      <div className="p-1.5 w-8 h-8 rounded-lg" aria-hidden />
    )
  }

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
