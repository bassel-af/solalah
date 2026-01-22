'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';

interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
}

// Sample data
const treeData: TreeNode = {
  id: 'root',
  label: 'Root',
  children: [
    {
      id: 'child1',
      label: 'Child 1',
      children: [
        { id: 'gc1-1', label: 'GC 1.1' },
        { id: 'gc1-2', label: 'GC 1.2' },
      ],
    },
    {
      id: 'child2',
      label: 'Child 2',
      children: [
        { id: 'gc2-1', label: 'GC 2.1' },
        { id: 'gc2-2', label: 'GC 2.2' },
        { id: 'gc2-3', label: 'GC 2.3' },
      ],
    },
    {
      id: 'child3',
      label: 'Child 3',
      children: [{ id: 'gc3-1', label: 'GC 3.1' }],
    },
  ],
};

export function Playground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [lines, setLines] = useState<Line[]>([]);

  const setNodeRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      nodeRefs.current.set(id, el);
    } else {
      nodeRefs.current.delete(id);
    }
  }, []);

  const calculateLines = useCallback(() => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newLines: Line[] = [];

    const processNode = (node: TreeNode) => {
      if (!node.children?.length) return;

      const parentEl = nodeRefs.current.get(node.id);
      if (!parentEl) return;

      const parentRect = parentEl.getBoundingClientRect();
      const parentCenterX = parentRect.left + parentRect.width / 2 - containerRect.left;
      const parentBottomY = parentRect.bottom - containerRect.top;

      for (const child of node.children) {
        const childEl = nodeRefs.current.get(child.id);
        if (!childEl) continue;

        const childRect = childEl.getBoundingClientRect();
        const childCenterX = childRect.left + childRect.width / 2 - containerRect.left;
        const childTopY = childRect.top - containerRect.top;

        // Vertical line down from parent
        const midY = parentBottomY + (childTopY - parentBottomY) / 2;

        // Parent to mid
        newLines.push({ x1: parentCenterX, y1: parentBottomY, x2: parentCenterX, y2: midY });
        // Horizontal to child
        newLines.push({ x1: parentCenterX, y1: midY, x2: childCenterX, y2: midY });
        // Mid to child
        newLines.push({ x1: childCenterX, y1: midY, x2: childCenterX, y2: childTopY });

        processNode(child);
      }
    };

    processNode(treeData);
    setLines(newLines);
  }, []);

  useEffect(() => {
    calculateLines();
    window.addEventListener('resize', calculateLines);
    return () => window.removeEventListener('resize', calculateLines);
  }, [calculateLines]);

  const renderNode = (node: TreeNode): React.ReactNode => (
    <div key={node.id} className="tree-branch">
      <div
        ref={(el) => setNodeRef(node.id, el)}
        className="node"
      >
        {node.label}
      </div>
      {node.children && node.children.length > 0 && (
        <div className="children">
          {node.children.map(renderNode)}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ padding: '40px', background: '#f5f5f5', minHeight: '100vh' }}>
      <h2 style={{ marginBottom: '20px' }}>Tree Playground - SVG Lines</h2>

      <div ref={containerRef} className="tree-container">
        <svg className="tree-lines">
          {lines.map((line, i) => (
            <line
              key={i}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="#999"
              strokeWidth="2"
            />
          ))}
        </svg>

        <div className="tree-nodes">
          {renderNode(treeData)}
        </div>
      </div>

      <style>{`
        .tree-container {
          position: relative;
          display: inline-block;
        }

        .tree-lines {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .tree-nodes {
          position: relative;
        }

        .tree-branch {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .children {
          display: flex;
          gap: 20px;
          margin-top: 40px;
        }

        .node {
          background: white;
          border: 2px solid #333;
          border-radius: 8px;
          padding: 15px 25px;
          min-width: 80px;
          text-align: center;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}
