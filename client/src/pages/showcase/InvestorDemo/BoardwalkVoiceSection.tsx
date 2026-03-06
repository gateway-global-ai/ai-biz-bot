/**
 * Boardwalk Suites — Live Voice section for Investor Demo.
 * Large walkie-talkie PTT button + top-notch visualizer (orb + bars) matching demo theme.
 */
import React, { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Mic, Loader2, AlertCircle } from "lucide-react";
import { useAIStudioPTT, type PTTStatus } from "@/services/ai-studio/useAIStudioPTT";
import { VoiceVisualizerWidget } from "@/widgets/VoiceVisualizerWidget";
import { resolvePlatformUrl } from "@/sdk/platformConfig";

const DEMO_THEME = {
  bg: "#0B1120",
  accent: "#3B82F6",
  accentGlow: "rgba(59, 130, 246, 0.4)",
  border: "rgba(59, 130, 246, 0.2)",
  listening: "rgba(16, 185, 129, 0.8)",
  listeningGlow: "rgba(16, 185, 129, 0.4)",
  speaking: "rgba(139, 92, 246, 0.8)",
  speakingGlow: "rgba(139, 92, 246, 0.4)",
};

function getVisualizerLabel(status: PTTStatus): string {
  switch (status) {
    case "idle":
    case "error":
      return "READY";
    case "connecting":
      return "CONNECTING";
    case "ready":
      return "HOLD TO TALK";
    case "pushing":
      return "LISTENING";
    case "playing":
      return "SPEAKING";
    default:
      return "READY";
  }
}

export interface BoardwalkVoiceSectionProps {
  className?: string;
}

