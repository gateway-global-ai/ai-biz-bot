/**
 * Seed all industry funnel payloads as draft knowledge artifacts.
 * Usage: doppler run -- npx tsx scripts/seed-industry-funnels.ts
 */
import "dotenv/config";
import { db } from "../server/db.js";
import { knowledgeArtifacts } from "../shared/schema.js";
import { eq, and } from "drizzle-orm";
import { ALL_FUNNELS } from "../shared/industryFunnelTemplates/index.js";
import { funnelPayloadSchema, funnelArtifactKey } from "../shared/industryFunnelTemplates/FunnelPayload.js";

async function seed() {
  for (const payload of ALL_FUNNELS) {
    const parsed = funnelPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      console.error("Schema error for", payload.slug, parsed.error.flatten());
      continue;
    }

    const key = funnelArtifactKey(payload.slug);
    const content = JSON.stringify(parsed.data, null, 2);

    const [existing] = await db
      .select({ id: knowledgeArtifacts.id })
      .from(knowledgeArtifacts)
      .where(and(
        eq(knowledgeArtifacts.agentAccessKey, key),
        eq(knowledgeArtifacts.scope, "platform"),
      ))
      .limit(1);

    if (existing?.id) {
      await db.update(knowledgeArtifacts)
        .set({ content, updatedAt: new Date() })
        .where(eq(knowledgeArtifacts.id, existing.id));
      console.log(`[seed-funnels] updated  ${key}`);
    } else {
      await db.insert(knowledgeArtifacts).values({
        title: `${payload.vertical} Funnel Payload V${payload.version}`,
        content,
        agentAccessKey: key,
        scope: "platform",
        visibility: "private",
        status: "draft",
        classification: "sales_process",
        trustWeight: 8,
        groupLevel: "operator",
        tags: ["funnel", "industry", payload.industryVertical],
      });
      console.log(`[seed-funnels] created  ${key}`);
    }
  }
  console.log("[seed-funnels] Done.");
  process.exit(0);
}

seed().catch((e) => {
  console.error("[seed-funnels] Fatal:", e);
  process.exit(1);
});
