/**
 * Operator integration connect — token exchange → HttpOnly session; Cloudbeds surface + hotel details (sanitized).
 * @see docs-governance/canonical/INTEGRATION_OPERATOR_CONNECT_FLOW_V1.md
 */
import { Router, type NextFunction, type Request, type Response } from "express";
import {
  cloudbedsGetJson,
  effectivePropertyId,
  loadCloudbedsPmsRow,
} from "../services/cloudbedsApi";
import {
  createIntegrationConnectSessionPayload,
  getCookieFromRequest,
  INTEGRATION_CONNECT_SESSION_COOKIE,
  setIntegrationConnectSessionCookie,
  verifyIntegrationConnectSession,
  type IntegrationConnectSessionPayload,
} from "../services/integrationConnectSession";
import {
  markIntegrationConnectTokenUsed,
  validateIntegrationConnectToken,
} from "../services/integrationConnectTokens";
import { beginCloudbedsIntegrationAuthHandoff } from "../services/beginCloudbedsIntegrationAuthHandoff";

const router = Router();

/** POST /api/integration/connect/mint — guarded; see INTEGRATION_OPERATOR_CONNECT_FLOW_V1.md */
function requireIntegrationConnectMintAuth(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.INTEGRATION_CONNECT_MINT_SECRET?.trim();
  if (!secret) {
    res.status(503).json({
      ok: false,
      error: "mint_not_configured",
      message:
        "Set INTEGRATION_CONNECT_MINT_SECRET to enable POST /api/integration/connect/mint (operator handoff URL generation).",
    });
    return;
  }
  const headerMint =
    typeof req.headers["x-integration-connect-mint"] === "string"
      ? req.headers["x-integration-connect-mint"].trim()
      : "";
  const auth = typeof req.headers.authorization === "string" ? req.headers.authorization.trim() : "";
  const bearer = auth.replace(/^Bearer\s+/i, "").trim();
  const presented = headerMint || bearer;
  if (!presented || presented !== secret) {
    res.status(401).json({ ok: false, error: "unauthorized" });
    return;
  }
  next();
}

/** Canonical OS identifiers — must match LOGICAL_ROUTE_REGISTRY + VIEW_REGISTRY. */
export const INTEGRATION_CONNECT_LOGICAL_ROUTE_ID = "operator.integration.connect";
export const INTEGRATION_CONNECT_VIEW_ID = "integration_connect_surface";

type ReqWithConnect = Request & { integrationConnectSession?: IntegrationConnectSessionPayload };

function requireIntegrationConnectSession(req: Request, res: Response, next: NextFunction): void {
  const raw = getCookieFromRequest(req, INTEGRATION_CONNECT_SESSION_COOKIE);
  const sess = verifyIntegrationConnectSession(raw);
  if (!sess) {
    res.status(401).json({ error: "integration_connect_session_required" });
    return;
  }
  (req as ReqWithConnect).integrationConnectSession = sess;
  next();
}

function requireCloudbedsConnectSession(req: Request, res: Response, next: NextFunction): void {
  requireIntegrationConnectSession(req, res, () => {
    const s = (req as ReqWithConnect).integrationConnectSession;
    if (!s || s.vendorId !== "cloudbeds") {
      res.status(403).json({ error: "integration_connect_vendor_mismatch" });
      return;
    }
    next();
  });
}

/**
 * POST /api/integration/connect/mint
 * Body: { siteConfigId, connectLane?, phoneE164?, createdBy?, allowWhenAlreadyReady?, eligibilityMode? }
 * Auth: X-Integration-Connect-Mint: <INTEGRATION_CONNECT_MINT_SECRET> or Authorization: Bearer <same>
 * Response: { ok, connectUrl, expiresAt, tokenId, ... } — no plainToken in JSON.
 */
