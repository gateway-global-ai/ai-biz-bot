/**
 * Pitch decks API — deep research / market-fit presentations.
 * GET / — list (optional ?category=&industry=)
 * GET /:slug — get one by slug (public)
 * POST / — create (requireAuth)
 */
import { Router, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { requireAuth } from "../auth";

const router = Router();

const createBodySchema = z.object({
  slug: z.string().min(1).max(200),
  title: z.string().min(1).max(500),
  businessName: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  industry: z.string().min(1).max(200),
  content: z.record(z.unknown()).default({ slides: [] }),
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const industry = typeof req.query.industry === "string" ? req.query.industry : undefined;
    const list = await storage.listPitchDecks({ category, industry });
    res.json(list);
  } catch (e) {
    console.error("[PitchDecks] List error:", e);
    res.status(500).json({ error: "Failed to list pitch decks" });
  }
});

router.get("/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const deck = await storage.getPitchDeckBySlug(slug);
    if (!deck) {
      res.status(404).json({ error: "Pitch deck not found" });
      return;
    }
    res.json(deck);
  } catch (e) {
    console.error("[PitchDecks] Get error:", e);
    res.status(500).json({ error: "Failed to load pitch deck" });
  }
});

router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = createBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
      return;
    }
    const { slug, title, businessName, category, industry, content } = parsed.data;
    const existing = await storage.getPitchDeckBySlug(slug);
    if (existing) {
      res.status(409).json({ error: "A pitch deck with this slug already exists" });
      return;
    }
    const deck = await storage.createPitchDeck({
      slug,
      title,
      businessName,
      category,
      industry,
      content: content as { slides: unknown[] },
    });
    res.status(201).json(deck);
  } catch (e) {
    console.error("[PitchDecks] Create error:", e);
    res.status(500).json({ error: "Failed to create pitch deck" });
  }
});

export default router;
