import { useEffect, useState } from 'react';

/**
 * Keeps an overlay mounted for `exitMs` after it closes so a CSS exit
 * animation can play. Returns true while the overlay should render.
 */
export const usePresence = (isOpen, exitMs = 320) => {
  const [rendered, setRendered] = useState(isOpen);
  const [previousOpen, setPreviousOpen] = useState(isOpen);
  if (isOpen !== previousOpen) {
    setPreviousOpen(isOpen);
    if (isOpen) setRendered(true);
  }
  useEffect(() => {
    if (isOpen || !rendered) return undefined;
    const timer = window.setTimeout(() => setRendered(false), exitMs);
    return () => window.clearTimeout(timer);
  }, [exitMs, isOpen, rendered]);
  return rendered;
};

export default usePresence;
