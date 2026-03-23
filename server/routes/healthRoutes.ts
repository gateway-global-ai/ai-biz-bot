import { Router, type Request, type Response } from 'express';
import axios from 'axios';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { getTwilioClient } from '../twilio';
import { checkSovereignEnv, checkDopplerTokenEnv } from '../config/sovereignEnvGuard';
import { storefrontCategories } from '@shared/schema';

const router = Router();

const GEMINI_LIST_MODELS_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const NATIVE_AUDIO_PREVIEW_MODEL = process.env.GEMINI_MODEL_ID || 'models/gemini-2.5-flash-native-audio-preview-12-2025';

async function checkDatabase() {
  const tested = { query: 'SELECT 1', target: 'database' };
  try {
    await db.execute(sql`SELECT 1`);
    return {
      service: 'database',
      status: 'ok',
      message: 'Successfully connected to the database.',
      tested,
    };
  } catch (error: any) {
    return {
      service: 'database',
      status: 'error',
      message: error.message || 'Failed to connect to the database.',
      tested,
    };
  }
}

async function checkTwilio() {
  const tested = { action: 'accounts().fetch()', target: 'Twilio API' };
  try {
    const twilioClient = await getTwilioClient();
    await twilioClient.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    return {
      service: 'twilio',
      status: 'ok',
      message: 'Successfully connected to Twilio API.',
      tested,
    };
  } catch (error: any) {
    return {
      service: 'twilio',
      status: 'error',
      message: error.message || 'Failed to connect to Twilio API.',
      tested,
    };
  }
}

async function checkGemini() {
  const tested = { endpoint: 'GET /v1beta/models', check: 'listModels + nativeAudioPreview permit' };
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      service: 'gemini',
      status: 'error',
      message: 'GEMINI_API_KEY is not configured.',
      tested,
    };
  }
  try {
    const url = `${GEMINI_LIST_MODELS_URL}?key=${apiKey}`;
    const { data } = await axios.get<{ models?: { name: string }[] }>(url, { timeout: 10000 });
    const modelNames = (data.models ?? []).map((m) => m.name);
    const hasNativeAudio = modelNames.includes(NATIVE_AUDIO_PREVIEW_MODEL);
    return {
      service: 'gemini',
      status: 'ok',
      message: 'Successfully authenticated with Gemini API (listModels).',
      listModels: true,
      nativeAudioPreviewPermit: hasNativeAudio,
      tested: { ...tested, modelCount: modelNames.length, nativeAudioModel: NATIVE_AUDIO_PREVIEW_MODEL },
    };
  } catch (error: any) {
    const msg = error.response?.data?.error?.message || error.message || 'Failed to connect to Gemini API.';
    const hint = /expired|renew/i.test(msg)
      ? 'Update GEMINI_API_KEY in Doppler (dev config), then restart the app so it loads the new key (e.g. pm2 restart aibizbot-dev.gatewayglobal.ai).'
      : undefined;
    return {
      service: 'gemini',
      status: 'error',
      message: msg,
      tested,
      ...(hint && { hint }),
    };
  }
}

/** SerpAPI: key from SERPAPI_API_KEY, SERPAPI_KEY, or SERP_API_KEY; optional live ping. */
async function checkSerpApi() {
  const key =
    process.env.SERPAPI_API_KEY?.trim() ||
    process.env.SERPAPI_KEY?.trim() ||
    process.env.SERP_API_KEY?.trim();
  const tested = {
    keysChecked: ['SERPAPI_API_KEY', 'SERPAPI_KEY', 'SERP_API_KEY'],
    keySet: !!key,
    liveTest: 'GET serpapi.com/search.json (engine=google, q=test, num=1)',
  };
  if (!key) {
    return {
      service: 'serpapi',
      status: 'error',
      message: 'SerpAPI key not set. Set SERPAPI_API_KEY, SERPAPI_KEY, or SERP_API_KEY in Doppler.',
      tested,
    };
  }
  try {
    const params = new URLSearchParams({
      engine: 'google',
      q: 'test',
      num: '1',
      api_key: key,
    });
    const res = await axios.get<{ search_metadata?: { status: string } }>(
      `https://serpapi.com/search.json?${params.toString()}`,
      { timeout: 10000 }
    );
    const status = res.data?.search_metadata?.status ?? res.status === 200 ? 'Success' : 'Unknown';
    return {
      service: 'serpapi',
      status: 'ok',
      message: 'SerpAPI key valid; search test succeeded.',
      tested: { ...tested, responseStatus: status, httpStatus: res.status },
    };
  } catch (error: any) {
    const msg = error.response?.data?.error ?? error.message ?? 'SerpAPI request failed.';
    return {
      service: 'serpapi',
      status: 'error',
      message: typeof msg === 'string' ? msg : JSON.stringify(msg),
      tested: { ...tested, error: error.message },
    };
  }
}

