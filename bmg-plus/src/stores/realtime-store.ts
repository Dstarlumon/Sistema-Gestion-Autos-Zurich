import { create } from 'zustand'

interface AgentStatus {
  id: string
  full_name: string
  status: string
  updated_at: string
}

interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  link: string | null
  is_read: boolean
  created_at: string
}

interface RealtimeStore {
  // Agent statuses
  agentStatuses: Map<string, AgentStatus>
  updateAgentStatus: (id: string, status: AgentStatus) => void

  // Notifications
  notificationCount: number
  notifications: Notification[]
  setNotificationCount: (count: number) => void
  incrementNotifications: () => void
  resetNotifications: () => void
  addNotification: (notification: Notification) => void
  markNotificationRead: (id: string) => void
  setNotifications: (notifications: Notification[]) => void

  // Active calls count (for dashboard)
  activeCallsCount: number
  setActiveCallsCount: (count: number) => void

  // Unread messages count (for WhatsApp)
  unreadMessagesCount: number
  setUnreadMessagesCount: (count: number) => void
  incrementUnreadMessages: () => void

  // Dashboard debounce flag
  dashboardStale: boolean
  setDashboardStale: (stale: boolean) => void
}

export const useRealtimeStore = create<RealtimeStore>((set) => ({
  // Agent statuses
  agentStatuses: new Map(),
  updateAgentStatus: (id, status) =>
    set((state) => {
      const updated = new Map(state.agentStatuses)
      updated.set(id, status)
      return { agentStatuses: updated }
    }),

  // Notifications
  notificationCount: 0,
  notifications: [],
  setNotificationCount: (count) => set({ notificationCount: count }),
  incrementNotifications: () =>
    set((state) => ({ notificationCount: state.notificationCount + 1 })),
  resetNotifications: () => set({ notificationCount: 0 }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 20),
      notificationCount: state.notificationCount + 1,
    })),
  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n,
      ),
      notificationCount: Math.max(0, state.notificationCount - 1),
    })),
  setNotifications: (notifications) => set({ notifications }),

  // Active calls
  activeCallsCount: 0,
  setActiveCallsCount: (count) => set({ activeCallsCount: count }),

  // Unread messages
  unreadMessagesCount: 0,
  setUnreadMessagesCount: (count) => set({ unreadMessagesCount: count }),
  incrementUnreadMessages: () =>
    set((state) => ({
      unreadMessagesCount: state.unreadMessagesCount + 1,
    })),

  // Dashboard debounce
  dashboardStale: false,
  setDashboardStale: (stale) => set({ dashboardStale: stale }),
}))

export type { Notification }
