import { useState, useEffect, useCallback } from 'react';
import { MAP_IDS, MapTheme } from '../../../config/mapIds';

const STORAGE_KEY = 'clearvoice_map_theme'; // 'day' | 'midnight' | null (follow system)

/**
 * Persistent Map Theme Hook
 * 
 * Manages Map ID selection with priority: Manual user choice > System preference > Default (Day)
 * Persists manual choice in localStorage to survive page refreshes.
 * 
 * @returns { activeMapId, resolvedTheme, setTheme }
 */
export function usePersistentMapTheme() {
  // Initialize from localStorage or system preference (prevents flicker)
  const [manualTheme, setManualTheme] = useState<MapTheme | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'day' || stored === 'midnight') return stored;
    return null; // Follow system
  });
  
  const [systemIsDark, setSystemIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Listen for system theme changes (only if no manual choice)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => {
      // Only auto-update if user hasn't made a manual choice
      if (!localStorage.getItem(STORAGE_KEY)) {
        setSystemIsDark(e.matches);
      }
    };
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

  // Resolve: Manual > System > Default (Day)
  const resolved = manualTheme ?? (systemIsDark ? 'midnight' : 'day');
  const activeMapId = MAP_IDS[resolved];

  const setTheme = useCallback((theme: MapTheme | null) => {
    setManualTheme(theme);
    if (theme) {
      localStorage.setItem(STORAGE_KEY, theme);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      // Re-sync with system
      setSystemIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);

  return { activeMapId, resolvedTheme: resolved, setTheme };
}
