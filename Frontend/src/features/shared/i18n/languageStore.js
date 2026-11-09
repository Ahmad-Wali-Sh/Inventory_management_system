// Current language, saved in localStorage.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18next, { LANGUAGES } from './i18n';

export const useLanguageStore = create(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (language) => set({ language }),
    }),
    { name: 'ims-language' }
  )
);

/**
 * Apply a language to the page: tell i18next, and set <html lang dir>.
 * dir="rtl" makes the browser (and Tailwind's ms-/me-/start-/end- classes)
 * flip the layout for Persian.
 */
export function applyLanguage(code) {
  const lang = LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
  i18next.changeLanguage(lang.code);
  document.documentElement.lang = lang.code;
  document.documentElement.dir = lang.dir;
}