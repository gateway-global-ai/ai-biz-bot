import { Router } from "express";
import { eq, and, desc, ilike, or, sql } from "drizzle-orm";
import { db } from "../db";
import { visualizerLibrary, customerAccounts } from "@shared/schema";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { sort = "popular", engine_type, limit = "20", offset = "0", q } = req.query;
    const limitNum = parseInt(limit as string, 10) || 20;
    const offsetNum = parseInt(offset as string, 10) || 0;

    const conditions = [eq(visualizerLibrary.isPublic, true)];
    if (engine_type) conditions.push(eq(visualizerLibrary.engineType, engine_type as string));
    if (q) {
      const search = q as string;
      conditions.push(
        or(
          ilike(visualizerLibrary.name, `%${search}%`),
          ilike(visualizerLibrary.description, `%${search}%`),
        )!,
      );
    }

    const rows = await db
      .select()
      .from(visualizerLibrary)
      .where(and(...conditions))
      .orderBy(sort === "recent" ? desc(visualizerLibrary.createdAt) : desc(visualizerLibrary.useCount))
      .limit(limitNum)
      .offset(offsetNum);

    res.json({ items: rows, count: rows.length });
  } catch (err: any) {
    console.error("[visualizerRoutes] browse error:", err.message);
    res.status(500).json({ error: "Failed to fetch visualizers" });
  }
});

router.get("/mine", async (req, res) => {
  const customerId = (req as any).customerAccountId;
  if (!customerId) return res.status(401).json({ error: "Authentication required" });
  try {
    const rows = await db
      .select()
      .from(visualizerLibrary)
      .where(eq(visualizerLibrary.authorId, customerId))
      .orderBy(desc(visualizerLibrary.updatedAt));

    res.json({ items: rows });
  } catch (err: any) {
    console.error("[visualizerRoutes] mine error:", err.message);
    res.status(500).json({ error: "Failed to fetch your visualizers" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [row] = await db
      .select()
      .from(visualizerLibrary)
      .where(eq(visualizerLibrary.id, req.params.id as string))
      .limit(1);

    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err: any) {
    console.error("[visualizerRoutes] get error:", err.message);
    res.status(500).json({ error: "Failed to fetch visualizer" });
  }
});

router.post("/", async (req, res) => {
  const customerId = (req as any).customerAccountId;
  if (!customerId) return res.status(401).json({ error: "Authentication required" });
  try {
    const { name, description, engine_type, config, is_public, tags } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const [account] = await db
      .select({ name: customerAccounts.name })
      .from(customerAccounts)
      .where(eq(customerAccounts.id, customerId))
      .limit(1);
    const authorName = account?.name || "Anonymous";

    const [row] = await db
      .insert(visualizerLibrary)
      .values({
        authorId: customerId,
        authorName,
        name,
        description: description || null,
        engineType: engine_type || "circular_pulse",
        config: config || {},
        isPublic: is_public !== false,
        tags: tags || [],
      })
      .returning();

    res.status(201).json(row);
  } catch (err: any) {
    console.error("[visualizerRoutes] create error:", err.message);
    res.status(500).json({ error: "Failed to create visualizer" });
  }
});

router.patch("/:id", async (req, res) => {
  const customerId = (req as any).customerAccountId;
  if (!customerId) return res.status(401).json({ error: "Authentication required" });
  try {
    const [existing] = await db
      .select()
      .from(visualizerLibrary)
      .where(and(eq(visualizerLibrary.id, req.params.id as string), eq(visualizerLibrary.authorId, customerId)))
      .limit(1);

    if (!existing) return res.status(403).json({ error: "Not found or not authorized" });

    const { name, description, engine_type, config, is_public, tags } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (engine_type) updates.engineType = engine_type;
    if (config) updates.config = config;
    if (is_public !== undefined) updates.isPublic = is_public;
    if (tags) updates.tags = tags;

    const [row] = await db
      .update(visualizerLibrary)
      .set(updates)
      .where(eq(visualizerLibrary.id, req.params.id as string))
      .returning();

    res.json(row);
  } catch (err: any) {
    console.error("[visualizerRoutes] update error:", err.message);
    res.status(500).json({ error: "Failed to update visualizer" });
  }
});

router.delete("/:id", async (req, res) => {
  const customerId = (req as any).customerAccountId;
  if (!customerId) return res.status(401).json({ error: "Authentication required" });
  try {
    const rows = await db
      .delete(visualizerLibrary)
      .where(and(eq(visualizerLibrary.id, req.params.id as string), eq(visualizerLibrary.authorId, customerId)))
      .returning({ id: visualizerLibrary.id });

    if (rows.length === 0) return res.status(403).json({ error: "Not found or not authorized" });
    res.json({ deleted: true });
  } catch (err: any) {
    console.error("[visualizerRoutes] delete error:", err.message);
    res.status(500).json({ error: "Failed to delete visualizer" });
  }
});

router.post("/:id/apply", async (req, res) => {
  try {
    const [row] = await db
      .update(visualizerLibrary)
      .set({ useCount: sql`${visualizerLibrary.useCount} + 1` })
      .where(eq(visualizerLibrary.id, req.params.id as string))
      .returning();

    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err: any) {
    console.error("[visualizerRoutes] apply error:", err.message);
    res.status(500).json({ error: "Failed to apply visualizer" });
  }
});

export default router;
