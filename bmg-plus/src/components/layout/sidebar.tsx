'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'motion/react'
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Star,
  Search,
  Phone,
  PauseCircle,
  BarChart3,
  Settings,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useRole } from '@/hooks/use-role'
import { useUIStore } from '@/stores/ui-store'
import { getInitials } from '@/lib/utils/format'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

interface NavSection {
  title: string
  items: NavItem[]
}

export function Sidebar() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const { canSupervise, canAdmin } = useRole()
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)

  const iconSize = 18

  const buildSections = useCallback((): NavSection[] => {
    const sections: NavSection[] = [
      {
        title: 'Principal',
        items: [
          { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={iconSize} /> },
          { label: 'Gestion', href: '/gestion', icon: <Users size={iconSize} /> },
          { label: 'Ventas', href: '/ventas', icon: <DollarSign size={iconSize} /> },
        ],
      },
    ]

    if (canSupervise) {
      sections.push({
        title: 'Supervision',
        items: [
          { label: 'Calidad', href: '/calidad', icon: <Star size={iconSize} /> },
          { label: 'Auditoria', href: '/auditoria', icon: <Search size={iconSize} /> },
          { label: 'Llamadas', href: '/llamadas', icon: <Phone size={iconSize} /> },
          { label: 'Pausas', href: '/pausas', icon: <PauseCircle size={iconSize} /> },
        ],
      })

      sections.push({
        title: 'Analisis',
        items: [
          { label: 'Reportes', href: '/reportes', icon: <BarChart3 size={iconSize} /> },
        ],
      })
    }

    if (canAdmin) {
      sections.push({
        title: 'Sistema',
        items: [
          { label: 'Admin', href: '/admin', icon: <Settings size={iconSize} /> },
        ],
      })
    }

    return sections
  }, [canSupervise, canAdmin])

  const sections = buildSections()

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const roleLabel = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : ''

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 260 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="fixed top-0 left-0 h-screen z-40 flex flex-col bg-linear-to-b from-[#0f172a] to-[#1e293b] overflow-hidden"
      style={{ willChange: 'width' }}
    >
      {/* Logo area */}
      <div className="flex items-center gap-3 px-4 h-14 shrink-0">
        <div className="w-8 h-8 bg-linear-to-br from-blue-600 to-blue-500 rounded-lg flex items-center justify-center shrink-0">
          <span className="text-white font-extrabold text-xs">B+</span>
        </div>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.15 }}
          >
            <div className="font-bold text-sm text-white leading-tight">BMG+</div>
            <div className="text-[10px] text-slate-500 leading-tight tracking-wider">ZURICH BPO</div>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-5 scrollbar-thin scrollbar-thumb-slate-700">
        {sections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <div className="text-label-sm text-slate-500 px-3 mb-2 tracking-wide">
                {section.title}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`
                      flex items-center gap-3 rounded-lg transition-colors duration-150
                      ${collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2'}
                      ${
                        active
                          ? 'bg-linear-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/20'
                          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                      }
                    `}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {!collapsed && (
                      <span className={`text-sm ${active ? 'font-medium' : ''} truncate`}>
                        {item.label}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center h-10 mx-2 mb-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
        title={collapsed ? 'Expandir menu' : 'Colapsar menu'}
      >
        {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
      </button>

      {/* User section */}
      {user && (
        <div className="shrink-0 px-2 pb-3">
          <div
            className={`flex items-center gap-3 rounded-lg p-2 ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? `${user.full_name} - ${roleLabel}` : undefined}
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <span className="text-white text-xs font-semibold">
                  {getInitials(user.full_name)}
                </span>
              )}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white font-medium truncate leading-tight">
                  {user.full_name}
                </div>
                <div className="text-[11px] text-slate-500 truncate leading-tight">
                  {roleLabel}
                </div>
              </div>
            )}
          </div>

          {/* Sign out */}
          <button
            onClick={signOut}
            title={collapsed ? 'Cerrar sesion' : undefined}
            className={`
              flex items-center gap-3 w-full rounded-lg p-2 mt-1 text-slate-500 hover:text-red-400 hover:bg-white/5 transition-colors
              ${collapsed ? 'justify-center' : ''}
            `}
          >
            <LogOut size={16} className="shrink-0" />
            {!collapsed && <span className="text-sm">Cerrar sesion</span>}
          </button>
        </div>
      )}
    </motion.aside>
  )
}
