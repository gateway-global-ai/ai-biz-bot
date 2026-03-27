/**
 * AgentBuilderPage — /admin/agents/build
 *
 * The Programmatic Agent Creation Pipeline.
 *
 * This form is the visual representation of INTERNAL_AGENT_CREATION_DOCTRINE.md.
 * It collects a strictly typed payload and deterministically provisions a full
 * 6-agent swarm via POST /api/intelligence/provision.
 *
 * 3 Steps:
 *   1. Identity Context    → businessName, siteConfigId, industry vertical
 *   2. Behavioral Calibration → DISC (4 sliders) + ARCH (5 sliders)
 *   3. Knowledge Domains   → multi-select canonical domain tags + confirm & deploy
 *
 * After provisioning, if DISC/ARCH differ from swarm-template defaults, the form
 * patches the primary Concierge agent with the operator's calibration overrides.
 *
 * Governance: UI is a payload generator only. No agent mutation happens client-side.
 * Auth: requireAuth on all backing API calls.
 */

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Building2, ChevronRight, ChevronLeft, Sliders, BookOpen,
  CheckCircle2, Loader2, AlertCircle, Zap, Shield, RotateCcw,
} from "lucide-react";
import { DISC_COLORS, ARCH_COLORS } from "@/config/brand";
import {
  agentBuilderSchema,
  type AgentBuilderPayload,
  AGENT_BUILDER_DEFAULTS,
  INDUSTRY_VERTICAL_OPTIONS,
  KNOWLEDGE_DOMAIN_OPTIONS,
  toProvisionPayload,
} from "@shared/agentBuilderSchema";
import { SovereignButton } from "@/ui-core";
import { apiRequest } from "@/lib/queryClient";

// ── Step definitions ──────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Identity",    icon: Building2,  desc: "Business context and industry vertical" },
  { id: 2, label: "Behavior",    icon: Sliders,    desc: "DISC psychology and ARCH dialogue mechanics" },
  { id: 3, label: "Knowledge",   icon: BookOpen,   desc: "Knowledge domains and final review" },
] as const;

// ── Inline slider (Tailwind only — no shadcn/MUI dependency) ─────────────────

function ProfileSlider({
  label, value, onChange, color, description, disabled,
}: {
  label: string; value: number; onChange: (v: number) => void;
  color: string; description?: string; disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5 group">
      <div className="flex items-end justify-between">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-slate-300 transition-colors">
          {label}
        </label>
        <span className="text-xs font-mono font-bold transition-colors" style={{ color }}>
          {value}%
        </span>
      </div>
      <input
        type="range" min="0" max="100" value={value} disabled={disabled}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        style={{ accentColor: color }}
      />
      {description && (
        <p className="text-[9px] italic leading-tight text-slate-600">{description}</p>
      )}
    </div>
  );
}

// ── Step header ───────────────────────────────────────────────────────────────

