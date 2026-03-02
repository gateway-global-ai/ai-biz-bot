import { useState, useRef, useEffect, useCallback } from "react";
import { useCustomerAuth } from "@/lib/customerAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  User,
  Phone,
  Mail,
  Building2,
  LogOut,
  ArrowLeft,
  Globe,
  Bot,
  Loader2,
  Check,
  ExternalLink,
  Sparkles,
  Mic,
  Search,
  X,
  Copy,
  LayoutGrid,
  List,
  ImageOff,  Search,
  X,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Settings2,
  Activity,
  MessageSquare,
  Mic2,} from "lucide-react";

// ── Pricing constants sourced from .system_design/pricing_v1.yaml ─────────────
const SOVEREIGN_PRICING = {
  flatFeeMonthly: 49,
  overagePhoneVoice: 0.25,
  overageWebVoice: 0.18,
  overageA2pSms: 0.125,
  gracePeriodDays: 30,
} as const;
import gatewayLogo from "@assets/gatewaylogo_header_left_1770354860467.png";
import { ensureApiLoader, loadPlacesLibrary } from "@/utils/googleMapsLoader";

export default function MyAccount() {
  const { user, token, logout, updateUser, isAuthenticated, isLoading } = useCustomerAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [editingName, setEditingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [emailValue, setEmailValue] = useState("");
  const [showAddBusiness, setShowAddBusiness] = useState(false);
  const [addingBusiness, setAddingBusiness] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  // Track which plan tab is previewed per business (defaults to current plan)
  const [planTabs, setPlanTabs] = useState<Record<string, PlanType>>({});
  const [mapsKey, setMapsKey] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showAddBusiness) return;
    fetch("/api/config/maps-key")
      .then((r) => r.json())
      .then((d) => { if (d.key) setMapsKey(d.key); })
      .catch(() => {});
  }, [showAddBusiness]);

  useEffect(() => {
    // The EEL is loaded via the npm package (googleMapsLoader utility).
    // No CDN <script> tag needed — custom elements are registered on import.
    if (!mapsKey || !pickerRef.current || !showAddBusiness) return;
    const container = pickerRef.current;
    container.innerHTML = "";

    // Inject the <gmpx-api-loader> singleton (document-level guard in utility).
    ensureApiLoader(mapsKey);

    let autocomplete: any = null;
    let cancelled = false;

    const phone = user?.phone || "";

    const setup = async () => {
      const { PlaceAutocompleteElement } = await loadPlacesLibrary();
      if (cancelled) return;

      autocomplete = new PlaceAutocompleteElement();
      autocomplete.setAttribute("placeholder", "Search for your business...");
      autocomplete.setAttribute("data-testid", "input-add-business-search");
      autocomplete.style.cssText = "width:100%;display:block;border:1px solid #334155;border-radius:0.5rem;overflow:hidden;";

      // Apply dark theme inside the shadow DOM
      requestAnimationFrame(() => {
        const shadow = autocomplete?.shadowRoot;
        if (shadow) {
          const style = document.createElement("style");
          style.textContent = `
            input { background:rgb(15 23 42)!important;color:#e2e8f0!important;font-size:0.95rem!important;
                    font-family:inherit!important;border:none!important;outline:none!important;
                    width:100%!important;padding:8px 12px!important; }
            input::placeholder { color:#64748b!important; }
          `;
          shadow.appendChild(style);        }
      });

      const handlePlaceSelect = async (event: any) => {
        const { placePrediction } = event;
        if (!placePrediction) return;

        const place = placePrediction.toPlace();
        await place.fetchFields({ fields: ["id", "displayName", "formattedAddress", "location", "types", "rating", "userRatingCount"] });

        if (!place.displayName) return;

        const placeId = place.id ?? undefined;
        const businessName = place.displayName || "";
        const businessAddress = place.formattedAddress || "";

        let placeData: any = {
          name: businessName,
          formatted_address: businessAddress,
          place_id: placeId,
        };
        if (place.types) placeData.types = place.types;
        if (place.rating) placeData.rating = place.rating;
        if (place.userRatingCount) placeData.user_ratings_total = place.userRatingCount;
        if (place.location) {
          placeData.geometry = { location: { lat: place.location.lat(), lng: place.location.lng() } };
        }

        if (!phone) {
          toast({ title: "Error", description: "Phone number is missing from your account", variant: "destructive" });
          return;
        }

        setAddingBusiness(true);
        try {
          const res = await fetch("/api/demo/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone,
              businessName,
              businessAddress,
              placeId: placeId || null,
              placeData,
            }),
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "Failed to create business");
          }
          await queryClient.invalidateQueries({ queryKey: ["/api/customer/businesses"] });
          setShowAddBusiness(false);
          toast({ title: "Business Added", description: `${businessName} has been created.` });
        } catch (err: any) {
          toast({ title: "Error", description: err.message || "Failed to add business", variant: "destructive" });
        } finally {
          setAddingBusiness(false);
        }
      };

      autocomplete.addEventListener("gmp-placeselect", handlePlaceSelect);
      container.appendChild(autocomplete);

      setTimeout(() => {
        const input = autocomplete?.shadowRoot?.querySelector("input");
        if (input) (input as HTMLInputElement).focus();
      }, 300);
    };

    setup().catch(err => console.error("[MyAccount] Failed to load Places library:", err));

    return () => {
      cancelled = true;
      container.innerHTML = "";
    };
  }, [mapsKey, showAddBusiness, user?.phone]);

  const businessesQuery = useQuery({
    queryKey: ["/api/customer/businesses"],
    queryFn: async () => {
      const res = await fetch("/api/customer/businesses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load businesses");
      const data = await res.json();
      return data.businesses;
    },
    enabled: isAuthenticated,
  });

  // Onboarding status requires owner auth; My Account is customer-facing. Skip to avoid 401.
  const onboardingQuery = useQuery({
    queryKey: ["/api/onboarding/status"],
    queryFn: async () => {
      const res = await fetch("/api/onboarding/status", { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    enabled: false, // Owner-only endpoint; customer My Account does not use it
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: { name?: string; email?: string }) => {
      const res = await fetch("/api/customer/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.user) updateUser(data.user);
      setEditingName(false);
      setEditingEmail(false);
      toast({ title: "Profile Updated" });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-slate-200">
        <p>Please log in to view your account.</p>
        <Button variant="outline" onClick={() => setLocation("/business")} data-testid="button-go-login">
          Go to Login
        </Button>
      </div>
    );
  }

  const businesses = businessesQuery.data || [];
  const onboarding = onboardingQuery.data;
  const graceDaysElapsed = onboarding?.trialDaysElapsed ?? 0;
  const graceActive = onboarding?.activationDate && (onboarding?.trialDaysRemaining ?? 0) > 0;
  const graceExpired = onboarding?.activationDate && (onboarding?.trialDaysRemaining ?? 1) <= 0;
  const gracePct = Math.min(100, Math.round((graceDaysElapsed / SOVEREIGN_PRICING.gracePeriodDays) * 100));
  const complianceStatus: string | null = onboarding?.complianceStatus ?? null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 py-3 flex items-center justify-between gap-4 overflow-visible">
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setLocation("/business")}
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <img
            src={gatewayLogo}
            alt="Gateway Global AI"
            className="h-10 w-auto opacity-90"
          />
        </div>
        <Button
          variant="ghost"
          onClick={async () => {
            await logout();
            setLocation("/business");
          }}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white" data-testid="text-my-account-title">
            Command Center
          </h1>
          <p className="text-slate-400 mt-1">
            Sovereign AI OS · Account &amp; Governance
          </p>
        </div>

        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <User className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Profile</h2>
              <p className="text-sm text-slate-400">Your account information</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-slate-500" />
                <span className="text-slate-400">Phone</span>
              </div>
              <span className="text-white font-mono text-sm" data-testid="text-phone">{user.phone}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-sm">
                <User className="w-4 h-4 text-slate-500" />
                <span className="text-slate-400">Name</span>
              </div>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    className="h-8 w-48 bg-slate-800 border-slate-700 text-white text-sm"
                    data-testid="input-name"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => updateProfileMutation.mutate({ name: nameValue })}
                    disabled={updateProfileMutation.isPending}
                    data-testid="button-save-name"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                  </Button>
                </div>
              ) : (
                <button
                  className="text-white text-sm hover:text-blue-400 transition-colors cursor-pointer"
                  onClick={() => {
                    setNameValue(user.name || "");
                    setEditingName(true);
                  }}
                  data-testid="button-edit-name"
                >
                  {user.name || "Add your name"}
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-slate-500" />
                <span className="text-slate-400">Email</span>
              </div>
              {editingEmail ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={emailValue}
                    onChange={(e) => setEmailValue(e.target.value)}
                    className="h-8 w-48 bg-slate-800 border-slate-700 text-white text-sm"
                    type="email"
                    data-testid="input-email"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => updateProfileMutation.mutate({ email: emailValue })}
                    disabled={updateProfileMutation.isPending}
                    data-testid="button-save-email"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                  </Button>
                </div>
              ) : (
                <button
                  className="text-white text-sm hover:text-blue-400 transition-colors cursor-pointer"
                  onClick={() => {
                    setEmailValue(user.email || "");
                    setEditingEmail(true);
                  }}
                  data-testid="button-edit-email"
                >
                  {user.email || "Add your email"}
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* ── Governance Layer ──────────────────────────────────────────────── */}
        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6"
          data-testid="card-governance-layer">

          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <Activity className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Governance Layer</h2>
              <p className="text-sm text-slate-400">MSA v1.0.0 · Sovereign AI OS</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Grace Period Progress Bar */}
            <div className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl"
              data-testid="section-grace-period">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <p className="text-sm font-medium text-slate-200">Verizon Grace Period</p>
                </div>
                {!onboarding?.activationDate ? (
                  <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">
                    MSA Pending
                  </Badge>
                ) : graceActive ? (
                  <Badge className="bg-indigo-500/10 text-indigo-300 border-indigo-500/20 text-xs">
                    Day {graceDaysElapsed} of {SOVEREIGN_PRICING.gracePeriodDays}
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Active · Full Commitment
                  </Badge>
                )}
              </div>

              {!onboarding?.activationDate ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">
                    Accept the Master Service Agreement to start your 30-day zero-penalty grace period.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setLocation("/compliance-gateway")}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8"
                    data-testid="button-accept-msa"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                    Review & Accept MSA
                  </Button>
                </div>
              ) : (
                <>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        graceExpired
                          ? "bg-emerald-500"
                          : "bg-gradient-to-r from-indigo-500 to-violet-500"
                      }`}
                      style={{ width: `${gracePct}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    {graceActive
                      ? `${onboarding?.trialDaysRemaining} days remaining — terminate before Day 30 with no penalty (MSA §2.3)`
                      : "Grace period elapsed. 12-month commitment is active."}
                  </p>
                </>
              )}
            </div>

            {/* A2P Compliance Status */}
            <div className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl"
              data-testid="section-a2p-compliance">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  <p className="text-sm font-medium text-slate-200">A2P 10DLC Registration</p>
                </div>
                {complianceStatus === "APPROVED" ? (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Compliant
                  </Badge>
                ) : complianceStatus === "PENDING" ? (
                  <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Carrier Review In Progress
                  </Badge>
                ) : complianceStatus === "REJECTED" ? (
                  <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Resubmit Required
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Registration Required
                  </Badge>
                )}
              </div>
              {(!complianceStatus || complianceStatus === "REJECTED") && (
                <div className="mt-3">
                  <p className="text-xs text-slate-500 mb-2">
                    {complianceStatus === "REJECTED"
                      ? "Your submission was rejected. Review and resubmit your compliance information."
                      : "Register your SMS brand & campaign to enable A2P messaging (MSA §4.1)."}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLocation("/compliance-gateway")}
                    className="border-slate-600 text-slate-300 hover:border-indigo-500 text-xs h-8"
                    data-testid="button-a2p-compliance"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                    {complianceStatus === "REJECTED" ? "Resubmit Compliance" : "Begin Registration"}
                  </Button>
                </div>
              )}
            </div>

            {/* Pricing Anchor — sourced from pricing_v1.yaml */}
            <div className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl"
              data-testid="section-pricing-anchor">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-sm font-medium text-slate-200">Sovereign AI OS</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-white">${SOVEREIGN_PRICING.flatFeeMonthly}</span>
                  <span className="text-xs text-slate-400">/mo flat fee</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                + metered overage — billed in arrears per MSA §3.2
              </p>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-700/50 border border-slate-600/50 rounded-lg text-xs text-slate-400">
                  <Mic2 className="w-3 h-3 text-blue-400" />
                  ${SOVEREIGN_PRICING.overagePhoneVoice}/min phone AI
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-700/50 border border-slate-600/50 rounded-lg text-xs text-slate-400">
                  <Activity className="w-3 h-3 text-indigo-400" />
                  ${SOVEREIGN_PRICING.overageWebVoice}/min web AI
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-700/50 border border-slate-600/50 rounded-lg text-xs text-slate-400">
                  <MessageSquare className="w-3 h-3 text-violet-400" />
                  ${SOVEREIGN_PRICING.overageA2pSms}/msg A2P SMS
                </div>
              </div>            </div>
          </div>
        </Card>

        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6"
          data-testid="card-my-businesses">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <Building2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">My Businesses</h2>
                <p className="text-sm text-slate-400">
                  {businesses.length} site{businesses.length !== 1 ? "s" : ""} registered
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowAddBusiness(!showAddBusiness)}
              className="border-slate-700 text-slate-300 hover:border-indigo-500"
              data-testid="button-add-business"
            >
              {showAddBusiness ? (
                <><X className="w-4 h-4 mr-2" />Cancel</>
              ) : (
                <><Globe className="w-4 h-4 mr-2" />Add Business</>
              )}
            </Button>          </div>

          {showAddBusiness && (
            <div className="mb-4 p-4 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm"
              data-testid="add-business-panel">
              <p className="text-sm text-slate-400 mb-3">
                <Search className="w-4 h-4 inline-block mr-1 -mt-0.5" />
                Search Google Maps for your business, then select it to generate your AI website.
              </p>
              <div ref={pickerRef} className="w-full" data-testid="place-picker-container" />
              {addingBusiness && (
                <div className="flex items-center gap-2 mt-3 text-sm text-blue-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating your AI website...
                </div>
              )}
            </div>
          )}

          {businessesQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            </div>
          ) : businessesQuery.isError ? (
            <div className="text-center py-8 border border-dashed border-amber-500/30 rounded-2xl bg-amber-500/5">
              <p className="text-amber-200 text-sm mb-3">Couldn&apos;t load businesses. Please try again.</p>
              <Button variant="outline" size="sm" onClick={() => businessesQuery.refetch()}>
                Retry
              </Button>
            </div>
          ) : businesses.length === 0 && !showAddBusiness ? (
            <div className="text-center py-8 border border-dashed border-white/10 rounded-2xl">
              <Building2 className="w-10 h-10 mx-auto text-slate-600 mb-3" />
              <p className="text-slate-400 text-sm mb-4">
                No businesses yet. Generate your first AI-powered website!
              </p>
              <Button
                variant="default"
                onClick={() => setShowAddBusiness(true)}
                className="bg-indigo-600 hover:bg-indigo-500"
                data-testid="button-create-first"
              >
                Get Started
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {businesses.map((biz: any) => (
                <div
                  key={biz.id}
                  className="flex items-center justify-between gap-3 p-4 bg-white/5 !border !border-white/10 rounded-2xl backdrop-blur-sm hover:bg-white/[0.07] transition-colors flex-wrap"
                  data-testid={`business-row-${biz.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">{biz.name}</p>
                      {biz.domain && (
                        <p className="text-xs text-slate-500 truncate">{biz.domain}</p>                      )}

                      {/* Grid view: UUID + Manage row */}
                      {viewMode === "grid" && (
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <button
                            className="flex items-center gap-1 group min-w-0"
                            title="Copy Site ID"
                            onClick={() => {
                              navigator.clipboard.writeText(biz.id);
                              toast({ title: "Copied", description: "Site ID copied to clipboard" });
                            }}
                            data-testid={`copy-uuid-${biz.id}`}
                          >
                            <span className="text-[10px] text-slate-600 font-mono group-hover:text-slate-400 transition-colors truncate">{biz.id}</span>
                            <Copy className="w-2.5 h-2.5 text-slate-600 group-hover:text-slate-400 flex-shrink-0" />
                          </button>
                          <Button size="sm" variant="outline" className="flex-shrink-0" onClick={() => setLocation(`/my-account/site/${biz.id}`)} data-testid={`button-manage-${biz.id}`}>
                            Manage <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                      )}

                      {/* List view: UUID + Manage */}
                      {viewMode === "list" && (
                        <div className="flex items-center gap-2 mb-3">
                          <button
                            className="flex items-center gap-1 group flex-1 min-w-0"
                            title="Copy Site ID"
                            onClick={() => {
                              navigator.clipboard.writeText(biz.id);
                              toast({ title: "Copied", description: "Site ID copied to clipboard" });
                            }}
                            data-testid={`copy-uuid-${biz.id}`}
                          >
                            <span className="text-[10px] text-slate-600 font-mono group-hover:text-slate-400 transition-colors truncate">{biz.id}</span>
                            <Copy className="w-2.5 h-2.5 text-slate-600 group-hover:text-slate-400 flex-shrink-0" />
                          </button>
                          <Button size="sm" variant="outline" className="flex-shrink-0" onClick={() => setLocation(`/my-account/site/${biz.id}`)} data-testid={`button-manage-${biz.id}`}>
                            Manage <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                      )}

                      {/* Plan tab navigator */}
                      {(() => {
                      const planKeys = Object.keys(PLAN_LIMITS) as PlanType[];
                      const selectedTab = planTabs[biz.id] ?? bizPlan;
                      const tabInfo = PLAN_LIMITS[selectedTab];
                      const tabIdx = planKeys.indexOf(selectedTab);
                      const isCurrentPlan = selectedTab === bizPlan;
                      const isUpgrade = tabIdx > planKeys.indexOf(bizPlan);
                      const upgradeId = `${biz.id}-${selectedTab}`;

                      return (
                        <div className="pt-2 border-t border-slate-700/50">
                          {/* Tab strip */}
                          <div className="flex gap-0.5 bg-slate-900/60 rounded-md p-0.5 mb-3">
                            {planKeys.map((pk) => {
                              const pkInfo = PLAN_LIMITS[pk];
                              const isActive = pk === selectedTab;
                              const isCurrent = pk === bizPlan;
                              return (
                                <button
                                  key={pk}
                                  onClick={() => setPlanTabs((prev) => ({ ...prev, [biz.id]: pk }))}
                                  className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                                    isActive
                                      ? "bg-slate-700 text-white shadow-sm"
                                      : "text-slate-500 hover:text-slate-300"
                                  }`}
                                  data-testid={`plan-tab-${biz.id}-${pk}`}
                                >
                                  {pkInfo.label}
                                  {isCurrent && (
                                    <span className="ml-1 text-[9px] text-emerald-400">✓</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Selected tab content */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-lg font-bold text-white">
                                  {tabInfo.price === 0 ? "Free" : `$${tabInfo.price}`}
                                </span>
                                {tabInfo.price > 0 && (
                                  <span className="text-xs text-slate-400">/mo per site</span>
                                )}
                                <span className="text-xs text-slate-500 italic">{tabInfo.tagline}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                                {tabInfo.features.map((f, i) => (
                                  <div key={i} className="flex items-start gap-1 text-xs text-slate-400">
                                    <Check className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                                    <span>{f}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="flex-shrink-0">
                              {isCurrentPlan ? (
                                <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 whitespace-nowrap">
                                  <Check className="w-3 h-3 mr-1" />
                                  Current Plan
                                </Badge>
                              ) : isUpgrade ? (
                                <Button
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-500 text-white whitespace-nowrap"
                                  disabled={upgradingPlan === upgradeId}
                                  data-testid={`button-upgrade-${biz.id}-${selectedTab}`}
                                  onClick={async () => {
                                    setUpgradingPlan(upgradeId);
                                    try {
                                      const res = await fetch("/api/subscriptions/create-checkout-session", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                                        body: JSON.stringify({ plan: selectedTab, siteConfigId: biz.id }),
                                      });
                                      const data = await res.json();
                                      if (!res.ok) throw new Error(data.error || "Failed to start checkout");
                                      window.location.href = data.url;
                                    } catch (err: any) {
                                      toast({ title: "Upgrade failed", description: err.message, variant: "destructive" });
                                      setUpgradingPlan(null);
                                    }
                                  }}
                                >
                                  {upgradingPlan === upgradeId ? (
                                    <><Loader2 className="w-3 h-3 animate-spin mr-1" />Redirecting...</>
                                  ) : (
                                    <><Sparkles className="w-3 h-3 mr-1" />Upgrade</>
                                  )}
                                </Button>
                              ) : (
                                <Badge variant="secondary" className="bg-slate-700 text-slate-400 whitespace-nowrap">
                                  Lower tier
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge
                      className={`text-xs ${
                        biz.chatbotEnabled
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-slate-700/50 text-slate-400 border-slate-600/30"
                      }`}
                    >
                      {biz.chatbotEnabled ? "Live" : "Draft"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setLocation(`/mixing-board?site=${biz.id}`)}
                      className="border-indigo-500/40 text-indigo-300 hover:border-indigo-400 hover:bg-indigo-500/10 text-xs h-8"
                      data-testid={`button-configure-ai-${biz.id}`}
                    >
                      <Settings2 className="w-3 h-3 mr-1.5" />
                      Configure AI
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setLocation(`/my-account/site/${biz.id}`)}
                      className="border-slate-700 text-slate-300 hover:border-slate-500 text-xs h-8"
                      data-testid={`button-manage-${biz.id}`}
                    >
                      Manage
                      <ExternalLink className="w-3 h-3 ml-1.5" />
                    </Button>
                  </div>
                </div>
              ))}            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
