/**
 * Front desk projection integrity test.
 * Verifies lifecycle projection for:
 * assist_joined -> assist_ended -> outcome_captured
 *
 * Run with:
 *   doppler run -- tsx tests/test-frontdesk-projection.ts
 * or:
 *   npm run test:frontdesk-projection
 */

import { eq } from "drizzle-orm";
import { db } from "../server/db.js";
import { storage } from "../server/storage.js";
import { conversationEvents, siteConfigs } from "../shared/schema.js";

const TEST_PLACE_ID = "frontdesk-projection-test-place";
const TEST_SESSION_ID = "sess-frontdesk-projection-001";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function cleanup() {
  const rows = await db
    .select({ id: siteConfigs.id })
    .from(siteConfigs)
    .where(eq(siteConfigs.placeId, TEST_PLACE_ID));
  const siteIds = rows.map((row) => row.id);
  if (siteIds.length === 0) return;

  for (const siteId of siteIds) {
    await db.delete(conversationEvents).where(eq(conversationEvents.siteConfigId, siteId));
  }
  await db.delete(siteConfigs).where(eq(siteConfigs.placeId, TEST_PLACE_ID));
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set. Run with: doppler run -- tsx tests/test-frontdesk-projection.ts");
    process.exit(1);
  }

  await cleanup();

  try {
    const site = await storage.createSiteConfig({
      name: "Front Desk Projection Test Site",
      placeId: TEST_PLACE_ID,
    } as any);

    await storage.logConversationEvent({
      siteConfigId: site.id,
      sessionId: TEST_SESSION_ID,
      eventType: "frontdesk.assist_joined",
      metadata: {
        assistMode: "coPilot",
        summary: "Operator joined to assist with reschedule request.",
      },
    });

    const afterJoin = await storage.getFrontDeskSessions(site.id, { includeResolved: true });
    assert(afterJoin.projectionVersion > 0, "projectionVersion should initialize after first event");
    assert(afterJoin.sessions.length === 1, "should materialize one session after assist_joined");
    assert(afterJoin.sessions[0].workflowState === "OPERATOR_JOINED", "workflowState should be OPERATOR_JOINED after join");
    assert(afterJoin.sessions[0].operatorJoined === true, "operatorJoined should be true after join");

    await storage.logConversationEvent({
      siteConfigId: site.id,
      sessionId: TEST_SESSION_ID,
      eventType: "frontdesk.assist_ended",
      metadata: {
        assistMode: "none",
        summary: "Operator returned session to AI flow.",
      },
    });

    const afterEnd = await storage.getFrontDeskSessions(site.id, { includeResolved: true });
    assert(afterEnd.projectionVersion > afterJoin.projectionVersion, "projectionVersion should increase after assist_ended");
    assert(afterEnd.sessions[0].workflowState === "AI_ACTIVE", "workflowState should be AI_ACTIVE after assist_ended");
    assert(afterEnd.sessions[0].operatorJoined === false, "operatorJoined should be false after assist_ended");

    const resolvedAt = new Date().toISOString();
    await storage.logConversationEvent({
      siteConfigId: site.id,
      sessionId: TEST_SESSION_ID,
      eventType: "frontdesk.outcome_captured",
      metadata: {
        outcomeType: "booking",
        resolvedAt,
        resolvedBy: "frontdesk.operator",
        summary: "Appointment booked for tomorrow morning.",
      },
    });

    const afterOutcome = await storage.getFrontDeskSessions(site.id, { includeResolved: true });
    const resolvedSession = afterOutcome.sessions[0];
    assert(afterOutcome.projectionVersion > afterEnd.projectionVersion, "projectionVersion should increase after outcome capture");
    assert(resolvedSession.workflowState === "RESOLVED", "workflowState should be RESOLVED after outcome capture");
    assert(resolvedSession.outcomeType === "booking", "outcomeType should be booking");
    assert(!!resolvedSession.resolvedAt, "resolvedAt should be present after outcome capture");
    assert(typeof resolvedSession.transcriptPreview === "string" && resolvedSession.transcriptPreview.length > 0, "transcriptPreview should be materialized");

    const unresolvedOnly = await storage.getFrontDeskSessions(site.id, { includeResolved: false });
    assert(unresolvedOnly.sessions.length === 0, "resolved session should be excluded when includeResolved=false");
    assert(
      unresolvedOnly.projectionVersion === afterOutcome.projectionVersion,
      "projectionVersion should remain consistent across includeResolved filters"
    );

    console.log("Front desk projection test: passed");
  } finally {
    await cleanup();
  }
}

main().catch((error) => {
  console.error("Front desk projection test: failed");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
