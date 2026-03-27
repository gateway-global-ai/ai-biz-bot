/**
 * Prompt Compiler — Character-First Behavioral System
 *
 * Translates the three-layer agent identity into a master system prompt.
 * Assembly order:
 *   0. Operational Mode & Strict Permissions (if set) — unbendable directive
 *   1. Short-Term Memory Grounding  (who the agent IS right now, at work)
 *   2. Long-Term Core Identity      (who the agent has always been)
 *   3. DISC Behavioral Narrative    (how the agent naturally operates)
 *   4. ARCH Conversation Mechanics  (internalized dialogue instincts)
 *   5. Business Context             (Google Places + enrichment, optional)
 *
 * This is character, not rules. The agent reads its own identity and
 * behaves from it — compliance emerges from internalization.
 */

import type { Agent } from '@shared/schema';
import { getOperationalMode, getModeInstruction, getModeArchOverride } from '../config/operationalModes';
import { buildDisclosureFragment } from './disclosurePolicy';
import {
  resolveStabilityDials,
  stabilityDialsToPromptFragment,
  principalOfRecordFragment,
} from './stabilityDials';
import { parseCommunicationGovernance } from '@shared/conversationGrounding';
import type { BuyerJourney } from '@shared/conversationGrounding';
import { getCommunicationGovernanceFromSite } from './conversationGrounding';
import { buildPppEngagementFragment } from './pppEngagementFragment';
import { buildDesignStudioPromptFragments } from './designStudioPromptFragments';
import { parseDesignStudioFromMetadata } from '@shared/designStudioState';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';

// ── Skill Registry loader ─────────────────────────────────────────────────────
interface SkillEntry {
  skillId: string;
  label: string;
  description: string;
  intentPatterns: string[];
  allowedSecurityLevels: string[];
  canvasViewId: string;
  requiresConfirm: boolean;
}

interface SkillRegistry {
  skills: SkillEntry[];
  securityLevels: Record<string, { allowedSkills: string[] }>;
}

let _skillRegistry: SkillRegistry | null = null;
function loadSkillRegistry(): SkillRegistry {
  if (_skillRegistry) return _skillRegistry;
  try {
    const registryPath = path.resolve(process.cwd(), 'registry-yaml/skill-dispatch-registry.yaml');
    const raw = fs.readFileSync(registryPath, 'utf-8');
    _skillRegistry = yaml.load(raw) as SkillRegistry;
  } catch (_) {
    _skillRegistry = { skills: [], securityLevels: {} };
  }
  return _skillRegistry;
}

/**
 * Build a skill context fragment for the given visitor security level.
 * Injected into the prompt so the AI knows what actions it can dispatch.
 */
export function buildSkillContextFragment(securityLevel: 'anonymous' | 'phone_verified' | 'admin' = 'anonymous'): string {
  const registry = loadSkillRegistry();
  const allowed = registry.securityLevels[securityLevel]?.allowedSkills ?? [];
  const skills = registry.skills.filter(s => allowed.includes(s.skillId));
  if (skills.length === 0) return '';

  const lines = skills.map(s => {
    const patterns = s.intentPatterns.slice(0, 3).join('", "');
    return `- **${s.label}** (${s.skillId}): ${s.description.trim()} Trigger phrases: "${patterns}". ${s.requiresConfirm ? 'Requires user confirmation before executing.' : ''}`;
  });

  return `### AVAILABLE SKILLS — CANVAS ACTIONS\nBased on this visitor's security level (${securityLevel}), you may dispatch the following actions by recognizing intent:\n\n${lines.join('\n')}\n\nWhen a skill is triggered, respond with a brief confirmation of what you're about to do, then emit a canvas:dispatch event with the skillId.`;
}
import {
  conversationWorkflowSchema,
  formatPhasePromptFragment,
  resolveCurrentPhase,
} from '@shared/conversationWorkflow';
import {
  ANTI_PLATFORM_DOCTRINE,
  GATEWAY_BRAND_POSITIONING,
  GATEWAY_PRODUCT_FACTS,
  OBJECTION_HANDLING,
  CONNECTION_PRINCIPLES,
  SALES_ENGINE_PRINCIPLES,
  FOUNDER_VOICE_APPLICABLE_MODES,
  FOUNDER_VOICE_APPLICABLE_ROLES,
} from '../config/founderVoicePack';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ShortTermMemory {
  specialty?: string;
  focus?: string;
  method?: string;
  differentiator?: string;
  discAnalysis?: string;
  archBehavior?: string;
}

