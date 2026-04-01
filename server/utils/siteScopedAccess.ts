import { storage } from "../storage";
import {
  getGateEntry,
  type PolicyGateEntry,
} from "../os-core-bridge/policyGateCatalogBridge";

/**
 * SitePolicyKey — converging with policy-gates.yaml.
 *
 * This type still exists for backward compatibility with existing callers.
 * The authoritative gate definitions now live in registry-yaml/policy-gates.yaml.
 * The POLICY_ROLE_ALLOWLIST below is a LEGACY bridge — new gates should ONLY
 * be added to policy-gates.yaml and use `allowed_actor_classes` there.
 *
 * Doctrine D10: Single authority — policy-gates.yaml is the canonical source.
 */
export type SitePolicyKey =
  | "frontdesk.assist.write"
  | "frontdesk.outcome.write"
  | "frontdesk.summary.read"
  | "frontdesk.session.read"
  | "frontdesk.transcript.read"
  | "intake.policy.read"
  | "intake.policy.write"
  | "intake.submit.write"
  | "intake.review.read"
  | "intake.review.write"
  | "verification.write"
  | "verification.policy.read"
  | "verification.policy.write"
  | "telephony.paid_activation.write"
  | "qr.routes.read"
  | "qr.routes.write"
  | "qr.firewall.write"
  | "secure.vault.write"
  | "design_studio.access"
  | "design_studio.publish";

export type AccessClass =
  | "global_admin"
  | "support"
  | "reseller_scoped"
  | "site_operator";

interface AssertSiteScopedAccessArgs {
  req: any;
  siteConfigId: string;
  requiredPolicy?: SitePolicyKey;
}

interface SiteScopedAccessContext {
  siteConfig: any;
  adminUser: any;
  adminUserId: string;
  actorRole: string;
  accessClass: AccessClass;
  siteConfigId: string;
}

type SiteScopedAccessResult =
  | { ok: true; context: SiteScopedAccessContext }
  | { ok: false; status: number; error: string };

const GLOBAL_ROLES = new Set([
  "superadmin",
  "platform_admin",
  "admin",
]);

const SUPPORT_ROLES = new Set(["support_agent"]);

