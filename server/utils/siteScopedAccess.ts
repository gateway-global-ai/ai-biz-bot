import { storage } from "../storage";

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
  | "qr.firewall.write";

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
};

function normalizeRole(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.toLowerCase().trim();
}

function canRoleSatisfyPolicy(role: string, policy: SitePolicyKey): boolean {
  if (GLOBAL_ROLES.has(role) || SUPPORT_ROLES.has(role)) return true;
  return POLICY_ROLE_ALLOWLIST[policy].includes(role);
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
