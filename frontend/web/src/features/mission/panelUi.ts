import { create } from 'zustand'

/** Sections of the Mission and Earth link panel. */
export type MissionPanelTab = 'mission' | 'link' | 'weather'

interface MissionPanelUi {
  open: boolean
  tab: MissionPanelTab
  /** Opens the panel, on `tab` when given (otherwise on the last section used). */
  openPanel: (tab?: MissionPanelTab) => void
  setTab: (tab: MissionPanelTab) => void
  close: () => void
}

/** UI-only state so other features (timeline markers, tour) can open the panel on the right section. */
export const useMissionPanelUi = create<MissionPanelUi>()((set) => ({
  open: false,
  tab: 'mission',
  openPanel: (tab) => set((s) => ({ open: true, tab: tab ?? s.tab })),
  setTab: (tab) => set({ tab }),
  close: () => set({ open: false }),
}))