export function BoardwalkVoiceSection({ className = "" }: BoardwalkVoiceSectionProps) {
  const [requestedToken, setRequestedToken] = useState<string | null>(null);

  const {
    status,
    error,
    analyser,
    connect,
    startPush,
    stopPush,
    disconnect,
    ensureAudioResumed,
  } = useAIStudioPTT();

  const sessionToken = requestedToken;

  const handleGetSession = useCallback(async () => {
    try {
      const base = resolvePlatformUrl("/api/ai-studio/webhook");
      const res = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "demo", state: "ai-studio-ptt" }),
      });
      const data = await res.json();
      if (data.success && data.sessionToken) {
        setRequestedToken(data.sessionToken);
      } else {
        console.error("Webhook failed:", data);
      }
    } catch (e) {
      console.error("Get session failed:", e);
    }
  }, []);

  // Drive connection from sessionToken so Strict Mode cleanup kills the first socket before remount
  useEffect(() => {
    if (sessionToken) {
      connect(sessionToken);
    }
    return () => {
      disconnect();
    };
  }, [sessionToken, connect, disconnect]);

  const handleConnect = useCallback(() => {
    if (sessionToken) {
      connect(sessionToken);
    } else {
      handleGetSession();
    }
  }, [sessionToken, connect, handleGetSession]);

  const handlePTTDown = useCallback(async () => {
    if (status !== "ready") return;
    await ensureAudioResumed();
    startPush();
  }, [status, ensureAudioResumed, startPush]);

  const handlePTTUp = useCallback(() => {
    if (status === "pushing") stopPush();
  }, [status, stopPush]);

  const isPushing = status === "pushing";
  const isPlaying = status === "playing";
  const isConnecting = status === "connecting";
  const showOrbGlow = isPushing || isPlaying || isConnecting;
  const orbColor = isPlaying ? DEMO_THEME.speaking : isPushing ? DEMO_THEME.listening : DEMO_THEME.accent;
  const orbGlow = isPlaying ? DEMO_THEME.speakingGlow : isPushing ? DEMO_THEME.listeningGlow : DEMO_THEME.accentGlow;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`relative max-w-2xl mx-auto p-8 rounded-sui bg-slate-900/40 border border-[#3B82F6]/20 backdrop-blur-xl shadow-2xl ${className}`}
    >
      <div className="flex flex-col items-center gap-8">
        {error && (
          <div className="flex flex-col items-center gap-2 text-center max-w-sm">
            <div className="flex items-center gap-2 text-rose-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <p className="text-slate-500 text-xs">
              Allow microphone in site settings, then click Connect to Voice again.
            </p>
          </div>
        )}

        {/* Connect when idle or error */}
        {(status === "idle" || status === "error") && (
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            onClick={handleConnect}
            className="px-8 py-4 rounded-sui bg-[#3B82F6] text-white font-semibold text-base border border-[#3B82F6]/30 shadow-lg hover:bg-[#2563EB]"
          >
            Connect to Voice
          </motion.button>
        )}

        {/* Large walkie-talkie PTT + home-page style orb visualizer */}
        <div className="relative flex flex-col items-center w-full">
          {/* Outer orb: rings + glow (like home page) */}
          <div className="relative flex items-center justify-center w-52 h-52">
            <div
              className="absolute inset-0 border border-dashed rounded-full animate-spin opacity-60"
              style={{
                borderColor: DEMO_THEME.border,
                animationDuration: "20s",
              }}
            />
            <div
              className="absolute inset-4 border border-dotted rounded-full animate-spin opacity-50"
              style={{
                borderColor: "rgba(99, 102, 241, 0.25)",
                animationDirection: "reverse",
                animationDuration: "15s",
              }}
            />
            <div
              className="absolute rounded-full blur-2xl transition-all duration-500"
              style={{
                width: showOrbGlow ? "130%" : "120%",
                height: showOrbGlow ? "130%" : "120%",
                background: `radial-gradient(circle, ${orbColor} 0%, ${orbGlow} 40%, transparent 70%)`,
                opacity: showOrbGlow ? 0.6 : 0.45,
              }}
            />
            {/* Large walkie-talkie button: 200px center circle */}
            <motion.button
              type="button"
              disabled={status !== "ready" && status !== "pushing"}
              className={`absolute w-[200px] h-[200px] rounded-full flex flex-col items-center justify-center z-10 border-2 cursor-pointer select-none touch-none transition-colors ${
                status === "connecting" || status === "playing"
                  ? "pointer-events-none"
                  : ""
              }`}
              style={{
                borderColor: orbColor,
                boxShadow: showOrbGlow ? `0 0 32px ${orbGlow}, 0 0 16px ${orbGlow}` : "0 0 0 1px rgba(59, 130, 246, 0.2)",
                background: status === "pushing"
                  ? "rgba(16, 185, 129, 0.15)"
                  : "rgba(15, 23, 42, 0.92)",
              }}
              onPointerDown={handlePTTDown}
              onPointerUp={handlePTTUp}
              onPointerLeave={handlePTTUp}
              onContextMenu={(e) => e.preventDefault()}
              whileHover={status === "ready" ? { scale: 1.03 } : undefined}
              whileTap={status === "pushing" ? { scale: 0.97 } : undefined}
              aria-label="Hold to talk"
            >
              {(status === "connecting" || status === "playing") && (
                <Loader2 className="w-12 h-12 text-[#93C5FD] animate-spin mb-1" />
              )}
              {(status === "ready" || status === "pushing") && (
                <>
                  <Mic className={`w-14 h-14 mb-2 ${status === "pushing" ? "text-emerald-400" : "text-slate-200"}`} />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {status === "pushing" ? "Release to send" : "Hold to talk"}
                  </span>
                </>
              )}
              {(status === "idle" || status === "error") && (
                <Mic className="w-14 h-14 text-slate-500" />
              )}
            </motion.button>
          </div>
          <span
            className="text-[10px] font-bold uppercase tracking-wider mt-4 px-3 py-1 rounded-full"
            style={{ color: orbColor, backgroundColor: `${orbGlow}` }}
          >
            {getVisualizerLabel(status)}
          </span>

          {/* Bars visualizer when pushing (real mic levels) */}
          {status === "pushing" && analyser && (
            <div className="w-full mt-4 flex justify-center">
              <VoiceVisualizerWidget
                analyser={analyser}
                isActive={true}
                accentColor={DEMO_THEME.listening}
                width={280}
                height={56}
                style="bars"
                className="rounded-sui bg-slate-800/60 border border-[#3B82F6]/20"
              />
            </div>
          )}
          {/* Waveform-style placeholder when playing (no analyser for server audio) */}
          {status === "playing" && (
            <div className="w-full mt-4 flex justify-center">
              <VoiceVisualizerWidget
                analyser={null}
                isActive={false}
                accentColor={DEMO_THEME.speaking}
                width={280}
                height={56}
                style="waveform"
                className="rounded-sui bg-slate-800/60 border border-[#3B82F6]/20"
              />
            </div>
          )}
        </div>

        {(status === "ready" || status === "pushing" || status === "playing") && (
          <p className="text-slate-400 text-sm">
            {status === "ready" && "Hold the button to speak, release to send."}
            {status === "pushing" && "Listening… Release to send."}
            {status === "playing" && "Playing response…"}
          </p>
        )}

        {(status === "ready" || status === "pushing" || status === "playing" || status === "connecting") && (
          <button
            type="button"
            onClick={disconnect}
            className="text-slate-500 text-xs hover:text-slate-300 transition-colors"
          >
            Disconnect
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default BoardwalkVoiceSection;
