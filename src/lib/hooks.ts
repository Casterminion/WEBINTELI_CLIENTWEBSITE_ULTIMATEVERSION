import { useState, useEffect } from 'react';

/**
 * Hook to determine if we should skip animations for a given section.
 * It checks if the current window hash matches the section ID.
 */
export function useSkipAnimation(sectionId: string) {
  const [shouldSkip, setShouldSkip] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === sectionId) {
      setShouldSkip(true);
    }
  }, [sectionId]);

  return shouldSkip;
}
