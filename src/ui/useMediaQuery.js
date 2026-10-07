import { useCallback, useSyncExternalStore } from 'react';

/**
 * Live media-query match. Reads the current value on every render, so a
 * screen kept alive in the background is correct as soon as it reappears.
 */
export const useMediaQuery = (query) => {
  const subscribe = useCallback((onChange) => {
    const media = window.matchMedia?.(query);
    if (!media) return () => {};
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [query]);

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia?.(query).matches ?? false,
    () => false,
  );
};

export default useMediaQuery;