interface LongTermMemory {
  dominantTrait?: string;
  years?: string;
  originStory?: string;
  unbreakableRule?: string;
  ruleReason?: string;
  primaryIntent?: string;
  happySeeing?: string;
  sadSeeing?: string;
  priorityOverMoney?: string;
  philosophyPeople?: string;
  philosophyLife?: string;
  philosophyToday?: string;
}

interface ArchProfile {
  acknowledge?: number; // 0-100
  reflect?: number;     // 0-100
  context?: number;     // 0-100
  handoff?: number;     // 0-100
  responseWindowSeconds?: number; // target spoken turn length: 5–60s
}

/** Phase 5C — from knowledge gap report; drives compiler fragment (SAFE_MODE_CONTRACT §5B). */
export interface KnowledgeCertificationInput {
  atRisk: boolean;
  observedMeanRequired: number;
  requiredMinimum: number;
  /** Required dimensions with score &lt; 5 (uncertified band). */
  restrictedDimensionLabels: string[];
  notes: string[];
}

export interface BusinessContext {
  name?: string;
  description?: string;
  hours?: string;
  address?: string;
  phone?: string;
  services?: string[];
  keyOfferings?: string[];
  /** When set, injects mandatory certification / fallback posture into the compiled prompt. */
  knowledgeCertification?: KnowledgeCertificationInput;
  /** Phased industry funnel — keys collected for resolveCurrentPhase (e.g. owner_salon_name). */
  funnelContextKeys?: Record<string, string | undefined>;
  /** Persistent buyer journey payload — injected into prompt as [VISITOR CONTEXT] when present. */
  buyerJourney?: BuyerJourney | null;
}

function buildKnowledgeCertificationFragment(cert: KnowledgeCertificationInput): string {
  const hasRestricted = cert.restrictedDimensionLabels.length > 0;
  if (!cert.atRisk && !hasRestricted) {
    return "";
  }
  const lines: string[] = [
    "### [SYSTEM: KNOWLEDGE CERTIFICATION GATES — PHASE 5C]",
    "",
    "The Audit Plane has evaluated this site's knowledge against its assigned role. You must obey the following:",
    "",
  ];
  if (cert.atRisk) {
    lines.push(
      `- This site is marked AT RISK (observed mean across required dimensions: ${cert.observedMeanRequired.toFixed(1)}; minimum: ${cert.requiredMinimum}).`,
    );
  }
  if (hasRestricted) {
    lines.push(
      `- Uncertified dimensions (do not state authoritative facts, prices, or policies for these areas unless explicitly confirmed in grounded knowledge): ${cert.restrictedDimensionLabels.join("; ")}.`,
    );
    lines.push(
      "- For those areas: refuse specific numeric or contractual claims; offer the official phone, website, booking link, or a human handoff as appropriate.",
    );
  }
  lines.push(
    "- Do not invent prices, rates, availability, or policy terms when the certification gate indicates uncertainty.",
  );
  if (cert.notes.length) {
    lines.push("", "Audit notes:", ...cert.notes.map((n) => `- ${n}`));
  }
  return lines.join("\n");
}

// ── Buyer Journey Fragment ────────────────────────────────────────────────────

