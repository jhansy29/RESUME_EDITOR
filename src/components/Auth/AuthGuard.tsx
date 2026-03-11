import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '../../hooks/useAuthStore';
import { AuthPage } from './AuthPage';

interface Props {
  children: ReactNode;
}

export function AuthGuard({ children }: Props) {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        color: '#666',
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <>{children}</>;
}
