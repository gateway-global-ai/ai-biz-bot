import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Loader2, Shield } from "lucide-react";
import { PhonePreview } from "@/components/compliance/PhonePreview";
import {
  generateCampaignTemplates,
  mapIndustryToKey,
  realEstateLinkCard,
  type IndustryType,
  type LinkCard,
} from "./brand-admin-types";

export type { IndustryType } from "./brand-admin-types";
export { generateCampaignTemplates, mapIndustryToKey } from "./brand-admin-types";

const EIN_REGEX = /^\d{2}-\d{7}$/;
const E164_PHONE_REGEX = /^\+1\d{10}$/;
const PO_BOX_PATTERN = /^P\.?O\.?\s*Box/i;

const LEGAL_SUFFIXES = [
  "LLC",
  "Inc",
  "Inc.",
  "Corp",
  "Corp.",
  "LP",
  "LLP",
  "PLLC",
  "PC",
  "Ltd",
];

export interface BrandFormData {
  companyName: string;
  a2pLegalCompanyName: string;
  taxId: string;
  website: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  industry: string;
}

export interface PreFlightResult {
  valid: boolean;
  errors: Record<string, string>;
}

function getLevenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function PreFlightCheckStep({
  form,
  preFlightResult,
  setPreFlightResult,
  onPass,
}: {
  form: BrandFormData;
  preFlightResult: PreFlightResult | null;
  setPreFlightResult: (r: PreFlightResult | null) => void;
  onPass: () => void;
}) {
  const { toast } = useToast();
  const [checking, setChecking] = useState(false);
  const [websiteChecking, setWebsiteChecking] = useState(false);

  const runValidation = useCallback(async () => {
    setChecking(true);
    try {
      const res = await apiRequest("POST", "/api/a2p/preflight/validate", {
        ein: form.taxId,
        businessName: form.a2pLegalCompanyName || form.companyName,
        websiteUrl: form.website || undefined,
        streetAddress: form.streetAddress,
        city: form.city,
        state: form.state,
        postalCode: form.postalCode,
        contactPhone: form.phone,
      });
      const data = (await res.json()) as PreFlightResult;
      setPreFlightResult(data);
      if (data.valid) {
        toast({ title: "Pre-flight passed", description: "All checks passed." });
        onPass();
      }
    } catch (e: unknown) {
      toast({
        title: "Validation error",
        description: e instanceof Error ? e.message : "Request failed",
        variant: "destructive",
      });
      setPreFlightResult({ valid: false, errors: { _: "Request failed" } });
    } finally {
      setChecking(false);
    }
  }, [form, onPass, toast]);

  const checks = {
    ein: EIN_REGEX.test(form.taxId.trim()),
    address:
      !!form.streetAddress?.trim() &&
      !!form.city?.trim() &&
      !!form.state?.trim() &&
      !!form.postalCode?.trim(),
    noPoBox: !PO_BOX_PATTERN.test(form.streetAddress || ""),
    phone: !form.phone?.trim() || E164_PHONE_REGEX.test(form.phone.trim()),
  };
  const allLocalChecksPass =
    checks.ein && checks.address && checks.noPoBox && checks.phone;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Pre-Flight Data Validation
        </CardTitle>
        <CardDescription>
          TCR rejects submissions with invalid EIN, incomplete address, or missing privacy policy. Fix any issues before submitting.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            {checks.ein ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-600" />
            )}
            EIN format XX-XXXXXXX (e.g. 47-1234567)
            {!checks.ein && form.taxId && (
              <span className="text-destructive text-xs">
                EIN must be in format XX-XXXXXXX
              </span>
            )}
          </li>
          <li className="flex items-center gap-2">
            {checks.address ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-600" />
            )}
            Address complete (street, city, state, postal code)
          </li>
          <li className="flex items-center gap-2">
            {checks.noPoBox ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-600" />
            )}
            Physical street address (no P.O. Box)
            {!checks.noPoBox && (
              <span className="text-destructive text-xs">
                TCR requires a physical street address
              </span>
            )}
          </li>
          <li className="flex items-center gap-2">
            {checks.phone ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-600" />
            )}
            Contact phone E.164 (+1XXXXXXXXXX) if provided
          </li>
          {form.website && (
            <li className="flex items-center gap-2">
              {preFlightResult?.errors?.websiteUrl ? (
                <AlertCircle className="h-4 w-4 text-amber-600" />
              ) : preFlightResult?.valid ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
              Website reachable with privacy/terms
            </li>
          )}
        </ul>
        {preFlightResult && !preFlightResult.valid && Object.keys(preFlightResult.errors).length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {Object.entries(preFlightResult.errors)
                .filter(([k]) => k !== "_")
                .map(([k, v]) => `${k}: ${v}`)
                .join("; ")}
            </AlertDescription>
          </Alert>
        )}
        <Button
          onClick={runValidation}
          disabled={!allLocalChecksPass || checking}
        >
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Run pre-flight validation
        </Button>
      </CardContent>
    </Card>
  );
}

