// Route guards.
// ProtectedRoute: only logged-in users. Others go to /login.
// GuestRoute:     only logged-out users (login page). Others go to /.
import { Navigate, useLocation } from 'react-router';
import { useAuthStore } from '../shared/stores/authStore';

export function ProtectedRoute({ children }) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!user) {
    // Remember where the user wanted to go, so login can send them back.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

export function GuestRoute({ children }) {
  const user = useAuthStore((s) => s.user);
  if (user) return <Navigate to="/" replace />;
  return children;
}