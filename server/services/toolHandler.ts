/**
 * toolHandler.ts - Server-side tool execution for Gemini Multimodal Live
 * Location: /opt/gatewayglobal/aibizbot-dev.gatewayglobal.ai/server/services/voice/toolHandler.ts
 */
import { getBusinessDetails, getBusinessReviews } from "./mapsService";
import { generateBusinessIntelligence } from "./intelligenceService";
import { storage } from "../storage";
import { sendPlatformEmail } from "./emailService";

/**
 * Interface for the tool call structure received from the Gemini v1beta protocol
 */
interface ToolCall {
  name: string;
  args: any;
  id?: string;
}

// ── Lead Qualifier tool handlers ─────────────────────────────────────────────

async function handleSearchCrm(args: any) {
  const callerId: string = args.caller_id || '';
  const email: string = args.email || '';

  // Search by phone (primary) then email (secondary)
  let account = null;
  if (callerId) {
    account = await storage.getCustomerAccountByPhone(callerId).catch(() => null);
  }
  if (!account && email) {
    account = await storage.getCustomerAccountByEmail?.(email).catch(() => null);
  }

  if (account) {
    return {
      exists: true,
      leadId: account.id,
      name: account.name || '',
      email: account.email || '',
      phone: account.phone || '',
      note: 'Existing contact found in CRM.',
    };
  }
  return { exists: false, note: 'New contact — not previously in CRM.' };
}

function handleQualifyLead(args: any) {
  const signals = args.nbat_signals || {};
  let score = 0;

  if (signals.need && signals.need.length > 5) score += 2.5;
  if (signals.budget && signals.budget.length > 2) score += 2.5;
  if (signals.authority && /yes|i am|decision|owner|manager/i.test(signals.authority)) score += 2.5;
  if (signals.timeline && signals.timeline.length > 2) score += 2.5;

  // Bonus for urgency signals
  if (/asap|urgent|this week|q[1-4]|by [a-z]/i.test(JSON.stringify(signals))) score = Math.min(10, score + 1);

  const rounded = Math.round(score * 10) / 10;
  let recommendation: string;
  if (rounded >= 8) recommendation = 'book_meeting';
  else if (rounded >= 5) recommendation = 'send_resources';
  else recommendation = 'graceful_close';

  return {
    score: rounded,
    recommendation,
    signals_captured: Object.keys(signals).filter(k => signals[k]?.length > 0),
  };
}

async function handleBookMeeting(args: any) {
  // Stub: returns next available mock slot. Replace with Cal.com / Google Calendar integration.
  const now = new Date();
  now.setDate(now.getDate() + 1);
  now.setHours(10, 0, 0, 0); // Default: next day at 10 AM

  const slot = now.toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });

  return {
    booked: true,
    slot,
    lead_name: args.lead_name,
    lead_contact: args.lead_contact,
    confirmation_message: `Your meeting is confirmed for ${slot}. A calendar invite will be sent to ${args.lead_contact}.`,
  };
}

// ── Sales Closer tool handlers ───────────────────────────────────────────────

function handleGenerateQuote(args: any) {
  const tierLabels: Record<string, { label: string; price: string }> = {
    starter: { label: 'Starter', price: '$49/mo' },
    ai_pro:  { label: 'AI Pro',  price: '$149/mo' },
    enterprise: { label: 'Enterprise', price: '$499/mo' },
  };
  const tier = tierLabels[args.tier] || { label: args.tier, price: 'Custom' };

  return {
    quote_generated: true,
    prospect_name: args.prospect_name || 'Valued Client',
    scope: args.scope_summary,
    tier: tier.label,
    price: tier.price,
    summary: `Proposal for ${args.prospect_name || 'you'}: ${tier.label} plan at ${tier.price}. Scope: ${args.scope_summary}. This includes full onboarding, AI-powered website, and 30-day support.`,
    next_step: 'Use stripe_checkout to finalize payment.',
  };
}

async function handleApplyDiscount(args: any) {
  const requestedPct: number = args.requested_pct || 0;
  const businessId: string = args.business_id || '';

  // Default max is 10%. Override from site config if available.
  let maxDiscountPct = 10;
  try {
    const siteConfig = await storage.getSiteConfig(businessId);
    const configLimit = (siteConfig as any)?.agentConfig?.toolLimits?.max_discount_percent;
    if (typeof configLimit === 'number') maxDiscountPct = configLimit;
  } catch {
    // Use default
  }

  const approved = requestedPct <= maxDiscountPct;
  return {
    approved,
    requested_pct: requestedPct,
    approved_pct: approved ? requestedPct : maxDiscountPct,
    message: approved
      ? `Discount of ${requestedPct}% approved.`
      : `Requested ${requestedPct}% exceeds authorized limit of ${maxDiscountPct}%. Applying ${maxDiscountPct}% instead.`,
  };
}

async function handleStripeCheckout(args: any) {
  const { business_id, plan, customer_email } = args;

  // Reuse the existing checkout session endpoint internally
  try {
    const fetch = (await import('node-fetch')).default;
    const port = process.env.PORT || 3004;
    const response = await fetch(`http://localhost:${port}/api/subscriptions/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, siteConfigId: business_id, customerEmail: customer_email }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Checkout session failed: ${errText}`);
    }

    const data = await response.json() as { url?: string };
    return {
      checkout_created: true,
      url: data.url,
      message: `Secure payment link created. Sending to ${customer_email || 'the prospect'} now.`,
    };
  } catch (err: any) {
    console.error('[ToolHandler] stripe_checkout error:', err.message);
    return { checkout_created: false, error: 'Unable to create payment link right now. Please try again shortly.' };
  }
}