router.post("/mint", requireIntegrationConnectMintAuth, async (req: Request, res: Response) => {
  try {
    const siteConfigId = typeof req.body?.siteConfigId === "string" ? req.body.siteConfigId : "";
    const connectLane = req.body?.connectLane === "api_key" ? "api_key" : "oauth";
    const phoneE164 =
      typeof req.body?.phoneE164 === "string" && req.body.phoneE164.trim()
        ? req.body.phoneE164.trim()
        : null;
    const createdBy =
      typeof req.body?.createdBy === "string" && req.body.createdBy.trim()
        ? req.body.createdBy.trim()
        : "api:integration/connect/mint";
    const allowWhenAlreadyReady = req.body?.allowWhenAlreadyReady === true;
    const eligibilityMode =
      req.body?.eligibilityMode === "cloudbeds_row_only" ? "cloudbeds_row_only" : "graphql_discovery_onboarding";

    const result = await beginCloudbedsIntegrationAuthHandoff({
      siteConfigId,
      connectLane,
      phoneE164,
      createdBy,
      allowWhenAlreadyReady,
      eligibilityMode,
    });

    if (!result.ok) {
      const code = result.code;
      const status =
        code === "ALREADY_READY"
          ? 409
          : code === "INVALID_INPUT" || code === "APP_URL_NOT_CONFIGURED"
            ? 400
            : code === "NO_CLOUDBEDS_ROW"
              ? 404
              : code === "CONNECT_TOKEN_SECRET_MISSING"
                ? 503
                : 400;
      return res.status(status).json({ ok: false, code: result.code, message: result.message });
    }

    const { plainToken: _omit, ...safe } = result;
    void _omit;
    return res.json({
      ok: true,
      siteConfigId: safe.siteConfigId,
      vendorId: safe.vendorId,
      connectLane: safe.connectLane,
      tokenId: safe.tokenId,
      expiresAt: safe.expiresAt.toISOString(),
      connectUrl: safe.connectUrl,
      exchangePostUrl: safe.exchangePostUrl,
      logicalRouteId: safe.logicalRouteId,
      viewId: safe.viewId,
      browserAdapterPath: safe.browserAdapterPath,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "mint_failed";
    console.error("[integration/connect] mint:", e);
    return res.status(500).json({ ok: false, error: "mint_failed", message: msg });
  }
});

/**
 * GET /api/integration/connect/governance-context
 * Canonical entry metadata for this connect lane. No session required.
 * The browser adapter (`/connect/cloudbeds`) must load this first — clients must not invent route/view identity.
 * @see docs-governance/canonical/LOGICAL_ROUTE_REGISTRY.md — operator.integration.connect
 * @see docs-governance/canonical/VIEW_REGISTRY.md — integration_connect_surface
 */
router.get("/governance-context", (req: Request, res: Response) => {
  const raw = getCookieFromRequest(req, INTEGRATION_CONNECT_SESSION_COOKIE);
  const sess = verifyIntegrationConnectSession(raw);
  res.json({
    logicalRouteId: INTEGRATION_CONNECT_LOGICAL_ROUTE_ID,
    viewId: INTEGRATION_CONNECT_VIEW_ID,
    specId: "integration_operator_connect_flow",
    specVersion: "1.0.0",
    browserAdapterPath: "/connect/cloudbeds",
    vendorId: "cloudbeds",
    session: sess
      ? {
          siteConfigId: sess.siteConfigId,
          vendorId: sess.vendorId,
          expiresAtEpochMs: sess.exp,
        }
      : null,
  });
});

function pickStrings(obj: Record<string, unknown>, keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.length) out[k] = v;
  }
  return out;
}

/** Operator-safe projection — no raw vendor blobs beyond allowlisted fields. */
function sanitizeCloudbedsHotelDetails(json: unknown): Record<string, unknown> {
  if (!json || typeof json !== "object") return {};
  const root = json as Record<string, unknown>;
  const data = root.data;
  const base: Record<string, unknown> = { success: root.success === true };
  if (!data || typeof data !== "object") return base;
  const d = data as Record<string, unknown>;
  const addr =
    d.propertyAddress && typeof d.propertyAddress === "object"
      ? pickStrings(d.propertyAddress as Record<string, unknown>, [
          "propertyAddress1",
          "propertyCity",
          "propertyState",
          "propertyZip",
          "propertyCountry",
        ])
      : undefined;
  let currency: Record<string, string> | undefined;
  if (d.propertyCurrency && typeof d.propertyCurrency === "object") {
    currency = pickStrings(d.propertyCurrency as Record<string, unknown>, [
      "currencyCode",
      "currencySymbol",
    ]);
  }
  const images = Array.isArray(d.propertyImage)
    ? (d.propertyImage as unknown[])
        .slice(0, 8)
        .map((x) =>
          x && typeof x === "object"
            ? pickStrings(x as Record<string, unknown>, ["thumb", "image"])
            : undefined,
        )
        .filter(Boolean)
    : undefined;

  return {
    ...base,
    propertyID: typeof d.propertyID === "string" ? d.propertyID : undefined,
    organizationID: typeof d.organizationID === "string" ? d.organizationID : undefined,
    propertyName: typeof d.propertyName === "string" ? d.propertyName : undefined,
    propertyType: typeof d.propertyType === "string" ? d.propertyType : undefined,
    propertyDescription:
      typeof d.propertyDescription === "string" ? d.propertyDescription.slice(0, 4000) : undefined,
    propertyPhone: typeof d.propertyPhone === "string" ? d.propertyPhone : undefined,
    propertyEmail: typeof d.propertyEmail === "string" ? d.propertyEmail : undefined,
    propertyPrimaryLanguage:
      typeof d.propertyPrimaryLanguage === "string" ? d.propertyPrimaryLanguage : undefined,
    propertyCurrency: currency && Object.keys(currency).length ? currency : undefined,
    propertyAddress: addr && Object.keys(addr).length ? addr : undefined,
    propertyImage: images?.length ? images : undefined,
  };
}