function StepProgress({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const done = current > step.id;
        const active = current === step.id;
        return (
          <div key={step.id} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              active ? "bg-indigo-500/20 border border-indigo-500/40 text-indigo-300"
              : done ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
              : "bg-slate-800/60 border border-slate-700/50 text-slate-500"
            }`}>
              {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
              {step.label}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-6 transition-colors ${done ? "bg-emerald-500/50" : "bg-slate-700/50"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Provision API call ────────────────────────────────────────────────────────

interface ProvisionResponse {
  success: boolean;
  orchestrationRunId: string;
  orchestrationFinalStatus: string;
  agentsCreated: number;
  agentIds: string[];
  industryGroup: string;
  archetypesProvisioned: string[];
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AgentBuilderPage() {
  const [step, setStep] = useState(1);
  const [result, setResult] = useState<ProvisionResponse | null>(null);
  const [, navigate] = useLocation();

  const form = useForm<AgentBuilderPayload>({
    resolver: zodResolver(agentBuilderSchema),
    defaultValues: AGENT_BUILDER_DEFAULTS,
    mode: "onBlur",
  });

  const { control, watch, setValue, handleSubmit, formState: { errors } } = form;
  const values = watch();

  // ── Provision mutation ────────────────────────────────────────────────────
  const provisionMutation = useMutation({
    mutationFn: async (data: AgentBuilderPayload) => {
      const provisionPayload = toProvisionPayload(data);

      // Step A: provision the swarm
      const provisionRes = await apiRequest("POST", "/api/intelligence/provision", provisionPayload);
      const provision = await provisionRes.json() as ProvisionResponse;
      if (!provision.success) throw new Error("Provision failed");

      // Step B: if DISC/ARCH overrides requested, patch the Concierge agent
      if (data.applyDiscOverride && provision.agentIds.length > 0) {
        // The Concierge is always the first provisioned agent (sort_order = 0)
        const conciergeId = provision.agentIds[0];
        await apiRequest("PATCH", `/api/agents/${conciergeId}`, {
          dominance:          data.disc.dominance,
          influence:          data.disc.influence,
          steadiness:         data.disc.steadiness,
          conscientiousness:  data.disc.conscientiousness,
          archProfile: {
            acknowledge:          data.arch.acknowledge,
            reflect:              data.arch.reflect,
            context:              data.arch.context,
            handoff:              data.arch.handoff,
            responseWindowSeconds: data.arch.responseWindowSeconds,
          },
        });
      }

      return provision;
    },
    onSuccess: (data) => setResult(data),
  });

  const onSubmit = (data: AgentBuilderPayload) => provisionMutation.mutate(data);

  const nextStep = async () => {
    const fieldsToValidate: (keyof AgentBuilderPayload)[] =
      step === 1 ? ["siteConfigId", "businessName", "placeType"]
      : step === 2 ? ["disc", "arch"]
      : ["knowledgeDomains"];

    const valid = await form.trigger(fieldsToValidate as any);
    if (valid) setStep((s) => Math.min(s + 1, 3));
  };

  const resetDiscArch = () => {
    setValue("disc", AGENT_BUILDER_DEFAULTS.disc);
    setValue("arch", AGENT_BUILDER_DEFAULTS.arch);
  };

  // ── Success state ─────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-lg p-8 rounded-2xl bg-slate-900/60 border border-emerald-500/30 backdrop-blur-xl shadow-2xl text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Swarm Deployed</h2>
          <p className="text-slate-400 text-sm mb-5">
            {result.agentsCreated} agents provisioned for <span className="text-white font-medium">{values.businessName}</span>
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6 text-left">
            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/40">
              <p className="text-xs text-slate-500 mb-1">Industry Group</p>
              <p className="text-sm font-medium text-white">{result.industryGroup}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/40">
              <p className="text-xs text-slate-500 mb-1">Orchestration Run</p>
              <p className="text-xs font-mono text-slate-400 truncate">{result.orchestrationRunId}</p>
            </div>
            <div className="col-span-2 p-3 rounded-xl bg-slate-800/50 border border-slate-700/40">
              <p className="text-xs text-slate-500 mb-2">Archetypes Provisioned</p>
              <div className="flex flex-wrap gap-1.5">
                {result.archetypesProvisioned.map((a) => (
                  <span key={a} className="text-xs font-mono bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full">{a}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <SovereignButton sovereignVariant="outlined" onClick={() => { setResult(null); setStep(1); form.reset(AGENT_BUILDER_DEFAULTS); }}>
              Build Another
            </SovereignButton>
            <SovereignButton onClick={() => navigate(`/admin/agents`)}>
              Manage Agents
            </SovereignButton>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] p-6">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
              <Bot className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Agent Builder</h1>
              <p className="text-xs text-slate-400">Programmatic swarm provisioning</p>
            </div>
          </div>
          <StepProgress current={step} />
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <AnimatePresence mode="wait">

            {/* ── Step 1: Identity Context ──────────────────────────────── */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <div className="p-6 rounded-2xl bg-slate-900/60 border border-indigo-500/20 backdrop-blur-xl">
                  <div className="flex items-center gap-2 mb-5">
                    <Building2 className="w-4 h-4 text-indigo-400" />
                    <h2 className="text-sm font-bold text-white uppercase tracking-wide">Identity Context</h2>
                  </div>

                  <div className="space-y-4">
                    {/* Business Name */}
                    <Controller
                      name="businessName"
                      control={control}
                      render={({ field }) => (
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1.5">Business Name</label>
                          <input
                            {...field}
                            placeholder="e.g. Glamour Nails Studio"
                            className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors"
                          />
                          {errors.businessName && <p className="text-red-400 text-xs mt-1">{errors.businessName.message}</p>}
                        </div>
                      )}
                    />

                    {/* Site Config ID */}
                    <Controller
                      name="siteConfigId"
                      control={control}
                      render={({ field }) => (
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1.5">Site Config ID</label>
                          <input
                            {...field}
                            placeholder="uuid — from /admin/sites"
                            className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors"
                          />
                          {errors.siteConfigId && <p className="text-red-400 text-xs mt-1">{errors.siteConfigId.message}</p>}
                        </div>
                      )}
                    />

                    {/* Industry Vertical */}
                    <Controller
                      name="placeType"
                      control={control}
                      render={({ field }) => (
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1.5">Industry Vertical</label>
                          <select
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors appearance-none cursor-pointer"
                          >
                            {INDUSTRY_VERTICAL_OPTIONS.map((v) => (
                              <option key={v.placeType} value={v.placeType} className="bg-slate-900">
                                {v.label}
                              </option>
                            ))}
                          </select>
                          {errors.placeType && <p className="text-red-400 text-xs mt-1">{String(errors.placeType.message)}</p>}
                        </div>
                      )}
                    />
                  </div>
                </div>

                {/* Governance note */}
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-indigo-500/8 border border-indigo-500/15">
                  <Shield className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-indigo-300/70 leading-relaxed">
                    Provisioning calls <span className="font-mono">POST /api/intelligence/provision</span> via <span className="font-mono">runAgentSwarmProvisionOrchestrated</span>. An orchestration run row is created before any agents are inserted — full audit trail from the first click.
                  </p>
                </div>

                <div className="flex justify-end">
                  <SovereignButton onClick={nextStep} endIcon={<ChevronRight className="w-4 h-4" />}>
                    Next: Behavior
                  </SovereignButton>
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Behavioral Calibration ───────────────────────── */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <div className="grid md:grid-cols-2 gap-5">
                  {/* DISC panel */}
                  <div className="p-5 rounded-2xl bg-slate-900/60 border border-indigo-500/20 backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xs font-bold text-white uppercase tracking-wide">DISC Psychology</h2>
                      <span className="text-[10px] text-slate-500">Layer 2</span>
                    </div>
                    <div className="space-y-4">
                      {(["dominance", "influence", "steadiness", "conscientiousness"] as const).map((key) => {
                        const labels = { dominance: "D — Dominance", influence: "I — Influence", steadiness: "S — Steadiness", conscientiousness: "C — Conscientiousness" };
                        const descs = { dominance: "Drive, directness, decisiveness", influence: "Enthusiasm, persuasion, openness", steadiness: "Patience, reliability, empathy", conscientiousness: "Precision, analysis, compliance" };
                        const colorKey = key[0].toUpperCase() as "D"|"I"|"S"|"C";
                        return (
                          <Controller
                            key={key}
                            name={`disc.${key}`}
                            control={control}
                            render={({ field }) => (
                              <ProfileSlider
                                label={labels[key]}
                                value={field.value}
                                onChange={field.onChange}
                                color={DISC_COLORS[colorKey]}
                                description={descs[key]}
                              />
                            )}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* ARCH panel */}
                  <div className="p-5 rounded-2xl bg-slate-900/60 border border-indigo-500/20 backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xs font-bold text-white uppercase tracking-wide">ARCH Mechanics</h2>
                      <span className="text-[10px] text-slate-500">Layer 3</span>
                    </div>
                    <div className="space-y-4">
                      {(["acknowledge", "reflect", "context", "handoff"] as const).map((key) => {
                        const labels = { acknowledge: "A — Acknowledge", reflect: "R — Reflect", context: "C — Context", handoff: "H — Handoff" };
                        const descs = { acknowledge: "Validate what the caller said", reflect: "Show you heard the emotion", context: "Add relevant information", handoff: "Move the conversation forward" };
                        const colorKey = key[0].toUpperCase() as "A"|"R"|"C"|"H";
                        return (
                          <Controller
                            key={key}
                            name={`arch.${key}`}
                            control={control}
                            render={({ field }) => (
                              <ProfileSlider
                                label={labels[key]}
                                value={field.value}
                                onChange={field.onChange}
                                color={ARCH_COLORS[colorKey]}
                                description={descs[key]}
                              />
                            )}
                          />
                        );
                      })}
                      <Controller
                        name="arch.responseWindowSeconds"
                        control={control}
                        render={({ field }) => (
                          <div className="space-y-1.5">
                            <div className="flex items-end justify-between">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Response Window</label>
                              <span className="text-xs font-mono font-bold text-slate-300">{field.value}s</span>
                            </div>
                            <input
                              type="range" min="5" max="120" value={field.value}
                              onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                              className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-slate-800"
                              style={{ accentColor: "#94a3b8" }}
                            />
                            <p className="text-[9px] italic leading-tight text-slate-600">Max seconds before agent wraps and listens</p>
                          </div>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Reset + apply override toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/40 border border-slate-700/40">
                  <div className="flex items-center gap-3">
                    <Controller
                      name="applyDiscOverride"
                      control={control}
                      render={({ field }) => (
                        <button
                          type="button"
                          onClick={() => field.onChange(!field.value)}
                          className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${field.value ? "bg-indigo-500" : "bg-slate-700"}`}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${field.value ? "translate-x-4" : "translate-x-0.5"}`} />
                        </button>
                      )}
                    />
                    <div>
                      <p className="text-xs font-medium text-slate-300">Apply DISC/ARCH to Concierge agent</p>
                      <p className="text-[10px] text-slate-500">Patches primary agent post-provision</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={resetDiscArch}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Gateway defaults
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => setStep(1)} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <SovereignButton onClick={nextStep} endIcon={<ChevronRight className="w-4 h-4" />}>
                    Next: Knowledge
                  </SovereignButton>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Knowledge Domains + Confirm ──────────────────── */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                {/* Knowledge domains */}
                <div className="p-6 rounded-2xl bg-slate-900/60 border border-indigo-500/20 backdrop-blur-xl">
                  <div className="flex items-center gap-2 mb-5">
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                    <h2 className="text-sm font-bold text-white uppercase tracking-wide">Knowledge Domains</h2>
                  </div>
                  <Controller
                    name="knowledgeDomains"
                    control={control}
                    render={({ field }) => (
                      <div className="grid sm:grid-cols-2 gap-2.5">
                        {KNOWLEDGE_DOMAIN_OPTIONS.map((domain) => {
                          const checked = field.value.includes(domain.id);
                          return (
                            <button
                              key={domain.id}
                              type="button"
                              onClick={() => {
                                const next = checked
                                  ? field.value.filter((d: string) => d !== domain.id)
                                  : [...field.value, domain.id];
                                field.onChange(next);
                              }}
                              className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                                checked
                                  ? "bg-indigo-500/15 border-indigo-500/40"
                                  : "bg-slate-800/40 border-slate-700/40 hover:border-slate-600"
                              }`}
                            >
                              <div className={`w-4 h-4 rounded-sm flex-shrink-0 mt-0.5 border transition-colors ${checked ? "bg-indigo-500 border-indigo-500" : "border-slate-600"}`}>
                                {checked && <CheckCircle2 className="w-4 h-4 text-white" />}
                              </div>
                              <div>
                                <p className={`text-xs font-medium ${checked ? "text-indigo-200" : "text-slate-300"}`}>{domain.label}</p>
                                <p className="text-[10px] text-slate-500 leading-tight">{domain.description}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  />
                  {errors.knowledgeDomains && (
                    <p className="text-red-400 text-xs mt-2">{String(errors.knowledgeDomains.message)}</p>
                  )}
                </div>

                {/* Deployment summary */}
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-emerald-500/20 backdrop-blur-xl">
                  <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5" /> Deployment Summary
                  </h3>
                  <div className="space-y-1.5 text-xs text-slate-400">
                    <div className="flex justify-between"><span>Business</span><span className="text-white font-medium">{values.businessName || "—"}</span></div>
                    <div className="flex justify-between"><span>Vertical</span><span className="text-white font-medium">{INDUSTRY_VERTICAL_OPTIONS.find(v => v.placeType === values.placeType)?.label ?? values.placeType}</span></div>
                    <div className="flex justify-between"><span>Agents to create</span><span className="text-emerald-400 font-medium">6 (full swarm)</span></div>
                    <div className="flex justify-between"><span>DISC override</span><span className={values.applyDiscOverride ? "text-indigo-300" : "text-slate-500"}>{values.applyDiscOverride ? `D${values.disc.dominance} I${values.disc.influence} S${values.disc.steadiness} C${values.disc.conscientiousness}` : "Template defaults"}</span></div>
                    <div className="flex justify-between"><span>Knowledge domains</span><span className="text-indigo-300">{values.knowledgeDomains.length} selected</span></div>
                    <div className="flex justify-between"><span>Orchestration gate</span><span className="text-emerald-400">Required ✓</span></div>
                    <div className="flex justify-between"><span>Review required</span><span className="text-amber-400">Yes</span></div>
                  </div>
                </div>

                {/* Error display */}
                {provisionMutation.isError && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-300 leading-relaxed">
                      {(provisionMutation.error as Error)?.message ?? "Provision failed. Check the orchestration run log."}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => setStep(2)} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <SovereignButton
                    type="submit"
                    disabled={provisionMutation.isPending}
                    startIcon={provisionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                  >
                    {provisionMutation.isPending ? "Deploying swarm…" : "Deploy Agent Swarm"}
                  </SovereignButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>
    </div>
  );
}
