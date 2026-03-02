import { Router, type Request, type Response } from 'express';
import axios from 'axios';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { getTwilioClient } from '../twilio';
import { checkSovereignEnv, checkDopplerTokenEnv } from '../config/sovereignEnvGuard';

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
    return {
      service: 'gemini',
      status: 'error',
      message: error.response?.data?.error?.message || error.message || 'Failed to connect to Gemini API.',
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

export default router;