async function handleSendOnboardingEmail(args: any) {
  const { platformId, customerEmail, customerName, planName, agentName } = args;

  if (!platformId || !customerEmail || !customerName || !planName) {
    return { sent: false, error: 'Missing required fields: platformId, customerEmail, customerName, planName.' };
  }

  // Guard 1 — Resolve siteConfigId from platformId (grounding check)
  const siteConfigId = await storage.getSiteConfigIdByPlatformId(platformId);
  if (!siteConfigId) {
    console.error(`[ToolSecurity] send_onboarding_email blocked: platformId ${platformId} not found in platform_business_map.`);
    return { sent: false, error: 'Identity mismatch. Business not found.' };
  }

  // Guard 2 — Payment verification (pre-flight check)
  const siteConfig = await storage.getSiteConfig(siteConfigId);
  if (!siteConfig) {
    console.error(`[ToolSecurity] send_onboarding_email blocked: siteConfig not found for ${siteConfigId}.`);
    return { sent: false, error: 'Business configuration not found.' };
  }

  const dbPlan = (siteConfig.plan || 'free').toLowerCase();
  const requestedPlan = planName.toLowerCase().replace(/\s+/g, '_');
  const isPaid = dbPlan !== 'free';

  if (!isPaid) {
    console.warn(`[ToolSecurity] send_onboarding_email blocked: DB plan is '${dbPlan}', payment not yet verified.`);
    return {
      sent: false,
      error: 'Verification failed. Our records show the upgrade is not yet complete.',
      helpText: 'Please complete the Stripe checkout to unlock this tool. There may be a brief sync delay — try again in a moment.',
    };
  }

  // Guard 3 — Plan name sanity check (prevent tier spoofing)
  const planMatches = dbPlan === requestedPlan ||
    dbPlan.includes(requestedPlan) ||
    requestedPlan.includes(dbPlan);

  if (!planMatches) {
    console.warn(`[ToolSecurity] send_onboarding_email blocked: requested plan '${requestedPlan}' does not match DB plan '${dbPlan}'.`);
    return {
      sent: false,
      error: `Verification failed. Your account is on the '${siteConfig.plan}' plan, not '${planName}'.`,
    };
  }

  // Point of no return — all guards passed
  const result = await sendPlatformEmail({
    to: customerEmail,
    customerName,
    businessName: siteConfig.name || 'Your Business',
    planName,
    platformId,
    agentName: agentName || 'Your AI Business Agent',
    siteUrl: (siteConfig as any).domain ? `https://${(siteConfig as any).domain}` : '',
  });

  if (!result.sent) {
    console.error(`[ToolSecurity] send_onboarding_email: email service error — ${result.error}`);
    return { sent: false, error: 'Email service temporarily unavailable. The upgrade is confirmed — we will retry delivery.' };
  }

  const verbalConfirmation = `I've got that confirmed, ${customerName}. I just sent your complete onboarding kit to ${customerEmail}. It includes your unique Platform ID and everything you need to configure your new ${planName} tools. Welcome aboard!`;

  return {
    sent: true,
    tool_type: 'email_sent',
    verbal_confirmation: verbalConfirmation,
  };
}

/**
 * Main dispatcher that routes Gemini's function calls to internal services.
 * Every tool declared in the client's setupMessage must be handled here.
 */
export async function handleToolCall(toolCall: ToolCall) {
  console.log(`[ToolHandler] 🛠️ Executing tool: ${toolCall.name} with args:`, toolCall.args);

  try {
    switch (toolCall.name) {
      case "get_business_details":
        return await getBusinessDetails(toolCall.args.placeId || toolCall.args.place_id);

      case "get_business_reviews":
        return await getBusinessReviews(
          toolCall.args.placeId || toolCall.args.place_id,
          toolCall.args.maxReviews || toolCall.args.max_reviews || 5
        );

      case "get_business_intelligence":
        return await generateBusinessIntelligence(
          toolCall.args.businessName || toolCall.args.business_name,
          toolCall.args.focusArea
        );

      case "request_manual_input":
        return {
          status: "awaiting_user_input",
          prompt: toolCall.args.prompt || "Please provide the requested info.",
        };

      // Lead Qualifier tools
      case "search_crm":
        return await handleSearchCrm(toolCall.args);

      case "qualify_lead":
        return handleQualifyLead(toolCall.args);

      case "book_meeting":
        return await handleBookMeeting(toolCall.args);

      // Sales Closer tools
      case "generate_quote":
        return handleGenerateQuote(toolCall.args);

      case "apply_discount":
        return await handleApplyDiscount(toolCall.args);

      case "stripe_checkout":
        return await handleStripeCheckout(toolCall.args);

      case "send_onboarding_email":
        return await handleSendOnboardingEmail(toolCall.args);

      default:
        console.warn(`[ToolHandler] ⚠️ Tool not recognized: ${toolCall.name}`);
        return { error: `Tool ${toolCall.name} is not implemented on the server.` };
    }
  } catch (error) {
    console.error(`[ToolHandler] ❌ Error executing ${toolCall.name}:`, error);
    return { error: "I'm having trouble accessing that information right now." };
  }
}