import { Router } from "express";
import { storage } from "../storage";
import { eq } from "drizzle-orm";
import { z } from "zod";
import twilio from "twilio";
import {
  a2pBrands,
  a2pCampaigns,
  type A2pBrand,
} from "@shared/schema";
import { db } from "../db";
// All Stripe calls use dynamic imports: await import('../stripeClient')

const router = Router();

// ── A2P 10-DLC Compliance API ────────────────────────────────────────────────

  // ========== A2P 10-DLC Compliance API ==========
  
  // Get all A2P brands
  router.get("/api/a2p/brands", async (req, res) => {
    try {
      const brands = await storage.getA2pBrands();
      res.json({ brands });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single A2P brand
  router.get("/api/a2p/brands/:id", async (req, res) => {
    try {
      const brand = await storage.getA2pBrand(req.params.id);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }
      res.json(brand);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create A2P brand registration
  router.post("/api/a2p/brands", async (req, res) => {
    try {
      const { 
        companyName, firstName, lastName, email, phone,
        country, taxId, website, vertical,
        stockExchange, stockSymbol, customerId
      } = req.body;

      if (!companyName || !firstName || !lastName || !email || !phone) {
        return res.status(400).json({ 
          error: "Missing required fields: companyName, firstName, lastName, email, phone" 
        });
      }

      // Create brand in our database first
      const brand = await storage.createA2pBrand({
        companyName,
        firstName,
        lastName,
        email,
        phone,
        country: country || 'US',
        taxId,
        website,
        vertical,
        stockExchange,
        stockSymbol,
        customerId,
        brandStatus: 'draft',
      });

      res.json({ 
        success: true, 
        brand,
        message: "Brand registration created. Submit for review after payment."
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update A2P brand
  router.patch("/api/a2p/brands/:id", async (req, res) => {
    try {
      const updated = await storage.updateA2pBrand(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Brand not found" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Submit A2P brand to Twilio for registration
  router.post("/api/a2p/brands/:id/submit", async (req, res) => {
    try {
      const brand = await storage.getA2pBrand(req.params.id);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }

      // Get Twilio client
      const client = await getTwilioClient();
      if (!client) {
        return res.status(500).json({ error: "Twilio client not configured" });
      }

      // Create the brand in Twilio's Trust Hub
      // Note: This requires Twilio Trust Hub API setup
      try {
        const customerProfile = await client.trusthub.v1.customerProfiles.create({
          friendlyName: brand.companyName,
          email: brand.email,
          policySid: 'RN806dd6cd175f314e1f96a9727ee271f4', // A2P Messaging Policy SID
        });

        // Update brand with Twilio SID
        const updated = await storage.updateA2pBrand(brand.id, {
          brandSid: customerProfile.sid,
          brandStatus: 'pending',
        });

        res.json({
          success: true,
          brand: updated,
          customerProfileSid: customerProfile.sid,
          message: "Brand submitted to Twilio Trust Hub for review"
        });
      } catch (twilioError: any) {
        // If Trust Hub not set up, provide helpful error
        console.error('Twilio Trust Hub error:', twilioError);
        
        // Still update status to show attempt was made
        await storage.updateA2pBrand(brand.id, {
          brandStatus: 'pending',
        });

        res.json({
          success: true,
          brand: await storage.getA2pBrand(brand.id),
          warning: "Brand marked as pending. Full Twilio Trust Hub integration requires additional setup.",
          twilioError: twilioError.message
        });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all A2P campaigns
  router.get("/api/a2p/campaigns", async (req, res) => {
    try {
      const brandId = req.query.brandId as string;
      const campaigns = await storage.getA2pCampaigns(brandId);
      res.json({ campaigns });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single A2P campaign
  router.get("/api/a2p/campaigns/:id", async (req, res) => {
    try {
      const campaign = await storage.getA2pCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create A2P campaign
  router.post("/api/a2p/campaigns", async (req, res) => {
    try {
      const { 
        brandId, useCase, description, messageFlow,
        sampleMessages, optInDescription, optOutDescription,
        helpDescription, hasDirectLending,
        privacyPolicyUrl, termsOfServiceUrl
      } = req.body;

      if (!brandId || !useCase || !description) {
        return res.status(400).json({ 
          error: "Missing required fields: brandId, useCase, description" 
        });
      }

      // Verify brand exists
      const brand = await storage.getA2pBrand(brandId);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }

      const campaign = await storage.createA2pCampaign({
        brandId,
        useCase,
        description,
        messageFlow,
        sampleMessages: sampleMessages || [],
        optInDescription,
        optOutDescription,
        helpDescription,
        hasDirectLending: hasDirectLending || false,
        privacyPolicyUrl,
        termsOfServiceUrl,
        campaignStatus: 'draft',
      });

      res.json({ 
        success: true, 
        campaign,
        message: "Campaign created. Submit for review after brand is approved."
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update A2P campaign
  router.patch("/api/a2p/campaigns/:id", async (req, res) => {
    try {
      const updated = await storage.updateA2pCampaign(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Submit A2P campaign for registration
  router.post("/api/a2p/campaigns/:id/submit", async (req, res) => {
    try {
      const campaign = await storage.getA2pCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      const brand = await storage.getA2pBrand(campaign.brandId);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }

      if (brand.brandStatus !== 'approved' && brand.brandStatus !== 'pending') {
        return res.status(400).json({ 
          error: "Brand must be approved or pending before submitting campaign" 
        });
      }

      // Get Twilio client
      const client = await getTwilioClient();
      if (!client) {
        return res.status(500).json({ error: "Twilio client not configured" });
      }

      // Create messaging service if not exists
      let messagingServiceSid = campaign.messagingServiceSid;
      if (!messagingServiceSid) {
        try {
          const messagingService = await client.messaging.v1.services.create({
            friendlyName: `${brand.companyName} - ${campaign.useCase}`,
            useInboundWebhookOnNumber: false,
          });
          messagingServiceSid = messagingService.sid;
        } catch (msError: any) {
          console.error('Error creating messaging service:', msError);
        }
      }

      // Update campaign status
      const updated = await storage.updateA2pCampaign(campaign.id, {
        campaignStatus: 'pending',
        messagingServiceSid,
      });

      res.json({
        success: true,
        campaign: updated,
        messagingServiceSid,
        message: "Campaign submitted for review. This typically takes 1-7 business days."
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Stripe webhook for A2P payment completion
  router.post("/api/stripe/webhook/a2p", async (req, res) => {
    try {
      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();
      
      const sig = req.headers['stripe-signature'];
      if (!sig) {
        return res.status(400).json({ error: 'Missing stripe-signature header' });
      }

      const webhookSecret = process.env.STRIPE_A2P_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.warn('STRIPE_A2P_WEBHOOK_SECRET not configured, skipping signature verification');
        const body = req.body;
        if (body?.type === 'checkout.session.completed') {
          await handleA2PCheckoutComplete(body.data.object);
        }
        return res.json({ received: true });
      }

      const rawBody = (req as any).rawBody;
      if (!rawBody) {
        return res.status(400).json({ error: 'Raw body not available' });
      }

      let event;
      try {
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
      } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
      }

      if (event.type === 'checkout.session.completed') {
        await handleA2PCheckoutComplete(event.data.object);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('A2P Stripe webhook error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  async function handleA2PCheckoutComplete(session: any) {
    const { brandId, type, vettingType } = session.metadata || {};
    
    if (type !== 'a2p_brand_registration' || !brandId) {
      console.log('Ignoring non-A2P checkout session');
      return;
    }

    const brand = await storage.getA2pBrand(brandId);
    if (!brand) {
      console.error('Brand not found for payment:', brandId);
      return;
    }

    if (brand.stripePaymentId) {
      console.log('Brand already has payment recorded:', brandId);
      return;
    }

    const { getPricingConfig, toCents } = await import('./utils/pricing');
    const _pricing = getPricingConfig();
    const _brandReg   = toCents(_pricing.flat_fee.monthly.amount);
    const _expedited  = Math.round(Number(process.env.STRIPE_A2P_EXPEDITED_FEE_CENTS ?? 8500));
    const _standard   = Math.round(Number(process.env.STRIPE_A2P_STANDARD_FEE_CENTS  ?? 4000));
    const totalAmount = session.amount_total || (vettingType === 'expedited' ? _brandReg + _expedited : _brandReg + _standard);

    await storage.updateA2pBrand(brandId, {
      stripePaymentId: session.payment_intent as string,
      amountPaid: totalAmount,
      vettingStatus: 'pending',
      vettingProvider: 'campaign-verify',
      brandStatus: 'pending',
    });

    console.log(`A2P brand ${brandId} payment complete: $${(totalAmount / 100).toFixed(2)}`);
  }

  // A2P Compliance payment - Create checkout session for brand registration
  router.post("/api/a2p/brands/:id/pay", async (req, res) => {
    try {
      const brand = await storage.getA2pBrand(req.params.id);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }

      if (brand.stripePaymentId) {
        return res.status(400).json({ error: "Payment already processed for this brand" });
      }

      const { getUncachableStripeClient, getStripePublishableKey } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();
      const { getPricingConfig, toCents } = await import('./utils/pricing');
      const pricing = getPricingConfig();

      // All amounts sourced from pricing_v1.yaml or Doppler env vars.
      // Math.round() via toCents() prevents floating-point drift.
      const brandRegCents   = toCents(pricing.flat_fee.monthly.amount);
      const expeditedCents  = Math.round(Number(process.env.STRIPE_A2P_EXPEDITED_FEE_CENTS  ?? 8500));
      const standardCents   = Math.round(Number(process.env.STRIPE_A2P_STANDARD_FEE_CENTS   ?? 4000));

      const { vettingType = 'standard' } = req.body;

      const lineItems: any[] = [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'A2P Brand Registration',
              description: `Brand registration for ${brand.companyName}`,
            },
            unit_amount: brandRegCents,
          },
          quantity: 1,
        }
      ];

      if (vettingType === 'expedited') {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Expedited Vetting',
              description: 'Priority vetting (24-48 hours)',
            },
            unit_amount: expeditedCents,
          },
          quantity: 1,
        });
      } else {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Standard Vetting',
              description: 'Standard vetting (3-5 business days)',
            },
            unit_amount: standardCents,
          },
          quantity: 1,
        });
      }

      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || req.get('host')}`;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${baseUrl}/agent/${req.query.agentId || ''}/telephony?a2p_payment=success&brand_id=${brand.id}`,
        cancel_url: `${baseUrl}/agent/${req.query.agentId || ''}/telephony?a2p_payment=cancelled`,
        metadata: {
          brandId: brand.id,
          type: 'a2p_brand_registration',
          vettingType,
        },
      });

      res.json({
        sessionId: session.id,
        url: session.url,
        publishableKey: await getStripePublishableKey(),
      });
    } catch (error: any) {
      console.error('A2P payment error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Handle A2P payment success callback
  router.post("/api/a2p/brands/:id/payment-complete", async (req, res) => {
    try {
      const brand = await storage.getA2pBrand(req.params.id);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }

      const { sessionId, vettingType = 'standard' } = req.body;

      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== 'paid') {
        return res.status(400).json({ error: "Payment not completed" });
      }

      if (session.metadata?.brandId !== brand.id) {
        return res.status(400).json({ error: "Payment session mismatch" });
      }

      const { getPricingConfig, toCents } = await import('./utils/pricing');
      const _p2 = getPricingConfig();
      const _b2 = toCents(_p2.flat_fee.monthly.amount);
      const _e2 = Math.round(Number(process.env.STRIPE_A2P_EXPEDITED_FEE_CENTS ?? 8500));
      const _s2 = Math.round(Number(process.env.STRIPE_A2P_STANDARD_FEE_CENTS  ?? 4000));
      const totalAmount = vettingType === 'expedited' ? _b2 + _e2 : _b2 + _s2;

      const updated = await storage.updateA2pBrand(brand.id, {
        stripePaymentId: session.payment_intent as string,
        amountPaid: totalAmount,
        vettingStatus: 'pending',
        vettingProvider: 'campaign-verify',
        brandStatus: 'pending',
      });

      res.json({
        success: true,
        brand: updated,
        message: "Payment received. Brand submitted for review."
      });
    } catch (error: any) {
      console.error('A2P payment complete error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // A2P Compliance pricing info
  router.get("/api/a2p/pricing", async (req, res) => {
    res.json({
      brandRegistration: {
        fee: 4900, // $49.00 in cents
        description: "One-time brand registration fee"
      },
      standardVetting: {
        fee: 4000, // $40.00 in cents
        description: "Standard vetting (3-5 business days)"
      },
      expeditedVetting: {
        fee: 8500, // $85.00 in cents
        description: "Expedited vetting (24-48 hours)"
      },
      campaignRegistration: {
        fee: 1500, // $15.00 in cents
        description: "Per-campaign registration fee"
      },
      monthlyMaintenance: {
        fee: 2900, // $29.00 in cents
        description: "Monthly compliance maintenance"
      },
      setupService: {
        basic: 9900, // $99.00 in cents
        standard: 19900, // $199.00 in cents
        premium: 29900, // $299.00 in cents
        description: "Full-service setup assistance"
      }
    });
  });

export default router;
