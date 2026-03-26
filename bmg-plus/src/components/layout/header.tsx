'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Menu,
  Search,
  Bell,
  Clock,
  ChevronDown,
  ChevronRight,
  User,
  LogOut,
  Check,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useUIStore } from '@/stores/ui-store'
import { useCampaignStore } from '@/stores/campaign-store'
import { useRealtimeStore } from '@/stores/realtime-store'
import { useRealtime } from '@/hooks/use-realtime'
import { useIsMobile } from '@/hooks/use-media-query'
import { createClient } from '@/lib/supabase/client'
import { getInitials, formatTime } from '@/lib/utils/format'
import { DarkModeToggle } from '@/components/shared/dark-mode-toggle'
import { cn } from '@/lib/utils'
import type { Notification } from '@/stores/realtime-store'

interface Campaign {
  id: string
  name: string
  slug: string
  color: string | null
}

interface HeaderProps {
  onOpenCommandPalette?: () => void
}

/** Map pathname segments to human-readable labels */
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  gestion: 'Gestion de Leads',
  ventas: 'Ventas',
  calidad: 'Calidad',
  auditoria: 'Auditoria',
  llamadas: 'Llamadas',
  pausas: 'Pausas',
  reportes: 'Reportes',
  admin: 'Admin',
  usuarios: 'Usuarios',
  bases: 'Bases',
  whatsapp: 'WhatsApp',
  configuracion: 'Configuracion',
}

function buildBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return [{ label: 'Dashboard', href: '/dashboard' }]

  return segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/')
    const knownLabel = SEGMENT_LABELS[segment]
    // If not in the map, check if it looks like a UUID/ID — show as "Lead #<short>"
    const label = knownLabel
      ? knownLabel
      : segment.length >= 8
        ? `#${segment.slice(0, 8)}`
        : segment.charAt(0).toUpperCase() + segment.slice(1)
    return { label, href }
  })
}

export function Header({ onOpenCommandPalette }: HeaderProps) {
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const setMobileDrawerOpen = useUIStore((s) => s.setMobileDrawerOpen)
  const { activeCampaignId, setActiveCampaign } = useCampaignStore()
  const isMobile = useIsMobile()

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [clock, setClock] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifMenuOpen, setNotifMenuOpen] = useState(false)
  const notifMenuRef = useRef<HTMLDivElement>(null)

  // Realtime store for notifications
  const notificationCount = useRealtimeStore((s) => s.notificationCount)
  const notifications = useRealtimeStore((s) => s.notifications)
  const setNotificationCount = useRealtimeStore((s) => s.setNotificationCount)
  const setNotifications = useRealtimeStore((s) => s.setNotifications)
  const addNotification = useRealtimeStore((s) => s.addNotification)
  const markNotificationRead = useRealtimeStore((s) => s.markNotificationRead)

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

  // Fetch unread notifications on mount
  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    const fetchNotifications = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      setNotificationCount(count || 0)

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
      if (data) {
        setNotifications(data as Notification[])
      }
    }
    fetchNotifications()
  }, [user, setNotificationCount, setNotifications])

  // Subscribe to realtime INSERT on notifications for current user
  useRealtime({
    table: 'notifications',
    event: 'INSERT',
    filter: user ? `user_id=eq.${user.id}` : undefined,
    enabled: !!user,
    onData: useCallback(
      (payload) => {
        const newNotif = payload.new as unknown as Notification | undefined
        if (newNotif) {
          addNotification(newNotif)
        }
      },
      [addNotification],
    ),
  })

  // Mark notification as read handler
  const handleMarkRead = useCallback(
    async (notifId: string) => {
      markNotificationRead(notifId)
      const supabase = createClient()
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notifId)
    },
    [markNotificationRead],
  )

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

  // Close notification menu on outside click
  useEffect(() => {
    if (!notifMenuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setNotifMenuOpen(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [notifMenuOpen])

  const roleLabel = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : ''

  const handleMenuClick = () => {
    if (isMobile) {
      setMobileDrawerOpen(true)
    } else {
      toggleSidebar()
    }
  }

  return (
    <header className="sticky top-0 z-30 h-14 bg-white dark:bg-card shadow-ambient flex items-center px-3 sm:px-5 gap-2 sm:gap-4">
      {/* Left: toggle + breadcrumb */}
      <button
        onClick={handleMenuClick}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        aria-label="Toggle sidebar"
      >
        <Menu size={20} />
      </button>

      <nav className="hidden sm:flex items-center gap-1 text-sm text-slate-400" aria-label="Breadcrumb">
        {buildBreadcrumbs(pathname).map((crumb, index, arr) => (
          <span key={crumb.href} className="inline-flex items-center gap-1">
            {index > 0 && <ChevronRight size={12} className="text-slate-300" />}
            {index === arr.length - 1 ? (
              <span className="text-slate-600 dark:text-slate-200 font-medium">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* Search — full bar on desktop, icon button on mobile */}
      <div className="flex-1 max-w-md mx-2 sm:mx-4">
        {/* Desktop search */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="hidden sm:flex w-full h-8 items-center gap-2 pl-3 pr-3 rounded-lg bg-slate-50 dark:bg-white/5 text-sm text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-left cursor-pointer"
        >
          <Search size={15} className="shrink-0" />
          <span className="flex-1 truncate">Buscar leads, acciones...</span>
          <kbd className="hidden md:inline-flex items-center gap-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
            Ctrl K
          </kbd>
        </button>
        {/* Mobile search icon */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="sm:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Buscar"
        >
          <Search size={20} />
        </button>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-2 sm:gap-3 ml-auto">
        {/* Campaign switcher — hidden on mobile */}
        <select
          value={activeCampaignId ?? ''}
          onChange={(e) => setActiveCampaign(e.target.value || null)}
          className="hidden lg:block h-8 px-3 rounded-lg bg-slate-50 text-xs text-slate-600 border-0 focus:outline-none focus:ring-2 focus:ring-[#66cfd0]/20 cursor-pointer"
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
        <div className="relative" ref={notifMenuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setNotifMenuOpen((prev) => !prev)
            }}
            className="relative p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-white/10 transition-colors"
            aria-label="Notificaciones"
            title="Notificaciones"
          >
            <Bell size={18} />
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[0.55rem] font-bold leading-none">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {notifMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl bg-white dark:bg-card shadow-ambient z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Notificaciones
                </h3>
                {notificationCount > 0 && (
                  <span className="text-[0.65rem] text-slate-400">
                    {notificationCount} sin leer
                  </span>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-slate-400">Sin notificaciones</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 border-b border-slate-50 dark:border-slate-800/50 last:border-0 transition-colors',
                        !notif.is_read
                          ? 'bg-blue-50/50 dark:bg-blue-950/20'
                          : 'hover:bg-slate-50 dark:hover:bg-white/5',
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                          {notif.title}
                        </p>
                        <p className="text-[0.7rem] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                          {notif.message}
                        </p>
                        <p className="text-[0.6rem] text-slate-400 mt-1 tabular-nums">
                          {notif.created_at ? formatTime(notif.created_at) : ''}
                        </p>
                      </div>
                      {!notif.is_read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMarkRead(notif.id)
                          }}
                          className="shrink-0 p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                          title="Marcar como leida"
                        >
                          <Check size={14} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Clock — hidden on mobile and tablet */}
        <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-400" title="Hora Colombia">
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
