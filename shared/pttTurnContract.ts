/**
 * PTT Control Plane Contract — runtime types (v1).
 * Canonical prose: docs-governance/canonical/PTT_CONTROL_PLANE_CONTRACT_V1.md
 */

import type {
  IntentLoopActorClass,
  IntentLoopLifecycleStage,
  IntentLoopManagementStage,
} from "./intentLoopContract";

export const PTT_CONTRACT_VERSION = "ptt_control_plane.v1" as const;

// ---------------------------------------------------------------------------
// Turn states
// ---------------------------------------------------------------------------

export const PTT_TURN_STATES = [
  "idle",
  "listening",
  "processing",
  "resolving",
  "rendering",
  "speaking",
] as const;

export type PttTurnState = (typeof PTT_TURN_STATES)[number];

// ---------------------------------------------------------------------------
// Governed turn outcomes
// ---------------------------------------------------------------------------

export const PTT_GOVERNED_OUTCOMES = [
  "navigate",
  "inspect",
  "clarify",
  "mutate",
  "escalate",
  "refuse",
  "handoff",
] as const;

export type PttGovernedOutcome = (typeof PTT_GOVERNED_OUTCOMES)[number];

// ---------------------------------------------------------------------------
// Route authority hierarchy (L0-L4)
// ---------------------------------------------------------------------------

export const ROUTE_AUTHORITY_LEVELS = {
  L0_IDENTITY: 0,
  L1_SYSTEM: 1,
  L2_DOMAIN_CATEGORY: 2,
  L3_APP_SURFACE: 3,
  L4_TASK_SURFACE: 4,
} as const;

export type RouteAuthorityLevel =
  (typeof ROUTE_AUTHORITY_LEVELS)[keyof typeof ROUTE_AUTHORITY_LEVELS];

export const PROTECTED_AUTHORITY_LEVELS = new Set([
  ROUTE_AUTHORITY_LEVELS.L0_IDENTITY,
  ROUTE_AUTHORITY_LEVELS.L1_SYSTEM,
]);

// ---------------------------------------------------------------------------
// Entry-point modes
// ---------------------------------------------------------------------------

export const ENTRY_POINT_MODES = [
  "public",
  "public_splash",
  "public_gate",
] as const;

export type EntryPointMode = (typeof ENTRY_POINT_MODES)[number];

// ---------------------------------------------------------------------------
// Auth strength (for public_gate entry points)
// ---------------------------------------------------------------------------

export const AUTH_STRENGTH_LEVELS = ["light", "standard", "strong"] as const;

export type AuthStrengthLevel = (typeof AUTH_STRENGTH_LEVELS)[number];

export const AUTH_PROVIDERS = [
  "otp",
  "nova_verify",
  "123checkme",
] as const;

export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

// ---------------------------------------------------------------------------
// PTT turn envelope — produced before the model gets authority
// ---------------------------------------------------------------------------

export interface PttTurnEnvelope {
  turnId: string;
  sessionId: string;
  siteConfigId: string;
  actorClass: IntentLoopActorClass;
  actorRole?: string;
  channel: "voice_ptt";
  transcript: string;
  currentViewId: string | null;
  lifecycleStage: IntentLoopLifecycleStage | IntentLoopManagementStage;
  securityLevel: "anonymous" | "phone_verified" | "admin";
  visitorId?: string;
  entryMode: EntryPointMode;
  siteRuntimeRef: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Turn audit record
// ---------------------------------------------------------------------------

export interface PttTurnAuditRecord {
  turnId: string;
  sessionId: string;
  actorClass: IntentLoopActorClass;
  transcript: string;
  resolvedViewId: string | null;
  resolvedActions: string[];
  policyOutcome: PttGovernedOutcome;
  violations: string[];
  evidenceRefs: string[];
  durationMs: number;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Entry-point registry row
// ---------------------------------------------------------------------------

export interface EntryPointDefinition {
  entryId: string;
  browserPath: string;
  domain: string;
  entryMode: EntryPointMode;
  linkedRouteId: string;
  linkedViewId: string;
  splashEnabled: boolean;
  splashViewId?: string;
  autoContineSeconds?: number;
  gatePolicy: string;
  authProvider?: AuthProvider;
  authLevel?: AuthStrengthLevel;
  postAuthViewId?: string;
}

// ---------------------------------------------------------------------------
// Footer slot contract
// ---------------------------------------------------------------------------

export const FOOTER_SLOT_RESIDENTS = {
  LEFT_1: "mute",
  LEFT_2: "overlay_toggle",
  CENTER: "ptt_button",
  RIGHT_1: "screen_resizer",
  RIGHT_2: "menu",
} as const;

export type FooterSlotResident =
  (typeof FOOTER_SLOT_RESIDENTS)[keyof typeof FOOTER_SLOT_RESIDENTS];

// ---------------------------------------------------------------------------
// L1 system menu categories (permanent, agent-immutable)
// ---------------------------------------------------------------------------

export const SYSTEM_MENU_CATEGORIES = [
  "canvas_personalization",
  "share_connect",
  "session",
  "agent",
] as const;

export type SystemMenuCategory = (typeof SYSTEM_MENU_CATEGORIES)[number];