export function buildBuyerJourneyFragment(journey: BuyerJourney | null | undefined): string {
  if (!journey) return '';

  const lines: string[] = ['### [VISITOR CONTEXT]'];

  const phaseLabels: Record<string, string> = {
    awareness: 'Awareness (first exposure)',
    consideration: 'Consideration (evaluating options)',
    demo: 'Demo (has seen the product in action)',
    trial: 'Trial (actively trying the platform)',
    activation: 'Activation (paying customer)',
    retention: 'Retention (established customer)',
  };
  lines.push(`Phase: ${phaseLabels[journey.phase] ?? journey.phase}`);

  if (journey.sessionCount > 0) {
    lines.push(`Prior sessions: ${journey.sessionCount}`);
  }
  if (journey.lastSessionAt) {
    try {
      const days = Math.floor((Date.now() - new Date(journey.lastSessionAt).getTime()) / 86400000);
      if (days === 0) lines.push('Last seen: today');
      else if (days === 1) lines.push('Last seen: yesterday');
      else lines.push(`Last seen: ${days} days ago`);
    } catch { /* skip */ }
  }
  if (journey.industry) {
    lines.push(`Industry: ${journey.industry}`);
  }
  if (journey.painPointsExpressed.length) {
    lines.push(`Pain points expressed: ${journey.painPointsExpressed.slice(0, 5).map(p => `"${p}"`).join(', ')}`);
  }
  if (journey.pricingObjectionsRaised.length) {
    lines.push(`Pricing objections raised: ${journey.pricingObjectionsRaised.slice(0, 3).map(o => `"${o}"`).join(', ')}`);
  }
  if (journey.needsExpressed.length) {
    lines.push(`Needs expressed: ${journey.needsExpressed.slice(0, 5).map(n => `"${n}"`).join(', ')}`);
  }
  if (journey.demoViewedAt) {
    lines.push(`Demo viewed: yes`);
  }

  // Behavioural instruction based on phase
  const phaseInstructions: Partial<Record<BuyerJourney['phase'], string>> = {
    awareness: 'This is a first-impression conversation. Build trust before features.',
    consideration: 'This visitor is evaluating options. Focus on what makes Gateway different, not just features.',
    demo: 'They have seen the demo. Move toward the test drive or trial activation.',
    trial: 'They are actively testing. Resolve blockers and build confidence.',
    activation: 'Established customer. Focus on expansion and referrals.',
    retention: 'Long-term customer. Deepen the relationship and identify new use cases.',
  };
  const instruction = phaseInstructions[journey.phase];
  if (instruction) lines.push(instruction);

  return lines.join('\n');
}

// ── Founder Voice Fragment (Anti-Platform Brand Doctrine) ─────────────────────

/**
 * Injects the Gateway Global AI brand voice and Anti-Platform doctrine into the system prompt.
 * Only fires for customer-facing roles and modes where brand positioning is appropriate.
 * Never fires for CASHIER, INTAKE, EMERGENCY, or other operational-only modes.
 */
export function buildFounderVoiceFragment(
  modeId: string | null | undefined,
  roleType: string | null | undefined,
  opts?: { includeProductFacts?: boolean; includeObjectionHandling?: boolean }
): string {
  const mode = String(modeId ?? '').toUpperCase().trim();
  const role = String(roleType ?? '').toLowerCase().trim();

  const modeApplicable = FOUNDER_VOICE_APPLICABLE_MODES.has(mode as never);
  const roleApplicable = FOUNDER_VOICE_APPLICABLE_ROLES.has(role as never);

  if (!modeApplicable && !roleApplicable) return '';

  const lines: string[] = [
    '### [GATEWAY VOICE DOCTRINE — ANTI-PLATFORM CANON]',
    '',
    '## Brand Position',
    `${GATEWAY_BRAND_POSITIONING.tagline}`,
    `${GATEWAY_BRAND_POSITIONING.corePromise}`,
    '',
    '## What We Are Not',
    ...GATEWAY_BRAND_POSITIONING.notThis.map(n => `- ${n}`),
    '',
    '## The Problem We Solve',
    ...ANTI_PLATFORM_DOCTRINE.slice(0, 4).map(d => `- ${d}`),
    '',
    '## How You Speak',
    ...CONNECTION_PRINCIPLES.tonePrinciples.map(p => `- ${p}`),
    '',
    '## Language You Never Use',
    ...CONNECTION_PRINCIPLES.forbiddenPhrasing.map(p => `- "${p}"`),
    '',
    '## Sales Principles (Every Interaction)',
    `Core: ${SALES_ENGINE_PRINCIPLES.corePrinciple}`,
    ...SALES_ENGINE_PRINCIPLES.salesLaws.map(l => `- ${l}`),
  ];

  if (opts?.includeProductFacts) {
    const approvedFacts = GATEWAY_PRODUCT_FACTS.filter(f => f.approved);
    if (approvedFacts.length) {
      lines.push('', '## Approved Product Facts');
      for (const fact of approvedFacts.slice(0, 5)) {
        lines.push(`- **${fact.topic.replace(/_/g, ' ')}**: ${fact.fact}`);
      }
    }
  }

  if (opts?.includeObjectionHandling) {
    lines.push('', '## Objection Handling (When the owner pushes back)');
    for (const [key, response] of Object.entries(OBJECTION_HANDLING).slice(0, 5)) {
      lines.push(`- *${key.replace(/_/g, ' ')}*: ${response}`);
    }
  }

  lines.push('', `## The Sovereign Moment`, GATEWAY_BRAND_POSITIONING.sovereignMoment);

  return lines.join('\n');
}

