'use client';

import { ToastProvider } from '@/context/ToastContext';

interface GlobalProvidersProps {
  children: React.ReactNode;
}

export function GlobalProviders({ children }: GlobalProvidersProps) {
  return <ToastProvider>{children}</ToastProvider>;
}
