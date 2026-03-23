/**
 * Platform Settings / Support — single placeholder view for all /platform/settings/* and /platform/support/* routes.
 * Renders the correct title and icon from adminNav; keeps users in the platform admin shell (no dead or wrong pages).
 */
import { useLocation } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Settings } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { flattenNavItems, platformNav, type AdminNavItem } from "@/config/adminNav";
import { apiRequest } from "@/lib/queryClient";

interface SiteConfigOption {
  id: string;
  name?: string | null;
}

type NewCustomerFieldKey = "firstName" | "lastName" | "cellPhone" | "email" | "address";

interface IntakePolicyResponse {
  policy: {
    defaultModeByCategory?: Record<string, string>;
    fields?: Record<string, { customerWriteMode?: string }>;
    newCustomerIntakeFields?: Partial<
      Record<NewCustomerFieldKey, { enabled?: boolean; required?: boolean }>
    >;
    callerIdLookup?: { skillEnabled?: boolean; pricingAcknowledged?: boolean };
  };
}

const DEFAULT_NEW_CUSTOMER_FIELDS: Record<NewCustomerFieldKey, { enabled: boolean; required: boolean }> = {
  firstName: { enabled: true, required: false },
  lastName: { enabled: true, required: false },
  cellPhone: { enabled: true, required: false },
  email: { enabled: true, required: false },
  address: { enabled: true, required: false },
};

interface IntakeReviewQueueResponse {
  requests?: Array<{
    id: string;
    patientId: string;
    fieldName: string;
    writeMode: string;
    status: string;
    reviewerRole?: string | null;
    createdAt?: string | null;
  }>;
}

interface VerificationPolicyResponse {
  policy: {
    level: "basic" | "standard" | "strict";
    steps: {
      otp: boolean;
      magicLink: boolean;
      biometric: boolean;
      idDocument: boolean;
      digitalSignature: boolean;
      insuranceCardUpload: boolean;
      selfiePhotoMatch: boolean;
    };
  };
}

function getNavItemForPath(path: string): AdminNavItem | null {
  const flat = flattenNavItems(platformNav);
  return flat.find((item) => item.path === path) ?? null;
}

interface InstallationKeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

