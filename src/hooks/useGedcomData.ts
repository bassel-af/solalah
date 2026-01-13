import { useEffect } from 'react';
import { parseGedcom } from '@/lib/gedcom/parser';
import { useTree } from '@/context/TreeContext';

export function useGedcomData(url: string) {
  const { setData, setError } = useTree();

  useEffect(() => {
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load: ${response.statusText}`);
        }
        return response.text();
      })
      .then((text) => {
        const data = parseGedcom(text);
        setData(data);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load family tree data');
      });
  }, [url, setData, setError]);
}
