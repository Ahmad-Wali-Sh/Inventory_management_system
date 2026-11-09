// Theme store (light / dark).
// `persist` saves the state in localStorage, so the choice survives a reload.
// The first time, we start from the operating-system setting.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const systemTheme = () =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

export const useThemeStore = create(
  persist(
    (set) => ({
      theme: systemTheme(),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'ims-theme' } // localStorage key
  )
);