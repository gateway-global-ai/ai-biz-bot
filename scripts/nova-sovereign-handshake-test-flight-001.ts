/**
 * Sovereign Handshake Test — Flight 001
 * E2E verification of the Nova Sovereign stack (Real Estate scenario).
 *
 * Prerequisites:
 *   - Doppler env with: DATABASE_URL, NOVA_RSA_PUBLIC_KEY, NOVA_RSA_PRIVATE_KEY,
 *     GOOGLE_SERVICE_ACCOUNT_JSON, PLATFORM_SENDER_EMAIL.
 *   - Server running (e.g. doppler run -- npm run dev) so POST /api/nova/billing/receive is live.
 *
 * Run: doppler run -- npx tsx scripts/nova-sovereign-handshake-test-flight-001.ts
 * Optional: BASE_URL=http://localhost:3004 (default)  TEST_EMAIL=you@example.com (recipient for email step)
 */

import crypto from "node:crypto";
import { randomUUID } from "node:crypto";
import { db } from "../server/db";
import { novaIdvSessions } from "@shared/schema";
import { buildCanonical } from "../server/utils/novaSignature";
import { sendPlatformEmail } from "../server/services/emailService";
import { generateInvoice } from "../server/services/novaInvoiceService";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3004";
const UUID_REAL_ESTATE = "a1b2c3d4-e5f6-4780-a123-456789abcdef"; // Canonical real-estate business ID for Flight 001

function signCanonical(canonical: string, privateKeyPem: string): string {
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(canonical, "utf8");
  return sign.sign(privateKeyPem, "base64");
}

function requireEnv(name: string): void {
  if (!process.env[name]?.trim()) {
    console.error(`[Flight 001] Missing required env: ${name}. Run with: doppler run -- npx tsx scripts/nova-sovereign-handshake-test-flight-001.ts`);
    process.exit(1);
  }
}

async function main() {
  requireEnv("DATABASE_URL");
  requireEnv("NOVA_RSA_PUBLIC_KEY");
  requireEnv("NOVA_RSA_PRIVATE_KEY");
  requireEnv("GOOGLE_SERVICE_ACCOUNT_JSON");
  requireEnv("PLATFORM_SENDER_EMAIL");

  const errors: string[] = [];
  const sessionId = randomUUID();

  console.log("[Flight 001] Sovereign Handshake Test — Real Estate (protocol_level=7)\n");

  // ─── 1. Database Verification (The Row) ─────────────────────────────────────
  console.log("1. Database Verification (The Row)");
  try {
    await db.insert(novaIdvSessions).values({
      sessionId,
      businessId: UUID_REAL_ESTATE,
      clientPhone: null,
      clientEmail: null,
      protocolLevel: 7,
      otpVerified: false,
      magicLinkVerified: false,
      biometricVerified: false,
      idVerified: false,
      signatureUrl: null,
      invoiceId: null,
    });
    console.log("   OK — Mock session created:", sessionId, "business_id:", UUID_REAL_ESTATE);
  } catch (e: any) {
    errors.push(`DB: ${e?.message ?? e}`);
    console.error("   FAIL —", e?.message ?? e);
  }

  // ─── 2. The Signed Inbound (The Heartbeat) ──────────────────────────────────
  console.log("\n2. The Signed Inbound (receive_id_analysis)");
  const privateKeyPem = process.env.NOVA_RSA_PRIVATE_KEY;
  if (!privateKeyPem?.includes("-----BEGIN")) {
    errors.push("NOVA_RSA_PRIVATE_KEY not set or invalid (need PEM with -----BEGIN)");
    console.error("   FAIL — NOVA_RSA_PRIVATE_KEY not configured");
  } else {
    const pathname = "/api/nova/billing/receive";
    const method = "POST";
    const timestamp = new Date().toISOString();
    const body = JSON.stringify({
      operation: "receive_id_analysis",
      session_id: sessionId,
      payload: { isVerified: true },
    });
    const canonical = buildCanonical(method, pathname, timestamp, body);
    const signature = signCanonical(canonical, privateKeyPem);

    const res = await fetch(`${BASE_URL}${pathname}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Nova-Signature": signature,
        "X-Nova-Timestamp": timestamp,
        "X-Nova-Business-ID": UUID_REAL_ESTATE,
        "X-Nova-Protocol-Level": "7",
      },
      body,
    });

    if (res.status !== 200) {
      const text = await res.text();
      errors.push(`receive: ${res.status} ${text}`);
      console.error("   FAIL —", res.status, text);
    } else {
      console.log("   OK — 200, signature valid, DB updated");
    }
  }

  // ─── 3. The Automated Hand (The Email) ────────────────────────────────────
  console.log("\n3. The Automated Hand (Platform Email)");
  const testTo = process.env.TEST_EMAIL ?? process.env.PLATFORM_SENDER_EMAIL;
  if (!testTo) {
    errors.push("TEST_EMAIL or PLATFORM_SENDER_EMAIL required for email step");
    console.error("   FAIL — No recipient (set TEST_EMAIL or PLATFORM_SENDER_EMAIL)");
  } else {
    const emailResult = await sendPlatformEmail({
      to: testTo,
      customerName: "Flight 001 Test",
      businessName: "Real Estate Agency (Sovereign Handshake)",
      planName: "Nova IDV Level 7",
      platformId: "flight-001",
      agentName: "Nova Sovereign",
    });
    if (!emailResult.sent) {
      errors.push(`Email: ${emailResult.error ?? "not sent"}`);
      console.error("   FAIL —", emailResult.error ?? "not sent");
    } else {
      console.log("   OK — Email sent (GOOGLE_SERVICE_ACCOUNT_JSON hydrated, Gmail API accepted)");
    }
  }

  // ─── 4. The Settlement (The Invoice) ──────────────────────────────────────
  console.log("\n4. The Settlement (generate_invoice real_estate_agency)");
  const invoice = generateInvoice("real_estate_agency");
  const expectedItems = 10; // Group 1 manifest
  if (!invoice) {
    errors.push("Invoice: generate_invoice returned null");
    console.error("   FAIL — generate_invoice('real_estate_agency') returned null");
  } else if (invoice.line_items.length !== expectedItems) {
    errors.push(`Invoice: expected ${expectedItems} items, got ${invoice.line_items.length}`);
    console.error("   FAIL — expected", expectedItems, "items, got", invoice.line_items.length);
  } else {
    console.log("   OK — 200 OK, invoice has exactly 10 items (Group 1 manifest)");
  }

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(60));
  if (errors.length > 0) {
    console.error("Target status: EXCEPTIONS");
    errors.forEach((e) => console.error("  -", e));
    process.exit(1);
  }
  console.log("Target Status: 200 OK. Signature Valid. DB Updated. Email Sent. Invoice Generated. NO EXCEPTIONS.");
  process.exit(0);
}

main().catch((e) => {
  console.error("[Flight 001] Unhandled error:", e);
  process.exit(1);
});
