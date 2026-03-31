/**
 * Thin admin control: Cloudbeds GraphQL discovery onboarding SMS (invitation / reminder).
 * POST only to existing route; displays API result for operator clarity.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MessageSquare } from "lucide-react";

type Props = {
  siteConfigId: string;
  token: string | null;
};

export function IntegrationOnboardingSmsCard({ siteConfigId, token }: Props) {
  const [toOverride, setToOverride] = useState("");
  const [dryRun, setDryRun] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastJson, setLastJson] = useState<unknown>(null);
  const [lastStatus, setLastStatus] = useState<number | null>(null);

  const send = async (variant: "invitation" | "reminder") => {
    if (!token) {
      setLastJson({ error: "Not signed in" });
      setLastStatus(401);
      return;
    }
    setLoading(true);
    setLastJson(null);
    setLastStatus(null);
    try {
      const body: Record<string, unknown> = { variant, dryRun };
      const trimmed = toOverride.trim();
      if (trimmed) body.toE164 = trimmed;
      const res = await fetch(
        `/api/integration-onboarding/cloudbeds-graphql-discovery/${encodeURIComponent(siteConfigId)}/send-sms`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          body: JSON.stringify(body),
        },
      );
      const data = await res.json().catch(() => ({ parseError: true }));
      setLastStatus(res.status);
      setLastJson(data);
    } catch (e) {
      setLastJson({ error: e instanceof Error ? e.message : String(e) });
      setLastStatus(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-sui bg-slate-900/40 border border-indigo-500/20 p-5 space-y-4">
      <div className="flex items-center gap-2 text-slate-200">
        <MessageSquare className="w-4 h-4 text-indigo-400" />
        <h3 className="text-sm font-bold uppercase tracking-wider">Integration onboarding SMS</h3>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">
        Cloudbeds GraphQL discovery — sends a secure HTTPS connect link via PLATFORM_CARE (no API keys in SMS).
        Requires Cloudbeds integration and operator phone on the site, or override below.
      </p>
      <div className="space-y-2">
        <Label className="text-slate-400 text-xs">Override phone (E.164 optional)</Label>
        <Input
          value={toOverride}
          onChange={(e) => setToOverride(e.target.value)}
          placeholder="+1..."
          className="bg-slate-800 border-slate-700 text-white max-w-md"
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
        <input
          type="checkbox"
          checked={dryRun}
          onChange={(e) => setDryRun(e.target.checked)}
          className="rounded border-slate-600"
        />
        Dry run (no Twilio; handoff still minted unless suppressed)
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={loading || !token}
          onClick={() => void send("invitation")}
          className="bg-indigo-600 hover:bg-indigo-500 gap-1.5"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Send invitation
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={loading || !token}
          onClick={() => void send("reminder")}
          className="border-slate-600 text-slate-200 hover:bg-slate-800 gap-1.5"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Send reminder
        </Button>
      </div>
      {lastStatus !== null && (
        <div className="space-y-1">
          <p className="text-xs text-slate-500">HTTP {lastStatus}</p>
          <pre className="text-[11px] text-slate-300 bg-slate-950/80 rounded-sui p-3 overflow-x-auto max-h-64 border border-slate-800">
            {JSON.stringify(lastJson, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
