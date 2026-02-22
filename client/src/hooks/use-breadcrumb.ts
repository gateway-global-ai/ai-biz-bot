import { useEffect } from "react";
import { useLocation } from "wouter";

const BREADCRUMB_KEY = "gateway_last_breadcrumb";

export function useBreadcrumbTracker(): void {
  const [pathname] = useLocation();

  useEffect(() => {
    if (!pathname.startsWith("/error")) {
      const state = {
        path: pathname,
        activity: document.title.split("|")[0].trim() || pathname,
        timestamp: Date.now(),
      };
      try {
        localStorage.setItem(BREADCRUMB_KEY, JSON.stringify(state));
      } catch {
        // ignore quota / private mode
      }
    }
  }, [pathname]);
}

export { BREADCRUMB_KEY };
