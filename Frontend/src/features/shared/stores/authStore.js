// Auth store: who is logged in.
//
// For now login is FAKE (no backend call). When the backend has
// POST /api/auth/login, only the `login` function below needs to change:
//
//   const { data } = await axiosClient.post('/auth/login', { username, password });
//   set({ user: data.user, token: data.token });
//
// (Import axiosClient inside the function to avoid a circular import.)
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,  // { username, role }
      token: null, // JWT later

      login: async ({ username, password }) => {
        // TODO(students): replace with a real API call.
        if (!username || !password) throw new Error('Username and password are required');
        set({ user: { username, role: 'admin' }, token: 'fake-token' });
      },

      logout: () => set({ user: null, token: null }),
    }),
    { name: 'ims-auth' }
  )
);