import { Express } from "express";
import { storage } from "../storage";

export function registerB2BRoutes(app: Express) {
  // 1. FETCH ITINERARY: Loads the stateful workspace for the agent
  app.get('/api/itinerary/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
      
      const result = await storage.getItinerary(id);
      if (!result) return res.status(404).json({ error: "Not found" });
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // 2. UPDATE ITINERARY: Persists drag-and-drop actions from the Curation Panel
  app.post('/api/itinerary/save', async (req, res) => {
    try {
      const { id, days, thought_signature } = req.body;
      if (!id) return res.status(400).json({ error: "ID is required" });
      
      await storage.updateItinerary(parseInt(id), { 
        days, 
        thoughtSignature: thought_signature 
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // 3. AGENT CONFIG: Fetches custom markup rules for the Pricing Engine
  app.get('/api/agent/config/:agentId', async (req, res) => {
    try {
      const agentId = parseInt(req.params.agentId);
      if (isNaN(agentId)) return res.status(400).json({ error: "Invalid Agent ID" });
      
      const config = await storage.getAgentMarkup(agentId);
      res.json(config || { markup_value: 15.0, markup_type: 'percentage' });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });
}
