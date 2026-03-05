// Twilio Integration Service - uses direct credentials or Replit Connector
import twilio from 'twilio';

let cachedClient: any = null;
let cachedPhoneNumber: string | null = null;

function getCredentials(): { accountSid: string; authToken: string; phoneNumber: string | undefined } {
  // First try direct environment variables
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumber =
    process.env.TWILIO_ACCOUNT_PHONE_NUMBER ||
    process.env.TWILIO_PHONE_NUMBER_BOT ||
    process.env.TWILIO_PHONE_NUMBER;

  if (accountSid && authToken) {
    return {
      accountSid,
      authToken,
      phoneNumber,
    };
  }

  throw new Error('Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN secrets.');
}

/** Returns credentials or null when Twilio is not configured (so callers can return 503 instead of throwing). */
function getCredentialsOrNull(): { accountSid: string; authToken: string; phoneNumber: string | undefined } | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumber =
    process.env.TWILIO_ACCOUNT_PHONE_NUMBER ||
    process.env.TWILIO_PHONE_NUMBER_BOT ||
    process.env.TWILIO_PHONE_NUMBER;
  if (accountSid && authToken) {
    return { accountSid, authToken, phoneNumber };
  }
  return null;
}

export async function getTwilioClient() {
  if (cachedClient) return cachedClient;
  const { accountSid, authToken } = getCredentials();
  cachedClient = twilio(accountSid, authToken);
  return cachedClient;
}

export async function getTwilioFromPhoneNumber(): Promise<string | null> {
  if (cachedPhoneNumber) return cachedPhoneNumber;

  // First try database config (Gateway Global number)
  try {
    const { storage } = await import('./storage');
    const config = await storage.getTelephonyConfig();
    if (config?.phoneNumber) {
      cachedPhoneNumber = config.phoneNumber;
      return config.phoneNumber;
    }
  } catch (e) {
    // Fallback to env vars if storage fails
  }

  // Fallback to environment variables; return null if not configured (no throw)
  const creds = getCredentialsOrNull();
  cachedPhoneNumber = creds?.phoneNumber ?? null;
  return cachedPhoneNumber;
}

export async function getAccountSid() {
  const { accountSid } = getCredentials();
  return accountSid;
}

export interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  locality?: string;
  region?: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
}

export async function searchAvailableNumbers(areaCode: string, country: string = 'US'): Promise<AvailableNumber[]> {
  try {
    const client = await getTwilioClient();
    const numbers = await client.availablePhoneNumbers(country)
      .local
      .list({ areaCode: parseInt(areaCode), limit: 10 });

    return numbers.map((num: any) => ({
      phoneNumber: num.phoneNumber,
      friendlyName: num.friendlyName,
      locality: num.locality,
      region: num.region,
      capabilities: {
        voice: num.capabilities?.voice ?? true,
        sms: num.capabilities?.sms ?? true,
        mms: num.capabilities?.mms ?? false,
      }
    }));
  } catch (error: any) {
    console.error('Error searching numbers:', error);
    throw new Error(`Failed to search numbers: ${error.message}`);
  }
}

export async function provisionPhoneNumber(phoneNumber: string, voiceUrl?: string, smsUrl?: string): Promise<{ sid: string; phoneNumber: string }> {
  try {
    const client = await getTwilioClient();
    const incoming = await client.incomingPhoneNumbers.create({
      phoneNumber: phoneNumber,
      voiceUrl: voiceUrl,
      smsUrl: smsUrl,
      friendlyName: 'AI Agent Trunk'
    });

    return {
      sid: incoming.sid,
      phoneNumber: incoming.phoneNumber
    };
  } catch (error: any) {
    console.error('Error provisioning number:', error);
    throw new Error(`Failed to provision number: ${error.message}`);
  }
}

export interface SubAccountProvisionResult {
  subAccountSid: string;
  subAccountAuthToken: string;
  subAccountFriendlyName: string;
  phoneNumber: string;
  phoneSid: string;
}

/**
 * Creates a new Twilio sub-account for an AI Partner and provisions a local
 * phone number in that sub-account with the Voice URL pre-configured.
 * This is the single-call "Provision Number" flow for Resellers.
 */
