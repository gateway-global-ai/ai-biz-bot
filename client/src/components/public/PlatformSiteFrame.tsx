import React, { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Bot,
} from "lucide-react";

import headerLogo from "@assets/clear_voice_ai_dark_sm.png";
import ThreeBackground from "@/components/ThreeBackground";
import { ConciergePanel } from "@/components/chat/ConciergePanel";
import { VoiceClientFactory } from "@/services/voice/VoiceClientFactory";
import { useAuth } from "@/lib/auth";
import { useCustomerAuth } from "@/lib/customerAuth";

const platformIdentity = {
  id: "platform_landing",
  placeId: "platform_landing",
  name: "Gateway Global AI",
  address: "AI-Powered Business Platform",
  hours: "24/7 Support Available",
  services: ["AI Concierge", "Business Automation", "Voice Agents", "Website Generation"],
  primaryColor: "#6366f1",
};

interface PlatformSiteFrameProps {
  activeLane: "home" | "demo" | "buy" | "more-info";
  title: string;
  description: string;
  children: ReactNode;
  showIntro?: boolean;
  contentMode?: "contained" | "fullBleed";
  autoOpenChatOnDesktop?: boolean;
}

export default function PlatformSiteFrame({
  activeLane,
  title,
  description,
  children,
  showIntro = true,
  contentMode = "contained",
  autoOpenChatOnDesktop = true,
}: PlatformSiteFrameProps) {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { isAuthenticated: isCustomerAuth } = useCustomerAuth();
  const [isChatOpen, setIsChatOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    if (!autoOpenChatOnDesktop) return false;
    return window.innerWidth >= 1024;
  });
  const [chatLayout, setChatLayout] = useState<"floating" | "fixed" | "fullscreen">(
    "floating"
  );
  const [initialView, setInitialView] = useState<"chat" | "voice">("chat");

  const voiceConfig = VoiceClientFactory.getDefaultConfig("premium");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <div className="fixed inset-x-0 top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <img src={headerLogo} alt="Clear Voice AI" className="h-9 w-auto object-contain" />
            <span className="hidden text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 md:inline">
              AI Biz Bot
            </span>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <Link href="/demo">
              <button
                className={`rounded-2xl px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                  activeLane === "demo"
                    ? "bg-indigo-600 text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                Live Demo
              </button>
            </Link>
            <Link href="/buy">
              <button
                className={`rounded-2xl px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                  activeLane === "buy"
                    ? "bg-indigo-600 text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                Buy Now
              </button>
            </Link>
            <Link href="/more-info">
              <button
                className={`rounded-2xl px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                  activeLane === "more-info"
                    ? "bg-indigo-600 text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                More Info
              </button>
            </Link>
          </div>

          <button
            type="button"
            onClick={() => {
              setInitialView("chat");
              setIsChatOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-slate-800"
          >
            <Bot className="h-4 w-4" />
            AI Biz Bot
          </button>
        </div>
      </div>

      <main className="relative overflow-hidden pt-20">
        <div className="absolute inset-0 opacity-[0.12] pointer-events-none">
          <ThreeBackground />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_40%),linear-gradient(to_bottom,rgba(248,250,252,0.96),rgba(255,255,255,1))]" />

        {contentMode === "contained" ? (
          <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
            {showIntro && (
              <div className="mb-6 max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-300/80 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 backdrop-blur">
                  <Bot className="h-3.5 w-3.5 text-indigo-500" />
                  AI Biz Bot
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-slate-950 md:text-6xl">
                  {title}
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
                  {description}
                </p>
              </div>
            )}

            {children}
          </div>
        ) : (
          <div className="relative z-10">{children}</div>
        )}
      </main>

      <ConciergePanel
        business={platformIdentity}
        agent={{
          role: "Platform Sales Agent",
          personality: "Helpful, professional, confident, and educational",
          objectives: [
            "Help business owners understand the AI Biz Bot platform",
            "Explain the value of AI OS, Clear Voice AI, and AI Router",
            "Guide visitors into the correct path: demo, buy now, or more info",
          ],
          constraints: [
            "Be concise and enterprise-friendly",
            "Position AI Biz Bot as the public representative of the platform",
            "Focus on business value and next steps",
          ],
        }}
        voiceConfig={voiceConfig}
        agentName="Gateway AI Assistant"
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        initialView={initialView}
        layoutMode={chatLayout}
        onCycleLayout={() => {
          const modes: Array<"floating" | "fixed" | "fullscreen"> = [
            "floating",
            "fixed",
            "fullscreen",
          ];
          const currentIndex = modes.indexOf(chatLayout);
          setChatLayout(modes[(currentIndex + 1) % modes.length]);
        }}
        showOwnerControls={false}
        embedViewsInPanel={true}
        onNavigate={(path) => setLocation(path)}
        onShareClick={() => {
          if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(window.location.href);
          }
        }}
        isAuthenticated={isAuthenticated || isCustomerAuth}
        onHistoryClick={() => setLocation("/app/compliance-gateway")}
        onSmsConsentClick={() => setLocation("/login")}
        transferUrl={typeof window !== 'undefined' ? `${window.location.origin}/demo` : '/demo'}
        transferTitle="Gateway Global AI Demo"
        transferDescription="Scan to open the live demo onboarding page on your phone."
        variant="sovereign"
        zIndex={60}
      />
    </div>
  );
}
