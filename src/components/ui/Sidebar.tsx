import { useMemo, useState, useEffect } from 'react';
import { useTree } from '@/context/TreeContext';
import { getDisplayName, getAllDescendants } from '@/lib/gedcom';

interface PersonItem {
  id: string;
  name: string;
  dates: string;
  sex: string;
  deceased: boolean;
}

export function Sidebar() {
  const {
    data,
    rootsList,
    selectedRootId,
    setSelectedRootId,
    initialRootId,
    rootFilterStrategy,
    focusPersonId,
    setFocusPersonId,
  } = useTree();

  const [searchFilter, setSearchFilter] = useState('');
  const [rootDropdownOpen, setRootDropdownOpen] = useState(false);
  const [rootFilter, setRootFilter] = useState('');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close sidebar when clicking on a person (mobile UX improvement)
  useEffect(() => {
    if (focusPersonId && window.innerWidth <= 768) {
      setIsMobileOpen(false);
    }
  }, [focusPersonId]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isMobileOpen && window.innerWidth <= 768) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  // Get selected root display text
  const selectedRoot = rootsList.find((r) => r.id === selectedRootId);
  const selectedRootText = selectedRoot?.text || '';

  // Filter roots for dropdown
  const filteredRoots = rootsList.filter((r) =>
    r.text.toLowerCase().includes(rootFilter.toLowerCase())
  );

  // Build list of all individuals with their info
  const allIndividuals = useMemo<PersonItem[]>(() => {
    if (!data) return [];

    const individuals: PersonItem[] = [];
    for (const person of Object.values(data.individuals)) {
      const name = getDisplayName(person);
      let dates = '';
      if (person.birth || person.death) {
        dates = `${person.birth || '?'} - ${person.death || ''}`;
      }
      individuals.push({
        id: person.id,
        name,
        dates,
        sex: person.sex || 'U',
        deceased: person.isDeceased,
      });
    }

    // Sort alphabetically
    individuals.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    return individuals;
  }, [data]);

  // Filter individuals based on search and root filter strategy
  const filteredIndividuals = useMemo(() => {
    let filtered = allIndividuals;

    // Apply root filter strategy
    if (rootFilterStrategy === 'descendants' && initialRootId && data) {
      const descendantIds = getAllDescendants(data, initialRootId);
      descendantIds.add(initialRootId);
      filtered = filtered.filter((p) => descendantIds.has(p.id));
    }

    // Apply search filter
    if (searchFilter.trim()) {
      const query = searchFilter.toLowerCase();
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(query));
    }

    return filtered;
  }, [allIndividuals, searchFilter, rootFilterStrategy, initialRootId, data]);

  // Stats
  const { indCount, famCount } = useMemo(() => {
    if (!data) return { indCount: 0, famCount: 0 };

    if (rootFilterStrategy === 'all' || !initialRootId) {
      return {
        indCount: Object.keys(data.individuals).length,
        famCount: Object.keys(data.families).length,
      };
    }

    const descendantIds = getAllDescendants(data, initialRootId);
    descendantIds.add(initialRootId);

    let familyCount = 0;
    for (const famId in data.families) {
      const fam = data.families[famId];
      if (
        (fam.husband && descendantIds.has(fam.husband)) ||
        (fam.wife && descendantIds.has(fam.wife))
      ) {
        familyCount++;
      }
    }

    return {
      indCount: descendantIds.size,
      famCount: familyCount,
    };
  }, [data, rootFilterStrategy, initialRootId]);

  const handleRootSelect = (id: string, text: string) => {
    setSelectedRootId(id);
    setRootFilter(text);
    setRootDropdownOpen(false);
  };

  const handlePersonClick = (id: string) => {
    setFocusPersonId(id);
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        className={`sidebar-toggle ${isMobileOpen ? 'is-open' : ''}`}
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        aria-label={isMobileOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
      >
        <span className="sidebar-toggle-bar" />
        <span className="sidebar-toggle-bar" />
        <span className="sidebar-toggle-bar" />
      </button>

      {/* Mobile Overlay */}
      <div
        className={`sidebar-overlay ${isMobileOpen ? 'is-visible' : ''}`}
        onClick={() => setIsMobileOpen(false)}
      />

      <aside className={`sidebar ${isMobileOpen ? 'is-open' : ''}`}>
        <div className="sidebar-header">
          <h2>شجرة العائلة</h2>
          <button
            className="sidebar-close"
            onClick={() => setIsMobileOpen(false)}
            aria-label="إغلاق القائمة"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

      <div className="sidebar-section">
        <label className="sidebar-label">الجد الأعلى</label>
        <div className="sidebar-dropdown">
          <input
            type="text"
            className="sidebar-dropdown-input"
            placeholder="اكتب للبحث..."
            value={rootDropdownOpen ? rootFilter : selectedRootText}
            onFocus={() => {
              setRootFilter('');
              setRootDropdownOpen(true);
            }}
            onChange={(e) => {
              setRootFilter(e.target.value);
              setRootDropdownOpen(true);
            }}
            onBlur={() => setTimeout(() => setRootDropdownOpen(false), 150)}
          />
          {rootDropdownOpen && (
            <ul className="sidebar-dropdown-list">
              {filteredRoots.length === 0 ? (
                <li className="sidebar-dropdown-empty">لا توجد نتائج</li>
              ) : (
                filteredRoots.map((root) => (
                  <li
                    key={root.id}
                    className={`sidebar-dropdown-item ${root.id === selectedRootId ? 'selected' : ''}`}
                    onMouseDown={() => handleRootSelect(root.id, root.text)}
                  >
                    {root.text}
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      </div>


      <div className="sidebar-stats">
        <div className="stat-item">
          <span className="stat-value">{indCount}</span>
          <span className="stat-label">فرد</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{famCount}</span>
          <span className="stat-label">عائلة</span>
        </div>
      </div>

      <div className="sidebar-section sidebar-search-section">
        <input
          type="text"
          className="sidebar-search"
          placeholder="ابحث عن شخص..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
        />
        <span className="sidebar-search-count">
          {filteredIndividuals.length} نتيجة
        </span>
      </div>

      <ul className="sidebar-people-list">
        {filteredIndividuals.map((person) => (
          <li
            key={person.id}
            className={`sidebar-person ${focusPersonId === person.id ? 'active' : ''} ${person.sex === 'M' ? 'male' : person.sex === 'F' ? 'female' : ''} ${person.deceased ? 'deceased' : ''}`}
            onClick={() => handlePersonClick(person.id)}
          >
            <span className="person-name">{person.name}</span>
            {person.dates && <span className="person-dates">{person.dates}</span>}
          </li>
        ))}
      </ul>
    </aside>
    </>
  );
}
