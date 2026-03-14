import type { WebSocket } from "ws";

import { getLocalVoiceConfig } from "./config";
import { executeLocalLLM, type LocalLlmResult } from "./providers/llm";
import {
  executeFasterWhisper,
  type LocalTranscriptionResult,
} from "./providers/stt";
import { streamKokoroTTS } from "./providers/tts";

type LocalPipelineState =
  | "IDLE"
  | "STT_PROCESSING"
  | "LLM_THINKING"
  | "TTS_BUFFERING"
  | "ERROR";

export class LocalVoiceOrchestrator {
  private readonly ws: WebSocket;
  private allowedTools: string[] = [];
  private readonly config = getLocalVoiceConfig();

  constructor(ws: WebSocket) {
    this.ws = ws;
  }

  public setAllowedTools(tools: string[]) {
    this.allowedTools = tools;
    console.log(
      `[LocalVoiceOrchestrator] Bound to V1 tools: ${this.allowedTools.join(", ")}`
    );
  }

  public async executePipeline(audioData: Buffer) {
    try {
      this.updateState("STT_PROCESSING");
      const transcription = this.config.useStubs
        ? await this.stubSTT(audioData)
        : await executeFasterWhisper(audioData);
      console.log(
        `[LocalVoiceOrchestrator] Transcribed: "${transcription.text}" (${transcription.processing_ms}ms, model=${transcription.model})`
      );

      this.updateState("LLM_THINKING");
      const systemContext = `
You are a system operator.
Allowed Tool: mutate_chaos_settings
Schema: { "enabled": boolean, "drop_rate": number, "max_latency_ms": number }
Example: { "enabled": true, "drop_rate": 0.15, "max_latency_ms": 2500 }
Rule: If you cannot populate required fields exactly, return plain text instead of a tool call.
      `.trim();

      const llmResult = this.config.useStubs
        ? await this.stubLLM(transcription.text, systemContext)
        : await executeLocalLLM(
            transcription.text,
            systemContext,
            this.allowedTools
          );

      if (llmResult.isToolCall) {
        if (this.validateTool(llmResult.toolName, llmResult.args)) {
          this.ws.send(
            JSON.stringify({
              type: "tool_call",
              tool_name: llmResult.toolName,
              args: llmResult.args,
            })
          );

          this.updateState("TTS_BUFFERING");
          if (this.config.useStubs) {
            await this.stubTTS("Applying runtime settings now.");
          } else {
            await streamKokoroTTS(this.ws, "Applying runtime settings now.");
          }
        } else {
          this.ws.send(
            JSON.stringify({
              type: "tool_drop",
              tool_name: llmResult.toolName,
              reason: "Malformed JSON schema from local LLM",
            })
          );

          this.updateState("TTS_BUFFERING");
          if (this.config.useStubs) {
            await this.stubTTS(
              "I understood the request, but encountered a schema error executing the macro."
            );
          } else {
            await streamKokoroTTS(
              this.ws,
              "I understood the request, but encountered a schema error executing the macro."
            );
          }
        }
      } else {
        this.updateState("TTS_BUFFERING");
        if (this.config.useStubs) {
          await this.stubTTS(llmResult.text ?? "No response generated.");
        } else {
          await streamKokoroTTS(
            this.ws,
            llmResult.text ?? "No response generated."
          );
        }
      }

      this.ws.send(JSON.stringify({ type: "turn_complete" }));
      this.updateState("IDLE");
    } catch (error) {
      console.error("[LocalVoiceOrchestrator] Pipeline Error:", error);
      this.updateState("ERROR");
      this.ws.send(
        JSON.stringify({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unknown local voice pipeline error.",
        })
      );
    }
  }

  private updateState(state: LocalPipelineState) {
    this.ws.send(JSON.stringify({ type: "pipeline_state", state }));
  }

  private validateTool(name?: string, args?: Record<string, unknown>): boolean {
    if (name !== "mutate_chaos_settings") return false;
    if (!this.allowedTools.includes(name)) return false;
    if (typeof args?.enabled !== "boolean") return false;
    if (typeof args?.drop_rate !== "number") return false;
    if (typeof args?.max_latency_ms !== "number") return false;
    return true;
  }

  private async stubSTT(_audio: Buffer) {
    return new Promise<LocalTranscriptionResult>((resolve) =>
      setTimeout(
        () =>
          resolve({
            text: "Turn on the chaos engine.",
            language: "en",
            duration_ms: 800,
            processing_ms: 600,
            model: "stub-faster-whisper",
            audio_bytes: _audio.length,
            language_probability: 0.99,
          }),
        600
      )
    );
  }

  private async stubLLM(_transcript: string, _context: string) {
    return new Promise<LocalLlmResult>((resolve) =>
      setTimeout(
        () =>
          resolve({
            isToolCall: true,
            toolName: "mutate_chaos_settings",
            args: { enabled: true, drop_rate: 0.15, max_latency_ms: 2500 },
          }),
        1000
      )
    );
  }

  private async stubTTS(_text: string) {
    return new Promise<void>((resolve) =>
      setTimeout(() => {
        this.ws.send(
          JSON.stringify({
            type: "audio_output",
            data: "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
          })
        );
        resolve();
      }, 800)
    );
  }
}
