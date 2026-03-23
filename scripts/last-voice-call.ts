/**
 * One-off: print last voice call (voice_usage_log + call_log) for AI Biz Bot.
 * Run: doppler run -- npx tsx scripts/last-voice-call.ts
 */
import { db } from "../server/db";
import { voiceUsageLogs, callLogs, siteConfigs } from "@shared/schema";
import { desc, eq } from "drizzle-orm";

async function main() {
  const [usage] = await db
    .select()
    .from(voiceUsageLogs)
    .orderBy(desc(voiceUsageLogs.createdAt))
    .limit(1);

  const [lastCall] = await db
    .select()
    .from(callLogs)
    .orderBy(desc(callLogs.timestamp))
    .limit(1);

  if (lastCall) {
    console.log("--- Most recent call_log (any) ---");
    console.log("Call SID:", lastCall.callSid ?? "—");
    console.log("Phone:", lastCall.phoneNumber, "| Direction:", lastCall.direction);
    console.log("Duration:", lastCall.actualSeconds ?? lastCall.duration, "seconds");
    console.log("Status:", lastCall.status, "| At:", lastCall.timestamp ?? lastCall.callEnd);
    console.log("Site ID:", lastCall.siteConfigId ?? "—");
  }

  if (!usage) {
    console.log("\nNo voice_usage_log rows (billing) yet. If you just called, the call may be in call_logs above.");
    return;
  }

  const [site] = await db
    .select({ name: siteConfigs.name })
    .from(siteConfigs)
    .where(eq(siteConfigs.id, usage.siteConfigId))
    .limit(1);

  const [call] = usage.callSid
    ? await db
        .select()
        .from(callLogs)
        .where(eq(callLogs.callSid, usage.callSid))
        .limit(1)
    : [null];

  const costUsd = (usage.billedAmountCents / 100).toFixed(2);
  console.log("--- Last voice call (AI Biz Bot / Clear Voice) ---");
  console.log("Site:", site?.name ?? usage.siteConfigId);
  console.log("Call SID:", usage.callSid ?? "—");
  console.log("Type:", usage.callType);
  console.log("Duration:", usage.rawDurationSeconds, "seconds");
  console.log("Billed minutes:", usage.billedMinutes);
  console.log("Rate: $0.10/min");
  console.log("Cost: $" + costUsd);
  console.log("At:", usage.createdAt);
  if (call) {
    console.log("Call log: phone", call.phoneNumber, "| status", call.status);
  }
  console.log("(Token counts are not stored per call; billing is by voice minutes.)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
