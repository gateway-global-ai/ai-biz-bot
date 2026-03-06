/**
 * Affiliate / Reseller program: sign up with phone to receive a registration link,
 * or register + pay $99 for Affiliate Starter Kit via Stripe Checkout.
 * Feeds into the existing reseller program (Stripe Connect, commissions).
 */
import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";

const router = Router();

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits ? `+${digits}` : phone;
}

const signupSchema = z.object({
  phone: z.string().min(7).max(20),
});

const checkoutSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().min(7).max(20),
});

router.post("/signup", async (req, res) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Valid phone number is required" });
    }
    const phone = normalizePhone(parsed.data.phone);
    await storage.createAffiliateSignup({ phone, source: "landing" });
    return res.json({
      success: true,
      message: "Thanks! We'll send your registration link to this number shortly.",
    });
  } catch (e: any) {
    console.error("[Affiliate] signup error:", e?.message);
    return res.status(500).json({ error: e?.message ?? "Signup failed" });
  }
});

/** Create Stripe Checkout session for $99 Affiliate Starter Kit (programmatic product/price); register affiliate and return checkout URL */
router.post("/checkout", async (req, res) => {
  try {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Name, email, and phone are required" });
    }
    const { name, email, phone } = parsed.data;
    const normalizedPhone = normalizePhone(phone);

    const signup = await storage.createAffiliateSignup({
      phone: normalizedPhone,
      name,
      email,
      source: "checkout",
    });

    const { getStripeClient } = await import("../stripeClient");
    const stripe = getStripeClient();
    const baseUrl = process.env.APP_URL || "https://aibizbot-dev.gatewayglobal.ai";

    // Programmatic product/price creation (no pre-created Price ID or Doppler key required)
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: 9900, // $99.00
            product_data: {
              name: "Affiliate Starter Kit",
              description: "100 stickers, marketing literature, and a company polo. Kits usually arrive within 7 days.",
              metadata: { type: "AFFILIATE_STARTER_KIT" },
            },
          },
          quantity: 1,
        },
      ],
      customer_email: email,
      metadata: {
        type: "AFFILIATE_STARTER_KIT",
        affiliateSignupId: signup.id,
        phone: normalizedPhone,
      },
      success_url: `${baseUrl}/?affiliate=success`,
      cancel_url: `${baseUrl}/?affiliate=cancelled`,
    });

    return res.json({ url: session.url });
  } catch (e: any) {
    console.error("[Affiliate] checkout error:", e?.message);
    return res.status(500).json({ error: e?.message ?? "Checkout failed" });
  }
});

export default router;
