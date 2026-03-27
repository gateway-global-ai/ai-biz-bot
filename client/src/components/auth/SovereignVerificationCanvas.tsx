/**
 * Tier-2 opaque reference handoff (Zero-LLM path).
 * Submits vault token refs via POST /api/v1/secure-vault/submit — raw files belong in upstream vaults; paste opaque IDs only.
 */
import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, KeyRound, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  { value: "pms_connection_ref", label: "PMS connection ref" },
  { value: "payment_instrument_ref", label: "Payment instrument ref" },
  { value: "integration_token_ref", label: "Integration token ref" },
] as const;

export type VaultCategory = (typeof CATEGORIES)[number]["value"];

export interface SovereignVerificationCanvasProps {
  siteConfigId: string;
  token: string | null;
}

export function SovereignVerificationCanvas({ siteConfigId, token }: SovereignVerificationCanvasProps) {
  const { toast } = useToast();
  const [category, setCategory] = useState<VaultCategory>("integration_token_ref");
  const [opaqueReference, setOpaqueReference] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const [attestedAt, setAttestedAt] = useState(() => new Date().toISOString());
  const [loading, setLoading] = useState(false);
  const [lastHandoff, setLastHandoff] = useState<{ vaultHandoffToken: string; category: string } | null>(null);

  const canSubmit = useMemo(
    () => !!token && siteConfigId.length > 0 && opaqueReference.trim().length >= 8 && idempotencyKey.trim().length >= 8,
    [token, siteConfigId, opaqueReference, idempotencyKey],
  );

  const regenerateIdempotency = useCallback(() => {
    setIdempotencyKey(
      typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
  }, []);

  const submit = async () => {
    if (!token || !canSubmit) return;
    setLoading(true);
    setLastHandoff(null);
    try {
      const res = await fetch("/api/v1/secure-vault/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          siteConfigId,
          category,
          opaqueReference: opaqueReference.trim(),
          idempotencyKey: idempotencyKey.trim(),
          attestedAt: attestedAt.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

      if (!res.ok) {
        const msg =
          (typeof data.message === "string" && data.message) ||
          (typeof data.error === "string" && data.error) ||
          `Request failed (${res.status})`;
        toast({ title: "Vault handoff failed", description: msg, variant: "destructive" });
        return;
      }

      if (data.success === true && typeof data.vaultHandoffToken === "string") {
        setLastHandoff({
          vaultHandoffToken: data.vaultHandoffToken,
          category: typeof data.category === "string" ? data.category : category,
        });
        toast({ title: "Opaque reference stored", description: "Handoff token recorded. The model never receives the raw reference." });
        return;
      }

      toast({ title: "Unexpected response", description: "Vault API returned an unrecognized shape.", variant: "destructive" });
    } catch (e: unknown) {
      toast({
        title: "Network error",
        description: e instanceof Error ? e.message : "Request failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl p-6 space-y-4"
    >
      <div className="flex items-start gap-3">
        <KeyRound className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Zero-LLM vault handoff</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Paste an <span className="text-slate-300">opaque reference</span> from your vault or tokenization layer only. Raw ID images and
            files are not uploaded here—ingest upstream, then submit the resulting ref.
          </p>
        </div>
      </div>

      {!token && (
        <p className="text-xs text-amber-200/90 border border-amber-500/30 rounded-sui px-3 py-2 bg-amber-500/10">
          Sign in with an admin session to submit vault references.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label className="text-slate-300 text-xs">Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as VaultCategory)} disabled={!token}>
            <SelectTrigger className="bg-slate-950/50 border-white/10 text-slate-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label className="text-slate-300 text-xs">Opaque reference</Label>
          <Textarea
            value={opaqueReference}
            onChange={(e) => setOpaqueReference(e.target.value)}
            placeholder="tok_… or vault-issued opaque ID (min 8 characters)"
            className="min-h-[88px] bg-slate-950/50 border-white/10 text-slate-100 placeholder:text-slate-500 font-mono text-xs"
            disabled={!token}
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-300 text-xs">Attested at (ISO 8601)</Label>
          <Input
            value={attestedAt}
            onChange={(e) => setAttestedAt(e.target.value)}
            className="bg-slate-950/50 border-white/10 text-slate-100 font-mono text-xs"
            disabled={!token}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-slate-300 text-xs">Idempotency key</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-[10px] text-indigo-300"
              onClick={regenerateIdempotency}
              disabled={!token || loading}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              New key
            </Button>
          </div>
          <Input
            value={idempotencyKey}
            onChange={(e) => setIdempotencyKey(e.target.value)}
            className="bg-slate-950/50 border-white/10 text-slate-100 font-mono text-xs"
            disabled={!token}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={() => void submit()}
          disabled={!canSubmit || loading}
          className="bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Submit to secure vault
        </Button>
        <span className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]" title={siteConfigId}>
          Site: {siteConfigId}
        </span>
      </div>

      {lastHandoff && (
        <div className="rounded-sui border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-emerald-300/90 font-bold">vaultHandoffToken (safe for automation)</p>
          <p className="text-xs font-mono text-emerald-100 break-all">{lastHandoff.vaultHandoffToken}</p>
          <p className="text-[10px] text-slate-400">
            Category: <span className="font-mono text-slate-300">{lastHandoff.category}</span>
          </p>
        </div>
      )}
    </motion.div>
  );
}
