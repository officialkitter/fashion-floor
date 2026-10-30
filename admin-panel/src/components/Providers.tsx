'use client';

import type { ReactNode } from 'react';
import { StoreProvider } from '@/lib/store';
import { ToastProvider } from './ui';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <StoreProvider>{children}</StoreProvider>
    </ToastProvider>
  );
}
