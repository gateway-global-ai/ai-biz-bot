/**
 * Debug script: pings all B2B API routes and reports which return JSON vs HTML.
 * Use this to verify port/route (JSON handshake) before running seed-b2b-demo.ts.
 *
 * Run with the server up: npx tsx tests/debug-b2b-routes.ts
 *
 * Port must match the running server (.env has PORT=3004; without .env server uses 5000).
 * Use the same API_BASE when running seed-b2b-demo.ts.
 *
 *   API_BASE=http://localhost:3004 npx tsx tests/debug-b2b-routes.ts
 *   API_BASE=http://localhost:5000 npx tsx tests/debug-b2b-routes.ts
 */
import "dotenv/config";

const API_BASE =
  process.env.API_BASE ||
  process.env.API_URL ||
  process.env.SERVER_URL ||
  "http://localhost:" + (process.env.PORT || "5000");

type Check = { method: string; path: string; body?: unknown };
const CHECKS: Check[] = [
  { method: "GET", path: "/api/b2b/itineraries/in-progress?clientRef=debug-test" },
  { method: "POST", path: "/api/b2b/itineraries", body: { clientRef: "debug-test", tripAnchor: "Debug" } },
  { method: "GET", path: "/api/b2b/curation-events" },
  { method: "GET", path: "/api/b2b/markups/agent/test-agent" },
  { method: "POST", path: "/api/b2b/events/search", body: { query: "Olympics 2026 Milan" } },
];

function checkBody(text: string): { json: boolean; html: boolean } {
  const trimmed = text.trim();
  const html = trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<!doctype");
  const json = trimmed.length === 0 || (() => { try { JSON.parse(text); return true; } catch { return false; } })();
  return { json, html };
}

async function run() {
  console.log("B2B route debug – base URL:", API_BASE);
  console.log("");

  for (const { method, path, body } of CHECKS) {
    const url = API_BASE + path;
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      const { json: looksJson, html } = checkBody(text);
      const status = res.status;

      if (html) {
        console.log(`[HTML] ${method} ${path} -> ${status} (HTML-as-JSON trap – check route or port)`);
      } else if (looksJson) {
        console.log(`[OK] ${method} ${path} -> ${status} (JSON)`);
      } else {
        console.log(`[???] ${method} ${path} -> ${status} (not JSON, not HTML)`);
      }
    } catch (e) {
      console.log(`[ERR] ${method} ${path} -> ${e instanceof Error ? e.message : "fetch failed"}`);
    }
  }

  console.log("");
  console.log("If you see [HTML], the server is likely returning index.html (404/500).");
  console.log("Ensure: (1) server is running on the same port as API_BASE, (2) registerB2bRoutes(app) runs in server/routes.ts.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
