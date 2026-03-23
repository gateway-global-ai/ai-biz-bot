import React from "react";

import type { BridgeMode } from "../../../os-core/execution-plane/gemini-live-engine/bridgeRuntime";
import type { BridgeConnectionSnapshot } from "../../../os-core/execution-plane/gemini-live-engine/IGeminiExecutionBridge";
import type { OSEventLogEntry } from "../../../os-core/observability/EventLogProvider";

interface BridgeTelemetryCardProps {
  mode: BridgeMode;
  minLatencyMs: number;
  maxLatencyMs: number;
  dropRate: number;
  liveSnapshot: BridgeConnectionSnapshot;
  liveEndpoint: string;
  liveBridgeError: string | null;
  canBootLive: boolean;
  endpointGovernanceNote?: string | null;
  lifecycleEvents: OSEventLogEntry[];
  onConnect: () => void;
  onDisconnect: () => void;
  onStartPTT: () => void;
  onStopPTT: () => void;
}

export function BridgeTelemetryCard({
  mode,
  minLatencyMs,
  maxLatencyMs,
  dropRate,
  liveSnapshot,
  liveEndpoint,
  liveBridgeError,
  canBootLive,
  endpointGovernanceNote,
  lifecycleEvents,
  onConnect,
  onDisconnect,
  onStartPTT,
  onStopPTT,
}: BridgeTelemetryCardProps) {
  const canUsePTT =
    (mode === "live" || mode === "local") && liveSnapshot.state === "CONNECTED";

  return (
    <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/40 p-6 backdrop-blur-xl">
      <div className="mb-4 text-sm font-semibold text-white">Execution Bridge</div>
      <div className="space-y-3 text-sm text-slate-300">
        <div>
          Active Adapter:{" "}
          <span className="font-mono uppercase text-white">{mode}</span>
          {mode === "live" || mode === "local" ? (
            <span className="ml-2 text-amber-300">
              ({liveSnapshot.state.toLowerCase()})
            </span>
          ) : null}
        </div>

        <div>
          Pipeline State:{" "}
          <span className="font-mono text-cyan-300">
            {liveSnapshot.agentState ?? "IDLE"}
          </span>
        </div>

        <div>
          Recording:{" "}
          <span
            className={`font-mono ${
              liveSnapshot.isRecording ? "text-emerald-300" : "text-slate-400"
            }`}
          >
            {liveSnapshot.isRecording ? "CAPTURING PCM" : "IDLE"}
          </span>
        </div>

        <div>
          Playback:{" "}
          <span
            className={`font-mono ${
              liveSnapshot.isPlaying ? "text-sky-300" : "text-slate-400"
            }`}
          >
            {liveSnapshot.isPlaying ? "VOICE ACTIVE" : "IDLE"}
          </span>
        </div>

        <div>
          Jitter Buffer:{" "}
          <span
            className={`font-mono ${
              liveSnapshot.isBuffering ? "text-amber-300" : "text-slate-400"
            }`}
          >
            {liveSnapshot.isBuffering ? "BUFFERING..." : "STABLE"}
          </span>
        </div>

        {liveSnapshot.lastTtsModel ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-xs text-slate-300">
            TTS Model: {liveSnapshot.lastTtsModel}
            <br />
            Voice: {liveSnapshot.lastTtsVoice ?? "unknown"}
            <br />
            Sample Rate: {liveSnapshot.lastTtsSampleRate ?? 24000} Hz
            <br />
            Processing: {liveSnapshot.lastTtsProcessingMs ?? 0}ms
            <br />
            Audio Bytes: {liveSnapshot.lastTtsAudioBytes ?? 0}
          </div>
        ) : null}

        {mode === "live" || mode === "local" ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-xs text-slate-300">
            Endpoint: {liveEndpoint}
            <br />
            Last disconnect:{" "}
            <span className="font-mono text-slate-400">
              {liveSnapshot.lastDisconnectCode !== null
                ? `${liveSnapshot.lastDisconnectCode} ${liveSnapshot.lastDisconnectReason ?? ""}`.trim()
                : "none"}
            </span>
          </div>
        ) : null}

        {liveBridgeError ? (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-xs text-rose-200">
            {liveBridgeError}
          </div>
        ) : null}

        {endpointGovernanceNote ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-100">
            {endpointGovernanceNote}
          </div>
        ) : null}

        {liveSnapshot.state === "DISCONNECTED" ? (
          <button
            type="button"
            onClick={onConnect}
            disabled={!canBootLive}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mode === "local" ? "Connect Local Engine" : "Connect Live Engine"}
          </button>
        ) : liveSnapshot.state === "CONNECTING" ? (
          <button
            type="button"
            disabled
            className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 opacity-80"
          >
            Booting...
          </button>
        ) : (
          <button
            type="button"
            onClick={onDisconnect}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500"
          >
            Disconnect (OS_SHUTDOWN)
          </button>
        )}

        <button
          type="button"
          disabled={!canUsePTT}
          onPointerDown={onStartPTT}
          onPointerUp={onStopPTT}
          onPointerCancel={onStopPTT}
          onPointerLeave={() => {
            if (liveSnapshot.microphoneActive) {
              onStopPTT();
            }
          }}
          className={`rounded-xl px-4 py-3 text-sm font-medium text-white ${
            liveSnapshot.microphoneActive
              ? "bg-emerald-600 hover:bg-emerald-500"
              : "bg-slate-700 hover:bg-slate-600"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {liveSnapshot.microphoneActive ? "Release to Process" : "Hold to Speak"}
        </button>

        {mode === "chaos" ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-100">
            Min Latency: {minLatencyMs}ms
            <br />
            Max Latency: {maxLatencyMs}ms
            <br />
            Drop Rate: {dropRate}%
          </div>
        ) : null}

        {lifecycleEvents.length > 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-xs text-slate-300">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Bridge Lifecycle
            </div>
            <div className="space-y-2">
              {lifecycleEvents.map((event) => (
                <div key={event.id} className="font-mono text-[11px] text-slate-400">
                  {event.timestamp} ·{" "}
                  {(event.payload as { type?: string }).type ?? event.category}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
