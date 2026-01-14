import type { Individual, GedcomData } from './types';

/**
 * Get all descendants of a person (children, grandchildren, etc.)
 * Returns a Set of individual IDs
 */
export function getAllDescendants(data: GedcomData, rootId: string): Set<string> {
  const descendants = new Set<string>();
  const { individuals, families } = data;

  function traverse(personId: string) {
    const person = individuals[personId];
    if (!person) return;

    // Get all families where this person is a spouse
    for (const familyId of person.familiesAsSpouse) {
      const family = families[familyId];
      if (!family) continue;

      for (const childId of family.children) {
        if (!descendants.has(childId)) {
          descendants.add(childId);
          traverse(childId);
        }
      }
    }
  }

  traverse(rootId);
  return descendants;
}

/**
 * Build adjacency list: personId -> [childIds]
 */
export function buildChildrenGraph(data: GedcomData): Map<string, string[]> {
  const { individuals, families } = data;
  const childrenOf = new Map<string, string[]>();

  // Initialize empty arrays for all individuals
  for (const id in individuals) {
    childrenOf.set(id, []);
  }

  // For each family, add children to both parents
  for (const famId in families) {
    const family = families[famId];
    const parents: string[] = [];
    if (family.husband) parents.push(family.husband);
    if (family.wife) parents.push(family.wife);

    for (const parentId of parents) {
      const children = childrenOf.get(parentId) || [];
      for (const childId of family.children) {
        if (!children.includes(childId)) {
          children.push(childId);
        }
      }
      childrenOf.set(parentId, children);
    }
  }

  return childrenOf;
}

/**
 * Calculate descendant count for each person using Kahn's algorithm (topological sort)
 * Process leaves first, propagate counts up to roots - O(V + E)
 */
export function calculateDescendantCounts(
  individuals: Record<string, Individual>,
  childrenOf: Map<string, string[]>
): Map<string, number> {
  const descendantCount = new Map<string, number>();
  const outDegree = new Map<string, number>();
  const parentsOf = new Map<string, string[]>(); // reverse edges

  // Initialize
  for (const id in individuals) {
    const children = childrenOf.get(id) || [];
    outDegree.set(id, children.length);
    descendantCount.set(id, 0);

    // Build reverse edges (child -> parents)
    for (const childId of children) {
      const parents = parentsOf.get(childId) || [];
      parents.push(id);
      parentsOf.set(childId, parents);
    }
  }

  // Start with leaves (people with no children)
  const queue: string[] = [];
  for (const id in individuals) {
    if (outDegree.get(id) === 0) {
      queue.push(id);
    }
  }

  // Process in topological order (leaves to roots)
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const nodeDescendants = descendantCount.get(nodeId) || 0;

    // Update all parents of this node
    const parents = parentsOf.get(nodeId) || [];
    for (const parentId of parents) {
      // Parent gains: 1 (this child) + all descendants of this child
      const currentCount = descendantCount.get(parentId) || 0;
      descendantCount.set(parentId, currentCount + 1 + nodeDescendants);

      // Decrement out-degree (one less child to process)
      const newOutDegree = (outDegree.get(parentId) || 1) - 1;
      outDegree.set(parentId, newOutDegree);

      // If all children processed, parent is ready
      if (newOutDegree === 0) {
        queue.push(parentId);
      }
    }
  }

  return descendantCount;
}
