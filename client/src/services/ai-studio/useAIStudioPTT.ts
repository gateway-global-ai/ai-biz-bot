/**
 * AI Studio PTT hook — WebSocket + Web Audio for Push/Release and playback.
 * Sample rates and WS URL come from server config; no hardcoded keys or model names.
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { resolvePlatformUrl, resolvePlatformWs } from "@/sdk/platformConfig";

export type PTTStatus = "idle" | "connecting" | "ready" | "pushing" | "playing" | "error";

export interface AIStudioPTTConfig {
  inputSampleRate: number;
  outputSampleRate: number;
}

function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function useAIStudioPTT() {
  const [status, setStatus] = useState<PTTStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<AIStudioPTTConfig | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const nextPlayTimeRef = useRef(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const fetchConfig = useCallback(async (): Promise<AIStudioPTTConfig> => {
    const base = resolvePlatformUrl("/api/ai-studio/config");
    const res = await fetch(base);
    if (!res.ok) throw new Error("Failed to fetch AI Studio config");
    const data = await res.json();
    const cfg = {
      inputSampleRate: Number(data.inputSampleRate) || 16000,
      outputSampleRate: Number(data.outputSampleRate) || 24000,
    };
    setConfig(cfg);
    return cfg;
  }, []);

  const connect = useCallback(
    async (sessionToken: string) => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        setStatus("ready");
        return;
      }
      setError(null);
      setStatus("connecting");
      const cfg = config ?? (await fetchConfig());
      const wsPath = `/ws/ai-studio-ptt?token=${encodeURIComponent(sessionToken)}`;
      const wsUrl = resolvePlatformWs(wsPath);

      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        // #region agent log
        fetch('http://localhost:7243/ingest/6f0f5ac2-b8b0-4db0-890a-ab1f1e0dff06',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useAIStudioPTT.ts:wsOpen',message:'Client WS open',data:{},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);
          if (msg.type === "server_ready") {
            // #region agent log
            fetch('http://localhost:7243/ingest/6f0f5ac2-b8b0-4db0-890a-ab1f1e0dff06',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useAIStudioPTT.ts:serverReady',message:'Got server_ready',data:{},timestamp:Date.now(),hypothesisId:'H2,H3'})}).catch(()=>{});
            // #endregion
            if (!outputContextRef.current) {
              outputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: cfg.outputSampleRate,
              });
            }
            setStatus("ready");
            return;
          }
          if (msg.type === "error") {
            setError(msg.message ?? "Unknown error");
            setStatus("error");
            return;
          }

          const serverContent = msg.server_content ?? msg.serverContent;
          const modelTurn = serverContent?.model_turn ?? serverContent?.modelTurn;
          const parts = modelTurn?.parts;
          if (parts && outputContextRef.current) {
            // #region agent log
            fetch('http://localhost:7243/ingest/6f0f5ac2-b8b0-4db0-890a-ab1f1e0dff06',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useAIStudioPTT.ts:audioChunk',message:'Playing audio',data:{partCount:parts?.length,outCtxState:outputContextRef.current?.state},timestamp:Date.now(),hypothesisId:'H3,H4'})}).catch(()=>{});
            // #endregion
            setStatus("playing");
            const outCtx = outputContextRef.current;
            for (const part of parts) {
              const inlineData = part.inline_data ?? part.inlineData;
              if (inlineData?.data) {
                const bytes = decodeBase64(inlineData.data);
                const dataView = new DataView(bytes.buffer);
                const frameCount = bytes.length / 2;
                const buffer = outCtx.createBuffer(1, frameCount, cfg.outputSampleRate);
                const channel = buffer.getChannelData(0);
                for (let i = 0; i < frameCount; i++) {
                  channel[i] = dataView.getInt16(i * 2, true) / 32768;
                }
                const source = outCtx.createBufferSource();
                source.buffer = buffer;
                source.connect(outCtx.destination);
                const start = Math.max(nextPlayTimeRef.current, outCtx.currentTime);
                source.start(start);
                nextPlayTimeRef.current = start + buffer.duration;
                activeSourcesRef.current.add(source);
                source.onended = () => activeSourcesRef.current.delete(source);
              }
            }
            // Reset to ready after a short delay (playback may still be queued)
            setTimeout(() => setStatus((s) => (s === "playing" ? "ready" : s)), 100);
          }
        } catch (_) {
          // Non-JSON or unknown message
        }
      };

      ws.onclose = (e) => {
        // #region agent log
        fetch('http://localhost:7243/ingest/6f0f5ac2-b8b0-4db0-890a-ab1f1e0dff06',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useAIStudioPTT.ts:wsClose',message:'Client WS closed',data:{code:e?.code,reason:e?.reason},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        socketRef.current = null;
        setStatus("idle");
      };

      ws.onerror = () => {
        fetch('http://localhost:7243/ingest/6f0f5ac2-b8b0-4db0-890a-ab1f1e0dff06',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useAIStudioPTT.ts:wsError',message:'Client WS error',data:{},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
        setError("WebSocket error");
        setStatus("error");
      };
    },
    [config, fetchConfig]
  );

  const startPush = useCallback(async () => {
    const cfg = config ?? (await fetchConfig());
    const ws = socketRef.current;
    if (ws?.readyState !== WebSocket.OPEN) {
      setError("Not connected");
      setStatus("error");
      return;
    }
    setStatus("pushing");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: cfg.inputSampleRate,
      });
      inputContextRef.current = ctx;
      await ctx.resume();

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 256;
      analyserNode.smoothingTimeConstant = 0.8;
      analyserRef.current = analyserNode;
      setAnalyser(analyserNode);

      const workletPath = "/clear-voice-processor.js";
      await ctx.audioWorklet.addModule(workletPath);
      const workletNode = new AudioWorkletNode(ctx, "clear-voice-processor");
      workletRef.current = workletNode;

      workletNode.port.onmessage = (e: MessageEvent<{ audioData: Float32Array }>) => {
        if (socketRef.current?.readyState !== WebSocket.OPEN) return;
        const float32 = e.data.audioData;
        if (!float32 || float32.length === 0) return;
        const int16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
          int16[i] = Math.max(-32768, Math.min(32767, Math.floor(float32[i] * 32767)));
        }
        const base64 = encodeBase64(new Uint8Array(int16.buffer));
        socketRef.current.send(JSON.stringify({ type: "audio", data: base64 }));
      };

      source.connect(workletNode);
      source.connect(analyserNode);
    } catch (err: any) {
      const msg = err?.message ?? "";
      const isPermissionDenied =
        msg.toLowerCase().includes("permission denied") ||
        msg.toLowerCase().includes("notallowederror") ||
        err?.name === "NotAllowedError";
      setError(
        isPermissionDenied
          ? "Microphone access denied. Allow the mic in your browser, then click Connect again."
          : msg || "Microphone access failed"
      );
      setStatus("error");
    }
  }, [config, fetchConfig]);

  const stopPush = useCallback(() => {
    const stream = streamRef.current;
    const ctx = inputContextRef.current;
    const src = sourceRef.current;
    const worklet = workletRef.current;

    if (worklet) {
      try {
        worklet.disconnect();
      } catch (_) {}
      workletRef.current = null;
    }
    if (src) {
      try {
        src.disconnect();
      } catch (_) {}
      sourceRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (ctx && ctx.state !== "closed") {
      ctx.close().catch(() => {});
      inputContextRef.current = null;
    }
    analyserRef.current = null;
    setAnalyser(null);

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          clientContent: {
            turnComplete: true,
          },
        })
      );
    }
    setStatus("ready");
  }, []);

  const disconnect = useCallback(() => {
    stopPush();
    activeSourcesRef.current.forEach((s) => {
      try {
        s.stop();
      } catch (_) {}
    });
    activeSourcesRef.current.clear();
    const outCtx = outputContextRef.current;
    if (outCtx && outCtx.state !== "closed") {
      outCtx.close().catch(() => {});
      outputContextRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setStatus("idle");
    setError(null);
  }, [stopPush]);

  const ensureAudioResumed = useCallback(async () => {
    const outCtx = outputContextRef.current;
    if (outCtx?.state === "suspended") {
      await outCtx.resume();
    }
    const inCtx = inputContextRef.current;
    if (inCtx?.state === "suspended") {
      await inCtx.resume();
    }
  }, []);

  useEffect(() => {
    if (status === "connecting" || status === "ready" || status === "pushing" || status === "playing") {
      if (!outputContextRef.current) {
        const rate = config?.outputSampleRate ?? 24000;
        outputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: rate,
        });
      }
    }
    return () => {
      // Don't close output context on unmount; disconnect() handles cleanup
    };
  }, [status, config?.outputSampleRate]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    status,
    error,
    config,
    analyser,
    connect,
    startPush,
    stopPush,
    disconnect,
    ensureAudioResumed,
    fetchConfig,
  };
}
