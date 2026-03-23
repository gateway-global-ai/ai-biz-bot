/**
 * ResellerDashboard — Cohesive reseller interface.
 *
 * - Activate reseller account (Stripe Connect)
 * - Referral links to home page sales funnel
 * - Add new prospect: business name + location (Google lookup), optional "search near" grounding
 * - My Businesses: list with Invite via SMS, Configure AI, Manage
 * - Track money / commissions
 * - Franchise referral: placeholder (managed separately)
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  Plus,
  Link2,
  MessageSquare,
  Settings2,
  ExternalLink,
  Loader2,
  Banknote,
  MapPin,
  Search,
  Users,
  Copy,
  Check,
} from "lucide-react";
import PayoutDashboard from "@/components/reseller/PayoutDashboard";
import CommissionReport from "@/components/reseller/CommissionReport";
import { queryClient, apiRequest } from "@/lib/queryClient";

const origin = typeof window !== "undefined" ? window.location.origin : "";

// ─── Add Prospect Card (Google lookup + optional grounding) ───────────────────

function AddProspectCard({ onCreated }: { onCreated: (id: string) => void }) {
  const { toast } = useToast();
  const [businessName, setBusinessName] = useState("");
  const [locationHint, setLocationHint] = useState("");
  const [useGrounding, setUseGrounding] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);

  const runSearch = async () => {
    const query = businessName.trim();
    if (!query) {
      toast({ title: "Enter a business name", variant: "destructive" });
      return;
    }
    setSearching(true);
    setResults([]);
    try {
      const textQuery = useGrounding && locationHint.trim()
        ? `${query}, ${locationHint.trim()}`
        : query;
      const body: { query: string; location?: { latitude: number; longitude: number }; radius?: number } = { query: textQuery };
      // Optional: if we had geocode we could set body.location and body.radius here
      const res = await fetch("/api/places/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setResults(data.places || []);
      if (!(data.places?.length)) {
        toast({
          title: "No results",
          description: useGrounding ? "Try a different area or business name." : "Try turning on 'Search near' and add a city or address.",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({ title: "Search failed", description: e.message, variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const createFromPlace = async (place: any) => {
    setCreating(true);
    try {
      const res = await fetch("/api/site-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: place.name,
          placeId: place.placeId,
          placeData: {
            name: place.name,
            formatted_address: place.address,
            place_id: place.placeId,
            location: place.location,
            types: place.types || ["establishment"],
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Create failed");
      }
      const created = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/site-configs"] });
      setResults([]);
      setBusinessName("");
      setLocationHint("");
      toast({ title: "Prospect added", description: created.name });
      onCreated(created.id);
    } catch (e: any) {
      toast({ title: "Failed to add", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card className="bg-white border border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Plus className="w-4 h-4 text-indigo-500" />
          Add new prospect
        </CardTitle>
        <CardDescription>
          Look up a business by name. Use &quot;Search near&quot; if the business isn&apos;t found (e.g. add city or address).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-slate-600 text-xs">Business name</Label>
          <Input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. Mike's Pizza"
            className="mt-1 bg-white border-slate-300 text-slate-900"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="grounding"
            checked={useGrounding}
            onCheckedChange={setUseGrounding}
          />
          <Label htmlFor="grounding" className="text-slate-600 text-sm">Limit search to area (grounding)</Label>
        </div>
        {useGrounding && (
          <div>
            <Label className="text-slate-600 text-xs">City or address</Label>
            <Input
              value={locationHint}
              onChange={(e) => setLocationHint(e.target.value)}
              placeholder="e.g. Lafayette LA"
              className="mt-1 bg-white border-slate-300 text-slate-900"
            />
          </div>
        )}
        <Button
          onClick={runSearch}
          disabled={searching || !businessName.trim()}
          className="w-full"
        >
          {searching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
          Search Google
        </Button>
        {results.length > 0 && (
          <div className="border-t border-slate-200 pt-3 space-y-2 max-h-48 overflow-y-auto">
            <p className="text-xs text-slate-500">Select to add as prospect:</p>
            {results.slice(0, 5).map((p) => (
              <button
                key={p.placeId}
                type="button"
                onClick={() => createFromPlace(p)}
                disabled={creating}
                className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors"
              >
                <span className="font-medium text-slate-900">{p.name}</span>
                {p.address && <span className="block text-xs text-slate-500 truncate">{p.address}</span>}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── My Businesses list ───────────────────────────────────────────────────────

function MyBusinessesList({ onConfigure }: { onConfigure: (siteId: string) => void }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [invitePhone, setInvitePhone] = useState<{ [id: string]: string }>({});
  const [sendingInvite, setSendingInvite] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ["/api/site-configs"],
    queryFn: () => fetch("/api/site-configs").then((r) => r.json()),
  });

  const sendInvite = async (siteId: string) => {
    const phone = invitePhone[siteId]?.trim();
    if (!phone) {
      toast({ title: "Enter phone number", variant: "destructive" });
      return;
    }
    setSendingInvite(siteId);
    try {
      const res = await fetch(`/api/admin/sites/${siteId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      toast({ title: "Invite sent", description: "SMS sent to " + phone });
      setInvitePhone((prev) => ({ ...prev, [siteId]: "" }));
    } catch (e: any) {
      toast({ title: "Invite failed", description: e.message, variant: "destructive" });
    } finally {
      setSendingInvite(null);
    }
  };

  const copyReferralLink = (slug: string | null) => {
    if (!slug) return;
    const url = `${origin}/biz/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    toast({ title: "Link copied", description: url });
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-lg" />;
  }

  return (
    <Card className="bg-white border border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="w-4 h-4 text-indigo-500" />
          My Businesses
        </CardTitle>
        <CardDescription>
          Prospects you&apos;ve added. Invite owners via SMS, configure AI, or manage the site.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sites.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">No businesses yet. Add a prospect above.</p>
        ) : (
          <ul className="space-y-3">
            {sites.map((site: any) => (
              <li
                key={site.id}
                className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900 truncate">{site.name}</p>
                  {site.slug && (
                    <button
                      type="button"
                      onClick={() => copyReferralLink(site.slug)}
                      className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1"
                    >
                      {copiedSlug === site.slug ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      /biz/{site.slug}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Input
                      placeholder="Phone for SMS"
                      value={invitePhone[site.id] ?? ""}
                      onChange={(e) => setInvitePhone((p) => ({ ...p, [site.id]: e.target.value }))}
                      className="w-32 h-8 text-xs bg-white border-slate-300"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sendInvite(site.id)}
                      disabled={sendingInvite === site.id}
                    >
                      {sendingInvite === site.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />}
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onConfigure(site.id)}
                    className="border-indigo-300 text-indigo-600 hover:bg-indigo-50"
                  >
                    <Settings2 className="w-3 h-3 mr-1" /> Configure AI
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setLocation(`/my-account/site/${site.id}`)}
                  >
                    Manage <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Referral links card ──────────────────────────────────────────────────────

function ReferralLinksCard() {
  const [copied, setCopied] = useState(false);
  const funnelUrl = `${origin}/business`;

  const copy = () => {
    navigator.clipboard.writeText(funnelUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="bg-white border border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Link2 className="w-4 h-4 text-indigo-500" />
          Referral links
        </CardTitle>
        <CardDescription>
          Share the home page sales funnel. New signups can be attributed to you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2">
          <Input readOnly value={funnelUrl} className="bg-slate-50 text-slate-700 text-sm font-mono" />
          <Button size="sm" variant="outline" onClick={copy}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export default function ResellerDashboard() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Reseller Dashboard</h1>
              <p className="text-sm text-slate-500 mt-0.5">Prospects, invite via SMS, referral links & earnings</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setLocation("/app/mixing-board")}>
              <Users className="w-4 h-4 mr-2" /> Mixing Board
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Activate reseller account */}
        <section>
          <PayoutDashboard />
        </section>

        {/* Referral links */}
        <section>
          <ReferralLinksCard />
        </section>

        {/* Add new prospect (Google lookup + grounding) */}
        <section>
          <AddProspectCard
            onCreated={(id) => {
              setLocation(`/app/aibizbot?site=${id}&single=1`);
            }}
          />
        </section>

        {/* My Businesses */}
        <section>
          <MyBusinessesList
            onConfigure={(siteId) => setLocation(`/app/aibizbot?site=${siteId}&single=1`)}
          />
        </section>

        {/* Track money */}
        <section>
          <Card className="bg-white border border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Banknote className="w-4 h-4 text-indigo-500" />
                Earnings & commissions
              </CardTitle>
              <CardDescription>Watch your balance and referral earnings.</CardDescription>
            </CardHeader>
            <CardContent>
              <CommissionReport />
            </CardContent>
          </Card>
        </section>

        {/* Franchise placeholder */}
        <section>
          <Card className="bg-slate-50 border border-slate-200">
            <CardContent className="py-6">
              <p className="text-sm text-slate-600">
                <strong>Franchise referral program:</strong> Bulk import of franchise locations is managed separately. Contact your account manager to add a franchise.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
