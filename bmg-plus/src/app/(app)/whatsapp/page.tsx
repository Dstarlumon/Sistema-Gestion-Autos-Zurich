'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/shared/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/stores/auth-store'
import { formatPhone, formatTime, getInitials } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Conversation {
  id: string
  contact_name: string | null
  contact_phone: string | null
  status: string | null
  unread_count: number | null
  last_message_at: string | null
  agent_id: string | null
  external_id: string | null
}

interface Message {
  id: string
  conversation_id: string
  direction: string
  content: string | null
  media_url: string | null
  media_type: string | null
  status: string | null
  created_at: string | null
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function WhatsAppPage() {
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null)

  return (
    <div className="space-y-5">
      <PageHeader
        title="WhatsApp Callbell"
        subtitle="Conversaciones con clientes"
      />

      {/* Callbell integration banner */}
      <CallbellBanner />

      {/* Chat layout */}
      <div
        className="flex rounded-xl overflow-hidden shadow-ambient bg-surface-container-lowest"
        style={{ height: 'calc(100vh - 240px)', minHeight: 500 }}
      >
        {/* Left panel: conversation list */}
        <ConversationList
          selectedId={selectedConversation?.id ?? null}
          onSelect={setSelectedConversation}
        />

        {/* Right panel: chat area */}
        <ChatArea conversation={selectedConversation} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Callbell Banner
// ---------------------------------------------------------------------------

function CallbellBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200/60 px-4 py-3 dark:bg-emerald-950/30 dark:border-emerald-800/40"
    >
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 shrink-0">
        <svg
          className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
          />
        </svg>
      </div>
      <p className="text-body-md text-emerald-800 dark:text-emerald-200">
        Conecta tu API Callbell en{' '}
        <span className="font-semibold">
          Configuracion &rarr; API Key
        </span>{' '}
        para sincronizar conversaciones en tiempo real
      </p>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Conversation List (left panel)
// ---------------------------------------------------------------------------

function ConversationList({
  selectedId,
  onSelect,
}: {
  selectedId: string | null
  onSelect: (conv: Conversation) => void
}) {
  const supabase = createClient()
  const [search, setSearch] = useState('')

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['whatsapp-conversations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('last_message_at', { ascending: false })

      if (error) throw error
      return (data || []) as Conversation[]
    },
    refetchInterval: 30000,
  })

  const filtered = useMemo(() => {
    if (!conversations) return []
    if (!search.trim()) return conversations
    const q = search.toLowerCase()
    return conversations.filter(
      (c) =>
        (c.contact_name?.toLowerCase() || '').includes(q) ||
        (c.contact_phone || '').includes(q)
    )
  }, [conversations, search])

