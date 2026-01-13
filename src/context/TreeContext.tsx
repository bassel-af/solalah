import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { GedcomData, RootAncestor, TreeConfig } from '@/lib/gedcom';
import { findRootAncestors, findDefaultRoot, getDisplayName } from '@/lib/gedcom';

interface TreeState {
  data: GedcomData | null;
  selectedRootId: string | null;
  rootsList: RootAncestor[];
  searchQuery: string;
  config: TreeConfig;
  isLoading: boolean;
  error: string | null;
}

interface TreeContextValue extends TreeState {
  setData: (data: GedcomData) => void;
  setSelectedRootId: (id: string | null) => void;
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
  const [rootsList, setRootsList] = useState<RootAncestor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [config, setConfigState] = useState<TreeConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setErrorState] = useState<string | null>(null);

  const setData = useCallback((newData: GedcomData) => {
    setDataState(newData);
    const roots = findRootAncestors(newData).map((person) => ({
      id: person.id,
      text: getDisplayName(person) + (person.birth ? ` (${person.birth})` : ''),
    }));
    setRootsList(roots);
    setIsLoading(false);

    // Auto-select the default root (oldest ancestor with no parents)
    const defaultRoot = findDefaultRoot(newData);
    if (defaultRoot) {
      setSelectedRootIdState(defaultRoot.id);
    }
  }, []);

  const setSelectedRootId = useCallback((id: string | null) => {
    setSelectedRootIdState(id);
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
    rootsList,
    searchQuery,
    config,
    isLoading,
    error,
    setData,
    setSelectedRootId,
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
