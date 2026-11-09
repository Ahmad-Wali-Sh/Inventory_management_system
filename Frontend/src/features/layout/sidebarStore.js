// Sidebar state.
// - collapsed:  desktop only, sidebar shows icons only (saved in localStorage)
// - mobileOpen: mobile only, sidebar slides in over the page (not saved)
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSidebarStore = create(
  persist(
    (set) => ({
      collapsed: false,
      mobileOpen: false,
      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
      setMobileOpen: (mobileOpen) => set({ mobileOpen }),
    }),
    {
      name: 'ims-sidebar',
      partialize: (state) => ({ collapsed: state.collapsed }), // only save `collapsed`
    }
  )
);