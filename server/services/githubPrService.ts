import { eq } from "drizzle-orm";

import { db } from "../db";
import { executionPackets, pullRequestLinks } from "@shared/schema";
import { getCodingIntent } from "./intentExecutionService";

type GithubCreateOrUpdatePrInput = {
  intentExecutionId: string;
  repo?: string;
  title?: string;
  draft?: boolean;
};

type GithubEvidenceMarker = {
  intentExecutionId: string;
  approvalTier: string;
  requiredGates: string[];
  requiredReviewers: string[];
  evidenceRequirements: string[];
  domainsTouched: string[];
  reviewReady: boolean;
};

function parseRepo(repo: string): { owner: string; name: string } {
  const [owner, name] = repo.split("/");
  if (!owner || !name) {
    throw new Error(`invalid_repo:${repo}`);
  }
  return { owner, name };
}

function buildEvidenceMarker(marker: GithubEvidenceMarker): string {
  return `<!-- CODING_INTENT_EVIDENCE\n${JSON.stringify(marker, null, 2)}\n-->`;
}

function buildPullRequestBody(params: {
  marker: GithubEvidenceMarker;
  workTitle: string;
  summary?: Record<string, unknown>;
  checksRun: Array<{ cmd: string; status: string }>;
  risks: string[];
}): string {
  const summaryLines = Object.entries(params.summary ?? {}).map(([key, value]) => `- ${key}: ${String(value)}`);
  const checkLines =
    params.checksRun.length > 0
      ? params.checksRun.map((check) => `- \`${check.cmd}\` -> ${check.status}`)
      : ["- no checks recorded yet"];
  const riskLines = params.risks.length > 0 ? params.risks.map((risk) => `- ${risk}`) : ["- none recorded"];

  return [
    buildEvidenceMarker(params.marker),
    `## Coding Intent`,
    `- Title: ${params.workTitle}`,
    `- Intent Execution: \`${params.marker.intentExecutionId}\``,
    `- Approval tier: \`${params.marker.approvalTier}\``,
    `- Review ready: \`${params.marker.reviewReady ? "true" : "false"}\``,
    ``,
    `## Required Gates`,
    ...params.marker.requiredGates.map((gate) => `- ${gate}`),
    ``,
    `## Required Reviewers`,
    ...params.marker.requiredReviewers.map((reviewer) => `- ${reviewer}`),
    ``,
    `## Evidence Requirements`,
    ...params.marker.evidenceRequirements.map((item) => `- ${item}`),
    ``,
    `## Domains Touched`,
    ...(params.marker.domainsTouched.length > 0 ? params.marker.domainsTouched.map((item) => `- ${item}`) : ["- none recorded"]),
    ``,
    `## Summary`,
    ...(summaryLines.length > 0 ? summaryLines : ["- summary pending"]),
    ``,
    `## Checks`,
    ...checkLines,
    ``,
    `## Risks`,
    ...riskLines,
  ].join("\n");
}

