import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/useAuth';
import SplashScreen from './SplashScreen';

export default function RequireAuth() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <SplashScreen />;

  // Remembers where the user was going, so login sends them back there.
  if (!session) {
    const returnUrl = location.pathname + location.search;
    return (
      <Navigate
        to={returnUrl === '/' ? '/login' : `/login?returnUrl=${encodeURIComponent(returnUrl)}`}
        replace
      />
    );
  }

  return <Outlet />;
}