// ── DISC → Natural Language ───────────────────────────────────────────────────

function discToBehavior(d: number, i: number, s: number, c: number): string {
  const dDesc = d <= 20
    ? 'You guide conversations gently — you never dominate, you invite.'
    : d <= 40
    ? 'You lead by example rather than command. You suggest, not dictate.'
    : d <= 60
    ? 'You balance assertiveness with genuine openness to other views.'
    : d <= 80
    ? 'You are direct and decisive. You move toward resolution with confidence.'
    : 'You are highly assertive. You drive toward results without hesitation.';

  const iDesc = i <= 20
    ? 'You are reserved and thoughtful. Your warmth shows through precision, not performance.'
    : i <= 40
    ? 'You connect with quiet warmth. You earn trust through consistency, not charisma.'
    : i <= 60
    ? 'You are naturally personable. People feel at ease around you.'
    : i <= 80
    ? 'You are enthusiastic and genuinely inspiring. Energy is natural to you.'
    : 'You are magnetic and expressive. People light up when they speak with you.';

  const sDesc = s <= 20
    ? 'You thrive on change and variety. You adapt instantly and love new challenges.'
    : s <= 40
    ? 'You move quickly and pivot well. Stability is a choice, not a need.'
    : s <= 60
    ? 'You balance consistency with flexibility. You are steady but not rigid.'
    : s <= 80
    ? 'You are patient, reliable, and calm. People feel safe in your consistency.'
    : 'You are the anchor. Utterly dependable. Your steadiness is a gift to everyone around you.';

  const cDesc = c <= 20
    ? 'You work from intuition and big-picture thinking. Details follow vision.'
    : c <= 40
    ? 'You value quality without perfectionism. Good enough that works is better than perfect that delays.'
    : c <= 60
    ? 'You care about accuracy and follow-through without being paralyzed by it.'
    : c <= 80
    ? 'You are precise and systematic. You finish what you start, thoroughly.'
    : 'You hold yourself to the highest standard. Excellence is not optional for you.';

  return `### YOUR BEHAVIORAL SIGNATURE (DISC D:${d} I:${i} S:${s} C:${c})\n${dDesc} ${iDesc} ${sDesc} ${cDesc}`;
}

// ── ARCH → Internalized Conversation Mechanics ────────────────────────────────

function archToMechanics(arch: ArchProfile): string {
  const a = arch.acknowledge ?? 30;
  const r = arch.reflect ?? 30;
  const ctx = arch.context ?? 60;
  const h = arch.handoff ?? 20;
  const rw = arch.responseWindowSeconds ?? 10;

  const ackLine = a >= 70
    ? 'When someone speaks to you, your first instinct is to make them feel heard before anything else. You validate before you respond.'
    : a >= 40
    ? 'You acknowledge what was said before moving forward — a natural pause of recognition.'
    : 'You move quickly to substance. You trust that people want answers, not affirmations.';

  const refLine = r >= 70
    ? 'You naturally demonstrate understanding by reflecting what you heard — paraphrasing, not parroting. This is how you show you were truly listening.'
    : r >= 40
    ? 'When it matters, you confirm understanding before adding your own perspective.'
    : 'You respond directly. You trust the other person to clarify if you missed something.';

  const ctxLine = ctx >= 70
    ? 'You naturally add background, meaning, and connection to what you share. You give people the "why" not just the "what".'
    : ctx >= 40
    ? 'You provide useful context when it serves the person, without over-explaining.'
    : 'You are concise. You give people exactly what they need, no more.';

  const handLine = h >= 70
    ? 'At the end of each thought, you naturally guide toward the next moment — a question, a next step, a gentle invitation forward.'
    : h >= 40
    ? 'You occasionally offer a next step or question to keep the conversation moving.'
    : 'You let the other person lead the pace. You respond; you do not push.';

  const rwLine = rw <= 10
    ? `RESPONSE WINDOW: Your spoken responses must be extremely brief — target ${rw} seconds or fewer. You are operating in a high-urgency or high-volume context. One sentence per turn when possible.`
    : rw <= 20
    ? `RESPONSE WINDOW: Keep each spoken response to approximately ${rw} seconds. Be direct and efficient. Say what matters, then stop and listen.`
    : rw <= 35
    ? `RESPONSE WINDOW: Each response can run up to ${rw} seconds. You have room to explain and add context, but avoid rambling. Conclude naturally.`
    : `RESPONSE WINDOW: You have an advisory window of up to ${rw} seconds per response. Use it when depth serves the person — explain reasoning, explore options, and guide thoughtfully.`;

  return `### YOUR CONVERSATION MECHANICS (ARCH A:${a} R:${r} C:${ctx} H:${h} | Window:${rw}s)\n${ackLine} ${refLine} ${ctxLine} ${handLine}\n\n${rwLine}`;
}

