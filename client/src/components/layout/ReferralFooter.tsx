/**
 * Viral referral footer — "Deployed by AI Biz Bot" on customer site previews.
 * Future: resolve reseller name from siteConfigId for dynamic attribution.
 */

import React from "react";

interface ReferralFooterProps {
  siteConfigId?: string;
}

export function ReferralFooter({ siteConfigId }: ReferralFooterProps) {
  return (
    <div className="w-full py-4 border-t border-white/5 text-center">
      <a
        href="https://aibizbot.gatewayglobal.ai"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-slate-600 hover:text-cyan-400 tracking-widest uppercase transition-colors"
      >
        AI Business Site by{" "}
        <span className="font-bold text-cyan-400/70">AI Biz Bot</span>
      </a>
    </div>
  );
}
