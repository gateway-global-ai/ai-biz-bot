/**
 * bailRescueRoutes.ts
 * Public-facing API routes for the Bail Rescue flow.
 *
 * GET  /api/bail-rescue/:token   — Returns rescue session data for the outside payer's UI.
 * POST /api/bail-rescue/:token/checkout — Creates a Stripe Checkout session for the premium payment.
 */
import { Router } from "express";
import { getBailRescueSession, updateBailRescueSession } from "../services/bailRescueStore";
import { STRIPE_PRICE_IDS } from "../stripeClient";
import Stripe from "stripe";

const router = Router();

// ── GET /api/bail-rescue/:token ───────────────────────────────────────────────
router.get("/api/bail-rescue/:token", (req, res) => {
  const session = getBailRescueSession(req.params.token);
  if (!session) {
    return res.status(404).json({ error: "This rescue link has expired or is invalid." });
  }

  // Never expose internal IDs to the public
  const { siteConfigId: _sc, checkoutSessionId: _cs, ...safe } = session;
  return res.json({ success: true, session: safe });
});

// ── POST /api/bail-rescue/:token/checkout ─────────────────────────────────────
router.post("/api/bail-rescue/:token/checkout", async (req, res) => {
  const session = getBailRescueSession(req.params.token);
  if (!session) {
    return res.status(404).json({ error: "Rescue link expired or invalid." });
  }
  if (session.paymentStatus === "paid") {
    return res.status(409).json({ error: "Bond premium already paid." });
  }
  if (session.stripeCheckoutUrl) {
    // Return existing checkout URL if already created
    return res.json({ url: session.stripeCheckoutUrl });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return res.status(503).json({ error: "Payment system is not configured." });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-11-17.clover" });

  const origin = req.headers.origin || `https://${req.headers.host}`;
  const successUrl = `${origin}/rescue/${session.token}?payment=success`;
  const cancelUrl  = `${origin}/rescue/${session.token}?payment=cancelled`;

  try {
    let checkoutParams: Stripe.Checkout.SessionCreateParams;

    const priceId = STRIPE_PRICE_IDS.claim_activation; // reuse claim_activation or a dedicated bail price

    if (session.premiumCents && session.premiumCents > 0) {
      checkoutParams = {
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        phone_number_collection: { enabled: false },
        line_items: priceId
          ? [{ price: priceId, quantity: 1 }]
          : [{
              price_data: {
                currency: "usd",
                unit_amount: session.premiumCents,
                product_data: {
                  name: `Bail Bond Premium — ${session.inmateFirstName} ${session.inmateLastName}`,
                  description: `${session.facilityName} | Louisiana law 12% non-refundable premium`,
                },
              },
              quantity: 1,
            }],
        metadata: {
          rescueToken:    session.token,
          inmateName:     `${session.inmateFirstName} ${session.inmateLastName}`,
          facilityName:   session.facilityName,
          siteConfigId:   session.siteConfigId ?? "",
          bondAmount:     String(session.bondAmount ?? 0),
        },
      };
    } else {
      // Bond amount unknown — create a $0 intent as a contact capture; agent calls to confirm
      checkoutParams = {
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        line_items: [{
          price_data: {
            currency: "usd",
            unit_amount: 0,
            product_data: {
              name: `Bail Bond Intake — ${session.inmateFirstName} ${session.inmateLastName}`,
              description: "An agent will confirm the exact premium and process payment.",
            },
          },
          quantity: 1,
        }],
        metadata: {
          rescueToken:  session.token,
          inmateName:   `${session.inmateFirstName} ${session.inmateLastName}`,
          facilityName: session.facilityName,
          siteConfigId: session.siteConfigId ?? "",
        },
      };
    }

    const checkout = await stripe.checkout.sessions.create(checkoutParams);
    updateBailRescueSession(session.token, {
      stripeCheckoutUrl: checkout.url ?? null,
      checkoutSessionId: checkout.id,
    });

    return res.json({ url: checkout.url });

  } catch (err: any) {
    console.error("[BailRescue] Stripe checkout error:", err.message);
    return res.status(502).json({ error: "Payment session creation failed. Please call us directly." });
  }
});

export default router;
