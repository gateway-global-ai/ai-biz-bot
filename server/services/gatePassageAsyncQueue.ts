/**
 * Async batch flush for gate passage events — avoids synchronous DB on voice/WebSocket hot path.
 * Voice connect events are enqueued from geminiVoice setup; flushed on interval or batch size.
 */

import type { IncomingMessage } from "http";
import { hashClientFingerprintFromIncomingMessage } from "../utils/clientFingerprint";
import { recordVerificationGatePassage } from "./verificationGateTransparency";

type PendingVoiceConnect = {
  siteConfigId: string;
  voiceSessionId: string;
  transport: "websocket";
  clientFingerprintHash: string;
};

const queue: PendingVoiceConnect[] = [];
let flushScheduled = false;
const BATCH = 50;
const FLUSH_MS = 2_000;

function scheduleFlush(): void {
  if (flushScheduled) return;
  flushScheduled = true;
  setTimeout(() => {
    flushScheduled = false;
    void flushVoiceConnectQueue();
  }, FLUSH_MS).unref?.();
}

async function flushVoiceConnectQueue(): Promise<void> {
  if (queue.length === 0) return;
  const batch = queue.splice(0, BATCH);
  for (const item of batch) {
    await recordVerificationGatePassage({
      siteConfigId: item.siteConfigId,
      route: "/ws/gemini-live",
      httpMethod: "WEBSOCKET",
      passageKind: "voice_session_connect",
      authState: "unknown",
      installationKeyId: null,
      httpStatus: 200,
      clientFingerprintHash: item.clientFingerprintHash,
      durationMs: 0,
      rateLimited: false,
      metadata: {
        voiceSessionId: item.voiceSessionId,
        transport: item.transport,
      },
    });
  }
}

/** Fire-and-forget: enqueue voice session connect for async DB write (not on audio path). */
export function enqueueVoiceSessionConnectEvent(params: {
  siteConfigId: string;
  voiceSessionId: string;
  transport: "websocket";
  incomingMessage: IncomingMessage;
}): void {
  const fp = hashClientFingerprintFromIncomingMessage(params.incomingMessage, params.siteConfigId);
  queue.push({
    siteConfigId: params.siteConfigId,
    voiceSessionId: params.voiceSessionId,
    transport: params.transport,
    clientFingerprintHash: fp,
  });
  if (queue.length >= BATCH) {
    void flushVoiceConnectQueue();
  } else {
    scheduleFlush();
  }
}

setInterval(() => {
  void flushVoiceConnectQueue();
}, FLUSH_MS).unref?.();
