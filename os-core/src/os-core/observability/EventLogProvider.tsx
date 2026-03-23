import React, { createContext, useContext, useMemo, useState } from "react";

import type { GeminiOsState } from "../execution-plane/contracts/SyncPayload";

export type OSEventCategory =
  | "SYSTEM_LIFECYCLE"
  | "SYNC_PAYLOAD"
  | "ROUTE_CHANGE"
  | "GOVERNANCE_ACTION"
  | "POLICY_BLOCK"
  | "ERROR";

export interface OSEventLogEntry {
  id: string;
  timestamp: string;
  category: OSEventCategory;
  os_state_snapshot: GeminiOsState;
  payload: unknown;
}

interface EventLogContextValue {
  events: OSEventLogEntry[];
  appendEvent: (entry: Omit<OSEventLogEntry, "id" | "timestamp">) => void;
  clearEvents: () => void;
}

const MAX_EVENTS = 200;
const STORAGE_KEY = "os-core-event-log";

const EventLogContext = createContext<EventLogContextValue | null>(null);

function loadInitialEvents(): OSEventLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function EventLogProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<OSEventLogEntry[]>(loadInitialEvents);

  const appendEvent: EventLogContextValue["appendEvent"] = (entry) => {
    setEvents((current) => {
      const next = [
        ...current,
        {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          ...entry,
        },
      ].slice(-MAX_EVENTS);

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  };

  const clearEvents = () => {
    setEvents([]);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  };

  const value = useMemo(
    () => ({
      events,
      appendEvent,
      clearEvents,
    }),
    [events]
  );

  return <EventLogContext.Provider value={value}>{children}</EventLogContext.Provider>;
}

export function useOSEventLog() {
  const value = useContext(EventLogContext);
  if (!value) {
    throw new Error("useOSEventLog must be used within EventLogProvider");
  }
  return value;
}
