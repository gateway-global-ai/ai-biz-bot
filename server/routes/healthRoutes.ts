import { Router, type Request, type Response } from 'express';
import axios from 'axios';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { getTwilioClient } from '../twilio';
import { checkSovereignEnv, checkDopplerTokenEnv } from '../config/sovereignEnvGuard';
import { storefrontCategories } from '@shared/schema';

const router = Router();

const GEMINI_LIST_MODELS_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const NATIVE_AUDIO_PREVIEW_MODEL = 'models/gemini-2.5-flash-native-audio-preview-12-2025';

async function checkDatabase() {
  try {
    await db.execute(sql`SELECT 1`);
    return { service: 'database', status: 'ok', message: 'Successfully connected to the database.' };
  } catch (error: any) {
    return { service: 'database', status: 'error', message: error.message || 'Failed to connect to the database.' };
  }
}

async function checkTwilio() {
  try {
    const twilioClient = await getTwilioClient();
    await twilioClient.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    return { service: 'twilio', status: 'ok', message: 'Successfully connected to Twilio API.' };
  } catch (error: any) {
    return { service: 'twilio', status: 'error', message: error.message || 'Failed to connect to Twilio API.' };
  }
}

async function checkGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { service: 'gemini', status: 'error', message: 'GEMINI_API_KEY is not configured.' };
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
      ...(hint && { hint }),
    };
  }
}

/**
 * GET /api/health
 * Performs a live health check on critical system dependencies (Database, Twilio).
 * Returns 200 if all systems are operational, 503 if any system fails.
 */
router.get('/api/health', async (_req: Request, res: Response) => {
  const sovereignEnvCheck = checkSovereignEnv();
  const dopplerTokenEnvCheck = checkDopplerTokenEnv();
  const checks = await Promise.all([
    checkDatabase(),
    checkTwilio(),
    checkGemini(),
    Promise.resolve({
      service: 'sovereign_env',
      status: sovereignEnvCheck.status,
      message: sovereignEnvCheck.message,
      ...(sovereignEnvCheck.missing?.length ? { missing: sovereignEnvCheck.missing } : {}),
    }),
    Promise.resolve({
      service: 'doppler_token_env',
      status: dopplerTokenEnvCheck.status,
      message: dopplerTokenEnvCheck.message,
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