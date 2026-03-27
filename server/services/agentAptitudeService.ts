/**
 * Agent Aptitude Service
 *
 * Evaluates whether an agent's compiled system prompt meets the 80-point
 * deployment threshold before it is allowed to go live. If the agent fails,
 * a Gemini-powered remediation loop (max 3 attempts) attempts to improve the
 * prompt by drawing on the site's knowledge base, then re-scores.
 *
 * Scoring model (total 100 pts, threshold 80):
 *   1. Config completeness   0–35 pts  (name, roleType, systemPrompt, ARCH, DISC)
 *   2. Prompt quality        0–35 pts  (identity, biz context, behavioural rules,
 *                                        handoff language, knowledge domain)
 *   3. ARCH alignment        0–30 pts  (handoff cue when H≥50, assertive when D≥60,
 *                                        patient when S≥60)
 *
 * Remediation: on failure, Gemini receives the current prompt, the specific
 * violations, and up to 5 knowledge docs for the site. It returns an improved
 * prompt that is re-scored. Status is set to 'pass' only when score ≥ 80.
 */

import { db } from "../db.js";
import { knowledgeArtifacts } from "@shared/schema";
import { eq } from "drizzle-orm";

// ── Threshold ──────────────────────────────────────────────────────────────────

export const APTITUDE_THRESHOLD = 80;
export const APTITUDE_MAX_ATTEMPTS = 3;

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AgentAptitudeInput {
  name?: string | null;
  roleType?: string | null;
  systemPrompt?: string | null;
  operationalMode?: string | null;
  dominance?: number | null;
  influence?: number | null;
  steadiness?: number | null;
  conscientiousness?: number | null;
  archProfile?: {
    acknowledge?: number | null;
    reflect?: number | null;
    context?: number | null;
    handoff?: number | null;
  } | null;
  voiceCompanyName?: string | null;
  siteConfigId?: string | null;
}

export interface AptitudeCheckBreakdown {
  configCompleteness: number;   // 0-35
  promptQuality: number;        // 0-35
  archAlignment: number;        // 0-30
}

export interface AptitudeAttemptResult {
  attempt: number;
  score: number;
  passed: boolean;
  breakdown: AptitudeCheckBreakdown;
  violations: string[];
  promptSnapshot: string;
}

export interface AptitudeReport {
  finalScore: number;
  passed: boolean;            // finalScore >= APTITUDE_THRESHOLD
  totalAttempts: number;
  remediationApplied: boolean;
  finalPrompt: string | null; // prompt to persist if remediation changed it
  attempts: AptitudeAttemptResult[];
  // Governance outcome fields (map to agentOrchestrationRuns columns)
  clarityScore: number;
  configurationCompleteness: number;
  fallbackDefined: boolean;
  firstValuePathPresent: boolean;
}

// ── Check 1: Configuration completeness (0–35) ────────────────────────────────

function scoreConfigCompleteness(agent: AgentAptitudeInput): {
  score: number;
  violations: string[];
} {
  const violations: string[] = [];
  let score = 0;

  if (agent.name && agent.name.trim().length > 0) score += 7;
  else violations.push("missing_name");

  if (agent.roleType && agent.roleType.trim().length > 0) score += 7;
  else violations.push("missing_role_type");

  const prompt = agent.systemPrompt ?? "";
  if (prompt.trim().length > 200) score += 7;
  else violations.push("system_prompt_too_short_or_missing");

  const arch = agent.archProfile;
  if (
    arch &&
    arch.acknowledge != null &&
    arch.reflect != null &&
    arch.context != null &&
    arch.handoff != null
  ) score += 7;
  else violations.push("arch_profile_incomplete");

  const hasDISC =
    agent.dominance != null &&
    agent.influence != null &&
    agent.steadiness != null &&
    agent.conscientiousness != null;
  if (hasDISC) score += 7;
  else violations.push("disc_profile_incomplete");

  return { score, violations };
}

// ── Check 2: Prompt quality (0–35) ────────────────────────────────────────────

