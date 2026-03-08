import { Router } from "express";
import { storage } from "../storage";
import { eq, desc, inArray, and, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../auth";
import {
  customerAccounts,
  siteConfigs,
  resellers,
  resellerCommissions,
  voiceUsageLogs,
  type CustomerAccount,
} from "@shared/schema";
import { db } from "../db";
import { getPricingConfig, getEffectiveRate } from "../utils/pricing";
// All Stripe calls use dynamic imports: await import('../stripeClient')

const router = Router();

// ── Reseller (Stripe Connect) ─────────────────────────────────────────────────

  // ============ Reseller (Stripe Connect) ============
  router.post("/api/reseller/onboard", requireAuth, async (req: any, res) => {
    try {
      const session = req.session as { adminUserId: string };
      const adminUser = await storage.getAdminUserById(session.adminUserId);
      if (!adminUser) return res.status(401).json({ error: "Admin user not found" });
      let resellerId = (adminUser as any).resellerId ?? null;
      let reseller = resellerId ? await storage.getResellerById(resellerId) : null;
      if (!reseller) {
        const created = await storage.createReseller({ name: adminUser.name ?? undefined, phone: adminUser.phone ?? undefined });
        reseller = created;
        resellerId = created.id;
        await storage.updateAdminUser(adminUser.id, { resellerId });
      }
      const { getStripeClient } = await import("./stripeClient");
      const stripe = getStripeClient();
      if (reseller.stripeConnectId) {
        const link = await stripe.accountLinks.create({
          account: reseller.stripeConnectId,
          refresh_url: `${process.env.APP_URL || "https://aibizbot.gatewayglobal.ai"}/reseller/payouts?refresh=1`,
          return_url: `${process.env.APP_URL || "https://aibizbot.gatewayglobal.ai"}/reseller/payouts?success=1`,
          type: "account_onboarding",
        });
        return res.json({ url: link.url });
      }
      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        email: (adminUser as any).email ?? undefined,
        capabilities: { transfers: { requested: true } },
      });
      await storage.updateReseller(reseller.id, { stripeConnectId: account.id });
      const link = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${process.env.APP_URL || "https://aibizbot.gatewayglobal.ai"}/reseller/payouts?refresh=1`,
        return_url: `${process.env.APP_URL || "https://aibizbot.gatewayglobal.ai"}/reseller/payouts?success=1`,
        type: "account_onboarding",
      });
      res.json({ url: link.url });
    } catch (e: any) {
      console.error("[Reseller] onboard error:", e?.message);
      res.status(500).json({ error: e?.message ?? "Onboarding failed" });
    }
  });

  router.get("/api/reseller/status", requireAuth, async (req: any, res) => {
    try {
      const session = req.session as { adminUserId: string };
      const adminUser = await storage.getAdminUserById(session.adminUserId);
      if (!adminUser) return res.status(401).json({ error: "Admin user not found" });
      const resellerId = (adminUser as any).resellerId ?? null;
      if (!resellerId) return res.status(403).json({ error: "Reseller account not linked" });
      const reseller = await storage.getResellerById(resellerId);
      if (!reseller?.stripeConnectId) return res.json({ stripeConnectId: null, balance: null });
      const { getStripeClient } = await import("./stripeClient");
      const stripe = getStripeClient();
      const balance = await stripe.balance.retrieve({ stripeAccount: reseller.stripeConnectId });
      const available = (balance.available?.[0]?.amount ?? 0) / 100;
      res.json({ stripeConnectId: reseller.stripeConnectId, balance: available });
    } catch (e: any) {
      console.error("[Reseller] status error:", e?.message);
      res.status(500).json({ error: e?.message ?? "Failed to load status" });
    }
  });

  router.get("/api/reseller/commissions", requireAuth, async (req: any, res) => {
    try {
      const session = req.session as { adminUserId: string };
      const adminUser = await storage.getAdminUserById(session.adminUserId);
      if (!adminUser) return res.status(401).json({ error: "Admin user not found" });
      const resellerId = (adminUser as any).resellerId ?? null;
      if (!resellerId) return res.status(403).json({ error: "Reseller account not linked" });
      const { db } = await import("./db");
      const { commissions: commissionsTable } = await import("@shared/schema");
      const list = await db.select().from(commissionsTable).where(eq(commissionsTable.resellerId, resellerId));
      const totalEarnings = list.reduce((s, c) => s + Number(c.commission), 0);
      const activeClients = new Set(list.map((c) => c.siteConfigId).filter(Boolean)).size;
      const energyBounties = list.filter((c) => c.type === "REFILL").reduce((s, c) => s + Number(c.commission), 0);
      res.json({
        commissions: list.map((c) => ({
          id: c.id,
          siteConfigId: c.siteConfigId,
          amount: Number(c.amount),
          commission: Number(c.commission),
          type: c.type,
          status: c.status,
          createdAt: c.createdAt,
        })),
        totalEarnings,
        activeClients,
        energyBounties,
      });
    } catch (e: any) {
      console.error("[Reseller] commissions error:", e?.message);
      res.status(500).json({ error: e?.message ?? "Failed to load commissions" });
    }
  });

  router.post("/api/reseller/track-intent", async (req, res) => {
    try {
      const body = req.body as { platformId?: string; roomType?: string; netPrice?: number };
      const { platformId, roomType, netPrice } = body;
      if (!platformId || netPrice == null) {
        return res.json({ tracked: false, estimatedCommission: 0 });
      }
      const siteConfigId = await storage.getSiteConfigIdByPlatformId(platformId);
      if (!siteConfigId) return res.json({ tracked: false, estimatedCommission: 0 });
      const site = await storage.getSiteConfigById(siteConfigId);
      const resellerId = (site as any)?.resellerId ?? null;
      if (!resellerId) return res.json({ tracked: false, estimatedCommission: 0 });
      const amount = Number(netPrice) || 0;
      const estimatedCommission = Math.round(amount * 0.1 * 100) / 100;
      res.json({ tracked: true, estimatedCommission });
    } catch (e: any) {
      console.error("[Reseller] track-intent error:", e?.message);
      res.status(500).json({ error: e?.message ?? "Failed to track intent" });
    }
  });


// ── Subscription Checkout + Billing / Payment Methods ─────────────────────────

  // ==================== SUBSCRIPTION CHECKOUT ====================

  // Create a Stripe Checkout Session for a plan upgrade (per-business)
  router.post("/api/subscriptions/create-checkout-session", async (req, res) => {
    try {
      const { getStripeClient, getStripePublishableKey, STRIPE_PRICE_IDS } = await import('./stripeClient');
      const stripe = getStripeClient();

      // Support Bearer token auth (primary) or legacy session (fallback)
      const bearerToken = (req.headers.authorization || '').replace('Bearer ', '').trim();
      let customerSession: { id: string; email?: string } | null = null;
      if (bearerToken) {
        const dbSession = await storage.getValidCustomerSession(bearerToken);
        if (dbSession) {
          const account = await storage.getCustomerAccountById(dbSession.customerAccountId);
          if (account?.isActive) customerSession = { id: account.id, email: account.email ?? undefined };
        }
      }
      if (!customerSession) customerSession = (req as any).session?.customerAccount ?? null;
      if (!customerSession?.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { plan, siteConfigId } = req.body as { plan: string; siteConfigId: string };
      if (!plan || !siteConfigId) {
        return res.status(400).json({ error: 'plan and siteConfigId are required' });
      }

      const priceId = STRIPE_PRICE_IDS[plan];
      if (!priceId) {
        return res.status(400).json({ error: `Unknown plan: ${plan}` });
      }

      const host = req.headers.host || 'localhost:3004';
      const protocol = (req.headers['x-forwarded-proto'] as string) || 'https';
      const baseUrl = `${protocol}://${host}`;

      const category = plan === 'voice' ? 'service' : 'platform';
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${baseUrl}/my-account/site/${siteConfigId}?upgrade=success&plan=${plan}`,
        cancel_url: `${baseUrl}/my-account?upgrade=cancelled`,
        metadata: { siteConfigId, plan, customerId: customerSession.id, category },
        client_reference_id: siteConfigId,
      });

      res.json({ url: session.url, publishableKey: getStripePublishableKey() });
    } catch (error: any) {
      console.error('[Stripe] create-checkout-session error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Stripe webhook — subscription plan upgrades
  router.post("/api/stripe/webhook/subscriptions", async (req, res) => {
    try {
      const { getStripeClient, getStripeWebhookSecret } = await import('./stripeClient');
      const stripe = getStripeClient();
      const sig = req.headers['stripe-signature'] as string;
      const webhookSecret = getStripeWebhookSecret();

      let event: any;
      const rawBody = (req as any).rawBody ?? req.body;

      if (webhookSecret && sig) {
        try {
          event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
        } catch (err: any) {
          console.error('[Stripe] Webhook signature verification failed:', err.message);
          return res.status(400).json({ error: `Webhook signature invalid: ${err.message}` });
        }
      } else {
        console.warn('[Stripe] STRIPE_WEBHOOK_SECRET not set — skipping signature verification (dev mode)');
        event = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
      }

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const meta = session.metadata ?? {};
        const { siteConfigId, plan } = meta;
        const siteId = meta.siteId ?? siteConfigId;

        // ── Site Claim Activation ─────────────────────────────────────────────
        if (meta.claimToken && meta.siteId) {
          await handleClaimCheckoutCompleted(session);
          // Claim activation is fully handled in claimRoutes — skip other branches
        } else if (meta.type === 'ENERGY_REFILL' && siteId) {
          const site = await storage.getSiteConfigById(siteId);
          if (site) {
            const minutes = meta.packageType === 'pro' ? 1200 : 500;
            const current = site.minuteBalance ?? 0;
            await storage.updateSiteConfig(siteId, { minuteBalance: current + minutes, lastNudgeSentAt: null } as any);
            try {
              const { processCommission } = await import('./services/commission');
              await processCommission(session, siteId);
            } catch (e: any) {
              console.error('[Stripe] ENERGY_REFILL processCommission failed (non-fatal):', e?.message);
            }
            try {
              const { broadcastLiveEvent } = await import('./services/eventBridge');
              broadcastLiveEvent(siteId, { type: 'ENERGY_REFILL_SUCCESS', data: { minutes } });
            } catch (e: any) {
              console.error('[Stripe] ENERGY_REFILL broadcast failed (non-fatal):', e?.message);
            }
            console.log(`[Stripe] Energy refill → site ${siteId} +${minutes} min`);
          }
        } else if (siteConfigId && plan) {
          await storage.updateSiteConfig(siteConfigId, { plan } as any);
          console.log(`[Stripe] Plan upgraded → site ${siteConfigId} is now on "${plan}"`);

          // Post-payment onboarding email (non-fatal — never blocks the webhook response)
          try {
            const { sendPlatformEmail } = await import('./services/emailService');
            const siteConfig = await storage.getSiteConfig(siteConfigId);
            const platformId = await storage.getOrCreatePlatformId(siteConfigId);

            let ownerEmail: string | null = null;
            let ownerName = 'Valued Customer';
            if (siteConfig?.ownerId) {
              const owner = await storage.getCustomerAccountById(siteConfig.ownerId);
              ownerEmail = owner?.email ?? null;
              ownerName = owner?.name || ownerName;
            }
            // Fallback: use customer_email from Stripe session if owner email not in DB
            const recipientEmail = ownerEmail || (session as any).customer_email || null;

            if (recipientEmail && siteConfig) {
              await sendPlatformEmail({
                to: recipientEmail,
                customerName: ownerName,
                businessName: siteConfig.name || 'Your Business',
                planName: plan,
                platformId,
                siteUrl: (siteConfig as any).domain ? `https://${(siteConfig as any).domain}` : '',
              });
              console.log(`[Stripe] Onboarding email sent → ${recipientEmail} (platform: ${platformId})`);
            } else {
              console.warn(`[Stripe] Onboarding email skipped — no recipient email for site ${siteConfigId}`);
            }
          } catch (emailErr: any) {
            console.error('[Stripe] Onboarding email failed (non-fatal):', emailErr.message);
          }
        }
        // Set invoice metadata.category for every completed checkout (platform | service | usage)
        try {
          const category = (meta.category as string) ?? 'platform';
          let invoiceId: string | null = (session as any).invoice ?? null;
          if (!invoiceId && (session as any).subscription) {
            const sub = await stripe.subscriptions.retrieve((session as any).subscription);
            invoiceId = typeof sub.latest_invoice === 'string' ? sub.latest_invoice : (sub.latest_invoice as any)?.id ?? null;
          }
          if (invoiceId) {
            await stripe.invoices.update(invoiceId, { metadata: { category } });
          }
        } catch (invErr: any) {
          console.error('[Stripe] Invoice metadata update failed (non-fatal):', invErr?.message);
        }
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('[Stripe] Subscription webhook error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== BILLING / PAYMENT METHODS ====================

  router.get("/api/billing/publishable-key", async (_req, res) => {
    try {
      const { getStripePublishableKey } = await import('./stripeClient');
      const key = getStripePublishableKey() ?? '';
      res.json({ publishableKey: key });
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? 'Stripe config unavailable' });
    }
  });

  /** Voice bundle monthly price per agent (MSA / legacy ShoppingCart: "AI Communication Bundle" $50/line). */
  const VOICE_BUNDLE_MONTHLY = 50;

  router.get("/api/customer/current-bill", async (req, res) => {
    try {
      const bearerToken = (req.headers.authorization || "").replace("Bearer ", "").trim();
      if (!bearerToken) return res.status(401).json({ error: "Authentication required" });
      const dbSession = await storage.getValidCustomerSession(bearerToken);
      if (!dbSession) return res.status(401).json({ error: "Invalid or expired session" });
      const accountId = dbSession.customerAccountId;
      const rates = await getEffectiveRate(accountId);
      const sites = await storage.getSiteConfigsByOwner(accountId);
      const siteIds = sites.map((s) => s.id);

      const platformFee = {
        label: "Platform fee",
        description: "Sovereign AI OS — Small Business Router",
        amount: rates.monthlyFlatFee,
        currency: "USD",
        category: "platform" as const,
      };

      const voiceByAgent: Array<{ agentName: string; identifier?: string; amount: number; currency: string }> = [];
      for (const site of sites) {
        const agents = await storage.getAgentsBySiteConfigId(site.id);
        for (const agent of agents) {
          voiceByAgent.push({
            agentName: agent.name || "Voice AI Agent",
            identifier: undefined,
            amount: VOICE_BUNDLE_MONTHLY,
            currency: "USD",
          });
        }
      }

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      let phoneMinutes = 0;
      let webMinutes = 0;
      let overagePhoneCents = 0;
      let overageWebCents = 0;
      if (siteIds.length > 0) {
        const rows = await db
          .select({
            callType: voiceUsageLogs.callType,
            minutes: sql<number>`COALESCE(SUM(${voiceUsageLogs.billedMinutes}), 0)::int`,
            cents: sql<number>`COALESCE(SUM(${voiceUsageLogs.billedAmountCents}), 0)::int`,
          })
          .from(voiceUsageLogs)
          .where(
            and(
              inArray(voiceUsageLogs.siteConfigId, siteIds),
              gte(voiceUsageLogs.createdAt, startOfMonth)
            )
          )
          .groupBy(voiceUsageLogs.callType);
        for (const row of rows) {
          const min = Number(row.minutes ?? 0);
          const cents = Number(row.cents ?? 0);
          if (row.callType === "phone") {
            phoneMinutes = min;
            overagePhoneCents = cents;
          } else {
            webMinutes = min;
            overageWebCents = cents;
          }
        }
      }

      const overages: Array<{ label: string; units: number; rate: number; amount: number; currency: string }> = [];
      if (phoneMinutes > 0 || overagePhoneCents > 0) {
        overages.push({
          label: "Voice AI (Phone)",
          units: phoneMinutes,
          rate: rates.phoneVoiceAiRate,
          amount: overagePhoneCents / 100,
          currency: "USD",
        });
      }
      if (webMinutes > 0 || overageWebCents > 0) {
        overages.push({
          label: "Voice AI (Web)",
          units: webMinutes,
          rate: rates.webVoiceAiRate,
          amount: overageWebCents / 100,
          currency: "USD",
        });
      }

      const platformTotal = platformFee.amount;
      const voiceTotal = voiceByAgent.reduce((s, v) => s + v.amount, 0);
      const overageTotal = overages.reduce((s, o) => s + o.amount, 0);
      const total = platformTotal + voiceTotal + overageTotal;

      res.json({
        platformFee,
        voiceByAgent,
        overages,
        total: Math.round(total * 100) / 100,
        currency: "USD",
      });
    } catch (error: any) {
      console.error("[Billing] current-bill error:", error?.message);
      res.status(500).json({ error: error?.message ?? "Failed to load current bill" });
    }
  });

  router.get("/api/billing/history", async (req, res) => {
    try {
      const bearerToken = (req.headers.authorization || "").replace("Bearer ", "").trim();
      let customerAccount: { id: string; stripeCustomerId: string | null } | null = null;
      if (bearerToken) {
        const dbSession = await storage.getValidCustomerSession(bearerToken);
        if (dbSession) {
          const account = await storage.getCustomerAccountById(dbSession.customerAccountId);
          if (account?.isActive) customerAccount = { id: account.id, stripeCustomerId: account.stripeCustomerId ?? null };
        }
      }
      if (!customerAccount) return res.status(401).json({ error: "Authentication required" });
      if (!customerAccount.stripeCustomerId) return res.json({ invoices: [] });
      const { getStripeClient } = await import("./stripeClient");
      const stripe = getStripeClient();
      const list = await stripe.invoices.list({
        customer: customerAccount.stripeCustomerId,
        limit: 12,
        status: "paid",
      });
      const invoices = (list.data ?? []).map((inv: any) => ({
        id: inv.id,
        created: inv.created,
        amount_paid: inv.amount_paid,
        invoice_pdf: inv.invoice_pdf,
        description: inv.lines?.data?.[0]?.description ?? inv.description ?? "Invoice",
        category: inv.metadata?.category ?? "platform",
      }));
      res.json({ invoices });
    } catch (error: any) {
      console.error("[Billing] history error:", error?.message);
      res.status(500).json({ error: error?.message ?? "Failed to load history" });
    }
  });

  router.post("/api/billing/create-refill-session", async (req, res) => {
    try {
      const schema = z.object({ siteId: z.string().min(1), packageType: z.enum(["basic", "pro"]) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "siteId and packageType (basic|pro) required" });
      const { siteId, packageType } = parsed.data;
      const site = await storage.getSiteConfigById(siteId);
      if (!site) return res.status(404).json({ error: "Site not found" });
      const { getStripeClient, STRIPE_ENERGY_PRICE_IDS } = await import("./stripeClient");
      const priceId = STRIPE_ENERGY_PRICE_IDS[packageType];
      if (!priceId) return res.status(400).json({ error: "Energy refill price not configured for this package" });
      const stripe = getStripeClient();
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{ price: priceId, quantity: 1 }],
        metadata: { siteId, type: "ENERGY_REFILL", packageType, category: "usage" },
        success_url: `${process.env.APP_URL || "https://aibizbot.gatewayglobal.ai"}/billing?refill=success`,
        cancel_url: `${process.env.APP_URL || "https://aibizbot.gatewayglobal.ai"}/billing?refill=cancelled`,
      });
      res.json({ url: session.url });
    } catch (error: any) {
      console.error("[Billing] create-refill-session error:", error?.message);
      res.status(500).json({ error: error?.message ?? "Failed to create checkout session" });
    }
  });

  router.post("/api/billing/setup-intent", async (req, res) => {
    try {
      const { customerId } = req.body;
      if (!customerId) return res.status(400).json({ error: "customerId is required" });

      const customer = await storage.getCustomer(customerId);
      if (!customer) return res.status(404).json({ error: "Customer not found" });

      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      let stripeCustomerId = customer.stripeCustomerId;
      if (!stripeCustomerId) {
        const stripeCustomer = await stripe.customers.create({
          name: customer.name,
          email: customer.email || undefined,
          phone: customer.phone || undefined,
          metadata: { gatewayCustomerId: customer.id },
        });
        stripeCustomerId = stripeCustomer.id;
        await storage.updateCustomer(customer.id, { stripeCustomerId: stripeCustomer.id });
      }

      const setupIntent = await stripe.setupIntents.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
      });

      res.json({ clientSecret: setupIntent.client_secret, stripeCustomerId });
    } catch (error: any) {
      console.error("[Billing] Setup intent error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/api/billing/payment-methods/:customerId", async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.customerId);
      if (!customer) return res.status(404).json({ error: "Customer not found" });
      if (!customer.stripeCustomerId) return res.json({ paymentMethods: [], defaultPaymentMethodId: null });

      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      const methods = await stripe.paymentMethods.list({
        customer: customer.stripeCustomerId,
        type: 'card',
      });

      const stripeCustomer = await stripe.customers.retrieve(customer.stripeCustomerId);
      const defaultPmId = (stripeCustomer as any).invoice_settings?.default_payment_method || null;

      res.json({
        paymentMethods: methods.data.map((pm) => ({
          id: pm.id,
          brand: pm.card?.brand,
          last4: pm.card?.last4,
          expMonth: pm.card?.exp_month,
          expYear: pm.card?.exp_year,
          isDefault: pm.id === defaultPmId,
        })),
        defaultPaymentMethodId: defaultPmId,
      });
    } catch (error: any) {
      console.error("[Billing] List methods error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/api/billing/payment-methods/:customerId/default", async (req, res) => {
    try {
      const { paymentMethodId } = req.body;
      if (!paymentMethodId) return res.status(400).json({ error: "paymentMethodId is required" });

      const customer = await storage.getCustomer(req.params.customerId);
      if (!customer?.stripeCustomerId) return res.status(404).json({ error: "Customer or Stripe customer not found" });

      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      await stripe.customers.update(customer.stripeCustomerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("[Billing] Set default error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  router.delete("/api/billing/payment-methods/:customerId/:paymentMethodId", async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.customerId);
      if (!customer?.stripeCustomerId) return res.status(404).json({ error: "Customer or Stripe customer not found" });

      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      await stripe.paymentMethods.detach(req.params.paymentMethodId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Billing] Remove method error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

export default router;
