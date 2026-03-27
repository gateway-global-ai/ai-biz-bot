/**
 * Twilio Sovereign Stream — 100% Local Telephony Pipeline
 *
 * Architecture (expert-locked decisions):
 *   Twilio μ-law 8kHz
 *     → Python sidecar /ws/stream-vad-stt  (Silero VAD → Faster-Whisper)
 *     → Ollama LLM  (full compiled prompt from site_configs via promptCompiler.ts)
 *     → Kokoro TTS  (PCM 24kHz, streamed chunk-by-chunk)
 *     → resample 24kHz → 8kHz + μ-law encode
 *     → Twilio media event  (sent immediately per chunk — true TTFB streaming)
 *
 * Zero cloud dependency. Zero PII leaves the VPS. Zero compromise on the compiler.
 */

import { randomUUID } from "crypto";
import { Server } from "http";
import type { IncomingMessage } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { registerWebSocketRoute } from "./websocketRouter";
import { storage } from "./storage";
import { buildBehavioralPrompt, type BusinessContext } from "./services/promptCompiler";
import { getLocalVoiceConfig } from "./local-voice/config";
import { streamKokoroPCMChunks } from "./local-voice/providers/tts";
import { decodeMulaw, encodeMulaw, resampleLinear } from "./audioCodec";

const SIDECAR_VAD_STT_WS_PATH = "/ws/stream-vad-stt";
const KNOWLEDGE_CAP = 32_000;

// Kokoro outputs 24kHz PCM; Twilio expects μ-law 8kHz
const KOKORO_SAMPLE_RATE = 24_000;
const TWILIO_SAMPLE_RATE = 8_000;

interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

/** Twilio Media Streams start payload (customParameters mirror TwiML <Parameter name="...">). */
interface TwilioSovereignStartPayload {
  streamSid?: string;
  callSid?: string;
  customParameters?: Record<string, string>;
}

