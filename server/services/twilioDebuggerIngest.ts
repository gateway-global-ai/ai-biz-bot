/**
 * Twilio Console Debugger webhook — normalize form + JSON Payload for structured logs.
 * @see https://www.twilio.com/docs/usage/troubleshooting/debugging-event-webhooks
 */

import { resolveDebuggerFailureClassId } from "./twilioDebuggerErrorCodeHints";

export type NormalizedTwilioDebuggerEvent = {
  kind: "twilio_debugger_event";
  /** Debugger event SID (`NO…`), same family as Monitor alert identifiers. */
  eventSid: string | null;
  accountSid: string | null;
  parentAccountSid: string | null;
  /** Raw `Level` from Twilio (e.g. ERROR, WARNING). */
  level: string | null;
  /** Normalized severity for downstream policy (`error` | `warning` | unknown passthrough). */
  severity: string | null;
  timestamp: string | null;
  payloadType: string | null;
  errorCode: string | null;
  resourceSid: string | null;
  callSid: string | null;
  streamSid: string | null;
  messageSid: string | null;
  summary: string | null;
  /** Failing webhook URL from payload when present (e.g. TwiML fetch target). */
  payloadWebhookUrl: string | null;
  /** Platform `failure_classes.id` when `error_code` matches `twilio-debugger-error-code-hints.v0.yaml`; else null. */
  failureClassId: string | null;
};

function readString(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function severityFromLevel(level: string | null): string | null {
  if (!level) return null;
  const u = level.toUpperCase();
  if (u === "ERROR") return "error";
  if (u === "WARNING") return "warning";
  return level.toLowerCase();
}

/** Best-effort correlation: Twilio uses CA-prefixed calls, SM or MM messages, MZ media streams (prefix heuristics). */
function enrichResourcePrefixes(
  resourceSid: string | null,
  callSid: string | null,
  streamSid: string | null,
  messageSid: string | null,
): { callSid: string | null; streamSid: string | null; messageSid: string | null } {
  if (!resourceSid) return { callSid, streamSid, messageSid };
  if (resourceSid.startsWith("CA")) return { callSid: callSid ?? resourceSid, streamSid, messageSid };
  if (resourceSid.startsWith("MZ")) return { callSid, streamSid: streamSid ?? resourceSid, messageSid };
  if (resourceSid.startsWith("SM") || resourceSid.startsWith("MM"))
    return { callSid, streamSid, messageSid: messageSid ?? resourceSid };
  return { callSid, streamSid, messageSid };
}

export function normalizeTwilioDebuggerPost(body: Record<string, unknown>): NormalizedTwilioDebuggerEvent {
  const accountSid = readString(body.AccountSid);
  const level = readString(body.Level);
  const eventSid = readString(body.Sid);
  const timestamp = readString(body.Timestamp);
  const parentAccountSid = readString(body.ParentAccountSid);
  const payloadType = readString(body.PayloadType);

  let errorCode: string | null = null;
  let resourceSid: string | null = null;
  let callSid: string | null = null;
  let streamSid: string | null = null;
  let messageSid: string | null = null;
  let summary: string | null = null;
  let payloadWebhookUrl: string | null = null;

  const rawPayload = body.Payload;
  if (typeof rawPayload === "string" && rawPayload.trim()) {
    try {
      const p = JSON.parse(rawPayload) as Record<string, unknown>;
      errorCode = readString(p.error_code);
      resourceSid = readString(p.resource_sid);

      const more = p.more_info as Record<string, unknown> | undefined;
      if (more && typeof more === "object") {
        const msg = more.msg ?? more.Msg;
        if (typeof msg === "string") summary = msg.slice(0, 500);
        const url = more.url;
        if (typeof url === "string") {
          payloadWebhookUrl = url.slice(0, 2000);
          if (!summary) summary = url.slice(0, 500);
        }
      }

      const wb = p.webhook as Record<string, unknown> | undefined;
      const reqObj = wb?.request as Record<string, unknown> | undefined;
      if (reqObj && typeof reqObj === "object") {
        const wUrl = readString(reqObj.url);
        if (wUrl) payloadWebhookUrl = payloadWebhookUrl ?? wUrl.slice(0, 2000);
      }
      const params = reqObj?.parameters as Record<string, unknown> | undefined;
      if (params && typeof params === "object") {
        callSid = readString(params.CallSid) ?? callSid;
        streamSid = readString(params.StreamSid) ?? streamSid;
        messageSid = readString(params.MessageSid) ?? messageSid;
      }
    } catch {
      summary = "debugger_payload_parse_error";
    }
  }

  const enriched = enrichResourcePrefixes(resourceSid, callSid, streamSid, messageSid);
  const failureClassId = resolveDebuggerFailureClassId(errorCode);

  return {
    kind: "twilio_debugger_event",
    eventSid,
    accountSid,
    parentAccountSid,
    level,
    severity: severityFromLevel(level),
    timestamp,
    payloadType,
    errorCode,
    resourceSid,
    callSid: enriched.callSid,
    streamSid: enriched.streamSid,
    messageSid: enriched.messageSid,
    summary,
    payloadWebhookUrl,
    failureClassId,
  };
}
