import { db } from "../db";
import { reviewArtifacts } from "@shared/schema";

export async function handleGenerateMarketingArtifact(
  args: {
    artifactType?: string;
    evidenceReviewIds?: string[];
    evidenceSignalIds?: string[];
    evidenceSummary: string;
    targetMetric: string;
    metricSource: string;
    frontmatter: Record<string, unknown>;
  },
  tenantId: string
) {
  console.log(`[Tier-2 CMO] Generating ${args.artifactType} artifact for tenant ${tenantId}`);

  try {
    const newArtifact = await db
      .insert(reviewArtifacts)
      .values({
        artifactType: args.artifactType ?? "",
        tenantId,
        generatedBy: "TIER_2_CMO_AGENT",
        evidenceReviewIds: args.evidenceReviewIds ?? [],
        evidenceSignalIds: args.evidenceSignalIds ?? [],
        evidenceSummary: args.evidenceSummary,
        targetMetric: args.targetMetric,
        metricSource: args.metricSource,
        status: "DRAFT_PENDING_APPROVAL",
        frontmatter: args.frontmatter ?? {},
      })
      .returning();

    return {
      success: true,
      message:
        "Artifact successfully generated and securely locked in the Control Plane. Awaiting human execution approval.",
      artifactId: newArtifact[0].artifactId,
    };
  } catch (error) {
    console.error("[Tier-2 CMO] Failed to write artifact:", error);
    return {
      success: false,
      message: "Database insertion failed. Verify Sovereign Guard constraints.",
    };
  }
}
