'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  CommandDialog,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Star,
  Phone,
  PauseCircle,
  BarChart3,
  Settings,
  Search,
  Plus,
  Upload,
  Download,
  User,
  MessageSquare,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface LeadResult {
  id: string
  full_name: string
  phone: string | null
  status: string
  campaigns: { name: string }[] | null
}

const navigationItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, shortcut: 'Ctrl+D' },
  { label: 'Gestion', href: '/gestion', icon: Users, shortcut: 'Ctrl+N' },
  { label: 'Ventas', href: '/ventas', icon: DollarSign },
  { label: 'Calidad', href: '/calidad', icon: Star },
  { label: 'WhatsApp', href: '/whatsapp', icon: MessageSquare },
  { label: 'Llamadas', href: '/llamadas', icon: Phone },
  { label: 'Pausas', href: '/pausas', icon: PauseCircle },
  { label: 'Auditoria', href: '/auditoria', icon: Search },
  { label: 'Reportes', href: '/reportes', icon: BarChart3 },
  { label: 'Admin', href: '/admin', icon: Settings },
]

const actionItems = [
  { label: 'Nueva gestion', href: '/gestion', icon: Plus },
  { label: 'Cargar base', href: '/admin/bases', icon: Upload },
  { label: 'Exportar datos', href: '/reportes', icon: Download },
]

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [leads, setLeads] = useState<LeadResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced lead search
  const searchLeads = useCallback(async (query: string) => {
    if (query.length < 2) {
      setLeads([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    try {
      const supabase = createClient()

      // Search by name (ilike) or phone (ilike)
      const { data, error } = await supabase
        .from('leads')
        .select('id, full_name, phone, status, campaigns(name)')
        .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(8)

      if (!error && data) {
        setLeads(data as LeadResult[])
      }
    } catch {
      // Silently fail — command palette search is best-effort
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Debounce the search input
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      searchLeads(searchQuery)
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [searchQuery, searchLeads])

  // Reset state when closing
  useEffect(() => {
    if (!open) {
      setSearchQuery('')
      setLeads([])
    }
  }, [open])

  const handleSelect = (href: string) => {
    onOpenChange(false)
    router.push(href)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Paleta de comandos"
      description="Buscar navegacion, acciones o leads"
    >
      <Command className="rounded-xl">
        <CommandInput
          placeholder="Buscar navegacion, acciones o leads..."
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          <CommandEmpty>
            {isSearching ? 'Buscando...' : 'No se encontraron resultados.'}
          </CommandEmpty>

          {/* Lead search results */}
          {leads.length > 0 && (
            <>
              <CommandGroup heading="Leads">
                {leads.map((lead) => (
                  <CommandItem
                    key={lead.id}
                    value={`lead-${lead.full_name}-${lead.phone ?? ''}`}
                    onSelect={() => handleSelect(`/gestion/${lead.id}`)}
                  >
                    <User className="mr-2 size-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="text-sm">{lead.full_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {lead.phone ?? 'Sin telefono'}
                        {lead.campaigns?.[0]?.name ? ` · ${lead.campaigns[0].name}` : ''}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Navigation group */}
          <CommandGroup heading="Navegacion">
            {navigationItems.map((item) => (
              <CommandItem
                key={item.href}
                value={item.label}
                onSelect={() => handleSelect(item.href)}
              >
                <item.icon className="mr-2 size-4 text-muted-foreground" />
                <span>{item.label}</span>
                {item.shortcut && (
                  <CommandShortcut>{item.shortcut}</CommandShortcut>
                )}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          {/* Actions group */}
          <CommandGroup heading="Acciones">
            {actionItems.map((item) => (
              <CommandItem
                key={`action-${item.label}`}
                value={`accion-${item.label}`}
                onSelect={() => handleSelect(item.href)}
              >
                <item.icon className="mr-2 size-4 text-muted-foreground" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
