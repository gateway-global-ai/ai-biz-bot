/**
 * Intake governance smoke test:
 * policy toggle -> review queue enqueue -> approve/reject.
 *
 * Run with:
 *   npm run test:intake-governance
 */

import { and, eq } from "drizzle-orm";
import { db } from "../server/db.js";
import { storage } from "../server/storage.js";
import { customers, intakeChangeRequests, siteConfigs } from "../shared/schema.js";
import {
  resolveFieldWriteMode,
  resolveIntakePolicyConfig,
} from "../server/services/intakePolicyService.js";

const TEST_PLACE_ID = "intake-governance-smoke-place";
const TEST_PATIENT_ID = "patient-intake-smoke-001";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function cleanup() {
  const rows = await db
    .select({ id: siteConfigs.id })
    .from(siteConfigs)
    .where(eq(siteConfigs.placeId, TEST_PLACE_ID));
  for (const row of rows) {
    await db.delete(intakeChangeRequests).where(eq(intakeChangeRequests.siteConfigId, row.id));
  }
  await db.delete(siteConfigs).where(eq(siteConfigs.placeId, TEST_PLACE_ID));
  await db.delete(customers).where(eq(customers.id, TEST_PATIENT_ID));
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set. Run with: doppler run -- tsx tests/test-intake-governance-smoke.ts");
    process.exit(1);
  }

  await cleanup();

  try {
    const createdSite = await storage.createSiteConfig({
      name: "Intake Governance Smoke Site",
      placeId: TEST_PLACE_ID,
      agentConfig: {
        intakePolicy: {
          fields: {
            insuranceProvider: {
              category: "business_sensitive",
              customerWriteMode: "review",
              reviewerRole: "receptionist",
              auditRequired: true,
              channelRules: ["secure_form"],
            },
            attorneyProvider: {
              category: "business_sensitive",
              customerWriteMode: "denied",
              reviewerRole: "receptionist",
              auditRequired: true,
              channelRules: ["none"],
            },
          },
        },
      },
    } as any);
    await db
      .insert(customers)
      .values({
        id: TEST_PATIENT_ID,
        name: "Intake Smoke Patient",
        status: "new",
      })
      .onConflictDoNothing({ target: customers.id });

    const site = await storage.getSiteConfigById(createdSite.id);
    assert(!!site, "site not found after create");
    const policy = resolveIntakePolicyConfig(site as any);

    const insuranceMode = resolveFieldWriteMode(policy, "insuranceProvider");
    const attorneyMode = resolveFieldWriteMode(policy, "attorneyProvider");
    assert(insuranceMode === "review", "insurance should resolve to review mode");
    assert(attorneyMode === "denied", "attorney should resolve to denied mode");

    const [pending] = await db
      .insert(intakeChangeRequests)
      .values({
        siteConfigId: createdSite.id,
        patientId: TEST_PATIENT_ID,
        fieldName: "insuranceProvider",
        requestedValue: { maskedValue: "[SECURE_CAPTURED]" },
        writeMode: insuranceMode,
        status: "pending",
        reviewerRole: "receptionist",
      })
      .returning();
    assert(pending.status === "pending", "request should enqueue as pending");

    const [approved] = await db
      .update(intakeChangeRequests)
      .set({ status: "approved", reviewedBy: "reviewer-1", reviewedAt: new Date() })
      .where(
        and(
          eq(intakeChangeRequests.id, pending.id),
          eq(intakeChangeRequests.siteConfigId, createdSite.id)
        )
      )
      .returning();
    assert(approved.status === "approved", "request should be approvable");

    const [rejected] = await db
      .insert(intakeChangeRequests)
      .values({
        siteConfigId: createdSite.id,
        patientId: TEST_PATIENT_ID,
        fieldName: "insuranceProvider",
        requestedValue: { maskedValue: "[SECURE_CAPTURED]" },
        writeMode: insuranceMode,
        status: "pending",
        reviewerRole: "receptionist",
      })
      .returning();
    const [rejectedUpdate] = await db
      .update(intakeChangeRequests)
      .set({ status: "rejected", reviewedBy: "reviewer-1", reviewedAt: new Date() })
      .where(
        and(
          eq(intakeChangeRequests.id, rejected.id),
          eq(intakeChangeRequests.siteConfigId, createdSite.id)
        )
      )
      .returning();
    assert(rejectedUpdate.status === "rejected", "request should be rejectable");

    console.log("Intake governance smoke test: passed");
  } finally {
    await cleanup();
  }
}

main().catch((error) => {
  console.error("Intake governance smoke test: failed");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

