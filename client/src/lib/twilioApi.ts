/**
 * Client for Gateway Global AI Twilio provisioning API.
 * Set VITE_TELEPHONY_API_URL to your backend (e.g. http://localhost:3002) to use live provisioning.
 * When unset, uses current origin.
 */

const BASE = import.meta.env.VITE_TELEPHONY_API_URL
  ? import.meta.env.VITE_TELEPHONY_API_URL.replace(/\/$/, '')
  : '';

export interface AvailableNumberDto {
  phoneNumber: string;
  friendlyName: string;
  locality?: string;
  region?: string;
}

export interface OwnedNumberDto {
  sid: string;
  phoneNumber: string;
  friendlyName: string;
  voiceUrl?: string | null;
  voiceFallbackUrl?: string | null;
  smsUrl?: string | null;
  smsFallbackUrl?: string | null;
  statusCallback?: string | null;
}

export function isTelephonyApiConfigured(): boolean {
  return true; // Always configured since we use same origin
}

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json();
}

/** Search available US numbers by area code (e.g. "415"). */
export async function searchAvailable(areaCode: string, limit = 20): Promise<{ numbers: AvailableNumberDto[] }> {
  const params = new URLSearchParams({ areaCode: areaCode.replace(/\D/g, '').slice(0, 3), limit: String(limit) });
  return fetchJson<{ numbers: AvailableNumberDto[] }>(`/api/twilio/numbers/available?${params}`);
}

/** List numbers already owned by the account. */
export async function listOwned(): Promise<{ numbers: OwnedNumberDto[] }> {
  return fetchJson<{ numbers: OwnedNumberDto[] }>('/api/twilio/numbers');
}

/** Buy a number (E.164 or 10-digit US). */
export async function buy(phoneNumber: string, friendlyName?: string): Promise<{ sid: string; phoneNumber: string; friendlyName: string }> {
  return fetchJson('/api/twilio/numbers', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, friendlyName }),
  });
}

/** Update webhooks for an owned number. */
export async function updateWebhooks(
  phoneSid: string,
  webhooks: {
    voiceUrl?: string;
    voiceFallbackUrl?: string;
    smsUrl?: string;
    smsFallbackUrl?: string;
    statusCallback?: string;
    friendlyName?: string;
  }
): Promise<OwnedNumberDto> {
  return fetchJson(`/api/twilio/numbers/${encodeURIComponent(phoneSid)}`, {
    method: 'PATCH',
    body: JSON.stringify(webhooks),
  });
}

/** Release (delete) an owned number. */
export async function release(phoneSid: string): Promise<{ ok: true }> {
  return fetchJson(`/api/twilio/numbers/${encodeURIComponent(phoneSid)}`, { method: 'DELETE' });
}

/** Configure all owned numbers with Gateway Global AI webhooks. */
export async function configureAllWebhooks(baseUrl = 'https://twilio.gatewayglobal.ai'): Promise<{
  message: string;
  baseUrl: string;
  results: Array<{ phoneNumber: string; success: boolean; error?: string }>;
}> {
  return fetchJson('/api/telephony/configure-webhooks', {
    method: 'POST',
    body: JSON.stringify({ baseUrl }),
  });
}
