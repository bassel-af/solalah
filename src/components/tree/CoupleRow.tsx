import type { Individual, GedcomData } from '@/lib/gedcom';
import { PersonCard } from './PersonCard';

interface CoupleRowProps {
  person: Individual;
  spouseId: string | null;
  data: GedcomData;
  isRoot?: boolean;
}

export function CoupleRow({ person, spouseId, data, isRoot = false }: CoupleRowProps) {
  const spouse = spouseId ? data.individuals[spouseId] : null;

  if (spouse) {
    return (
      <div className="couple">
        <PersonCard person={person} isRoot={isRoot} />
        <div className="spouse-connector" />
        <PersonCard person={spouse} />
      </div>
    );
  }

  return <PersonCard person={person} isRoot={isRoot} />;
}
