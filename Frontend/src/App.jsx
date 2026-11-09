// App root.
// - keeps <html> in sync with the theme (class "dark") and language (lang/dir)
// - renders the router and the toast messages
import { useEffect } from 'react';
import { BrowserRouter } from 'react-router';
import AppRouter from './features/router/AppRouter';
import Toaster from './features/shared/components/Toaster';
import { applyLanguage, useLanguageStore } from './features/shared/i18n/languageStore';
import { useThemeStore } from './features/shared/stores/themeStore';

export default function App() {
  const theme = useThemeStore((s) => s.theme);
  const language = useLanguageStore((s) => s.language);

  // Theme: add or remove the "dark" class on <html>.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Language: i18next + <html lang="fa" dir="rtl">
  useEffect(() => {
    applyLanguage(language);
  }, [language]);

  return (
    <BrowserRouter>
      <AppRouter />
      <Toaster />
    </BrowserRouter>
  );
}