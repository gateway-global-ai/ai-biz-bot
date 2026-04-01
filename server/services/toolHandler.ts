/**
 * toolHandler.ts — Server-side tool execution for Gemini Multimodal Live (`server/services/toolHandler.ts`).
 *
 * **Operational frame (readiness):** Before dispatch, `getSystemReadinessReportForExecutionGate()` enforces the
 * **execution plane** only (`executionReadiness`: DB + Gemini env + local `/api/health`). If that status is
 * `blocked`, tools return `system_readiness_blocked` — the environment cannot safely run side-effecting work.
 * `overallStatus` / npm `tests.catalog` tri-state is **orthogonal** (ops/CI); see `SYSTEM_READINESS_CHECK_V1.md`.
 *
 * When reviewing this file, ask: given current `executionReadiness`, which tools are actually reachable and
 * what side effects (DB, email, Stripe, PMS, etc.) remain possible?
 */
import { getBusinessDetails, getBusinessReviews } from "./mapsService";
import { generateBusinessIntelligence } from "./intelligenceService";
import { storage } from "../storage";
import { sendPlatformEmail } from "./emailService";
import { db } from "../db";
import { workspaceConfigurations, agents } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { createGoogleWorkspaceService, type GoogleWorkspaceCredentials } from "../mcp/googleWorkspace";
import { isKnowledgeWorkerPlan } from "../prompts/knowledgeWorkerPrompt";
import { handleGetHotelInventory } from "../tools/hotelInventoryHandler";
import {
  handlePmsGetHotelDashboard,
  handlePmsGetHousekeepingStatus,
  handlePmsLookupGuestJourney,
} from "../tools/cloudbedsSwarmTools";
import { toolGuestPhoneVerification } from "./novaGuestVerification";
import { handleFetchCityWarrants } from "../tools/fetchCityWarrantsHandler";
import { handleVineLookupAndDispatch } from "../tools/vineDispatchHandler";
import { getPlaceDetails } from "../tools/placesHandler";
import { resolveIntakePolicyConfig } from "./intakePolicyService";
import { assertKnowledgeToolForSession } from "./knowledgeCertificationContext";
import {
  guestPhoneVerificationModelSchema,
  pmsLookupGuestJourneyModelSchema,
  resolveBoundPhoneForGuestTools,
} from "./guestToolPhoneBinding";
import { getSystemReadinessReportForExecutionGate } from "./systemReadinessCore";

/**
 * Interface for the tool call structure received from the Gemini v1beta protocol
 */
interface ToolCall {
  name: string;
  args: any;
  id?: string;
}

export interface ToolCallContext {
  siteConfigId?: string | null;
  /** Twilio `From` (or bridged ANI) — when set, guest phone tools ignore model-supplied phone. */
  trustedCallerId?: string | null;
  /** Correlation for audit / warnings when binding PSTN identity. */
  callSid?: string | null;
}

async function handleGetInboundCallerIdentity(context?: ToolCallContext) {
  const siteConfigId = context?.siteConfigId;
  if (!siteConfigId) {
    return {
      skill_enabled: false,
      message: "No site context — caller identity metadata is unavailable.",
      identity_verification_still_required: true,
    };
  }
  const site = await storage.getSiteConfig(siteConfigId);
  if (!site) {
    return { skill_enabled: false, message: "Site not found.", identity_verification_still_required: true };
  }
  const policy = resolveIntakePolicyConfig(site);
  const cl = policy.callerIdLookup;
  const skillEnabled = cl?.skillEnabled === true;
  if (!skillEnabled) {
    return {
      skill_enabled: false,
      message:
        "The Caller ID (Twilio CNAM) skill is not enabled for this business. The owner can enable it in Platform Settings (Intake Governance).",
      identity_verification_still_required: true,
    };
  }
  if (!cl?.pricingAcknowledged) {
    return {
      skill_enabled: false,
      message:
        "Caller ID skill is pending: the owner must acknowledge Twilio per-lookup pricing in Platform Settings before agents can use this tool.",
      identity_verification_still_required: true,
    };
  }
  return {
    skill_enabled: true,
    message:
      "For inbound PSTN calls, Twilio may deliver Caller ID / Caller Name (CNAM) when the number has the feature enabled in Twilio Console. Twilio may bill per lookup (verify current pricing; stakeholder estimate ~$0.01/call). Browser / web voice sessions do not receive PSTN caller ID through this tool. Caller Name is not proof of identity — complete guest_phone_verification / OTP before PMS or guest account data.",
    browser_voice_note: "Browser voice has no PSTN Caller ID channel here; use collected phone + verification flows for identity.",
    identity_verification_still_required: true,
  };
}

