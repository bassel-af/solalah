import type { Individual, GedcomData } from '@/lib/gedcom';
import { PersonCard } from './PersonCard';

interface CoupleRowProps {
  person: Individual;
  spouseIds: string[];
  data: GedcomData;
  isRoot?: boolean;
  nodeRef?: (el: HTMLElement | null) => void;
}

export function CoupleRow({ person, spouseIds, data, isRoot = false, nodeRef }: CoupleRowProps) {
  const spouses = spouseIds
    .map((id) => data.individuals[id])
    .filter(Boolean);

  if (spouses.length > 0) {
    // Offset to center the main person instead of the whole couple
    // Each spouse group: connector (20px) + card (~170px with padding/border) = ~190px
    const spouseGroupWidth = 190;
    const offset = (spouses.length * spouseGroupWidth) / 2;

    return (
      <div className="couple" style={{ marginLeft: offset }}>
        <div ref={nodeRef} className="main-person">
          <PersonCard person={person} isRoot={isRoot} />
        </div>
        {spouses.map((spouse) => (
          <div key={spouse.id} className="spouse-group">
            <div className="spouse-connector" />
            <PersonCard person={spouse} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div ref={nodeRef} className="main-person">
      <PersonCard person={person} isRoot={isRoot} />
    </div>
  );
}