function scorePromptQuality(agent: AgentAptitudeInput): {
  score: number;
  violations: string[];
} {
  const violations: string[] = [];
  let score = 0;
  const text = (agent.systemPrompt ?? "").toLowerCase();

  // Identity statement — prompt should reference the agent's own name or role
  const name = (agent.name ?? "").toLowerCase();
  const role = (agent.roleType ?? "").toLowerCase().replace(/_/g, " ");
  if (name && text.includes(name)) score += 7;
  else if (role && text.includes(role)) score += 7;
  else violations.push("missing_identity_statement");

  // Business / company name present
  const biz = (agent.voiceCompanyName ?? "").toLowerCase();
  if (biz && biz.length > 2 && text.includes(biz)) score += 7;
  else violations.push("missing_business_context");

  // Behavioural instructions (do/don't, rules, constraints)
  if (
    /(you (must|should|will|are)|never |always |do not |don't |your (goal|role|job|responsibility)|rule)/i.test(
      text
    )
  ) score += 7;
  else violations.push("missing_behavioural_instructions");

  // Handoff / escalation language
  if (
    /(escalat|transfer|handoff|hand.?off|connect you|refer|forward|next step|book|schedule|follow.?up)/i.test(
      text
    )
  ) score += 7;
  else violations.push("missing_handoff_language");

  // Knowledge domain — what the agent knows or focuses on
  if (
    /(speciali[sz]|expert|knowledg|focus|familiar with|help with|assist with|trained|provid)/i.test(
      text
    )
  ) score += 7;
  else violations.push("missing_knowledge_domain");

  return { score, violations };
}

// ── Check 3: ARCH alignment (0–30) ────────────────────────────────────────────

function scoreArchAlignment(agent: AgentAptitudeInput): {
  score: number;
  violations: string[];
} {
  const violations: string[] = [];
  let score = 0;
  const text = agent.systemPrompt ?? "";
  const arch = agent.archProfile;
  const handoffSlider = arch?.handoff ?? 40;
  const dominance = agent.dominance ?? 50;
  const steadiness = agent.steadiness ?? 50;

  // Handoff: if H ≥ 50, prompt must contain next-step / question cue
  if (handoffSlider >= 50) {
    const hasHandoffCue =
      /\?\s*$/.test(text.trim()) ||
      /(what would you like|which (would|works)|can i help|let me know|would you like|next step|shall I)/i.test(
        text
      );
    if (hasHandoffCue) score += 15;
    else violations.push("arch_handoff_cue_missing_in_high_handoff_agent");
  } else {
    score += 15; // low handoff agents don't need forced cue
  }

  // Dominance: if D ≥ 60, prompt should have assertive / directive language
  if (dominance >= 60) {
    if (/(direct|confident|decisive|clear|lead|guide|drive|action|result)/i.test(text))
      score += 7;
    else violations.push("arch_assertive_language_missing_for_high_dominance");
  } else {
    score += 7;
  }

  // Steadiness: if S ≥ 60, prompt should have empathetic / patient language
  if (steadiness >= 60) {
    if (
      /(patient|empath|listen|understand|support|care|here for you|take your time|comforting)/i.test(
        text
      )
    ) score += 8;
    else violations.push("arch_empathy_language_missing_for_high_steadiness");
  } else {
    score += 8;
  }

  return { score, violations };
}

// ── Score an agent (single pass) ──────────────────────────────────────────────

export function scoreAgentAptitude(agent: AgentAptitudeInput): {
  score: number;
  breakdown: AptitudeCheckBreakdown;
  violations: string[];
  passed: boolean;
} {
  const c1 = scoreConfigCompleteness(agent);
  const c2 = scorePromptQuality(agent);
  const c3 = scoreArchAlignment(agent);

  const breakdown: AptitudeCheckBreakdown = {
    configCompleteness: c1.score,
    promptQuality: c2.score,
    archAlignment: c3.score,
  };
  const score = c1.score + c2.score + c3.score;
  const violations = [...c1.violations, ...c2.violations, ...c3.violations];

  return { score, breakdown, violations, passed: score >= APTITUDE_THRESHOLD };
}

