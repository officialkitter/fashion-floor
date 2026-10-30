'use client';

import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { Shell } from '@/components/Shell';
import { useStore } from '@/lib/store';

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { ready, user } = useStore();

  useEffect(() => {
    if (ready && !user) router.replace('/login');
  }, [ready, user, router]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-coffee">
        <p className="text-sm font-extrabold tracking-[0.25em] text-white">FASHION FLOOR</p>
      </div>
    );
  }
  return <Shell>{children}</Shell>;
}
