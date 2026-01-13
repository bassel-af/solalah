import type { Individual, GedcomData } from './types';
import { getDisplayName } from './display';
import { buildChildrenGraph, calculateDescendantCounts } from './graph';

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
