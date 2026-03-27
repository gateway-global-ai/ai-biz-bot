/**
 * Sales Doc Ingestion Routes — Phase 2 Knowledge Canon
 *
 * Accepts raw text from sales documents, classifies it into governed buckets,
 * and stores it in knowledge_artifacts for agent retrieval.
 *
 * Classification buckets:
 *   - voice_pack      → tone principles, brand voice, Anti-Platform positioning
 *   - product_fact    → verified product facts, pricing, integration details
 *   - objection_handling → objection/response pairs
 *   - sales_process   → sales stage logic, follow-up rules, conversion events
 *   - founder_story   → origin narrative, mission, why Gateway exists
 *
 * Every artifact requires explicit approval before it becomes live agent knowledge.
 * Status lifecycle: draft → reviewed → approved → archived
 */

import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { knowledgeArtifacts } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../auth";

const router = Router();

// ── Classification Logic ──────────────────────────────────────────────────────

type DocClass =
  | "voice_pack"
  | "product_fact"
  | "objection_handling"
  | "sales_process"
  | "founder_story"
  | "unclassified";

interface ClassificationResult {
  docClass: DocClass;
  confidence: "high" | "medium" | "low";
  signals: string[];
}

/**
 * Rule-based classifier — zero-LLM, deterministic.
 * Returns the most likely document class based on keyword signals.
 */
function classifyDocumentText(text: string): ClassificationResult {
  const lower = text.toLowerCase();
  const signals: string[] = [];
  const scores: Record<DocClass, number> = {
    voice_pack: 0,
    product_fact: 0,
    objection_handling: 0,
    sales_process: 0,
    founder_story: 0,
    unclassified: 0,
  };

  // Voice pack signals
  const voiceSignals = [
    'tone', 'speak like', 'brand voice', 'anti-platform', 'sovereign',
    'positioning', 'how to say', 'language', 'jargon', 'phrasing',
    'forbidden phrase', 'connection', 'empathy', 'how the agent',
  ];
  for (const sig of voiceSignals) {
    if (lower.includes(sig)) { scores.voice_pack++; signals.push(`voice:${sig}`); }
  }

  // Product fact signals
  const productSignals = [
    'gateway global', 'price', 'pricing', '$49', '$50', '$0.25',
    'millisecond', 'latency', 'integration', 'feature', 'data ownership',
    'voice ai', 'front desk', 'platform', 'what it does', 'how it works',
    'specification', 'capability', 'supported',
  ];
  for (const sig of productSignals) {
    if (lower.includes(sig)) { scores.product_fact++; signals.push(`product:${sig}`); }
  }

  // Objection handling signals
  const objectionSignals = [
    'objection', 'too expensive', 'already have', 'not ready', 'too small',
    'i use google', 'use yelp', 'have a receptionist', 'privacy', 'robotic',
    'when they say', 'if they push back', 'response:', 'counter:',
  ];
  for (const sig of objectionSignals) {
    if (lower.includes(sig)) { scores.objection_handling++; signals.push(`objection:${sig}`); }
  }

  // Sales process signals
  const salesSignals = [
    'state machine', 'state transition', 'conversion', 'funnel', 'lead',
    'follow-up', 'follow up', 'time threshold', 'reactivation', 'demo',
    'qualified', 'win rate', 'close rate', 'pipeline', 'cadence',
    'first response', 'missed call', 'speed = revenue',
  ];
  for (const sig of salesSignals) {
    if (lower.includes(sig)) { scores.sales_process++; signals.push(`sales:${sig}`); }
  }

  // Founder story signals
  const founderSignals = [
    'founder', 'origin', 'why we', 'mission', 'why gateway', 'started because',
    'i built', 'we believe', 'our story', 'the problem we', 'vision',
    'small business owner', 'regain control', 'freedom from',
  ];
  for (const sig of founderSignals) {
    if (lower.includes(sig)) { scores.founder_story++; signals.push(`founder:${sig}`); }
  }

  // Find highest scoring class
  let best: DocClass = 'unclassified';
  let bestScore = 0;
  for (const [cls, score] of Object.entries(scores) as [DocClass, number][]) {
    if (cls === 'unclassified') continue;
    if (score > bestScore) { bestScore = score; best = cls; }
  }

  const confidence: ClassificationResult['confidence'] =
    bestScore >= 4 ? 'high' : bestScore >= 2 ? 'medium' : 'low';

  return { docClass: bestScore > 0 ? best : 'unclassified', confidence, signals: signals.slice(0, 10) };
}

