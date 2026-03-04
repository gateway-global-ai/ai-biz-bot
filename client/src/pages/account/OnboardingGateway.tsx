/**
 * client/src/pages/account/OnboardingGateway.tsx
 *
 * Onboarding & Compliance Gateway — three-step activation sequence.
 *
 * Step 1 — MSA Acceptance:   Scroll-gate enforces "Opportunity to Review" (Tier-1 telecom standard).
 *                             SUB_ACCOUNTs: Reseller pre-signature gate → waiting state → end-user scroll.
 *                             RESELLER/SUB_ACCOUNT: MSA v1.1.0 Addendum with co-signature banner.
 * Step 2 — A2P Compliance:   verifyCompliance skill (billing_engine.json). SUB_ACCOUNTs must declare
 *                             the Content Provider (MSA v1.1.0 §1.5 — carrier audit requirement).
 *                             Status set to PENDING until carrier approves — not APPROVED on submit.
 * Step 3 — Grace Countdown:  30-day progress bar sourced from pricing_v1.yaml → grace_period_days.
 *
 * Source of truth: /.system_design/rules.md, contracts/MSA_v1.1.0_RESELLER.md
 */

import { useRef, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Clock, AlertCircle, ShieldCheck, FileText, Building2, Users } from "lucide-react";

// ── MSA version routing (Governance Sync — CEO mandate) ──────────────────────
// DIRECT → 1.0.0, RESELLER / SUB_ACCOUNT → 1.1.0 (Reseller Addendum)
const MSA_VERSION_DIRECT   = "1.0.0";
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

// ── Types ────────────────────────────────────────────────────────────────────

type AccountType = "DIRECT" | "RESELLER" | "SUB_ACCOUNT";

interface OnboardingStatus {
  onboardingStatus: "PENDING_MSA" | "PENDING_COMPLIANCE" | "ACTIVE" | "SUSPENDED";
  complianceStatus: "NOT_SUBMITTED" | "PENDING" | "APPROVED" | "REJECTED";
  accountType: AccountType;
  parentAccountId: string | null;
  activationDate: string | null;
  trialEndDate: string | null;
  trialDaysRemaining: number | null;
  trialDaysElapsed: number | null;
  gracePeriodDays: number;
  msaAcceptedAt: string | null;
  msaVersion: string | null;
  resellerMsaConfirmedAt: string | null;
  stripeConnectedAccountId: string | null;
}

interface ComplianceForm {
  entityType: "Corporate" | "Individual";
  businessName: string;
  ein: string;
  address: { street: string; city: string; state: string; zip: string; country: string };
  smsUseCase: string;
  contentProviderName: string;
  contentProviderAcknowledged: boolean;
}

// ── Step 1: MSA Acceptance ───────────────────────────────────────────────────

interface MsaAcceptanceProps {
  onAccepted: () => void;
  accountType: AccountType;
  resellerMsaConfirmedAt: string | null;
}

