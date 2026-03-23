import type { ReadinessCheckResult } from "./types";

export async function checkSessionStorageQuota(): Promise<ReadinessCheckResult> {
  try {
    const testKey = "__os_core_readiness__";
    window.sessionStorage.setItem(testKey, "ok");
    window.sessionStorage.removeItem(testKey);
    return { status: "PASS", detail: "Writable and available" };
  } catch {
    return { status: "FAIL", detail: "Unavailable or quota-blocked" };
  }
}
