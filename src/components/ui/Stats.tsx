import { useMemo } from 'react';
import { useTree } from '@/context/TreeContext';
import { getAllDescendants } from '@/lib/gedcom';

export function Stats() {
  const { data, rootsList, rootFilterStrategy, initialRootId } = useTree();

  const { indCount, famCount } = useMemo(() => {
    if (!data) return { indCount: 0, famCount: 0 };

    if (rootFilterStrategy === 'all' || !initialRootId) {
      return {
        indCount: Object.keys(data.individuals).length,
        famCount: Object.keys(data.families).length,
      };
    }

    // Filter to descendants only
    const descendantIds = getAllDescendants(data, initialRootId);
    descendantIds.add(initialRootId);

    // Count families where at least one parent is a descendant
    let familyCount = 0;
    for (const famId in data.families) {
      const fam = data.families[famId];
      if (
        (fam.husband && descendantIds.has(fam.husband)) ||
        (fam.wife && descendantIds.has(fam.wife))
      ) {
        familyCount++;
      }
    }

    return {
      indCount: descendantIds.size,
      famCount: familyCount,
    };
  }, [data, rootFilterStrategy, initialRootId]);

  if (!data) return null;

  return (
    <div className="stats">
      {indCount} فرد، {famCount} عائلة، {rootsList.length} في القائمة
    </div>
  );
}
