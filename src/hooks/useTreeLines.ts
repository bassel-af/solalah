'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

export interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface NodeRelation {
  parentId: string;
  childIds: string[];
}

export function useTreeLines(containerRef: React.RefObject<HTMLElement | null>) {
  const nodeRefs = useRef<Map<string, HTMLElement>>(new Map());
  const relations = useRef<NodeRelation[]>([]);
  const [lines, setLines] = useState<Line[]>([]);

  const registerNode = useCallback((id: string, el: HTMLElement | null) => {
    if (el) {
      nodeRefs.current.set(id, el);
    } else {
      nodeRefs.current.delete(id);
    }
  }, []);

  const registerRelation = useCallback((parentId: string, childIds: string[]) => {
    // Check if relation already exists
    const existing = relations.current.find(r => r.parentId === parentId);
    if (existing) {
      existing.childIds = childIds;
    } else {
      relations.current.push({ parentId, childIds });
    }
  }, []);

  const clearRelations = useCallback(() => {
    relations.current = [];
    nodeRefs.current.clear();
  }, []);

  const calculateLines = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;
    const newLines: Line[] = [];

    for (const { parentId, childIds } of relations.current) {
      const parentEl = nodeRefs.current.get(parentId);
      if (!parentEl || childIds.length === 0) continue;

      const parentRect = parentEl.getBoundingClientRect();
      const parentCenterX = parentRect.left + parentRect.width / 2 - containerRect.left + scrollLeft;
      const parentBottomY = parentRect.bottom - containerRect.top + scrollTop;

      // Get all children positions
      const childPositions: { centerX: number; topY: number }[] = [];
      for (const childId of childIds) {
        const childEl = nodeRefs.current.get(childId);
        if (!childEl) continue;

        const childRect = childEl.getBoundingClientRect();
        childPositions.push({
          centerX: childRect.left + childRect.width / 2 - containerRect.left + scrollLeft,
          topY: childRect.top - containerRect.top + scrollTop,
        });
      }

      if (childPositions.length === 0) continue;

      // Calculate midpoint Y (between parent bottom and children top)
      const childTopY = childPositions[0].topY;
      const midY = parentBottomY + (childTopY - parentBottomY) / 2;

      // Vertical line from parent to mid
      newLines.push({
        x1: parentCenterX,
        y1: parentBottomY,
        x2: parentCenterX,
        y2: midY,
      });

      // Horizontal line spanning all children
      const leftMostX = Math.min(...childPositions.map(c => c.centerX));
      const rightMostX = Math.max(...childPositions.map(c => c.centerX));

      if (childPositions.length > 1) {
        newLines.push({
          x1: leftMostX,
          y1: midY,
          x2: rightMostX,
          y2: midY,
        });
      }

      // Vertical lines from mid to each child
      for (const child of childPositions) {
        newLines.push({
          x1: child.centerX,
          y1: midY,
          x2: child.centerX,
          y2: child.topY,
        });
      }
    }

    setLines(newLines);
  }, [containerRef]);

  // Recalculate on scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => calculateLines();
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [containerRef, calculateLines]);

  // Recalculate on resize
  useEffect(() => {
    window.addEventListener('resize', calculateLines);
    return () => window.removeEventListener('resize', calculateLines);
  }, [calculateLines]);

  return {
    lines,
    registerNode,
    registerRelation,
    clearRelations,
    calculateLines,
  };
}
