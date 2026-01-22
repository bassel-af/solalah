'use client';

import { TreeProvider } from '@/context/TreeContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return <TreeProvider>{children}</TreeProvider>;
}