/**
 * Maps document class to agentAccessKey prefix and trust weight.
 */
function classToArtifactConfig(docClass: DocClass): { keyPrefix: string; trustWeight: number; groupLevel: string } {
  const map: Record<DocClass, { keyPrefix: string; trustWeight: number; groupLevel: string }> = {
    voice_pack:          { keyPrefix: 'voice_pack',    trustWeight: 9, groupLevel: 'brand_voice' },
    product_fact:        { keyPrefix: 'product_fact',  trustWeight: 8, groupLevel: 'product_knowledge' },
    objection_handling:  { keyPrefix: 'objection',     trustWeight: 8, groupLevel: 'sales_knowledge' },
    sales_process:       { keyPrefix: 'sales_process', trustWeight: 7, groupLevel: 'sales_knowledge' },
    founder_story:       { keyPrefix: 'founder',       trustWeight: 7, groupLevel: 'brand_voice' },
    unclassified:        { keyPrefix: 'unclassified',  trustWeight: 3, groupLevel: 'unreviewed' },
  };
  return map[docClass];
}

// ── POST /api/knowledge/ingest-sales-doc ─────────────────────────────────────
const ingestSchema = z.object({
  /** Raw document text — the full content of the sales doc */
  text: z.string().min(10).max(50000),
  /** Title for the artifact */
  title: z.string().min(1).max(200),
  /** Optional: force a classification instead of auto-detecting */
  forceDocClass: z.enum([
    'voice_pack', 'product_fact', 'objection_handling',
    'sales_process', 'founder_story', 'unclassified',
  ]).optional(),
  /** Optional: scope — platform (Gateway-level) or business (site-level) */
  scope: z.enum(['platform', 'business']).default('platform'),
  /** Optional: associate with a specific site */
  siteConfigId: z.string().optional(),
});

router.post("/ingest-sales-doc", requireAuth, async (req, res) => {
  const parsed = ingestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }

  const { text, title, forceDocClass, scope, siteConfigId } = parsed.data;

  // Classify
  const classification = classifyDocumentText(text);
  const docClass = forceDocClass ?? classification.docClass;
  const config = classToArtifactConfig(docClass);

  // Generate a stable agentAccessKey from title
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 50);
  const agentAccessKey = `${config.keyPrefix}_${slug}_${Date.now()}`;

  try {
    const [artifact] = await db
      .insert(knowledgeArtifacts)
      .values({
        siteConfigId: siteConfigId ?? null,
        scope,
        visibility: 'private',
        agentAccessKey,
        title,
        content: text,
        groupLevel: config.groupLevel,
        trustWeight: config.trustWeight,
        artifactMetadata: {
          docClass,
          classificationConfidence: classification.confidence,
          classificationSignals: classification.signals,
          status: 'draft',  // Requires explicit approval before agent access
          ingestedAt: new Date().toISOString(),
          ingestedBy: 'sales_doc_ingestion_pipeline',
          approved: false,
        },
      })
      .returning({ id: knowledgeArtifacts.id, agentAccessKey: knowledgeArtifacts.agentAccessKey });

    return res.status(201).json({
      id: artifact.id,
      agentAccessKey: artifact.agentAccessKey,
      docClass,
      confidence: classification.confidence,
      signals: classification.signals,
      status: 'draft',
      message: `Document classified as "${docClass}" (${classification.confidence} confidence). Status: draft — requires approval before agent access.`,
    });
  } catch (err) {
    console.error('[knowledge/ingest-sales-doc] Error:', err);
    return res.status(500).json({ error: 'Failed to ingest document' });
  }
});

