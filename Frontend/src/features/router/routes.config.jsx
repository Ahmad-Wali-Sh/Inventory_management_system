// =====================================================================
// ALL ROUTES OF THE APP ARE HERE.
// ---------------------------------------------------------------------
// Each object is one page:
//
//   path       URL of the page
//   element    what to show
//   titleKey   translation key for the page name (sidebar + title)
//   layout     true  = show inside MainLayout (sidebar + header)
//              false = full screen page (e.g. login)
//   protected  true  = only for logged-in users (else go to /login)
//   guestOnly  true  = only for logged-OUT users (e.g. login page)
//   sidebar    { icon } = show a link in the sidebar with this icon
//              (icon names are in shared/components/Icon.jsx)
//
// HOW TO BUILD A NEW PAGE (example: sales)
//   1. Create src/features/sales/SalesPage.jsx
//   2. import SalesPage from '../sales/SalesPage';
//   3. Change  element: <PlaceholderPage titleKey="nav.sales" />
//      to      element: <SalesPage />
// =====================================================================
import LoginPage from '../auth/LoginPage';
import ProductsPage from '../products/ProductsPage';
import PlaceholderPage from '../shared/components/PlaceholderPage';
import NotFoundPage from './NotFoundPage';

export const routes = [
  // ---------- Without layout ----------
  {
    path: '/login',
    element: <LoginPage />,
    titleKey: 'auth.title',
    layout: false,
    guestOnly: true,
  },

  // ---------- With layout (sidebar + header) ----------
  {
    path: '/',
    element: <PlaceholderPage titleKey="nav.dashboard" />, // TODO(students): DashboardPage
    titleKey: 'nav.dashboard',
    layout: true,
    protected: true,
    sidebar: { icon: 'dashboard' },
  },
  {
    path: '/products',
    element: <ProductsPage />, // ✅ built with MasterComponent
    titleKey: 'nav.products',
    layout: true,
    protected: true,
    sidebar: { icon: 'box' },
  },
  {
    path: '/sales',
    element: <PlaceholderPage titleKey="nav.sales" />, // TODO(students)
    titleKey: 'nav.sales',
    layout: true,
    protected: true,
    sidebar: { icon: 'cart' },
  },
  {
    path: '/sales-returns',
    element: <PlaceholderPage titleKey="nav.salesReturns" />, // TODO(students)
    titleKey: 'nav.salesReturns',
    layout: true,
    protected: true,
    sidebar: { icon: 'undo' },
  },
  {
    path: '/purchases',
    element: <PlaceholderPage titleKey="nav.purchases" />, // TODO(students)
    titleKey: 'nav.purchases',
    layout: true,
    protected: true,
    sidebar: { icon: 'truck' },
  },
  {
    path: '/purchase-returns',
    element: <PlaceholderPage titleKey="nav.purchaseReturns" />, // TODO(students)
    titleKey: 'nav.purchaseReturns',
    layout: true,
    protected: true,
    sidebar: { icon: 'undo' },
  },
  {
    path: '/stock',
    element: <PlaceholderPage titleKey="nav.stock" />, // TODO(students)
    titleKey: 'nav.stock',
    layout: true,
    protected: true,
    sidebar: { icon: 'layers' },
  },
  {
    path: '/users',
    element: <PlaceholderPage titleKey="nav.users" />, // TODO(students): can use MasterComponent
    titleKey: 'nav.users',
    layout: true,
    protected: true,
    sidebar: { icon: 'users' },
  },

  // ---------- Anything else ----------
  {
    path: '*',
    element: <NotFoundPage />,
    titleKey: 'notFound.title',
    layout: false,
  },
];