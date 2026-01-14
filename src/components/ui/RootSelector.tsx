import { useState, useRef, useEffect } from 'react';
import { useTree } from '@/context/TreeContext';

export function RootSelector() {
  const { rootsList, selectedRootId, setSelectedRootId } = useTree();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Get current selection text
  const selectedRoot = rootsList.find((r) => r.id === selectedRootId);
  const displayText = selectedRoot?.text || '';

  // Filter roots based on input
  const filteredRoots = rootsList.filter((r) =>
    r.text.toLowerCase().includes(filter.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  function handleSelect(id: string, text: string) {
    setSelectedRootId(id);
    setFilter(text);
    setIsOpen(false);
  }

  function handleFocus() {
    setFilter('');
    setIsOpen(true);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFilter(e.target.value);
    setIsOpen(true);
  }

  return (
    <div className="controls">
      <label>اختر الجد الأعلى: </label>
      <div className="dropdown-container" ref={containerRef}>
        <input
          type="text"
          className="dropdown-search"
          placeholder="اكتب للبحث..."
          value={isOpen ? filter : displayText}
          onFocus={handleFocus}
          onChange={handleInputChange}
        />
        <div className={`dropdown-list ${isOpen ? 'open' : ''}`}>
          {filteredRoots.length === 0 ? (
            <div className="no-results">لا توجد نتائج</div>
          ) : (
            filteredRoots.map((root) => (
              <div
                key={root.id}
                className={`dropdown-item ${root.id === selectedRootId ? 'selected' : ''}`}
                onClick={() => handleSelect(root.id, root.text)}
              >
                {root.text}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