// ── POST /api/knowledge/approve-artifact ─────────────────────────────────────
router.post("/approve-artifact/:id", requireAuth, async (req, res) => {
  const idRaw = req.params.id;
  const id = typeof idRaw === "string" ? idRaw : idRaw?.[0];
  if (!id) return res.status(400).json({ error: 'id required' });

  try {
    const [existing] = await db
      .select()
      .from(knowledgeArtifacts)
      .where(eq(knowledgeArtifacts.id, id))
      .limit(1);

    if (!existing) return res.status(404).json({ error: 'Artifact not found' });

    const meta = (existing.artifactMetadata ?? {}) as Record<string, unknown>;
    const updated = {
      ...meta,
      status: 'approved',
      approved: true,
      approvedAt: new Date().toISOString(),
    };

    await db
      .update(knowledgeArtifacts)
      .set({
        visibility: 'public',
        artifactMetadata: updated,
      })
      .where(eq(knowledgeArtifacts.id, id));

    return res.json({ id, status: 'approved', message: 'Artifact is now live for agent retrieval.' });
  } catch (err) {
    console.error('[knowledge/approve-artifact] Error:', err);
    return res.status(500).json({ error: 'Failed to approve artifact' });
  }
});

// ── GET /api/knowledge/sales-docs ─────────────────────────────────────────────
router.get("/sales-docs", requireAuth, async (req, res) => {
  try {
    const artifacts = await db
      .select({
        id: knowledgeArtifacts.id,
        title: knowledgeArtifacts.title,
        groupLevel: knowledgeArtifacts.groupLevel,
        trustWeight: knowledgeArtifacts.trustWeight,
        agentAccessKey: knowledgeArtifacts.agentAccessKey,
        artifactMetadata: knowledgeArtifacts.artifactMetadata,
        createdAt: knowledgeArtifacts.createdAt,
      })
      .from(knowledgeArtifacts)
      .where(eq(knowledgeArtifacts.scope, 'platform'))
      .limit(50);

    return res.json({ artifacts });
  } catch (err) {
    console.error('[knowledge/sales-docs] Error:', err);
    return res.status(500).json({ error: 'Failed to list sales docs' });
  }
});

// ── POST /api/knowledge/ingest-platform-canon ────────────────────────────────
/**
 * Seed the canonical Gateway brand docs as approved platform-level artifacts.
 * Idempotent — safe to re-run. Only admin can call this.
 */
