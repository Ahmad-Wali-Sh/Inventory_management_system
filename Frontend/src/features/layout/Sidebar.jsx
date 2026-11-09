// Sidebar navigation.
// The links come from router/routes.config.jsx: every route with a
// `sidebar` entry gets a link. Add a route there and it shows up here.
import { NavLink } from 'react-router';
import { routes } from '../router/routes.config';
import Icon from '../shared/components/Icon';
import { useTranslation } from '../shared/i18n/useTranslation';
import { useSidebarStore } from './sidebarStore';

const menuItems = routes.filter((route) => route.sidebar);

export default function Sidebar() {
  const { t } = useTranslation();
  const { collapsed, mobileOpen, setMobileOpen } = useSidebarStore();

  return (
    <>
      {/* Dark overlay behind the drawer on mobile. Click it to close. */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 start-0 z-40 flex w-64 flex-col border-e border-line bg-surface transition-all
          lg:sticky lg:top-0 lg:h-screen
          ${mobileOpen ? '' : 'max-lg:-translate-x-full max-lg:rtl:translate-x-full'}
          ${collapsed ? 'lg:w-18' : 'lg:w-64'}`}
      >
        {/* Logo / app name */}
        <div className="flex h-16 items-center gap-3 border-b border-line px-5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-fg">
            <Icon name="box" className="size-5" />
          </span>
          <span className={`truncate font-semibold ${collapsed ? 'lg:hidden' : ''}`}>{t('app.name')}</span>
          <button
            className="ms-auto text-fg-muted hover:text-fg lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close"
          >
            <Icon name="close" />
          </button>
        </div>

        {/* Links */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'} // "/" should only be active on the home page
              onClick={() => setMobileOpen(false)}
              title={collapsed ? t(item.titleKey) : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors
                ${isActive ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:bg-muted hover:text-fg'}`
              }
            >
              <Icon name={item.sidebar.icon} className="size-5 shrink-0" />
              <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{t(item.titleKey)}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}