import { useState, useRef, useEffect, useCallback } from "react";
import { useCustomerAuth } from "@/lib/customerAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { PLAN_LIMITS, type PlanType } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  User,
  Phone,
  Mail,
  Building2,
  Crown,
  LogOut,
  ArrowLeft,
  Globe,
  Bot,
  Loader2,
  Check,
  ExternalLink,
  Sparkles,
  PhoneCall,
  Mic,
  Shield,
  Search,
  X,
  Copy,
} from "lucide-react";
import gatewayLogo from "@assets/gatewaylogo_header_left_1770354860467.png";

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
  const [mapsKey, setMapsKey] = useState<string | null>(null);
  const [mapsLibLoaded, setMapsLibLoaded] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showAddBusiness) return;
    fetch("/api/config/maps-key")
      .then((r) => r.json())
      .then((d) => { if (d.key) setMapsKey(d.key); })
      .catch(() => {});
  }, [showAddBusiness]);

  useEffect(() => {
    if (!showAddBusiness || !mapsKey) return;
    const existingLib = document.querySelector('script[data-gmpx-lib]');
    if (existingLib) {
      setMapsLibLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.type = "module";
    script.src = "https://ajax.googleapis.com/ajax/libs/@googlemaps/extended-component-library/0.6.11/index.min.js";
    script.setAttribute("data-gmpx-lib", "true");
    script.async = true;
    script.onload = () => setMapsLibLoaded(true);
    document.head.appendChild(script);
  }, [showAddBusiness, mapsKey]);

  useEffect(() => {
    if (!mapsLibLoaded || !mapsKey || !pickerRef.current || !showAddBusiness) return;
    const container = pickerRef.current;
    container.innerHTML = "";

    const existingLoader = document.querySelector("gmpx-api-loader");
    if (!existingLoader) {
      const apiLoader = document.createElement("gmpx-api-loader");
      apiLoader.setAttribute("key", mapsKey);
      apiLoader.setAttribute("solution-channel", "GMP_GE_mapsandplacesautocomplete_v2");
      container.appendChild(apiLoader);
    }

    const placePicker = document.createElement("gmpx-place-picker") as any;
    placePicker.setAttribute("placeholder", "Search for your business...");
    placePicker.setAttribute("data-testid", "input-add-business-search");
    placePicker.style.cssText = "width:100%;--gmpx-color-surface:rgb(15 23 42);--gmpx-color-on-surface:#e2e8f0;--gmpx-color-on-surface-variant:#64748b;--gmpx-color-primary:#818cf8;--gmpx-color-outline:#334155;--gmpx-font-family-base:inherit;--gmpx-font-size-base:0.95rem;border:1px solid #334155;border-radius:0.5rem;";

    const phone = user?.phone || "";
    const handlePlaceChange = async () => {
      const place = placePicker.value;
      if (!place || !(place.displayName || place.name)) return;

      const placeId = place.id ?? place.place_id ?? undefined;
      const businessName = place.displayName || place.name || "";
      const businessAddress = place.formattedAddress || place.formatted_address || "";

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

      // Enrich placeData with full Place Details (photos, hours, phone, website) server-side
      if (placeId) {
        try {
          const detailsRes = await fetch(`/api/places/details/${encodeURIComponent(placeId)}`);
          if (detailsRes.ok) {
            const details = await detailsRes.json();
            placeData = {
              ...placeData,
              ...(details.photos?.length ? { photos: details.photos } : {}),
              ...(details.opening_hours ? { opening_hours: details.opening_hours } : {}),
              ...(details.formatted_phone_number ? { formatted_phone_number: details.formatted_phone_number } : {}),
              ...(details.international_phone_number ? { international_phone_number: details.international_phone_number } : {}),
              ...(details.website ? { website: details.website } : {}),
              ...(details.geometry ? { geometry: details.geometry } : {}),
              ...(details.rating ? { rating: details.rating } : {}),
              ...(details.user_ratings_total ? { user_ratings_total: details.user_ratings_total } : {}),
              ...(details.types ? { types: details.types } : {}),
              ...(details.editorial_summary ? { editorial_summary: details.editorial_summary } : {}),
              ...(details.business_status ? { business_status: details.business_status } : {}),
            };
          }
        } catch {
          // Non-fatal — proceed with basic placeData if enrichment fails
        }
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

    placePicker.addEventListener("gmpx-placechange", handlePlaceChange);
    container.appendChild(placePicker);

    setTimeout(() => {
      const input = placePicker.shadowRoot?.querySelector("input");
      if (input) input.focus();
    }, 300);

    return () => {
      placePicker.removeEventListener("gmpx-placechange", handlePlaceChange);
      container.innerHTML = "";
    };
  }, [mapsLibLoaded, mapsKey, showAddBusiness, user?.phone]);

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

  const plan = (user.plan || "free") as PlanType;
  const planInfo = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const businesses = businessesQuery.data || [];

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
            My Account
          </h1>
          <p className="text-slate-400 mt-1">
            Manage your profile, plan, and business websites.
          </p>
        </div>

        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
              <User className="w-6 h-6 text-blue-400" />
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

        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Crown className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Plan</h2>
                <p className="text-sm text-slate-400">Your current subscription</p>
              </div>
            </div>
            <Badge
              variant="secondary"
              className={
                plan === "enterprise"
                  ? "bg-violet-500/20 text-violet-300"
                  : plan === "voice"
                  ? "bg-amber-500/20 text-amber-300"
                  : plan === "pro"
                  ? "bg-blue-500/20 text-blue-300"
                  : "bg-slate-700 text-slate-300"
              }
            >
              {planInfo.label}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(Object.entries(PLAN_LIMITS) as [PlanType, typeof PLAN_LIMITS[PlanType]][]).map(
              ([key, info]) => {
                const isCurrent = key === plan;
                const planKeys = Object.keys(PLAN_LIMITS) as PlanType[];
                const currentIdx = planKeys.indexOf(plan);
                const thisIdx = planKeys.indexOf(key);
                const isDowngrade = thisIdx < currentIdx;
                const borderColor = isCurrent
                  ? "border-blue-500 bg-blue-500/10"
                  : key === "enterprise"
                  ? "border-slate-700 bg-slate-800/50"
                  : "border-slate-700 bg-slate-800/50";

                return (
                  <div
                    key={key}
                    className={`rounded-md border p-4 flex flex-col ${borderColor}`}
                    data-testid={`plan-card-${key}`}
                  >
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{info.tagline}</p>
                    <p className="text-sm font-semibold text-white">{info.label}</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {info.price === 0 ? "Free" : `$${info.price}`}
                      {info.price > 0 && (
                        <span className="text-xs text-slate-400 font-normal">/mo</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 mb-3">
                      {info.maxBusinesses >= 999
                        ? "Unlimited businesses"
                        : `${info.maxBusinesses} business${info.maxBusinesses > 1 ? "es" : ""}`}
                    </p>

                    <div className="space-y-2 flex-1 mb-4">
                      {info.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <Check className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <span className="text-slate-300">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {isCurrent ? (
                      <Badge variant="secondary" className="w-full justify-center bg-blue-500/20 text-blue-300">
                        Current Plan
                      </Badge>
                    ) : isDowngrade ? null : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        data-testid={`button-upgrade-${key}`}
                        disabled={upgradingPlan === key}
                        onClick={async () => {
                          const siteConfigId = businesses[0]?.id;
                          if (!siteConfigId) {
                            toast({ title: "No business found", description: "Add a business first before upgrading.", variant: "destructive" });
                            return;
                          }
                          setUpgradingPlan(key);
                          try {
                            const res = await fetch("/api/subscriptions/create-checkout-session", {
                              method: "POST",
                              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ plan: key, siteConfigId }),
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
                        {upgradingPlan === key ? (
                          <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Redirecting...</span>
                        ) : (
                          <><Sparkles className="w-3 h-3 mr-1" />Upgrade</>
                        )}
                      </Button>
                    )}
                  </div>
                );
              }
            )}
          </div>

          {planInfo.liveVoiceMinutes > 0 || planInfo.websiteTtsMinutes > 0 ? (
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-slate-800/50 border border-slate-700 rounded-md p-3 text-center">
                <Mic className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-white">{planInfo.websiteTtsMinutes.toLocaleString()}</p>
                <p className="text-xs text-slate-400">Website Voice Min</p>
              </div>
              {planInfo.liveVoiceMinutes > 0 && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-md p-3 text-center">
                  <PhoneCall className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-white">{planInfo.liveVoiceMinutes.toLocaleString()}</p>
                  <p className="text-xs text-slate-400">Live Voice Min</p>
                </div>
              )}
              {planInfo.dedicatedNumber && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-md p-3 text-center">
                  <Shield className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-white">Active</p>
                  <p className="text-xs text-slate-400">Dedicated Number</p>
                </div>
              )}
            </div>
          ) : null}
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">My Businesses</h2>
                <p className="text-sm text-slate-400">
                  {businesses.length} of {planInfo.maxBusinesses >= 999 ? "unlimited" : planInfo.maxBusinesses} used
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowAddBusiness(!showAddBusiness)}
              data-testid="button-add-business"
            >
              {showAddBusiness ? (
                <><X className="w-4 h-4 mr-2" />Cancel</>
              ) : (
                <><Globe className="w-4 h-4 mr-2" />Add Business</>
              )}
            </Button>
          </div>

          {showAddBusiness && (
            <div className="mb-4 p-4 bg-slate-800/50 border border-slate-700 rounded-md" data-testid="add-business-panel">
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
          ) : businesses.length === 0 && !showAddBusiness ? (
            <div className="text-center py-8 border border-dashed border-slate-700 rounded-md">
              <Building2 className="w-10 h-10 mx-auto text-slate-600 mb-3" />
              <p className="text-slate-400 text-sm mb-4">
                No businesses yet. Generate your first AI-powered website!
              </p>
              <Button
                variant="default"
                onClick={() => setShowAddBusiness(true)}
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
                  className="flex items-center justify-between gap-4 p-4 bg-slate-800/50 border border-slate-700 rounded-md"
                  data-testid={`business-row-${biz.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">{biz.name}</p>
                      {biz.domain && (
                        <p className="text-xs text-slate-500 truncate">{biz.domain}</p>
                      )}
                      <button
                        className="flex items-center gap-1 mt-0.5 group"
                        title="Copy Site ID"
                        onClick={() => {
                          navigator.clipboard.writeText(biz.id);
                          toast({ title: "Copied", description: `Site ID copied to clipboard` });
                        }}
                        data-testid={`copy-uuid-${biz.id}`}
                      >
                        <span className="text-[10px] text-slate-600 font-mono group-hover:text-slate-400 transition-colors">{biz.id}</span>
                        <Copy className="w-2.5 h-2.5 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300">
                      {biz.chatbotEnabled ? "Live" : "Draft"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setLocation(`/my-account/site/${biz.id}`)}
                      data-testid={`button-manage-${biz.id}`}
                    >
                      Manage
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
