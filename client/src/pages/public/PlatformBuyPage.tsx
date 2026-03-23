import React from "react";
import { CreditCard, Database, Headphones, Shield, Sparkles } from "lucide-react";

import PlatformSiteFrame from "@/components/public/PlatformSiteFrame";

const offers = [
  {
    title: "Platform",
    price: "$49/mo",
    description: "Core AI OS license, governance layer, dashboard access, and software activation.",
    icon: Shield,
    emphasized: true,
  },
  {
    title: "Data + Voice Services",
    price: "$50/mo",
    description: "Voice API services, runtime connectivity, and high-quality low-cost communication layer.",
    icon: Headphones,
    emphasized: true,
  },
  {
    title: "Industry Pack",
    price: "$299/mo",
    description: "Optional vertical workflows, prompts, launch assets, and routing logic for a specific industry.",
    icon: Sparkles,
    emphasized: false,
  },
  {
    title: "Data Pack",
    price: "$50",
    description: "Optional funded external intelligence balance for web search, reviews, and billable API research workflows.",
    icon: Database,
    emphasized: false,
  },
];

export default function PlatformBuyPage() {
  return (
    <PlatformSiteFrame
      activeLane="buy"
      title="Choose your activation path."
      description="AI Biz Bot is sold as licensed software plus metered communications and optional data/intelligence services. Start with the core platform, then add voice, industry packs, and funded data as needed."
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {offers.map(({ title, price, description, icon: Icon, emphasized }) => (
          <div
            key={title}
            className={`rounded-[28px] border p-6 ${
              emphasized
                ? "border-indigo-200 bg-white shadow-sm"
                : "border-slate-200 bg-white/75 opacity-90"
            }`}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {title}
                </p>
                <p className="text-3xl font-bold text-slate-950">{price}</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-slate-600">{description}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Monthly Commitment
            </p>
            <p className="text-3xl font-bold text-slate-950">$99 base activation</p>
          </div>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          The default paid path is Platform + Data Voice Services. Industry Packs and funded data
          are optional add-ons that expand capability and margin.
        </p>
      </div>
    </PlatformSiteFrame>
  );
}
