import { WebSocket, WebSocketServer } from "ws";
import type { Server, IncomingMessage } from "http";

import { registerWebSocketRoute } from "./websocketRouter";

const GEMINI_LIVE_WS_BASE =
  process.env.GEMINI_WS_URL ||
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

const WS_PATH = "/ws/os-live";

interface ClientSetupEnvelope {
  setup?: {
    model?: string;
    generation_config?: Record<string, unknown>;
    tools?: unknown[];
    system_instruction?: {
      parts?: Array<{ text?: string }>;
    };
  };
}

function getServerInstruction(): string {
  return (
    process.env.OS_LIVE_PROXY_SYSTEM_INSTRUCTION?.trim() ||
    "You are operating inside the Gateway Global AI Sovereign OS execution plane. Follow the governed tool declarations supplied by the client session and keep responses aligned with the active OS surface."
  );
}

function mergeSetupPayload(clientEnvelope: ClientSetupEnvelope) {
  const clientSetup = clientEnvelope.setup ?? {};
  const serverInstruction = getServerInstruction();
  const clientInstruction =
    clientSetup.system_instruction?.parts
      ?.map((part) => part.text?.trim())
      .filter((text): text is string => Boolean(text))
      .join("\n\n") ?? "";

  const mergedInstruction = [serverInstruction, clientInstruction]
    .filter(Boolean)
    .join("\n\n");

  return {
    setup: {
      model: process.env.GEMINI_MODEL_ID || clientSetup.model,
      generation_config: clientSetup.generation_config ?? {
        response_modalities: ["AUDIO"],
      },
      ...(Array.isArray(clientSetup.tools) ? { tools: clientSetup.tools } : {}),
      system_instruction: {
        parts: [{ text: mergedInstruction }],
      },
    },
  };
}

function normalizeOutboundMessage(message: unknown): unknown {
  if (!message || typeof message !== "object") {
    return message;
  }

  const record = message as Record<string, unknown>;
  if (record.realtimeInput && typeof record.realtimeInput === "object") {
    const realtimeInput = record.realtimeInput as Record<string, unknown>;
    const normalized = {
      ...record,
      realtime_input: {
        ...realtimeInput,
        ...(Array.isArray(realtimeInput.mediaChunks)
          ? { media_chunks: realtimeInput.mediaChunks }
          : {}),
      },
    };
    delete (normalized as Record<string, unknown>).realtimeInput;
    return normalized;
  }

  return message;
}

export function setupOSLiveProxy(_server: Server): void {
  const wss = new WebSocketServer({ noServer: true });
  registerWebSocketRoute(WS_PATH, wss, "OSLiveProxy");

  wss.on("connection", (clientWs: WebSocket, _request: IncomingMessage) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[OSLiveProxy] GEMINI_API_KEY not set");
      clientWs.close(1011, "Server configuration error");
      return;
    }

    const googleUrl = `${GEMINI_LIVE_WS_BASE}${GEMINI_LIVE_WS_BASE.includes("?") ? "&" : "?"}key=${apiKey}`;
    const googleWs = new WebSocket(googleUrl);

    let isGoogleOpen = false;
    let setupForwarded = false;
    let clientSetupBuffer: ClientSetupEnvelope | null = null;
    const messageQueue: Buffer[] = [];

    const flushQueue = () => {
      while (isGoogleOpen && setupForwarded && messageQueue.length > 0) {
        const next = messageQueue.shift();
        if (!next) break;
        processClientMessage(next);
      }
    };

    const sendMergedSetup = () => {
      if (!isGoogleOpen || setupForwarded || !clientSetupBuffer) {
        return;
      }

      try {
        const merged = mergeSetupPayload(clientSetupBuffer);
        googleWs.send(JSON.stringify(merged));
        setupForwarded = true;
        console.log("[OSLiveProxy] Forwarded merged client/server setup frame");
        flushQueue();
      } catch (error) {
        console.error("[OSLiveProxy] Failed to merge setup frame:", error);
        clientWs.close(1011, "OS live setup merge failed");
      }
    };

    const processClientMessage = (data: Buffer) => {
      try {
        const raw = data.toString();
        const message = JSON.parse(raw) as Record<string, unknown>;

        if (message.setup) {
          clientSetupBuffer = message as ClientSetupEnvelope;
          sendMergedSetup();
          return;
        }

        if (!setupForwarded) {
          messageQueue.push(data);
          return;
        }

        googleWs.send(JSON.stringify(normalizeOutboundMessage(message)));
      } catch (error) {
        console.error("[OSLiveProxy] Error processing client message:", error);
      }
    };

    googleWs.on("open", () => {
      isGoogleOpen = true;
      console.log("[OSLiveProxy] Connected to Gemini upstream");
      sendMergedSetup();
    });

    googleWs.on("message", (data: Buffer | string) => {
      const payload = typeof data === "string" ? data : data.toString();
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(payload);
      }
    });

    googleWs.on("error", (error) => {
      console.error("[OSLiveProxy] Upstream Gemini error:", error);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            type: "error",
            message: `OS live upstream error: ${(error as Error).message}`,
          })
        );
      }
    });

    googleWs.on("close", (code, reason) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close(code, reason.toString());
      }
    });

    clientWs.on("message", (data: Buffer, isBinary: boolean) => {
      if (isBinary) {
        console.warn("[OSLiveProxy] Ignoring binary frame from client");
        return;
      }

      if (!isGoogleOpen) {
        messageQueue.push(data);
        return;
      }

      processClientMessage(data);
    });

    clientWs.on("close", () => {
      if (
        googleWs.readyState === WebSocket.OPEN ||
        googleWs.readyState === WebSocket.CONNECTING
      ) {
        googleWs.close();
      }
    });

    clientWs.on("error", () => {
      if (
        googleWs.readyState === WebSocket.OPEN ||
        googleWs.readyState === WebSocket.CONNECTING
      ) {
        googleWs.close(1011, "Client error");
      }
    });
  });

  console.log(`[OSLiveProxy] WebSocket proxy registered at ${WS_PATH}`);
}
