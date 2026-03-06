/**
 * AI Studio PTT Widget — Premium Sovereign OS design.
 * Wide card, 2x2 feature grid, slate/fuchsia/emerald styling. Audio context resume before PTT.
 */
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Mic, Zap, ShieldCheck, MessageSquare, Loader2, AlertCircle } from "lucide-react";
import { useAIStudioPTT, type PTTStatus } from "@/services/ai-studio/useAIStudioPTT";
import { resolvePlatformUrl } from "@/sdk/platformConfig";

export interface AIStudioPTTWidgetProps {
  sessionToken?: string | null;
  systemInstruction?: string;
  className?: string;
}

export function AIStudioPTTWidget({
  sessionToken: controlledToken,
  systemInstruction: _systemInstruction,
  className = "",
}: AIStudioPTTWidgetProps) {
  const [requestedToken, setRequestedToken] = useState<string | null>(null);
  const sessionToken = controlledToken ?? requestedToken;

  const {
    status,
    error,
    connect,
    startPush,
    stopPush,
    disconnect,
    ensureAudioResumed,
  } = useAIStudioPTT();

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
        await connect(data.sessionToken);
      } else {
        console.error("Webhook failed:", data);
      }
    } catch (e) {
      console.error("Get session failed:", e);
    }
  }, [connect]);

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

  const isPushingOrPlaying = status === "pushing" || status === "playing";
  const pttButtonGlow = isPushingOrPlaying
    ? "border-fuchsia-500 shadow-[0_0_30px_rgba(217,70,239,0.3)] animate-pulse"
    : "border-slate-700 hover:border-fuchsia-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`bg-slate-900/60 border border-slate-800 rounded-3xl p-8 backdrop-blur-md max-w-2xl mx-auto ${className}`}
    >
      {/* 2x2 feature grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="flex items-center gap-2 text-slate-300">
          <Mic className="w-5 h-5 text-fuchsia-400 shrink-0" />
          <span className="text-sm">Hold to record, release to send</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <Zap className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-sm">Sub-150ms mouth-to-ear target</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm">Secure PTT mode</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <MessageSquare className="w-5 h-5 text-fuchsia-400 shrink-0" />
          <span className="text-sm">Voice / Text Concierge toggle</span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-rose-400 text-sm mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main interactive button */}
      <div className="flex flex-col items-center gap-3">
        {status === "idle" && (
          <button
            type="button"
            onClick={handleConnect}
            className="px-6 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-slate-200 font-medium hover:border-fuchsia-500 transition-colors"
          >
            Connect Session
          </button>
        )}

        {status === "error" && (
          <button
            type="button"
            onClick={handleConnect}
            className="px-6 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-slate-200 font-medium hover:border-fuchsia-500 transition-colors"
          >
            Connect Session
          </button>
        )}

        {(status === "connecting" || status === "playing") && (
          <div className="flex items-center gap-2 px-6 py-4 rounded-2xl border border-fuchsia-500/50 bg-slate-800/80 text-slate-200">
            <Loader2 className="w-5 h-5 text-fuchsia-400 animate-spin" />
            <span className="text-sm font-medium">
              {status === "connecting" ? "Connecting…" : "Playing…"}
            </span>
          </div>
        )}

        {(status === "ready" || status === "pushing") && (
          <motion.button
            type="button"
            className={`w-24 h-24 rounded-2xl bg-slate-800 border flex items-center justify-center text-slate-200 transition-colors ${pttButtonGlow}`}
            onPointerDown={handlePTTDown}
            onPointerUp={handlePTTUp}
            onPointerLeave={handlePTTUp}
            onContextMenu={(e) => e.preventDefault()}
            whileHover={status === "ready" ? { scale: 1.02 } : undefined}
            whileTap={status === "pushing" ? { scale: 0.98 } : undefined}
            aria-label="Hold to talk"
          >
            <Mic className="w-10 h-10 text-fuchsia-400" />
          </motion.button>
        )}

        {(status === "ready" || status === "pushing" || status === "playing") && (
          <button
            type="button"
            onClick={disconnect}
            className="text-slate-500 text-xs hover:text-slate-300"
          >
            Disconnect
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default AIStudioPTTWidget;