// ── Lead Qualifier tool handlers ─────────────────────────────────────────────

async function handleSearchCrm(args: any) {
  const raw = String(args.caller_id || "").trim();
  const emailArg = String(args.email || "").trim();
  const looksEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);

  const account = await storage.findCustomerAccount({
    phone: !looksEmail && raw ? raw : undefined,
    email: emailArg || (looksEmail ? raw : undefined) || undefined,
  });

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

// ── Workspace MCP (read-only); Jason Standard: UUID scoping + plan check ─────

const WORKSPACE_PLAN_REQUIRED_MESSAGE =
  "I'd love to check your calendar and files, but that feature requires the Voice or Enterprise plan. Would you like to upgrade?";
const WORKSPACE_NOT_CONNECTED_MESSAGE =
  "Google Workspace isn't connected for this business. Connect it in the Workspace tab in your site settings to enable this.";

async function getWorkspaceContext(siteConfigId: string): Promise<
  { allowed: true; credentials: GoogleWorkspaceCredentials } | { allowed: false; error: string }
> {
  if (!siteConfigId || typeof siteConfigId !== "string") {
    return { allowed: false, error: "siteConfigId is required." };
  }
  const siteConfig = await storage.getSiteConfig(siteConfigId);
  if (!siteConfig) {
    return { allowed: false, error: "Site not found." };
  }
  const plan = (siteConfig as any).plan || "free";
  if (!isKnowledgeWorkerPlan(plan)) {
    return { allowed: false, error: WORKSPACE_PLAN_REQUIRED_MESSAGE };
  }
  const row = await db.query.workspaceConfigurations.findFirst({
    where: eq(workspaceConfigurations.siteConfigId, siteConfigId),
    columns: { accessToken: true, refreshToken: true, tokenExpiry: true },
  });
  if (!row?.accessToken) {
    return { allowed: false, error: WORKSPACE_NOT_CONNECTED_MESSAGE };
  }
  const credentials: GoogleWorkspaceCredentials = {
    accessToken: row.accessToken,
    refreshToken: row.refreshToken ?? undefined,
    expiryDate: row.tokenExpiry ? new Date(row.tokenExpiry).getTime() : undefined,
  };
  return { allowed: true, credentials };
}

async function handleMcpSearchDrive(args: any) {
  const ctx = await getWorkspaceContext(args.siteConfigId);
  if (!ctx.allowed) {
    const isPlanGating = ctx.error === WORKSPACE_PLAN_REQUIRED_MESSAGE;
    return {
      error: ctx.error,
      plan_required: isPlanGating,
      audio_cue: isPlanGating
        ? "I need a quick permission update in the Workspace tab to see that. If you hop into your Admin Panel and connect Google Workspace, I'll be able to access those files instantly. Should we keep talking strategy in the meantime?"
        : "I'm trying to access those files for you, but it looks like I don't have the green light on my end yet. Should we keep talking strategy while you sort that out?",
      ui_action: isPlanGating ? "SHOW_UPGRADE_MODAL" : "SHOW_WORKSPACE_CONNECT",
    };
  }
  const service = createGoogleWorkspaceService(ctx.credentials);
  try {
    const result = await service.searchDriveFiles(args.query, args.mimeType);
    if (!result.success) {
      return {
        error: result.error || "Drive search failed.",
        audio_cue: "I'm hitting a bit of digital static with that Drive search right now — let's try a different angle. Tell me more about what you're looking for and I'll keep searching in the background.",
      };
    }
    return {
      audio_cue: "Found it!",
      summary: (result.data as any).summary,
      count: (result.data as any).count,
      files: (result.data as any).files,
    };
  } catch (err: any) {
    return {
      error: err.message || "Unexpected Drive error.",
      audio_cue: "I'm hitting a bit of digital static with the Drive search — let's try another angle.",
    };
  }
}

