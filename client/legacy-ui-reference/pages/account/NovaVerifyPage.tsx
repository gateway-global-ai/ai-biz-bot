/**
 * NOVA Sovereign IDV flow — protected route.
 * Identity + invoicing: shows session state and billing summary (platform fee, voice by agent, overages).
 * Spec: .system_design/nova_sovereign_ruleset_v1.yaml
 * Extraction: .system_design/extractions/extraction_2026-02-28.md (Step enum, progress, layout)
 * Path: /nova-verify/:businessType/:clientId (clientId = sessionId) or /account/nova-verify
 */

import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useCustomerAuth } from "@/lib/customerAuth";
import { motion } from "framer-motion";
import { Loader2, Shield, CheckCircle, CreditCard } from "lucide-react";

// From extraction: step names for display (protocol steps from YAML, not full 11-step enum)
interface NovaSessionState {
  session_id: string;
  business_id: string;
  protocol_level: number;
  otp_verified: boolean;
  magic_link_verified: boolean;
  biometric_verified: boolean;
  id_verified: boolean;
  signature_url: string | null;
  steps: string[];
  currentStepIndex: number;
}

export default function NovaVerifyPage() {
  const [, params] = useRoute("/nova-verify/:businessType/:clientId");
  const businessType = params?.businessType ?? "";
  const clientId = params?.clientId ?? "";
  const { token } = useAuth();
  const { token: customerToken, isAuthenticated: isCustomerAuthenticated } = useCustomerAuth();

  const { data: session, isLoading, isError, error } = useQuery<NovaSessionState>({
    queryKey: ["/api/nova/dashboard/session", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/nova/dashboard/session/${clientId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!clientId && !!token,
  });

  const { data: currentBill, isLoading: billLoading } = useQuery({
    queryKey: ["/api/customer/current-bill"],
    queryFn: async () => {
      const res = await fetch("/api/customer/current-bill", {
        headers: customerToken ? { Authorization: `Bearer ${customerToken}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load bill");
      return res.json();
    },
    enabled: isCustomerAuthenticated && !!customerToken,
  });

  const totalSteps = session?.steps?.length ?? 1;
  const progressPct = totalSteps > 1 ? (session ? (session.currentStepIndex / (totalSteps - 1)) * 100 : 0) : 0;
  const currentStepName = session?.steps?.[session.currentStepIndex] ?? "—";

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">NOVA Security</h2>
              <p className="text-[10px] font-semibold text-indigo-400 tracking-widest uppercase">Live Protocol</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="h-1 w-24 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-indigo-500"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              {session ? `${session.currentStepIndex + 1}/${totalSteps}` : "—"}
            </span>
          </div>
        </div>

        <div className="flex gap-4 text-xs font-mono mb-4">
          <span className="data-chip">businessType: {businessType || "—"}</span>
          <span className="data-chip">session: {clientId || "—"}</span>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mr-2" />
            <span>Loading session…</span>
          </div>
        )}

        {isError && (
          <p className="text-sm text-rose-400 py-4">
            {error instanceof Error ? error.message : "Failed to load session"}
          </p>
        )}

        {session && !isLoading && !isError && (
          <>
            <div className="border-t border-slate-800/60 pt-4 mt-4">
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Current step</p>
              <p className="text-white font-semibold">{currentStepName}</p>
            </div>
            {session.otp_verified && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-center gap-2 text-emerald-400 text-sm"
              >
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>OTP verified — next: {session.steps[session.currentStepIndex] ?? "Complete"}</span>
              </motion.div>
            )}
            <p className="text-slate-500 text-xs mt-6">
              Protocol Level {session.protocol_level} · Node: Alpha-9
            </p>
          </>
        )}
      </motion.div>

      {/* Billing summary — same structure as MyAccount (Software / Services / Overages) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
        className="mt-6 rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl p-6 shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Billing summary</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Platform fee · Voice by agent · Overages</p>
          </div>
        </div>
        {!isCustomerAuthenticated || !customerToken ? (
          <p className="text-sm text-slate-500">
            Sign in to your account to see your bill, or view it in your{" "}
            <a href="/my-account" className="text-indigo-400 hover:underline">Command Center</a>.
          </p>
        ) : billLoading ? (
          <div className="flex items-center gap-2 py-4 text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading bill…</span>
          </div>
        ) : currentBill ? (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Software — {currentBill.platformFee?.label ?? "Platform fee"}</span>
              <span className="text-white font-medium">${Number(currentBill.platformFee?.amount ?? 0).toFixed(2)}</span>
            </div>
            {(currentBill.voiceByAgent ?? []).map((v: { agentName: string; amount: number }, i: number) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-slate-400">Services — Voice AI · {v.agentName}</span>
                <span className="text-white font-medium">${Number(v.amount ?? 0).toFixed(2)}</span>
              </div>
            ))}
            {(currentBill.overages ?? []).map((o: { label: string; units: number; amount: number }, i: number) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-slate-400">Overages — {o.label} ({o.units} min)</span>
                <span className="text-white font-medium">${Number(o.amount ?? 0).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-slate-700/60 pt-2 flex justify-between text-sm font-semibold">
              <span className="text-slate-200">Total</span>
              <span className="text-white">${Number(currentBill.total ?? 0).toFixed(2)}</span>
            </div>
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}
