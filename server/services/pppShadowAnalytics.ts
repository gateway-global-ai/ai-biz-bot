/**
 * Non-blocking PPP shadow telemetry → `analytics_logs` (text chat). Not the Sovereign Sentinel.
 */
import { db } from "../db";
import { analyticsLogs } from "@shared/schema";
import type { PppShadowScore } from "@shared/conversationGrounding";

export interface PppShadowLogParams {
  siteConfigId?: string | null;
  agentId?: string | null;
  channel: "website_chat" | "agent_chat";
  operationalMode?: string | null;
  score: PppShadowScore;
}

export function enqueuePppShadowLog(params: PppShadowLogParams): void {
  void (async () => {
    try {
      await db.insert(analyticsLogs).values({
        siteConfigId: params.siteConfigId ?? null,
        eventType: "ppp_shadow_score",
        metadata: {
          agentId: params.agentId ?? undefined,
          channel: params.channel,
          operationalMode: params.operationalMode ?? undefined,
          recordedAt: new Date().toISOString(),
          ...params.score,
        },
      });
    } catch (err) {
      console.warn("[pppShadowAnalytics] enqueue failed:", (err as Error)?.message);
    }
  })();
}
