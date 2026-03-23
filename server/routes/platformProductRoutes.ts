/**
 * Platform Product Routes
 *
 * Per-site product/service catalog with Stripe sync.
 * Supports 'product', 'service', 'subscription' types.
 * Each product can be linked to a specific agent (the agent that sells/fulfills it).
 *
 * Mount: app.use('/api/platform-products', platformProductRoutes)
 */
import { Router, Request, Response } from "express";
import { db } from "../db";
import { platformProducts, siteConfigs } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import multer from "multer";
import { requireAuth } from "../auth";
import sharp from "sharp";
import FormData from "form-data";
import fetch from "node-fetch";
import * as fs from "fs";
import * as path from "path";

const router = Router();

// Multer: memory storage, 10MB limit, images only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

/** Upload an image buffer to Stripe and set it on the product. Returns the public URL. */
async function uploadImageToStripe(
  stripe: any,
  stripeProductId: string,
  imageBuffer: Buffer,
  filename: string
): Promise<string | null> {
  try {
    const form = new FormData();
    form.append("purpose", "product_image");
    form.append("file", imageBuffer, {
      filename,
      contentType: "image/webp",
    });

    const stripeKey = process.env.STRIPE_SECRET_KEY!;
    const uploadRes = await fetch("https://files.stripe.com/v1/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        ...form.getHeaders(),
      },
      body: form,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      console.warn("[platformProducts] Stripe file upload failed:", err);
      return null;
    }

    const fileObj = (await uploadRes.json()) as { url?: string; id?: string };
    const fileUrl = fileObj.url ?? null;

    if (fileUrl) {
      await stripe.products.update(stripeProductId, { images: [fileUrl] });
    }
    return fileUrl;
  } catch (err: any) {
    console.warn("[platformProducts] uploadImageToStripe error:", err.message);
    return null;
  }
}

/** Save image buffer to /uploads/products/ and return the public path. */
async function saveProductImage(id: string, buffer: Buffer): Promise<string> {
  const uploadDir = path.join(process.cwd(), "server", "uploads", "products");
  fs.mkdirSync(uploadDir, { recursive: true });
  const filename = `${id}.webp`;
  fs.writeFileSync(path.join(uploadDir, filename), buffer);
  return `/uploads/products/${filename}`;
}

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
router.post("/", requireAuth, async (req, res) => {
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
        const { getStripeClient } = await import("../stripeClient");
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
router.patch("/:id", requireAuth, async (req, res) => {
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
        const { getStripeClient } = await import("../stripeClient");
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
router.delete("/:id", requireAuth, async (req, res) => {
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
        const { getStripeClient } = await import("../stripeClient");
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

// ── POST /api/platform-products/:id/image — upload product image ──────────
router.post("/:id/image", requireAuth, upload.single("image"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: "No image file provided" });

    const [existing] = await db
      .select()
      .from(platformProducts)
      .where(eq(platformProducts.id, id))
      .limit(1);
    if (!existing) return res.status(404).json({ error: "Product not found" });

    // Optimize: resize to 800×800 WebP, strip metadata
    const optimized = await sharp(req.file.buffer)
      .resize(800, 800, { fit: "cover", position: "centre" })
      .webp({ quality: 85 })
      .toBuffer();

    // Save locally for serving
    const localPath = await saveProductImage(id, optimized);

    // Upload to Stripe if product has a Stripe ID
    let stripeImageUrl: string | null = null;
    if (existing.stripeProductId) {
      const { getStripeClient } = await import("../stripeClient");
      const stripe = getStripeClient();
      stripeImageUrl = await uploadImageToStripe(
        stripe,
        existing.stripeProductId,
        optimized,
        `${id}.webp`
      );
    }

    // Update DB with image path
    const [updated] = await db
      .update(platformProducts)
      .set({ imageUrl: localPath, updatedAt: new Date() } as any)
      .where(eq(platformProducts.id, id))
      .returning();

    res.json({
      success: true,
      imageUrl: localPath,
      stripeImageUrl,
      product: updated,
    });
  } catch (err: any) {
    console.error("[platformProducts] Image upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/platform-products/:id/generate-image — AI-generate image ────
router.post("/:id/generate-image", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { prompt: customPrompt } = req.body as { prompt?: string };

    const [existing] = await db
      .select()
      .from(platformProducts)
      .where(eq(platformProducts.id, id))
      .limit(1);
    if (!existing) return res.status(404).json({ error: "Product not found" });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not configured" });

    // Build a brand-consistent prompt using Gateway Global AI style guide
    const brandPrompt = customPrompt ?? `
Professional product icon for "${existing.name}".
Style: Bold dark navy background (#0F172A), bright Kelly green (#22C55E) as the accent color.
Include a strong silhouette icon representing: ${existing.description ?? existing.name}.
White text label at the bottom in a dark navy banner.
Clean, high-contrast, icon-style composition. Square format. No gradients.
Match the visual style of Gateway Global AI brand: dark background, green accent, professional icon figure.
    `.trim();

    // Call Imagen via Gemini API
    const imagenRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt: brandPrompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "1:1",
            outputMimeType: "image/png",
          },
        }),
      }
    );

    if (!imagenRes.ok) {
      const errText = await imagenRes.text();
      console.error("[platformProducts] Imagen API error:", errText);
      return res.status(502).json({ error: "Image generation failed", detail: errText });
    }

    const imagenData = (await imagenRes.json()) as {
      predictions?: Array<{ bytesBase64Encoded?: string }>;
    };

    const b64 = imagenData.predictions?.[0]?.bytesBase64Encoded;
    if (!b64) return res.status(502).json({ error: "No image returned from Imagen" });

    const imgBuffer = Buffer.from(b64, "base64");

    // Optimize and save
    const optimized = await sharp(imgBuffer)
      .resize(800, 800, { fit: "cover" })
      .webp({ quality: 85 })
      .toBuffer();

    const localPath = await saveProductImage(id, optimized);

    // Upload to Stripe
    let stripeImageUrl: string | null = null;
    if (existing.stripeProductId) {
      const { getStripeClient } = await import("../stripeClient");
      const stripe = getStripeClient();
      stripeImageUrl = await uploadImageToStripe(stripe, existing.stripeProductId, optimized, `${id}.webp`);
    }

    // Update DB
    const [updated] = await db
      .update(platformProducts)
      .set({ imageUrl: localPath, updatedAt: new Date() } as any)
      .where(eq(platformProducts.id, id))
      .returning();

    res.json({
      success: true,
      imageUrl: localPath,
      stripeImageUrl,
      generatedWithPrompt: brandPrompt,
      product: updated,
    });
  } catch (err: any) {
    console.error("[platformProducts] Image generation error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
