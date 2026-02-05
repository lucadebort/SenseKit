import { useRef, useEffect } from 'react';

/**
 * Hook to track if component is mounted.
 * Use this to prevent setState calls on unmounted components in async operations.
 */
export function useMounted() {
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return isMounted;
}
