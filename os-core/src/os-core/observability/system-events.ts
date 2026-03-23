export type OSSystemEventType =
  | "BOOT_STARTED"
  | "PREFLIGHT_PASSED"
  | "PREFLIGHT_BLOCKED"
  | "REGISTRY_LOADED"
  | "POLICY_FAILURE"
  | "ACTION_EXECUTED"
  | "BRIDGE_CONNECTING"
  | "BRIDGE_CONNECTED"
  | "BRIDGE_DISCONNECTED"
  | "ENGINE_SHUTDOWN";

export interface OSSystemEvent {
  id: string;
  timestamp: string;
  type: OSSystemEventType;
  detail?: string;
  metadata?: Record<string, unknown>;
}

const MAX_SYSTEM_EVENTS = 200;
const systemEvents: OSSystemEvent[] = [];

export function appendSystemEvent(
  type: OSSystemEventType,
  detail?: string,
  metadata?: Record<string, unknown>
) {
  systemEvents.push({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    type,
    detail,
    metadata,
  });

  if (systemEvents.length > MAX_SYSTEM_EVENTS) {
    systemEvents.splice(0, systemEvents.length - MAX_SYSTEM_EVENTS);
  }
}

export function readSystemEvents(): OSSystemEvent[] {
  return [...systemEvents];
}

export function clearSystemEvents() {
  systemEvents.length = 0;
}