/**
 * POST /api/integration/connect/exchange
 * Body: { token } — validates single-use token, sets connect session cookie, marks token used.
 */
router.post("/exchange", async (req: Request, res: Response) => {
  try {
    const token = typeof req.body?.token === "string" ? req.body.token : "";
    const v = await validateIntegrationConnectToken(token, { expectVendorId: "cloudbeds" });
    if (v.status !== "valid") {
      return res.status(400).json({ ok: false, validation: v });
    }
    const { record } = v;
    const payload = createIntegrationConnectSessionPayload(record.siteConfigId, record.vendorId);
    setIntegrationConnectSessionCookie(res, payload);
    await markIntegrationConnectTokenUsed(record.id);
    return res.json({
      ok: true,
      siteConfigId: record.siteConfigId,
      vendorId: record.vendorId,
      connectLane: record.connectLane,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "exchange_failed";
    if (msg.includes("INTEGRATION_CONNECT")) {
      return res.status(503).json({ ok: false, error: "connect_not_configured", message: msg });
    }
    console.error("[integration/connect] exchange:", e);
    return res.status(500).json({ ok: false, error: "exchange_failed" });
  }
});

/**
 * GET /api/integration/connect/cloudbeds/surface
 * Session — operator truth for OAuth wiring (no secrets).
 */
router.get("/cloudbeds/surface", requireCloudbedsConnectSession, async (req: Request, res: Response) => {
  try {
    const s = (req as ReqWithConnect).integrationConnectSession!;
    const pms = await loadCloudbedsPmsRow(s.siteConfigId);
    return res.json({
      siteConfigId: s.siteConfigId,
      vendorId: "cloudbeds",
      oauthStartPath: `/api/cloudbeds/oauth/start?siteConfigId=${encodeURIComponent(s.siteConfigId)}`,
      callbackUrl: process.env.CLOUDBEDS_CLIENT_CALLBACK_URL?.trim() || null,
      clientIdConfigured: !!process.env.CLOUDBEDS_CLIENT_ID?.trim(),
      pms: pms
        ? {
            installPosture: pms.installPosture,
            authLane: pms.authLane,
            propertyId: effectivePropertyId(pms) ?? null,
            hasCredentials: !!(pms.accessToken?.trim() || pms.apiKey?.trim()),
          }
        : null,
    });
  } catch (e: unknown) {
    console.error("[integration/connect] surface:", e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "surface_failed" });
  }
});

/**
 * GET /api/integration/connect/cloudbeds/hotel-details
 * Session + resolvePmsAuthHeaders (no capability broker) — Tier-3 style proof.
 */
router.get("/cloudbeds/hotel-details", requireCloudbedsConnectSession, async (req: Request, res: Response) => {
  try {
    const s = (req as ReqWithConnect).integrationConnectSession!;
    const pms = await loadCloudbedsPmsRow(s.siteConfigId);
    if (!pms) {
      return res.status(404).json({ error: "no_cloudbeds_integration" });
    }
    const prop = effectivePropertyId(pms);
    if (!prop) {
      return res.status(422).json({
        error: "property_id_required",
        message: "Set property_id on site_pms_integrations or CLOUDBEDS_CLIENT_PROPERTY_ID for this site.",
      });
    }
    const result = await cloudbedsGetJson(pms, "getHotelDetails", { propertyID: prop });
    if (!result.ok) {
      return res.status(result.status >= 400 && result.status < 600 ? result.status : 502).json({
        ok: false,
        cloudbedsStatus: result.status,
        hotel: sanitizeCloudbedsHotelDetails(result.json),
      });
    }
    return res.json({ ok: true, hotel: sanitizeCloudbedsHotelDetails(result.json) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "hotel_details_failed";
    console.error("[integration/connect] hotel-details:", e);
    return res.status(500).json({ ok: false, error: msg });
  }
});

export default router;
