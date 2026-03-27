/**
 * Async conversation / voice latency hints — never block audio hot paths.
 * Logs to analytics_logs with eventType voice_latency_hint.
 */
import { db } from "../db";
import { analyticsLogs } from "@shared/schema";

export async function enqueueVoiceLatencyHint(metadata: {
  siteConfigId?: string | null;
  msToFirstToken?: number;
  sessionKind?: "web_voice" | "pstn";
  callSid?: string | null;
}): Promise<void> {
  try {
    await db.insert(analyticsLogs).values({
      siteConfigId: metadata.siteConfigId ?? null,
      eventType: "voice_latency_hint",
      metadata: {
        ...metadata,
        recordedAt: new Date().toISOString(),
      },
    });
  } catch (e) {
    console.warn("[conversationLatencyMetrics] enqueue failed:", (e as Error)?.message);
  }
}
