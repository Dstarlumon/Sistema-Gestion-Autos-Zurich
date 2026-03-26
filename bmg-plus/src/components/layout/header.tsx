'use client'

import { useState, useEffect } from 'react'
import {
  Menu,
  Search,
  Bell,
  Clock,
  ChevronDown,
  User,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useUIStore } from '@/stores/ui-store'
import { useCampaignStore } from '@/stores/campaign-store'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/utils/format'
import { DarkModeToggle } from '@/components/shared/dark-mode-toggle'

interface Campaign {
  id: string
  name: string
  slug: string
  color: string | null
}

interface HeaderProps {
  onOpenCommandPalette?: () => void
}

export function Header({ onOpenCommandPalette }: HeaderProps) {
  const { user, signOut } = useAuth()
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const { activeCampaignId, setActiveCampaign } = useCampaignStore()

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [clock, setClock] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  // Fetch campaigns on mount
  useEffect(() => {
    const supabase = createClient()
    const fetchCampaigns = async () => {
      const { data } = await supabase
        .from('campaigns')
        .select('id, name, slug, color')
        .eq('is_active', true)
        .order('name')
      if (data) setCampaigns(data)
    }
    fetchCampaigns()
  }, [])

  // Clock: Colombia time, updates every minute
  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      setClock(
        now.toLocaleTimeString('es-CO', {
          timeZone: 'America/Bogota',
          hour: '2-digit',
          minute: '2-digit',
        })
      )
    }
    updateClock()
    const interval = setInterval(updateClock, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return
    const handleClick = () => setUserMenuOpen(false)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [userMenuOpen])

  const roleLabel = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : ''

  return (
    <header className="sticky top-0 z-30 h-14 bg-white dark:bg-card shadow-ambient flex items-center px-5 gap-4">
      {/* Left: toggle + breadcrumb */}
      <button
        onClick={toggleSidebar}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        aria-label="Toggle sidebar"
      >
        <Menu size={20} />
      </button>

      <span className="text-sm text-slate-400 hidden sm:block">Dashboard</span>

      {/* Search — opens command palette */}
      <div className="flex-1 max-w-md mx-4">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="w-full h-8 flex items-center gap-2 pl-3 pr-3 rounded-lg bg-slate-50 dark:bg-white/5 text-sm text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-left cursor-pointer"
        >
          <Search size={15} className="shrink-0" />
          <span className="flex-1 truncate">Buscar leads, acciones...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Campaign switcher */}
        <select
          value={activeCampaignId ?? ''}
          onChange={(e) => setActiveCampaign(e.target.value || null)}
          className="h-8 px-3 rounded-lg bg-slate-50 text-xs text-slate-600 border-0 focus:outline-none focus:ring-2 focus:ring-[#66cfd0]/20 cursor-pointer"
        >
          <option value="">Todas las campanias</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Dark mode toggle */}
        <DarkModeToggle />

        {/* Notifications */}
        <button
          className="relative p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-white/10 transition-colors"
          aria-label="Notificaciones"
          title="Notificaciones"
        >
          <Bell size={18} />
          {/* Badge - hardcoded 0 for now, hidden when 0 */}
        </button>

        {/* Clock */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400" title="Hora Colombia">
          <Clock size={14} />
          <span className="tabular-nums">{clock}</span>
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setUserMenuOpen((prev) => !prev)
            }}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-linear-to-br from-[#fa5058] to-[#66cfd0] flex items-center justify-center shrink-0">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user?.full_name ?? ''}
                  className="w-7 h-7 rounded-full object-cover"
                />
              ) : (
                <span className="text-white text-[10px] font-semibold">
                  {user ? getInitials(user.full_name) : ''}
                </span>
              )}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-medium text-slate-700 leading-tight truncate max-w-30">
                {user?.full_name}
              </div>
              <div className="text-[10px] text-slate-400 leading-tight">{roleLabel}</div>
            </div>
            <ChevronDown size={14} className="text-slate-400 hidden lg:block" />
          </button>

          {/* Dropdown */}
          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-white shadow-ambient py-1 z-50">
              <button
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <User size={15} />
                Perfil
              </button>
              <button
                onClick={() => {
                  setUserMenuOpen(false)
                  signOut()
                }}
                className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut size={15} />
                Cerrar sesion
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
