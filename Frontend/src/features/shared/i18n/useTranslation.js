// Our small replacement for react-i18next's useTranslation().
//
//   const { t, language } = useTranslation();
//   <h1>{t('products.title')}</h1>
//   <p>{t('master.deleteConfirm', { name: 'Pen' })}</p>
//
// Because it reads `language` from the zustand store, every component that
// uses it re-renders when the language changes.
import i18next from './i18n';
import { useLanguageStore } from './languageStore';

export function useTranslation() {
  const language = useLanguageStore((state) => state.language);
  const t = (key, options) => i18next.t(key, { lng: language, ...options });
  return { t, language };
}