export async function createSubAccountAndProvisionNumber(
  partnerName: string,
  areaCode: string,
  voiceWebhookUrl: string,
  country: string = 'US',
): Promise<SubAccountProvisionResult> {
  // Step 1: Create a Twilio sub-account for the AI Partner
  const masterClient = await getTwilioClient();
  const subAccount = await masterClient.api.accounts.create({
    friendlyName: partnerName,
  });

  // Step 2: Build a client scoped to the new sub-account
  const subClient = twilio(subAccount.sid, subAccount.authToken);

  // Step 3: Search for an available local number in the requested area code
  const areaCodeNum = parseInt(areaCode, 10);
  if (Number.isNaN(areaCodeNum)) {
    try {
      await masterClient.api.accounts(subAccount.sid).update({ status: 'closed' });
    } catch (_) { /* best-effort cleanup */ }
    throw new Error(`Invalid area code: ${areaCode}`);
  }
  const available = await subClient.availablePhoneNumbers(country)
    .local
    .list({ areaCode: areaCodeNum, limit: 1 });

  if (!available.length) {
    // Clean up the freshly created sub-account before throwing
    try {
      await masterClient.api.accounts(subAccount.sid).update({ status: 'closed' });
    } catch (_) { /* best-effort cleanup */ }
    throw new Error(`No local numbers available in area code ${areaCode}`);
  }

  // Step 4: Purchase the first available number and wire up the Voice webhook
  const purchased = await subClient.incomingPhoneNumbers.create({
    phoneNumber: available[0].phoneNumber,
    voiceUrl: voiceWebhookUrl,
    voiceMethod: 'POST',
    friendlyName: `${partnerName} AI Line`,
  });

  return {
    subAccountSid: subAccount.sid,
    subAccountAuthToken: subAccount.authToken,
    subAccountFriendlyName: subAccount.friendlyName,
    phoneNumber: purchased.phoneNumber,
    phoneSid: purchased.sid,
  };
}

export async function releasePhoneNumber(phoneSid: string): Promise<boolean> {
  try {
    const client = await getTwilioClient();
    await client.incomingPhoneNumbers(phoneSid).remove();
    return true;
  } catch (error: any) {
    console.error('Error releasing number:', error);
    throw new Error(`Failed to release number: ${error.message}`);
  }
}

export async function updatePhoneNumberWebhooks(phoneSid: string, config: {
  voiceUrl?: string;
  voiceFallbackUrl?: string;
  statusCallback?: string;
  smsUrl?: string;
  smsFallbackUrl?: string;
}): Promise<boolean> {
  try {
    const client = await getTwilioClient();
    await client.incomingPhoneNumbers(phoneSid).update({
      voiceUrl: config.voiceUrl,
      voiceFallbackUrl: config.voiceFallbackUrl,
      statusCallback: config.statusCallback,
      smsUrl: config.smsUrl,
      smsFallbackUrl: config.smsFallbackUrl,
    });
    return true;
  } catch (error: any) {
    console.error('Error updating webhooks:', error);
    throw new Error(`Failed to update webhooks: ${error.message}`);
  }
}

export async function getIncomingPhoneNumbers(): Promise<any[]> {
  try {
    const client = await getTwilioClient();
    const numbers = await client.incomingPhoneNumbers.list({ limit: 20 });
    return numbers.map((num: any) => ({
      sid: num.sid,
      phoneNumber: num.phoneNumber,
      friendlyName: num.friendlyName,
      voiceUrl: num.voiceUrl,
      smsUrl: num.smsUrl,
      capabilities: num.capabilities,
    }));
  } catch (error: any) {
    console.error('Error fetching incoming numbers:', error);
    throw new Error(`Failed to fetch numbers: ${error.message}`);
  }
}

// ── Twilio Verify API ──────────────────────────────────────────────────────────
// Extracts the VA* SID from TWILIO_VERIFY_SERVICE_URL_SID (handles both a raw
// SID string "VA…" and a full URL "https://verify.twilio.com/v2/Services/VA…").

function getVerifyServiceSid(): string {
  const raw = process.env.TWILIO_VERIFY_SERVICE_URL_SID || '';
  const match = raw.match(/(VA[a-f0-9]{32})/i);
  if (match) return match[1];
  if (raw.toUpperCase().startsWith('VA')) return raw;
  throw new Error(
    'TWILIO_VERIFY_SERVICE_URL_SID is not configured or does not contain a valid VA* SID.'
  );
}

