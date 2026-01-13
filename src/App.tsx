import { useTree } from '@/context/TreeContext';
import { useGedcomData } from '@/hooks/useGedcomData';
import { FamilyTree } from '@/components/tree';
import { RootSelector, SearchBar, Stats } from '@/components/ui';

function App() {
  const { isLoading, error } = useTree();

  // Load GEDCOM data
  useGedcomData('/saeed-family.ged');

  if (error) {
    return (
      <div className="error">
        Error loading family tree: {error}
      </div>
    );
  }

  if (isLoading) {
    return <div className="loading">Loading family tree...</div>;
  }

  return (
    <>
      <h1>Family Tree</h1>
      <RootSelector />
      <Stats />
      <SearchBar />
      <FamilyTree />
    </>
  );
}

export default App;
