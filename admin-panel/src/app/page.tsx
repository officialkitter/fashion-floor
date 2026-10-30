'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useStore } from '@/lib/store';

export default function Home() {
  const router = useRouter();
  const { ready, user } = useStore();
  useEffect(() => {
    if (ready) router.replace(user ? '/dashboard' : '/login');
  }, [ready, user, router]);
  return <div className="flex min-h-screen items-center justify-center bg-coffee text-sm font-bold tracking-widest text-white">FASHION FLOOR</div>;
}