/**
 * Send a Twilio Verify SMS to the given E.164 phone number.
 * Twilio generates the code, handles delivery, retry, and expiry.
 * Use checkVerification() to validate the code the user entered.
 */
export async function sendVerification(to: string): Promise<{ status: string; sid: string }> {
  if (process.env.MOCK_TWILIO_SMS === 'true') {
    console.log(`\n--- MOCK VERIFY SEND ---\nTO: ${to}\n------------------------\n`);
    return { status: 'pending', sid: `mock_verify_${Date.now()}` };
  }
  const client = await getTwilioClient();
  const v = await client.verify.v2
    .services(getVerifyServiceSid())
    .verifications.create({ to, channel: 'sms' });
  console.log(`[Verify] Sent | to=${to} | status=${v.status} | sid=${v.sid}`);
  return { status: v.status, sid: v.sid };
}

/**
 * Check a Twilio Verify code entered by the user.
 * Returns { valid: true } when the code is correct and the verification is approved.
 */
export async function checkVerification(
  to: string,
  code: string
): Promise<{ valid: boolean; status: string }> {
  const client = await getTwilioClient();
  const check = await client.verify.v2
    .services(getVerifyServiceSid())
    .verificationChecks.create({ to, code });
  console.log(`[Verify] Check | to=${to} | status=${check.status}`);
  return { valid: check.status === 'approved', status: check.status };
}

// ─────────────────────────────────────────────────────────────────────────────

export async function sendSms(to: string, body: string, from?: string): Promise<{ sid: string }> {
  // Check for mock mode
  if (process.env.MOCK_TWILIO_SMS === 'true') {
    console.log('\n--- MOCK SMS SENT ---');
    console.log(`TO: ${to}`);
    console.log(`BODY: ${body}`);
    console.log('---------------------\n');
    return { sid: `mock_sid_${Date.now()}` };
  }

  try {
    const client = await getTwilioClient();
    const fromNumber = from || await getTwilioFromPhoneNumber();
    
    if (!fromNumber) {
      throw new Error('Twilio from number not configured.');
    }

    const message = await client.messages.create({
      body: body,
      from: fromNumber,
      to: to
    });

    return { sid: message.sid };
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    throw new Error(`Failed to send SMS: ${error.message}`);
  }
}

export async function makeCall(to: string, twimlUrl: string, from?: string): Promise<{ sid: string }> {
  try {
    const client = await getTwilioClient();
    const fromNumber = from || await getTwilioFromPhoneNumber();
    
    const call = await client.calls.create({
      url: twimlUrl,
      from: fromNumber,
      to: to
    });

    return { sid: call.sid };
  } catch (error: any) {
    console.error('Error making call:', error);
    throw new Error(`Failed to make call: ${error.message}`);
  }
}

export async function getCallLogs(limit: number = 50): Promise<any[]> {
  try {
    const client = await getTwilioClient();
    const calls = await client.calls.list({ limit });
    return calls.map((call: any) => ({
      sid: call.sid,
      from: call.from,
      to: call.to,
      status: call.status,
      direction: call.direction,
      duration: call.duration,
      startTime: call.startTime,
      endTime: call.endTime,
    }));
  } catch (error: any) {
    console.error('Error fetching call logs:', error);
    throw new Error(`Failed to fetch call logs: ${error.message}`);
  }
}

export async function getMessageLogs(limit: number = 50): Promise<any[]> {
  try {
    const client = await getTwilioClient();
    const messages = await client.messages.list({ limit });
    return messages.map((msg: any) => ({
      sid: msg.sid,
      from: msg.from,
      to: msg.to,
      body: msg.body,
      status: msg.status,
      direction: msg.direction,
      dateSent: msg.dateSent,
    }));
  } catch (error: any) {
    console.error('Error fetching message logs:', error);
    throw new Error(`Failed to fetch message logs: ${error.message}`);
  }
}

export async function updateCallerIdName(phoneSid: string, callerIdName: string): Promise<boolean> {
  try {
    const client = await getTwilioClient();
    await client.incomingPhoneNumbers(phoneSid).update({
      friendlyName: callerIdName
    });
    return true;
  } catch (error: any) {
    console.error('Error updating caller ID:', error);
    throw new Error(`Failed to update caller ID: ${error.message}`);
  }
}
