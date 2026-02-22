/**
 * ErrorNavigator — Branded error page with auto-start Gateway Navigator voice.
 * Turns 404/403/500 into a high-touch recovery moment with breadcrumb resume and analytics.
 */

import React, { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Compass, Home, ArrowLeft, RefreshCcw } from "lucide-react";
import { VoiceClientFactory } from "@/services/voice/VoiceClientFactory";
import type { IVoiceClient } from "@/services/voice/IVoiceClient";
import type { BusinessContext, AgentConfig, VoiceConfig } from "@/types/voice";
import { BREADCRUMB_KEY } from "@/hooks/use-breadcrumb";

const ERROR_MAP: Record<
  string,
  { title: string; message: string; icon: typeof Compass }
> = {
  "404": {
    title: "Path Not Found",
    message:
      "I've searched our digital map, but this specific coordinate doesn't seem to exist.",
    icon: Compass,
  },
  "403": {
    title: "Access Restricted",
    message:
      "It looks like you've reached a secure perimeter that requires higher clearance.",
    icon: RefreshCcw,
  },
  "500": {
    title: "Digital Static",
    message:
      "We're experiencing a minor disruption in the signal. Our engineers are investigating.",
    icon: RefreshCcw,
  },
  stripe_fail: {
    title: "Payment Hiccup",
    message:
      "There was a hiccup with the payment handshake. Your data is safe; let's try again.",
    icon: RefreshCcw,
  },
};

const NAVIGATOR_PROMPT = `You are the Gateway Global Navigator. You are not an error message; you are a demonstration of the world's most advanced AI Business Infrastructure.

When the user arrives, acknowledge the error warmly and briefly. If they seem surprised, say: "I'm the Gateway Navigator. While this specific page coordinate is offline, my systems are 100% active."

Suggest they return home or try the previous page. If they have a recovery context (last task), mention it and offer to take them back there. Keep responses under 3 sentences. Be calm and professional.`;

function getRecoveryContext(): string {
  try {
    const saved = localStorage.getItem(BREADCRUMB_KEY);
    if (!saved) return "the dashboard";
    const { path, activity, timestamp } = JSON.parse(saved);
    const minutesAgo = Math.floor((Date.now() - timestamp) / 60000);
    if (minutesAgo > 30) return "the dashboard";
    return activity ? `your last task: "${activity}" at ${path}` : `the page at ${path}`;
  } catch {
    return "the dashboard";
  }
}

function getRecoveryPath(): string | null {
  try {
    const saved = localStorage.getItem(BREADCRUMB_KEY);
    if (!saved) return null;
    const { path, timestamp } = JSON.parse(saved);
    const minutesAgo = Math.floor((Date.now() - timestamp) / 60000);
    if (minutesAgo > 30) return null;
    return path || null;
  } catch {
    return null;
  }
}

export function ErrorNavigator() {
  const [location, setLocation] = useLocation();
  const query = typeof window !== "undefined" ? window.location.search : "";
  const params = new URLSearchParams(query);
  const errorCode = params.get("code") || "404";
  const errorPath = params.get("path") || params.get("ref") || "";
  const { title, message, icon: Icon } = ERROR_MAP[errorCode] || ERROR_MAP["404"];

  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef<IVoiceClient | null>(null);
  const recoverySummary = getRecoveryContext();
  const recoveryPath = getRecoveryPath();
  const showResume = recoverySummary !== "the dashboard" && recoveryPath;

  // Capture load time for timeInError metric
  useEffect(() => {
    (window as any).errorPageLoadTime = Date.now();
  }, []);

  // Optional: log ERROR_LANDING (no siteConfigId on error page, so skip or use null)
  useEffect(() => {
    // Could POST /api/analytics/error-landing with { errorCode, path: errorPath } if endpoint exists
  }, [errorCode, errorPath]);

  // Voice: connect after 1s delay with Navigator persona
  useEffect(() => {
    const business: BusinessContext = {
      id: "navigator",
      placeId: "",
      name: "Gateway Navigator",
      address: "",
      systemPromptOverride: NAVIGATOR_PROMPT,
    };
    const agent: AgentConfig = {
      role: "Gateway Navigator",
      personality: "Calm, professional, helpful. Uses mapping and coordinates language.",
      objectives: ["De-escalate frustration", "Guide user home or to previous task"],
      constraints: ["Keep responses under 3 sentences", "No technical jargon"],
    };
    const voiceConfig: VoiceConfig = VoiceClientFactory.getDefaultConfig("premium");

    const timer = setTimeout(async () => {
      try {
        const client = VoiceClientFactory.createClient(voiceConfig);
        client.onConnectionChange((connected) => setIsConnected(connected));
        await client.connect(business, agent, voiceConfig);
        clientRef.current = client;
      } catch (err) {
        console.warn("[ErrorNavigator] Voice connect failed:", err);
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
    };
  }, []);

  const handleResume = async () => {
    const path = getRecoveryPath();
    if (!path) return;
    const timeInError =
      (window as any).errorPageLoadTime != null
        ? Date.now() - (window as any).errorPageLoadTime
        : 0;
    try {
      await fetch("/api/analytics/recovery-success", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteConfigId: null,
          errorCode,
          recoveredPath: path,
          timeInError,
        }),
      });
    } catch {
      // Analytics best-effort
    }
    setLocation(path);
  };

  const handleVoiceTierInterest = () => {
    try {
      fetch("/api/analytics/recovery-success", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteConfigId: null,
          eventType: "VOICE_TIER_INTEREST",
          metadata: { from: "error_page" },
        }),
      }).catch(() => {});
    } catch {
      // ignore
    }
    setLocation("/#voice");
  };

  return (
    <div className="min-h-screen bg-[#0a0e17] flex flex-col items-center justify-center p-4 text-white">
      <div className="w-full max-w-2xl text-center space-y-8">
        <div
          className={`relative mx-auto w-32 h-32 rounded-full flex items-center justify-center border-2 transition-all duration-700 ${
            isConnected
              ? "border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.5)]"
              : "border-slate-700"
          }`}
        >
          <Icon
            className={`w-12 h-12 ${
              isConnected ? "text-cyan-400 animate-pulse" : "text-slate-500"
            }`}
          />
        </div>

        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">
            {title}
          </h1>
          <p className="text-xl text-slate-400 max-w-md mx-auto">{message}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-8">
          <Button
            variant="outline"
            className="bg-transparent border-slate-700 hover:bg-slate-800 text-white gap-2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </Button>
          <Button
            className="bg-cyan-600 hover:bg-cyan-500 text-white gap-2 px-8"
            onClick={() => setLocation("/")}
          >
            <Home className="w-4 h-4" /> Return Home
          </Button>
          {showResume && (
            <Button
              variant="default"
              className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
              onClick={handleResume}
            >
              <RefreshCcw className="w-4 h-4" /> Resume
            </Button>
          )}
          <Button
            variant="ghost"
            className="text-cyan-400 border-cyan-400/30 hover:bg-cyan-400/10"
            onClick={handleVoiceTierInterest}
          >
            How does this AI work?
          </Button>
        </div>

        {isConnected && (
          <p className="text-sm text-cyan-400/70 animate-pulse">
            Live Navigator Active • Listening...
          </p>
        )}
      </div>
    </div>
  );
}
