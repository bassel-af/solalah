import { useEffect, useState } from 'react';
import { useTree } from '@/context/TreeContext';

export function SearchBar() {
  const { searchQuery, setSearchQuery } = useTree();
  const [matchCount, setMatchCount] = useState(0);

  useEffect(() => {
    if (!searchQuery) {
      setMatchCount(0);
      return;
    }

    // Count matches after DOM updates
    const timer = setTimeout(() => {
      const matches = document.querySelectorAll('.person.search-match');
      setMatchCount(matches.length);

      // Scroll to first match
      if (matches.length > 0) {
        matches[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="search-container">
      <input
        type="text"
        className="search-input"
        placeholder="ابحث في الشجرة..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <div className="search-results">
        {searchQuery &&
          (matchCount > 0
            ? `تم العثور على ${matchCount} نتيجة`
            : 'لا توجد نتائج')}
      </div>
    </div>
  );
}
