'use client';

import { TreeProvider } from '@/context/TreeContext';

interface ProvidersProps {
  children: React.ReactNode;
  forcedRootId?: string;
}

export function Providers({ children, forcedRootId }: ProvidersProps) {
  return <TreeProvider forcedRootId={forcedRootId}>{children}</TreeProvider>;
}