function InstallationKeysPanel({ activeSiteId }: { activeSiteId: string }) {
  const queryClient = useQueryClient();
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [revealedOnce, setRevealedOnce] = useState<string | null>(null);

  const keysQuery = useQuery<{ keys: InstallationKeyRow[] }>({
    queryKey: ["/api/site-configs", activeSiteId, "verification-installation-keys"],
    enabled: Boolean(activeSiteId),
    staleTime: 15_000,
    queryFn: async () => {
      const res = await fetch(`/api/site-configs/${activeSiteId}/verification-installation-keys`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/site-configs/${activeSiteId}/verification-installation-keys`, {
        name: newKeyLabel.trim() || "Installation",
      });
      return res.json() as Promise<{
        id: string;
        keyPrefix: string;
        fullKey: string;
        warning: string;
      }>;
    },
    onSuccess: (data) => {
      setRevealedOnce(data.fullKey);
      setNewKeyLabel("");
      queryClient.invalidateQueries({
        queryKey: ["/api/site-configs", activeSiteId, "verification-installation-keys"],
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (keyId: string) => {
      await apiRequest(
        "DELETE",
        `/api/site-configs/${activeSiteId}/verification-installation-keys/${keyId}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/site-configs", activeSiteId, "verification-installation-keys"],
      });
    },
  });

  if (!activeSiteId) {
    return <p className="text-xs text-slate-500">Select a site above.</p>;
  }

  return (
    <div className="space-y-3">
      {revealedOnce && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">
          <div className="font-semibold text-amber-50 mb-1">Copy this key now</div>
          <code className="break-all text-[11px] text-amber-100">{revealedOnce}</code>
          <button
            type="button"
            className="mt-2 rounded border border-amber-400/40 px-2 py-1 text-[11px] text-amber-100"
            onClick={() => {
              void navigator.clipboard.writeText(revealedOnce);
            }}
          >
            Copy
          </button>
          <button
            type="button"
            className="mt-2 ml-2 text-[11px] text-amber-200/80 underline"
            onClick={() => setRevealedOnce(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-end">
        <label className="min-w-[200px]">
          <span className="block text-[11px] text-slate-400 mb-1">Label</span>
          <input
            type="text"
            value={newKeyLabel}
            onChange={(e) => setNewKeyLabel(e.target.value)}
            placeholder="e.g. Kiosk West"
            className="w-full rounded border border-slate-600/60 bg-slate-800 px-2 py-1 text-xs text-slate-100"
          />
        </label>
        <button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="rounded border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-100 disabled:opacity-50"
        >
          {createMutation.isPending ? "Creating…" : "Create key"}
        </button>
      </div>

      {keysQuery.isLoading ? (
        <p className="text-xs text-slate-400">Loading keys…</p>
      ) : keysQuery.isError ? (
        <p className="text-xs text-red-400">{(keysQuery.error as Error)?.message ?? "Failed to load keys"}</p>
      ) : (
        <div className="space-y-2">
          {(keysQuery.data?.keys ?? []).length === 0 ? (
            <p className="text-xs text-slate-500">No installation keys yet.</p>
          ) : (
            (keysQuery.data?.keys ?? []).map((k) => (
              <div
                key={k.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700/70 bg-slate-800/60 p-3 text-xs text-slate-200"
              >
                <div>
                  <div className="font-medium text-slate-100">{k.name}</div>
                  <div className="text-slate-400">
                    Prefix <code className="text-slate-300">{k.keyPrefix}…</code>
                    {k.revokedAt ? (
                      <span className="text-rose-400 ml-2">revoked</span>
                    ) : !k.isActive ? (
                      <span className="text-slate-500 ml-2">inactive</span>
                    ) : null}
                  </div>
                  {k.lastUsedAt && (
                    <div className="text-[10px] text-slate-500 mt-1">Last used {k.lastUsedAt}</div>
                  )}
                </div>
                <button
                  type="button"
                  disabled={!k.isActive || !!k.revokedAt || revokeMutation.isPending}
                  onClick={() => {
                    if (confirm("Revoke this key? Remote systems using it will stop working.")) {
                      revokeMutation.mutate(k.id);
                    }
                  }}
                  className="rounded border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-200 disabled:opacity-40"
                >
                  Revoke
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function PlatformSettingsPage() {
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const item = getNavItemForPath(location);
  const Icon = item?.icon ?? Settings;
  const title = item?.label ?? "Settings";
  const subtitle = item
    ? `Platform settings: ${item.label}. Configure below when this section is implemented.`
    : "Platform settings.";
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [insuranceRequired, setInsuranceRequired] = useState<boolean>(true);
  const [attorneyVisible, setAttorneyVisible] = useState<boolean>(true);
  const [consentRequired, setConsentRequired] = useState<boolean>(true);
  const [verificationLevel, setVerificationLevel] = useState<"basic" | "standard" | "strict">(
    "standard"
  );
  const [verificationSteps, setVerificationSteps] = useState<VerificationPolicyResponse["policy"]["steps"]>({
    otp: true,
    magicLink: false,
    biometric: false,
    idDocument: true,
    digitalSignature: false,
    insuranceCardUpload: true,
    selfiePhotoMatch: false,
  });

  const [newCustomerFields, setNewCustomerFields] =
    useState<Record<NewCustomerFieldKey, { enabled: boolean; required: boolean }>>(DEFAULT_NEW_CUSTOMER_FIELDS);
  const [callerIdSkillEnabled, setCallerIdSkillEnabled] = useState(false);
  const [callerIdPricingAck, setCallerIdPricingAck] = useState(false);

  const { data: siteConfigs = [] } = useQuery<SiteConfigOption[]>({
    queryKey: ["/api/site-configs"],
    staleTime: 60_000,
  });

  const activeSiteId = selectedSiteId || siteConfigs[0]?.id || "";

  const intakePolicyQuery = useQuery<IntakePolicyResponse>({
    queryKey: ["/api/site-configs", activeSiteId, "intake-policy"],
    enabled: Boolean(activeSiteId),
    staleTime: 30_000,
  });

  const reviewQueueQuery = useQuery<IntakeReviewQueueResponse>({
    queryKey: ["/api/site-configs", activeSiteId, "intake/review-queue"],
    enabled: Boolean(activeSiteId),
    staleTime: 15_000,
  });

  const verificationPolicyQuery = useQuery<VerificationPolicyResponse>({
    queryKey: ["/api/site-configs", activeSiteId, "verification-policy"],
    enabled: Boolean(activeSiteId),
    staleTime: 30_000,
  });

  useMemo(() => {
    const policy = intakePolicyQuery.data?.policy?.fields ?? {};
    setInsuranceRequired(policy.insuranceProvider?.customerWriteMode !== "denied");
    setAttorneyVisible(policy.attorneyProvider?.customerWriteMode !== "denied");
    setConsentRequired(policy.consentSignature?.customerWriteMode !== "denied");
  }, [intakePolicyQuery.data]);

  useEffect(() => {
    const pol = intakePolicyQuery.data?.policy;
    if (!pol) return;
    const nc = pol.newCustomerIntakeFields;
    if (nc) {
      setNewCustomerFields((prev) => {
        const next = { ...prev };
        (Object.keys(next) as NewCustomerFieldKey[]).forEach((k) => {
          if (nc[k]) {
            next[k] = {
              enabled: nc[k]?.enabled ?? next[k].enabled,
              required: nc[k]?.required ?? next[k].required,
            };
          }
        });
        return next;
      });
    }
    if (pol.callerIdLookup) {
      setCallerIdSkillEnabled(!!pol.callerIdLookup.skillEnabled);
      setCallerIdPricingAck(!!pol.callerIdLookup.pricingAcknowledged);
    }
  }, [intakePolicyQuery.data?.policy]);

  useMemo(() => {
    const policy = verificationPolicyQuery.data?.policy;
    if (!policy) return;
    setVerificationLevel(policy.level);
    setVerificationSteps(policy.steps);
  }, [verificationPolicyQuery.data]);

  const savePolicyMutation = useMutation({
    mutationFn: async () => {
      if (!activeSiteId) throw new Error("Select a site first.");
      const prev = intakePolicyQuery.data?.policy;
      const fields: Record<string, unknown> = {
        ...(prev?.fields ?? {}),
        insuranceProvider: {
          category: "business_sensitive",
          customerWriteMode: insuranceRequired ? "review" : "denied",
          reviewerRole: "receptionist",
          auditRequired: true,
          channelRules: insuranceRequired ? ["secure_form"] : ["none"],
        },
        attorneyProvider: {
          category: "business_sensitive",
          customerWriteMode: attorneyVisible ? "review" : "denied",
          reviewerRole: "receptionist",
          auditRequired: true,
          channelRules: attorneyVisible ? ["secure_form"] : ["none"],
        },
        consentSignature: {
          category: "sensitive_regulated",
          customerWriteMode: consentRequired ? "secure_only" : "denied",
          reviewerRole: "manager",
          auditRequired: true,
          channelRules: consentRequired ? ["secure_form"] : ["none"],
        },
      };
      const res = await apiRequest("PATCH", `/api/site-configs/${activeSiteId}/intake-policy`, {
        policy: {
          defaultModeByCategory: prev?.defaultModeByCategory ?? {
            low_risk: "direct",
            business_sensitive: "review",
            sensitive_regulated: "secure_only",
          },
          fields,
          newCustomerIntakeFields: newCustomerFields,
          callerIdLookup: {
            skillEnabled: callerIdSkillEnabled,
            pricingAcknowledged: callerIdPricingAck,
          },
        },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-configs", activeSiteId, "intake-policy"] });
    },
  });

  const effectiveModes = {
    insuranceProvider: insuranceRequired ? "review" : "denied",
    attorneyProvider: attorneyVisible ? "review" : "denied",
    consentSignature: consentRequired ? "secure_only" : "denied",
  } as const;

  const modeTone: Record<string, string> = {
    direct: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    review: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    secure_only: "border-indigo-500/30 bg-indigo-500/10 text-indigo-200",
    denied: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  };

  const reviewDecisionMutation = useMutation({
    mutationFn: async ({
      requestId,
      decision,
    }: {
      requestId: string;
      decision: "approved" | "rejected";
    }) => {
      if (!activeSiteId) throw new Error("Select a site first.");
      const res = await apiRequest(
        "PATCH",
        `/api/site-configs/${activeSiteId}/intake/review-queue/${requestId}`,
        { decision }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/site-configs", activeSiteId, "intake/review-queue"],
      });
    },
  });

  const saveVerificationPolicyMutation = useMutation({
    mutationFn: async () => {
      if (!activeSiteId) throw new Error("Select a site first.");
      const res = await apiRequest("PATCH", `/api/site-configs/${activeSiteId}/verification-policy`, {
        policy: {
          level: verificationLevel,
          steps: verificationSteps,
        },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/site-configs", activeSiteId, "verification-policy"],
      });
    },
  });

  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex items-center gap-3"
      >
        <div className="p-2 rounded-sui bg-slate-900/40 border border-indigo-500/20">
          <Icon className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">{title}</h1>
          <p className="text-slate-400 text-sm">{subtitle}</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.03 }}
        className="p-6 rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl shadow-2xl"
      >
        <p className="text-slate-400">
          This page is in the platform admin. Content for <strong className="text-slate-300">{title}</strong> will be added here.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.06 }}
        className="p-6 rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-white font-semibold">Intake Governance (MVP)</h2>
          <select
            value={activeSiteId}
            onChange={(event) => setSelectedSiteId(event.target.value)}
            className="rounded border border-slate-600/60 bg-slate-800 px-2 py-1 text-xs text-slate-100"
          >
            {siteConfigs.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name || site.id}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="rounded-lg border border-slate-700/70 bg-slate-800/60 p-3 text-xs text-slate-200">
            <div className="mb-2 font-semibold text-slate-100">Insurance Required</div>
            <input
              type="checkbox"
              checked={insuranceRequired}
              onChange={(event) => setInsuranceRequired(event.target.checked)}
            />
            <div
              className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-[10px] ${modeTone[effectiveModes.insuranceProvider]}`}
            >
              Mode: {effectiveModes.insuranceProvider}
            </div>
          </label>
          <label className="rounded-lg border border-slate-700/70 bg-slate-800/60 p-3 text-xs text-slate-200">
            <div className="mb-2 font-semibold text-slate-100">Attorney Field Visible</div>
            <input
              type="checkbox"
              checked={attorneyVisible}
              onChange={(event) => setAttorneyVisible(event.target.checked)}
            />
            <div
              className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-[10px] ${modeTone[effectiveModes.attorneyProvider]}`}
            >
              Mode: {effectiveModes.attorneyProvider}
            </div>
          </label>
          <label className="rounded-lg border border-slate-700/70 bg-slate-800/60 p-3 text-xs text-slate-200">
            <div className="mb-2 font-semibold text-slate-100">Consent Required</div>
            <input
              type="checkbox"
              checked={consentRequired}
              onChange={(event) => setConsentRequired(event.target.checked)}
            />
            <div
              className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-[10px] ${modeTone[effectiveModes.consentSignature]}`}
            >
              Mode: {effectiveModes.consentSignature}
            </div>
          </label>
        </div>

        <div className="rounded-lg border border-indigo-500/20 bg-slate-950/40 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">New customer capture (chat + voice)</h3>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Choose which fields agents should collect for <strong className="text-slate-300">new</strong> customers or
            leads. Disabled fields are not part of the owner-approved intake canvas contract.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ["firstName", "First name"],
                ["lastName", "Last name"],
                ["cellPhone", "Cell phone"],
                ["email", "Email"],
                ["address", "Address"],
              ] as const
            ).map(([key, label]) => (
              <div
                key={key}
                className="flex flex-wrap items-center gap-3 rounded border border-slate-700/60 bg-slate-800/50 px-3 py-2 text-[11px] text-slate-200"
              >
                <span className="min-w-[5rem] font-medium text-slate-100">{label}</span>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={newCustomerFields[key].enabled}
                    onChange={(e) =>
                      setNewCustomerFields((prev) => ({
                        ...prev,
                        [key]: { ...prev[key], enabled: e.target.checked },
                      }))
                    }
                  />
                  On
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={newCustomerFields[key].required}
                    disabled={!newCustomerFields[key].enabled}
                    onChange={(e) =>
                      setNewCustomerFields((prev) => ({
                        ...prev,
                        [key]: { ...prev[key], required: e.target.checked },
                      }))
                    }
                  />
                  Required
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-amber-500/20 bg-slate-950/40 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">Twilio inbound Caller ID / CNAM (skill)</h3>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            When enabled, agents can call the <code className="text-slate-300">get_inbound_caller_identity</code> tool
            for policy text. Actual PSTN Caller Name requires Twilio configuration on the business number. Twilio may
            bill per lookup — verify current pricing (stakeholder estimate ~$0.01/call).{" "}
            <strong className="text-slate-300">Caller Name is not identity verification</strong>; OTP / guest
            verification still applies to PMS and guest records.
          </p>
          <label className="flex items-start gap-2 text-[11px] text-slate-200">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={callerIdSkillEnabled}
              onChange={(e) => setCallerIdSkillEnabled(e.target.checked)}
            />
            <span>Enable Caller ID (CNAM) skill for this site</span>
          </label>
          <label className="flex items-start gap-2 text-[11px] text-slate-200">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={callerIdPricingAck}
              onChange={(e) => setCallerIdPricingAck(e.target.checked)}
            />
            <span>Owner acknowledges per-call Twilio pricing may apply — verify at twilio.com before go-live.</span>
          </label>
        </div>

        <button
          type="button"
          onClick={() => savePolicyMutation.mutate()}
          disabled={savePolicyMutation.isPending || !activeSiteId}
          className="rounded border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-100 disabled:opacity-50"
        >
          {savePolicyMutation.isPending ? "Saving..." : "Save Intake Policy"}
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.075 }}
        className="p-6 rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-white font-semibold">Clear Check Point Governance (Voice + Chat)</h2>
          <div className="rounded border border-slate-600/60 bg-slate-800 px-2 py-1 text-[11px] text-slate-200">
            Site: {activeSiteId || "Select site"}
          </div>
        </div>
        <p className="text-xs text-slate-400">
          Configure how strict authentication should be before booking, insurance capture, and
          protected workflow actions.
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="rounded-lg border border-slate-700/70 bg-slate-800/60 p-3 text-xs text-slate-200">
            <div className="mb-2 font-semibold text-slate-100">Verification Level</div>
            <select
              value={verificationLevel}
              onChange={(event) =>
                setVerificationLevel(event.target.value as "basic" | "standard" | "strict")
              }
              className="w-full rounded border border-slate-600/60 bg-slate-800 px-2 py-1 text-xs text-slate-100"
            >
              <option value="basic">basic</option>
              <option value="standard">standard</option>
              <option value="strict">strict</option>
            </select>
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {(
            [
              ["otp", "OTP Code"],
              ["magicLink", "Magic Link"],
              ["idDocument", "ID Document"],
              ["selfiePhotoMatch", "Selfie Photo Match"],
              ["insuranceCardUpload", "Insurance Card Upload"],
              ["digitalSignature", "Digital Signature"],
              ["biometric", "Biometric Check"],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="rounded-lg border border-slate-700/70 bg-slate-800/60 p-3 text-xs text-slate-200"
            >
              <div className="mb-2 font-semibold text-slate-100">{label}</div>
              <input
                type="checkbox"
                checked={verificationSteps[key]}
                onChange={(event) =>
                  setVerificationSteps((prev) => ({ ...prev, [key]: event.target.checked }))
                }
              />
            </label>
          ))}
        </div>

        <button
          type="button"
          onClick={() => saveVerificationPolicyMutation.mutate()}
          disabled={saveVerificationPolicyMutation.isPending || !activeSiteId}
          className="rounded border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-100 disabled:opacity-50"
        >
          {saveVerificationPolicyMutation.isPending ? "Saving..." : "Save Verification Policy"}
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.082 }}
        className="p-6 rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-white font-semibold">Remote installation API keys</h2>
          <div className="rounded border border-slate-600/60 bg-slate-800 px-2 py-1 text-[11px] text-slate-200">
            Site: {activeSiteId || "Select site"}
          </div>
        </div>
        <p className="text-xs text-slate-400">
          Keys authenticate remote OS instances to{" "}
          <code className="text-slate-300">POST /api/v1/verification/guest/start</code> and{" "}
          <code className="text-slate-300">complete</code>. The full secret is shown only once when
          created.
        </p>
        <InstallationKeysPanel activeSiteId={activeSiteId} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.09 }}
        className="p-6 rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl shadow-2xl space-y-3"
      >
        <h2 className="text-white font-semibold">Pending Intake Review Queue</h2>
        {reviewQueueQuery.isLoading ? (
          <p className="text-xs text-slate-400">Loading queue...</p>
        ) : !reviewQueueQuery.data?.requests || reviewQueueQuery.data.requests.length === 0 ? (
          <p className="text-xs text-slate-400">No pending intake requests.</p>
        ) : (
          <div className="space-y-2">
            {reviewQueueQuery.data.requests.map((request) => (
              <div
                key={request.id}
                className="rounded-lg border border-slate-700/70 bg-slate-800/60 p-3 text-xs text-slate-200"
              >
                <div className="mb-2 text-slate-100">
                  {request.fieldName} - {request.writeMode} - {request.status}
                </div>
                <div className="mb-2 text-slate-400">
                  Patient {request.patientId} • Reviewer {request.reviewerRole || "receptionist"}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      reviewDecisionMutation.mutate({
                        requestId: request.id,
                        decision: "approved",
                      })
                    }
                    className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-200"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      reviewDecisionMutation.mutate({
                        requestId: request.id,
                        decision: "rejected",
                      })
                    }
                    className="rounded border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-200"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
