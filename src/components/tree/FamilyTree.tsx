import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
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
interface SpouseWithColor {
  spouse: Individual;
  color: string;
}

interface PersonNodeData {
  person: Individual;
  spouses: SpouseWithColor[];
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
        <>
          {renderPersonCard(person, true)}
          <Handle type="source" position={Position.Bottom} id="default" style={{ opacity: 0 }} />
        </>
      ) : (
        <div className="couple" style={{ position: 'relative' }}>
          {renderPersonCard(person, true)}
          {/* Connector lines from husband to each wife */}
          {spouses.map(({ color }, index) => {
            const lineWidth = 20 + index * 160;
            return (
              <div
                key={`line-${index}`}
                className="spouse-line"
                style={{
                  position: 'absolute',
                  left: 140,
                  top: `calc(50% + ${index * 4}px)`,
                  width: lineWidth,
                  height: 2,
                  backgroundColor: color,
                }}
              />
            );
          })}
          {/* Wife cards */}
          {spouses.map(({ spouse }) => (
            <div key={spouse.id} className="spouse-card-wrapper" style={{ marginLeft: 20 }}>
              {renderPersonCard(spouse, false)}
            </div>
          ))}
          {/* If only one spouse: centered handle between couple */}
          {/* If multiple spouses: handles under each wife */}
          {spouses.length === 1 ? (
            <Handle
              type="source"
              position={Position.Bottom}
              id="spouse-0"
              style={{ opacity: 0 }}
            />
          ) : (
            <>
              {spouses.map((_, index) => (
                <Handle
                  key={`handle-${index}`}
                  type="source"
                  position={Position.Bottom}
                  id={`spouse-${index}`}
                  style={{
                    opacity: 0,
                    // Position under each wife: husband(140) + gap(20) + index*160 + halfCard(70)
                    left: 140 + 20 + index * 160 + 70,
                    // Offset vertically so edges don't overlap when going down
                    bottom: -(index * 8),
                  }}
                />
              ))}
              <Handle
                type="source"
                position={Position.Bottom}
                id="default"
                style={{ opacity: 0, left: 70 }}
              />
            </>
          )}
        </div>
      )}
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

// Colors for different spouse edges (to distinguish children by mother)
const SPOUSE_EDGE_COLORS = [
  '#6366f1', // indigo
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#10b981', // emerald
];

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

    // Create spouses array with colors
    const spousesWithColors: SpouseWithColor[] = spouseIds
      .map((id, index) => {
        const spouse = data.individuals[id];
        if (!spouse) return null;
        return {
          spouse,
          color: SPOUSE_EDGE_COLORS[index % SPOUSE_EDGE_COLORS.length],
        };
      })
      .filter((s): s is SpouseWithColor => s !== null);

    // Create node for this person
    nodes.push({
      id: personId,
      type: 'person',
      position: { x: 0, y: 0 }, // Will be set by dagre
      data: {
        person,
        spouses: spousesWithColors,
        isRoot: depth === 0,
        searchQuery,
      } as PersonNodeData,
    });

    // Create edges for children, colored by which spouse/family they belong to
    // Route edges through the handle under the respective spouse
    const visitedChildren = new Set<string>();
    for (let i = 0; i < personFamilies.length; i++) {
      const fam = personFamilies[i];
      const spouseId = fam.husband === personId ? fam.wife : fam.husband;
      // Find spouse index for color and handle (based on order in spouseIds array)
      const spouseIndex = spouseId ? spouseIds.indexOf(spouseId) : -1;
      const edgeColor = SPOUSE_EDGE_COLORS[Math.max(0, spouseIndex) % SPOUSE_EDGE_COLORS.length];
      // Use spouse-specific handle if spouse exists, otherwise use default
      const sourceHandle = spouseIndex >= 0 ? `spouse-${spouseIndex}` : 'default';

      for (const childId of fam.children) {
        if (!visitedChildren.has(childId)) {
          visitedChildren.add(childId);
          // Offset the vertical drop for each spouse so lines don't overlap
          const edgeOffset = 20 + spouseIndex * 15;
          edges.push({
            id: `${personId}-${childId}`,
            source: personId,
            sourceHandle,
            target: childId,
            type: 'smoothstep',
            style: { stroke: edgeColor, strokeWidth: 2 },
            pathOptions: { offset: edgeOffset },
          });
          traverse(childId, depth + 1);
        }
      }
    }
  }

  traverse(rootId, 0);

  return getLayoutedElements(nodes, edges);
}

function FamilyTreeInner() {
  const { data, selectedRootId, config, searchQuery, focusPersonId } = useTree();
  const { setViewport, setCenter, getZoom } = useReactFlow();
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

  // Center viewport on focused person
  useEffect(() => {
    if (!focusPersonId || !isReady) return;

    const targetNode = nodes.find((n) => n.id === focusPersonId);
    if (!targetNode) return;

    const nodeData = targetNode.data as PersonNodeData;
    const spouseCount = nodeData.spouses?.length || 0;
    const nodeWidth = NODE_WIDTH + spouseCount * SPOUSE_WIDTH;

    // Calculate center of the node
    const centerX = targetNode.position.x + nodeWidth / 2;
    const centerY = targetNode.position.y + NODE_HEIGHT / 2;

    // Keep current zoom or use a reasonable default
    const currentZoom = getZoom();
    const zoom = currentZoom > 0.5 ? currentZoom : 0.85;

    setCenter(centerX, centerY, { zoom, duration: 500 });
  }, [focusPersonId, nodes, isReady, setCenter, getZoom]);

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
          اختر الجد الأعلى لعرض الشجرة
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