const POLICY_ROLE_ALLOWLIST: Record<SitePolicyKey, string[]> = {
  "frontdesk.assist.write": [
    "organization_admin",
    "franchise_admin",
    "regional_admin",
    "location_admin",
    "manager",
  ],
  "frontdesk.outcome.write": [
    "organization_admin",
    "franchise_admin",
    "regional_admin",
    "location_admin",
  ],
  "frontdesk.summary.read": [
    "organization_admin",
    "franchise_admin",
    "regional_admin",
    "location_admin",
    "manager",
  ],
  "frontdesk.session.read": [
    "superadmin",
    "platform_admin",
    "admin",
    "support_agent",
    "organization_admin",
    "franchise_admin",
    "regional_admin",
    "location_admin",
    "manager",
    "operator",
    "frontdesk_operator",
    "receptionist",
  ],
  "frontdesk.transcript.read": [
    "superadmin",
    "platform_admin",
    "admin",
    "support_agent",
    "organization_admin",
    "franchise_admin",
    "regional_admin",
    "location_admin",
    "manager",
    "operator",
    "frontdesk_operator",
    "receptionist",
  ],
  "intake.policy.read": [
    "superadmin",
    "platform_admin",
    "admin",
    "support_agent",
    "organization_admin",
    "franchise_admin",
    "regional_admin",
    "location_admin",
    "manager",
  ],
  "intake.policy.write": [
    "superadmin",
    "platform_admin",
    "admin",
    "organization_admin",
    "franchise_admin",
    "regional_admin",
    "location_admin",
    "manager",
  ],
  "intake.submit.write": [
    "superadmin",
    "platform_admin",
    "admin",
    "support_agent",
    "organization_admin",
    "franchise_admin",
    "regional_admin",
    "location_admin",
    "manager",
    "operator",
    "frontdesk_operator",
    "receptionist",
  ],
  "intake.review.read": [
    "superadmin",
    "platform_admin",
    "admin",
    "support_agent",
    "organization_admin",
    "franchise_admin",
    "regional_admin",
    "location_admin",
    "manager",
    "operator",
    "frontdesk_operator",
    "receptionist",
  ],
  "intake.review.write": [
    "superadmin",
    "platform_admin",
    "admin",
    "organization_admin",
    "franchise_admin",
    "regional_admin",
    "location_admin",
    "manager",
    "receptionist",
  ],
  "verification.write": [
    "superadmin",
    "platform_admin",
    "admin",
    "support_agent",
    "organization_admin",
    "franchise_admin",
    "regional_admin",
    "location_admin",
    "manager",
    "operator",
    "frontdesk_operator",
    "receptionist",
  ],
  "verification.policy.read": [
    "superadmin",
    "platform_admin",
    "admin",
    "support_agent",
    "organization_admin",
    "franchise_admin",
    "regional_admin",
    "location_admin",
    "manager",
  ],
  "verification.policy.write": [
    "superadmin",
    "platform_admin",
    "admin",
    "organization_admin",
    "franchise_admin",
    "regional_admin",
    "location_admin",
    "manager",
  ],
  "telephony.paid_activation.write": [
    "superadmin",
    "platform_admin",
    "admin",
    "support_agent",
    "organization_admin",
    "franchise_admin",
    "regional_admin",
    "location_admin",
    "manager",
    "operator",
    "frontdesk_operator",
    "receptionist",
  ],
  "qr.routes.read": [
    "organization_admin",
    "franchise_admin",
    "regional_admin",
    "location_admin",
    "manager",
  ],
  "qr.routes.write": [
    "organization_admin",
    "franchise_admin",
    "regional_admin",
    "location_admin",
    "manager",
  ],
  "qr.firewall.write": [
    "organization_admin",
    "franchise_admin",
    "regional_admin",
    "location_admin",
  ],
  "secure.vault.write": [
    "superadmin",
    "platform_admin",
    "admin",
    "owner",
    "organization_admin",
    "franchise_admin",
    "regional_admin",
    "location_admin",
    "manager",
  ],
  "design_studio.access": [
    "superadmin",
    "platform_admin",
    "admin",
    "support_agent",
    "owner",
    "organization_admin",
    "franchise_admin",
    "regional_admin",
    "location_admin",
    "manager",
  ],
  "design_studio.publish": [
    "superadmin",
    "platform_admin",
    "admin",
    "owner",
    "organization_admin",
    "franchise_admin",
    "regional_admin",
    "location_admin",
    "manager",
  ],
};

function normalizeRole(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.toLowerCase().trim();
}

/**
 * Map a raw role string to the actor class used by policy-gates.yaml.
 */
function roleToActorClass(role: string): string {
  if (GLOBAL_ROLES.has(role)) return "management";
  if (SUPPORT_ROLES.has(role)) return "employee";
  const managementRoles = new Set([
    "organization_admin", "franchise_admin", "regional_admin",
    "manager", "owner",
  ]);
  if (managementRoles.has(role)) return "management";
  const employeeRoles = new Set([
    "location_admin", "operator", "frontdesk_operator", "receptionist",
  ]);
  if (employeeRoles.has(role)) return "employee";
  return "customer";
}

function canRoleSatisfyPolicy(role: string, policy: SitePolicyKey): boolean {
  // Vault writes: no blanket support_agent grant
  if (policy === "secure.vault.write" && SUPPORT_ROLES.has(role)) {
    return false;
  }
  if (GLOBAL_ROLES.has(role)) return true;

  // Try registry-driven check first (Doctrine D10: single authority)
  const gateEntry = getGateEntry(policy);
  if (gateEntry) {
    const actorClass = roleToActorClass(role);
    if (gateEntry.allowedActorClasses.length === 0) {
      return true;
    }
    if (gateEntry.allowedActorClasses.includes(actorClass)) {
      return true;
    }
    return false;
  }

  // Legacy fallback for gates not yet in policy-gates.yaml
  if (SUPPORT_ROLES.has(role)) return true;
  return POLICY_ROLE_ALLOWLIST[policy]?.includes(role) ?? false;
}

