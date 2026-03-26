import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CampaignStore {
  activeCampaignId: string | null // null = "all campaigns"
  setActiveCampaign: (id: string | null) => void
}

export const useCampaignStore = create<CampaignStore>()(
  persist(
    (set) => ({
      activeCampaignId: null,
      setActiveCampaign: (id) => set({ activeCampaignId: id }),
    }),
    { name: 'bmg-campaign' }
  )
)
