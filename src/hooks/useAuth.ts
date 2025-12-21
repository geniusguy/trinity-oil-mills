import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export const useAuth = (requiredRole?: string) => {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    if (requiredRole && session.user?.role !== requiredRole) {
      router.push('/dashboard');
      return;
    }
  }, [session, status, router, requiredRole]);

  return {
    session,
    status,
    isLoading: status === 'loading',
    isAuthenticated: !!session,
    user: session?.user,
    role: session?.user?.role,
  };
};

