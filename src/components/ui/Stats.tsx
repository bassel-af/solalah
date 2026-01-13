import { useTree } from '@/context/TreeContext';

export function Stats() {
  const { data, rootsList } = useTree();

  if (!data) return null;

  const indCount = Object.keys(data.individuals).length;
  const famCount = Object.keys(data.families).length;

  return (
    <div className="stats">
      {indCount} individuals, {famCount} families, {rootsList.length} root ancestors
    </div>
  );
}
