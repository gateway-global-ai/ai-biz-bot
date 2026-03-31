/**
 * Intent loop Phase B1 — actor observation from trusted signals only.
 * Run: npx tsx tests/test-intent-loop-actor-observation.ts
 */
import { resolveIntentLoopActorObservation } from "../server/services/intentLoopActorObservation.js";
import type { ResolvedVisitorSecurity } from "../server/services/canvasDirectiveValidator.js";
import type { VisitorSessionSecurityProbe } from "../server/services/canvasDirectiveValidator.js";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function run(
  label: string,
  params: {
    resolvedSecurity: ResolvedVisitorSecurity;
    visitorIdPresent: boolean;
    visitorSessionProbe: VisitorSessionSecurityProbe;
    envelopeSecurityLevel: ResolvedVisitorSecurity["securityLevel"];
    intentLoopActorChannel?: "public" | "operator";
  },
  expect: {
    actorClass: string;
    minConfidence?: number;
    codes: string[];
  },
): void {
  const r = resolveIntentLoopActorObservation(params);
  assert(r.actorClass === expect.actorClass, `${label}: actorClass want ${expect.actorClass} got ${r.actorClass}`);
  if (expect.minConfidence !== undefined) {
    assert(r.actorConfidence >= expect.minConfidence, `${label}: confidence`);
  }
  for (const c of expect.codes) {
    assert(r.actorReasonCodes.includes(c as (typeof r.actorReasonCodes)[number]), `${label}: missing code ${c}`);
  }
}

function main(): void {
  const probeFound: VisitorSessionSecurityProbe = { sessionRowFound: true, rawDbSecurityLevel: "admin" };
  const probeAnon: VisitorSessionSecurityProbe = { sessionRowFound: true, rawDbSecurityLevel: "anonymous" };
  const probeMissing: VisitorSessionSecurityProbe = { sessionRowFound: false, rawDbSecurityLevel: null };

  run(
    "admin session",
    {
      resolvedSecurity: { securityLevel: "admin", authState: "authenticated" },
      visitorIdPresent: true,
      visitorSessionProbe: probeFound,
      envelopeSecurityLevel: "admin",
    },
    { actorClass: "management", minConfidence: 0.9, codes: ["actor_from_session", "actor_from_security_context"] },
  );

  run(
    "staff session",
    {
      resolvedSecurity: { securityLevel: "staff", authState: "authenticated" },
      visitorIdPresent: true,
      visitorSessionProbe: { sessionRowFound: true, rawDbSecurityLevel: "staff" },
      envelopeSecurityLevel: "staff",
    },
    { actorClass: "employee", minConfidence: 0.85, codes: ["actor_from_security_context"] },
  );

  run(
    "verified customer",
    {
      resolvedSecurity: { securityLevel: "verified", authState: "authenticated" },
      visitorIdPresent: true,
      visitorSessionProbe: { sessionRowFound: true, rawDbSecurityLevel: "phone_verified" },
      envelopeSecurityLevel: "verified",
    },
    { actorClass: "customer", minConfidence: 0.8, codes: ["actor_from_security_context"] },
  );

  run(
    "public anonymous with session row",
    {
      resolvedSecurity: { securityLevel: "public", authState: "anonymous" },
      visitorIdPresent: true,
      visitorSessionProbe: probeAnon,
      envelopeSecurityLevel: "public",
    },
    { actorClass: "unknown", codes: ["actor_unknown", "actor_from_security_context"] },
  );

  assert(
    resolveIntentLoopActorObservation({
      resolvedSecurity: { securityLevel: "public", authState: "anonymous" },
      visitorIdPresent: true,
      visitorSessionProbe: probeAnon,
      envelopeSecurityLevel: "public",
    }).actorHypothesis?.actorClass === "customer",
    "hypothesis customer when unknown",
  );

  run(
    "no visitor id",
    {
      resolvedSecurity: { securityLevel: "public", authState: "anonymous" },
      visitorIdPresent: false,
      visitorSessionProbe: probeMissing,
      envelopeSecurityLevel: "public",
    },
    { actorClass: "unknown", codes: ["actor_unknown"] },
  );

  run(
    "visitor id but no row",
    {
      resolvedSecurity: { securityLevel: "public", authState: "anonymous" },
      visitorIdPresent: true,
      visitorSessionProbe: probeMissing,
      envelopeSecurityLevel: "public",
    },
    { actorClass: "unknown", codes: ["actor_unknown"] },
  );

  run(
    "operator channel vs public security",
    {
      resolvedSecurity: { securityLevel: "public", authState: "anonymous" },
      visitorIdPresent: true,
      visitorSessionProbe: probeAnon,
      envelopeSecurityLevel: "public",
      intentLoopActorChannel: "operator",
    },
    { actorClass: "unknown", codes: ["actor_unknown", "actor_channel_hint_diverged"] },
  );

  run(
    "client hint diverged",
    {
      resolvedSecurity: { securityLevel: "public", authState: "anonymous" },
      visitorIdPresent: true,
      visitorSessionProbe: probeAnon,
      envelopeSecurityLevel: "admin",
    },
    { actorClass: "unknown", codes: ["actor_client_hint_diverged"] },
  );

  console.log("[test-intent-loop-actor-observation] ok");
}

main();