  return (
    <div className="w-80 shrink-0 border-r border-outline-variant/20 flex flex-col bg-surface-container-low/50">
      {/* Search header */}
      <div className="p-3 border-b border-outline-variant/20">
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <Input
            placeholder="Buscar conversacion..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm bg-surface-container-lowest"
          />
        </div>
      </div>

      {/* Conversation items */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-1 p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mb-3">
              <svg
                className="w-6 h-6 text-on-surface-variant"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
                />
              </svg>
            </div>
            <p className="text-body-md text-on-surface-variant text-center">
              Sin conversaciones
            </p>
            <p className="text-[0.7rem] text-on-surface-variant/70 text-center mt-1">
              Conecta Callbell para ver tus chats
            </p>
          </div>
        ) : (
          <div className="p-1.5 space-y-0.5">
            {filtered.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isSelected={selectedId === conv.id}
                onSelect={() => onSelect(conv)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Conversation Item
// ---------------------------------------------------------------------------

function ConversationItem({
  conversation,
  isSelected,
  onSelect,
}: {
  conversation: Conversation
  isSelected: boolean
  onSelect: () => void
}) {
  const name = conversation.contact_name || 'Sin nombre'
  const phone = conversation.contact_phone
    ? formatPhone(conversation.contact_phone)
    : ''
  const unread = conversation.unread_count || 0
  const timeStr = conversation.last_message_at
    ? formatTime(conversation.last_message_at)
    : ''

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
        isSelected
          ? 'bg-surface-container'
          : 'hover:bg-surface-container/50'
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            {getInitials(name)}
          </span>
        </div>
        {conversation.status === 'open' && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-surface-container-lowest" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-body-md font-medium text-on-surface truncate">
            {name}
          </span>
          {timeStr && (
            <span className="text-[0.6rem] text-on-surface-variant shrink-0 ml-2 tabular-nums">
              {timeStr}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[0.7rem] text-on-surface-variant truncate">
            {phone}
          </span>
          {unread > 0 && (
            <span className="shrink-0 ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[0.6rem] font-bold">
              {unread}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Chat Area (right panel)
// ---------------------------------------------------------------------------

function ChatArea({ conversation }: { conversation: Conversation | null }) {
  if (!conversation) {
    return <ChatEmptyState />
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Chat header */}
      <ChatHeader conversation={conversation} />

      {/* Messages */}
      <ChatMessages conversationId={conversation.id} />

      {/* Input bar */}
      <ChatInputBar />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Chat Empty State
// ---------------------------------------------------------------------------

function ChatEmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-surface-container-low/30">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center"
      >
        <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center mb-4">
          <svg
            className="w-10 h-10 text-on-surface-variant/50"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
            />
          </svg>
        </div>
        <p className="text-title-md text-on-surface-variant">
          Selecciona una conversacion
        </p>
        <p className="text-body-md text-on-surface-variant/70 mt-1">
          Elige un chat de la lista para comenzar
        </p>
      </motion.div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Chat Header
// ---------------------------------------------------------------------------

function ChatHeader({ conversation }: { conversation: Conversation }) {
  const name = conversation.contact_name || 'Sin nombre'
  const phone = conversation.contact_phone
    ? formatPhone(conversation.contact_phone)
    : ''

  return (
    <div className="flex items-center gap-3 px-5 py-3 border-b border-outline-variant/20 bg-surface-container-lowest">
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          {getInitials(name)}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-body-md font-semibold text-on-surface truncate">
          {name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[0.7rem] text-on-surface-variant">
            {phone}
          </span>
          {conversation.status === 'open' && (
            <span className="inline-flex items-center gap-1 text-[0.6rem] font-medium text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Activo
            </span>
          )}
          {conversation.status === 'closed' && (
            <span className="text-[0.6rem] font-medium text-on-surface-variant">
              Cerrado
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Chat Messages
// ---------------------------------------------------------------------------

function ChatMessages({ conversationId }: { conversationId: string }) {
  const supabase = createClient()

  const { data: messages, isLoading } = useQuery({
    queryKey: ['whatsapp-messages', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data || []) as Message[]
    },
    refetchInterval: 15000,
  })

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 bg-surface-container-low/30 space-y-3">
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-3/5 rounded-xl" />
          <Skeleton className="h-12 w-2/5 rounded-xl ml-auto" />
          <Skeleton className="h-12 w-1/2 rounded-xl" />
        </div>
      ) : !messages || messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-body-md text-on-surface-variant/70">
            No hay mensajes en esta conversacion
          </p>
          <p className="text-[0.7rem] text-on-surface-variant/50 mt-1">
            Los mensajes apareceran cuando conectes Callbell
          </p>
        </div>
      ) : (
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <MessageBubble key={msg.id} message={msg} index={i} />
          ))}
        </AnimatePresence>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Message Bubble
// ---------------------------------------------------------------------------

function MessageBubble({ message, index }: { message: Message; index: number }) {
  const isAgent = message.direction === 'outbound'
  const timeStr = message.created_at ? formatTime(message.created_at) : ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.2 }}
      className={cn('flex', isAgent ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-xs sm:max-w-sm md:max-w-md rounded-2xl px-4 py-2.5 relative',
          isAgent
            ? 'gradient-primary text-white rounded-br-md'
            : 'bg-surface-container text-on-surface rounded-bl-md'
        )}
      >
        {message.content && (
          <p className="text-[0.8rem] leading-relaxed whitespace-pre-wrap wrap-break-word">
            {message.content}
          </p>
        )}

        {message.media_url && (
          <div className="mt-1.5">
            <div className="flex items-center gap-1.5 text-[0.7rem] opacity-80">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13"
                />
              </svg>
              <span>{message.media_type || 'Archivo adjunto'}</span>
            </div>
          </div>
        )}

        {/* Timestamp */}
        <div
          className={cn(
            'flex items-center gap-1 mt-1',
            isAgent ? 'justify-end' : 'justify-start'
          )}
        >
          <span
            className={cn(
              'text-[0.6rem] tabular-nums',
              isAgent ? 'text-white/70' : 'text-on-surface-variant/70'
            )}
          >
            {timeStr}
          </span>
          {/* Read status for agent messages */}
          {isAgent && message.status && (
            <span
              className={cn(
                'text-[0.55rem]',
                message.status === 'read'
                  ? 'text-blue-200'
                  : 'text-white/50'
              )}
            >
              {message.status === 'read'
                ? '\u2713\u2713'
                : message.status === 'delivered'
                  ? '\u2713\u2713'
                  : '\u2713'}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Chat Input Bar
// ---------------------------------------------------------------------------

function ChatInputBar() {
  const [text, setText] = useState('')

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-t border-outline-variant/20 bg-surface-container-lowest">
      {/* Attachment button */}
      <Button variant="ghost" size="icon" disabled className="shrink-0">
        <svg
          className="w-5 h-5 text-on-surface-variant"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13"
          />
        </svg>
      </Button>

      {/* Text input */}
      <Input
        placeholder="Escribe un mensaje..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="flex-1 h-10 rounded-full bg-surface-container-low px-4"
        disabled
      />

      {/* Send button */}
      <Button
        size="icon"
        disabled
        className="shrink-0 rounded-full w-10 h-10 gradient-primary"
      >
        <svg
          className="w-5 h-5 text-white"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
          />
        </svg>
      </Button>
    </div>
  )
}
