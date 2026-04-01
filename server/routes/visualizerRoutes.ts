import { Router } from "express";
import { storage } from "../storage";

const router = Router();

/** GET /api/visualizers — Browse public library (paginated) */
router.get("/", async (req, res) => {
  try {
    const { sort = "popular", engine_type, limit = "20", offset = "0", q } = req.query;
    const results = await storage.query(`
      SELECT * FROM visualizer_library
      WHERE is_public = true
      ${engine_type ? "AND engine_type = $3" : ""}
      ${q ? `AND (name ILIKE '%' || $4 || '%' OR description ILIKE '%' || $4 || '%')` : ""}
      ORDER BY ${sort === "recent" ? "created_at DESC" : "use_count DESC"}
      LIMIT $1 OFFSET $2
    `, [
      parseInt(limit as string, 10),
      parseInt(offset as string, 10),
      ...(engine_type ? [engine_type] : []),
      ...(q ? [q] : []),
    ]);
    res.json({ items: results.rows, count: results.rows.length });
  } catch (err: any) {
    console.error("[visualizerRoutes] browse error:", err.message);
    res.status(500).json({ error: "Failed to fetch visualizers" });
  }
});

/** GET /api/visualizers/mine — List my authored visualizers */
router.get("/mine", async (req, res) => {
  const customerId = (req as any).customerAccountId;
  if (!customerId) return res.status(401).json({ error: "Authentication required" });
  try {
    const results = await storage.query(
      "SELECT * FROM visualizer_library WHERE author_id = $1 ORDER BY updated_at DESC",
      [customerId],
    );
    res.json({ items: results.rows });
  } catch (err: any) {
    console.error("[visualizerRoutes] mine error:", err.message);
    res.status(500).json({ error: "Failed to fetch your visualizers" });
  }
});

/** GET /api/visualizers/:id — Get single visualizer config */
router.get("/:id", async (req, res) => {
  try {
    const result = await storage.query(
      "SELECT * FROM visualizer_library WHERE id = $1",
      [req.params.id],
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error("[visualizerRoutes] get error:", err.message);
    res.status(500).json({ error: "Failed to fetch visualizer" });
  }
});

/** POST /api/visualizers — Create new visualizer */
router.post("/", async (req, res) => {
  const customerId = (req as any).customerAccountId;
  if (!customerId) return res.status(401).json({ error: "Authentication required" });
  try {
    const { name, description, engine_type, config, is_public, tags } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const authorResult = await storage.query(
      "SELECT name FROM customer_accounts WHERE id = $1",
      [customerId],
    );
    const authorName = authorResult.rows[0]?.name || "Anonymous";

    const result = await storage.query(
      `INSERT INTO visualizer_library (author_id, author_name, name, description, engine_type, config, is_public, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        customerId,
        authorName,
        name,
        description || null,
        engine_type || "circular_pulse",
        JSON.stringify(config || {}),
        is_public !== false,
        tags || [],
      ],
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error("[visualizerRoutes] create error:", err.message);
    res.status(500).json({ error: "Failed to create visualizer" });
  }
});

/** PATCH /api/visualizers/:id — Update own visualizer */
router.patch("/:id", async (req, res) => {
  const customerId = (req as any).customerAccountId;
  if (!customerId) return res.status(401).json({ error: "Authentication required" });
  try {
    const existing = await storage.query(
      "SELECT * FROM visualizer_library WHERE id = $1 AND author_id = $2",
      [req.params.id, customerId],
    );
    if (existing.rows.length === 0) return res.status(403).json({ error: "Not found or not authorized" });

    const { name, description, engine_type, config, is_public, tags } = req.body;
    const result = await storage.query(
      `UPDATE visualizer_library SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        engine_type = COALESCE($3, engine_type),
        config = COALESCE($4, config),
        is_public = COALESCE($5, is_public),
        tags = COALESCE($6, tags),
        updated_at = now()
       WHERE id = $7 RETURNING *`,
      [
        name || null,
        description || null,
        engine_type || null,
        config ? JSON.stringify(config) : null,
        is_public ?? null,
        tags || null,
        req.params.id,
      ],
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error("[visualizerRoutes] update error:", err.message);
    res.status(500).json({ error: "Failed to update visualizer" });
  }
});

/** DELETE /api/visualizers/:id — Delete own visualizer */
router.delete("/:id", async (req, res) => {
  const customerId = (req as any).customerAccountId;
  if (!customerId) return res.status(401).json({ error: "Authentication required" });
  try {
    const result = await storage.query(
      "DELETE FROM visualizer_library WHERE id = $1 AND author_id = $2 RETURNING id",
      [req.params.id, customerId],
    );
    if (result.rows.length === 0) return res.status(403).json({ error: "Not found or not authorized" });
    res.json({ deleted: true });
  } catch (err: any) {
    console.error("[visualizerRoutes] delete error:", err.message);
    res.status(500).json({ error: "Failed to delete visualizer" });
  }
});

/** POST /api/visualizers/:id/apply — Apply a visualizer (increments use_count) */
router.post("/:id/apply", async (req, res) => {
  try {
    const result = await storage.query(
      `UPDATE visualizer_library SET use_count = use_count + 1 WHERE id = $1 RETURNING *`,
      [req.params.id],
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error("[visualizerRoutes] apply error:", err.message);
    res.status(500).json({ error: "Failed to apply visualizer" });
  }
});

export default router;