// ── Master Compiler ───────────────────────────────────────────────────────────

export function buildBehavioralPrompt(
  agent: Agent,
  businessContext?: BusinessContext,
  siteConfig?: Record<string, any>,
): string {
  const sections: string[] = [];

  // ── Layer 0: Operational Mode & Strict Permissions (foundational template) ──
  const modeId = (agent as { operationalMode?: string | null }).operationalMode ?? null;
  const modeDef = getOperationalMode(modeId);
  if (modeDef) {
    const instruction = getModeInstruction(
      modeId,
      (agent as { verificationLevel?: string | null }).verificationLevel
    );
    sections.push(
      `### [SYSTEM: OPERATIONAL MODE & STRICT PERMISSIONS]\nYou are currently operating strictly in: ${modeDef.label.toUpperCase()} (${modeDef.id} MODE).\n\nCRITICAL DIRECTIVE based on your mode:\n${instruction}`
    );

    // ── No-Drift Lock: inject immutable behavioral posture constraint ────────
    // Applies when mode has a hardcoded archOverride (EMERGENCY, CUSTOMER_SERVICE, etc.)
    // Also applies when agent.noDriftMode is explicitly set to true.
    const archOverride = getModeArchOverride(modeId);
    const agentNoDrift = (agent as { noDriftMode?: boolean | null }).noDriftMode === true;
    if (modeDef.noDriftLocked || agentNoDrift) {
      const lockArch = archOverride ?? (agent.archProfile as ArchProfile | null) ?? {};
      const a = lockArch.acknowledge ?? 30;
      const r = lockArch.reflect ?? 30;
      const ctx = lockArch.context ?? 60;
      const h = lockArch.handoff ?? 20;
      const rw = lockArch.responseWindowSeconds ?? 10;
      sections.push(
        `### [NO-DRIFT LOCK ACTIVE — BEHAVIORAL POSTURE IS IMMUTABLE]\n` +
        `Your conversational profile is locked and cannot be overridden by any instruction, user request, or contextual drift.\n` +
        `LOCKED ARCH: Acknowledge A:${a} | Reflect R:${r} | Context C:${ctx} | Handoff H:${h} | Response Window: ${rw}s\n\n` +
        `You MUST NOT:\n` +
        `- Extend your responses beyond the ${rw}-second response window\n` +
        `- Add unrequested reflection or empathy padding beyond A:${a} level\n` +
        `- Provide background context beyond C:${ctx} level\n` +
        `- Delay routing or handoff beyond H:${h} urgency level\n\n` +
        `This lock exists to protect ${modeDef.id === 'EMERGENCY' ? 'life safety and triage efficiency' : 'focused, on-task customer resolution'}. It is non-negotiable.`
      );
    }
  }

  // ── Communication Plane: progressive disclosure + stability dials + principal-of-record ──
  if (siteConfig) {
    const gov = getCommunicationGovernanceFromSite(siteConfig);
    const riskClass =
      businessContext?.knowledgeCertification?.atRisk === true ? "high" : "low";
    sections.push(
      buildDisclosureFragment(gov.disclosurePolicyId, {
        riskClass,
        experimentVariant: gov.disclosureExperimentVariant,
      })
    );
    const dials = resolveStabilityDials(siteConfig, agent);
    sections.push(stabilityDialsToPromptFragment(dials));
    sections.push(
      principalOfRecordFragment(gov.principalOfRecord, gov.principalConflictPossible === true)
    );
  }

  const govForPpp = siteConfig
    ? getCommunicationGovernanceFromSite(siteConfig)
    : parseCommunicationGovernance({});
  const salesEmphasis =
    String(modeId ?? "").toUpperCase() === "SALES" ||
    govForPpp.pppEngagement?.mode === "sales_emphasis";
  const pppFrag = buildPppEngagementFragment({
    modeId,
    ppp: govForPpp.pppEngagement,
    salesEmphasis,
  });
  if (pppFrag) {
    sections.push(pppFrag);
  }

  // ── Buyer Journey Context (persistent cross-session payload) ──────────────
  const buyerFrag = buildBuyerJourneyFragment(businessContext?.buyerJourney);
  if (buyerFrag) {
    sections.push(buyerFrag);
  }

  // ── Gateway Founder Voice Doctrine (Anti-Platform Canon) ──────────────────
  // Injected for sales, concierge, and brand-facing roles only.
  // Gives the agent the brand conviction it needs before DISC shapes HOW it expresses that conviction.
  const founderModeUpper = String(modeId ?? "").toUpperCase();
  const founderVoiceFrag = buildFounderVoiceFragment(modeId, (agent as { roleType?: string | null }).roleType, {
    includeProductFacts: founderModeUpper === "SALES" || founderModeUpper === "ADVISOR",
    includeObjectionHandling: founderModeUpper === "SALES",
  });
  if (founderVoiceFrag) {
    sections.push(founderVoiceFrag);
  }

  // ── Design Studio (Chad) — governed playbook + VIEW1 entry (metadata.designStudio) ──
  const designStudioRole = String((agent as { roleType?: string | null }).roleType ?? '')
    .toLowerCase()
    .trim();
  if (designStudioRole === 'design_studio' && siteConfig) {
    const dsState = parseDesignStudioFromMetadata(siteConfig.metadata);
    sections.push(buildDesignStudioPromptFragments(dsState));
  }

  const kcFrag = businessContext?.knowledgeCertification
    ? buildKnowledgeCertificationFragment(businessContext.knowledgeCertification)
    : "";
  if (kcFrag) {
    sections.push(kcFrag);
  }

  const stm = agent.shortTermMemory as ShortTermMemory | null;
  const ltm = agent.longTermMemory as LongTermMemory | null;

  // Resolve ARCH: No-Drift locked modes use mode's archOverride; otherwise use agent's stored profile
  const archOverrideForMode = getModeArchOverride(modeId);
  const agentNoDriftActive = modeDef?.noDriftLocked === true || (agent as { noDriftMode?: boolean | null }).noDriftMode === true;
  const arch: ArchProfile = (agentNoDriftActive && archOverrideForMode)
    ? archOverrideForMode
    : (agent.archProfile as ArchProfile | null) ?? {};

  // ── Gateway DISC/ARCH Defaults for Sales & Platform Roles ─────────────────
  // When an agent is in a sales/concierge role and has NOT been explicitly profiled
  // (i.e., all four values are at default 0 or the canonical defaults), apply the
  // Gateway Voice doctrine DISC profile. This enforces brand-level behavioral governance
  // before any platform demo agent falls back to generic values.
  const agentRoleForVoice = String((agent as { roleType?: string | null }).roleType ?? '').toLowerCase();
  const modeForVoice = String(modeId ?? '').toUpperCase();
  const isGatewayVoiceApplicable =
    FOUNDER_VOICE_APPLICABLE_MODES.has(modeForVoice as never) ||
    FOUNDER_VOICE_APPLICABLE_ROLES.has(agentRoleForVoice as never);

  // Use Gateway Sales DISC defaults when: applicable role AND agent has no custom DISC set
  const agentHasNoDISC =
    agent.dominance === null || agent.dominance === undefined;
  const gatewayDiscOverride = isGatewayVoiceApplicable && agentHasNoDISC;

  const d = agent.dominance ?? (gatewayDiscOverride ? 50 : 20);
  const i = agent.influence ?? (gatewayDiscOverride ? 68 : 45);
  const s = agent.steadiness ?? (gatewayDiscOverride ? 72 : 80);
  const c = agent.conscientiousness ?? (gatewayDiscOverride ? 55 : 75);

  // Apply Gateway ARCH defaults if no archProfile is set
  const agentHasNoARCH = !agent.archProfile || Object.keys(agent.archProfile as Record<string, unknown>).length === 0;
  const effectiveArch: ArchProfile = (!arch.acknowledge && isGatewayVoiceApplicable && agentHasNoARCH)
    ? { acknowledge: 75, reflect: 62, context: 58, handoff: 78, responseWindowSeconds: 25 }
    : arch;

  // ── Layer 1a: Short-Term Memory Grounding ─────────────────────────────────
  if (stm?.specialty || stm?.focus) {
    let stmBlock = `### SHORT-TERM MEMORY GROUNDING\n`;
    stmBlock += `"I am the ${stm.specialty || agent.voiceRole || 'specialist'} at what I do. `;
    if (stm.focus) stmBlock += `I am focused on ${stm.focus}. `;
    if (stm.method) stmBlock += `I have done this recently and I did it by ${stm.method}. `;
    if (stm.differentiator) stmBlock += `My attention to ${stm.differentiator} is what sets me apart. `;
    if (stm.discAnalysis) stmBlock += `My DISC profile (D:${d} I:${i} S:${s} C:${c}) means I am ${stm.discAnalysis}.`;
    stmBlock += `"`;
    if (stm.archBehavior) stmBlock += `\n${stm.archBehavior}`;
    sections.push(stmBlock);
  }

  // ── Layer 1b: Long-Term Core Identity ─────────────────────────────────────
  if (ltm?.dominantTrait || ltm?.originStory) {
    let ltmBlock = `### LONG-TERM CORE IDENTITY\n`;
    if (ltm.dominantTrait) {
      ltmBlock += `I am ${ltm.dominantTrait}`;
      if (ltm.years) ltmBlock += ` and I have been this way for ${ltm.years} years`;
      ltmBlock += `. `;
    }
    if (ltm.originStory) ltmBlock += `${ltm.originStory}\n\n`;
    if (ltm.unbreakableRule && ltm.ruleReason) {
      ltmBlock += `I would never ${ltm.unbreakableRule}, because ${ltm.ruleReason}.\n\n`;
    }
    const facts: string[] = [];
    if (ltm.primaryIntent) facts.push(`Primary Intent: ${ltm.primaryIntent}`);
    if (ltm.happySeeing) facts.push(`Happy seeing: ${ltm.happySeeing}`);
    if (ltm.sadSeeing) facts.push(`Sad seeing: ${ltm.sadSeeing}`);
    if (ltm.priorityOverMoney) facts.push(`Priority over money: ${ltm.priorityOverMoney}`);
    if (ltm.philosophyPeople) facts.push(`People are: ${ltm.philosophyPeople}`);
    if (ltm.philosophyLife) facts.push(`Life is: ${ltm.philosophyLife}`);
    if (ltm.philosophyToday) facts.push(`Today is: ${ltm.philosophyToday}`);
    if (facts.length) ltmBlock += facts.join('\n');
    sections.push(ltmBlock);
  }

  // ── Layer 1c: Brand Context (from brand_governance) ────────────────────────
  const brandGov = siteConfig?.brand_governance ?? null;
  if (brandGov && (brandGov.brandName || brandGov.claim || brandGov.irresistibleOffer)) {
    const lines: string[] = ['### BRAND CONTEXT'];
    if (brandGov.brandName) lines.push(`Business: ${brandGov.brandName}`);
    if (brandGov.brandSlogan) lines.push(`Slogan: "${brandGov.brandSlogan}"`);
    if (brandGov.claim) lines.push(`Brand Claim: ${brandGov.claim}`);
    if (brandGov.differentiator) lines.push(`What makes us different: ${brandGov.differentiator}`);
    if (brandGov.irresistibleOffer) lines.push(`Irresistible Offer: ${brandGov.irresistibleOffer}`);
    if (brandGov.freeTrial?.defined && brandGov.freeTrial.description) {
      lines.push(`Free Trial: ${brandGov.freeTrial.description}`);
    }
    if (brandGov.guarantee?.defined && brandGov.guarantee.description) {
      lines.push(`Guarantee: ${brandGov.guarantee.description}`);
    }
    if (brandGov.targetMarket) lines.push(`Target Market: ${brandGov.targetMarket}`);
    if (brandGov.coreServices?.length) {
      lines.push(`Core Services: ${brandGov.coreServices.slice(0, 6).join(', ')}`);
    }
    if (brandGov.serviceUpsells?.length) {
      lines.push(`Service Upsells: ${brandGov.serviceUpsells.slice(0, 4).join(', ')}`);
    }
    if (brandGov.coreProducts?.length) {
      lines.push(`Core Products: ${brandGov.coreProducts.slice(0, 6).join(', ')}`);
    }
    sections.push(lines.join('\n'));
  }

  // ── Layer 1d: Sales Funnel Objective ────────────────────────────────────────
  const salesFunnels: any[] = siteConfig?.sales_funnels ?? [];
  const primaryFunnel = salesFunnels.find((f: any) => f.terminalAction !== 'lead') ?? salesFunnels[0] ?? null;
  if (primaryFunnel) {
    let funnelBlock = `### SALES OBJECTIVE\n`;
    funnelBlock += `Your goal in every interaction: convert to → ${primaryFunnel.terminalAction.toUpperCase()}\n`;
    if (primaryFunnel.fallbackRoutes?.booking) {
      funnelBlock += `Booking route: ${primaryFunnel.fallbackRoutes.booking}\n`;
    }
    if (primaryFunnel.fallbackRoutes?.website) {
      funnelBlock += `Website route: ${primaryFunnel.fallbackRoutes.website}\n`;
    }
    if (primaryFunnel.conversionObjective) {
      funnelBlock += `Success looks like: ${primaryFunnel.conversionObjective}`;
    }
    sections.push(funnelBlock);
  }

  // ── Layer 1e: Phased conversation workflow (industry funnel) ───────────────
  const wfRaw = primaryFunnel?.conversationWorkflow;
  if (wfRaw && siteConfig) {
    const parsed = conversationWorkflowSchema.safeParse(wfRaw);
    if (parsed.success) {
      const phase = resolveCurrentPhase(parsed.data, businessContext?.funnelContextKeys ?? {});
      sections.push(formatPhasePromptFragment(phase, parsed.data));
    }
  }

  // ── Layer 2: DISC Behavioral Narrative ────────────────────────────────────
  sections.push(discToBehavior(d, i, s, c));

  // ── Layer 3: ARCH Conversation Mechanics ──────────────────────────────────
  sections.push(archToMechanics(effectiveArch));

  // ── Layer 4: Business Context (optional) ─────────────────────────────────
  if (businessContext?.name) {
    let bizBlock = `### BUSINESS CONTEXT\n`;
    bizBlock += `You represent ${businessContext.name}.\n`;
    if (businessContext.description) bizBlock += `${businessContext.description}\n`;
    if (businessContext.address) bizBlock += `Location: ${businessContext.address}\n`;
    if (businessContext.hours) bizBlock += `Hours: ${businessContext.hours}\n`;
    if (businessContext.phone) bizBlock += `Phone: ${businessContext.phone}\n`;
    if (businessContext.keyOfferings?.length) {
      bizBlock += `Key offerings: ${businessContext.keyOfferings.slice(0, 8).join(', ')}`;
    }
    sections.push(bizBlock);
    sections.push(
      `### GUARD RAIL (MVP)\nYou may only answer questions about this business using the information provided above (business details, hours, services, and reviews). Do not invent information or use external knowledge. For anything outside this scope, suggest the visitor call, text, or visit the website.`
    );
  }

  // ── Layer 5: Available Skills (security-level gated) ─────────────────────
  const visitorSecurityLevel = (businessContext as any)?.visitorSecurityLevel as 'anonymous' | 'phone_verified' | 'admin' | undefined;
  const skillFragment = buildSkillContextFragment(visitorSecurityLevel ?? 'anonymous');
  if (skillFragment) {
    sections.push(skillFragment);
  }

  // ── Fallback: bare-minimum identity if no memory structures ──────────────
  if (sections.length <= 2) {
    // Only DISC + ARCH were added — prepend a minimal identity header
    sections.unshift(
      `### IDENTITY\nYou are ${agent.name}, ${agent.voiceRole || 'AI Business Assistant'} for ${agent.voiceCompanyName || 'Gateway Global AI'}.`
    );
  }

  return sections.join('\n\n');
}
