import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HiOutlineSearch, HiOutlineChevronDown, HiOutlineX } from 'react-icons/hi';

/**
 * Searchable single-select dropdown.
 *
 * - Filters the provided `options` client-side as the user types.
 * - If `onSearch` is provided, it is also called (debounced) so the parent
 *   can fetch more matches from the server — useful when the full list is
 *   too large to load up front.
 */
const SearchableSelect = ({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  searchPlaceholder = 'Search...',
  error,
  required = false,
  disabled = false,
  onSearch,
  loading = false,
  noOptionsText = 'No matches found',
  className = ''
}) => {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selected = useMemo(
    () => options.find((o) => o.value === value) || null,
    [options, value]
  );

  // Close on outside click.
  useEffect(() => {
    const onMouseDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  // Focus the search box when the panel opens.
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  // Debounce server-side search.
  useEffect(() => {
    if (!onSearch) return undefined;
    const id = setTimeout(() => onSearch(term.trim()), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  const filtered = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (!t) return options;
    return options.filter((o) => String(o.label).toLowerCase().includes(t));
  }, [options, term]);

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
    setTerm('');
  };

  return (
    <div className={className} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((p) => !p)}
          className={`flex w-full items-center justify-between rounded-lg border shadow-sm transition-colors
            px-4 py-2.5 text-sm text-left
            ${error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-emerald-500 focus:ring-emerald-500'
            }
            ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}
            focus:outline-none focus:ring-2`}
        >
          <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
            {selected ? selected.label : placeholder}
          </span>
          <span className="flex items-center gap-1">
            {selected && !disabled && (
              <HiOutlineX
                className="w-4 h-4 text-gray-400 hover:text-gray-600"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
              />
            )}
            <HiOutlineChevronDown className="w-4 h-4 text-gray-400" />
          </span>
        </button>

        {open && (
          <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
            <ul className="max-h-60 overflow-y-auto py-1">
              {loading ? (
                <li className="px-4 py-3 text-sm text-gray-500">Searching...</li>
              ) : filtered.length === 0 ? (
                <li className="px-4 py-3 text-sm text-gray-500">{noOptionsText}</li>
              ) : (
                filtered.map((o) => (
                  <li key={o.value}>
                    <button
                      type="button"
                      onClick={() => handleSelect(o.value)}
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-emerald-50
                        ${o.value === value ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700'}`}
                    >
                      {o.label}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>

      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default SearchableSelect;
