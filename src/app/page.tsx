'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTree } from '@/context/TreeContext';
import { useGedcomData } from '@/hooks/useGedcomData';
import { FamilyTree } from '@/components/tree';
import { Sidebar } from '@/components/ui';
import { Playground } from '@/components/dev/Playground';

interface MainAppProps {
  useTestData: boolean;
  showSidebar: boolean;
  showMinimap: boolean;
  showControls: boolean;
}

function MainApp({ useTestData, showSidebar, showMinimap, showControls }: MainAppProps) {
  const { isLoading, error } = useTree();

  // In dev mode, allow loading test file via ?test query param
  const gedcomFile = useTestData ? '/test-family.ged' : '/saeed-family.ged';

  // Load GEDCOM data
  useGedcomData(gedcomFile);

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
      {showSidebar && <Sidebar />}
      <main className="main-content">
        <FamilyTree hideMiniMap={!showMinimap} hideControls={!showControls} />
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

  const useTestData =
    process.env.NODE_ENV === 'development' && searchParams.has('test');

  // Test mode visibility flags
  const onlyCanvas = searchParams.get('only') === 'canvas';
  const showSidebar = !searchParams.has('no-sidebar') && !onlyCanvas;
  const showMinimap = !searchParams.has('no-minimap') && !onlyCanvas;
  const showControls = !searchParams.has('no-controls') && !onlyCanvas;

  return (
    <MainApp
      useTestData={useTestData}
      showSidebar={showSidebar}
      showMinimap={showMinimap}
      showControls={showControls}
    />
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="loading">جاري التحميل...</div>}>
      <HomeContent />
    </Suspense>
  );
}
