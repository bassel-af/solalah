'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTree } from '@/context/TreeContext';
import { useGedcomData } from '@/hooks/useGedcomData';
import { FamilyTree } from '@/components/tree';
import { Sidebar } from '@/components/ui';
import { Playground } from '@/components/dev/Playground';

function MainApp() {
  const { isLoading, error } = useTree();

  // Load GEDCOM data
  useGedcomData('/saeed-family.ged');

  if (error) {
    return (
      <div className="error">
        خطأ في تحميل شجرة العائلة: {error}
      </div>
    );
  }

  if (isLoading) {
    return <div className="loading">جاري تحميل شجرة العائلة...</div>;
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <FamilyTree />
      </main>
    </div>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const isPlayground = searchParams.has('playground');

  if (isPlayground) {
    return <Playground />;
  }

  return <MainApp />;
}

export default function Home() {
  return (
    <Suspense fallback={<div className="loading">جاري التحميل...</div>}>
      <HomeContent />
    </Suspense>
  );
}
