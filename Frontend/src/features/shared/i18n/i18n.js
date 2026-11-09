// i18next setup (English + Persian).
//
// We use plain `i18next` (no react-i18next). React re-renders on language
// change because the current language lives in a zustand store
// (languageStore.js) and our own useTranslation() hook reads it.
//
// To add a language:
//   1. create locales/xx.json (copy en.json and translate)
//   2. import it below and add it to `resources`
//   3. add it to LANGUAGES
import i18next from 'i18next';
import en from '../locales/en.json';
import fa from '../locales/fa.json';

// code, display name, text direction
export const LANGUAGES = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'fa', label: 'فارسی', dir: 'rtl' },
];

i18next.init({
  resources: {
    en: { translation: en },
    fa: { translation: fa },
  },
  lng: 'en',
  fallbackLng: 'en', // a key missing in fa.json shows the English text
  interpolation: { escapeValue: false }, // React already escapes values
});

export default i18next;