/**
 * Prompt Compiler — Character-First Behavioral System
 *
 * Translates the three-layer agent identity into a master system prompt.
 * Assembly order (Keanu's mandate):
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
}

export interface BusinessContext {
  name?: string;
  description?: string;
  hours?: string;
  address?: string;
  phone?: string;
  services?: string[];
  keyOfferings?: string[];
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
  const a = arch.acknowledge ?? 60;
  const r = arch.reflect ?? 50;
  const ctx = arch.context ?? 60;
  const h = arch.handoff ?? 40;

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

  return `### YOUR CONVERSATION MECHANICS (ARCH A:${a} R:${r} C:${ctx} H:${h})\n${ackLine} ${refLine} ${ctxLine} ${handLine}`;
}

// ── Master Compiler ───────────────────────────────────────────────────────────

export function buildBehavioralPrompt(
  agent: Agent,
  businessContext?: BusinessContext,
): string {
  const sections: string[] = [];

  const stm = agent.shortTermMemory as ShortTermMemory | null;
  const ltm = agent.longTermMemory as LongTermMemory | null;
  const arch = (agent.archProfile as ArchProfile | null) ?? {};

  const d = agent.dominance ?? 50;
  const i = agent.influence ?? 50;
  const s = agent.steadiness ?? 50;
  const c = agent.conscientiousness ?? 50;

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

  // ── Layer 2: DISC Behavioral Narrative ────────────────────────────────────
  sections.push(discToBehavior(d, i, s, c));

  // ── Layer 3: ARCH Conversation Mechanics ──────────────────────────────────
  sections.push(archToMechanics(arch));

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
