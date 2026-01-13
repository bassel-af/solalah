import { useMemo, useEffect, useRef } from 'react';
import type { GedcomData } from '@/lib/gedcom';
import { useTree } from '@/context/TreeContext';
import { CoupleRow } from './CoupleRow';
import { PersonCard } from './PersonCard';

interface TreeNodeProps {
  personId: string;
  data: GedcomData;
  depth: number;
  maxDepth: number;
  visited: Set<string>;
}

function TreeNode({ personId, data, depth, maxDepth, visited }: TreeNodeProps) {
  if (depth > maxDepth || visited.has(personId)) return null;

  const person = data.individuals[personId];
  if (!person) return null;

  // Clone visited set to avoid mutation across branches
  const newVisited = new Set(visited);
  newVisited.add(personId);

  const personFamilies = person.familiesAsSpouse
    .map((fid) => data.families[fid])
    .filter(Boolean);

  // Collect all children from all families
  const allChildren: string[] = [];
  for (const fam of personFamilies) {
    for (const childId of fam.children) {
      if (!allChildren.includes(childId)) {
        allChildren.push(childId);
      }
    }
  }

  const isRoot = depth === 0;

  if (personFamilies.length === 0) {
    return (
      <li>
        <PersonCard person={person} isRoot={isRoot} />
      </li>
    );
  }

  const mainFamily = personFamilies[0];
  const spouseId =
    mainFamily.husband === personId ? mainFamily.wife : mainFamily.husband;

  return (
    <li>
      <CoupleRow
        person={person}
        spouseId={spouseId}
        data={data}
        isRoot={isRoot}
      />
      {allChildren.length > 0 && (
        <ul>
          {allChildren.map((childId) => (
            <TreeNode
              key={childId}
              personId={childId}
              data={data}
              depth={depth + 1}
              maxDepth={maxDepth}
              visited={newVisited}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function FamilyTree() {
  const { data, selectedRootId, config } = useTree();
  const containerRef = useRef<HTMLDivElement>(null);

  const treeContent = useMemo(() => {
    if (!data || !selectedRootId) {
      return (
        <p style={{ textAlign: 'center', color: '#666' }}>
          Select a root ancestor to view the tree
        </p>
      );
    }

    return (
      <ul className="tree">
        <TreeNode
          personId={selectedRootId}
          data={data}
          depth={0}
          maxDepth={config.maxDepth}
          visited={new Set()}
        />
      </ul>
    );
  }, [data, selectedRootId, config.maxDepth]);

  // Center on root when tree loads or root changes
  useEffect(() => {
    if (!containerRef.current || !selectedRootId) return;

    const container = containerRef.current;
    const rootElement = container.querySelector('.person.root');

    if (rootElement) {
      const containerRect = container.getBoundingClientRect();
      const rootRect = rootElement.getBoundingClientRect();

      // Calculate scroll position to center the root horizontally
      const scrollLeft =
        rootRect.left -
        containerRect.left +
        container.scrollLeft -
        containerRect.width / 2 +
        rootRect.width / 2;

      container.scrollLeft = Math.max(0, scrollLeft);
    }
  }, [selectedRootId, data]);

  return <div id="tree-container" ref={containerRef}>{treeContent}</div>;
}
