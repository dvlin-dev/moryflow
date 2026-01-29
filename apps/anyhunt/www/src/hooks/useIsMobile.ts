/**
 * [INPUT]: breakpoint (default: 768)
 * [OUTPUT]: boolean indicating if viewport is mobile width
 * [POS]: Hook for responsive mobile detection
 * [UPDATE]: 2026-01-28 补充同步检测工具用于路由回退
 */

import { useState, useEffect } from 'react';

/**
 * Hook for detecting mobile viewport
 *
 * Uses window.matchMedia for efficient resize detection
 * SSR safe with two-pass rendering to avoid hydration mismatch:
 * - First render (server + client initial): always returns false
 * - After hydration: returns actual viewport state
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  // Always start with false to match server rendering and avoid hydration mismatch
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Use matchMedia for efficient resize detection
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);

    // Set actual value after hydration
    setIsMobile(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [breakpoint]);

  return isMobile;
}

export function getIsMobileViewport(breakpoint: number = 768): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(`(max-width: ${breakpoint - 1}px)`).matches;
}