async function handleMcpReadCalendar(args: any) {
  const ctx = await getWorkspaceContext(args.siteConfigId);
  if (!ctx.allowed) {
    const isPlanGating = ctx.error === WORKSPACE_PLAN_REQUIRED_MESSAGE;
    return {
      error: ctx.error,
      plan_required: isPlanGating,
      audio_cue: isPlanGating
        ? "I'd love to check your calendar, but that feature requires the Voice or Enterprise plan. Would you like me to walk you through the upgrade?"
        : "I need the calendar connection set up first — you can do that quickly in the Workspace tab of your Admin Panel.",
      ui_action: isPlanGating ? "SHOW_UPGRADE_MODAL" : "SHOW_WORKSPACE_CONNECT",
    };
  }
  const service = createGoogleWorkspaceService(ctx.credentials);
  try {
    const result = await service.listCalendarEvents(
      20,
      args.timeMin,
      args.timeMax
    );
    if (!result.success) {
      return {
        error: result.error || "Calendar read failed.",
        audio_cue: "I'm hitting a bit of digital static with the calendar right now — let's keep talking while I try again.",
      };
    }
    const events = (result.data as any).events || [];
    const summary =
      events.length === 0
        ? "No events in this time range."
        : `You have ${events.length} event(s): ${events.map((e: any) => `${e.summary || "Untitled"} (${e.start}–${e.end})`).join("; ")}`;
    return {
      audio_cue: events.length === 0 ? "Your schedule looks clear in that window." : "Got your schedule — let me walk you through it.",
      summary,
      events,
      count: events.length,
    };
  } catch (err: any) {
    return {
      error: err.message || "Unexpected Calendar error.",
      audio_cue: "I'm getting a bit of digital static on the calendar feed — let's keep talking strategy while that sorts itself out.",
    };
  }
}

// ── Sales Closer / Onboarding ────────────────────────────────────────────────

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
 * @param context Optional session context (e.g. siteConfigId) for site-anchored tools.
 */
