/**
 * Server-side PolicyDecision enforcement middleware.
 *
 * This is the Node server's entry point into the PolicyDecision contract.
 * Every mutation route should eventually pass through this gate.
 *
 * Design:
 *   - Composes with existing requireAuth (auth first, then policy)
 *   - Produces a PolicyDecision and attaches it to req for audit
 *   - On deny: returns structured JSON (not a throw)
 *   - On escalate: returns 403 with escalation metadata
 *   - On degrade: attaches degraded capabilities to req, continues
 *   - On allow: attaches decision to req, calls next()
 *
 * Usage:
 *   router.post('/api/foo', requireAuth, requirePolicy('foo.write'), handler)
 *
 * The PolicyDecision is available on req.policyDecision for audit logging.
 */

import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import {
  type PolicyDecision,
  type SwarmRoleContext,
  type IntentContext,
  POLICY_DECISION_CONTRACT_VERSION,
  allowDecision,
  denyDecision,
  formatPolicyDecisionSummary,
} from "../../shared/policyDecisionContract.js";

/**
 * Gate existence and metadata now come from policy-gates.yaml via the catalog.
 * The hardcoded SERVER_POLICY_GATES and ANONYMOUS_ALLOWED_GATES are eliminated.
 *
 * Doctrine D10: Single authority — registry-yaml/policy-gates.yaml is the
 * sole source of truth for gate definitions.
 */
import {
  isRegisteredGate,
  getGateEntry,
  loadPolicyGateCatalog,
} from "../os-core-bridge/policyGateCatalogBridge.js";

/**
 * Extend Express Request to carry PolicyDecision.
 */
declare global {
  namespace Express {
    interface Request {
      policyDecision?: PolicyDecision;
    }
  }
}

/**
 * Extract actor context from the authenticated session (if present).
 */
function extractIntentContext(req: Request): IntentContext {
  const session = (req as any).session as {
    adminUserId?: string;
    role?: string;
  } | undefined;

  const role = typeof session?.role === "string" ? session.role.toLowerCase().trim() : "unknown";

  const ADMIN_ROLES = new Set(["superadmin", "platform_admin", "admin"]);
  const MANAGEMENT_ROLES = new Set(["manager", "organization_admin", "franchise_admin", "regional_admin"]);
  const EMPLOYEE_ROLES = new Set([
    "location_admin", "operator", "frontdesk_operator", "receptionist",
    "support_agent",
  ]);

  let actorClass: "customer" | "employee" | "vendor" | "management" | "unknown" = "unknown";
  if (ADMIN_ROLES.has(role) || MANAGEMENT_ROLES.has(role)) {
    actorClass = "management";
  } else if (EMPLOYEE_ROLES.has(role)) {
    actorClass = "employee";
  } else if (role === "unknown" || role === "") {
    actorClass = "customer";
  }

  return {
    actorClass,
    actorConfidence: session?.adminUserId ? 0.9 : 0.3,
    lifecycleStage: "unknown",
    lifecycleConfidence: 0,
    domainJourneyKey: "unknown",
    domainConfidence: 0,
    sessionRef: session?.adminUserId?.slice(0, 8),
  };
}

/**
 * Evaluate a server-side policy decision.
 */
function evaluateServerPolicy(
  policyGate: string,
  req: Request,
): PolicyDecision {
  const decisionId = randomUUID();
  const intentContext = extractIntentContext(req);
  const siteConfigId = (req.params?.siteConfigId ?? req.body?.siteConfigId ?? undefined) as string | undefined;

  const gateEntry = getGateEntry(policyGate);

  if (!gateEntry) {
    return denyDecision({
      decisionId,
      policyGate,
      reasonCodes: ["gate_not_registered"],
      rationale: `Gate "${policyGate}" is not in policy-gates.yaml`,
      siteConfigId,
      intentContext,
      enforcement: {
        fallbackMessage: `Unknown policy gate: ${policyGate}`,
      },
    });
  }

  const isAnonymousAllowed = gateEntry.anonymousAllowed;
  const hasAuth = Boolean((req as any).session?.adminUserId);

  if (!isAnonymousAllowed && !hasAuth) {
    return denyDecision({
      decisionId,
      policyGate,
      reasonCodes: ["identity_not_verified"],
      rationale: `Gate "${policyGate}" requires authentication`,
      siteConfigId,
      intentContext,
      enforcement: {
        fallbackMessage: "Authentication required",
      },
    });
  }

  return allowDecision({
    decisionId,
    policyGate,
    siteConfigId,
    intentContext,
  });
}

/**
 * Express middleware factory — gates a route through PolicyDecision.
 *
 * Usage:
 *   router.post('/thing', requireAuth, requirePolicy('thing.write'), handler)
 *
 * On allow: attaches decision to req.policyDecision, calls next()
 * On deny: returns 403 with structured PolicyDecision
 * On escalate: returns 403 with escalation target
 * On degrade: attaches degraded decision, calls next()
 */
export function requirePolicy(policyGate: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const decision = evaluateServerPolicy(policyGate, req);
    req.policyDecision = decision;

    switch (decision.verdict) {
      case "allow":
      case "degrade":
        next();
        return;

      case "deny":
        res.status(403).json({
          error: decision.enforcement.fallbackMessage ?? "Policy denied",
          policyGate: decision.policyGate,
          verdict: decision.verdict,
          reasonCodes: decision.reasonCodes,
          decisionId: decision.decisionId,
        });
        return;

      case "escalate":
        res.status(403).json({
          error: decision.rationale ?? "Escalation required",
          policyGate: decision.policyGate,
          verdict: decision.verdict,
          reasonCodes: decision.reasonCodes,
          escalationTarget: decision.enforcement.escalationTarget,
          decisionId: decision.decisionId,
        });
        return;
    }
  };
}

/**
 * Inline policy evaluation for routes that can't use middleware
 * (e.g., WebSocket handlers, legacy routes being migrated).
 *
 * Returns the decision — caller checks verdict.
 */
export function evaluateRoutePolicy(policyGate: string, req: Request): PolicyDecision {
  return evaluateServerPolicy(policyGate, req);
}

/**
 * Audit helper — format a policy decision for server logs.
 */
export function logPolicyDecision(decision: PolicyDecision): void {
  const line = formatPolicyDecisionSummary(decision);
  if (decision.verdict === "deny" || decision.verdict === "escalate") {
    console.warn(`[PolicyGate] ${line}`);
  }
}