function classifyAccessClass(role: string, scoped: boolean): AccessClass {
  if (GLOBAL_ROLES.has(role)) return "global_admin";
  if (SUPPORT_ROLES.has(role)) return "support";
  if (scoped) return "reseller_scoped";
  return "site_operator";
}

export interface AdminSessionActor {
  adminUser: any;
  adminUserId: string;
  actorRole: string;
  accessClass: AccessClass;
}

export async function assertAdminSessionActor(req: any): Promise<
  | { ok: true; actor: AdminSessionActor }
  | { ok: false; status: number; error: string }
> {
  const session = req.session as { adminUserId?: string } | undefined;
  if (!session?.adminUserId) {
    return { ok: false, status: 401, error: "Authentication required" };
  }
  const adminUser = await storage.getAdminUserById(session.adminUserId);
  if (!adminUser) {
    return { ok: false, status: 401, error: "Admin user not found" };
  }
  const role = normalizeRole((adminUser as any).role);
  const accessClass = GLOBAL_ROLES.has(role)
    ? "global_admin"
    : SUPPORT_ROLES.has(role)
      ? "support"
      : "site_operator";
  return {
    ok: true,
    actor: {
      adminUser,
      adminUserId: String((adminUser as any).id),
      actorRole: role,
      accessClass,
    },
  };
}

/**
 * Binds the authenticated admin session to a site for orchestration and agent mutations.
 * Same tenancy rules as other site-scoped routes (global/support roles, or reseller match).
 * Call after `requireAuth` on routes that accept a `siteConfigId` body/param.
 */
export async function assertSiteAccessForSession(
  req: any,
  siteConfigId: string,
): Promise<SiteScopedAccessResult> {
  return assertSiteScopedAccess({ req, siteConfigId });
}

export async function assertSiteScopedAccess({
  req,
  siteConfigId,
  requiredPolicy,
}: AssertSiteScopedAccessArgs): Promise<SiteScopedAccessResult> {
  if (!siteConfigId || siteConfigId === "undefined") {
    return { ok: false, status: 400, error: "A valid site configuration ID is required." };
  }

  const session = req.session as { adminUserId?: string } | undefined;
  if (!session?.adminUserId) {
    return { ok: false, status: 401, error: "Authentication required" };
  }

  const [adminUser, siteConfig] = await Promise.all([
    storage.getAdminUserById(session.adminUserId),
    storage.getSiteConfigById(siteConfigId),
  ]);

  if (!adminUser) {
    return { ok: false, status: 401, error: "Admin user not found" };
  }
  if (!siteConfig) {
    return { ok: false, status: 404, error: "Site not found" };
  }

  const role = normalizeRole((adminUser as any).role);
  const userResellerId = (adminUser as any).resellerId ?? null;
  const siteResellerId = (siteConfig as any).resellerId ?? null;
  const inScopedTenant = Boolean(
    userResellerId &&
      siteResellerId &&
      String(userResellerId) === String(siteResellerId)
  );

  const hasGlobalAccess = GLOBAL_ROLES.has(role) || SUPPORT_ROLES.has(role);
  if (!hasGlobalAccess && !inScopedTenant) {
    return { ok: false, status: 403, error: "Site is outside your scoped access." };
  }

  if (requiredPolicy && !canRoleSatisfyPolicy(role, requiredPolicy)) {
    return { ok: false, status: 403, error: `Missing policy permission: ${requiredPolicy}` };
  }

  return {
    ok: true,
    context: {
      siteConfig,
      adminUser,
      adminUserId: String((adminUser as any).id),
      actorRole: role,
      accessClass: classifyAccessClass(role, inScopedTenant),
      siteConfigId,
    },
  };
}
