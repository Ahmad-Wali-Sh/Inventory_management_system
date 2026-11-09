// Toast (small popup message) store.
// Use it anywhere:
//   import { toast } from '../shared/stores/toastStore'; // path from your file
//   toast.success('Saved!');   toast.error('Oops');
// The <Toaster /> component (in App.jsx) shows the messages.
import { create } from 'zustand';

let nextId = 1;

export const useToastStore = create((set, get) => ({
  toasts: [], // [{ id, type, message }]

  show: (type, message, duration = 3000) => {
    const id = nextId++;
    set({ toasts: [...get().toasts, { id, type, message }] });
    setTimeout(() => get().dismiss(id), duration); // auto-hide
  },

  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

// Short helpers so callers don't need the hook.
export const toast = {
  success: (message) => useToastStore.getState().show('success', message),
  error: (message) => useToastStore.getState().show('error', message),
  info: (message) => useToastStore.getState().show('info', message),
};