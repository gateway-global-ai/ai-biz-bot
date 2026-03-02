/**
 * bailRescueStore.ts
 * In-memory store for bail rescue sessions created by the vine_lookup_and_dispatch tool.
 * Sessions are keyed by a UUID rescue token and expire after 24 hours.
 * Each session represents a single "bail rescue" workflow for an outside indemnitor (payer).
 */
import { randomUUID } from "crypto";

export interface BailRescueSession {
  token: string;
  createdAt: Date;
  expiresAt: Date;

  // Inmate information (from VINE / EBRSO lookup)
  inmateFirstName: string;
  inmateLastName: string;
  facilityName: string;
  facilityPhone: string | null;
  custodyStatus: "confirmed" | "pending_verification" | "not_found";

  // Bond financials
  bondAmount: number | null;        // total bond in USD
  premiumCents: number | null;      // 12% of bondAmount, in cents
  premiumDisplay: string | null;    // human-readable e.g. "$1,200.00"

  // Payer / indemnitor
  outsideContactNumber: string;

  // Sovereign overlay (from knowledgeLibrary)
  businessName: string;
  ownerName: string;
  agencyContact: string;
  siteConfigId: string | null;

  // Stripe checkout (set after payer initiates checkout)
  stripeCheckoutUrl: string | null;
  checkoutSessionId: string | null;
  paymentStatus: "pending" | "paid" | "failed";
}

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const store = new Map<string, BailRescueSession>();

/** Create a new rescue session and return its token. */
export function createBailRescueSession(
  data: Omit<BailRescueSession, "token" | "createdAt" | "expiresAt" | "stripeCheckoutUrl" | "checkoutSessionId" | "paymentStatus">
): BailRescueSession {
  const token = randomUUID();
  const now = new Date();
  const session: BailRescueSession = {
    ...data,
    token,
    createdAt: now,
    expiresAt: new Date(now.getTime() + TTL_MS),
    stripeCheckoutUrl: null,
    checkoutSessionId: null,
    paymentStatus: "pending",
  };
  store.set(token, session);
  scheduleCleanup(token, TTL_MS);
  return session;
}

/** Retrieve a rescue session by token (null if missing or expired). */
export function getBailRescueSession(token: string): BailRescueSession | null {
  const session = store.get(token);
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    store.delete(token);
    return null;
  }
  return session;
}

/** Update a rescue session (partial). */
export function updateBailRescueSession(
  token: string,
  updates: Partial<BailRescueSession>
): BailRescueSession | null {
  const session = store.get(token);
  if (!session) return null;
  Object.assign(session, updates);
  store.set(token, session);
  return session;
}

function scheduleCleanup(token: string, delayMs: number): void {
  setTimeout(() => {
    store.delete(token);
    console.log(`[BailRescueStore] Expired session removed: ${token}`);
  }, delayMs);
}
