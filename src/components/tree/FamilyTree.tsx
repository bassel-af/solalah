import { useMemo, useEffect, useRef } from 'react';
import type { GedcomData } from '@/lib/gedcom';
import { useTree } from '@/context/TreeContext';
import { useTreeLines } from '@/hooks/useTreeLines';
import { CoupleRow } from './CoupleRow';
import { PersonCard } from './PersonCard';

interface TreeNodeProps {
  personId: string;
  data: GedcomData;
  depth: number;
  maxDepth: number;
  visited: Set<string>;
  registerNode: (id: string, el: HTMLElement | null) => void;
  registerRelation: (parentId: string, childIds: string[]) => void;
}

function TreeNode({
  personId,
  data,
  depth,
  maxDepth,
  visited,
  registerNode,
  registerRelation,
}: TreeNodeProps) {
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

  // Register parent-children relation for line drawing
  useEffect(() => {
    if (allChildren.length > 0) {
      registerRelation(personId, allChildren);
    }
  }, [personId, allChildren, registerRelation]);

  if (personFamilies.length === 0) {
    return (
      <li>
        <div className="tree-node-content" ref={(el) => registerNode(personId, el)}>
          <PersonCard person={person} isRoot={isRoot} />
        </div>
      </li>
    );
  }

  const mainFamily = personFamilies[0];
  const spouseId =
    mainFamily.husband === personId ? mainFamily.wife : mainFamily.husband;

  return (
    <li>
      <div className="tree-node-content" ref={(el) => registerNode(personId, el)}>
        <CoupleRow
          person={person}
          spouseId={spouseId}
          data={data}
          isRoot={isRoot}
        />
      </div>
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
              registerNode={registerNode}
              registerRelation={registerRelation}
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
  const { lines, registerNode, registerRelation, calculateLines } =
    useTreeLines(containerRef);

  // Calculate lines after all effects have run
  useEffect(() => {
    // Delay to ensure all TreeNode useEffects have registered relations
    const timer = setTimeout(() => {
      calculateLines();
    }, 100);
    return () => clearTimeout(timer);
  }, [data, selectedRootId, config.maxDepth, calculateLines]);

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
          registerNode={registerNode}
          registerRelation={registerRelation}
        />
      </ul>
    );
  }, [data, selectedRootId, config.maxDepth, registerNode, registerRelation]);

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

  return (
    <div id="tree-container" ref={containerRef}>
      <svg className="tree-lines">
        {lines.map((line, i) => (
          <line
            key={i}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="#ccc"
            strokeWidth="2"
          />
        ))}
      </svg>
      {treeContent}
    </div>
  );
}
