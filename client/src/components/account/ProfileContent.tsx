/**
 * Command Center content: Profile, Governance, Bill, My Businesses.
 * Used by MyAccount (full page) and ConciergePanel (embedded view).
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useCustomerAuth } from "@/lib/customerAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
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
  Globe,
  Bot,
  Loader2,
  Check,
  ExternalLink,
  Search,
  X,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Settings2,
  Activity,
  MessageSquare,
  Mic2,
  FileText,
  AlertCircle,
  CreditCard,
} from "lucide-react";
import { BillingHistory } from "@/components/dashboard/BillingHistory";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ensureApiLoader, loadPlacesLibrary } from "@/utils/googleMapsLoader";

const SOVEREIGN_PRICING = {
  flatFeeMonthly: 49,
  overagePhoneVoice: 0.25,
  overageWebVoice: 0.18,
  overageA2pSms: 0.125,
  gracePeriodDays: 30,
} as const;

const MSA_VERSION_DIRECT = "1.0.0";
const MSA_VERSION_RESELLER = "1.1.0";
const MSA_TEXT = `SOVEREIGN AI OS MASTER SERVICE AGREEMENT (v1.0.0)
This Agreement is made between Gateway Global AI ("The Vendor") and the entity identified in the Service Order ("The Customer").

1. SCOPE OF SERVICE & ACTIVATION
Cognitive Dial Tone: The Vendor provides an AI-native Operating System ("Sovereign OS") consisting of voice, SMS, and chat interfaces.
Activation Date: Customer is deemed to have accepted Services on the date the "Let's Talk" button is enabled.
Availability: Vendor aims for 99.9% uptime for voice connectivity, excluding scheduled maintenance.

2. SUBSCRIPTION TERM & COMMITMENT
Primary Term: A minimum 12-month Service Commitment applies to all paid accounts unless otherwise stated in the Service Order.
Automatic Renewal: Upon expiration of the Primary Term, this Agreement automatically renews for successive 12-month periods ("Extended Term") unless a Party provides written notice of non-renewal at least 90 days prior to expiration.
The "Verizon Grace Period": Customer may terminate for any reason within the first 30 calendar days following the Activation Date with no early termination penalty.

3. PRICING & METERED BILLING
Platform Fee: A non-refundable monthly recurring charge ("Flat Fee") of $49.00 covers OS access and core brand management.
Metered Usage: Usage-based charges (minutes, SMS, tokens) accrue from the Activation Date and are invoiced in arrears based on actual consumption.
Overage Rates: Phone Voice AI — $0.25/min | Web Voice AI — $0.18/min | A2P SMS — $0.125/message

4. A2P 10DLC & REGULATORY COMPLIANCE
Mandatory Registration: All Customer-initiated SMS messaging must be registered via the A2P 10DLC protocol.
Compliance Responsibility: Customer warrants that it has obtained Prior Express Written Consent for all messaging recipients.
Indemnification: Customer shall indemnify Vendor against all fines or penalties (e.g., $1,000+ carrier pass-through fines) resulting from snowshoeing, unauthorized number replacement, or prohibited content violations.

5. AI DATA & INTELLECTUAL PROPERTY
Input Data: Customer retains all ownership of prompts, business data, and training inputs provided to the AI.
Output Data: Vendor grants Customer a non-exclusive license to use all AI-generated outputs for business purposes.
Training Restriction: Vendor is strictly prohibited from using Customer data to train foundational models for other customers.

6. TERMINATION & UNDERUTILIZATION
Termination for Convenience: If Customer terminates after the 30-day grace period but before the end of the Primary Term, Customer shall pay 75% of the remaining Flat Fees for the duration of the term.
Suspension: Vendor reserves the right to suspend Service for any account that is 15 days past due.

7. LIMITATION OF LIABILITY
"As-Is" Provision: The Service is provided "AS-IS" with all faults.
Autonomous Actions: Vendor is not liable for financial losses resulting from "hallucinations" or autonomous actions taken by the AI agent unless caused by Vendor's gross negligence.`.trim();
const MSA_TEXT_RESELLER_ADDENDUM = `

─────────────────────────────────────────────────────────
RESELLER SERVICE ADDENDUM (MSA v1.1.0)
─────────────────────────────────────────────────────────

This Addendum extends the MSA above and governs the Reseller relationship.

1. THE FRANCHISE HIERARCHY
Reseller maintains a Master UUID with authority to provision Sub-Account UUIDs for end-customers. Reseller must countersign before any end-customer may activate. Reseller is the Account Owner; the end-customer is the A2P Content Provider.

2. WHOLESALE PRICING & REVENUE SHARE
Reseller pays $49.00/month per active Sub-Account. Reseller sets the retail markup price. Vendor collects retail price and remits: Retail − $49.00 − Stripe Processing Fee = Reseller Payout, credited to the Reseller Commission Balance and disbursed via Stripe Connect.

3. BRAND PROTECTION & WHITE LABELING
All interfaces must display "Powered by Gateway Global AI" unless a White Label tier is purchased. Reseller may not represent the AI as proprietary technology without a White Label agreement. No sub-licensing or daisy-chaining of the reseller right.

4. TERMINATION & SUB-ACCOUNT MIGRATION
Reseller termination causes Sub-Account suspension within 48 hours. Sub-Account end-customers may convert to DIRECT accounts at standard retail pricing for 90 days post-migration.`.trim();

interface MsaModalContentProps {
  status: {
    onboardingStatus?: string;
    accountType?: string;
    msaAcceptedAt?: string | null;
    resellerMsaConfirmedAt?: string | null;
  } | undefined;
  token: string | null;
  onAccepted: () => void;
  onClose: () => void;
}

function MsaModalContent({ status, token, onAccepted, onClose }: MsaModalContentProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 20;
    setHasScrolledToBottom(atBottom);
  }, []);

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const accountType = status?.accountType ?? "DIRECT";
      const msaVersion = accountType === "DIRECT" ? MSA_VERSION_DIRECT : MSA_VERSION_RESELLER;
      const res = await fetch("/api/customer/onboarding/accept-msa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ msaVersion, scrollConfirmed: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to accept MSA");
      }
      return res.json();
    },
    onSuccess: () => {
      onAccepted();
    },
    onError: (err: Error) => {
      setError(err.message);
      setAccepting(false);
    },
  });

  const handleAccept = () => {
    setError(null);
    setAccepting(true);
    acceptMutation.mutate(undefined, {
      onSettled: () => setAccepting(false),
    });
  };

  if (!status) {
    return (
      <div className="py-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (status.msaAcceptedAt) {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            MSA Already Accepted
          </DialogTitle>
        </DialogHeader>
        <p className="text-slate-400 text-sm">
          You have already accepted the Master Service Agreement. Your grace period is active.
        </p>
        <Button onClick={onClose} className="mt-4 bg-indigo-600 hover:bg-indigo-500">
          Close
        </Button>
      </>
    );
  }

  const isSubAccount = status.accountType === "SUB_ACCOUNT";
  const isReseller = status.accountType === "RESELLER";
  const needsResellerSign = isSubAccount && !status.resellerMsaConfirmedAt;
  const msaVersion = isReseller || isSubAccount ? MSA_VERSION_RESELLER : MSA_VERSION_DIRECT;
  const fullMsaText = isReseller || isSubAccount ? `${MSA_TEXT}\n\n${MSA_TEXT_RESELLER_ADDENDUM}` : MSA_TEXT;

  if (status.onboardingStatus === "PENDING_MSA" && needsResellerSign) {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            Reseller Countersignature Required
          </DialogTitle>
        </DialogHeader>
        <p className="text-slate-400 text-sm">
          Your reseller must complete their countersignature before you can accept the MSA. Please contact your account manager.
        </p>
        <Button onClick={onClose} variant="outline" className="mt-4 border-slate-600">
          Close
        </Button>
      </>
    );
  }

  if (status.onboardingStatus !== "PENDING_MSA") {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="text-white">MSA Status</DialogTitle>
        </DialogHeader>
        <p className="text-slate-400 text-sm">No pending MSA acceptance for your account.</p>
        <Button onClick={onClose} className="mt-4 bg-indigo-600 hover:bg-indigo-500">Close</Button>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-400" />
          Master Service Agreement {isReseller || isSubAccount ? `+ Addendum v${msaVersion}` : `v${msaVersion}`}
        </DialogTitle>
      </DialogHeader>
      <p className="text-sm text-slate-300">
        Please read the agreement in full. Scroll to the bottom to unlock the Accept button.
      </p>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 min-h-[280px] max-h-[50vh] overflow-y-auto p-4 rounded-lg bg-slate-800/60 border border-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-mono text-slate-300"
        aria-label="Master Service Agreement text"
      >
        {fullMsaText}
      </div>
      <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-700">
        {!hasScrolledToBottom ? (
          <p className="text-xs text-slate-300 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            Scroll to the bottom to confirm you have read the agreement.
          </p>
        ) : (
          <p className="text-xs text-emerald-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            You have read the agreement.
          </p>
        )}
        <Button
          onClick={handleAccept}
          disabled={!hasScrolledToBottom || accepting}
          className="bg-indigo-600 hover:bg-indigo-500 min-w-[120px]"
        >
          {accepting ? "Saving..." : "I Accept"}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-red-400 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </p>
      )}
      <p className="text-xs text-slate-300">
        By clicking &quot;I Accept&quot; you agree to the Sovereign AI OS Master Service Agreement
        {isReseller || isSubAccount ? " and Reseller Addendum" : ""} v{msaVersion}.
      </p>
    </>
  );
}

import { OperationsPanel } from '@/components/account/OperationsPanel';

export type CommandCenterSection = 'profile' | 'governance' | 'operations' | 'billing-summary' | 'my-businesses';

export function ProfileContent({ section: embeddedSection }: { section?: CommandCenterSection } = {}) {
  const { user, token, updateUser, isAuthenticated, isLoading } = useCustomerAuth();
  const { toast } = useToast();
  const [pathname, setLocation] = useLocation();
  const isAppStandalone = pathname.startsWith("/app");
  const nav = (path: string) => setLocation(isAppStandalone && (path.startsWith("/my-account") || path.startsWith("/aibizbot")) ? `/app${path}` : path);
  const [editingName, setEditingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [emailValue, setEmailValue] = useState("");
  const [showAddBusiness, setShowAddBusiness] = useState(false);
  const [addingBusiness, setAddingBusiness] = useState(false);
  const [mapsKey, setMapsKey] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [showMsaModal, setShowMsaModal] = useState(false);
  const hashToSection = (h: string): CommandCenterSection | null =>
    (['profile', 'governance', 'operations', 'billing-summary', 'my-businesses'] as CommandCenterSection[]).includes(h as CommandCenterSection) ? (h as CommandCenterSection) : null;
  const initialSection = (() => {
    if (typeof window === 'undefined') return 'profile';
    const hash = window.location.hash.slice(1);
    return hashToSection(hash) ?? 'profile';
  })();
  const [activeSection, setActiveSection] = useState<CommandCenterSection>(initialSection);
  const isEmbedded = embeddedSection != null;
  const displaySection: CommandCenterSection = embeddedSection ?? activeSection;
  const showProfile = displaySection === 'profile' || (isEmbedded && embeddedSection === 'profile');
  const showGovernance = displaySection === 'governance' || (isEmbedded && embeddedSection === 'profile');
  const showOperations = displaySection === 'operations';
  const showBillingSummary = !isEmbedded && displaySection === 'billing-summary';
  const showMyBusinesses = displaySection === 'my-businesses' || (isEmbedded && embeddedSection === 'my-businesses');

  const categoryMenu: { id: CommandCenterSection; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'governance', label: 'Legal & Compliance' },
    { id: 'operations', label: 'Operations' },
    { id: 'billing-summary', label: 'Billing summary' },
    { id: 'my-businesses', label: 'My Businesses' },
  ];

  useEffect(() => {
    if (isEmbedded) return;
    const syncFromHash = () => {
      const section = hashToSection(window.location.hash.slice(1));
      if (section) setActiveSection(section);
    };
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, [isEmbedded]);

  useEffect(() => {
    if (!showAddBusiness) return;
    fetch("/api/config/maps-key")
      .then((r) => r.json())
      .then((d) => { if (d.key) setMapsKey(d.key); })
      .catch(() => {});
  }, [showAddBusiness]);

  useEffect(() => {
    if (!mapsKey || !pickerRef.current || !showAddBusiness) return;
    const container = pickerRef.current;
    container.innerHTML = "";
    let autocomplete: any = null;
    let cancelled = false;

    const setup = async () => {
      const { PlaceAutocompleteElement } = await loadPlacesLibrary();
      if (cancelled) return;

      autocomplete = new PlaceAutocompleteElement();
      autocomplete.setAttribute("placeholder", "Search for your business...");
      autocomplete.setAttribute("data-testid", "input-add-business-search");
      autocomplete.style.cssText = "width:100%;display:block;border:1px solid #334155;border-radius:0.5rem;";

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
          shadow.appendChild(style);
        }
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

        setAddingBusiness(true);
        try {
          const createRes = await fetch("/api/site-configs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: businessName,
              placeId: placeId || undefined,
              placeData,
            }),
          });
          if (!createRes.ok) {
            const errData = await createRes.json().catch(() => ({}));
            throw new Error(errData.error || "Failed to create site");
          }
          const siteConfig = await createRes.json();
          if (token) {
            const claimRes = await fetch("/api/customer/claim-business", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ siteConfigId: siteConfig.id }),
            });
            if (!claimRes.ok) {
              const errData = await claimRes.json().catch(() => ({}));
              throw new Error(errData.error || "Failed to link to your account");
            }
          }
          await queryClient.invalidateQueries({ queryKey: ["/api/customer/businesses"] });
          setShowAddBusiness(false);
          toast({ title: "Business Added", description: `${businessName} has been added to your account.` });
        } catch (err: any) {
          toast({ title: "Error", description: err.message || "Failed to add business", variant: "destructive" });
        } finally {
          setAddingBusiness(false);
        }
      };

      ensureApiLoader(mapsKey);
      autocomplete.addEventListener("gmp-select", handlePlaceSelect);
      container.appendChild(autocomplete);

      setTimeout(() => {
        const input = autocomplete?.shadowRoot?.querySelector("input");
        if (input) (input as HTMLInputElement).focus();
      }, 300);
    };

    setup().catch(err => console.error("[ProfileContent] Failed to load Places library:", err));

    return () => {
      cancelled = true;
      container.innerHTML = "";
    };
  }, [mapsKey, showAddBusiness, token]);

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

  const onboardingQuery = useQuery({
    queryKey: ["/api/customer/onboarding/status"],
    queryFn: async () => {
      const res = await fetch("/api/customer/onboarding/status", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch onboarding status");
      return res.json();
    },
    enabled: isAuthenticated && !!token,
  });

  const currentBillQuery = useQuery({
    queryKey: ["/api/customer/current-bill"],
    queryFn: async () => {
      const res = await fetch("/api/customer/current-bill", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load current bill");
      return res.json();
    },
    enabled: isAuthenticated && !!token,
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-slate-200">
        <p className="text-sm">Please log in to view your account.</p>
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
    <>
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {!isEmbedded && (
          <div>
            <h1 className="text-3xl font-bold text-white" data-testid="text-my-account-title">
              Command Center
            </h1>
            <p className="text-slate-300 mt-1">
              Sovereign AI OS · Account &amp; Governance
            </p>
          </div>
        )}

        {!isEmbedded && (
          <nav className="flex flex-wrap gap-2 border-b border-slate-700 pb-4" aria-label="Command Center categories">
            {categoryMenu.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveSection(id);
                  if (typeof window !== 'undefined') {
                    window.history.replaceState(undefined, '', `${window.location.pathname}${window.location.search}#${id}`);
                  }
                }}
                className={`px-4 py-2 rounded-sui text-sm font-medium transition-colors ${
                  activeSection === id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 hover:text-white border border-slate-700'
                }`}
                data-testid={`button-section-${id}`}
              >
                {label}
              </button>
            ))}
          </nav>
        )}

        {showProfile && (
        <Card className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-sui">
              <User className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Profile</h2>
              <p className="text-sm text-slate-300">Your account information</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300">Phone</span>
              </div>
              <span className="text-white font-mono text-sm" data-testid="text-phone">{user.phone}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-sm">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300">Name</span>
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
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300">Email</span>
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
        )}

        {showGovernance && (
        <Card className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl p-6" data-testid="card-governance-layer">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-sui">
              <Activity className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Governance Layer</h2>
              <p className="text-sm text-slate-300">MSA v1.0.0 · Sovereign AI OS</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-sui" data-testid="section-grace-period">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <p className="text-sm font-medium text-slate-200">Verizon Grace Period</p>
                </div>
                {!onboarding?.activationDate ? (
                  <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">MSA Pending</Badge>
                ) : graceActive ? (
                  <Badge className="bg-indigo-500/10 text-indigo-300 border-indigo-500/20 text-xs">
                    Day {graceDaysElapsed} of {SOVEREIGN_PRICING.gracePeriodDays}
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Active · Full Commitment
                  </Badge>
                )}
              </div>

              {!onboarding?.activationDate ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-300">
                    Accept the Master Service Agreement to start your 30-day zero-penalty grace period.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setShowMsaModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8"
                    data-testid="button-accept-msa"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Review & Accept MSA
                  </Button>
                </div>
              ) : (
                <>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${graceExpired ? "bg-emerald-500" : "bg-gradient-to-r from-indigo-500 to-violet-500"}`}
                      style={{ width: `${gracePct}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-300">
                    {graceActive
                      ? `${onboarding?.trialDaysRemaining} days remaining — terminate before Day 30 with no penalty (MSA §2.3)`
                      : "Grace period elapsed. 12-month commitment is active."}
                  </p>
                </>
              )}
            </div>

            <div className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-sui" data-testid="section-a2p-compliance">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  <p className="text-sm font-medium text-slate-200">A2P 10DLC Registration</p>
                </div>
                {complianceStatus === "APPROVED" ? (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" /> Compliant</Badge>
                ) : complianceStatus === "PENDING" ? (
                  <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Carrier Review In Progress</Badge>
                ) : complianceStatus === "REJECTED" ? (
                  <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-xs"><AlertTriangle className="w-3 h-3 mr-1" /> Resubmit Required</Badge>
                ) : (
                  <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs"><AlertTriangle className="w-3 h-3 mr-1" /> Registration Required</Badge>
                )}
              </div>
              {(!complianceStatus || complianceStatus === "REJECTED") && (
                <div className="mt-3">
                  <p className="text-xs text-slate-300 mb-2">
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

            <div className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-sui" data-testid="section-pricing-anchor">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-sm font-medium text-slate-200">Sovereign AI OS</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-white">${SOVEREIGN_PRICING.flatFeeMonthly}</span>
                  <span className="text-xs text-slate-400">/mo flat fee</span>
                </div>
              </div>
              <p className="text-xs text-slate-300 mb-3">+ metered overage — billed in arrears per MSA §3.2</p>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-700/50 border border-slate-600/50 rounded-lg text-xs text-slate-400">
                  <Mic2 className="w-3 h-3 text-blue-400" /> ${SOVEREIGN_PRICING.overagePhoneVoice}/min phone AI
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-700/50 border border-slate-600/50 rounded-lg text-xs text-slate-400">
                  <Activity className="w-3 h-3 text-indigo-400" /> ${SOVEREIGN_PRICING.overageWebVoice}/min web AI
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-700/50 border border-slate-600/50 rounded-lg text-xs text-slate-400">
                  <MessageSquare className="w-3 h-3 text-violet-400" /> ${SOVEREIGN_PRICING.overageA2pSms}/msg A2P SMS
                </div>
              </div>
            </div>
          </div>
        </Card>
        )}

        {showOperations && (
          <Card className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl overflow-hidden" data-testid="card-operations">
             <OperationsPanel siteConfigId={businesses[0]?.id} />
          </Card>
        )}

        {showBillingSummary && (
        <Card className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl p-6" data-testid="card-billing">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-sui">
              <CreditCard className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Your bill</h2>
              <p className="text-sm text-slate-300">Platform fee, voice by agent, and overages</p>
            </div>
          </div>
          {currentBillQuery.isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            </div>
          ) : currentBillQuery.error ? (
            <p className="text-sm text-amber-400 py-4">Could not load current bill. Try again later.</p>
          ) : currentBillQuery.data ? (
            <div className="space-y-4 mb-6">
              <div className="rounded-sui bg-slate-800/40 border border-slate-700/50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">{currentBillQuery.data.platformFee?.label ?? "Platform fee"}</span>
                  <span className="text-white font-medium">${Number(currentBillQuery.data.platformFee?.amount ?? 0).toFixed(2)}</span>
                </div>
                {(currentBillQuery.data.voiceByAgent ?? []).length > 0 && (
                  <>
                    {(currentBillQuery.data.voiceByAgent as Array<{ agentName: string; amount: number }>).map((v: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-slate-400">Voice — {v.agentName}</span>
                        <span className="text-white font-medium">${Number(v.amount ?? 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </>
                )}
                {(currentBillQuery.data.overages ?? []).length > 0 && (
                  <>
                    {(currentBillQuery.data.overages as Array<{ label: string; units: number; amount: number }>).map((o: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-slate-400">{o.label} ({o.units} min)</span>
                        <span className="text-white font-medium">${Number(o.amount ?? 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </>
                )}
                <div className="border-t border-slate-700/60 pt-2 flex justify-between text-sm font-semibold">
                  <span className="text-slate-200">Total</span>
                  <span className="text-white">${Number(currentBillQuery.data.total ?? 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ) : null}
          <BillingHistory />
        </Card>
        )}

        {showMyBusinesses && (
        <Card className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl p-6" data-testid="card-my-businesses">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-sui">
              <Building2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">My Businesses</h2>
              <p className="text-sm text-slate-300">Add prospects, invite via SMS, and track earnings in the Reseller Dashboard.</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setLocation("/app/reseller")}
            className="border-indigo-500/40 text-indigo-300 hover:border-indigo-400 hover:bg-indigo-500/10"
            data-testid="button-open-reseller-dashboard"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open Reseller Dashboard
          </Button>
        </Card>
        )}
      </div>

      <Dialog open={showMsaModal} onOpenChange={setShowMsaModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col bg-slate-900 border-slate-700 text-slate-200">
          <MsaModalContent
            status={onboarding}
            token={token}
            onAccepted={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/customer/onboarding/status"] });
              setShowMsaModal(false);
              toast({ title: "MSA accepted", description: "Your 30-day grace period has started." });
            }}
            onClose={() => setShowMsaModal(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