function MsaAcceptanceStep({ onAccepted, accountType, resellerMsaConfirmedAt }: MsaAcceptanceProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReseller    = accountType === "RESELLER";
  const isSubAccount  = accountType === "SUB_ACCOUNT";
  const msaVersion    = accountType === "DIRECT" ? MSA_VERSION_DIRECT : MSA_VERSION_RESELLER;
  const fullMsaText   = isReseller || isSubAccount
    ? `${MSA_TEXT}\n\n${MSA_TEXT_RESELLER_ADDENDUM}`
    : MSA_TEXT;

  // SUB_ACCOUNT: block end-user signature until reseller pre-signature is confirmed
  if (isSubAccount && !resellerMsaConfirmedAt) {
    return (
      <div className="max-w-2xl mx-auto py-10 px-4 space-y-6">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-amber-500" />
          <div>
            <h1 className="text-2xl font-bold">Waiting for Reseller Co-Signature</h1>
            <p className="text-sm text-muted-foreground">
              Your account is being set up by a reseller partner. Before you can review and accept
              the Master Service Agreement, your reseller must first record their countersignature.
            </p>
          </div>
        </div>
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            Once your reseller countersigns, you will be able to proceed with MSA acceptance and
            A2P compliance registration. Please contact your account manager if this is taking
            longer than expected.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 12) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAccept = async () => {
    setAccepting(true);
    setError(null);
    try {
      await apiRequest("POST", "/api/onboarding/accept-msa", {
        msaVersion,
        scrollConfirmed: true,
      });
      onAccepted();
    } catch (err: any) {
      setError(err.message || "Failed to record MSA acceptance. Please try again.");
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">
            Master Service Agreement
            {(isReseller || isSubAccount) && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                + Reseller Addendum v{msaVersion}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            Please read the agreement in full before proceeding. Scroll to the bottom to unlock the
            Accept button.
          </p>
        </div>
      </div>

      {/* Reseller co-signature confirmation banner for SUB_ACCOUNTs */}
      {isSubAccount && resellerMsaConfirmedAt && (
        <Alert>
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <AlertDescription>
            This agreement has been countersigned by your reseller on{" "}
            <strong>{new Date(resellerMsaConfirmedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</strong>.
            Your acceptance below completes the dual-signature requirement.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-0">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="h-[420px] overflow-y-auto p-6 text-sm leading-relaxed whitespace-pre-wrap font-mono text-foreground/80 border-b"
            aria-label="Master Service Agreement text"
          >
            {fullMsaText}
          </div>

          <div className="p-4 flex items-center justify-between gap-4 bg-muted/40">
            {!hasScrolledToBottom ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                Scroll to the bottom to confirm you have read the agreement.
              </p>
            ) : (
              <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                You have read the agreement.
              </p>
            )}
            <Button
              onClick={handleAccept}
              disabled={!hasScrolledToBottom || accepting}
              className="min-w-[140px]"
            >
              {accepting ? "Saving..." : "I Accept"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <p className="text-xs text-muted-foreground text-center">
        By clicking "I Accept" you agree to the Sovereign AI OS Master Service Agreement
        {isReseller || isSubAccount ? " and Reseller Addendum" : ""} v{msaVersion}. A timestamped
        record of this acceptance will be saved to your account.
      </p>
    </div>
  );
}

// ── Step 2: A2P Compliance Form ──────────────────────────────────────────────

function ComplianceFormStep({ onSubmitted, accountType }: { onSubmitted: () => void; accountType: AccountType }) {
  const isSubAccount = accountType === "SUB_ACCOUNT";

  const [form, setForm] = useState<ComplianceForm>({
    entityType: "Corporate",
    businessName: "",
    ein: "",
    address: { street: "", city: "", state: "", zip: "", country: "US" },
    smsUseCase: "",
    contentProviderName: "",
    contentProviderAcknowledged: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = (key: keyof ComplianceForm, value: any) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setAddressField = (key: keyof ComplianceForm["address"], value: string) =>
    setForm((f) => ({ ...f, address: { ...f.address, [key]: value } }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubAccount && !form.contentProviderAcknowledged) {
      setError("You must acknowledge the Content Provider designation before submitting.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiRequest("POST", "/api/onboarding/compliance", form);
      onSubmitted();
    } catch (err: any) {
      // Surface the rejection reason from the API
      const raw = err.message || "";
      const match = raw.match(/^\d+: (.+)$/);
      try {
        const body = JSON.parse(match?.[1] ?? raw);
        setError(body.rejectionReason || body.error || raw);
      } catch {
        setError(raw);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">A2P 10DLC Compliance</h1>
          <p className="text-sm text-muted-foreground">
            All SMS messaging requires A2P 10DLC registration. This information is submitted to The
            Campaign Registry (TCR) for carrier approval.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Entity Type</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={form.entityType}
              onValueChange={(v) => setField("entityType", v as "Corporate" | "Individual")}
              className="flex gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="Corporate" id="corporate" />
                <Label htmlFor="corporate" className="flex items-center gap-1.5 cursor-pointer">
                  <Building2 className="h-4 w-4" /> Corporate / LLC
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="Individual" id="individual" />
                <Label htmlFor="individual" className="cursor-pointer">
                  Individual / Sole Proprietor
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Business Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                value={form.businessName}
                onChange={(e) => setField("businessName", e.target.value)}
                placeholder="e.g. Huntington & Ellis Real Estate"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ein">
                EIN / Tax ID{" "}
                <span className="text-muted-foreground text-xs font-normal">(Format: XX-XXXXXXX)</span>
              </Label>
              <Input
                id="ein"
                value={form.ein}
                onChange={(e) => setField("ein", e.target.value)}
                placeholder="12-3456789"
                pattern="\d{2}-\d{7}"
                title="EIN must be in the format XX-XXXXXXX"
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Physical Address</CardTitle>
            <CardDescription className="text-xs">
              Must be the registered address for your business entity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                value={form.address.street}
                onChange={(e) => setAddressField("street", e.target.value)}
                placeholder="123 Main St"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={form.address.city}
                  onChange={(e) => setAddressField("city", e.target.value)}
                  placeholder="Las Vegas"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={form.address.state}
                  onChange={(e) => setAddressField("state", e.target.value)}
                  placeholder="NV"
                  maxLength={2}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  id="zip"
                  value={form.address.zip}
                  onChange={(e) => setAddressField("zip", e.target.value)}
                  placeholder="89101"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={form.address.country}
                  onChange={(e) => setAddressField("country", e.target.value)}
                  placeholder="US"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">SMS Use Case</CardTitle>
            <CardDescription className="text-xs">
              Describe how your business will use SMS messaging. This description is submitted
              directly to carriers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={form.smsUseCase}
              onChange={(e) => setField("smsUseCase", e.target.value)}
              placeholder="e.g. We send appointment reminders, property listing updates, and follow-up messages to opted-in real estate clients who have provided Prior Express Written Consent."
              rows={4}
              minLength={10}
              required
            />
          </CardContent>
        </Card>

        {/* Content Provider Designation — SUB_ACCOUNTs only (MSA v1.1.0 §1.5 / carrier audit) */}
        {isSubAccount && (
          <Card className="border-amber-200 bg-amber-50/40">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-600" />
                A2P Content Provider Designation
              </CardTitle>
              <CardDescription className="text-xs">
                Required for carrier-level audits (MSA v1.1.0 §1.5). The Reseller is the
                "Account Owner." The end-user submitting this form is the "Content Provider"
                responsible for all SMS content.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="contentProviderName">Content Provider Name</Label>
                <Input
                  id="contentProviderName"
                  value={form.contentProviderName}
                  onChange={(e) => setField("contentProviderName", e.target.value)}
                  placeholder="e.g. Jane Smith — Keller Williams Agent"
                  required={isSubAccount}
                />
                <p className="text-xs text-muted-foreground">
                  The specific individual or business unit responsible for the SMS content being sent.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="contentProviderAck"
                  checked={form.contentProviderAcknowledged}
                  onCheckedChange={(v) => setField("contentProviderAcknowledged", v === true)}
                />
                <Label htmlFor="contentProviderAck" className="text-sm leading-relaxed cursor-pointer">
                  I acknowledge that I am the "Content Provider" for all SMS messages sent through
                  this account. I accept full responsibility for message content, recipient consent,
                  and compliance with carrier A2P 10DLC policies. I understand that my Reseller is
                  the "Account Owner" and is liable for my compliance under MSA v1.1.0 §1.4.
                </Label>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting} className="min-w-[180px]">
            {submitting ? "Submitting..." : "Submit for Carrier Approval"}
          </Button>
        </div>
      </form>

      <p className="text-xs text-muted-foreground text-center">
        A2P 10DLC registration is processed by The Campaign Registry (TCR) and mobile carriers.
        Approval typically takes 1–5 business days. SMS will be enabled automatically upon approval.
      </p>
    </div>
  );
}

// ── Step 3: Grace Period Countdown Banner ────────────────────────────────────

function GracePeriodBanner({ status }: { status: OnboardingStatus }) {
  const { trialDaysRemaining, trialDaysElapsed, gracePeriodDays, trialEndDate, complianceStatus } =
    status;

  if (trialDaysRemaining === null || trialDaysRemaining <= 0) return null;

  const daysElapsed = trialDaysElapsed ?? 0;
  const progressPct = Math.min(100, Math.round((daysElapsed / gracePeriodDays) * 100));
  const cancelByDate = trialEndDate
    ? new Date(trialEndDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const urgency = trialDaysRemaining <= 5 ? "amber" : "green";

  const complianceBadge = {
    NOT_SUBMITTED: { label: "Compliance Not Submitted", variant: "destructive" as const },
    PENDING: { label: "Carrier Approval Pending", variant: "secondary" as const },
    APPROVED: { label: "SMS Active", variant: "default" as const },
    REJECTED: { label: "Compliance Rejected", variant: "destructive" as const },
  }[complianceStatus];

  return (
    <Card
      className={`border-l-4 ${urgency === "amber" ? "border-l-amber-500" : "border-l-emerald-500"}`}
    >
      <CardContent className="pt-5 pb-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Clock
              className={`h-4 w-4 ${urgency === "amber" ? "text-amber-500" : "text-emerald-500"}`}
            />
            <span className="font-semibold text-sm">
              {trialDaysRemaining} day{trialDaysRemaining !== 1 ? "s" : ""} remaining in your
              30-Day Grace Period
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={complianceBadge.variant}>{complianceBadge.label}</Badge>
          </div>
        </div>

        <Progress value={progressPct} className="h-2" />

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Day {daysElapsed} of {gracePeriodDays}</span>
          {cancelByDate && (
            <span>
              Cancel without penalty before{" "}
              <strong className="text-foreground">{cancelByDate}</strong>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function OnboardingGateway() {
  const queryClient = useQueryClient();
  const { token, isAuthenticated } = useAuth();

  const { data: status, isLoading, isError } = useQuery<OnboardingStatus>({
    queryKey: ["/api/onboarding/status"],
    queryFn: async () => {
      const res = await fetch("/api/onboarding/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch onboarding status");
      return res.json();
    },
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/onboarding/status"] });
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground text-sm">
        Loading onboarding status...
      </div>
    );
  }

  if (isError || !status) {
    return (
      <div className="max-w-md mx-auto py-10 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Unable to load onboarding status. Please refresh the page or contact support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (status.onboardingStatus === "PENDING_MSA") {
    return (
      <MsaAcceptanceStep
        onAccepted={invalidate}
        accountType={status.accountType ?? "DIRECT"}
        resellerMsaConfirmedAt={status.resellerMsaConfirmedAt}
      />
    );
  }

  if (status.onboardingStatus === "PENDING_COMPLIANCE") {
    return (
      <ComplianceFormStep
        onSubmitted={invalidate}
        accountType={status.accountType ?? "DIRECT"}
      />
    );
  }

  if (status.onboardingStatus === "SUSPENDED") {
    return (
      <div className="max-w-md mx-auto py-10 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your account has been suspended. Please contact support to resolve any outstanding
            balance.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ACTIVE — show the grace period banner (renders null automatically after Day 30)
  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-7 w-7 text-emerald-500" />
        <div>
          <h1 className="text-2xl font-bold">Account Active</h1>
          <p className="text-sm text-muted-foreground">
            Your Sovereign OS is live. Your voice and SMS services are being provisioned.
          </p>
        </div>
      </div>

      <GracePeriodBanner status={status} />

      <Separator />

      <div className="grid grid-cols-2 gap-4 text-sm">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-muted-foreground text-xs mb-1">Activation Date</p>
            <p className="font-medium">
              {status.activationDate
                ? new Date(status.activationDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-muted-foreground text-xs mb-1">A2P Campaign Status</p>
            <p className="font-medium capitalize">{status.complianceStatus.replace("_", " ")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
