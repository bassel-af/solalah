'use client';

import { useMemo, useEffect, useRef, useState } from 'react';
import { useTree } from '@/context/TreeContext';
import { useOptionalWorkspaceTree } from '@/context/WorkspaceTreeContext';
import { getDisplayName } from '@/lib/gedcom';
import { matchesSearch, searchRelevance } from '@/lib/utils/search';
import { shouldHideBirthDate } from '@/lib/tree/birth-date-privacy';

interface SearchMatch {
  id: string;
  name: string;
  dates: string;
}

export function SearchBar() {
  const { data, searchQuery, setSearchQuery, focusPersonId, setFocusPersonId } = useTree();
  const wsContext = useOptionalWorkspaceTree();
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute matches from GEDCOM data
  const matches = useMemo<SearchMatch[]>(() => {
    if (!data || !searchQuery.trim()) return [];

    const results: SearchMatch[] = [];

    for (const person of Object.values(data.individuals)) {
      const name = getDisplayName(person);
      const searchText = person.kunya ? `${name} ${person.kunya}` : name;
      if (matchesSearch(searchText, searchQuery)) {
        const hideBirth = shouldHideBirthDate(person, {
          hideBirthDateForFemale: wsContext?.hideBirthDateForFemale,
          hideBirthDateForMale: wsContext?.hideBirthDateForMale,
        });
        let dates = '';
        if (hideBirth) {
          if (person.death) dates = person.death;
        } else if (person.birth || person.death) {
          dates = `${person.birth || '?'} - ${person.death || ''}`;
        }
        results.push({ id: person.id, name, dates });
      }
    }

    results.sort((a, b) => searchRelevance(a.name, searchQuery) - searchRelevance(b.name, searchQuery));
    return results;
  }, [data, searchQuery, wsContext?.hideBirthDateForFemale, wsContext?.hideBirthDateForMale]);

  // Auto-focus first match when search query changes
  useEffect(() => {
    if (matches.length > 0) {
      setFocusPersonId(matches[0].id);
      setIsExpanded(true);
    } else {
      setFocusPersonId(null);
      setIsExpanded(false);
    }
  }, [matches, setFocusPersonId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMatchClick = (id: string) => {
    setFocusPersonId(id);
  };

  return (
    <div className="search-container" ref={containerRef}>
      <input
        type="text"
        className="search-input"
        placeholder="ابحث في الشجرة..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={() => matches.length > 0 && setIsExpanded(true)}
      />
      {searchQuery && (
        <div className="search-results">
          {matches.length > 0
            ? `تم العثور على ${matches.length} نتيجة`
            : 'لا توجد نتائج'}
        </div>
      )}
      {isExpanded && matches.length > 0 && (
        <ul className="search-matches-list">
          {matches.map((match) => (
            <li
              key={match.id}
              className={`search-match-item ${focusPersonId === match.id ? 'active' : ''}`}
              onClick={() => handleMatchClick(match.id)}
            >
              <span className="match-name">{match.name}</span>
              {match.dates && <span className="match-dates">{match.dates}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
