/**
 * Owner / shell: call after primary agent commits to Design Studio handoff, before connecting voice with design_studio agent.
 */
import type { DesignHandoffPayload } from "@shared/designStudioHandoff";

export async function postDesignStudioHandoff(
  siteConfigId: string,
  payload: DesignHandoffPayload,
): Promise<{ designStudio: unknown; designProjectId: string }> {
  const res = await fetch(`/api/site-configs/${encodeURIComponent(siteConfigId)}/design-studio/handoff`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = typeof data.error === "string" ? data.error : res.statusText;
    throw new Error(err);
  }
  return {
    designStudio: data.designStudio,
    designProjectId: String(data.designProjectId ?? ""),
  };
}
