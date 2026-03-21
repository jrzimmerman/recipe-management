import { useCallback } from "react";

interface SearchBarProps {
  value: string;
  onChange: (query: string) => void;
}

/**
 * Controlled search input — parent owns the query state and handles debounce.
 * No submit button needed; search triggers automatically as the user types.
 * Clear button resets the input when there's text.
 */
export function SearchBar({ value, onChange }: SearchBarProps) {
  const handleClear = useCallback(() => {
    onChange("");
  }, [onChange]);

  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="Search recipes or ingredients..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="search-input"
      />
      {value && (
        <button type="button" className="btn btn-secondary" onClick={handleClear}>
          Clear
        </button>
      )}
    </div>
  );
}
