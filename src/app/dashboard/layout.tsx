'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Layout } from '../../components/layout/Layout';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { 
      router.push('/login'); 
      return; 
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </Layout>
    );
  }
  
  if (!session) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Access Denied</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {children}
    </Layout>
  );
}



