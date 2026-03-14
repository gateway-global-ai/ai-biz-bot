import React from "react";
import {
  Bot,
  BookOpen,
  Cpu,
  Headphones,
  Mic,
  Route,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";

import PlatformSiteFrame from "@/components/public/PlatformSiteFrame";

const modules = [
  {
    title: "AI OS PLATFORM",
    icon: Cpu,
    bullets: ["Hero", "Autonomy", "Governance", "Native LLM", "Native Voice", "Apps", "Agent Deployment"],
  },
  {
    title: "AI CHAT",
    icon: Mic,
    bullets: ["PTT AI Voice Chat", "High Quality Low Cost", "Multimodal", "Resizable", "Knowledge Library", "AI Biz Bot Assistant"],
  },
  {
    title: "AI ROUTER",
    icon: Route,
    bullets: ["Single Point of Entry", "Does Not Replace Website", "2x Quality Over Telephony", "Routing Logic"],
  },
  {
    title: "AI BIZ BOT",
    icon: Bot,
    bullets: ["Search and Discuss", "Add to Library", "Share Library", "Control Desired Output"],
  },
  {
    title: "AUTONOMY & GOVERNANCE",
    icon: Shield,
    bullets: ["Bouncer", "Policy Layers", "Safe Execution", "Visible Mutations"],
  },
  {
    title: "KNOWLEDGE BASE",
    icon: BookOpen,
    bullets: ["Focus First", "Search and Select", "Discussion Basket", "Delivery Modes", "Approved Knowledge Activation"],
  },
  {
    title: "AI WORKFORCE",
    icon: Users,
    bullets: ["Departments", "Operator Surfaces", "Mission Control", "Local + Cloud Runtime"],
  },
  {
    title: "INDUSTRY PACKAGES",
    icon: Sparkles,
    bullets: ["Vertical Workflows", "Launch Assets", "Routing Logic", "Objection Handling", "Pack Monetization"],
  },
];

export default function PlatformInfoPage() {
  return (
    <PlatformSiteFrame
      activeLane="more-info"
      title="Explore the platform as a structured operating system."
      description="This lane explains the AI OS, communication stack, knowledge system, workforce model, and industry package framework without forcing the visitor into a purchase or demo flow first."
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {modules.map(({ title, icon: Icon, bullets }) => (
          <div
            key={title}
            className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                {title}
              </p>
            </div>
            <ul className="space-y-2 text-sm text-slate-600">
              {bullets.map((bullet) => (
                <li key={bullet}>- {bullet}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </PlatformSiteFrame>
  );
}
