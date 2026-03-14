import type { Server } from "http";
import { WebSocket, WebSocketServer } from "ws";

import { LocalVoiceOrchestrator } from "./local-voice/LocalVoiceOrchestrator";
import { registerWebSocketRoute } from "./websocketRouter";

const WS_PATH = "/ws/local-voice";

export function handleLocalVoiceConnection(ws: WebSocket) {
  console.log("[LocalVoiceProxy] Mission Control connected.");

  const orchestrator = new LocalVoiceOrchestrator(ws);
  let pcmBuffer: Buffer[] = [];

  ws.on("message", async (rawMessage, isBinary) => {
    if (isBinary) {
      console.warn("[LocalVoiceProxy] Ignoring binary message from client.");
      return;
    }

    try {
      const event = JSON.parse(rawMessage.toString()) as {
        type: string;
        allowed_tools?: string[];
        data?: string;
      };

      switch (event.type) {
        case "setup":
          orchestrator.setAllowedTools(event.allowed_tools ?? []);
          break;
        case "audio_input":
          if (typeof event.data === "string") {
            pcmBuffer.push(Buffer.from(event.data, "base64"));
          }
          break;
        case "turn_complete": {
          const fullAudioBuffer = Buffer.concat(pcmBuffer);
          pcmBuffer = [];
          await orchestrator.executePipeline(fullAudioBuffer);
          break;
        }
        case "context_sync":
          // V1 sandbox ignores outbound sync frames from the control plane.
          break;
        default:
          console.warn(
            `[LocalVoiceProxy] Unknown client event type: ${event.type}`
          );
      }
    } catch (error) {
      console.error("[LocalVoiceProxy] Message parsing error:", error);
    }
  });

  ws.on("close", () => {
    console.log("[LocalVoiceProxy] Mission Control disconnected.");
  });
}

export function setupLocalVoiceProxy(_server: Server): void {
  const wss = new WebSocketServer({ noServer: true });
  registerWebSocketRoute(WS_PATH, wss, "LocalVoiceProxy");
  wss.on("connection", (ws) => {
    handleLocalVoiceConnection(ws);
  });
  console.log(`[LocalVoiceProxy] WebSocket proxy registered at ${WS_PATH}`);
}
