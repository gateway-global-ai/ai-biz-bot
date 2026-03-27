// scripts/check-google-key-permissions.ts
// Permit diagnostics: Twilio, Gemini, Maps Grounding Lite, Places API (New).
// Run with: doppler run -- npx tsx scripts/check-google-key-permissions.ts
// Correct Grounding Lite endpoint: https://mapstools.googleapis.com/mcp/search_places (MCP standard).
//
// API routes (no key permit required): POST /api/analytics/recovery-success (Error Navigator recovery log);
// POST /api/analytics/voice-latency-hint (async TTFT metrics; no Gemini key on client).
// POST /api/intelligence/ppp-snapshot — server-side SerpAPI; auth + SERPAPI key (not Gemini permit).
// POST /api/intelligence/orchestration-runs — auth only; starts DB run for gated POST /api/agents (no Gemini permit).
// POST /api/local-llm-batch/complete — admin session + Ollama at LOCAL_LLM_BASE_URL; no Gemini key (see docs-governance/VOICE_CONCIERGE_LOCAL_LLM_BATCH.md).
// GET /api/site-configs/:id/design-studio — admin session + design_studio.access; no Gemini key.
// PATCH /api/site-configs/:id/design-studio — admin session + design_studio.access; no Gemini key.
// POST /api/site-configs/:id/design-studio/handoff — admin session + design_studio.access; no Gemini key.
// POST /api/site-configs/:id/design-studio/publish — admin session + design_studio.publish; no Gemini key.
// GET /openapi/business-resonance-gpt.json — OpenAPI 3 for ChatGPT Actions import; no Gemini key (see docs-governance/GPT_ACTIONS_BUSINESS_RESONANCE.md).
// GET /api/v1/admin/readiness-gate-v1/metrics — platform admin session + role; in-process counters; no Gemini key.
// Future: POST /api/v1/verification/* — Twilio-backed only; no Gemini permit (see docs-governance/NOVA_VERIFICATION_GOVERNANCE.md).
// POST /api/twilio/monitor/debug-event — Twilio Console Debugger webhook; X-Twilio-Signature + TWILIO_AUTH_TOKEN only; no Gemini permit.

import axios from 'axios';
import twilio from 'twilio';

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GROUNDING_KEY =
  process.env.GOOGLE_MAPS_GROUNDING_LITE_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const GEMINI_MODEL_ID = process.env.GEMINI_MODEL_ID;

const NATIVE_AUDIO_PREVIEW = 'models/gemini-2.5-flash-native-audio-preview-12-2025';

async function checkAvailableModels() {
  if (!GEMINI_KEY) return;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY}`;
    const response = await axios.get<{ models?: { name: string }[] }>(url);
    const models = (response.data.models ?? []).map((m: { name: string }) => m.name);
    
    if (!GEMINI_MODEL_ID) {
      console.warn('⚠️  GEMINI_MODEL_ID is not set in environment. Cannot verify model permit.');
      console.log('📋 Available Gemini Models for this Key:');
      models.forEach((name: string) => console.log(`  - ${name}`));
    } else {
      if (models.includes(GEMINI_MODEL_ID)) {
        console.log(`✅ Permit Confirmed: Model "${GEMINI_MODEL_ID}" is available to this key.`);
      } else {
        console.error(`❌ Permit FAILED: Model "${GEMINI_MODEL_ID}" from env is NOT in the list of available models for this key.`);
        console.log('📋 Available Models:', models.join(', '));
        process.exit(1);
      }
    }
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error('❌ Failed to list models:', err?.message ?? e);
  }
}

async function runDiagnostics() {
  console.log('🚀 Starting Permit Diagnostics...\n');

  // 1. TWILIO CHECK (optional: only when credentials are set)
  if (TWILIO_SID && TWILIO_TOKEN) {
    try {
      const client = twilio(TWILIO_SID, TWILIO_TOKEN);
      await client.messages.list({ limit: 1 });
      console.log('✅ Twilio: Authorized');
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.error(`❌ Twilio: FAILED - ${err?.message ?? e}`);
      process.exit(1);
    }
  } else {
    console.log('⏭️  Twilio: Skipped (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not set)');
  }

  // 2. GEMINI LIST MODELS (diagnostic: which models this key can use)
  await checkAvailableModels();

  // 3. GEMINI CHECK
  if (!GEMINI_KEY) {
    console.error('❌ Gemini: FAILED - GEMINI_API_KEY is not set');
    process.exit(1);
  }
  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
    await axios.post(geminiUrl, { contents: [{ parts: [{ text: 'ping' }] }] });
    console.log('✅ Gemini 2.5 Flash: Authorized');
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
    const msg = err?.response?.data?.error?.message ?? err?.message ?? e;
    console.error(`❌ Gemini: FAILED - ${msg}`);
    process.exit(1);
  }

  // 4. GROUNDING LITE CHECK (MCP endpoint: mcp)
  if (!GROUNDING_KEY) {
    console.error('❌ Grounding Lite: FAILED - GOOGLE_MAPS_GROUNDING_LITE_API_KEY / GOOGLE_MAPS_API_KEY not set');
    process.exit(1);
  }
  try {
    const groundingUrl = 'https://mapstools.googleapis.com/mcp';
    await axios.post(
      groundingUrl,
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'search_places',
          arguments: { text_query: 'Boardwalk Suites Lafayette' },
        },
      },
      {
        headers: {
          'X-Goog-Api-Key': GROUNDING_KEY,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('✅ Maps Grounding Lite: Authorized');
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
    const msg = err?.response?.data?.error?.message ?? err?.message ?? e;
    console.error(`❌ Grounding Lite: FAILED - ${msg}`);
    process.exit(1);
  }

  // 5. PLACES API (NEW) ENRICHMENT CHECK
  try {
    const placesUrl = 'https://places.googleapis.com/v1/places:searchText';
    await axios.post(
      placesUrl,
      { textQuery: 'Googleplex' },
      {
        headers: {
          'X-Goog-Api-Key': GROUNDING_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName',
        },
      }
    );
    console.log('✅ Places API (New): Authorized');
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
    const msg = err?.response?.data?.error?.message ?? err?.message ?? e;
    console.error(`❌ Places API (New): FAILED - ${msg}`);
    process.exit(1);
  }

  console.log('\n✨ All permits verified. System is stable.');
}

runDiagnostics();
