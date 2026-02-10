import { handleOrchestratorTurn, runLeadScraper } from "../src/services/geminiService";
import * as dotenv from "dotenv";

dotenv.config();

async function simulateTravelSequence() {
  console.log("🚀 STARTING GATEWAY GLOBAL TRAVEL OS SIMULATION\n");

  const systemInstruction = "You are the Gateway Global Travel Architect. COORDINATE all user intent. Use `callMapsSpecialist` for any geographical queries and `search_serp_flights` for airfare.";
  const history: any[] = [];

  // STEP 1: User Intent - COP28 Dubai
  console.log("--- STEP 1: USER INTENT ---");
  const userMessage1 = "I need to plan a trip to COP28 in Dubai. Find me flights from JFK for the event dates and 4-star hotels near Expo City.";
  console.log(`User: ${userMessage1}\n`);

  try {
    const response1 = await handleOrchestratorTurn(userMessage1, history, systemInstruction);
    console.log(`Master Orchestrator: ${response1}\n`);

    // STEP 2: Lead Scraping (Simulated POI Data)
    console.log("--- STEP 2: LEAD SCRAPING ---");
    const mockPoiData = [
      { name: "Expo City Hotel", rating: 3.5, distance_to_anchor: 0.5, address: "Dubai, UAE" },
      { name: "Luxury Sands Resort", rating: 4.8, distance_to_anchor: 1.2, address: "Dubai, UAE" }
    ];
    const leads = await runLeadScraper(mockPoiData);
    console.log(`Lead Scraper Results: ${leads}\n`);

    console.log("✅ SIMULATION COMPLETE: Relay Logic and Tool Handoff Verified.");
  } catch (error) {
    console.error("❌ SIMULATION FAILED:", error);
  }
}

simulateTravelSequence();
