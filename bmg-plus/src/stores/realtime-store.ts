import { create } from 'zustand'

interface AgentStatus {
  id: string
  full_name: string
  status: string
  updated_at: string
}

interface RealtimeStore {
  agentStatuses: Map<string, AgentStatus>
  updateAgentStatus: (id: string, status: AgentStatus) => void
  notificationCount: number
  incrementNotifications: () => void
  resetNotifications: () => void
}

export const useRealtimeStore = create<RealtimeStore>((set) => ({
  agentStatuses: new Map(),
  updateAgentStatus: (id, status) =>
    set((state) => {
      const updated = new Map(state.agentStatuses)
      updated.set(id, status)
      return { agentStatuses: updated }
    }),
  notificationCount: 0,
  incrementNotifications: () =>
    set((state) => ({ notificationCount: state.notificationCount + 1 })),
  resetNotifications: () => set({ notificationCount: 0 }),
}))
