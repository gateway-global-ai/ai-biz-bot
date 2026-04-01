/**
 * Investor Demo — Full-width footer with Sovereign PTT card.
 * Wide card: 2x2 feature grid + main PTT button. audioContext.resume() before startPush on pointer down.
 */
import React, { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Mic, Zap, ShieldCheck, MessageSquare, Loader2 } from "lucide-react";
import { useAIStudioPTT } from "@/services/ai-studio/useAIStudioPTT";
import { resolvePlatformUrl } from "@/sdk/platformConfig";

export function InvestorDemoFooter() {
  const [requestedToken, setRequestedToken] = useState<string | null>(null);
  const {
    status,
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

  const hasConnected = useRef(false);
  useEffect(() => {
    if (!sessionToken || hasConnected.current) return;
    hasConnected.current = true;
    connect(sessionToken);
  }, [sessionToken, connect]);

  const handleConnect = useCallback(() => {
    if (sessionToken) {
      connect(sessionToken);
    } else {
      handleGetSession();
    }
  }, [sessionToken, connect, handleGetSession]);

  /** CRITICAL: resume audio context before startPush so playback/mic work on first interaction. */
  const handlePTTDown = useCallback(async () => {
    if (status !== "ready") return;
    await ensureAudioResumed();
    startPush();
  }, [status, ensureAudioResumed, startPush]);

  const handlePTTUp = useCallback(() => {
    if (status === "pushing") stopPush();
  }, [status, stopPush]);

  const isPushingOrPlaying = status === "pushing" || status === "playing";
  const pttButtonClass = isPushingOrPlaying
    ? "border-fuchsia-500 shadow-[0_0_30px_rgba(217,70,239,0.3)] animate-pulse"
    : "bg-slate-800 border-slate-700 hover:border-emerald-500";

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 w-full bg-[#0B1120]/90 border-t border-[#3B82F6]/20 backdrop-blur-xl">
      <div className="w-full flex flex-col items-center justify-center py-6 px-4">
        {/* Sovereign PTT card: wide, 2x2 grid, then main button */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="w-full max-w-2xl mx-auto bg-slate-900/60 border border-slate-800 rounded-3xl p-8 backdrop-blur-md shadow-2xl"
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

          {/* Main interactive PTT button */}
          <div className="flex flex-col items-center gap-3">
            {(status === "idle" || status === "error") && (
              <button
                type="button"
                onClick={handleConnect}
                className="px-6 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-slate-200 font-medium hover:border-fuchsia-500 hover:text-fuchsia-200 transition-colors"
              >
                Connect to Voice
              </button>
            )}

            {(status === "connecting" || status === "playing") && (
              <div className="flex items-center gap-2 px-6 py-4 rounded-2xl border border-slate-700 bg-slate-800/80 text-slate-200">
                <Loader2 className="w-5 h-5 text-fuchsia-400 animate-spin" />
                <span className="text-sm font-medium">
                  {status === "connecting" ? "Connecting…" : "Playing…"}
                </span>
              </div>
            )}

            {(status === "ready" || status === "pushing") && (
              <motion.button
                type="button"
                className={`min-w-[140px] min-h-[56px] px-8 py-4 rounded-2xl border flex items-center justify-center text-slate-200 font-medium transition-colors select-none touch-none ${pttButtonClass}`}
                onPointerDown={handlePTTDown}
                onPointerUp={handlePTTUp}
                onPointerLeave={handlePTTUp}
                onContextMenu={(e) => e.preventDefault()}
                whileHover={status === "ready" ? { scale: 1.02 } : undefined}
                whileTap={status === "pushing" ? { scale: 0.98 } : undefined}
                aria-label={status === "pushing" ? "Listening…" : "Press & Hold to Talk"}
              >
                {status === "pushing" ? (
                  <>
                    <Mic className="w-6 h-6 text-fuchsia-400 mr-2" />
                    <span className="text-sm">Listening…</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-6 h-6 text-fuchsia-400 mr-2" />
                    <span className="text-sm">Press & Hold to Talk</span>
                  </>
                )}
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
      </div>
      <div className="w-full border-t border-[#3B82F6]/10 py-4 px-6">
        <div className="container mx-auto flex flex-col md:flex-row justify-center items-center gap-4">
          <p className="text-sm text-slate-500">
            Voice‑Native AI Business Router · Technical Performance Report · 2026
          </p>
        </div>
      </div>
    </footer>
  );
}
