// Turns the `routes` array into React Router <Route>s.
//
// - routes with layout: true  are nested inside <MainLayout /> (sidebar + header)
// - routes with layout: false are shown alone
// - protected / guestOnly routes are wrapped in a guard
import { Route, Routes } from 'react-router';
import MainLayout from '../layout/MainLayout';
import { GuestRoute, ProtectedRoute } from './RouteGuards';
import { routes } from './routes.config';

/** Wrap the page in a guard when the route asks for it. */
function guard(route) {
  if (route.protected) return <ProtectedRoute>{route.element}</ProtectedRoute>;
  if (route.guestOnly) return <GuestRoute>{route.element}</GuestRoute>;
  return route.element;
}

const withLayout = routes.filter((r) => r.layout);
const withoutLayout = routes.filter((r) => !r.layout);

export default function AppRouter() {
  return (
    <Routes>
      {/* A route without `path` is a "layout route": it only adds MainLayout around its children. */}
      <Route element={<MainLayout />}>
        {withLayout.map((route) => (
          <Route key={route.path} path={route.path} element={guard(route)} />
        ))}
      </Route>

      {withoutLayout.map((route) => (
        <Route key={route.path} path={route.path} element={guard(route)} />
      ))}
    </Routes>
  );
}