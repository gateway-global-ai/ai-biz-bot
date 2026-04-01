/**
 * AI Biz Bot Dashboard — control and transparency when no site is selected.
 * Surfaces: onboarding (demo leads, add site), upsell (billing/plans), pricing model, Stripe/billing link.
 * When embedded (no sidebar), includes "Your sites" list so you can pick a site from here.
 */
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  Plus,
  Globe,
  Users,
  CreditCard,
  BarChart3,
  DollarSign,
  ArrowRight,
  LayoutDashboard,
  FileText,
  Star,
  ExternalLink,
} from 'lucide-react';
import { PLAN_LIMITS, type PlanType } from '@shared/schema';

const OVERAGE_RATES = [
  { service: 'Phone Voice AI', rate: 0.25, unit: 'min', currency: 'USD' },
  { service: 'Web Voice AI', rate: 0.18, unit: 'min', currency: 'USD' },
  { service: 'A2P SMS', rate: 0.125, unit: 'message', currency: 'USD' },
] as const;

export interface SiteForPicker {
  id: string;
  name: string;
  domain?: string | null;
  slug?: string | null;
  chatbotEnabled?: boolean;
  placeData?: { rating?: number } | null;
}

interface AiBizBotDashboardProps {
  sitesCount: number;
  demoLeadsCount: number;
  onAddSite: () => void;
  /** When provided, show "Your sites" section so user can select a site (used when there is no sidebar). */
  sites?: SiteForPicker[];
  onSelectSite?: (siteId: string) => void;
  /** Demo leads for "Customers & demos" block when no sidebar */
  demoLeads?: { id: string; businessName: string; phone?: string | null; demoUrl: string; siteId?: string | null; createdAt?: string | null }[];
}

