/**
 * Dubai & Las Vegas B2B Demo Seed – populates PostgreSQL with SerpAPI-style flights
 * and GRN-style hotels and creates an in-progress itinerary for the GRN Connect demo.
 *
 * Run with server up: npx tsx tests/seed-b2b-demo.ts
 *
 * Port must match the running server. Your .env has PORT=3004; if the server was
 * started without .env it may be on 5000. Override explicitly if needed:
 *
 *   API_BASE=http://localhost:3004 npx tsx tests/seed-b2b-demo.ts
 *   API_BASE=http://localhost:5000 npx tsx tests/seed-b2b-demo.ts
 *
 * To verify B2B routes and port: npx tsx tests/debug-b2b-routes.ts
 */
import "dotenv/config";

const API_BASE =
  process.env.API_BASE ||
  process.env.API_URL ||
  process.env.SERVER_URL ||
  "http://localhost:" + (process.env.PORT || "5000");
const B2B = API_BASE.replace(/\/$/, "") + "/api/b2b";

async function post<T extends { id?: string }>(path: string, body: unknown, expectId = true): Promise<T> {
  const res = await fetch(B2B + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${res.status} ${path}: ${text.slice(0, 300)}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const snippet = text.trim().slice(0, 200);
    const looksHtml = snippet.startsWith("<!") || snippet.startsWith("<html");
    throw new Error(
      `Non-JSON response from ${path} (content-type: ${ct}). ` +
        (looksHtml
          ? "Likely wrong port or SPA fallback – run: npx tsx tests/debug-b2b-routes.ts and use API_BASE to match server port."
          : `Body: ${snippet}`)
    );
  }
  let data: T;
  try {
    data = JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON from ${path}: ${text.slice(0, 150)}`);
  }
  if (data == null || data === undefined) {
    throw new Error(`Response from ${path} was null/undefined. Is the server running?`);
  }
  if (expectId && typeof (data as { id?: string }).id !== "string") {
    throw new Error(`Response from ${path} missing id. Got: ${JSON.stringify(data).slice(0, 200)}`);
  }
  return data;
}

async function seed() {
  console.log("🚀 Starting B2B Demo Seeding...");
  console.log("   API base:", API_BASE);

  try {
    // 1. Dubai leads
    const dxbHotel = await post<{ id: string }>("/hotels", {
      hotelCode: "GRN-DXB-9921",
      name: "Burj Al Arab Jumeirah",
      rawResponse: {
        address: "Umm Suqeim 3, Dubai",
        geolocation: { lat: 25.1412, lng: 55.1852 },
        rating: 5.0,
      },
    });
    console.log("   ✅ Dubai hotel:", dxbHotel.id);

    const dxbFlight = await post<{ id: string }>("/flights", {
      bookingToken: "SERP-EK-DXB-441",
      departureId: "JFK",
      arrivalId: "DXB",
      rawResponse: { airline: "Emirates", net_price: 1450.0 },
    });
    console.log("   ✅ Dubai flight:", dxbFlight.id);

    // 2. Las Vegas leads
    const lvHotel = await post<{ id: string }>("/hotels", {
      hotelCode: "GRN-LAS-7721",
      name: "The Venetian Las Vegas",
      rawResponse: {
        address: "3355 S Las Vegas Blvd",
        geolocation: { lat: 36.1212, lng: -115.1697 },
        rating: 4.8,
      },
    });
    console.log("   ✅ Las Vegas hotel:", lvHotel.id);

    // 3. In-progress itinerary for "Dubai Luxury Break" (Master Orchestrator state)
    const itin = await post<{ id: string }>("/itineraries", {
      clientRef: "VIP-CLIENT-001",
      tripAnchor: "Dubai Marina",
      thoughtState: {
        last_step: "Identifying proximity to beach",
        suggested_focus: "Luxury/Business",
      },
    });
    console.log("   ✅ Itinerary (Dubai Marina):", itin.id);

    console.log("\n✅ Seeding complete. Dubai and Las Vegas leads are live.");
    console.log("   Portal: open /test-b2b and drag Burj Al Arab or Emirates into the itinerary.");
  } catch (err) {
    console.error("❌ Seeding failed. Ensure the server is running on", API_BASE);
    console.error("   ", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

seed();
