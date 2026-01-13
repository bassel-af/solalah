import type { Individual, Family, GedcomData } from './types';

export function parseGedcom(text: string): GedcomData {
  const lines = text.split(/\r\n|\r|\n/);
  const individuals: Record<string, Individual> = {};
  const families: Record<string, Family> = {};
  let currentRecord: Individual | Family | null = null;
  let currentSubRecord: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split(/\s+/);
    const level = parseInt(parts[0]);

    if (isNaN(level)) continue;

    let id: string | null = null;
    let tag: string | null = null;
    let value: string | null = null;

    if (parts[1] && parts[1].startsWith('@') && parts[1].endsWith('@')) {
      id = parts[1];
      tag = parts[2];
      value = parts.slice(3).join(' ');
    } else {
      tag = parts[1];
      value = parts.slice(2).join(' ');
    }

    if (level === 0) {
      currentSubRecord = null;
      if (tag === 'INDI' && id) {
        currentRecord = {
          id,
          type: 'INDI',
          name: '',
          givenName: '',
          surname: '',
          sex: null,
          birth: '',
          death: '',
          familiesAsSpouse: [],
          familyAsChild: null,
        };
        individuals[id] = currentRecord;
      } else if (tag === 'FAM' && id) {
        currentRecord = {
          id,
          type: 'FAM',
          husband: null,
          wife: null,
          children: [],
        };
        families[id] = currentRecord;
      } else {
        currentRecord = null;
      }
    } else if (currentRecord) {
      if (level === 1) {
        currentSubRecord = tag;
        if (currentRecord.type === 'INDI') {
          const indi = currentRecord as Individual;
          if (tag === 'NAME') {
            indi.name = (value || '').replace(/\//g, '').trim();
          } else if (tag === 'SEX') {
            indi.sex = value === 'M' ? 'M' : value === 'F' ? 'F' : null;
          } else if (tag === 'FAMS' && value) {
            indi.familiesAsSpouse.push(value);
          } else if (tag === 'FAMC' && value) {
            indi.familyAsChild = value;
          }
        } else if (currentRecord.type === 'FAM') {
          const fam = currentRecord as Family;
          if (tag === 'HUSB') {
            fam.husband = value || null;
          } else if (tag === 'WIFE') {
            fam.wife = value || null;
          } else if (tag === 'CHIL' && value) {
            fam.children.push(value);
          }
        }
      } else if (level === 2) {
        if (currentRecord.type === 'INDI') {
          const indi = currentRecord as Individual;
          if (currentSubRecord === 'NAME') {
            if (tag === 'GIVN') {
              indi.givenName = value || '';
            } else if (tag === 'SURN') {
              indi.surname = value || '';
            }
          } else if (tag === 'DATE') {
            if (currentSubRecord === 'BIRT') {
              indi.birth = value || '';
            } else if (currentSubRecord === 'DEAT') {
              indi.death = value || '';
            }
          }
        }
      }
    }
  }

  return { individuals, families };
}

export function getDisplayName(person: Individual | null | undefined): string {
  if (!person) return 'Unknown';

  const nameParts = person.name.split(' ').filter((p) => p);
  if (nameParts.length > 1) {
    return person.name;
  }

  if (person.givenName && person.surname) {
    return `${person.givenName} ${person.surname}`;
  }
  if (person.givenName) {
    return person.givenName;
  }
  if (person.name) {
    return person.name;
  }
  if (person.surname) {
    return person.surname;
  }

  return 'Unknown';
}

export function findRootAncestors(data: GedcomData): Individual[] {
  const { individuals } = data;
  const roots: Individual[] = [];

  // Include all individuals as potential roots
  for (const id in individuals) {
    roots.push(individuals[id]);
  }

  roots.sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b)));
  return roots;
}

export function findDefaultRoot(data: GedcomData): Individual | null {
  const { individuals } = data;

  // Find all individuals with no parents (true roots at top level)
  const trueRoots: Individual[] = [];
  for (const id in individuals) {
    const person = individuals[id];
    if (!person.familyAsChild) {
      trueRoots.push(person);
    }
  }

  if (trueRoots.length === 0) {
    const allIndividuals = Object.values(individuals);
    allIndividuals.sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b)));
    return allIndividuals[0] || null;
  }

  if (trueRoots.length === 1) {
    return trueRoots[0];
  }

  // Build graph and calculate descendants using topological sort + DP
  const childrenOf = buildChildrenGraph(data);
  const descendantCount = calculateDescendantCounts(individuals, childrenOf);

  // Find the root with most descendants
  let maxCount = -1;
  let selectedRoot: Individual | null = null;

  for (const root of trueRoots) {
    const count = descendantCount.get(root.id) || 0;
    if (count > maxCount) {
      maxCount = count;
      selectedRoot = root;
    }
  }

  return selectedRoot;
}

/**
 * Build adjacency list: personId -> [childIds]
 */
function buildChildrenGraph(data: GedcomData): Map<string, string[]> {
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
function calculateDescendantCounts(
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
