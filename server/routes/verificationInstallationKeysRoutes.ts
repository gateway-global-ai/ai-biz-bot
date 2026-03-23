/**
 * Owner-authenticated CRUD for installation API keys.
 * GET|POST /api/site-configs/:id/verification-installation-keys
 * DELETE /api/site-configs/:id/verification-installation-keys/:keyId
 */

import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth";
import { assertSiteScopedAccess } from "../utils/siteScopedAccess";
import {
  createInstallationApiKey,
  listInstallationApiKeys,
  revokeInstallationApiKey,
} from "../services/verificationInstallationApiKeys";

const router = Router();

const nameSchema = z.object({
  name: z.string().max(120).optional(),
});

router.get("/:id/verification-installation-keys", requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    if (!id || id === "undefined") {
      return res.status(400).json({ error: "A valid site configuration ID is required." });
    }
    const access = await assertSiteScopedAccess({
      req,
      siteConfigId: id,
      requiredPolicy: "verification.policy.read",
    });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const keys = await listInstallationApiKeys(id);
    return res.json({ keys });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return res.status(500).json({ error: msg });
  }
});

router.post("/:id/verification-installation-keys", requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    if (!id || id === "undefined") {
      return res.status(400).json({ error: "A valid site configuration ID is required." });
    }
    const access = await assertSiteScopedAccess({
      req,
      siteConfigId: id,
      requiredPolicy: "verification.policy.write",
    });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const parsed = nameSchema.safeParse(req.body ?? {});
    const name = parsed.success ? parsed.data.name ?? "Installation" : "Installation";

    const created = await createInstallationApiKey({ siteConfigId: id, name });
    return res.status(201).json(created);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return res.status(500).json({ error: msg });
  }
});

router.delete("/:id/verification-installation-keys/:keyId", requireAuth, async (req: any, res) => {
  try {
    const { id, keyId } = req.params;
    if (!id || id === "undefined" || !keyId) {
      return res.status(400).json({ error: "site id and key id are required." });
    }
    const access = await assertSiteScopedAccess({
      req,
      siteConfigId: id,
      requiredPolicy: "verification.policy.write",
    });
    if (!access.ok) return res.status(access.status).json({ error: access.error });

    const ok = await revokeInstallationApiKey({ siteConfigId: id, keyId });
    if (!ok) return res.status(404).json({ error: "Key not found." });
    return res.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return res.status(500).json({ error: msg });
  }
});

export default router;
