// Top bar: sidebar button, language switch, theme switch, user + logout.
import { useNavigate } from 'react-router';
import Icon from '../shared/components/Icon';
import { LANGUAGES } from '../shared/i18n/i18n';
import { useLanguageStore } from '../shared/i18n/languageStore';
import { useTranslation } from '../shared/i18n/useTranslation';
import { useAuthStore } from '../shared/stores/authStore';
import { useThemeStore } from '../shared/stores/themeStore';
import { useSidebarStore } from './sidebarStore';

export default function Header() {
  const { t, language } = useTranslation();
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const { theme, toggleTheme } = useThemeStore();
  const { user, logout } = useAuthStore();
  const { toggleCollapsed, setMobileOpen } = useSidebarStore();
  const navigate = useNavigate();

  // Mobile: open the drawer. Desktop: collapse / expand.
  const handleMenu = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) toggleCollapsed();
    else setMobileOpen(true);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-line bg-surface px-4">
      <button className="btn btn-secondary px-2" onClick={handleMenu} aria-label={t('header.toggleSidebar')}>
        <Icon name="menu" />
      </button>

      <div className="ms-auto flex items-center gap-2">
        {/* Language */}
        <label className="flex items-center gap-1 text-fg-muted" title={t('header.language')}>
          <Icon name="globe" className="size-4" />
          <select
            className="input w-auto py-1.5"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </label>

        {/* Theme */}
        <button
          className="btn btn-secondary px-2"
          onClick={toggleTheme}
          title={theme === 'dark' ? t('header.lightMode') : t('header.darkMode')}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>

        {/* User */}
        {user && (
          <>
            <span className="hidden text-sm text-fg-muted sm:inline">{user.username}</span>
            <button className="btn btn-secondary px-2" onClick={handleLogout} title={t('header.logout')}>
              <Icon name="logout" className="size-5 rtl:-scale-x-100" />
            </button>
          </>
        )}
      </div>
    </header>
  );
}