async function githubRequest<T>(repo: string, path: string, init?: RequestInit): Promise<T> {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    throw new Error("github_token_missing");
  }
  const { owner, name } = parseRepo(repo);
  const response = await fetch(`https://api.github.com/repos/${owner}/${name}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`github_api_${response.status}:${text.slice(0, 300)}`);
  }
  return (await response.json()) as T;
}

async function upsertPullRequestLink(params: {
  intentExecutionId: string;
  repo: string;
  branchName: string;
  prNumber?: number | null;
  prUrl?: string | null;
  status: string;
}) {
  const [existing] = await db
    .select()
    .from(pullRequestLinks)
    .where(eq(pullRequestLinks.intentExecutionId, params.intentExecutionId))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(pullRequestLinks)
      .set({
        repo: params.repo,
        branchName: params.branchName,
        prNumber: params.prNumber ?? null,
        prUrl: params.prUrl ?? null,
        status: params.status,
        updatedAt: new Date(),
      })
      .where(eq(pullRequestLinks.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(pullRequestLinks)
    .values({
      intentExecutionId: params.intentExecutionId,
      provider: "github",
      repo: params.repo,
      branchName: params.branchName,
      prNumber: params.prNumber ?? null,
      prUrl: params.prUrl ?? null,
      status: params.status,
    })
    .returning();
  return created;
}

export async function createOrUpdateGithubPullRequest(input: GithubCreateOrUpdatePrInput) {
  const snapshot = await getCodingIntent(input.intentExecutionId);
  if (!snapshot || !snapshot.workItem || !snapshot.intent) {
    throw new Error("intent_execution_not_found");
  }

  const [packet] = await db
    .select()
    .from(executionPackets)
    .where(eq(executionPackets.intentExecutionId, input.intentExecutionId))
    .limit(1);
  if (!packet) {
    throw new Error("execution_packet_not_found");
  }

  const repo = input.repo ?? process.env.GITHUB_REPOSITORY?.trim();
  if (!repo) {
    return upsertPullRequestLink({
      intentExecutionId: input.intentExecutionId,
      repo: "unconfigured",
      branchName: packet.featureBranch,
      status: "pending_config",
    });
  }

  const requiredReviewers = (snapshot.gates ?? [])
    .flatMap((gate) => {
      const reqs = gate.requirements as { requiredReviewers?: string[] } | null;
      return reqs?.requiredReviewers ?? [];
    });

  const marker: GithubEvidenceMarker = {
    intentExecutionId: input.intentExecutionId,
    approvalTier:
      ((snapshot.gates?.[0]?.requirements as { approvalTier?: string } | undefined)?.approvalTier ?? "tier0"),
    requiredGates: (snapshot.outcome?.requiredGates as string[] | undefined) ?? [],
    requiredReviewers: [...new Set(requiredReviewers)],
    evidenceRequirements: [
      ...new Set(
        (snapshot.gates ?? []).flatMap((gate) => {
          const reqs = gate.requirements as { evidenceRequirements?: string[] } | null;
          return reqs?.evidenceRequirements ?? [];
        }),
      ),
    ],
    domainsTouched: (snapshot.outcome?.domainsTouched as string[] | undefined) ?? [],
    reviewReady: snapshot.outcome?.reviewReady ?? false,
  };

  const body = buildPullRequestBody({
    marker,
    workTitle: snapshot.workItem.title,
    summary: (snapshot.outcome?.summary as Record<string, unknown> | undefined) ?? {},
    checksRun: ((snapshot.outcome?.checksRun as Array<{ cmd: string; status: string }> | undefined) ?? []),
    risks: (snapshot.outcome?.risks as string[] | undefined) ?? [],
  });

  const title = input.title ?? snapshot.workItem.title;

  const [existing] = await db
    .select()
    .from(pullRequestLinks)
    .where(eq(pullRequestLinks.intentExecutionId, input.intentExecutionId))
    .limit(1);

  if (!process.env.GITHUB_TOKEN?.trim()) {
    return upsertPullRequestLink({
      intentExecutionId: input.intentExecutionId,
      repo,
      branchName: packet.featureBranch,
      status: "pending_config",
    });
  }

  if (existing?.prNumber) {
    const updated = await githubRequest<{ html_url: string; number: number }>(repo, `/pulls/${existing.prNumber}`, {
      method: "PATCH",
      body: JSON.stringify({
        title,
        body,
        base: packet.baseBranch,
      }),
    });
    return upsertPullRequestLink({
      intentExecutionId: input.intentExecutionId,
      repo,
      branchName: packet.featureBranch,
      prNumber: updated.number,
      prUrl: updated.html_url,
      status: "open",
    });
  }

  const created = await githubRequest<{ html_url: string; number: number }>(repo, `/pulls`, {
    method: "POST",
    body: JSON.stringify({
      title,
      head: packet.featureBranch,
      base: packet.baseBranch,
      body,
      draft: input.draft ?? false,
    }),
  });

  return upsertPullRequestLink({
    intentExecutionId: input.intentExecutionId,
    repo,
    branchName: packet.featureBranch,
    prNumber: created.number,
    prUrl: created.html_url,
    status: "open",
  });
}

export async function getGithubPullRequestLink(intentExecutionId: string) {
  const [link] = await db
    .select()
    .from(pullRequestLinks)
    .where(eq(pullRequestLinks.intentExecutionId, intentExecutionId))
    .limit(1);
  return link ?? null;
}
