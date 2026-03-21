import { useState, useEffect } from "react";

/**
 * Debounce a value by the specified delay.
 * Returns the debounced value which only updates after
 * the input has stopped changing for `delay` milliseconds.
 *
 * Usage:
 *   const [query, setQuery] = useState("");
 *   const debouncedQuery = useDebounce(query, 300);
 *   // debouncedQuery updates 300ms after the user stops typing
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
