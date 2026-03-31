/**
 * Platform business Overview tab — site identity + save (MUI via @/ui-core only).
 * Extracted boundary for sovereign control-plane pattern; domain blocks below stay unchanged.
 */
import { useState, useEffect } from "react";
import {
  SovereignThemeProvider,
  SovereignCard,
  SovereignFormField,
  SovereignSelect,
  SovereignButton,
  SovereignStack,
  SovereignTypography,
} from "@/ui-core";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, MapPin, Loader2, Save, ExternalLink } from "lucide-react";
import { PlatformGovernanceHealthCard } from "@/components/admin/PlatformGovernanceHealthCard";
import { IntegrationOnboardingSmsCard } from "@/components/admin/IntegrationOnboardingSmsCard";
import { VoiceActivationPulse } from "@/components/admin/VoiceActivationPulse";

const PLAN_OPTIONS = ["free", "pro", "voice", "enterprise"].map((p) => ({
  value: p,
  label: p.charAt(0).toUpperCase() + p.slice(1),
}));

export interface PlatformBusinessOverviewSite {
  id: string;
  name: string;
  plan: string | null;
  businessType?: string | null;
  businessDescription?: string | null;
  logoUrl?: string | null;
  website?: string | null;
  domain?: string | null;
  slug?: string | null;
  placeData?: unknown;
  assignedAgentId?: string | null;
  provisionedPhoneNumber?: string | null;
  heroImageUrl?: string | null;
}

type Props = {
  site: PlatformBusinessOverviewSite;
  onSave: (updates: Partial<PlatformBusinessOverviewSite>) => void | Promise<void>;
  token: string | null;
};

export function PlatformBusinessOverviewPanel({ site, onSave, token }: Props) {
  const [name, setName] = useState(site.name || "");
  const [description, setDescription] = useState(site.businessDescription || "");
  const [website, setWebsite] = useState(site.website || "");
  const [logoUrl, setLogoUrl] = useState(site.logoUrl || "");
  const [domain, setDomain] = useState(site.domain || "");
  const [plan, setPlan] = useState(site.plan || "free");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setName(site.name || "");
    setDescription(site.businessDescription || "");
    setWebsite(site.website || "");
    setLogoUrl(site.logoUrl || "");
    setDomain(site.domain || "");
    setPlan(site.plan || "free");
  }, [
    site.id,
    site.name,
    site.businessDescription,
    site.website,
    site.logoUrl,
    site.domain,
    site.plan,
  ]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        name,
        businessDescription: description,
        website,
        logoUrl,
        domain,
        plan: plan as PlatformBusinessOverviewSite["plan"],
      });
      toast({ title: "Saved" });
    } finally {
      setSaving(false);
    }
  };

  const address = (site.placeData as { formatted_address?: string } | undefined)?.formatted_address;
  const isCustom = site.businessType === "custom" || !site.placeData;

  return (
    <SovereignThemeProvider>
      <div className="space-y-6 max-w-2xl">
        <SovereignCard>
          <SovereignTypography
            variant="overline"
            component="h3"
            sx={{
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "text.secondary",
              fontSize: "0.75rem",
            }}
          >
            Business Identity
          </SovereignTypography>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-sui bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt={name} className="w-full h-full object-cover" />
              ) : isCustom ? (
                <Sparkles className="w-7 h-7 text-indigo-400" />
              ) : (
                <MapPin className="w-7 h-7 text-slate-400" />
              )}
            </div>
            <div>
              <p className="font-bold text-white text-lg">{site.name}</p>
              {address ? <p className="text-xs text-slate-400">{address}</p> : null}
              {site.slug ? (
                <a
                  href={`/biz/${site.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-0.5"
                >
                  /biz/{site.slug}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : null}
              {site.slug ? (
                <a
                  href={`/agent/${site.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  /agent/{site.slug}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SovereignFormField
              label="Business Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <SovereignSelect label="Plan" value={plan} onChange={setPlan} options={PLAN_OPTIONS} />
            <div className="sm:col-span-2">
              <SovereignFormField
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description of this business"
              />
            </div>
            <SovereignFormField
              label="Website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://"
            />
            <SovereignFormField
              label="Custom Domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="app.mybusiness.com"
            />
            <div className="sm:col-span-2">
              <SovereignFormField
                label="Logo URL"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <SovereignButton
              sovereignVariant="secondary"
              onClick={() => void handleSave()}
              disabled={saving}
              startIcon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            >
              Save Changes
            </SovereignButton>
          </div>
        </SovereignCard>

        <PlatformGovernanceHealthCard
          siteConfigId={site.id}
          token={token}
          slug={site.slug ?? null}
          siteName={site.name}
        />

        <IntegrationOnboardingSmsCard siteConfigId={site.id} token={token} />

        <VoiceActivationPulse siteConfigId={site.id} days={14} />
      </div>
    </SovereignThemeProvider>
  );
}
