/**
 * Hotel MCP Server Tests
 * Run: npx tsx tests/test-mcp-hotels.ts
 *
 * Tests:
 * 1. Tool executor (unit) - executeHotelTool for each tool
 * 2. MCP HTTP endpoint (integration) - POST /mcp/hotels Initialize when BASE_URL set
 */
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";

async function testExecuteHotelTool() {
  console.log("\n--- Unit: executeHotelTool ---");
  const { executeHotelTool } = await import("../server/mcp-hotels-executor.js");

  // poi_autocomplete - needs GOOGLE_PLACES_KEY
  try {
    const r = await executeHotelTool("poi_autocomplete", { input: "Times" });
    const data = JSON.parse(r);
    if (data.success && Array.isArray(data.predictions)) {
      console.log("  poi_autocomplete: OK (got predictions)");
    } else if (!data.success && data.error?.includes("not configured")) {
      console.log("  poi_autocomplete: SKIP (API key not configured)");
    } else {
      console.log("  poi_autocomplete:", data.error || JSON.stringify(data).slice(0, 80));
    }
  } catch (e: any) {
    console.log("  poi_autocomplete: ERROR", e.message);
  }

  // search_hotels_db - needs DB config
  try {
    const r = await executeHotelTool("search_hotels_db", { cityName: "Miami" });
    const data = JSON.parse(r);
    if (data.success && Array.isArray(data.hotels)) {
      console.log("  search_hotels_db: OK (got", data.hotels.length, "hotels)");
    } else if (!data.success || data.error) {
      console.log("  search_hotels_db: SKIP/ERROR", data.error || "no hotels");
    } else {
      console.log("  search_hotels_db: OK");
    }
  } catch (e: any) {
    console.log("  search_hotels_db: ERROR", e.message);
  }

  // enrich_hotels_with_rates - needs DB + GRN
  try {
    const r = await executeHotelTool("enrich_hotels_with_rates", {
      location: "Miami Beach",
      checkin: "2025-03-15",
      checkout: "2025-03-17",
    });
    const data = JSON.parse(r);
    if (data.success && Array.isArray(data.hotels)) {
      console.log("  enrich_hotels_with_rates: OK");
    } else {
      console.log("  enrich_hotels_with_rates:", data.error || "no data");
    }
  } catch (e: any) {
    console.log("  enrich_hotels_with_rates: ERROR", e.message);
  }

  // Unknown tool
  const unknown = await executeHotelTool("unknown_tool", {});
  const u = JSON.parse(unknown);
  if (!u.success && u.error?.includes("Unknown")) {
    console.log("  unknown_tool: OK (correctly rejected)");
  } else {
    console.log("  unknown_tool: UNEXPECTED", u);
  }
}

async function testMcpEndpoint() {
  console.log("\n--- Integration: MCP POST /mcp/hotels ---");
  try {
    const initReq = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test-client", version: "1.0" },
      },
    };
    const res = await fetch(`${BASE_URL}/mcp/hotels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(initReq),
    });
    const text = await res.text();
    if (res.ok) {
      const data = JSON.parse(text);
      if (data.result?.serverInfo?.name === "hotel-mcp-server") {
        console.log("  MCP Initialize: OK");
      } else {
        console.log("  MCP Initialize: unexpected result", data.result?.serverInfo);
      }
    } else {
      console.log("  MCP Initialize: HTTP", res.status, text.slice(0, 200));
    }
  } catch (e: any) {
    console.log("  MCP Initialize: ERROR", e.message, "(Is server running on", BASE_URL, "?)");
  }
}

async function main() {
  console.log("Hotel MCP Tests");
  console.log("BASE_URL:", BASE_URL);
  await testExecuteHotelTool();
  await testMcpEndpoint();
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