export async function handleToolCall(toolCall: ToolCall, context?: ToolCallContext) {
  console.log(`[ToolHandler] 🛠️ Executing tool: ${toolCall.name} with args:`, toolCall.args);

  try {
    const gate = await assertKnowledgeToolForSession(toolCall.name, context);
    if (!gate.ok) {
      return {
        error: "knowledge_certification",
        message: gate.message,
        knowledge_certification_blocked: true,
      };
    }

    const readiness = await getSystemReadinessReportForExecutionGate();
    if (readiness.executionReadiness.status === "blocked") {
      return {
        error: "system_readiness_blocked",
        message:
          "Execution halted: core platform readiness is BLOCKED (database or Gemini configuration). See GET /api/platform/readiness or npm run system:check -- --json.",
        critical_blockers: readiness.executionReadiness.blockers,
        schema_version: readiness.schemaVersion,
      };
    }

    const args = (toolCall.args ?? {}) as Record<string, any>;
    const sessionContext = context;

    switch (toolCall.name) {
      case "get_hotel_inventory": {
        const sid = context?.siteConfigId ?? toolCall.args?.siteConfigId;
        return await handleGetHotelInventory({
          ...toolCall.args,
          _sessionSiteConfigId: sid ?? undefined,
        });
      }

      case "guest_phone_verification": {
        const sid = context?.siteConfigId ?? toolCall.args?.siteConfigId;
        const parsed = guestPhoneVerificationModelSchema.safeParse(toolCall.args ?? {});
        if (!parsed.success) {
          const msg = parsed.error.issues.map((i) => i.message).join("; ") || "Invalid guest_phone_verification arguments";
          return { success: false, error: msg };
        }
        const phoneRes = resolveBoundPhoneForGuestTools(parsed.data.phone, {
          trustedCallerId: context?.trustedCallerId,
          callSid: context?.callSid,
        });
        if (!phoneRes.ok) return { success: false, error: phoneRes.error };
        return await toolGuestPhoneVerification({
          action: parsed.data.action,
          phone: phoneRes.phone,
          otp_code: parsed.data.otp_code,
          _sessionSiteConfigId: sid ?? undefined,
        });
      }

      case "pms_lookup_guest_journey": {
        const sid = context?.siteConfigId ?? toolCall.args?.siteConfigId;
        const parsed = pmsLookupGuestJourneyModelSchema.safeParse(toolCall.args ?? {});
        if (!parsed.success) {
          const msg = parsed.error.issues.map((i) => i.message).join("; ") || "Invalid pms_lookup_guest_journey arguments";
          return { success: false, error: msg };
        }
        const phoneRes = resolveBoundPhoneForGuestTools(parsed.data.phone, {
          trustedCallerId: context?.trustedCallerId,
          callSid: context?.callSid,
        });
        if (!phoneRes.ok) return { success: false, error: phoneRes.error };
        return await handlePmsLookupGuestJourney({
          phone: phoneRes.phone,
          _sessionSiteConfigId: sid ?? undefined,
        });
      }

      case "pms_get_housekeeping_status": {
        const sid = context?.siteConfigId ?? toolCall.args?.siteConfigId;
        return await handlePmsGetHousekeepingStatus({
          roomCondition: toolCall.args?.roomCondition,
          pageSize: toolCall.args?.pageSize,
          _sessionSiteConfigId: sid ?? undefined,
        });
      }

      case "pms_get_hotel_dashboard": {
        const sid = context?.siteConfigId ?? toolCall.args?.siteConfigId;
        return await handlePmsGetHotelDashboard({
          date: toolCall.args?.date,
          _sessionSiteConfigId: sid ?? undefined,
        });
      }

      case "fetch_city_warrants":
        return await handleFetchCityWarrants({
          ...toolCall.args,
          _sessionSiteConfigId: context?.siteConfigId ?? undefined,
        });

      case "vine_lookup_and_dispatch":
        return await handleVineLookupAndDispatch({
          ...toolCall.args,
          _sessionSiteConfigId: context?.siteConfigId ?? undefined,
        });
      case "get_business_details":
        return await getBusinessDetails(toolCall.args.placeId || toolCall.args.place_id);

      case "get_booking_and_pricing_info": {
        const siteConfigId = toolCall.args.siteConfigId || context?.siteConfigId;
        if (!siteConfigId) return { error: "Business context is required.", websiteUri: null, message: "I don't have the business website link right now. Please check the business listing or call them directly." };
        const siteConfig = await storage.getSiteConfig(siteConfigId);
        if (!siteConfig) return { error: "Business not found.", websiteUri: null, message: "I couldn't find that business's details. Please try calling or searching online." };
        const placeData = (siteConfig as any).placeData;
        const placeId = (siteConfig as any).placeId;
        let websiteUri: string | null = placeData?.websiteUri ?? placeData?.website ?? null;
        if (!websiteUri && placeId) {
          try {
            const details = await getPlaceDetails(placeId);
            websiteUri = (details as any).websiteUri ?? null;
          } catch (_) {
            // ignore
          }
        }
        const message = websiteUri
          ? `Our current pricing and booking are on our website: ${websiteUri}. I recommend checking there for the latest services and to schedule an appointment.`
          : "I don't have our website link handy. Please search for us online or call us for pricing and to book.";
        return { websiteUri, message };
      }

      case "get_business_reviews":
        return await getBusinessReviews(
          toolCall.args.placeId || toolCall.args.place_id,
          toolCall.args.maxReviews || toolCall.args.max_reviews || 5
        );

      case "query_knowledge_library": {
        const siteConfigIdForLib = toolCall.args.siteConfigId || context?.siteConfigId;
        if (!siteConfigIdForLib)
          return { error: "Business context is required.", results: [] };
        const question = toolCall.args.question?.trim() || "";
        if (!question) return { error: "A question is required.", results: [] };
        const results = await storage.searchKnowledgeLibrary(siteConfigIdForLib, question, 5);
        return { results };
      }

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

      // Workspace MCP (read-only; plan + UUID guardrails)
      case "mcp_search_drive":
        return await handleMcpSearchDrive(toolCall.args);

      case "mcp_read_calendar":
        return await handleMcpReadCalendar(toolCall.args);

      // Canvas display — client renders the UI; server just acknowledges
      case "show_canvas":
        return {
          acknowledged: true,
          canvas_type: toolCall.args?.canvas_type,
          items_count: Array.isArray(toolCall.args?.items) ? toolCall.args.items.length : 0,
        };

      case "get_inbound_caller_identity":
        return await handleGetInboundCallerIdentity(context);

      case "set_canvas_background":
        return {
          acknowledged: true,
          action: "set_background",
          background_id: toolCall.args?.background_id,
          message: `Background changed to ${toolCall.args?.background_id}. The user can now see it live on their canvas.`,
        };

      case "get_background_categories":
        return {
          categories: [
            { id: "particles_floating", label: "Particles & Floating", description: "Floating elements that drift, sparkle, and create depth", count: 6 },
            { id: "space_sky", label: "Space & Sky", description: "Cosmic effects from starfields to auroras", count: 6 },
            { id: "weather_nature", label: "Weather & Nature", description: "Rain, snow, fog, underwater — bring nature to screen", count: 5 },
            { id: "grids_patterns", label: "Grids & Patterns", description: "Structured backgrounds from minimal dots to retro perspective grids", count: 6 },
            { id: "gradients_color", label: "Gradients & Color", description: "Flowing colors and smooth transitions", count: 4 },
            { id: "waves_flow", label: "Waves & Flow", description: "Smooth flowing lines and organic motion", count: 5 },
            { id: "light_beams", label: "Light & Beams", description: "Light effects from subtle glows to dramatic beams", count: 5 },
            { id: "tech_digital", label: "Tech & Digital", description: "Cyberpunk and digital aesthetics — matrix, glitch, neon", count: 5 },
          ],
        };

      case "get_backgrounds_in_category": {
        const CATALOG: Record<string, Array<{ id: string; label: string; description: string }>> = {
          particles_floating: [
            { id: "particles", label: "Particles", description: "Floating particle system" },
            { id: "sparkles", label: "Sparkles", description: "Twinkling star particles" },
            { id: "fireflies", label: "Fireflies", description: "Glowing summer night" },
            { id: "bokeh", label: "Bokeh", description: "Soft out-of-focus lights" },
            { id: "bubble", label: "Bubble", description: "Rising floating bubbles" },
            { id: "confetti", label: "Confetti", description: "Celebration particles" },
          ],
          space_sky: [
            { id: "starfield", label: "Starfield", description: "Flying through space" },
            { id: "aurora", label: "Aurora", description: "Northern lights effect" },
            { id: "meteors", label: "Meteors", description: "Falling meteor trails" },
            { id: "shooting_stars", label: "Shooting Stars", description: "Streaking stars" },
            { id: "constellation", label: "Constellation", description: "Connected star network" },
            { id: "orbits", label: "Orbits", description: "Orbital ring paths" },
          ],
          weather_nature: [
            { id: "rain", label: "Rain", description: "Rainfall with lightning" },
            { id: "snow", label: "Snow", description: "Gentle snowfall" },
            { id: "fog", label: "Fog", description: "Atmospheric mist" },
            { id: "underwater", label: "Underwater", description: "Caustic light patterns" },
            { id: "fireworks", label: "Fireworks", description: "Explosive celebration" },
          ],
          grids_patterns: [
            { id: "grid_pattern", label: "Grid Pattern", description: "Clean line grid" },
            { id: "dot_pattern", label: "Dot Pattern", description: "Subtle dot grid" },
            { id: "hexagon", label: "Hexagon", description: "Honeycomb pattern" },
            { id: "flickering_grid", label: "Flickering Grid", description: "Animated matrix grid" },
            { id: "retro_grid", label: "Retro Grid", description: "80s perspective grid" },
            { id: "interactive_grid", label: "Interactive Grid", description: "Reactive grid with glow" },
          ],
          gradients_color: [
            { id: "mesh_gradient", label: "Mesh Gradient", description: "Stripe/Linear style blobs" },
            { id: "gradient", label: "Gradient", description: "Flowing gradient shapes" },
            { id: "gradient_animation", label: "Gradient Animation", description: "Animated color shifts" },
            { id: "vortex", label: "Vortex", description: "Spiral color flow" },
          ],
          waves_flow: [
            { id: "wavy", label: "Wavy", description: "Flowing wave lines" },
            { id: "light_waves", label: "Light Waves", description: "Ambient wave animation" },
            { id: "wave_grid", label: "Wave Grid", description: "3D wave mesh surface" },
            { id: "topography", label: "Topography", description: "Contour line map" },
            { id: "paths", label: "Paths", description: "Animated path lines" },
          ],
          light_beams: [
            { id: "beams", label: "Beams", description: "Light beam rays" },
            { id: "beams_collision", label: "Beams Collision", description: "Colliding light beams" },
            { id: "spotlight", label: "Spotlight", description: "Cursor-following glow" },
            { id: "ripple", label: "Ripple", description: "Expanding light rings" },
            { id: "circles", label: "Circles", description: "Animated circle patterns" },
          ],
          tech_digital: [
            { id: "matrix", label: "Matrix", description: "Digital code rain — green characters falling" },
            { id: "glitch", label: "Glitch", description: "RGB split distortion effect" },
            { id: "neon", label: "Neon", description: "Glowing neon rings" },
            { id: "warp", label: "Warp", description: "Hyperspace tunnel effect" },
            { id: "boxes", label: "Boxes", description: "Floating 3D boxes" },
          ],
        };
        const catId = toolCall.args?.category_id?.toLowerCase()?.replace(/[\s&]+/g, '_') ?? "";
        const items = CATALOG[catId] ?? [];
        if (items.length === 0) {
          const fuzzyMatch = Object.keys(CATALOG).find(k => catId.includes(k.split('_')[0]) || k.includes(catId));
          if (fuzzyMatch) return { category_id: fuzzyMatch, items: CATALOG[fuzzyMatch], count: CATALOG[fuzzyMatch].length };
        }
        return { category_id: catId, items, count: items.length };
      }

      case "save_background_as_default":
        return {
          acknowledged: true,
          action: "save_default",
          background_id: toolCall.args?.background_id,
          message: `Background ${toolCall.args?.background_id} saved as default desktop.`,
          requires_auth: true,
        };

      case "get_screen_size":
        return {
          acknowledged: true,
          action: "request_screen_size",
          message: "Screen size information is available from the client. The client will respond with viewport dimensions.",
        };

      case "update_visualizer": {
        const vizArgs = toolCall.args ?? {};
        const vizConfig: Record<string, unknown> = {};
        if (vizArgs.type) vizConfig.type = vizArgs.type;
        if (vizArgs.primaryColor) vizConfig.primaryColor = vizArgs.primaryColor;
        if (vizArgs.secondaryColor) vizConfig.secondaryColor = vizArgs.secondaryColor;
        if (vizArgs.opacity != null) vizConfig.opacity = vizArgs.opacity;
        if (vizArgs.glowIntensity != null) vizConfig.glowIntensity = vizArgs.glowIntensity;
        if (vizArgs.barCount != null) vizConfig.barCount = vizArgs.barCount;
        if (vizArgs.amplitudeScale != null) vizConfig.amplitudeScale = vizArgs.amplitudeScale;
        if (vizArgs.smoothing != null) vizConfig.smoothing = vizArgs.smoothing;
        return {
          acknowledged: true,
          tool_type: "visualizer",
          action: "update",
          config: vizConfig,
          message: "Visualizer updated. The user should see the change immediately.",
        };
      }

      case "save_visualizer":
        return {
          acknowledged: true,
          tool_type: "visualizer",
          action: "save",
          name: args.name,
          description: args.description || null,
          tags: args.tags || [],
          is_public: args.is_public !== false,
          requires_auth: true,
          message: "Saving visualizer to the community library.",
        };

      case "browse_visualizers": {
        try {
          const { visualizerLibrary } = await import("@shared/schema");
          const conditions = [eq(visualizerLibrary.isPublic, true)];
          if (args.engine_type) conditions.push(eq(visualizerLibrary.engineType, args.engine_type));
          const rows = await db
            .select({
              id: visualizerLibrary.id,
              name: visualizerLibrary.name,
              authorName: visualizerLibrary.authorName,
              engineType: visualizerLibrary.engineType,
              config: visualizerLibrary.config,
              useCount: visualizerLibrary.useCount,
              tags: visualizerLibrary.tags,
              description: visualizerLibrary.description,
            })
            .from(visualizerLibrary)
            .where(and(...conditions))
            .orderBy(args.sort === "recent" ? desc(visualizerLibrary.createdAt) : desc(visualizerLibrary.useCount))
            .limit(10);
          return {
            tool_type: "visualizer",
            action: "browse_results",
            items: rows,
            count: rows.length,
          };
        } catch (e: any) {
          return { error: "Could not search visualizer library: " + e.message };
        }
      }

      // ── Agent Management Tools (AI OS Assistant) ──────────────────────
      case "list_agents": {
        try {
          const siteId = sessionContext?.siteConfigId;
          if (!siteId) return { error: "No site context available. Cannot list agents." };
          const statusFilter = args.status ?? "all";
          let query = db.select({
            id: agents.id,
            name: agents.name,
            roleType: agents.roleType,
            status: agents.status,
            aiModelProvider: agents.aiModelProvider,
            voiceRole: agents.voiceRole,
            voicePersona: agents.voicePersona,
          }).from(agents).where(eq(agents.siteConfigId, siteId));
          if (statusFilter !== "all") {
            query = db.select({
              id: agents.id,
              name: agents.name,
              roleType: agents.roleType,
              status: agents.status,
              aiModelProvider: agents.aiModelProvider,
              voiceRole: agents.voiceRole,
              voicePersona: agents.voicePersona,
            }).from(agents).where(eq(agents.siteConfigId, siteId));
          }
          const rows = await query;
          const filtered = statusFilter === "all" ? rows : rows.filter(r => r.status === statusFilter);
          return {
            tool_type: "agent_management",
            action: "list_agents",
            agents: filtered,
            count: filtered.length,
            siteConfigId: siteId,
          };
        } catch (e: any) {
          return { error: "Failed to list agents: " + e.message };
        }
      }

      case "inspect_agent": {
        try {
          const agentId = args.agentId;
          const agentName = args.agentName;
          if (!agentId && !agentName) return { error: "Provide either agentId or agentName." };
          let rows;
          if (agentId) {
            rows = await db.select().from(agents).where(eq(agents.id, agentId));
          } else {
            const siteId = sessionContext?.siteConfigId;
            const allAgents = siteId
              ? await db.select().from(agents).where(eq(agents.siteConfigId, siteId))
              : await db.select().from(agents);
            rows = allAgents.filter(a =>
              a.name.toLowerCase().includes((agentName as string).toLowerCase())
            );
          }
          if (rows.length === 0) return { error: "Agent not found." };
          const agent = rows[0];
          return {
            tool_type: "agent_management",
            action: "inspect_agent",
            agent: {
              id: agent.id,
              name: agent.name,
              roleType: agent.roleType,
              status: agent.status,
              voiceRole: agent.voiceRole,
              voicePersona: agent.voicePersona,
              aiModelProvider: agent.aiModelProvider,
              systemPrompt: agent.systemPrompt ? agent.systemPrompt.substring(0, 500) + (agent.systemPrompt.length > 500 ? "... [truncated]" : "") : null,
              dominance: agent.dominance,
              influence: agent.influence,
              steadiness: agent.steadiness,
              conscientiousness: agent.conscientiousness,
            },
          };
        } catch (e: any) {
          return { error: "Failed to inspect agent: " + e.message };
        }
      }

      case "update_agent_prompt": {
        try {
          const { agentId, systemPrompt: newPrompt, appendMode } = args;
          if (!agentId || !newPrompt) return { error: "agentId and systemPrompt are required." };
          const existing = await db.select().from(agents).where(eq(agents.id, agentId));
          if (existing.length === 0) return { error: "Agent not found." };
          const finalPrompt = appendMode
            ? (existing[0].systemPrompt ?? "") + "\n\n" + newPrompt
            : newPrompt;
          await db.update(agents).set({ systemPrompt: finalPrompt }).where(eq(agents.id, agentId));
          return {
            tool_type: "agent_management",
            action: "update_agent_prompt",
            agentId,
            agentName: existing[0].name,
            promptLength: finalPrompt.length,
            mode: appendMode ? "appended" : "replaced",
            success: true,
          };
        } catch (e: any) {
          return { error: "Failed to update agent prompt: " + e.message };
        }
      }

      case "update_agent_knowledge": {
        try {
          const { agentId, title, content, category } = args;
          if (!agentId || !title || !content) return { error: "agentId, title, and content are required." };
          const existing = await db.select().from(agents).where(eq(agents.id, agentId));
          if (existing.length === 0) return { error: "Agent not found." };
          const knowledgeEntry = `\n\n## Knowledge: ${title}\nCategory: ${category ?? "general"}\n${content}`;
          const updatedPrompt = (existing[0].systemPrompt ?? "") + knowledgeEntry;
          await db.update(agents).set({ systemPrompt: updatedPrompt }).where(eq(agents.id, agentId));
          return {
            tool_type: "agent_management",
            action: "update_agent_knowledge",
            agentId,
            agentName: existing[0].name,
            knowledgeTitle: title,
            category: category ?? "general",
            success: true,
          };
        } catch (e: any) {
          return { error: "Failed to update agent knowledge: " + e.message };
        }
      }

      case "dispatch_agent_task": {
        try {
          const { agentRoleType, taskType, prompt, targetFile } = args;
          if (!agentRoleType || !taskType || !prompt) {
            return { error: "agentRoleType, taskType, and prompt are required." };
          }
          return {
            tool_type: "agent_management",
            action: "dispatch_agent_task",
            status: "queued",
            agentRoleType,
            taskType,
            prompt: prompt.substring(0, 200) + (prompt.length > 200 ? "..." : ""),
            targetFile: targetFile ?? null,
            message: `Task dispatched to ${agentRoleType}. The agent will process this through the governed orchestration pipeline. Use list_agents to check status.`,
          };
        } catch (e: any) {
          return { error: "Failed to dispatch task: " + e.message };
        }
      }

      default:
        console.warn(`[ToolHandler] ⚠️ Tool not recognized: ${toolCall.name}`);
        return { error: `Tool ${toolCall.name} is not implemented on the server.` };
    }
  } catch (error) {
    console.error(`[ToolHandler] ❌ Error executing ${toolCall.name}:`, error);
    return { error: "I'm having trouble accessing that information right now." };
  }
}