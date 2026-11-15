import { create } from 'zustand'

/**
 * Open state of the crew profile dialog. Kept apart from the domain store and the shared UI
 * store: it only says which astronaut is shown (null = closed).
 */
interface ProfileState {
  openId: string | null
  open: (astronautId: string) => void
  close: () => void
  /** Same astronaut open: close it. Otherwise open (or switch to) this one. */
  toggle: (astronautId: string) => void
}

export const useProfileStore = create<ProfileState>()((set, get) => ({
  openId: null,
  open: (astronautId) => set({ openId: astronautId }),
  close: () => set({ openId: null }),
  toggle: (astronautId) => set({ openId: get().openId === astronautId ? null : astronautId }),
}))
