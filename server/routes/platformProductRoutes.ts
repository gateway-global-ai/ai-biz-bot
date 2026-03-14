/**
 * Platform Product Routes
 *
 * Per-site product/service catalog with Stripe sync.
 * Supports 'product', 'service', 'subscription' types.
 * Each product can be linked to a specific agent (the agent that sells/fulfills it).
 *
 * Mount: app.use('/api/platform-products', platformProductRoutes)
 */
import { Router } from "express";
import { db } from "../db";
import { platformProducts, siteConfigs } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

// ── GET /api/platform-products?siteConfigId=:id ───────────────────────────
router.get("/", async (req, res) => {
  try {
    const { siteConfigId } = req.query as { siteConfigId?: string };
    if (!siteConfigId) {
      return res.status(400).json({ error: "siteConfigId query parameter required" });
    }
    const products = await db
      .select()
      .from(platformProducts)
      .where(eq(platformProducts.siteConfigId, siteConfigId))
      .orderBy(platformProducts.createdAt);
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/platform-products ───────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const {
      siteConfigId,
      agentId,
      name,
      description,
      type = "service",
      priceCents = 0,
      billingInterval,
      syncStripe = false,
    } = req.body as {
      siteConfigId: string;
      agentId?: string | null;
      name: string;
      description?: string;
      type?: string;
      priceCents?: number;
      billingInterval?: string | null;
      syncStripe?: boolean;
    };

    if (!siteConfigId || !name) {
      return res.status(400).json({ error: "siteConfigId and name required" });
    }

    let stripeProductId: string | undefined;
    let stripePriceId: string | undefined;

    if (syncStripe) {
      try {
        const { getStripeClient } = await import("./stripeClient");
        const stripe = getStripeClient();

        const stripeProduct = await stripe.products.create({
          name,
          description: description || undefined,
          metadata: { siteConfigId, type },
        });
        stripeProductId = stripeProduct.id;

        if (priceCents > 0) {
          const stripePrice = await stripe.prices.create({
            product: stripeProduct.id,
            unit_amount: priceCents,
            currency: "usd",
            ...(type === "subscription" && billingInterval
              ? { recurring: { interval: billingInterval as "month" | "year" } }
              : {}),
          });
          stripePriceId = stripePrice.id;
        }
      } catch (stripeErr: any) {
        console.warn("[platformProducts] Stripe sync failed:", stripeErr.message);
        // Continue without Stripe — user can sync later
      }
    }

    const [product] = await db
      .insert(platformProducts)
      .values({
        siteConfigId,
        agentId: agentId || null,
        name,
        description: description || null,
        type,
        priceCents,
        billingInterval: billingInterval || null,
        stripeProductId: stripeProductId || null,
        stripePriceId: stripePriceId || null,
      })
      .returning();

    res.status(201).json(product);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/platform-products/:id ─────────────────────────────────────
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      type,
      priceCents,
      billingInterval,
      agentId,
      isActive,
      syncStripe = false,
    } = req.body as {
      name?: string;
      description?: string;
      type?: string;
      priceCents?: number;
      billingInterval?: string | null;
      agentId?: string | null;
      isActive?: boolean;
      syncStripe?: boolean;
    };

    const [existing] = await db
      .select()
      .from(platformProducts)
      .where(eq(platformProducts.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Product not found" });
    }

    let stripeProductId = existing.stripeProductId;
    let stripePriceId = existing.stripePriceId;

    if (syncStripe) {
      try {
        const { getStripeClient } = await import("./stripeClient");
        const stripe = getStripeClient();

        const effectiveName = name ?? existing.name;
        const effectiveDesc = description ?? existing.description;
        const effectivePrice = priceCents ?? existing.priceCents;
        const effectiveInterval = billingInterval ?? existing.billingInterval;
        const effectiveType = type ?? existing.type;

        if (stripeProductId) {
          // Update existing Stripe product
          await stripe.products.update(stripeProductId, {
            name: effectiveName,
            description: effectiveDesc || undefined,
          });
        } else {
          // Create new Stripe product
          const stripeProduct = await stripe.products.create({
            name: effectiveName,
            description: effectiveDesc || undefined,
            metadata: { siteConfigId: existing.siteConfigId, type: effectiveType },
          });
          stripeProductId = stripeProduct.id;
        }

        // Always create a new price if price changed (Stripe prices are immutable)
        if (effectivePrice > 0 && (!stripePriceId || priceCents !== undefined || billingInterval !== undefined)) {
          const newPrice = await stripe.prices.create({
            product: stripeProductId!,
            unit_amount: effectivePrice,
            currency: "usd",
            ...(effectiveType === "subscription" && effectiveInterval
              ? { recurring: { interval: effectiveInterval as "month" | "year" } }
              : {}),
          });
          stripePriceId = newPrice.id;
        }
      } catch (stripeErr: any) {
        console.warn("[platformProducts] Stripe sync failed on patch:", stripeErr.message);
      }
    }

    const updates: Partial<typeof existing> = {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(type !== undefined && { type }),
      ...(priceCents !== undefined && { priceCents }),
      ...(billingInterval !== undefined && { billingInterval }),
      ...(agentId !== undefined && { agentId }),
      ...(isActive !== undefined && { isActive }),
      ...(stripeProductId !== existing.stripeProductId && { stripeProductId }),
      ...(stripePriceId !== existing.stripePriceId && { stripePriceId }),
      updatedAt: new Date(),
    } as any;

    const [updated] = await db
      .update(platformProducts)
      .set(updates)
      .where(eq(platformProducts.id, id))
      .returning();

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/platform-products/:id ─────────────────────────────────────
// Soft-delete (isActive=false) + archive in Stripe
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await db
      .select()
      .from(platformProducts)
      .where(eq(platformProducts.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Archive in Stripe (products can't be deleted if they have prices)
    if (existing.stripeProductId) {
      try {
        const { getStripeClient } = await import("./stripeClient");
        const stripe = getStripeClient();
        await stripe.products.update(existing.stripeProductId, { active: false });
      } catch (stripeErr: any) {
        console.warn("[platformProducts] Stripe archive failed:", stripeErr.message);
      }
    }

    await db
      .update(platformProducts)
      .set({ isActive: false, updatedAt: new Date() } as any)
      .where(eq(platformProducts.id, id));

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