// ── Fetch knowledge docs for remediation context ──────────────────────────────

async function fetchKnowledgeContext(siteConfigId: string): Promise<string> {
  try {
    const docs = await db
      .select({ title: knowledgeArtifacts.title, content: knowledgeArtifacts.content })
      .from(knowledgeArtifacts)
      .where(eq(knowledgeArtifacts.siteConfigId, siteConfigId))
      .limit(5);

    if (!docs.length) return "";

    return docs
      .map((d) => `## ${d.title ?? "Knowledge"}\n${(d.content ?? "").slice(0, 800)}`)
      .join("\n\n");
  } catch {
    return "";
  }
}

// ── Gemini remediation call ────────────────────────────────────────────────────

async function remediatePromptWithGemini(params: {
  agent: AgentAptitudeInput;
  violations: string[];
  knowledgeContext: string;
  attemptNumber: number;
}): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL_ID ?? "models/gemini-2.5-flash-preview-04-17";
  if (!apiKey) {
    console.warn("[agentAptitude] GEMINI_API_KEY not set — remediation skipped");
    return null;
  }

  const violationList = params.violations
    .map((v) => `- ${v.replace(/_/g, " ")}`)
    .join("\n");

  const knowledgeSection = params.knowledgeContext
    ? `\n\nKNOWLEDGE BASE CONTEXT FOR THIS BUSINESS:\n${params.knowledgeContext}`
    : "";

  const systemInstruction = `You are a strict AI agent system prompt editor for Gateway Global AI.
Your only job is to fix a system prompt that failed an aptitude test.
Do not add generic filler. Fix exactly what is flagged. Keep the core identity intact.
Return ONLY the improved system prompt — no explanation, no preamble.`;

  const userPrompt = `CURRENT SYSTEM PROMPT (attempt ${params.attemptNumber}):
\`\`\`
${params.agent.systemPrompt ?? "(empty)"}
\`\`\`

AGENT CONTEXT:
- Name: ${params.agent.name ?? "(unknown)"}
- Role: ${params.agent.roleType ?? "(unknown)"}
- Business: ${params.agent.voiceCompanyName ?? "(unknown)"}
- ARCH: Acknowledge=${params.agent.archProfile?.acknowledge ?? "?"}  Reflect=${params.agent.archProfile?.reflect ?? "?"}  Context=${params.agent.archProfile?.context ?? "?"}  Handoff=${params.agent.archProfile?.handoff ?? "?"}
- DISC: D=${params.agent.dominance ?? "?"}  I=${params.agent.influence ?? "?"}  S=${params.agent.steadiness ?? "?"}  C=${params.agent.conscientiousness ?? "?"}
${knowledgeSection}

APTITUDE VIOLATIONS TO FIX:
${violationList}

Rewrite the system prompt so every violation above is resolved. The rewritten prompt must:
1. Be longer than 200 characters
2. Include the agent name and role
3. Reference the business name "${params.agent.voiceCompanyName ?? ""}"
4. Include clear behavioural rules (what the agent must/must not do)
5. Include handoff / escalation guidance
6. Show the agent's knowledge domain
7. If Handoff slider ≥ 50, end with or include an explicit next-step question
8. If Dominance ≥ 60, include assertive, directive language
9. If Steadiness ≥ 60, include empathetic, patient language

Return ONLY the improved system prompt text.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 2048,
            responseMimeType: "text/plain",
          },
        }),
      }
    );

    if (!response.ok) {
      console.error("[agentAptitude] Gemini remediation HTTP error:", response.status);
      return null;
    }

    const body = await response.json();
    const text: string | undefined =
      body?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text && text.trim().length > 100 ? text.trim() : null;
  } catch (err) {
    console.error("[agentAptitude] Gemini remediation call failed:", err);
    return null;
  }
}

// ── Main: run aptitude pipeline with retry loop ────────────────────────────────

export async function runAptitudePipelineWithRetry(
  agent: AgentAptitudeInput
): Promise<AptitudeReport> {
  const attempts: AptitudeAttemptResult[] = [];
  let currentAgent = { ...agent };
  let remediationApplied = false;
  let finalPrompt: string | null = null;

  for (let attempt = 1; attempt <= APTITUDE_MAX_ATTEMPTS; attempt++) {
    const { score, breakdown, violations, passed } = scoreAgentAptitude(currentAgent);

    attempts.push({
      attempt,
      score,
      passed,
      breakdown,
      violations,
      promptSnapshot: (currentAgent.systemPrompt ?? "").slice(0, 500),
    });

    if (passed) {
      // Governance outcome fields
      return buildReport({
        finalScore: score,
        passed: true,
        totalAttempts: attempt,
        remediationApplied,
        finalPrompt: remediationApplied ? finalPrompt : null,
        attempts,
        breakdown,
      });
    }

    // Do not attempt remediation after the last attempt
    if (attempt === APTITUDE_MAX_ATTEMPTS) break;

    console.log(
      `[agentAptitude] Agent "${agent.name}" failed attempt ${attempt} (score ${score}/${APTITUDE_THRESHOLD}). Violations: ${violations.join(", ")}. Remediating…`
    );

    const knowledgeContext = agent.siteConfigId
      ? await fetchKnowledgeContext(agent.siteConfigId)
      : "";

    const improvedPrompt = await remediatePromptWithGemini({
      agent: currentAgent,
      violations,
      knowledgeContext,
      attemptNumber: attempt,
    });

    if (improvedPrompt) {
      remediationApplied = true;
      finalPrompt = improvedPrompt;
      currentAgent = { ...currentAgent, systemPrompt: improvedPrompt };
    } else {
      // Gemini didn't help — no point retrying further
      console.warn(`[agentAptitude] Remediation returned nothing on attempt ${attempt} — aborting retry loop`);
      break;
    }
  }

  // Final failed state
  const lastAttempt = attempts[attempts.length - 1];
  return buildReport({
    finalScore: lastAttempt.score,
    passed: false,
    totalAttempts: attempts.length,
    remediationApplied,
    finalPrompt: remediationApplied ? finalPrompt : null,
    attempts,
    breakdown: lastAttempt.breakdown,
  });
}

// ── Map scores to governance outcome fields ────────────────────────────────────

function buildReport(params: {
  finalScore: number;
  passed: boolean;
  totalAttempts: number;
  remediationApplied: boolean;
  finalPrompt: string | null;
  attempts: AptitudeAttemptResult[];
  breakdown: AptitudeCheckBreakdown;
}): AptitudeReport {
  // clarityScore: composite of prompt quality + ARCH alignment (0-65) scaled to 0-100
  const rawClarity = params.breakdown.promptQuality + params.breakdown.archAlignment;
  const clarityScore = Math.round((rawClarity / 65) * 100);

  // configurationCompleteness: config check (0-35) scaled to 0-100
  const configurationCompleteness = Math.round(
    (params.breakdown.configCompleteness / 35) * 100
  );

  // fallbackDefined: handoff language present in prompt
  const lastAttempt = params.attempts[params.attempts.length - 1];
  const fallbackDefined = !lastAttempt.violations.includes("missing_handoff_language") &&
    !lastAttempt.violations.includes("arch_handoff_cue_missing_in_high_handoff_agent");

  // firstValuePathPresent: agent has identity + knowledge domain
  const firstValuePathPresent =
    !lastAttempt.violations.includes("missing_identity_statement") &&
    !lastAttempt.violations.includes("missing_knowledge_domain");

  return {
    finalScore: params.finalScore,
    passed: params.passed,
    totalAttempts: params.totalAttempts,
    remediationApplied: params.remediationApplied,
    finalPrompt: params.finalPrompt,
    attempts: params.attempts,
    clarityScore,
    configurationCompleteness,
    fallbackDefined,
    firstValuePathPresent,
  };
}
