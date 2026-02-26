/**
 * PrepaidWallet — Sovereign OS edition.
 * "Partner Energy" balance card — Phase 3 Energy Refill integration.
 * Jason Standard: glass panels, indigo-pulse on depleted state, emerald verified badges,
 * framer-motion transitions, monospace data chips for all metrics.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Zap, Clock, DollarSign, TrendingUp, RefreshCw,
  AlertTriangle, CreditCard, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

interface EnergyBalance {
  minuteBalance: number | null;
  totalBilledMinutes: number;
  totalBilledAmountCents: number;
}

interface VoiceUsageLog {
  id: string;
  callSid: string | null;
  callType: string;
  rawDurationSeconds: number;
  billedMinutes: number;
  billedAmountCents: number;
  createdAt: string;
}

const TOP_UP_PACKAGES = [
  { label: "Starter Pack", minutes: 500, priceCents: 5000, packageType: "basic" as const, tagline: "Perfect for getting started" },
  { label: "Power User Pack", minutes: 1200, priceCents: 10000, packageType: "pro" as const, tagline: "Most popular — save 17%" },
] as const;

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}
function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

interface PrepaidWalletProps {
  siteConfigId: string;
  businessName?: string;
  planMinutes?: number;
}

export function PrepaidWallet({
  siteConfigId,
  businessName = "this business",
  planMinutes = 500,
}: PrepaidWalletProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [toppingUp, setToppingUp] = useState(false);
  const [stripeRefillPackage, setStripeRefillPackage] = useState<"basic" | "pro" | null>(null);

  const { data: balance, isLoading: balanceLoading, isError: balanceError } =
    useQuery<EnergyBalance>({
      queryKey: ["energy-balance", siteConfigId],
      queryFn: async () => {
        const res = await fetch(`/api/site-configs/${siteConfigId}/energy`);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      },
      refetchInterval: 30_000,
    });

  const { data: logs, isLoading: logsLoading } = useQuery<VoiceUsageLog[]>({
    queryKey: ["energy-logs", siteConfigId],
    queryFn: async () => {
      const res = await fetch(`/api/site-configs/${siteConfigId}/energy/logs?limit=20`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const topUpMutation = useMutation({
    mutationFn: async (minutes: number) => {
      const res = await fetch(`/api/site-configs/${siteConfigId}/energy/top-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["energy-balance", siteConfigId] });
      toast({
        title: "Energy topped up! ⚡",
        description: `Added ${data.added} minutes. New balance: ${data.minuteBalance} minutes.`,
      });
      setToppingUp(false);
    },
    onError: (err: Error) => {
      toast({ title: "Top-up failed", description: err.message, variant: "destructive" });
    },
  });

  const stripeRefillMutation = useMutation({
    mutationFn: async (packageType: "basic" | "pro") => {
      const res = await fetch("/api/billing/create-refill-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: siteConfigId, packageType }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || res.statusText);
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data?.url) window.location.href = data.url;
      else toast({ title: "Refill", description: "Complete payment in the new tab." });
    },
    onError: (err: Error) => {
      toast({ title: "Refill failed", description: err.message, variant: "destructive" });
      setStripeRefillPackage(null);
    },
  });

  const minuteBalance = balance?.minuteBalance ?? null;
  const totalBilled   = balance?.totalBilledMinutes ?? 0;
  const totalSpent    = balance?.totalBilledAmountCents ?? 0;
  const consumed      = minuteBalance === null ? totalBilled : Math.max(0, planMinutes - minuteBalance);
  const progressPct   = minuteBalance === null ? 0 : Math.min(100, (consumed / planMinutes) * 100);
  const isLow         = minuteBalance !== null && minuteBalance <= 50;
  const isDepleted    = minuteBalance !== null && minuteBalance <= 0;

  const statusColor = isDepleted ? "rose" : isLow ? "amber" : "indigo";
  const glowClass   = isDepleted ? "animate-sovereign-pulse border-rose-500/40 shadow-rose-500/20"
                    : isLow      ? "animate-sovereign-pulse border-amber-500/40 shadow-amber-500/20"
                    : "border-indigo-500/20";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-4"
    >
      {/* Balance card */}
      <div className={`rounded-sui bg-slate-900/60 backdrop-blur-xl border shadow-2xl ${glowClass}`}>
        <div className="p-5 pb-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <motion.div
                animate={isDepleted || isLow ? { scale: [1, 1.15, 1] } : {}}
                transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
              >
                <Zap className={`h-5 w-5 ${isDepleted ? "text-rose-400" : isLow ? "text-amber-400" : "text-indigo-400"}`} />
              </motion.div>
              <h3 className="text-base font-bold text-white">Partner Energy</h3>
            </div>
            <div className="flex items-center gap-2">
              {isDepleted && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-rose-500/15 text-rose-400 border border-rose-500/25 px-2 py-0.5 rounded-full font-semibold uppercase">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  Depleted
                </span>
              )}
              {isLow && !isDepleted && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-full font-semibold uppercase">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  Low Energy
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Prepaid minutes for <span className="text-slate-400">{businessName}</span> · <span className="data-chip">$0.10 / min</span>
          </p>

          {balanceLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-40 bg-slate-800/60" />
              <Skeleton className="h-2 w-full bg-slate-800/60" />
            </div>
          ) : balanceError ? (
            <p className="text-sm text-rose-400">Failed to load balance.</p>
          ) : (
            <>
              <div className="flex items-end gap-2 mb-4">
                <span className={`text-5xl font-bold tabular-nums tracking-tight ${isDepleted ? "text-rose-400" : isLow ? "text-amber-400" : "text-white"}`}>
                  {minuteBalance === null ? "∞" : minuteBalance.toLocaleString()}
                </span>
                <span className="text-slate-500 mb-1 text-sm">
                  {minuteBalance === null ? "unlimited" : "min remaining"}
                </span>
              </div>

              {minuteBalance !== null && (
                <div className="space-y-1.5 mb-4">
                  <div className="w-full h-1.5 bg-slate-800/60 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className={`h-full rounded-full ${isDepleted ? "bg-rose-500" : isLow ? "bg-amber-500" : "bg-indigo-500"}`}
                    />
                  </div>
                  <p className="text-[10px] text-slate-600">
                    {consumed} of {planMinutes} included minutes used
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 border-t border-slate-800/60 pt-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-600 shrink-0" />
                  <div>
                    <p className="font-bold text-white text-sm">{totalBilled.toLocaleString()} <span className="text-slate-500 font-normal text-xs">min</span></p>
                    <p className="text-[10px] text-slate-600">Total billed</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-slate-600 shrink-0" />
                  <div>
                    <p className="font-bold text-white text-sm">{formatCents(totalSpent)}</p>
                    <p className="text-[10px] text-slate-600">Lifetime revenue</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Depleted lockout warning */}
        <AnimatePresence>
          {isDepleted && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-5 mb-5 rounded-[14px] bg-rose-950/40 border border-rose-500/25 p-3 text-xs text-rose-300"
            >
              <strong className="text-rose-200">AI is currently locked.</strong>{" "}
              Callers will hear: "I'm low on energy for {businessName}. Your owner needs to top up my reserves."
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Top-up packages — Phase 3 Stripe Refill */}
      <div className="rounded-sui bg-slate-900/60 backdrop-blur-xl border border-indigo-500/15 shadow-xl overflow-hidden">
        <div className="p-5 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Top-Up Energy</h3>
            <span className="badge-insight ml-1">Phase 3</span>
          </div>
          <p className="text-xs text-slate-500 mb-4">Add prepaid minutes to keep the AI running 24/7</p>
        </div>

        <div className="px-5 pb-5 space-y-2.5">
          {TOP_UP_PACKAGES.map((pkg) => (
            <motion.div
              key={pkg.minutes}
              whileHover={{ x: 2 }}
              className="flex items-center justify-between rounded-[14px] bg-slate-800/40 border border-slate-700/30 hover:border-indigo-500/25 p-4 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold text-white text-sm">{pkg.label}</p>
                  {pkg.packageType === "pro" && (
                    <span className="badge-insight">Best Value</span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  <span className="data-chip">{pkg.minutes.toLocaleString()} min</span>
                  <span className="mx-1.5 text-slate-700">·</span>
                  <span className="text-slate-400 font-medium">{formatCents(pkg.priceCents)}</span>
                  <span className="ml-1.5 text-slate-600 italic">{pkg.tagline}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Dev top-up (internal) */}
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-700 text-slate-300 hover:border-indigo-500/40 hover:text-white text-xs h-8"
                  disabled={topUpMutation.isPending}
                  onClick={() => { setToppingUp(true); topUpMutation.mutate(pkg.minutes); }}
                >
                  {topUpMutation.isPending && toppingUp ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    "Add"
                  )}
                </Button>
                {/* Stripe refill */}
                <Button
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8 shadow-lg shadow-indigo-500/20"
                  disabled={stripeRefillMutation.isPending}
                  onClick={() => { setStripeRefillPackage(pkg.packageType); stripeRefillMutation.mutate(pkg.packageType); }}
                >
                  {stripeRefillMutation.isPending && stripeRefillPackage === pkg.packageType ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="h-3 w-3 mr-1" />
                      Pay
                      <ChevronRight className="h-3 w-3 ml-0.5" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Usage log */}
      <div className="rounded-sui bg-slate-900/60 backdrop-blur-xl border border-indigo-500/15 shadow-xl overflow-hidden">
        <div className="p-5 pb-3">
          <h3 className="text-base font-bold text-white mb-0.5">Recent Calls</h3>
          <p className="text-xs text-slate-500">Last 20 billed voice sessions</p>
        </div>
        <div className="px-5 pb-5">
          {logsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full bg-slate-800/60" />
              ))}
            </div>
          ) : !logs || logs.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-4">No calls logged yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800/60 hover:bg-transparent">
                  <TableHead className="text-slate-600 text-[10px]">Date</TableHead>
                  <TableHead className="text-slate-600 text-[10px]">Type</TableHead>
                  <TableHead className="text-right text-slate-600 text-[10px]">Duration</TableHead>
                  <TableHead className="text-right text-slate-600 text-[10px]">Billed</TableHead>
                  <TableHead className="text-right text-slate-600 text-[10px]">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="border-slate-800/40 hover:bg-slate-800/20">
                    <TableCell className="text-[10px] text-slate-500">{formatDate(log.createdAt)}</TableCell>
                    <TableCell>
                      <span className="data-chip capitalize">{log.callType}</span>
                    </TableCell>
                    <TableCell className="text-right text-[10px] text-slate-400 font-mono">
                      {formatDuration(log.rawDurationSeconds)}
                    </TableCell>
                    <TableCell className="text-right text-[10px] text-slate-400 font-mono">
                      {log.billedMinutes} min
                    </TableCell>
                    <TableCell className="text-right text-xs font-bold text-emerald-400 font-mono">
                      {formatCents(log.billedAmountCents)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </motion.div>
  );
}