interface LegalNameConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  legalCompanyName: string;
  ein: string;
  industry: string;
  onConfirm: (confirmed: boolean, confirmedAt: string) => void;
}

function LegalNameConfirmationModal({
  open,
  onOpenChange,
  legalCompanyName,
  ein,
  industry,
  onConfirm,
}: LegalNameConfirmationModalProps) {
  const [checked, setChecked] = useState(false);
  const hasSuffix = LEGAL_SUFFIXES.some((s) =>
    legalCompanyName.trim().toUpperCase().endsWith(s.toUpperCase())
  );

  const handleProceed = () => {
    if (!checked) return;
    onConfirm(true, new Date().toISOString());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Confirm Your Legal Entity Name
          </DialogTitle>
          <DialogDescription>
            EIN {ein} must be registered to this EXACT name at the IRS and your Secretary of State.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm">
            You entered: <strong>&quot;{legalCompanyName}&quot;</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            Common mismatches: missing &quot;LLC&quot;, &quot;Inc.&quot;, &quot;Corp.&quot;, &quot;LP&quot;; abbreviated words (e.g. &quot;Mgmt&quot; vs &quot;Management&quot;); DBA names instead of legal entity names.
          </p>
          {!hasSuffix && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No legal entity suffix detected (LLC, Inc., Corp., etc.). Sole proprietors should enter their full legal name as it appears on their tax return.
              </AlertDescription>
            </Alert>
          )}
          {industry === "real_estate" && (
            <p className="text-sm text-muted-foreground">
              Real estate agents may need to use their brokerage&apos;s legal entity name, not their personal name. Check with your broker before proceeding.{" "}
              <a
                href="https://www.irs.gov/businesses/small-businesses-self-employed/employer-id-numbers"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                IRS EIN lookup
              </a>
            </p>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="rounded border-input"
            />
            <span className="text-sm">I confirm this is the exact legal name for EIN {ein}</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Edit Name
          </Button>
          <Button onClick={handleProceed} disabled={!checked}>
            I Confirm — Proceed to TrustHub
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const initialForm: BrandFormData = {
  companyName: "",
  a2pLegalCompanyName: "",
  taxId: "",
  website: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  streetAddress: "",
  city: "",
  state: "",
  postalCode: "",
  industry: "real_estate",
};

export default function BrandAdminPage() {
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "preflight" | "legal_modal" | "trusthub">("form");
  const [form, setForm] = useState<BrandFormData>(initialForm);
  const [preFlightResult, setPreFlightResult] = useState<PreFlightResult | null>(null);
  const [legalNameConfirmed, setLegalNameConfirmed] = useState(false);
  const [legalNameConfirmedAt, setLegalNameConfirmedAt] = useState<string | null>(null);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const industryKey = mapIndustryToKey(form.industry) as IndustryType;
  const templates = generateCampaignTemplates(
    form.companyName || "Your Company",
    industryKey
  );
  const sampleMessages = [
    templates.verification?.sampleMessage ?? "",
    templates.customer_engagement?.sampleMessage ?? "",
    templates.retention?.sampleMessage ?? "",
  ].filter(Boolean);
  const linkCard: LinkCard | undefined =
    industryKey === "real_estate" ? realEstateLinkCard : undefined;

  const handlePreFlightPass = () => setStep("legal_modal");
  const handleOpenLegalModal = () => setShowLegalModal(true);

  const handleLegalConfirm = (confirmed: boolean, confirmedAt: string) => {
    setLegalNameConfirmed(confirmed);
    setLegalNameConfirmedAt(confirmedAt);
    setStep("trusthub");
  };

  const handleSubmitToTwilio = async () => {
    if (!legalNameConfirmed) {
      toast({
        title: "Confirm legal name",
        description: "You must confirm the legal entity name before submitting.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/a2p/brands", {
        companyName: form.a2pLegalCompanyName || form.companyName,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        country: "US",
        taxId: form.taxId,
        website: form.website || undefined,
        vertical: form.industry ? form.industry.toUpperCase().replace(/\s/g, "_") : undefined,
        legalNameConfirmed: true,
        legalNameConfirmedAt: legalNameConfirmedAt ?? new Date().toISOString(),
        customerId: undefined,
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: "Brand created",
          description: "Brand registration created. Proceed to submit for review after payment.",
        });
      } else {
        throw new Error(data.error || "Failed to create brand");
      }
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Submit failed",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const preFlightValid = preFlightResult?.valid === true;
  const submitDisabled = !legalNameConfirmed || !preFlightValid || submitting;

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">A2P Brand Admin</h1>
        <p className="text-muted-foreground">
          Register your business for 10DLC. Complete pre-flight checks and confirm your legal name before submitting.
        </p>
      </div>

      {step === "form" && (
        <Card>
          <CardHeader>
            <CardTitle>Brand information</CardTitle>
            <CardDescription>Company and authorized signer details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyName">Display / Business name</Label>
                <Input
                  id="companyName"
                  value={form.companyName}
                  onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                  placeholder="Acme Realty"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="a2pLegalCompanyName">Legal company name (exact for EIN)</Label>
                <Input
                  id="a2pLegalCompanyName"
                  value={form.a2pLegalCompanyName}
                  onChange={(e) => setForm((f) => ({ ...f, a2pLegalCompanyName: e.target.value }))}
                  placeholder="Acme Realty Group LLC"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxId">EIN (XX-XXXXXXX)</Label>
              <Input
                id="taxId"
                value={form.taxId}
                onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))}
                placeholder="47-1234567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website URL</Label>
              <Input
                id="website"
                type="url"
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                placeholder="https://example.com"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="streetAddress">Street address</Label>
                <Input
                  id="streetAddress"
                  value={form.streetAddress}
                  onChange={(e) => setForm((f) => ({ ...f, streetAddress: e.target.value }))}
                  placeholder="123 Main St"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="Las Vegas"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={form.state}
                  onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                  placeholder="NV"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal code</Label>
                <Input
                  id="postalCode"
                  value={form.postalCode}
                  onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
                  placeholder="89101"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (E.164)</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+15551234567"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={form.industry}
                onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                placeholder="real estate, realty, brokerage..."
              />
            </div>
            <Button onClick={() => setStep("preflight")}>Continue to pre-flight</Button>
          </CardContent>
        </Card>
      )}

      {step === "preflight" && (
        <>
          <PreFlightCheckStep
            form={form}
            preFlightResult={preFlightResult}
            setPreFlightResult={setPreFlightResult}
            onPass={handlePreFlightPass}
          />
          <Button variant="outline" onClick={() => setStep("form")}>
            Back
          </Button>
        </>
      )}

      {step === "legal_modal" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Legal name confirmation</CardTitle>
              <CardDescription>
                Confirm your legal entity name before we submit to TrustHub.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleOpenLegalModal}>Confirm legal name</Button>
            </CardContent>
          </Card>
          <LegalNameConfirmationModal
            open={showLegalModal}
            onOpenChange={setShowLegalModal}
            legalCompanyName={form.a2pLegalCompanyName || form.companyName}
            ein={form.taxId}
            industry={industryKey}
            onConfirm={handleLegalConfirm}
          />
          <Button variant="outline" onClick={() => setStep("preflight")}>
            Back
          </Button>
        </>
      )}

      {step === "trusthub" && (
        <Card>
          <CardHeader>
            <CardTitle>Submit to Twilio</CardTitle>
            <CardDescription>
              Pre-flight passed and legal name confirmed. Submit to create your brand registration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PhonePreview
              messages={sampleMessages}
              senderName={form.companyName || "Your Company"}
              showLinkCard={!!linkCard}
              linkCardContent={linkCard}
            />
            <Button onClick={handleSubmitToTwilio} disabled={submitDisabled}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Submit to Twilio
            </Button>
            <Button variant="outline" onClick={() => setStep("legal_modal")}>
              Back
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
