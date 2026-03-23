/**
 * B2B Data API — thin HTTP layer over `b2bStorage` (itineraries + agent markups).
 * Kept separate from the main app router for optional standalone use.
 */
import express from "express";
import { b2bStorage } from "./b2b-storage";
import { firstRouteParam } from "./utils/expressParams";

const app = express();
app.use(express.json());

// 1. FETCH ITINERARY: Loads orchestrator state for the agent (UUID string id)
app.get("/api/itinerary/:id", async (req, res) => {
  try {
    const id = firstRouteParam(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid ID" });

    const result = await b2bStorage.getItinerary(id);
    if (!result) return res.status(404).json({ error: "Not found" });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// 2. UPDATE ITINERARY: Persists drag-and-drop / thought state from the Curation Panel
app.post("/api/itinerary/save", async (req, res) => {
  try {
    const { id, days, thought_signature } = req.body;
    if (typeof id !== "string" || !id) {
      return res.status(400).json({ error: "ID is required" });
    }

    await b2bStorage.updateItinerary(id, {
      thoughtState: { days, thoughtSignature: thought_signature },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// 3. AGENT CONFIG: Fetches custom markup rules for the Pricing Engine (string agent id)
app.get("/api/agent/config/:agentId", async (req, res) => {
  try {
    const agentId = firstRouteParam(req.params.agentId);
    if (!agentId) return res.status(400).json({ error: "Invalid Agent ID" });

    const row = await b2bStorage.getMarkupForAgent(agentId);
    if (!row) {
      return res.json({ markup_value: 15.0, markup_type: "percentage" });
    }
    const num = Number(row.value);
    res.json({
      markup_value: Number.isFinite(num) ? num : 15.0,
      markup_type: row.type === "flat_fee" ? "flat" : "percentage",
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = 3004;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`B2B Data API running on port ${PORT}`);
});
