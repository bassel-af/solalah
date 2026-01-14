import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { GedcomData, RootAncestor, TreeConfig } from '@/lib/gedcom';
import { findRootAncestors, findDefaultRoot, getDisplayName, getAllDescendants } from '@/lib/gedcom';

export type RootFilterStrategy = 'all' | 'descendants';

interface TreeState {
  data: GedcomData | null;
  selectedRootId: string | null;
  initialRootId: string | null;
  rootsList: RootAncestor[];
  rootFilterStrategy: RootFilterStrategy;
  searchQuery: string;
  config: TreeConfig;
  isLoading: boolean;
  error: string | null;
}

interface TreeContextValue extends TreeState {
  setData: (data: GedcomData) => void;
  setSelectedRootId: (id: string | null) => void;
  setRootFilterStrategy: (strategy: RootFilterStrategy) => void;
  setSearchQuery: (query: string) => void;
  setConfig: (config: Partial<TreeConfig>) => void;
  setError: (error: string | null) => void;
}

const defaultConfig: TreeConfig = {
  maxDepth: 8,
};

const TreeContext = createContext<TreeContextValue | null>(null);

export function TreeProvider({ children }: { children: ReactNode }) {
  const [data, setDataState] = useState<GedcomData | null>(null);
  const [selectedRootId, setSelectedRootIdState] = useState<string | null>(null);
  const [initialRootId, setInitialRootId] = useState<string | null>(null);
  const [allRootsList, setAllRootsList] = useState<RootAncestor[]>([]);
  const [descendantsRootsList, setDescendantsRootsList] = useState<RootAncestor[]>([]);
  const [rootFilterStrategy, setRootFilterStrategyState] = useState<RootFilterStrategy>('descendants');
  const [searchQuery, setSearchQuery] = useState('');
  const [config, setConfigState] = useState<TreeConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setErrorState] = useState<string | null>(null);

  // Compute rootsList based on strategy
  const rootsList = rootFilterStrategy === 'all' ? allRootsList : descendantsRootsList;

  const setData = useCallback((newData: GedcomData) => {
    setDataState(newData);

    // Build list of all individuals
    const allRoots = findRootAncestors(newData).map((person) => ({
      id: person.id,
      text: getDisplayName(person) + (person.birth ? ` (${person.birth})` : ''),
    }));
    setAllRootsList(allRoots);

    // Find the default root (oldest ancestor with most descendants)
    const defaultRoot = findDefaultRoot(newData);
    if (defaultRoot) {
      setInitialRootId(defaultRoot.id);
      setSelectedRootIdState(defaultRoot.id);

      // Build list of descendants of the initial root (including the root itself)
      const descendantIds = getAllDescendants(newData, defaultRoot.id);
      descendantIds.add(defaultRoot.id); // Include the root itself

      const descendantsRoots = allRoots.filter((r) => descendantIds.has(r.id));
      setDescendantsRootsList(descendantsRoots);
    } else {
      // No default root, use all individuals for both lists
      setDescendantsRootsList(allRoots);
    }

    setIsLoading(false);
  }, []);

  const setSelectedRootId = useCallback((id: string | null) => {
    setSelectedRootIdState(id);
  }, []);

  const setRootFilterStrategy = useCallback((strategy: RootFilterStrategy) => {
    setRootFilterStrategyState(strategy);
  }, []);

  const setConfig = useCallback((newConfig: Partial<TreeConfig>) => {
    setConfigState((prev) => ({ ...prev, ...newConfig }));
  }, []);

  const setError = useCallback((err: string | null) => {
    setErrorState(err);
    setIsLoading(false);
  }, []);

  const value: TreeContextValue = {
    data,
    selectedRootId,
    initialRootId,
    rootsList,
    rootFilterStrategy,
    searchQuery,
    config,
    isLoading,
    error,
    setData,
    setSelectedRootId,
    setRootFilterStrategy,
    setSearchQuery,
    setConfig,
    setError,
  };

  return <TreeContext.Provider value={value}>{children}</TreeContext.Provider>;
}

export function useTree() {
  const context = useContext(TreeContext);
  if (!context) {
    throw new Error('useTree must be used within a TreeProvider');
  }
  return context;
}
