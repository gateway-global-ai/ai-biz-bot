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
  Mic,
  Search,
  X,
  Copy,
  LayoutGrid,
  List,
  ImageOff,
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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  // Track which plan tab is previewed per business (defaults to current plan)
  const [planTabs, setPlanTabs] = useState<Record<string, PlanType>>({});
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

        {/* Platform-level entitlements summary — compact, no per-business upgrade here */}
        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Crown className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Platform</h2>
              <p className="text-sm text-slate-400">
                Each website has its own independent plan. Upgrade individual sites in <strong className="text-slate-300">My Businesses</strong> below.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-md p-3 text-center">
              <Mic className="w-5 h-5 text-blue-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-white">500</p>
              <p className="text-xs text-slate-400">Voice Min / site</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-md p-3 text-center">
              <Globe className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-white">{businesses.length}</p>
              <p className="text-xs text-slate-400">Active Website{businesses.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-md p-3 text-center">
              <Bot className="w-5 h-5 text-violet-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-white">AI</p>
              <p className="text-xs text-slate-400">Concierge on all</p>
            </div>
          </div>
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
                  {businesses.length} website{businesses.length !== 1 ? "s" : ""} — each with its own plan
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex items-center bg-slate-800 rounded-md border border-slate-700 p-0.5">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded transition-colors ${viewMode === "grid" ? "bg-slate-600 text-white" : "text-slate-500 hover:text-slate-300"}`}
                  data-testid="button-view-grid"
                  title="Grid view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded transition-colors ${viewMode === "list" ? "bg-slate-600 text-white" : "text-slate-500 hover:text-slate-300"}`}
                  data-testid="button-view-list"
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
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
            <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "space-y-3"}>
              {businesses.map((biz: any) => {
                const bizPlan = (biz.plan || "free") as PlanType;

                const heroUrl = biz.placeId ? `/api/places/photo-proxy/${encodeURIComponent(biz.placeId)}?maxWidth=600` : null;
                // Generate a gradient fallback color from the business name
                const colors = ["from-blue-900 to-slate-900","from-violet-900 to-slate-900","from-emerald-900 to-slate-900","from-amber-900 to-slate-900","from-rose-900 to-slate-900"];
                const colorIdx = biz.name.charCodeAt(0) % colors.length;

                return (
                  <div
                    key={biz.id}
                    className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden"
                    data-testid={`business-row-${biz.id}`}
                  >
                    {/* Grid view: hero image */}
                    {viewMode === "grid" && (
                      <div className="relative h-36 w-full bg-slate-900 overflow-hidden group">
                        {heroUrl ? (
                          <img
                            src={heroUrl}
                            alt={biz.name}
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-br ${colors[colorIdx]} flex items-center justify-center`}>
                            <ImageOff className="w-8 h-8 text-slate-600" />
                          </div>
                        )}
                        {/* Gradient overlay + name */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-white font-semibold text-sm leading-tight truncate drop-shadow">{biz.name}</p>
                          {biz.domain && (
                            <p className="text-slate-400 text-[10px] truncate">{biz.domain}</p>
                          )}
                        </div>
                        <div className="absolute top-2 right-2 flex items-center gap-1">
                          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0.5 ${biz.chatbotEnabled ? "bg-emerald-500/80 text-white" : "bg-slate-600/80 text-slate-300"}`}>
                            {biz.chatbotEnabled ? "Live" : "Draft"}
                          </Badge>
                        </div>
                      </div>
                    )}

                    <div className="p-4">
                      {/* List view: top row with name + status + manage */}
                      {viewMode === "list" && (
                        <div className="flex items-center justify-between gap-4 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {heroUrl ? (
                                <img src={heroUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display="none"; }} />
                              ) : (
                                <Bot className="w-5 h-5 text-blue-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-white font-medium truncate">{biz.name}</p>
                              {biz.domain && <p className="text-xs text-slate-500 truncate">{biz.domain}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300">
                              {biz.chatbotEnabled ? "Live" : "Draft"}
                            </Badge>
                          </div>
                        </div>
                      )}

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
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
