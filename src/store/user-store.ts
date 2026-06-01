import { create } from 'zustand'

interface UserProfile {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  total_xp: number
  streak_count: number
  streak_shields: number
}

interface UserState {
  user: UserProfile | null
  setUser: (user: UserProfile | null) => void
  addXp: (amount: number) => void
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  addXp: (amount) =>
    set((state) =>
      state.user
        ? { user: { ...state.user, total_xp: state.user.total_xp + amount } }
        : {}
    ),
}))
