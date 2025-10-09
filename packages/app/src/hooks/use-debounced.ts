import { useEffect, useState } from "react";

/**
 * useDebounced
 * ------------
 * Keeps a debounced version of `value`.  Whenever `value` changes we start
 * a timer; if it changes again before `delay` ms elapse we reset the timer.
 *
 * @param value  The raw (rapidly-changing) value
 * @param delay  Milliseconds to wait after the *last* change (default 300 ms)
 */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    // Start a new timer for the latest value
    const id = window.setTimeout(() => setDebounced(value), delay);

    // If value or delay change before the timer fires, cancel and restart
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
