import { useTree } from '@/context/TreeContext';
import { useGedcomData } from '@/hooks/useGedcomData';
import { FamilyTree } from '@/components/tree';
import { RootSelector, SearchBar, Stats } from '@/components/ui';
import { Playground } from '@/components/Playground';

// Check once at module level to avoid hook issues
const isPlayground = new URLSearchParams(window.location.search).has('playground');

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
    <>
      <h1>شجرة العائلة</h1>
      <RootSelector />
      <Stats />
      <SearchBar />
      <FamilyTree />
    </>
  );
}

function App() {
  if (isPlayground) {
    return <Playground />;
  }
  return <MainApp />;
}

export default App;