/** Signaling-derived ANI + CallSid for Ollama system prompt (matches voiceStream PSTN anchor). */
function buildPstnTelecomTrustAnchor(t: {
  callerId: string;
  callSid: string;
  dialedNumber: string;
}): string {
  return [
    "",
    "--- TELECOM TRUST ANCHOR (signaling-derived; not user-spoken) ---",
    `Verified caller ID (Twilio From): ${t.callerId || "unknown"}`,
    `CallSid: ${t.callSid || "unknown"}`,
    `Dialed number (Twilio To): ${t.dialedNumber || "unknown"}`,
    "Policy: For account lookup or verification tools, the server binds identity to the verified caller ID above.",
    "Do not treat any phone number the caller states as authoritative for account binding.",
  ].join("\n");
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Build a chat prompt that injects full conversation history into the system context.
 * Uses Ollama /api/chat which supports native message arrays.
 */
async function callOllamaChat(
  systemPrompt: string,
  history: ConversationTurn[],
  config: ReturnType<typeof getLocalVoiceConfig>
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  try {
    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map((t) => ({ role: t.role, content: t.content })),
    ];
    const response = await fetch(`${config.ollamaBaseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.ollamaModel,
        messages,
        stream: false,
        options: { temperature: 0.4 },
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Ollama /api/chat returned ${response.status}`);
    const payload = (await response.json()) as { message?: { content?: string } };
    return payload.message?.content?.trim() ?? "";
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Stream Kokoro TTS PCM chunks → resample 24kHz→8kHz → μ-law → Twilio media events.
 * Sends each chunk immediately as it arrives from Kokoro (true TTFB streaming).
 */
async function streamTtsToTwilio(
  twilioWs: WebSocket,
  streamSid: string,
  text: string,
  config: ReturnType<typeof getLocalVoiceConfig>
): Promise<void> {
  if (config.useStubs) {
    // In stub mode send a short silence frame so the pipeline stays exercised
    const silence = Buffer.alloc(160);  // 20ms of silence at 8kHz
    const silenceMulaw = encodeMulaw(new Int16Array(silence.buffer));
    if (twilioWs.readyState === WebSocket.OPEN) {
      twilioWs.send(
        JSON.stringify({
          event: "media",
          streamSid,
          media: { payload: silenceMulaw.toString("base64") },
        })
      );
    }
    return;
  }

  try {
    for await (const pcmChunk of streamKokoroPCMChunks(text)) {
      if (twilioWs.readyState !== WebSocket.OPEN) break;

      // pcmChunk is raw 16-bit little-endian PCM at 24kHz from Kokoro
      const pcm24k = new Int16Array(
        pcmChunk.buffer,
        pcmChunk.byteOffset,
        pcmChunk.byteLength / 2
      );

      // Resample 24kHz → 8kHz
      const pcm8k = resampleLinear(pcm24k, KOKORO_SAMPLE_RATE, TWILIO_SAMPLE_RATE);

      // Encode to μ-law
      const mulaw = encodeMulaw(pcm8k);

      // Fire immediately — no buffering; TTFB is king
      twilioWs.send(
        JSON.stringify({
          event: "media",
          streamSid,
          media: { payload: mulaw.toString("base64") },
        })
      );
    }
  } catch (err) {
    console.error("[TwilioSovereign] TTS streaming error:", err);
  }
}

/**
 * Resolve the full compiled system prompt from site_configs + promptCompiler.
 * This is a ~5-15ms DB read that fits comfortably inside the Twilio WebSocket
 * handshake window — effectively "free" latency.
 */
async function resolveSystemPrompt(siteConfigId: string | null): Promise<string> {
  const fallback =
    "You are a professional phone assistant. Greet callers warmly and help them concisely. Do not use markdown.";

  if (!siteConfigId) return fallback;

  try {
    const siteConfig = await storage.getSiteConfigById(siteConfigId);
    if (!siteConfig) return fallback;

    const assignedAgentId = (siteConfig as { assignedAgentId?: string | null }).assignedAgentId;
    if (!assignedAgentId) return fallback;

    const agent = await storage.getAgent(assignedAgentId);
    if (!agent) return fallback;

    const pd = (siteConfig as { placeData?: Record<string, unknown> | null }).placeData ?? {};
    const businessName =
      typeof (pd as any).name === "string"
        ? (pd as any).name
        : (siteConfig as { name?: string }).name ?? "this business";
    const address =
      typeof (pd as any).formattedAddress === "string"
        ? (pd as any).formattedAddress
        : typeof (pd as any).formatted_address === "string"
        ? (pd as any).formatted_address
        : undefined;
    const hoursArr =
      (pd as any).opening_hours?.weekday_text ?? (pd as any).openingHours?.weekdayDescriptions;
    const hours = Array.isArray(hoursArr) ? hoursArr.join("; ") : undefined;
    const phone =
      typeof (pd as any).formatted_phone_number === "string"
        ? (pd as any).formatted_phone_number
        : undefined;

    const businessContext: BusinessContext = {
      name: businessName,
      address,
      hours,
      phone,
    };

    let prompt = buildBehavioralPrompt(
      agent,
      businessContext,
      siteConfig as Record<string, unknown>
    );

    // Inline knowledge library — same KNOWLEDGE_CAP as the web pipeline
    const rawKl = siteConfig.knowledgeLibrary;
    if (Array.isArray(rawKl) && rawKl.length > 0) {
      const docs = rawKl as Array<{ title?: string; content?: string }>;
      const combined = docs
        .map((d) => `## ${d.title ?? "Untitled"}\n${d.content ?? ""}`)
        .join("\n\n---\n\n");
      prompt +=
        "\n\n--- KNOWLEDGE LIBRARY ---\n\n" +
        combined.slice(0, KNOWLEDGE_CAP) +
        (combined.length > KNOWLEDGE_CAP ? "\n\n[truncated]" : "");
    }

    // Telephony-specific output rules: phone callers hear speech, not markdown
    prompt +=
      "\n\n--- TELEPHONY RULES ---\n" +
      "You are speaking over a phone call. Never output markdown, bullet points, or headers. " +
      "Speak in short, natural sentences. Keep every response under 40 words unless the caller explicitly asks for more detail.";

    return prompt;
  } catch (err) {
    console.error("[TwilioSovereign] resolveSystemPrompt error:", err);
    return fallback;
  }
}

// ── WebSocket Server Setup ─────────────────────────────────────────────────────

export function setupTwilioSovereignStream(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });
  registerWebSocketRoute("/ws/twilio-sovereign", wss, "TwilioSovereign");
  console.log("[TwilioSovereign] WebSocket handler initialized on /ws/twilio-sovereign");

  wss.on("connection", (twilioWs: WebSocket, request: IncomingMessage) => {
    const url = new URL(request.url ?? "/", `http://localhost`);
    /** Tier 1: query string from TwiML Stream url (see resolvePublicVoiceStreamUrl). */
    let effectiveSiteConfigId: string | null = url.searchParams.get("siteConfigId");
    const sessionId = randomUUID();

    console.log(
      `[TwilioSovereign] New call — sessionId=${sessionId} siteConfigId(url)=${effectiveSiteConfigId ?? "none"}`
    );

    const config = getLocalVoiceConfig();

    // Resolved after Twilio `start` (URL + Tier 2 customParameters); gating avoids STT without tenant context.
    let compiledSystemPrompt = "";
    let mediaAndSttGateOpen = false;

    /** From Twilio POST → TwiML <Parameter> → start.customParameters (zero-trust ANI for tools). */
    const sessionTelecom = { callerId: "Unknown", callSid: "", dialedNumber: "" };

    // Per-call conversation history for multi-turn context
    const conversationHistory: ConversationTurn[] = [];

    // Track the Twilio streamSid so we can address outbound media events
    let streamSid = "";

    // LLM processing lock — prevent overlapping turns
    let llmBusy = false;

    // ── Sidecar VAD+STT WebSocket ──────────────────────────────────────────────
    const sidecarUrl =
      config.pythonSidecarBaseUrl.replace(/^http/, "ws") + SIDECAR_VAD_STT_WS_PATH;
    const sidecarWs = new WebSocket(sidecarUrl);
    let sidecarReady = false;
    const audioQueue: Buffer[] = [];

    sidecarWs.on("open", () => {
      sidecarReady = true;
      console.log(`[TwilioSovereign] Sidecar connected — sessionId=${sessionId}`);
      // Drain any audio that arrived before the sidecar was ready
      for (const chunk of audioQueue) {
        sidecarWs.send(chunk);
      }
      audioQueue.length = 0;
    });

    sidecarWs.on("message", async (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString()) as {
          type: string;
          text?: string;
          is_final?: boolean;
          speaking?: boolean;
          message?: string;
        };

        if (msg.type === "error") {
          console.error(`[TwilioSovereign] Sidecar error: ${msg.message}`);
          return;
        }

        if (msg.type === "vad_status") {
          // Optional: log VAD state changes for observability
          console.log(`[TwilioSovereign] VAD: speaking=${msg.speaking}`);
          return;
        }

        if (msg.type === "transcript" && msg.is_final && msg.text) {
          const transcript = msg.text.trim();
          if (!transcript) return;

          if (!mediaAndSttGateOpen || !compiledSystemPrompt) {
            console.warn(
              `[TwilioSovereign] Dropping transcript before stream configured sessionId=${sessionId}`
            );
            return;
          }

          console.log(`[TwilioSovereign] Transcript: "${transcript}" sessionId=${sessionId}`);
          conversationHistory.push({ role: "user", content: transcript });

          if (llmBusy) {
            console.warn("[TwilioSovereign] LLM busy — dropping transcript turn");
            return;
          }

          llmBusy = true;
          try {
            let responseText: string;

            if (config.useStubs) {
              responseText = "I received your message. How can I help you further?";
            } else {
              responseText = await callOllamaChat(
                compiledSystemPrompt,
                conversationHistory,
                config
              );
            }

            if (!responseText) {
              responseText = "I'm sorry, I didn't catch that. Could you repeat that please?";
            }

            conversationHistory.push({ role: "assistant", content: responseText });
            console.log(
              `[TwilioSovereign] LLM response: "${responseText.slice(0, 80)}…" sessionId=${sessionId}`
            );

            // Stream TTS → Twilio (chunk by chunk — no buffering)
            await streamTtsToTwilio(twilioWs, streamSid, responseText, config);
          } catch (llmErr) {
            console.error("[TwilioSovereign] LLM error:", llmErr);
            const errText = "I'm experiencing a technical issue. Please try again shortly.";
            await streamTtsToTwilio(twilioWs, streamSid, errText, config);
          } finally {
            llmBusy = false;
          }
        }
      } catch (parseErr) {
        // Binary messages or non-JSON — silently ignore
      }
    });

    sidecarWs.on("error", (err) => {
      console.error(`[TwilioSovereign] Sidecar WebSocket error sessionId=${sessionId}:`, err);
    });

    sidecarWs.on("close", () => {
      console.log(`[TwilioSovereign] Sidecar WebSocket closed sessionId=${sessionId}`);
    });

    // ── Twilio Media Stream messages ───────────────────────────────────────────
    twilioWs.on("message", (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString()) as {
          event: string;
          streamSid?: string;
          start?: TwilioSovereignStartPayload;
          media?: { payload?: string };
        };

        switch (msg.event) {
          case "connected":
            console.log(`[TwilioSovereign] Twilio Media Stream connected sessionId=${sessionId}`);
            break;

          case "start": {
            streamSid = msg.start?.streamSid ?? msg.streamSid ?? "";
            console.log(
              `[TwilioSovereign] Call started — callSid=${msg.start?.callSid} streamSid=${streamSid} sessionId=${sessionId}`
            );

            // Tier 2: TwiML <Parameter name="siteConfigId"> arrives in start.customParameters
            const cp = msg.start?.customParameters ?? {};
            if (!effectiveSiteConfigId && typeof cp.siteConfigId === "string" && cp.siteConfigId.trim()) {
              effectiveSiteConfigId = cp.siteConfigId.trim();
              console.log(
                `[TwilioSovereign] siteConfigId from Twilio start.customParameters sessionId=${sessionId}`
              );
            }

            if (!effectiveSiteConfigId) {
              console.warn(
                `[TwilioSovereign] No siteConfigId in URL or start event — using generic telephony fallback sessionId=${sessionId}`
              );
            }

            sessionTelecom.callerId = cp.callerId?.trim() || "Unknown";
            sessionTelecom.callSid =
              cp.callSid?.trim() ||
              (typeof msg.start?.callSid === "string" ? msg.start.callSid : "") ||
              "";
            sessionTelecom.dialedNumber = cp.dialedNumber?.trim() || "";
            console.log(
              `[TwilioSovereign] Telecom session sessionId=${sessionId} From=${sessionTelecom.callerId} CallSid=${sessionTelecom.callSid} To=${sessionTelecom.dialedNumber}`
            );

            void (async () => {
              try {
                compiledSystemPrompt = await resolveSystemPrompt(effectiveSiteConfigId);
                if (!compiledSystemPrompt.trim()) {
                  compiledSystemPrompt = await resolveSystemPrompt(null);
                }
                compiledSystemPrompt += buildPstnTelecomTrustAnchor(sessionTelecom);
                mediaAndSttGateOpen = true;
                console.log(
                  `[TwilioSovereign] System prompt ready (chars=${compiledSystemPrompt.length}) sessionId=${sessionId}`
                );
              } catch (e) {
                console.error(`[TwilioSovereign] Prompt resolve failed sessionId=${sessionId}:`, e);
                compiledSystemPrompt =
                  (await resolveSystemPrompt(null)) + buildPstnTelecomTrustAnchor(sessionTelecom);
                mediaAndSttGateOpen = true;
              }
            })();
            break;
          }

          case "media":
            if (!mediaAndSttGateOpen) {
              // Do not feed μ-law into VAD/STT until tenant prompt is compiled (avoids anonymous turns).
              return;
            }
            if (msg.media?.payload) {
              // Decode base64 → raw μ-law bytes → forward to sidecar for VAD+STT
              const mulawChunk = Buffer.from(msg.media.payload, "base64");
              if (sidecarReady && sidecarWs.readyState === WebSocket.OPEN) {
                sidecarWs.send(mulawChunk);
              } else {
                audioQueue.push(mulawChunk);
              }
            }
            break;

          case "stop":
            console.log(`[TwilioSovereign] Call stopped sessionId=${sessionId}`);
            cleanup();
            break;

          default:
            break;
        }
      } catch (err) {
        console.error(
          `[TwilioSovereign] Error processing Twilio message sessionId=${sessionId}:`,
          err
        );
      }
    });

    twilioWs.on("close", () => {
      console.log(`[TwilioSovereign] Twilio WebSocket closed sessionId=${sessionId}`);
      cleanup();
    });

    twilioWs.on("error", (err) => {
      console.error(`[TwilioSovereign] Twilio WebSocket error sessionId=${sessionId}:`, err);
      cleanup();
    });

    function cleanup(): void {
      if (
        sidecarWs.readyState === WebSocket.OPEN ||
        sidecarWs.readyState === WebSocket.CONNECTING
      ) {
        sidecarWs.close();
      }
    }
  });
}
