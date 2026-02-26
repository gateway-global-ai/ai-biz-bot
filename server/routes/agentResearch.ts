/**
 * agentResearch.ts
 * POST /api/generate-agent-persona
 *
 * Uses Gemini (via process.env.GEMINI_MODEL_ID — never hardcoded) to
 * auto-generate a professional system prompt for a specialty AI agent,
 * grounded in the business's actual name, address, and sovereign truths.
 *
 * This is the "One-Click Digital Employee" feature:
 * Input: targetRole (e.g. "Bail Bondsman") + siteConfigId
 * Output: { persona: string } — ready to paste into the agent's persona field.
 */
import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { requireAuth } from "../auth";
import { GoogleGenAI } from "@google/genai";

const router = Router();

const schema = z.object({
  siteConfigId: z.string().uuid(),
  targetRole: z.string().min(2).max(200),
});

router.post("/api/generate-agent-persona", requireAuth, async (req: any, res) => {
  try {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { siteConfigId, targetRole } = parsed.data;

    // Verify ownership
    const customerId = req.session?.user?.id || req.user?.id;
    const siteConfig = await storage.getSiteConfigById(siteConfigId);
    if (!siteConfig) return res.status(404).json({ error: "Site config not found." });
    if (siteConfig.ownerId && siteConfig.ownerId !== customerId) {
      return res.status(403).json({ error: "Access denied." });
    }

    // Extract business context for grounding
    const kl = (siteConfig.knowledgeLibrary as Record<string, any>) ?? {};
    const businessName = siteConfig.name ?? "this business";
    const address = siteConfig.placeData
      ? (siteConfig.placeData as any)?.formatted_address ?? ""
      : "";
    const sovereignTruths = kl.sovereignTruths
      ? `\nKey facts about this business:\n${JSON.stringify(kl.sovereignTruths, null, 2)}`
      : "";

    // Build the research prompt
    const researchPrompt = `You are a Sovereign AI Architect. Your task is to write a highly specialized, professional AI system prompt for an agent whose role is: "${targetRole}" at the business "${businessName}"${address ? ` located at ${address}` : ""}.

Requirements:
1. Write the system prompt in second person ("You are...").
2. Include: the agent's core role and responsibilities, communication tone and personality, specific operational constraints and boundaries, any relevant local laws, regulations, or industry-standard operating procedures for this role.
3. Include specific, actionable scripts for the 3 most common user requests this agent will handle.
4. End with a short RULE block that prevents the agent from going off-topic.
5. Output ONLY the system prompt text — no markdown headers, no explanatory text, no preamble.
6. Minimum 300 words. Be specific and authoritative.${sovereignTruths}`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key not configured." });
    }

    const modelId = process.env.GEMINI_MODEL_ID;
    if (!modelId) {
      return res.status(500).json({ error: "GEMINI_MODEL_ID not configured." });
    }

    const genai = new GoogleGenAI({ apiKey });
    // Use the standard non-realtime model for text generation
    // Strip the native-audio suffix if present to get a text-capable variant
    const textModelId = modelId.replace(/-native-audio-preview[^'"]*/i, "").replace(/^models\//, "");
    const safeModelId = textModelId || "gemini-2.5-flash-preview-05-20";

    const result = await genai.models.generateContent({
      model: safeModelId,
      contents: [{ role: "user", parts: [{ text: researchPrompt }] }],
    });

    const persona = result.text ?? "";
    if (!persona) {
      return res.status(500).json({ error: "No persona generated. Please try again." });
    }

    return res.json({ persona });

  } catch (err: any) {
    console.error("[agentResearch] Error:", err);
    return res.status(500).json({ error: err?.message ?? "Internal server error." });
  }
});

export default router;
