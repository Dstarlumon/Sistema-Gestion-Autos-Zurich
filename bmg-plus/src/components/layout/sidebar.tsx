'use client'

import { useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, LayoutGroup } from 'motion/react'
import {
  LayoutDashboard,
  Users,
  DollarSign,
  MessageCircle,
  Star,
  Search,
  Phone,
  PauseCircle,
  BarChart3,
  Settings,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  X,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useRole } from '@/hooks/use-role'
import { useUIStore } from '@/stores/ui-store'
import { getInitials } from '@/lib/utils/format'
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

interface NavSection {
  title: string
  items: NavItem[]
}

// ---------------------------------------------------------------------------
// Sidebar content (shared between desktop and mobile)
// ---------------------------------------------------------------------------

function SidebarContent({
  variant,
  collapsed,
  onClose,
}: {
  variant: 'desktop' | 'mobile'
  collapsed: boolean
  onClose?: () => void
}) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const { canSupervise, canAdmin } = useRole()
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
      {
        title: 'Comunicacion',
        items: [
          { label: 'WhatsApp', href: '/whatsapp', icon: <MessageCircle size={iconSize} /> },
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

  // In mobile mode, the sidebar is always expanded
  const isCollapsed = variant === 'mobile' ? false : collapsed

  const handleNavClick = () => {
    if (variant === 'mobile' && onClose) {
      onClose()
    }
  }

  return (
    <div className="flex flex-col h-full bg-linear-to-b from-[#222831] to-[#2d333f] overflow-hidden">
      {/* Logo area */}
      <div className="flex items-center gap-3 px-4 h-14 shrink-0">
        <Image
          src="/images/bmg-plus-icon.svg"
          alt="BMG+"
          width={32}
          height={32}
          className="rounded-lg shrink-0"
        />
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.15 }}
            className="flex-1"
          >
            <div className="font-bold text-sm text-white leading-tight">BMG+</div>
            <div className="text-[10px] text-slate-500 leading-tight tracking-wider">ZURICH BPO</div>
          </motion.div>
        )}
        {variant === 'mobile' && onClose && (
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Cerrar menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-5 scrollbar-thin scrollbar-thumb-slate-700">
        <LayoutGroup>
          {sections.map((section) => (
            <div key={section.title}>
              {!isCollapsed && (
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
                      title={isCollapsed ? item.label : undefined}
                      onClick={handleNavClick}
                      className={`
                        relative flex items-center gap-3 rounded-lg transition-colors duration-150
                        ${isCollapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2'}
                        ${
                          active
                            ? 'text-white'
                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                        }
                      `}
                    >
                      {active && (
                        <motion.div
                          layoutId="sidebar-active"
                          className="absolute inset-0 rounded-lg bg-linear-to-r from-[#fa5058] to-[#66cfd0] shadow-lg shadow-[#fa5058]/20"
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                      )}
                      <span className="relative shrink-0">{item.icon}</span>
                      {!isCollapsed && (
                        <span className={`relative text-sm ${active ? 'font-medium' : ''} truncate`}>
                          {item.label}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </LayoutGroup>
      </nav>

      {/* Collapse toggle — desktop only */}
      {variant === 'desktop' && (
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center h-10 mx-2 mb-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
          title={isCollapsed ? 'Expandir menu' : 'Colapsar menu'}
        >
          {isCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
        </button>
      )}

      {/* User section */}
      {user && (
        <div className="shrink-0 px-2 pb-3">
          <div
            className={`flex items-center gap-3 rounded-lg p-2 ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? `${user.full_name} - ${roleLabel}` : undefined}
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-[#fa5058] to-[#66cfd0] flex items-center justify-center shrink-0">
              {user.avatar_url ? (
                <Image
                  src={user.avatar_url}
                  alt={user.full_name}
                  width={32}
                  height={32}
                  className="rounded-full object-cover"
                  unoptimized
                />
              ) : (
                <span className="text-white text-xs font-semibold">
                  {getInitials(user.full_name)}
                </span>
              )}
            </div>
            {!isCollapsed && (
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
            title={isCollapsed ? 'Cerrar sesion' : undefined}
            className={`
              flex items-center gap-3 w-full rounded-lg p-2 mt-1 text-slate-500 hover:text-red-400 hover:bg-white/5 transition-colors
              ${isCollapsed ? 'justify-center' : ''}
            `}
          >
            <LogOut size={16} className="shrink-0" />
            {!isCollapsed && <span className="text-sm">Cerrar sesion</span>}
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Desktop Sidebar
// ---------------------------------------------------------------------------

function DesktopSidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed)

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 260 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="fixed top-0 left-0 h-screen z-40 hidden md:flex flex-col"
      style={{ willChange: 'width' }}
    >
      <SidebarContent variant="desktop" collapsed={collapsed} />
    </motion.aside>
  )
}

// ---------------------------------------------------------------------------
// Mobile Sidebar (Sheet drawer)
// ---------------------------------------------------------------------------

function MobileSidebar() {
  const open = useUIStore((s) => s.mobileDrawerOpen)
  const setOpen = useUIStore((s) => s.setMobileDrawerOpen)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="left"
        showCloseButton={false}
        className="w-72 p-0 bg-transparent border-0 *:bg-transparent"
      >
        <SidebarContent
          variant="mobile"
          collapsed={false}
          onClose={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Exported Sidebar
// ---------------------------------------------------------------------------

export function Sidebar() {
  return (
    <>
      <DesktopSidebar />
      <MobileSidebar />
    </>
  )
}
