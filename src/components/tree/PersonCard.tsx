import type { Individual } from '@/lib/gedcom';
import { getDisplayName } from '@/lib/gedcom';
import { useTree } from '@/context/TreeContext';

interface PersonCardProps {
  person: Individual | null | undefined;
  isRoot?: boolean;
}

export function PersonCard({ person, isRoot = false }: PersonCardProps) {
  const { searchQuery } = useTree();

  if (!person) return null;

  const displayName = getDisplayName(person);
  const sexClass = person.sex === 'M' ? 'male' : person.sex === 'F' ? 'female' : '';
  const rootClass = isRoot ? 'root' : '';

  // Check if this person matches search
  const isMatch =
    searchQuery &&
    displayName.toLowerCase().includes(searchQuery.toLowerCase());
  const matchClass = isMatch ? 'search-match' : '';

  let dates = '';
  if (person.birth || person.death) {
    dates = `${person.birth || '?'} - ${person.death || ''}`;
  }

  return (
    <div className={`person ${sexClass} ${rootClass} ${matchClass}`.trim()}>
      <div className="person-name">{displayName}</div>
      {dates && <div className="person-dates">{dates}</div>}
    </div>
  );
}