/** Server / Hostinger: fetch public status page API or use HOSTINGER_API_TOKEN if set. */
async function checkServerHostinger() {
  const token = process.env.HOSTINGER_API_TOKEN?.trim();
  const tested = {
    source: token ? 'Hostinger API (HOSTINGER_API_TOKEN)' : 'Hostinger status page (public)',
    tokenSet: !!token,
  };
  if (token) {
    try {
      const { data } = await axios.get('https://developers.hostinger.com/api/vps/v1/virtual-machines', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 8000,
      });
      const vms = Array.isArray(data?.virtual_machines) ? data.virtual_machines : data;
      const count = Array.isArray(vms) ? vms.length : 0;
      return {
        service: 'server_hostinger',
        status: 'ok',
        message: `Hostinger VPS API reachable${count >= 0 ? `; ${count} VM(s) listed.` : '.'}`,
        tested: { ...tested, response: data, vmCount: count },
      };
    } catch (error: any) {
      const status = error.response?.status;
      const msg = error.response?.data?.message ?? error.message ?? 'Hostinger API request failed.';
      return {
        service: 'server_hostinger',
        status: 'error',
        message: status === 401 ? 'Invalid HOSTINGER_API_TOKEN.' : msg,
        tested: { ...tested, httpStatus: status, error: error.message },
      };
    }
  }
  try {
    const { data } = await axios.get<{ status?: { indicator?: string; description?: string } }>(
      'https://statuspage.hostinger.com/api/v2/status.json',
      { timeout: 6000 }
    );
    const indicator = data?.status?.indicator ?? 'unknown';
    const desc = data?.status?.description ?? '';
    const ok = indicator === 'none' || indicator === 'operational';
    return {
      service: 'server_hostinger',
      status: ok ? 'ok' : 'error',
      message: ok
        ? 'Hostinger status page: operational.'
        : `Hostinger status: ${indicator}. ${desc}`.trim(),
      tested: { ...tested, indicator, description: desc, url: 'https://statuspage.hostinger.com' },
    };
  } catch (error: any) {
    return {
      service: 'server_hostinger',
      status: 'error',
      message:
        'Could not reach Hostinger status page. Set HOSTINGER_API_TOKEN for API-based server health, or see https://statuspage.hostinger.com',
      tested: { ...tested, error: error.message },
    };
  }
}

/**
 * GET /api/health
 * Performs a live health check on critical system dependencies (Database, Twilio, Gemini, SerpAPI, Server).
 * Returns 200 if all systems are operational, 503 if any system fails.
 * Each check includes a "tested" object describing what was run (for UI / CLI clarity).
 */
router.get('/api/health', async (_req: Request, res: Response) => {
  const sovereignEnvCheck = checkSovereignEnv();
  const dopplerTokenEnvCheck = checkDopplerTokenEnv();
  const checks = await Promise.all([
    checkDatabase(),
    checkTwilio(),
    checkGemini(),
    checkSerpApi(),
    checkServerHostinger(),
    Promise.resolve({
      service: 'sovereign_env',
      status: sovereignEnvCheck.status,
      message: sovereignEnvCheck.message,
      tested: { keys: ['SESSION_SECRET', 'ENCRYPTION_KEY'] },
      ...(sovereignEnvCheck.missing?.length ? { missing: sovereignEnvCheck.missing } : {}),
    }),
    Promise.resolve({
      service: 'doppler_token_env',
      status: dopplerTokenEnvCheck.status,
      message: dopplerTokenEnvCheck.message,
      tested: { envVar: 'DOPPLER_TOKEN', expectEnv: process.env.DOPPLER_EXPECT_ENV || null },
      ...(dopplerTokenEnvCheck.expected ? { expected: dopplerTokenEnvCheck.expected } : {}),
    }),
  ]);

  const hasError = checks.some(check => check.status === 'error');
  const overallStatus = hasError ? 'error' : 'ok';
  const httpStatus = hasError ? 503 : 200;

  res.status(httpStatus).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks,
  });
});

/** Actionable diagnostics for storefronts: DB categories, tables, and what to do when broken. */
export type StorefrontHealthCheck = {
  name: string;
  status: 'ok' | 'warn' | 'error';
  message: string;
  detail?: Record<string, unknown>;
  action?: string;
};

/**
 * GET /api/health/storefronts
 * Diagnoses storefront feature: DB table, category count. Returns actions to fix issues.
 * Use this (or the check-storefront-health script) after deploy to verify storefronts work.
 */
router.get('/api/health/storefronts', async (_req: Request, res: Response) => {
  const checks: StorefrontHealthCheck[] = [];
  const actions: string[] = [];

  try {
    const rows = await db.select().from(storefrontCategories);
    const count = rows.length;

    if (count === 0) {
      checks.push({
        name: 'storefront_categories',
        status: 'warn',
        message: 'No storefront categories in database.',
        detail: { count: 0 },
        action: 'Run: npm run db:seed-storefronts (with Doppler so DATABASE_URL is set).',
      });
      actions.push('Seed categories: npm run db:seed-storefronts');
    } else {
      checks.push({
        name: 'storefront_categories',
        status: 'ok',
        message: `${count} storefront categor${count === 1 ? 'y' : 'ies'} in database.`,
        detail: { count },
      });
    }
  } catch (error: any) {
    const msg = error?.message ?? 'Unknown error';
    checks.push({
      name: 'storefront_categories',
      status: 'error',
      message: `Database error: ${msg}`,
      action: 'Ensure migrations are applied (npm run db:migrate). If table is missing, run migration 0028_storefronts.sql.',
    });
    actions.push('Apply migrations: npm run db:migrate');
  }

  const hasError = checks.some((c) => c.status === 'error');
  const hasWarn = checks.some((c) => c.status === 'warn');
  const status = hasError ? 'error' : hasWarn ? 'warn' : 'ok';
  const httpStatus = hasError ? 503 : 200;

  res.status(httpStatus).json({
    status,
    timestamp: new Date().toISOString(),
    checks,
    ...(actions.length > 0 && { actions }),
  });
});

export default router;