router.post("/ingest-platform-canon", requireAuth, async (req, res) => {
  const GATEWAY_CANON_DOCS = [
    {
      agentAccessKey: 'gateway_voice_doctrine_v1',
      title: 'Gateway Voice Doctrine — Anti-Platform Canon v1',
      groupLevel: 'brand_voice',
      trustWeight: 10,
      content: `# Gateway Voice Doctrine\n\nTagline: We install a system that takes control of your business.\n\nCore Promise: Every call answered. Every lead captured. Data owned by the business.\n\nThe Sovereign Moment: "From this moment forward, if anyone wants your business data — they come to you."\n\n## Anti-Platform Beliefs\n- Small businesses have been systematically dispossessed of their customer relationships by large platforms.\n- Platform dependency is a structural risk.\n- Data ownership is not a feature — it is the foundation of sovereignty.\n- Speed equals revenue. Every missed call is a missed customer.\n- The first responder wins.\n- Ownership beats access.\n\n## Tone Principles\n- Speak like the founder explaining the product — clear, direct, no jargon.\n- Acknowledge the real pain before presenting the solution.\n- Name the platform dependency problem plainly.\n- Use economic framing: missed calls = lost revenue.\n- Build trust through precision, not enthusiasm.\n\n## Forbidden Language\nNever say: cutting-edge AI, state-of-the-art, leverage, synergy, unlock your potential, empower your business, AI-powered solutions, seamlessly integrate, robust platform, scalable infrastructure, digital transformation.`,
      docClass: 'voice_pack' as DocClass,
    },
    {
      agentAccessKey: 'gateway_product_facts_v1',
      title: 'Gateway Global AI — Approved Product Facts v1',
      groupLevel: 'product_knowledge',
      trustWeight: 9,
      content: `# Gateway Global AI — Approved Product Facts\n\n## What It Is\nVoice-Native AI Front Desk for businesses. Voice AI agents + orchestration + local/cloud runtime.\n\n## Pricing\n$49/month platform fee. $50/month voice AI package. $0.25/minute overage. No per-seat fees. No platform percentage.\n\n## Performance\nSub-150ms mouth-to-ear latency via Gemini Native Audio. Faster than a human picking up the phone.\n\n## Data Ownership\nCustomer data stays in the business's database. No platform intermediary. Your agent, your data, your relationships.\n\n## The Model\nOld: Customer → phone call → hold → IVR → staff.\nNew: Customer → Gateway AI → instant service.\n\n## Who It's For\nMid-market operators and local businesses: salons, medical offices, restaurants, hospitality, legal, retail — any business that loses revenue from missed calls.`,
      docClass: 'product_fact' as DocClass,
    },
    {
      agentAccessKey: 'gateway_objection_handling_v1',
      title: 'Gateway Sales — Objection Handling Canon v1',
      groupLevel: 'sales_knowledge',
      trustWeight: 9,
      content: `# Gateway Objection Handling\n\n## Too Expensive\nCompare it to one missed booking. At $49/month, it pays for itself in the first week. You're not buying software — you're buying back your revenue.\n\n## Already Use Google\nGoogle monetizes your customer data to your competitors. We route that relationship back to you.\n\n## Use Yelp\nYelp owns your reviews. If they change pricing, you have no alternative. With Gateway, your reputation data is yours.\n\n## AI Sounds Robotic\nYou haven't heard Gateway. We can run a live demo right now.\n\n## Too Small\nA $150 missed appointment for a solo owner is not small — it's critical.\n\n## Not Ready for AI\nThe businesses that adopted early kept their customers. The ones that waited lost them.\n\n## Privacy\nYour customer data runs on your node. It doesn't pass through any advertising platform.\n\n## Have a Receptionist\nYour receptionist can't answer at 11pm or handle three callers at once. Gateway handles the volume.`,
      docClass: 'objection_handling' as DocClass,
    },
  ];

  const results = [];

  for (const doc of GATEWAY_CANON_DOCS) {
    // Check if already exists
    const [existing] = await db
      .select({ id: knowledgeArtifacts.id })
      .from(knowledgeArtifacts)
      .where(eq(knowledgeArtifacts.agentAccessKey, doc.agentAccessKey))
      .limit(1);

    if (existing) {
      results.push({ agentAccessKey: doc.agentAccessKey, action: 'skipped_exists' });
      continue;
    }

    await db.insert(knowledgeArtifacts).values({
      siteConfigId: null,
      scope: 'platform',
      visibility: 'public',
      agentAccessKey: doc.agentAccessKey,
      title: doc.title,
      content: doc.content,
      groupLevel: doc.groupLevel,
      trustWeight: doc.trustWeight,
      artifactMetadata: {
        docClass: doc.docClass,
        status: 'approved',
        approved: true,
        approvedAt: new Date().toISOString(),
        ingestedBy: 'platform_canon_bootstrap',
      },
    });

    results.push({ agentAccessKey: doc.agentAccessKey, action: 'created' });
  }

  return res.json({ results });
});

export default router;
