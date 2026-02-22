/**
 * PrepaidWallet.tsx
 *
 * "Partner Energy" balance card for the billing / partner-settings tab.
 * Shows remaining prepaid minutes, lifetime usage, and lets the owner top-up.
 *
 * Usage:
 *   <PrepaidWallet siteConfigId={site.id} businessName={site.name} />
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Zap, Clock, DollarSign, TrendingUp, RefreshCw, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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

/** Top-up packages matching the product spec. */
const TOP_UP_PACKAGES = [
  { label: "Starter Pack", minutes: 500, priceCents: 5000 },
  { label: "Power User Pack", minutes: 1200, priceCents: 10000 },
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
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface PrepaidWalletProps {
  siteConfigId: string;
  businessName?: string;
  /** Minutes included in the current plan (used to render the progress bar). */
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

  // ── Data fetching ──────────────────────────────────────────────────────────

  const {
    data: balance,
    isLoading: balanceLoading,
    isError: balanceError,
  } = useQuery<EnergyBalance>({
    queryKey: ["energy-balance", siteConfigId],
    queryFn: async () => {
      const res = await fetch(`/api/site-configs/${siteConfigId}/energy`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    refetchInterval: 30_000,
  });

  const {
    data: logs,
    isLoading: logsLoading,
  } = useQuery<VoiceUsageLog[]>({
    queryKey: ["energy-logs", siteConfigId],
    queryFn: async () => {
      const res = await fetch(`/api/site-configs/${siteConfigId}/energy/logs?limit=20`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  // ── Top-up mutation ────────────────────────────────────────────────────────

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

  // ── Derived values ─────────────────────────────────────────────────────────

  const minuteBalance = balance?.minuteBalance ?? null;
  const totalBilled = balance?.totalBilledMinutes ?? 0;
  const totalSpent = balance?.totalBilledAmountCents ?? 0;

  // Progress: consumed minutes out of the plan allowance
  const consumed = minuteBalance === null
    ? totalBilled
    : Math.max(0, planMinutes - minuteBalance);
  const progressPct = minuteBalance === null ? 0 : Math.min(100, (consumed / planMinutes) * 100);
  const isLow = minuteBalance !== null && minuteBalance <= 50;
  const isDepleted = minuteBalance !== null && minuteBalance <= 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Balance card */}
      <Card className={isDepleted ? "border-red-500" : isLow ? "border-yellow-500" : ""}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className={`h-5 w-5 ${isDepleted ? "text-red-500" : isLow ? "text-yellow-500" : "text-blue-500"}`} />
              <CardTitle className="text-base">Partner Energy</CardTitle>
            </div>
            {isDepleted && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Depleted
              </Badge>
            )}
            {isLow && !isDepleted && (
              <Badge variant="outline" className="border-yellow-500 text-yellow-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Low Energy
              </Badge>
            )}
          </div>
          <CardDescription>
            Prepaid minutes for {businessName} · $0.10 / min
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {balanceLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : balanceError ? (
            <p className="text-sm text-destructive">Failed to load balance.</p>
          ) : (
            <>
              {/* Big balance number */}
              <div className="flex items-end gap-2">
                <span className={`text-4xl font-bold tabular-nums ${isDepleted ? "text-red-500" : isLow ? "text-yellow-600" : "text-foreground"}`}>
                  {minuteBalance === null ? "∞" : minuteBalance.toLocaleString()}
                </span>
                <span className="text-muted-foreground mb-1">
                  {minuteBalance === null ? "unlimited" : "minutes remaining"}
                </span>
              </div>

              {/* Progress bar (only when balance is capped) */}
              {minuteBalance !== null && (
                <div className="space-y-1">
                  <Progress
                    value={progressPct}
                    className={isDepleted ? "[&>div]:bg-red-500" : isLow ? "[&>div]:bg-yellow-500" : ""}
                  />
                  <p className="text-xs text-muted-foreground">
                    {consumed} of {planMinutes} included minutes used
                  </p>
                </div>
              )}

              <Separator />

              {/* Lifetime stats */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{totalBilled.toLocaleString()} min</p>
                    <p className="text-muted-foreground text-xs">Total billed</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{formatCents(totalSpent)}</p>
                    <p className="text-muted-foreground text-xs">Lifetime revenue</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Zuckerberg Lock warning */}
          {isDepleted && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200">
              <strong>AI is currently locked.</strong> Callers will hear: "I'm low on energy
              for {businessName}. Your owner needs to top up my reserves so I can keep
              assisting you."
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top-up packages */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            <CardTitle className="text-base">Top-Up Energy</CardTitle>
          </div>
          <CardDescription>Add prepaid minutes to keep the AI running</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {TOP_UP_PACKAGES.map((pkg) => (
            <div
              key={pkg.minutes}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <div>
                <p className="font-medium text-sm">{pkg.label}</p>
                <p className="text-xs text-muted-foreground">
                  {pkg.minutes.toLocaleString()} minutes · {formatCents(pkg.priceCents)}
                </p>
              </div>
              <Button
                size="sm"
                variant={isDepleted ? "default" : "outline"}
                disabled={topUpMutation.isPending}
                onClick={() => {
                  setToppingUp(true);
                  topUpMutation.mutate(pkg.minutes);
                }}
              >
                {topUpMutation.isPending && toppingUp ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  "Add"
                )}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Usage log */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent Calls</CardTitle>
          <CardDescription>Last 20 billed voice sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : !logs || logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No calls logged yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead className="text-right">Billed</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs">{formatDate(log.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {log.callType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {formatDuration(log.rawDurationSeconds)}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {log.billedMinutes} min
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium">
                      {formatCents(log.billedAmountCents)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
