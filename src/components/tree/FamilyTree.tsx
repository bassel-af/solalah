import { useMemo, useCallback, useState, useRef } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  ConnectionLineType,
  useReactFlow,
  ReactFlowProvider,
  Handle,
  Position,
  Controls,
  MiniMap,
} from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import '@xyflow/react/dist/style.css';

import type { GedcomData, Individual } from '@/lib/gedcom';
import { getDisplayName } from '@/lib/gedcom';
import { useTree } from '@/context/TreeContext';

// Custom node component for a person (with spouses)
interface PersonNodeData {
  person: Individual;
  spouses: Individual[];
  isRoot: boolean;
  searchQuery: string;
}

function PersonNode({ data }: { data: PersonNodeData }) {
  const { person, spouses, isRoot, searchQuery } = data;

  const renderPersonCard = (p: Individual, isMainPerson: boolean) => {
    const displayName = getDisplayName(p);
    const sexClass = p.sex === 'M' ? 'male' : p.sex === 'F' ? 'female' : '';
    const rootClass = isMainPerson && isRoot ? 'root' : '';
    const isMatch =
      searchQuery && displayName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchClass = isMatch ? 'search-match' : '';

    let dates = '';
    if (p.birth || p.death) {
      dates = `${p.birth || '?'} - ${p.death || ''}`;
    }

    return (
      <div className={`person ${sexClass} ${rootClass} ${matchClass}`.trim()}>
        <div className="person-name">{displayName}</div>
        {dates && <div className="person-dates">{dates}</div>}
      </div>
    );
  };

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      {spouses.length === 0 ? (
        renderPersonCard(person, true)
      ) : (
        <div className="couple">
          {renderPersonCard(person, true)}
          {spouses.map((spouse) => (
            <div key={spouse.id} className="spouse-group">
              <div className="spouse-connector" />
              {renderPersonCard(spouse, false)}
            </div>
          ))}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  );
}

const nodeTypes = {
  person: PersonNode,
};

// Dagre layout configuration
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;
const SPOUSE_WIDTH = 200; // Additional width per spouse

function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction = 'TB'
): { nodes: Node[]; edges: Edge[] } {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 80 });

  nodes.forEach((node) => {
    const spouseCount = (node.data as PersonNodeData).spouses?.length || 0;
    const width = NODE_WIDTH + spouseCount * SPOUSE_WIDTH;
    dagreGraph.setNode(node.id, { width, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const spouseCount = (node.data as PersonNodeData).spouses?.length || 0;
    const width = NODE_WIDTH + spouseCount * SPOUSE_WIDTH;

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

// Convert GEDCOM tree data to React Flow nodes and edges
function buildTreeData(
  data: GedcomData,
  rootId: string,
  maxDepth: number,
  searchQuery: string
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const visited = new Set<string>();

  function traverse(personId: string, depth: number) {
    if (depth > maxDepth || visited.has(personId)) return;

    const person = data.individuals[personId];
    if (!person) return;

    visited.add(personId);

    // Get all families where this person is a spouse
    const personFamilies = person.familiesAsSpouse
      .map((fid) => data.families[fid])
      .filter(Boolean);

    // Collect all unique spouses
    const spouseIds: string[] = [];
    for (const fam of personFamilies) {
      const spouseId = fam.husband === personId ? fam.wife : fam.husband;
      if (spouseId && !spouseIds.includes(spouseId)) {
        spouseIds.push(spouseId);
      }
    }

    const spouses = spouseIds
      .map((id) => data.individuals[id])
      .filter(Boolean);

    // Create node for this person
    nodes.push({
      id: personId,
      type: 'person',
      position: { x: 0, y: 0 }, // Will be set by dagre
      data: {
        person,
        spouses,
        isRoot: depth === 0,
        searchQuery,
      } as PersonNodeData,
    });

    // Collect all children from all families
    const allChildren: string[] = [];
    for (const fam of personFamilies) {
      for (const childId of fam.children) {
        if (!allChildren.includes(childId)) {
          allChildren.push(childId);
        }
      }
    }

    // Create edges and traverse children
    for (const childId of allChildren) {
      edges.push({
        id: `${personId}-${childId}`,
        source: personId,
        target: childId,
        type: 'smoothstep',
        style: { stroke: '#ccc', strokeWidth: 2 },
      });
      traverse(childId, depth + 1);
    }
  }

  traverse(rootId, 0);

  return getLayoutedElements(nodes, edges);
}

function FamilyTreeInner() {
  const { data, selectedRootId, config, searchQuery } = useTree();
  const { setViewport } = useReactFlow();
  const [isReady, setIsReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { initialNodes, initialEdges } = useMemo(() => {
    if (!data || !selectedRootId) {
      return { initialNodes: [], initialEdges: [] };
    }

    const { nodes, edges } = buildTreeData(
      data,
      selectedRootId,
      config.maxDepth,
      searchQuery
    );

    return { initialNodes: nodes, initialEdges: edges };
  }, [data, selectedRootId, config.maxDepth, searchQuery]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when data changes
  useMemo(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Position root at top, centered horizontally
  const onInit = useCallback(() => {
    const rootNode = initialNodes.find(
      (n) => (n.data as PersonNodeData).isRoot
    );
    if (rootNode && containerRef.current) {
      const { width } = containerRef.current.getBoundingClientRect();
      const spouseCount = (rootNode.data as PersonNodeData).spouses?.length || 0;
      const nodeWidth = NODE_WIDTH + spouseCount * SPOUSE_WIDTH;
      const zoom = 0.85;
      const topPadding = 40;

      // Center of the root node in flow coordinates
      const rootCenterX = rootNode.position.x + nodeWidth / 2;
      const rootTopY = rootNode.position.y;

      // Calculate viewport: center horizontally, root at top with padding
      const x = width / 2 - rootCenterX * zoom;
      const y = topPadding - rootTopY * zoom;

      setViewport({ x, y, zoom }, { duration: 0 });
    }
    requestAnimationFrame(() => setIsReady(true));
  }, [initialNodes, setViewport]);

  if (!data || !selectedRootId) {
    return (
      <div id="tree-container">
        <p style={{ textAlign: 'center', color: '#666' }}>
          Select a root ancestor to view the tree
        </p>
      </div>
    );
  }

  return (
    <div id="tree-container" ref={containerRef} style={{ opacity: isReady ? 1 : 0 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={onInit}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        minZoom={0.1}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
        zoomOnPinch
      >
        <Controls />
        <MiniMap nodeStrokeWidth={3} zoomable pannable />
      </ReactFlow>
    </div>
  );
}

export function FamilyTree() {
  return (
    <ReactFlowProvider>
      <FamilyTreeInner />
    </ReactFlowProvider>
  );
}
