/**
 * Platform Settings / Support — single placeholder view for all /platform/settings/* and /platform/support/* routes.
 * Renders the correct title and icon from adminNav; keeps users in the platform admin shell (no dead or wrong pages).
 */
import { useLocation } from "wouter";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Settings } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { flattenNavItems, platformNav, type AdminNavItem } from "@/config/adminNav";
import { apiRequest } from "@/lib/queryClient";

interface SiteConfigOption {
  id: string;
  name?: string | null;
}

interface IntakePolicyResponse {
  policy: {
    fields?: Record<string, { customerWriteMode?: string }>;
  };
}

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

  useMemo(() => {
    const policy = verificationPolicyQuery.data?.policy;
    if (!policy) return;
    setVerificationLevel(policy.level);
    setVerificationSteps(policy.steps);
  }, [verificationPolicyQuery.data]);

  const savePolicyMutation = useMutation({
    mutationFn: async () => {
      if (!activeSiteId) throw new Error("Select a site first.");
      const fields: Record<string, unknown> = {
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
          fields,
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
