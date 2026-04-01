/**
 * Client-side policy enforcement hook.
 *
 * Consumes server-provided allowedViewIds and allowedActionIds
 * (from canvas.resolve / intent loop resolution) to gate:
 *   - Which views can render in the canvas
 *   - Which menu items are visible
 *   - Which actions can execute
 *
 * Doctrine D2: Model proposes, OS decides — the client is not the authority.
 * Doctrine D7: No view renders unless it is in allowedViewIds.
 * Doctrine D8: Canvas rendered outside allowedViewIds = DOCTRINE_VIOLATION_CANVAS_BYPASS.
 *
 * The server is the sole source of truth. This hook is a client-side guard
 * that prevents rendering drift. It does NOT grant authority — it filters
 * what the server has already allowed.
 */

import { useState, useCallback, useMemo } from 'react';

export interface PolicySurface {
  allowedViewIds: string[];
  allowedActionIds: string[];
  allowedCanvasViewIds: string[];
  enforcementMode: 'strict' | 'permissive';
}

const DEFAULT_SURFACE: PolicySurface = {
  allowedViewIds: [],
  allowedActionIds: [],
  allowedCanvasViewIds: [],
  enforcementMode: 'permissive',
};

let _violationLog: Array<{
  type: string;
  id: string;
  timestamp: number;
}> = [];

export function getPolicyViolationLog() {
  return _violationLog;
}

export function clearPolicyViolationLog() {
  _violationLog = [];
}

export function usePolicyEnforcement(initialSurface?: Partial<PolicySurface>) {
  const [surface, setSurface] = useState<PolicySurface>({
    ...DEFAULT_SURFACE,
    ...initialSurface,
  });

  const updateSurface = useCallback((update: Partial<PolicySurface>) => {
    setSurface(prev => ({ ...prev, ...update }));
  }, []);

  const hydrateSurfaceFromResolve = useCallback(
    (resolveResponse: {
      allowedCanvasViewIds?: string[];
      allowedActionIds?: string[];
      allowedViewIds?: string[];
    }) => {
      setSurface(prev => ({
        ...prev,
        allowedViewIds: resolveResponse.allowedViewIds ?? resolveResponse.allowedCanvasViewIds ?? prev.allowedViewIds,
        allowedActionIds: resolveResponse.allowedActionIds ?? prev.allowedActionIds,
        allowedCanvasViewIds: resolveResponse.allowedCanvasViewIds ?? prev.allowedCanvasViewIds,
      }));
    },
    [],
  );

  const isViewAllowed = useCallback(
    (viewId: string): boolean => {
      if (surface.enforcementMode === 'permissive' && surface.allowedViewIds.length === 0) {
        return true;
      }
      const allowed = surface.allowedViewIds.includes(viewId) ||
        surface.allowedCanvasViewIds.includes(viewId);
      if (!allowed) {
        _violationLog.push({
          type: 'DOCTRINE_VIOLATION_CANVAS_BYPASS',
          id: viewId,
          timestamp: Date.now(),
        });
        if (surface.enforcementMode === 'strict') {
          console.warn(`[PolicyEnforcement] View "${viewId}" blocked — not in allowedViewIds`);
        }
      }
      return allowed;
    },
    [surface],
  );

  const isActionAllowed = useCallback(
    (actionId: string): boolean => {
      if (surface.enforcementMode === 'permissive' && surface.allowedActionIds.length === 0) {
        return true;
      }
      const allowed = surface.allowedActionIds.includes(actionId);
      if (!allowed) {
        _violationLog.push({
          type: 'DOCTRINE_VIOLATION_UNREGISTERED_ACTION',
          id: actionId,
          timestamp: Date.now(),
        });
        if (surface.enforcementMode === 'strict') {
          console.warn(`[PolicyEnforcement] Action "${actionId}" blocked — not in allowedActionIds`);
        }
      }
      return allowed;
    },
    [surface],
  );

  const filterMenuItems = useCallback(
    <T extends { viewId?: string; action?: string; children?: T[] }>(
      items: T[],
    ): T[] => {
      if (surface.enforcementMode === 'permissive' && surface.allowedViewIds.length === 0) {
        return items;
      }
      return items
        .map(item => {
          const filteredChildren = item.children
            ? filterMenuItems(item.children)
            : undefined;

          if (item.viewId && !isViewAllowed(item.viewId)) {
            return null;
          }

          if (filteredChildren && filteredChildren.length === 0 && item.children && item.children.length > 0) {
            return null;
          }

          return {
            ...item,
            children: filteredChildren,
          };
        })
        .filter((item): item is T => item !== null);
    },
    [surface, isViewAllowed],
  );

  const stats = useMemo(() => ({
    totalAllowedViews: surface.allowedViewIds.length,
    totalAllowedActions: surface.allowedActionIds.length,
    enforcementMode: surface.enforcementMode,
    hasServerSurface: surface.allowedViewIds.length > 0 || surface.allowedActionIds.length > 0,
  }), [surface]);

  return {
    surface,
    updateSurface,
    hydrateSurfaceFromResolve,
    isViewAllowed,
    isActionAllowed,
    filterMenuItems,
    stats,
  };
}