export function AiBizBotDashboard({
  sitesCount,
  demoLeadsCount,
  onAddSite,
  sites = [],
  onSelectSite,
  demoLeads = [],
}: AiBizBotDashboardProps) {
  const planKeys: PlanType[] = ['free', 'pro', 'voice', 'enterprise'];
  const showSitePicker = sites.length > 0 && onSelectSite;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header + one action row (no redundant metric cards) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <LayoutDashboard className="w-7 h-7 text-indigo-400" />
            AI Biz Bot — Control & Transparency
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Onboard customers, upsell, and consult from one place.
            {showSitePicker && (
              <span className="block mt-1 text-slate-500">
                {sitesCount} sites · {demoLeadsCount} demo leads
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button size="sm" className="bg-indigo-500 hover:bg-indigo-600 text-white" onClick={onAddSite}>
            <Plus className="w-4 h-4 mr-1" />
            Add Site
          </Button>
          <Link href="/platform/settings/billing-engine">
            <Button variant="outline" size="sm" className="border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/20">
              Billing Engine
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Your sites — full list, page scrolls (no inner scroll box) */}
      {showSitePicker && (
        <Card className="rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-indigo-400" />
                Your sites
              </CardTitle>
              <Button size="sm" className="bg-indigo-500 hover:bg-indigo-600" onClick={onAddSite}>
                <Plus className="w-4 h-4 mr-1" /> Add Site
              </Button>
            </div>
            <CardDescription className="text-slate-400">
              Click a site to configure chat, voice, QR, and agents.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {sites.map((site) => (
                <li key={site.id}>
                  <button
                    type="button"
                    onClick={() => onSelectSite(site.id)}
                    className="w-full text-left p-4 rounded-lg border border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-indigo-500/30 text-white transition-colors flex items-center gap-3 min-h-[3.5rem] touch-manipulation"
                  >
                    <div className="w-9 h-9 rounded-md bg-slate-700 flex items-center justify-center shrink-0">
                      <Globe className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{site.name}</p>
                      {site.domain && <p className="text-xs text-slate-500 truncate">{site.domain}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {site.chatbotEnabled !== false && (
                        <Badge variant="secondary" className="text-[10px] bg-emerald-500/20 text-emerald-400">Chat On</Badge>
                      )}
                      {site.placeData?.rating && (
                        <span className="text-xs text-amber-400 flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-current" /> {site.placeData.rating}
                        </span>
                      )}
                      <ArrowRight className="w-4 h-4 text-slate-500" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Customers & demos — full list, page scrolls (no inner scroll or "10 of 31" cap) */}
      {demoLeads.length > 0 && (
        <Card className="rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              Customers & demos
            </CardTitle>
            <CardDescription className="text-slate-400">New signups with demo links ({demoLeads.length})</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {demoLeads.map((lead) => (
                <li key={lead.id} className="flex flex-wrap items-center justify-between gap-2 p-4 rounded-lg border border-slate-700 bg-slate-800/50 min-h-[3rem] touch-manipulation">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-white truncate">{lead.businessName}</p>
                    {lead.phone && <p className="text-xs text-slate-500">{lead.phone}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {lead.siteId && onSelectSite && (
                      <Button variant="ghost" size="sm" className="text-indigo-400 hover:text-indigo-300 min-h-[2.5rem]" onClick={() => onSelectSite(lead.siteId!)}>
                        View site
                      </Button>
                    )}
                    <a href={lead.demoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 min-h-[2.5rem] px-2">
                      <ExternalLink className="w-3.5 h-3.5" /> Open demo
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Quick actions row */}
      <Card className="rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-400" />
            Run the business
          </CardTitle>
          <CardDescription className="text-slate-400">
            Onboard customers, upsell plans, and manage billing. Stripe integration is in Platform → Billing Engine.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-800" onClick={onAddSite}>
            <Plus className="w-4 h-4 mr-1" />
            Add Site
          </Button>
          <Link href="/platform/tenants">
            <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-800">
              <Users className="w-4 h-4 mr-1" />
              Business Customers
            </Button>
          </Link>
          <Link href="/platform/settings/billing-engine">
            <Button variant="outline" size="sm" className="border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/20">
              <CreditCard className="w-4 h-4 mr-1" />
              Billing Engine (Stripe)
            </Button>
          </Link>
          <Link href="/platform/settings/affiliate-program">
            <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-800">
              <BarChart3 className="w-4 h-4 mr-1" />
              Affiliate Program
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Pricing model — view and analyze */}
      <Card className="rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-indigo-400" />
            Pricing model
          </CardTitle>
          <CardDescription className="text-slate-400">
            Plans and overage rates (MSA §3). Use this to align Stripe products and communicate with customers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-1">
              <FileText className="w-4 h-4" />
              Subscription plans
            </h4>
            <div className="overflow-x-auto rounded-lg border border-slate-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800/80 text-left">
                    <th className="p-3 text-slate-300 font-medium">Plan</th>
                    <th className="p-3 text-slate-300 font-medium">Price</th>
                    <th className="p-3 text-slate-300 font-medium">Tagline</th>
                    <th className="p-3 text-slate-300 font-medium">Max businesses</th>
                    <th className="p-3 text-slate-300 font-medium">Voice (web / live)</th>
                  </tr>
                </thead>
                <tbody>
                  {planKeys.map((key) => {
                    const p = PLAN_LIMITS[key];
                    return (
                      <tr key={key} className="border-t border-slate-700/80 hover:bg-slate-800/40">
                        <td className="p-3">
                          <span className="font-medium text-white">{p.label}</span>
                          {key === 'free' && (
                            <Badge variant="secondary" className="ml-2 text-[10px] bg-slate-700 text-slate-300">
                              Free
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-slate-300">
                          ${p.price}/mo
                        </td>
                        <td className="p-3 text-slate-400 italic">{p.tagline}</td>
                        <td className="p-3 text-slate-300">{p.maxBusinesses}</td>
                        <td className="p-3 text-slate-300">
                          {p.websiteTtsMinutes} / {p.liveVoiceMinutes}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2">Overage rates (after bundle limits)</h4>
            <div className="overflow-x-auto rounded-lg border border-slate-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800/80 text-left">
                    <th className="p-3 text-slate-300 font-medium">Service</th>
                    <th className="p-3 text-slate-300 font-medium">Rate</th>
                    <th className="p-3 text-slate-300 font-medium">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {OVERAGE_RATES.map((row) => (
                    <tr key={row.service} className="border-t border-slate-700/80 hover:bg-slate-800/40">
                      <td className="p-3 text-white">{row.service}</td>
                      <td className="p-3 text-slate-300">${row.rate.toFixed(3)}</td>
                      <td className="p-3 text-slate-400">{row.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Source: <code className="text-slate-400">.system_design/pricing_v1.yaml</code> &amp; MSA v1.0.0 §3. Stripe Price IDs in Doppler (e.g. STRIPE_BASE_PLATFORM_PRICE_ID). See Platform → Billing Engine for payment methods and usage.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
