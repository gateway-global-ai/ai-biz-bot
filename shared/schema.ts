import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, jsonb, timestamp, numeric, index, pgEnum, uuid, serial, bigserial, doublePrecision, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import type { CharacterProfileV1, MergedCognitionContractV1 } from "./cognitionContract.js";
import type {
  ActionRequest,
  CheckRun,
  ExecutionPacket,
  FileTouch,
  OutcomePacket,
  PolicyContext,
} from "./intentExecutionPlane/contracts.js";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const telephonyConfigs = pgTable("telephony_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Twilio Account Credentials (per-deployment)
  accountSid: text("account_sid"),
  authToken: text("auth_token"),
  isSubAccount: boolean("is_sub_account").default(false),
  parentAccountSid: text("parent_account_sid"),
  // Phone Number Info
  phoneNumber: text("phone_number"),
  phoneSid: text("phone_sid"),
  friendlyName: text("friendly_name").default("AI Agent Trunk"),
  messagingServiceSid: text("messaging_service_sid"),
  // Webhook URLs
  voiceUrl: text("voice_url"),
  voiceFallbackUrl: text("voice_fallback_url"),
  statusCallbackUrl: text("status_callback_url"),
  smsUrl: text("sms_url"),
  smsFallbackUrl: text("sms_fallback_url"),
  errorUrl: text("error_url"),
  // Firewall Settings
  firewallEnabled: boolean("firewall_enabled").default(true),
  allowedNumbers: text("allowed_numbers").array().default(sql`ARRAY[]::text[]`),
  maxCallDuration: integer("max_call_duration").default(60),
  timeout: integer("timeout").default(30),
  callerIdName: text("caller_id_name"),
  // Owner Info
  ownerPhone: text("owner_phone"),
  ownerEmail: text("owner_email"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  /** Links this telephony config to the site/business it serves (for billing attribution). */
  siteConfigId: varchar("site_config_id"),
});

export const insertTelephonyConfigSchema = createInsertSchema(telephonyConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTelephonyConfig = z.infer<typeof insertTelephonyConfigSchema>;
export type TelephonyConfig = typeof telephonyConfigs.$inferSelect;

export const callLogs = pgTable("call_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  configId: varchar("config_id").references(() => telephonyConfigs.id),
  direction: text("direction").notNull(), // 'inbound' | 'outbound'
  phoneNumber: text("phone_number").notNull(),
  duration: integer("duration").default(0),
  status: text("status").notNull(), // 'completed' | 'missed' | 'blocked' | 'failed'
  recordingUrl: text("recording_url"),
  callSid: text("call_sid"),
  // Customer tracking fields
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  notes: text("notes"),
  timestamp: timestamp("timestamp").defaultNow(),
  /** Millisecond-precision call start time recorded when the Media Stream begins. */
  callStart: timestamp("call_start"),
  /** Millisecond-precision call end time recorded when the Media Stream stops. */
  callEnd: timestamp("call_end"),
  /** Actual call duration in seconds derived from callEnd - callStart (stopwatch). */
  actualSeconds: integer("actual_seconds"),
  /** The site/business this call belongs to – used for billing attribution. */
  siteConfigId: varchar("site_config_id"),
});

export const insertCallLogSchema = createInsertSchema(callLogs).omit({
  id: true,
  timestamp: true,
});

export type InsertCallLog = z.infer<typeof insertCallLogSchema>;
export type CallLog = typeof callLogs.$inferSelect;

export const twilioConfigSchema = z.object({
  friendlyName: z.string().optional(),
  phoneSid: z.string().optional(),
  messagingServiceSid: z.string().optional(),
  voiceUrl: z.string().optional(),
  voiceFallbackUrl: z.string().optional(),
  statusCallbackUrl: z.string().optional(),
  smsUrl: z.string().optional(),
  smsFallbackUrl: z.string().optional(),
  errorUrl: z.string().optional(),
});

export type TwilioConfigInput = z.infer<typeof twilioConfigSchema>;

export const availableNumberSchema = z.object({
  phoneNumber: z.string(),
  friendlyName: z.string(),
  locality: z.string().optional(),
  region: z.string().optional(),
  capabilities: z.object({
    voice: z.boolean(),
    sms: z.boolean(),
    mms: z.boolean(),
  }).optional(),
});

export type AvailableNumber = z.infer<typeof availableNumberSchema>;

// SMS Conversations for 30-day message history
export const smsConversations = pgTable("sms_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phoneNumber: text("phone_number").notNull(), // Caller's phone number
  customerId: varchar("customer_id").references(() => customers.id),
  agentId: varchar("agent_id").references(() => agents.id),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSmsConversationSchema = createInsertSchema(smsConversations).omit({
  id: true,
  createdAt: true,
});

export type InsertSmsConversation = z.infer<typeof insertSmsConversationSchema>;
export type SmsConversation = typeof smsConversations.$inferSelect;

// SMS Messages within conversations
export const smsMessages = pgTable("sms_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").references(() => smsConversations.id).notNull(),
  direction: text("direction").notNull(), // 'inbound' | 'outbound'
  body: text("body").notNull(),
  fromNumber: text("from_number").notNull(),
  toNumber: text("to_number").notNull(),
  messageSid: text("message_sid"),
  status: text("status").default("received"), // received, sent, delivered, failed
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertSmsMessageSchema = createInsertSchema(smsMessages).omit({
  id: true,
  timestamp: true,
});

export type InsertSmsMessage = z.infer<typeof insertSmsMessageSchema>;
export type SmsMessage = typeof smsMessages.$inferSelect;

// SMS Delivery Status tracking for failures and debugging
export const smsDeliveryStatus = pgTable("sms_delivery_status", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageSid: text("message_sid").notNull(),
  status: text("status").notNull(), // queued, sending, sent, delivered, undelivered, failed
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  fromNumber: text("from_number"),
  toNumber: text("to_number"),
  retryCount: integer("retry_count").default(0),
  lastRetryAt: timestamp("last_retry_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSmsDeliveryStatusSchema = createInsertSchema(smsDeliveryStatus).omit({
  id: true,
  createdAt: true,
});

export type InsertSmsDeliveryStatus = z.infer<typeof insertSmsDeliveryStatusSchema>;
export type SmsDeliveryStatus = typeof smsDeliveryStatus.$inferSelect;

// DISC Profile Types
export interface DiscScores {
  dominance: number;
  influence: number;
  steadiness: number;
  conscientiousness: number;
}

export interface ArchProfile {
  acknowledge: number;
  reflect: number;
  context: number;
  handoff: number;
}

export interface SystemPromptSections {
  ownerIdentity: string;
  loyaltyStatement: string;
  ownerPriorities: string;
  dataProtectionMantra: string;
  securityStatement: string;
  discReinforcement: string;
}

export interface SystemPrompt {
  id: string;
  name: string;
  description: string;
  lastModified: string;
  sections: SystemPromptSections;
}

export interface DiscProfile {
  name: string;
  role: string;
  scores: DiscScores;
}

// Server types for NEXUSCMD
export interface Server {
  id: string;
  name: string;
  region: string;
  status: 'online' | 'offline' | 'maintenance' | 'busy';
  cpuUsage: number;
  memoryUsage: number;
  ip: string;
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  status: 'idle' | 'running' | 'passed' | 'failed';
  lastRun: string;
  duration: string;
}

export interface SecurityAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  description: string;
  detectedAt: string;
}

export interface CommunicationLog {
  id: string;
  type: 'sms' | 'voice';
  direction: 'inbound' | 'outbound';
  from: string;
  to: string;
  status: 'sent' | 'received' | 'failed';
  timestamp: string;
  sid: string;
}

// DISC Assessment Types
export interface DiscWordSet {
  setNumber: number;
  words: [string, string, string, string]; // [D, I, S, C]
}

export interface DiscRanking {
  setNumber: number;
  rankings: [number, number, number, number]; // Rankings 1-4 for each word
}

export interface DiscAssessmentResult {
  scores: DiscScores;
  percentages: DiscScores;
  primaryStyle: 'D' | 'I' | 'S' | 'C';
  secondaryStyle: 'D' | 'I' | 'S' | 'C';
  styleDescriptions: {
    D: string;
    I: string;
    S: string;
    C: string;
  };
}

export const DISC_WORD_SETS: DiscWordSet[] = [
  { setNumber: 1, words: ['Competitive', 'Convincing', 'Cooperative', 'Cautious'] },
  { setNumber: 2, words: ['Determined', 'Dramatic', 'Dependable', 'Detailed'] },
  { setNumber: 3, words: ['Adventurous', 'Animated', 'Accommodating', 'Analytical'] },
  { setNumber: 4, words: ['Decisive', 'Emotional', 'Patient', 'Precise'] },
  { setNumber: 5, words: ['Bold', 'Charming', 'Loyal', 'Correct'] },
  { setNumber: 6, words: ['Firm', 'Lively', 'Even-tempered', 'Systematic'] },
  { setNumber: 7, words: ['Assertive', 'Inspirational', 'Good-natured', 'Orderly'] },
  { setNumber: 8, words: ['Risk-taking', 'Talkative', 'Team player', 'Perfectionist'] },
  { setNumber: 9, words: ['Direct', 'Sociable', 'Supportive', 'Careful'] },
  { setNumber: 10, words: ['Forceful', 'Enthusiastic', 'Agreeable', 'Conscientious'] },
  { setNumber: 11, words: ['Vigorous', 'Spontaneous', 'Relaxed', 'Meticulous'] },
  { setNumber: 12, words: ['Driver', 'Expressive', 'Stable', 'Accurate'] },
  { setNumber: 13, words: ['Strong-willed', 'Persuasive', 'Consistent', 'Thoughtful'] },
  { setNumber: 14, words: ['Independent', 'Playful', 'Pleasant', 'Logical'] },
  { setNumber: 15, words: ['Go-getter', 'Cheerful', 'Even-paced', 'Thorough'] },
  { setNumber: 16, words: ['Dynamic', 'Optimistic', 'Satisfied', 'Controlled'] },
  { setNumber: 17, words: ['Tenacious', 'Popular', 'Modest', 'Exact'] },
  { setNumber: 18, words: ['Aggressive', 'Demonstrative', 'Calm', 'Conventional'] },
  { setNumber: 19, words: ['Self-reliant', 'Gregarious', 'Devoted', 'Critical'] },
  { setNumber: 20, words: ['Enterprising', 'Magnetic', 'Steady', 'Factual'] },
  { setNumber: 21, words: ['Resolute', 'Warm', 'Peaceful', 'Procedural'] },
  { setNumber: 22, words: ['Daredevil', 'Vivacious', 'Mild', 'Traditional'] },
  { setNumber: 23, words: ['Authoritative', 'Friendly', 'Soft-hearted', 'Methodical'] },
  { setNumber: 24, words: ['Challenging', 'Impulsive', 'Tolerant', 'Detail-oriented'] },
];

export const DISC_STYLE_DESCRIPTIONS = {
  D: 'Direct, results-oriented, assertive, competitive',
  I: 'Social, enthusiastic, persuasive, optimistic',
  S: 'Patient, cooperative, reliable, calm',
  C: 'Analytical, precise, systematic, careful',
};

// AI Model Provider types
export type AIModelProvider = "gemini";

export interface AIModelSettings {
  provider: AIModelProvider;
  modelId: string;
  temperature: number;
  maxTokens: number;
}

/** Binding from registry swarm schematic (e.g. HOSPITALITY_SWARM_SCHEMATIC_V1.md). */
export type SwarmRoleContractV1 = {
  schematic_id: string;
  bundle_version: string;
  role_type: string;
  integration_capability_set_ids: string[];
  deploy_posture?: string;
  api_version_lane?: string;
};

/** Structured controls on agent: mirroring + guardrails (always, never, believe). */
export type StructuredControls = {
  mirroring?: { enabled?: boolean; intensity?: number };
  guardrails?: { always?: string[]; never?: string[]; believe?: string[] };
  swarm_role_contract?: SwarmRoleContractV1;
};

/** User-directed guardrails at site level; merged with agent.structuredControls at compile time. */
export type StructuredGuardrails = {
  always?: string[];
  never?: string[];
  believe?: string[];
};

// ── Agent classification v1 — blueprints & swarm schematics (see AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.md)
export const agentTemplates = pgTable("agent_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  templateKey: text("template_key").notNull().unique(),
  name: text("name").notNull(),
  primaryActorClass: text("primary_actor_class").notNull(),
  secondaryActorClasses: jsonb("secondary_actor_classes").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  primaryStageClass: text("primary_stage_class").notNull(),
  secondaryStageClasses: jsonb("secondary_stage_classes").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  defaultOperationalMode: text("default_operational_mode").notNull(),
  defaultCapabilitySetIds: jsonb("default_capability_set_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  defaultSkillIds: jsonb("default_skill_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  resourceProfileId: text("resource_profile_id"),
  deploymentContractId: text("deployment_contract_id"),
  /** Classification-level cognition defaults (AGENT_BEHAVIOR_SPEC_V1). */
  characterProfile: jsonb("character_profile").$type<CharacterProfileV1 | null>(),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const swarmSchematics = pgTable("swarm_schematics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  schematicKey: text("schematic_key").notNull().unique(),
  name: text("name").notNull(),
  industryGroup: text("industry_group").notNull(),
  minAgents: integer("min_agents").notNull().default(1),
  defaultAgents: integer("default_agents").notNull().default(4),
  maxAgents: integer("max_agents").notNull().default(12),
  hardMaxAgents: integer("hard_max_agents").notNull().default(24),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const swarmSchematicMembers = pgTable(
  "swarm_schematic_members",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    swarmSchematicId: uuid("swarm_schematic_id")
      .references(() => swarmSchematics.id, { onDelete: "cascade" })
      .notNull(),
    roleKey: text("role_key").notNull(),
    name: text("name").notNull(),
    agentTemplateId: uuid("agent_template_id")
      .references(() => agentTemplates.id, { onDelete: "restrict" })
      .notNull(),
    primaryActorClass: text("primary_actor_class").notNull(),
    secondaryActorClasses: jsonb("secondary_actor_classes").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    primaryStageClass: text("primary_stage_class").notNull(),
    secondaryStageClasses: jsonb("secondary_stage_classes").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    defaultOperationalMode: text("default_operational_mode").notNull(),
    capabilitySetIds: jsonb("capability_set_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    skillIds: jsonb("skill_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    requiredProbeIds: jsonb("required_probe_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    deployPosture: text("deploy_posture").notNull().default("draft"),
    positionIndex: integer("position_index").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("swarm_schematic_members_schematic_role").on(t.swarmSchematicId, t.roleKey)],
);

export type AgentTemplateRow = typeof agentTemplates.$inferSelect;
export type SwarmSchematicRow = typeof swarmSchematics.$inferSelect;
export type SwarmSchematicMemberRow = typeof swarmSchematicMembers.$inferSelect;

// AI Agents table
export const agents = pgTable("agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  siteConfigId: varchar("site_config_id").references(() => siteConfigs.id, { onDelete: "set null" }),
  roleType: text("role_type"), // concierge, booking_coordinator, lead_qualifier, retention_empath, billing_analyst, gatekeeper
  name: text("name").notNull(),
  voiceId: text("voice_id").notNull(),
  voiceName: text("voice_name").notNull(),
  status: text("status").notNull().default("active"), // active, paused, inactive
  /** Agent visibility: private | internal | public (who may interact with this agent in the OS). */
  visibility: text("visibility").default("private"),
  dominance: integer("dominance").default(50),
  influence: integer("influence").default(50),
  steadiness: integer("steadiness").default(50),
  conscientiousness: integer("conscientiousness").default(50),
  avatarId: text("avatar_id").default("avatar1"), // character avatar for chat backdrop
  systemPrompt: text("system_prompt"),
  // Agent-specific telephony
  phoneNumber: text("phone_number"),
  phoneSid: text("phone_sid"),
  // AI Model Configuration (Model Monoculture: runtime uses process.env.GEMINI_MODEL_ID)
  aiModelProvider: text("ai_model_provider").default("gemini"), // gemini only; set in Doppler
  aiModelId: text("ai_model_id").default(""), // empty = use process.env.GEMINI_MODEL_ID at runtime
  aiTemperature: integer("ai_temperature").default(60), // Stored as 0-100, divide by 100 for actual value
  aiMaxTokens: integer("ai_max_tokens").default(4096),
  hfToken: text("hf_token"), // User's HuggingFace token (encrypted)
  // Voice AI Configuration (Google Gemini)
  voiceModel: text("voice_model").default(process.env.GEMINI_MODEL_ID ?? ""), // Gemini model for voice; runtime must use process.env.GEMINI_MODEL_ID from Doppler
  voiceRole: text("voice_role").default("AI Business Assistant"),
  voiceCompanyName: text("voice_company_name").default("AI Biz Bot"),
  voicePersona: text("voice_persona").default("friendly"), // professional, friendly, enthusiastic, calm, authoritative
  defaultEmotion: text("default_emotion"), // calm | engaged | focused | energized | empathetic — Live Emotion Control
  // Budget Configuration
  budgetAmountUsd: numeric("budget_amount_usd", { precision: 10, scale: 2 }).default("0"),
  budgetPeriod: text("budget_period").default("monthly"), // daily, weekly, monthly
  budgetSpentUsd: numeric("budget_spent_usd", { precision: 10, scale: 2 }).default("0"),
  budgetResetAt: timestamp("budget_reset_at"),
  // Character Engine — Three-Layer Behavioral System
  // Layer 1: Character (who the agent IS)
  shortTermMemory: jsonb("short_term_memory"), // { specialty, focus, method, differentiator, discAnalysis, archBehavior }
  longTermMemory: jsonb("long_term_memory"),   // { dominantTrait, years, originStory, unbreakableRule, ruleReason, primaryIntent, happySeeing, sadSeeing, priorityOverMoney, philosophyPeople, philosophyLife, philosophyToday }
  // Layer 3: Conversation Mechanics (how the agent structures dialogue)
  archProfile: jsonb("arch_profile"),          // { acknowledge, reflect, context, handoff } — 0-100 each
  /** Structured controls: mirroring (enabled, intensity 0–100) and guardrails (always, never, believe). */
  structuredControls: jsonb("structured_controls").$type<StructuredControls>().default({}),
  /** Materialized merged cognition + provenance after provisioning (CLASSIFICATION_GOVERNANCE_SPEC_V1). */
  mergedCognitionContract: jsonb("merged_cognition_contract").$type<MergedCognitionContractV1 | null>(),
  /** Operational mode: SAFE | CONCIERGE | RECEPTIONIST | SALES | CASHIER | CUSTOMER_SUPPORT | MANAGER | RESEARCH | CODING | REVIEW | EMERGENCY | CUSTOMER_SERVICE. Drives prompt directive and tool allowlist. */
  operationalMode: text("operational_mode").default("SAFE"),
  /** For CUSTOMER_SUPPORT mode: required verification level (e.g. OTP, magic_link). */
  verificationLevel: text("verification_level"),
  /** When true, ARCH sliders are overridden server-side by the mode's hardcoded archOverride.
   *  Enforced in promptCompiler — the agent cannot drift from its configured behavioral posture. */
  noDriftMode: boolean("no_drift_mode").default(false),
  // Startup Script
  startupScript: text("startup_script"),
  startupBudgetUsd: numeric("startup_budget_usd", { precision: 10, scale: 2 }).default("0"),
  startupStatus: text("startup_status").default("pending"), // pending, running, completed, failed
  startupResultSummary: text("startup_result_summary"),
  startupLastRunAt: timestamp("startup_last_run_at"),
  /** Platform blueprint (agent classification v1). */
  agentTemplateId: uuid("agent_template_id").references(() => agentTemplates.id, { onDelete: "set null" }),
  swarmSchematicMemberId: uuid("swarm_schematic_member_id").references(() => swarmSchematicMembers.id, {
    onDelete: "set null",
  }),
  primaryActorClass: text("primary_actor_class"),
  secondaryActorClasses: jsonb("secondary_actor_classes").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  primaryStageClass: text("primary_stage_class"),
  secondaryStageClasses: jsonb("secondary_stage_classes").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  /**
   * Classification deployment gate: legacy = pre-classification rows;
   * active_deployable | draft | simulation_only | disabled_overflow per AGENT_CLASSIFICATION_AND_SWARM_LIMITS_V1.
   */
  deploymentStatus: text("deployment_status").notNull().default("legacy"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/** Control-plane orchestration run memory (swarm provision, gates, failures). */
export const agentOrchestrationRuns = pgTable("agent_orchestration_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  siteConfigId: varchar("site_config_id")
    .references(() => siteConfigs.id, { onDelete: "cascade" })
    .notNull(),
  agentId: varchar("agent_id").references(() => agents.id, { onDelete: "set null" }),
  currentState: text("current_state").notNull().default("init"),
  step: text("step").notNull().default("orchestrator"),
  /** Closed set: in_progress | blocked | failed | deferred | completed (see shared/agentOrchestrationConstants.ts) */
  status: text("status").notNull().default("in_progress"),
  blockers: jsonb("blockers").notNull().default(sql`'[]'::jsonb`),
  failureRefs: jsonb("failure_refs").notNull().default(sql`'[]'::jsonb`),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  aptitudeStatus: text("aptitude_status").notNull().default("deferred"),
  requiredForDeploy: boolean("required_for_deploy").notNull().default(false),
  clarityScore: integer("clarity_score"),
  configurationCompleteness: integer("configuration_completeness"),
  fallbackDefined: boolean("fallback_defined"),
  firstValuePathPresent: boolean("first_value_path_present"),
  /** Local agent plane audit columns (migration 0068) */
  rawModelOutput: text("raw_model_output"),
  parseError: text("parse_error"),
  filesTouchedJson: jsonb("files_touched_json").notNull().default(sql`'[]'::jsonb`),
  reviewRequired: boolean("review_required").notNull().default(true),
  violationReason: text("violation_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/** Persisted orchestration violations (telemetry; distinct violation_type). */
export const orchestrationViolations = pgTable("orchestration_violations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orchestrationRunId: varchar("orchestration_run_id").references(() => agentOrchestrationRuns.id, {
    onDelete: "set null",
  }),
  siteConfigId: varchar("site_config_id").references(() => siteConfigs.id, { onDelete: "set null" }),
  severity: text("severity").notNull(),
  violationType: text("violation_type").notNull(),
  routeOrSource: text("route_or_source"),
  actorHint: text("actor_hint"),
  detail: jsonb("detail").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Intent-driven coding execution plane ──────────────────────────────────────

export const workItems = pgTable("work_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  siteConfigId: varchar("site_config_id").references(() => siteConfigs.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  requestedBy: text("requested_by"),
  status: text("status").notNull().default("queued"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("work_items_site_idx").on(t.siteConfigId),
  index("work_items_status_idx").on(t.status),
]);

export const intentExecutions = pgTable("intent_executions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workItemId: varchar("work_item_id").references(() => workItems.id, { onDelete: "cascade" }).notNull(),
  siteConfigId: varchar("site_config_id").references(() => siteConfigs.id, { onDelete: "set null" }),
  orchestrationRunId: varchar("orchestration_run_id").references(() => agentOrchestrationRuns.id, {
    onDelete: "set null",
  }),
  intentKey: text("intent_key").notNull(),
  intentInput: jsonb("intent_input").notNull().default(sql`'{}'::jsonb`),
  state: text("state").notNull().default("planning"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("intent_executions_work_item_idx").on(t.workItemId),
  index("intent_executions_site_idx").on(t.siteConfigId),
  index("intent_executions_state_idx").on(t.state),
]);

export const scopeExecutions = pgTable("scope_executions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  intentExecutionId: varchar("intent_execution_id")
    .references(() => intentExecutions.id, { onDelete: "cascade" })
    .notNull(),
  scopeKey: text("scope_key").notNull(),
  state: text("state").notNull().default("queued"),
  assignedAgentRoleType: text("assigned_agent_role_type"),
  scopePlan: jsonb("scope_plan").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("scope_executions_intent_idx").on(t.intentExecutionId),
  uniqueIndex("scope_executions_unique_scope").on(t.intentExecutionId, t.scopeKey),
]);

export const skillBindings = pgTable("skill_bindings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scopeExecutionId: varchar("scope_execution_id")
    .references(() => scopeExecutions.id, { onDelete: "cascade" })
    .notNull(),
  skillKey: text("skill_key").notNull(),
  skillConfig: jsonb("skill_config").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("skill_bindings_scope_idx").on(t.scopeExecutionId),
  uniqueIndex("skill_bindings_unique_skill").on(t.scopeExecutionId, t.skillKey),
]);

export const executionPackets = pgTable("execution_packets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  intentExecutionId: varchar("intent_execution_id")
    .references(() => intentExecutions.id, { onDelete: "cascade" })
    .notNull(),
  scopeExecutionId: varchar("scope_execution_id").references(() => scopeExecutions.id, { onDelete: "set null" }),
  repoRef: text("repo_ref").notNull(),
  baseBranch: text("base_branch").notNull(),
  featureBranch: text("feature_branch").notNull(),
  worktreePath: text("worktree_path"),
  policyContext: jsonb("policy_context").$type<PolicyContext>().notNull().default(sql`'{}'::jsonb`),
  requiredChecks: jsonb("required_checks").notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("execution_packets_intent_idx").on(t.intentExecutionId),
  index("execution_packets_scope_idx").on(t.scopeExecutionId),
]);

export const actionRuns = pgTable("action_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scopeExecutionId: varchar("scope_execution_id")
    .references(() => scopeExecutions.id, { onDelete: "cascade" })
    .notNull(),
  skillBindingId: varchar("skill_binding_id").references(() => skillBindings.id, { onDelete: "set null" }),
  orchestrationRunId: varchar("orchestration_run_id").references(() => agentOrchestrationRuns.id, {
    onDelete: "set null",
  }),
  agentId: varchar("agent_id").references(() => agents.id, { onDelete: "set null" }),
  actionKey: text("action_key").notNull(),
  state: text("state").notNull().default("queued"),
  actionInput: jsonb("action_input").$type<ActionRequest>().notNull().default(sql`'{}'::jsonb`),
  actionOutput: jsonb("action_output").notNull().default(sql`'{}'::jsonb`),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("action_runs_scope_idx").on(t.scopeExecutionId),
  index("action_runs_state_idx").on(t.state),
  index("action_runs_orchestration_idx").on(t.orchestrationRunId),
]);

export const evidenceArtifacts = pgTable("evidence_artifacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actionRunId: varchar("action_run_id").references(() => actionRuns.id, { onDelete: "cascade" }).notNull(),
  kind: text("kind").notNull(),
  uri: text("uri").notNull(),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("evidence_artifacts_action_idx").on(t.actionRunId),
]);

export const outcomePackets = pgTable("outcome_packets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  intentExecutionId: varchar("intent_execution_id")
    .references(() => intentExecutions.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  summary: jsonb("summary").notNull().default(sql`'{}'::jsonb`),
  filesTouched: jsonb("files_touched").$type<FileTouch[]>().notNull().default(sql`'[]'::jsonb`),
  domainsTouched: jsonb("domains_touched").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  checksRun: jsonb("checks_run").$type<CheckRun[]>().notNull().default(sql`'[]'::jsonb`),
  risks: jsonb("risks").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  reviewReady: boolean("review_ready").notNull().default(false),
  requiredGates: jsonb("required_gates").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("outcome_packets_intent_idx").on(t.intentExecutionId),
  index("outcome_packets_review_ready_idx").on(t.reviewReady),
]);

export const reviewGates = pgTable("review_gates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  outcomePacketId: varchar("outcome_packet_id")
    .references(() => outcomePackets.id, { onDelete: "cascade" })
    .notNull(),
  gateKey: text("gate_key").notNull(),
  state: text("state").notNull().default("pending"),
  requirements: jsonb("requirements").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("review_gates_outcome_idx").on(t.outcomePacketId),
  uniqueIndex("review_gates_unique_gate").on(t.outcomePacketId, t.gateKey),
]);

export const pullRequestLinks = pgTable("pull_request_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  intentExecutionId: varchar("intent_execution_id")
    .references(() => intentExecutions.id, { onDelete: "cascade" })
    .notNull(),
  provider: text("provider").notNull().default("github"),
  repo: text("repo").notNull(),
  prNumber: integer("pr_number"),
  prUrl: text("pr_url"),
  branchName: text("branch_name"),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("pull_request_links_intent_idx").on(t.intentExecutionId),
]);

export const insertWorkItemSchema = createInsertSchema(workItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIntentExecutionSchema = createInsertSchema(intentExecutions).omit({
  id: true,
  startedAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScopeExecutionSchema = createInsertSchema(scopeExecutions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSkillBindingSchema = createInsertSchema(skillBindings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExecutionPacketSchema = createInsertSchema(executionPackets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertActionRunSchema = createInsertSchema(actionRuns).omit({
  id: true,
  startedAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEvidenceArtifactSchema = createInsertSchema(evidenceArtifacts).omit({
  id: true,
  createdAt: true,
});

export const insertOutcomePacketSchema = createInsertSchema(outcomePackets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReviewGateSchema = createInsertSchema(reviewGates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPullRequestLinkSchema = createInsertSchema(pullRequestLinks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWorkItem = z.infer<typeof insertWorkItemSchema>;
export type WorkItemRow = typeof workItems.$inferSelect;
export type InsertIntentExecution = z.infer<typeof insertIntentExecutionSchema>;
export type IntentExecutionRow = typeof intentExecutions.$inferSelect;
export type InsertScopeExecution = z.infer<typeof insertScopeExecutionSchema>;
export type ScopeExecutionRow = typeof scopeExecutions.$inferSelect;
export type InsertSkillBinding = z.infer<typeof insertSkillBindingSchema>;
export type SkillBindingRow = typeof skillBindings.$inferSelect;
export type InsertExecutionPacket = z.infer<typeof insertExecutionPacketSchema>;
export type ExecutionPacketRow = typeof executionPackets.$inferSelect;
export type InsertActionRun = z.infer<typeof insertActionRunSchema>;
export type ActionRunRow = typeof actionRuns.$inferSelect;
export type InsertEvidenceArtifact = z.infer<typeof insertEvidenceArtifactSchema>;
export type EvidenceArtifactRow = typeof evidenceArtifacts.$inferSelect;
export type InsertOutcomePacket = z.infer<typeof insertOutcomePacketSchema>;
export type OutcomePacketRow = typeof outcomePackets.$inferSelect;
export type InsertReviewGate = z.infer<typeof insertReviewGateSchema>;
export type ReviewGateRow = typeof reviewGates.$inferSelect;
export type InsertPullRequestLink = z.infer<typeof insertPullRequestLinkSchema>;
export type PullRequestLinkRow = typeof pullRequestLinks.$inferSelect;

export const insertAgentSchema = createInsertSchema(agents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;

// Association Master UUID (e.g. LVR/GLVAR) — groups customers/brands under one parent
export const associations = pgTable("associations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  shortCode: text("short_code").notNull().unique(),
  mlsCode: text("mls_code"),
  sponsorBilling: boolean("sponsor_billing").default(false),
  sponsorLimit: integer("sponsor_limit"),
  defaultPersona: text("default_persona").default("real_estate_sovereign"),
  defaultIndustry: text("default_industry").default("real_estate"),
  contactEmail: text("contact_email"),
  website: text("website"),
  masterBrandSid: text("master_brand_sid"),
  masterEin: text("master_ein"),
  allowedIpRanges: text("allowed_ip_ranges").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customers/Leads table
export const customers = pgTable(
  "customers",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    company: text("company"),
    city: text("city"),
    state: text("state"),
    country: text("country"),
    source: text("source"), // where the lead came from
    status: text("status").notNull().default("new"), // new, contacted, qualified, converted, lost
    notes: text("notes"),
    stripeCustomerId: text("stripe_customer_id"),
    subscriptionId: text("subscription_id"),
    subscriptionStatus: text("subscription_status").default("none"),
    agentId: varchar("agent_id").references(() => agents.id),
    associationId: uuid("association_id").references(() => associations.id),
    lastContactAt: timestamp("last_contact_at"),
    followUpAt: timestamp("follow_up_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("idx_customers_association_id").on(table.associationId)]
);

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

// ── Resellers (Digital Franchise) ─────────────────────────────────────────────
// Self-referential hierarchy: a reseller can have a parent (sub-reseller model).
// commission_rate stored as decimal 0–1, e.g. 0.10 = 10%.
// stripe_account_id = Stripe Connect Express account for automated payouts.
export const resellers = pgTable("resellers", {
  id:               varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentResellerId: varchar("parent_reseller_id").references((): any => resellers.id, { onDelete: "set null" }),
  stripeAccountId:  text("stripe_account_id"),
  commissionRate:   numeric("commission_rate", { precision: 5, scale: 4 }).notNull().default("0.10"),
  name:             text("name"),
  email:            text("email"),
  phone:            text("phone"),
  createdAt:        timestamp("created_at").defaultNow().notNull(),
  updatedAt:        timestamp("updated_at").defaultNow().notNull(),
});

export const insertResellerSchema = createInsertSchema(resellers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertReseller = z.infer<typeof insertResellerSchema>;
export type Reseller = typeof resellers.$inferSelect;

// Admin users for OTP authentication
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone").notNull().unique(),
  name: text("name"),
  role: text("role").default("admin"), // admin, superadmin
  resellerId: varchar("reseller_id").references(() => resellers.id),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
  lastLoginAt: true,
});

export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;

// OTP codes for authentication
export const otpCodes = pgTable("otp_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOtpCodeSchema = createInsertSchema(otpCodes).omit({
  id: true,
  createdAt: true,
});

export type InsertOtpCode = z.infer<typeof insertOtpCodeSchema>;
export type OtpCode = typeof otpCodes.$inferSelect;

// Auth session for tracking logged in users
export const authSessions = pgTable("auth_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminUserId: varchar("admin_user_id").references(() => adminUsers.id).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAuthSessionSchema = createInsertSchema(authSessions).omit({
  id: true,
  createdAt: true,
});

export type InsertAuthSession = z.infer<typeof insertAuthSessionSchema>;
export type AuthSession = typeof authSessions.$inferSelect;

// Investor report access (migration 0019): view tracking + session for SMS-gated report
export const investorReportViews = pgTable("investor_report_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone").notNull(),
  viewedAt: timestamp("viewed_at").defaultNow().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

export const insertInvestorReportViewSchema = createInsertSchema(investorReportViews).omit({
  id: true,
  viewedAt: true,
});

export type InsertInvestorReportView = z.infer<typeof insertInvestorReportViewSchema>;
export type InvestorReportView = typeof investorReportViews.$inferSelect;

export const investorReportSessions = pgTable("investor_report_sessions", {
  token: varchar("token").primaryKey(),
  phone: text("phone").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInvestorReportSessionSchema = createInsertSchema(investorReportSessions).omit({
  createdAt: true,
});

export type InsertInvestorReportSession = z.infer<typeof insertInvestorReportSessionSchema>;
export type InvestorReportSession = typeof investorReportSessions.$inferSelect;

// Pitch decks — deep research / market-fit presentations (The Joint, etc.)
export const pitchDecks = pgTable("pitch_decks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug").notNull().unique(),
  title: text("title").notNull(),
  businessName: text("business_name").notNull(),
  category: text("category").notNull(),
  industry: text("industry").notNull(),
  content: jsonb("content").notNull().default({ slides: [] }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPitchDeckSchema = createInsertSchema(pitchDecks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPitchDeck = z.infer<typeof insertPitchDeckSchema>;
export type PitchDeck = typeof pitchDecks.$inferSelect;

// NOVA Sovereign IDV sessions — constitution: .system_design/nova_sovereign_ruleset_v1.yaml
export const novaIdvSessions = pgTable("nova_idv_sessions", {
  sessionId: uuid("session_id").primaryKey(),
  businessId: uuid("business_id").notNull(),
  clientPhone: text("client_phone"),
  clientEmail: text("client_email"),
  protocolLevel: integer("protocol_level").notNull(),
  otpVerified: boolean("otp_verified").default(false),
  magicLinkVerified: boolean("magic_link_verified").default(false),
  biometricVerified: boolean("biometric_verified").default(false),
  idVerified: boolean("id_verified").default(false),
  signatureUrl: text("signature_url"),
  invoiceId: uuid("invoice_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type NovaIdvSession = typeof novaIdvSessions.$inferSelect;
export type InsertNovaIdvSession = typeof novaIdvSessions.$inferInsert;

// Demo leads for business website onboarding flow
export const demoLeads = pgTable("demo_leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone").notNull(),
  name: text("name"),
  businessName: text("business_name").notNull(),
  businessAddress: text("business_address"),
  placeId: text("place_id"),
  placeData: jsonb("place_data"),
  magicToken: text("magic_token").notNull().unique(),
  magicTokenExpiresAt: timestamp("magic_token_expires_at").notNull(),
  magicTokenUsed: boolean("magic_token_used").default(false),
  demoStartedAt: timestamp("demo_started_at"),
  demoReadyAt: timestamp("demo_ready_at"),
  status: text("status").notNull().default("pending"), // pending, preview, training, ready, expired
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDemoLeadSchema = createInsertSchema(demoLeads).omit({
  id: true,
  createdAt: true,
});

export type InsertDemoLead = z.infer<typeof insertDemoLeadSchema>;
export type DemoLead = typeof demoLeads.$inferSelect;

// Affiliate / Reseller program signups (phone → registration link; name/email for checkout)
export const affiliateSignups = pgTable("affiliate_signups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone").notNull(),
  name: text("name"),
  email: text("email"),
  source: text("source").default("landing"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAffiliateSignupSchema = createInsertSchema(affiliateSignups).omit({
  id: true,
  createdAt: true,
});

export type InsertAffiliateSignup = z.infer<typeof insertAffiliateSignupSchema>;
export type AffiliateSignup = typeof affiliateSignups.$inferSelect;

// Twilio Sub-Accounts for multi-tenant phone number management
export const twilioSubAccounts = pgTable("twilio_sub_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountSid: text("account_sid").notNull().unique(), // Twilio sub-account SID
  authToken: text("auth_token").notNull(), // Sub-account auth token
  friendlyName: text("friendly_name").notNull(),
  status: text("status").default("active"), // active, suspended, closed
  ownerEmail: text("owner_email"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTwilioSubAccountSchema = createInsertSchema(twilioSubAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTwilioSubAccount = z.infer<typeof insertTwilioSubAccountSchema>;
export type TwilioSubAccount = typeof twilioSubAccounts.$inferSelect;

// Per-agent phone number assignments (1 number per agent, max 10 per site)
export const agentPhoneAssignments = pgTable("agent_phone_assignments", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  siteConfigId: text("site_config_id").notNull().references(() => siteConfigs.id, { onDelete: "cascade" }),
  agentId: text("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  phoneNumber: text("phone_number").notNull(),
  phoneSid: text("phone_sid").notNull(),
  subAccountSid: text("sub_account_sid"),
  friendlyName: text("friendly_name"),
  voiceUrl: text("voice_url"),
  smsUrl: text("sms_url"),
  isPrimary: boolean("is_primary").notNull().default(false),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  releasedAt: timestamp("released_at"),
  releasedBy: text("released_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAgentPhoneAssignmentSchema = createInsertSchema(agentPhoneAssignments).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type AgentPhoneAssignment = typeof agentPhoneAssignments.$inferSelect;
export type InsertAgentPhoneAssignment = z.infer<typeof insertAgentPhoneAssignmentSchema>;

// Platform-managed number pool (admin provisions from master account, assigns to businesses)
export const platformNumberPool = pgTable("platform_number_pool", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  phoneNumber: text("phone_number").notNull().unique(),
  phoneSid: text("phone_sid").notNull().unique(),
  areaCode: text("area_code"),
  friendlyName: text("friendly_name"),
  region: text("region"),
  locality: text("locality"),
  accountSid: text("account_sid").notNull(),
  status: text("status").notNull().default("available"), // available | assigned | reserved
  assignedToSiteConfigId: text("assigned_to_site_config_id").references(() => siteConfigs.id, { onDelete: "set null" }),
  assignedToAgentId: text("assigned_to_agent_id").references(() => agents.id, { onDelete: "set null" }),
  assignedAt: timestamp("assigned_at"),
  voiceUrl: text("voice_url"),
  smsUrl: text("sms_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPlatformNumberPoolSchema = createInsertSchema(platformNumberPool).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type PlatformNumberPool = typeof platformNumberPool.$inferSelect;
export type InsertPlatformNumberPool = z.infer<typeof insertPlatformNumberPoolSchema>;

// Platform Products & Services catalog — per-site, Stripe-synced
export const platformProducts = pgTable("platform_products", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  siteConfigId: text("site_config_id").notNull().references(() => siteConfigs.id, { onDelete: "cascade" }),
  agentId: text("agent_id").references(() => agents.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull().default("service"), // 'product' | 'service' | 'subscription'
  priceCents: integer("price_cents").notNull().default(0),
  billingInterval: text("billing_interval"), // 'month' | 'year' | null (one-time)
  stripeProductId: text("stripe_product_id"),
  stripePriceId: text("stripe_price_id"),
  imageUrl: text("image_url"), // local path or CDN URL for product image
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPlatformProductSchema = createInsertSchema(platformProducts).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type PlatformProduct = typeof platformProducts.$inferSelect;
export type InsertPlatformProduct = z.infer<typeof insertPlatformProductSchema>;

// A2P 10-DLC Compliance - Brand Registration
export const a2pBrands = pgTable("a2p_brands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").references(() => customers.id),
  associationId: uuid("association_id").references(() => associations.id),
  // Twilio Brand Registration SID
  brandSid: text("brand_sid"),
  brandStatus: text("brand_status").default("pending"), // pending, approved, rejected, failed
  // Company Information
  companyName: text("company_name").notNull(),
  country: text("country").default("US"),
  taxId: text("tax_id"), // EIN for US companies
  website: text("website"),
  vertical: text("vertical"), // TECHNOLOGY, HEALTHCARE, RETAIL, etc.
  stockExchange: text("stock_exchange"),
  stockSymbol: text("stock_symbol"),
  // Authorized Signer
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  // EIN Exact-Match Data Guard (A6)
  legalNameConfirmed: boolean("legal_name_confirmed").notNull().default(false),
  legalNameConfirmedAt: timestamp("legal_name_confirmed_at"),
  // Vetting
  vettingStatus: text("vetting_status"), // null, pending, passed, failed
  vettingProvider: text("vetting_provider"), // campaign-verify, aegis
  vettingScore: integer("vetting_score"),
  // Payment
  stripePaymentId: text("stripe_payment_id"),
  amountPaid: integer("amount_paid"), // in cents
  // Documents (stored as JSON with document SIDs)
  documents: jsonb("documents"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertA2pBrandSchema = createInsertSchema(a2pBrands).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertA2pBrand = z.infer<typeof insertA2pBrandSchema>;
export type A2pBrand = typeof a2pBrands.$inferSelect;

// A2P 10-DLC Compliance - Campaign Registration
export const a2pCampaigns = pgTable("a2p_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  brandId: varchar("brand_id").references(() => a2pBrands.id).notNull(),
  // Twilio Campaign SID
  campaignSid: text("campaign_sid"),
  campaignStatus: text("campaign_status").default("pending"), // pending, approved, rejected, failed
  // Campaign Details
  useCase: text("use_case").notNull(), // STANDARD, MARKETING, CUSTOMER_CARE, etc.
  description: text("description").notNull(),
  messageFlow: text("message_flow"), // How users opt-in
  sampleMessages: jsonb("sample_messages"), // Array of sample messages
  // Compliance Details
  optInDescription: text("opt_in_description"),
  optOutDescription: text("opt_out_description"),
  helpDescription: text("help_description"),
  hasDirectLending: boolean("has_direct_lending").default(false),
  // Links
  privacyPolicyUrl: text("privacy_policy_url"),
  termsOfServiceUrl: text("terms_of_service_url"),
  // Messaging Service
  messagingServiceSid: text("messaging_service_sid"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertA2pCampaignSchema = createInsertSchema(a2pCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertA2pCampaign = z.infer<typeof insertA2pCampaignSchema>;
export type A2pCampaign = typeof a2pCampaigns.$inferSelect;

// Enum for the Reseller Franchise Hierarchy (MSA v1.1.0 Addendum §1)
export const accountTypeEnum = pgEnum("account_type", [
  "DIRECT",       // Standard self-serve signup (default)
  "RESELLER",     // Master UUID with sub-account provisioning authority
  "SUB_ACCOUNT",  // End-customer provisioned under a RESELLER Master UUID
]);

// Enums for the Onboarding & Compliance Gateway (MSA v1.0.0)
export const onboardingStatusEnum = pgEnum("onboarding_status", [
  "PENDING_MSA",
  "PENDING_COMPLIANCE",
  "ACTIVE",
  "SUSPENDED",
]);

export const complianceStatusEnum = pgEnum("compliance_status", [
  "NOT_SUBMITTED",
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

// Customer Accounts - separate from admin users, for business owners
export const customerAccounts = pgTable("customer_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone").notNull().unique(),
  name: text("name"),
  email: text("email"),
  plan: text("plan").notNull().default("free"),
  planStartedAt: timestamp("plan_started_at").defaultNow(),
  stripeCustomerId: text("stripe_customer_id"),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // ── Onboarding & Compliance Gateway (MSA v1.0.0) ──────────────────────────
  onboardingStatus: onboardingStatusEnum("onboarding_status").default("PENDING_MSA").notNull(),
  activationDate: timestamp("activation_date"),
  trialEndDate: timestamp("trial_end_date"),       // activationDate + 30 days (pricing_v1.yaml)
  msaAcceptedAt: timestamp("msa_accepted_at"),
  msaVersion: text("msa_version"),                 // SHA-256 hash of the accepted MSA version string
  complianceStatus: complianceStatusEnum("compliance_status").default("NOT_SUBMITTED").notNull(),
  businessName: text("business_name"),
  ein: text("ein"),                                // Format: XX-XXXXXXX
  physicalAddress: jsonb("physical_address"),      // { street, city, state, zip, country }
  smsUseCase: text("sms_use_case"),
  complianceRejectionReason: text("compliance_rejection_reason"),
  // ── Reseller Franchise Hierarchy (MSA v1.1.0 Addendum) ────────────────────
  accountType: accountTypeEnum("account_type").default("DIRECT").notNull(),
  // Self-referencing FK: links SUB_ACCOUNT back to its RESELLER Master UUID.
  // Declared as varchar (not uuid type) to match the id column type on this table.
  parentAccountId: varchar("parent_account_id").references((): any => customerAccounts.id),
  wholesaleRate: numeric("wholesale_rate", { precision: 10, scale: 2 }).default("49.00"),
  // markupRate: custom retail pricing the reseller charges end-customers.
  // Shape: { phoneVoiceAi: number, webVoiceAi: number, a2pSms: number }
  markupRate: jsonb("markup_rate"),
  // Running Net Margin ledger for reseller payouts (precision: 12 for million-dollar brokerages).
  resellerCommissionBalance: numeric("reseller_commission_balance", { precision: 12, scale: 2 }).default("0.00"),
  // Stripe Connect account ID for automated margin disbursement. Nullable until onboarded.
  stripeConnectedAccountId: text("stripe_connected_account_id"),
  // Reseller pre-signature timestamp (§1.3): must be set before end-user can sign MSA.
  resellerMsaConfirmedAt: timestamp("reseller_msa_confirmed_at"),
  // A2P Content Provider designation (§1.5 / carrier audit requirement).
  // Shape: { name: string, role: "Content Provider", acknowledgedAt: ISO8601 }
  a2pContentProvider: jsonb("a2p_content_provider"),
});

export const insertCustomerAccountSchema = createInsertSchema(customerAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
});

export type InsertCustomerAccount = z.infer<typeof insertCustomerAccountSchema>;
export type CustomerAccount = typeof customerAccounts.$inferSelect;

// Customer Sessions - separate from admin auth sessions
export const customerSessions = pgTable("customer_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerAccountId: varchar("customer_account_id").references(() => customerAccounts.id).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCustomerSessionSchema = createInsertSchema(customerSessions).omit({
  id: true,
  createdAt: true,
});

export type InsertCustomerSession = z.infer<typeof insertCustomerSessionSchema>;
export type CustomerSession = typeof customerSessions.$inferSelect;

export const PLAN_LIMITS = {
  free: {
    label: "Free",
    price: 0,
    maxBusinesses: 5,
    tagline: "Try it out",
    websiteTtsMinutes: 500,
    liveVoiceMinutes: 0,
    dedicatedNumber: false,
    editWebsite: false,
    reviewManagement: false,
    reviewThresholds: false,
    smsAdmin: false,
    spanishSupport: false,
    taskManagement: false,
    projectManagement: false,
    features: [
      "Static AI-generated website",
      "Up to 5 businesses",
      "Last 5 reviews displayed",
      "Shared SMS number",
      "500 website voice minutes",
      "AI chat concierge",
    ],
  },
  pro: {
    label: "Business",
    price: 49,
    maxBusinesses: 5,
    tagline: "Fix my reviews",
    websiteTtsMinutes: 500,
    liveVoiceMinutes: 0,
    dedicatedNumber: false,
    editWebsite: true,
    reviewManagement: true,
    reviewThresholds: true,
    smsAdmin: true,
    spanishSupport: false,
    taskManagement: false,
    projectManagement: false,
    features: [
      "Edit website content",
      "Review filtering & thresholds",
      "Respond to reviews via SMS",
      "SMS admin commands",
      "500 website voice minutes",
      "Up to 5 businesses",
    ],
  },
  voice: {
    label: "Business Voice",
    price: 99,
    maxBusinesses: 10,
    tagline: "Stop wasting my time",
    websiteTtsMinutes: 1000,
    liveVoiceMinutes: 400,
    dedicatedNumber: true,
    editWebsite: true,
    reviewManagement: true,
    reviewThresholds: true,
    smsAdmin: true,
    spanishSupport: true,
    taskManagement: false,
    projectManagement: false,
    features: [
      "Dedicated phone number",
      "400 live voice minutes (call screening)",
      "1,000 website voice minutes",
      "Spanish language recognition",
      "Negative sentiment alerts",
      "All Business features",
    ],
  },
  enterprise: {
    label: "Enterprise",
    price: 299,
    maxBusinesses: 999,
    tagline: "Run my business",
    websiteTtsMinutes: 3000,
    liveVoiceMinutes: 1500,
    dedicatedNumber: true,
    editWebsite: true,
    reviewManagement: true,
    reviewThresholds: true,
    smsAdmin: true,
    spanishSupport: true,
    taskManagement: true,
    projectManagement: true,
    features: [
      "1,500 live voice minutes",
      "3,000 website voice minutes",
      "Autonomous task management",
      "Project management",
      "Unlimited businesses",
      "All Business Voice features",
    ],
  },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;
export type PlanInfo = typeof PLAN_LIMITS[PlanType];

// Site Configurations - maps businesses to agent configs for AI Biz Bot
export const siteConfigs = pgTable("site_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").references(() => customerAccounts.id),
  name: text("name").notNull(),
  domain: text("domain"),
  placeId: text("place_id"),
  placeData: jsonb("place_data"),
  /** Workspace lifecycle (MVP-safe, multi-tenant friendly): demo | provisioned | claimed | active | archived */
  workspaceState: text("workspace_state").default("demo").notNull(),
  claimedAt: timestamp("claimed_at"),
  /** e.g. sdr_demo | agency | owner | system */
  createdByType: text("created_by_type"),
  assignedAgentId: varchar("assigned_agent_id"),
  botTemplateId: varchar("bot_template_id"),
  systemPromptOverride: text("system_prompt_override"),
  modelProvider: text("model_provider").default("gemini"),
  modelName: text("model_name"),
  chatbotEnabled: boolean("chatbot_enabled").default(true),
  voiceConciergeEnabled: boolean("voice_concierge_enabled").default(true),
  widgetPosition: text("widget_position").default("bottom-right"),
  widgetColor: text("widget_color").default("#2563eb"),
  greetingMessage: text("greeting_message"),
  placeholderText: text("placeholder_text").default("Type a message..."),
  /** Knowledge library: array of { id, title, content, addedAt } for agent training. */
  knowledgeLibrary: jsonb("knowledge_library"),
  /** User-directed guardrails (always, never, believe). Merged with agent structured_controls at compile time. */
  structuredGuardrails: jsonb("structured_guardrails").$type<StructuredGuardrails>().default({}),
  /** Total reviews harvested via SerpAPI pipeline — used for billing ($0.10/review above 10). */
  reviewsHarvested: integer("reviews_harvested").default(0),
  /** Per-business subscription plan: 'free' | 'pro' | 'voice' | 'enterprise' */
  plan: text("plan").default("free"),
  /** AI-generated or custom hero image URL stored on the platform */
  heroImageUrl: text("hero_image_url"),
  /** Prompt used to generate the hero image (stored for regeneration) */
  heroImagePrompt: text("hero_image_prompt"),
  /** Brand theme preset key — references BRAND_THEMES in brand.ts. Default: 'gateway-dark'. */
  brandTheme: text("brand_theme").default("gateway-dark"),
  /** Agent Persona config: { name, role, discProfile, basePrompt } */
  agentConfig: jsonb("agent_config"),
  /** Audio / voice settings: { voiceName, language, isPushToTalk } */
  voiceConfig: jsonb("voice_config"),
  /** Showroom UI theme tokens: { primaryColor, fontFamily, borderRadius } */
  themeConfig: jsonb("theme_config"),
  /** Granular resource ledger: prepaid quotas per cost center (all default 0). */
  voicePhoneAiMinutes: integer("voice_phone_ai_minutes").default(0).notNull(),
  voiceWebAiMinutes: integer("voice_web_ai_minutes").default(0).notNull(),
  smsMessages: integer("sms_messages").default(0).notNull(),
  chatBotMessages: integer("chat_bot_messages").default(0).notNull(),
  /** Twilio sub-account SID provisioned for this AI Partner deployment (A2P Enterprise). */
  twilioSubAccountSid: text("twilio_sub_account_sid"),
  /** Phone number (E.164) provisioned for this AI Partner via CID provisioning. */
  provisionedPhoneNumber: text("provisioned_phone_number"),
  /** Twilio IncomingPhoneNumber SID for the provisioned number. */
  provisionedPhoneSid: text("provisioned_phone_sid"),
  /** Voice AI Package ($50/mo): enables sub-account creation and phone number provisioning. */
  voicePlanActive: boolean("voice_plan_active").notNull().default(false),
  /** When the voice plan was activated. */
  voicePlanActivatedAt: timestamp("voice_plan_activated_at"),
  /** Twilio sub-account SID dedicated to this business for number management. */
  voiceSubAccountSid: text("voice_sub_account_sid"),
  /** Auth token for the business's Twilio sub-account (stored securely). */
  voiceSubAccountAuthToken: text("voice_sub_account_auth_token"),
  /** Friendly name used when creating the Twilio sub-account. */
  voiceSubAccountFriendlyName: text("voice_sub_account_friendly_name"),
  /** Reseller (Digital Franchise) who owns this site – for commission attribution. */
  resellerId: varchar("reseller_id").references(() => resellers.id),
  /** When the low-energy SMS nudge was last sent; reset on refill so nudge can fire again. */
  lastNudgeSentAt: timestamp("last_nudge_sent_at"),
  // ── Site Claim / Assignment lifecycle ──────────────────────────────────────
  /** Secure random hex token embedded in the SMS claim link. */
  claimToken:               varchar("claim_token", { length: 64 }),
  /** Token expiry — defaults to 7 days from when the invite is sent. */
  claimTokenExpiresAt:      timestamp("claim_token_expires_at"),
  /** The E.164 phone number the invite SMS was dispatched to. */
  assignedToPhone:          text("assigned_to_phone"),
  /** Claim lifecycle: 'unclaimed' | 'invite_sent' | 'payment_pending' | 'claimed' */
  claimStatus:              text("claim_status").notNull().default("unclaimed"),
  /** Stripe Checkout session ID used for the $49.99 activation payment. */
  claimCheckoutSessionId:   text("claim_checkout_session_id"),
  /** Tenant and staff list for Receptionist "Employee Awareness" e.g. { tenant_id, staff: [{ name, role, agent_id }] }. */
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  /** When custom domain ownership was verified (e.g. via Hostinger API). */
  domainVerifiedAt: timestamp("domain_verified_at"),
  /** URL-safe slug for the public business page (e.g. "mcdonalds-lafayette-a3f2"). */
  slug: varchar("slug"),
  /** Generated QR code image URL (e.g. /api/qr/image/:slug). Null until first generation. */
  qrCodeUrl: text("qr_code_url"),
  /** Denormalized total shares — incremented on each share_events insert. */
  shareCount: integer("share_count").default(0).notNull(),
  /** Open Graph / social sharing meta: ogTitle, ogDescription, ogImage, ogUrl, ogSiteName, ogType, twitterCard. Empty fields filled from site name/hero/URL at serve time. */
  socialSharing: jsonb("social_sharing").$type<Record<string, string>>().default({}),
  /** Storefront demo: static routes (call, text, email, website) — { call: { enabled, value }, text: { enabled, value }, email: { enabled, value }, website: { enabled, value } }. */
  staticRoutes: jsonb("static_routes").$type<StaticRoutesConfig>(),
  /** Service menu: array of { name, price, duration, description } */
  serviceMenu: jsonb("service_menu"),
  /** FAQs: array of { question, answer } */
  faqs: jsonb("faqs"),
  /** CRM Config: { statuses: string[], defaultStatus: string } */
  crmConfig: jsonb("crm_config"),
  /** Ordered interaction task list: [{ id, label, description?, required }] */
  taskOrder: jsonb("task_order").$type<{ id: string; label: string; description?: string; required: boolean }[]>().default([]),
  /** Business type: 'google_maps' for Places-backed sites, 'custom' for non-physical/SaaS businesses. */
  businessType: text("business_type").default("google_maps"),
  /** Short description for custom (non-maps) businesses. */
  businessDescription: text("business_description"),
  /** Logo URL for custom businesses (not using Google Places photo). */
  logoUrl: text("logo_url"),
  /** Primary website URL for custom businesses. */
  website: text("website"),
  /** Communication Plane: disclosure, stability dials, principal-of-record — see shared/conversationGrounding.ts */
  communicationGovernance: jsonb("communication_governance").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  /** SKU from last successful platform software license redemption (informational). */
  platformLicenseSku: text("platform_license_sku"),
  platformLicenseActivatedAt: timestamp("platform_license_activated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type StaticRoutesConfig = {
  call?: { enabled: boolean; value?: string };
  text?: { enabled: boolean; value?: string };
  email?: { enabled: boolean; value?: string };
  website?: { enabled: boolean; value?: string };
};

export const insertSiteConfigSchema = createInsertSchema(siteConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSiteConfig = z.infer<typeof insertSiteConfigSchema>;
export type SiteConfig = typeof siteConfigs.$inferSelect;

/** Admin-issued software license keys; full key shown once; DB stores prefix + SHA-256 hash only. */
export const platformLicenseKeys = pgTable("platform_license_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  keyPrefix: varchar("key_prefix", { length: 24 }).notNull(),
  secretHash: text("secret_hash").notNull(),
  sku: text("sku").notNull(),
  label: text("label"),
  maxActivations: integer("max_activations"),
  activationCount: integer("activation_count").notNull().default(0),
  expiresAt: timestamp("expires_at"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  revokedAt: timestamp("revoked_at"),
  createdByAdminId: varchar("created_by_admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const platformLicenseActivations = pgTable("platform_license_activations", {
  id: uuid("id").primaryKey().defaultRandom(),
  licenseKeyId: uuid("license_key_id")
    .references(() => platformLicenseKeys.id, { onDelete: "cascade" })
    .notNull(),
  siteConfigId: varchar("site_config_id")
    .references(() => siteConfigs.id, { onDelete: "cascade" })
    .notNull(),
  customerAccountId: varchar("customer_account_id").references(() => customerAccounts.id, {
    onDelete: "set null",
  }),
  activatedAt: timestamp("activated_at").notNull().defaultNow(),
});

export type PlatformLicenseKey = typeof platformLicenseKeys.$inferSelect;
export type PlatformLicenseActivation = typeof platformLicenseActivations.$inferSelect;

// ── Knowledge Artifacts — first-class KB docs with scope, visibility, agent_access_key ─
export const knowledgeArtifacts = pgTable(
  "knowledge_artifacts",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    siteConfigId: varchar("site_config_id").references(() => siteConfigs.id, { onDelete: "set null" }),
    scope: text("scope").notNull().default("business"), // platform | franchise | business
    visibility: text("visibility").notNull().default("public"), // public | private
    agentAccessKey: varchar("agent_access_key").notNull().unique(),
    title: text("title").notNull(),
    content: text("content"),
    sourcePath: text("source_path"),
    groupLevel: text("group_level"),
    /** KAP trust weight 0–10; platform governance anchors use 10. */
    trustWeight: integer("trust_weight"),
    /** Tags, provenance notes, etc. */
    artifactMetadata: jsonb("artifact_metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    ownerId: varchar("owner_id").references(() => customerAccounts.id, { onDelete: "set null" }),
    resellerId: varchar("reseller_id").references(() => resellers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_knowledge_artifacts_site_config_id").on(table.siteConfigId),
    index("idx_knowledge_artifacts_scope_visibility").on(table.scope, table.visibility),
    index("idx_knowledge_artifacts_scope_trust").on(table.scope, table.trustWeight),
  ]
);

export const insertKnowledgeArtifactSchema = createInsertSchema(knowledgeArtifacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type KnowledgeArtifact = typeof knowledgeArtifacts.$inferSelect;
export type InsertKnowledgeArtifact = typeof knowledgeArtifacts.$inferInsert;

/** Phase 5E — superadmin manual certification for a dimension (heuristic override, audited, expiring). */
export const knowledgeCertificationOverrides = pgTable(
  "knowledge_certification_overrides",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    siteConfigId: varchar("site_config_id")
      .notNull()
      .references(() => siteConfigs.id, { onDelete: "cascade" }),
    dimensionId: text("dimension_id").notNull(),
    overrideScore: integer("override_score").notNull(),
    reasonText: text("reason_text").notNull(),
    createdByAdminUserId: varchar("created_by_admin_user_id")
      .notNull()
      .references(() => adminUsers.id),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    /** Deterministic Sentinel audit: true = needs human review on platform. */
    reviewRequired: boolean("review_required").notNull().default(false),
    auditDetail: jsonb("audit_detail").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  },
  (table) => [
    uniqueIndex("knowledge_cert_override_site_dim").on(table.siteConfigId, table.dimensionId),
    index("idx_knowledge_cert_overrides_site_expires").on(table.siteConfigId, table.expiresAt),
    index("idx_knowledge_cert_overrides_review").on(table.siteConfigId, table.reviewRequired),
  ]
);

export type KnowledgeCertificationOverride = typeof knowledgeCertificationOverrides.$inferSelect;
export type InsertKnowledgeCertificationOverride = typeof knowledgeCertificationOverrides.$inferInsert;

/** Zero-LLM vault handoff — opaque token/refs from upstream vaults; never chat_logs. */
export const secureVaultRefs = pgTable(
  "secure_vault_refs",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    siteConfigId: varchar("site_config_id")
      .notNull()
      .references(() => siteConfigs.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    opaqueReference: text("opaque_reference").notNull(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    attestedAt: timestamp("attested_at").notNull(),
    createdByAdminUserId: varchar("created_by_admin_user_id")
      .notNull()
      .references(() => adminUsers.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_secure_vault_refs_site").on(table.siteConfigId)]
);

export type SecureVaultRef = typeof secureVaultRefs.$inferSelect;
export type InsertSecureVaultRef = typeof secureVaultRefs.$inferInsert;

// Session-scoped active document keys for in-chat KB overlay
export const artifactSessionActivations = pgTable(
  "artifact_session_activations",
  {
    id: serial("id").primaryKey(),
    sessionId: varchar("session_id").notNull(),
    agentAccessKey: varchar("agent_access_key").notNull(),
    siteConfigId: varchar("site_config_id").references(() => siteConfigs.id, { onDelete: "cascade" }),
    activatedAt: timestamp("activated_at").defaultNow(),
  },
  (table) => [
    index("idx_artifact_session_activations_session_id").on(table.sessionId),
    index("idx_artifact_session_activations_site_config_id").on(table.siteConfigId),
    uniqueIndex("artifact_session_activations_session_key_unique").on(table.sessionId, table.agentAccessKey),
  ]
);

export type ArtifactSessionActivation = typeof artifactSessionActivations.$inferSelect;

// ── QR Routes — shadow telecom routing table (QR code = virtual phone number) ─
export const qrRoutes = pgTable("qr_routes", {
  id: serial("id").primaryKey(),
  variable: uuid("variable").notNull().default(sql`gen_random_uuid()`).unique(),
  destination: text("destination"),
  siteConfigId: varchar("site_config_id").references(() => siteConfigs.id, { onDelete: "set null" }),
  label: text("label"),
  qrCodePath: text("qr_code_path"),
  viewId: text("view_id"),
  isActive: boolean("is_active").default(true).notNull(),
  scanCount: integer("scan_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertQrRouteSchema = createInsertSchema(qrRoutes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertQrRoute = z.infer<typeof insertQrRouteSchema>;
export type QrRoute = typeof qrRoutes.$inferSelect;

// ── QR Firewall — access control rules per route or global ─
export const qrFirewall = pgTable("qr_firewall", {
  id: serial("id").primaryKey(),
  qrRouteId: integer("qr_route_id").references(() => qrRoutes.id, { onDelete: "cascade" }),
  ruleType: text("rule_type").notNull(), // 'allow_ip' | 'deny_ip' | 'allow_ua' | 'deny_ua' | 'rate_limit'
  value: text("value").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
export type QrFirewallRule = typeof qrFirewall.$inferSelect;
export type InsertQrFirewallRule = typeof qrFirewall.$inferInsert;

// ── QR Access — log every scan or blocked attempt ─
export const qrAccess = pgTable("qr_access", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  qrRouteId: integer("qr_route_id").references(() => qrRoutes.id, { onDelete: "cascade" }).notNull(),
  accessedAt: timestamp("accessed_at").defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  destination: text("destination"),
  wasBlocked: boolean("was_blocked").default(false).notNull(),
  responseMs: integer("response_ms"),
});
export type QrAccessLog = typeof qrAccess.$inferSelect;
export type InsertQrAccessLog = typeof qrAccess.$inferInsert;

// ── Slug landings — optional tracking for /biz/:slug?from=qr (website QR) ─
export const slugLandings = pgTable("slug_landings", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  siteConfigId: varchar("site_config_id").references(() => siteConfigs.id, { onDelete: "cascade" }).notNull(),
  landedAt: timestamp("landed_at", { withTimezone: true }).defaultNow().notNull(),
  source: text("source").notNull().default("qr"),
});
export type SlugLanding = typeof slugLandings.$inferSelect;
export type InsertSlugLanding = typeof slugLandings.$inferInsert;

// ── Conversation events — actionable routes per call/session (Cash Board) ─
export const conversationEvents = pgTable("conversation_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  siteConfigId: varchar("site_config_id").references(() => siteConfigs.id, { onDelete: "cascade" }).notNull(),
  callSid: text("call_sid"),
  sessionId: text("session_id"),
  eventType: text("event_type").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
});
export type ConversationEvent = typeof conversationEvents.$inferSelect;
export type InsertConversationEvent = typeof conversationEvents.$inferInsert;

// ── Vendor entities + patient/vendor relationships (secure intake domain) ─
export const vendors = pgTable("vendors", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  siteConfigId: varchar("site_config_id").references(() => siteConfigs.id, { onDelete: "cascade" }).notNull(),
  vendorType: text("vendor_type").notNull(), // INSURANCE | ATTORNEY | REFERRING_PROVIDER
  name: text("name").notNull(),
  normalizedKey: text("normalized_key"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  createdAt: true,
});
export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;

export const patientVendorRelationships = pgTable("patient_vendor_relationships", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  siteConfigId: varchar("site_config_id").references(() => siteConfigs.id, { onDelete: "cascade" }).notNull(),
  patientId: varchar("patient_id").references(() => customers.id, { onDelete: "cascade" }).notNull(),
  vendorId: uuid("vendor_id").references(() => vendors.id, { onDelete: "cascade" }).notNull(),
  vendorType: text("vendor_type").notNull(),
  relationshipType: text("relationship_type").notNull(),
  consentGranted: boolean("consent_granted").default(false).notNull(),
  consentDocumentId: text("consent_document_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const insertPatientVendorRelationshipSchema = createInsertSchema(patientVendorRelationships).omit({
  id: true,
  createdAt: true,
});
export type PatientVendorRelationship = typeof patientVendorRelationships.$inferSelect;
export type InsertPatientVendorRelationship = z.infer<typeof insertPatientVendorRelationshipSchema>;

export const consentRecords = pgTable("consent_records", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  siteConfigId: varchar("site_config_id").references(() => siteConfigs.id, { onDelete: "cascade" }).notNull(),
  patientId: varchar("patient_id").references(() => customers.id, { onDelete: "cascade" }).notNull(),
  vendorId: uuid("vendor_id").references(() => vendors.id, { onDelete: "set null" }),
  consentType: text("consent_type").notNull(),
  signedAt: timestamp("signed_at", { withTimezone: true }).defaultNow().notNull(),
  signatureHash: text("signature_hash").notNull(),
  documentId: text("document_id"),
  expirationDate: timestamp("expiration_date", { withTimezone: true }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const insertConsentRecordSchema = createInsertSchema(consentRecords).omit({
  id: true,
  createdAt: true,
});
export type ConsentRecord = typeof consentRecords.$inferSelect;
export type InsertConsentRecord = z.infer<typeof insertConsentRecordSchema>;

export const intakeChangeRequests = pgTable("intake_change_requests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  siteConfigId: varchar("site_config_id").references(() => siteConfigs.id, { onDelete: "cascade" }).notNull(),
  patientId: varchar("patient_id").references(() => customers.id, { onDelete: "cascade" }).notNull(),
  fieldName: text("field_name").notNull(),
  requestedValue: jsonb("requested_value").$type<Record<string, unknown>>().notNull(),
  writeMode: text("write_mode").notNull(), // direct | review | secure_only | denied
  status: text("status").notNull().default("pending"), // pending | approved | rejected | applied
  reviewerRole: text("reviewer_role"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const insertIntakeChangeRequestSchema = createInsertSchema(intakeChangeRequests).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
});
export type IntakeChangeRequest = typeof intakeChangeRequests.$inferSelect;
export type InsertIntakeChangeRequest = z.infer<typeof insertIntakeChangeRequestSchema>;

// ── Per-site PMS integrations (Cloudbeds, etc.) — one row per site per PMS ─
export const sitePmsIntegrations = pgTable("site_pms_integrations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  siteConfigId: varchar("site_config_id").references(() => siteConfigs.id, { onDelete: "cascade" }).notNull(),
  pmsType: text("pms_type").notNull(),
  propertyId: text("property_id"),
  apiKey: text("api_key"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  bookingEngineUrl: text("booking_engine_url"),
  config: jsonb("config").$type<Record<string, unknown>>().default({}).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  /** api_key_property | api_key_partner_delivery | oauth2 — null = inferred from tokens/key */
  authLane: text("auth_lane"),
  /** Logical scope IDs; ["*"] = operator-attested wildcard (lane A) */
  scopesGranted: jsonb("scopes_granted").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  /** e.g. cloudbeds_v1_3 — null = infer from CLOUDBEDS_API_BASE_URL */
  apiVersionLane: text("api_version_lane"),
  /** draft | connected | degraded | revoked */
  installPosture: text("install_posture").notNull().default("connected"),
  connectionHealth: jsonb("connection_health").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
  lastErrorAt: timestamp("last_error_at", { withTimezone: true }),
  lastRefreshAt: timestamp("last_refresh_at", { withTimezone: true }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSitePmsIntegrationSchema = createInsertSchema(sitePmsIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSitePmsIntegration = z.infer<typeof insertSitePmsIntegrationSchema>;
export type SitePmsIntegration = typeof sitePmsIntegrations.$inferSelect;

/** Operator SMS deep-link — narrow integration-connect authority only (see INTEGRATION_OPERATOR_CONNECT_FLOW_V1) */
export const integrationConnectTokens = pgTable(
  "integration_connect_tokens",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    siteConfigId: varchar("site_config_id")
      .references(() => siteConfigs.id, { onDelete: "cascade" })
      .notNull(),
    vendorId: text("vendor_id").notNull(),
    connectLane: text("connect_lane").notNull(),
    phoneE164: text("phone_e164"),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: text("created_by"),
  },
  (t) => [
    uniqueIndex("integration_connect_tokens_token_hash_uidx").on(t.tokenHash),
    index("integration_connect_tokens_site_created_idx").on(t.siteConfigId, t.createdAt),
  ],
);

export type IntegrationConnectToken = typeof integrationConnectTokens.$inferSelect;

/** Append-only audit for integration onboarding SMS attempts (governed lanes). */
export const integrationOnboardingSmsAudit = pgTable(
  "integration_onboarding_sms_audit",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    actorAdminUserId: varchar("actor_admin_user_id")
      .references(() => adminUsers.id, { onDelete: "restrict" })
      .notNull(),
    siteConfigId: varchar("site_config_id")
      .references(() => siteConfigs.id, { onDelete: "cascade" })
      .notNull(),
    integrationKey: text("integration_key").notNull().default("cloudbeds_graphql_discovery"),
    requestedVariant: text("requested_variant").notNull(),
    providedToE164: text("provided_to_e164"),
    recipientResolutionSource: text("recipient_resolution_source"),
    finalRecipientE164: text("final_recipient_e164"),
    eligibilityMode: text("eligibility_mode").notNull(),
    outcomeCode: text("outcome_code").notNull(),
    suppressionReason: text("suppression_reason"),
    connectTokenId: uuid("connect_token_id").references(() => integrationConnectTokens.id, {
      onDelete: "set null",
    }),
    twilioMessageSid: text("twilio_message_sid"),
    dispatchOk: boolean("dispatch_ok"),
    dryRun: boolean("dry_run").notNull().default(false),
  },
  (t) => [
    index("integration_onboarding_sms_audit_site_created_idx").on(t.siteConfigId, t.createdAt),
    index("integration_onboarding_sms_audit_actor_created_idx").on(t.actorAdminUserId, t.createdAt),
  ],
);

export type IntegrationOnboardingSmsAuditRow = typeof integrationOnboardingSmsAudit.$inferSelect;

/** Guest OTP verification (per site + phone) — NOVA platform plane; Twilio behind server service */
export const guestVerificationSessions = pgTable("guest_verification_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  siteConfigId: varchar("site_config_id")
    .references(() => siteConfigs.id, { onDelete: "cascade" })
    .notNull(),
  phoneE164: text("phone_e164").notNull(),
  otpVerified: boolean("otp_verified").notNull().default(false),
  verificationTokenHash: text("verification_token_hash"),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  flowType: text("flow_type").notNull().default("guest_phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type GuestVerificationSession = typeof guestVerificationSessions.$inferSelect;

/**
 * Remote installation / ISV API keys — Bearer auth for POST /api/v1/verification/*.
 * Full key is shown once at creation; only key_prefix + secret_hash are stored.
 */
export const verificationInstallationApiKeys = pgTable(
  "verification_installation_api_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    siteConfigId: varchar("site_config_id")
      .references(() => siteConfigs.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull().default("Installation"),
    keyPrefix: varchar("key_prefix", { length: 24 }).notNull(),
    secretHash: text("secret_hash").notNull(),
    permissions: jsonb("permissions").$type<string[]>().notNull().default(["verification.guest"]),
    isActive: boolean("is_active").notNull().default(true),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
);

export type VerificationInstallationApiKey = typeof verificationInstallationApiKeys.$inferSelect;

/**
 * Append-only log of every HTTP passage through verification routes (auth success, failure, or anonymous).
 * Supports transparency statistics and rate-limit accounting — not PII (hashed fingerprint only).
 */
export const verificationGatePassageEvents = pgTable("verification_gate_passage_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  siteConfigId: varchar("site_config_id").references(() => siteConfigs.id, { onDelete: "set null" }),
  route: text("route").notNull(),
  httpMethod: text("http_method").notNull(),
  passageKind: text("passage_kind").notNull(),
  authState: text("auth_state").notNull(),
  installationKeyId: uuid("installation_key_id").references(() => verificationInstallationApiKeys.id, {
    onDelete: "set null",
  }),
  httpStatus: integer("http_status").notNull(),
  clientFingerprintHash: text("client_fingerprint_hash").notNull(),
  durationMs: integer("duration_ms"),
  rateLimited: boolean("rate_limited").notNull().default(false),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type VerificationGatePassageEvent = typeof verificationGatePassageEvents.$inferSelect;

// ── Share Events — tracks every share action with optional referrer UUID ─────
export const shareEvents = pgTable("share_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  siteConfigId: varchar("site_config_id").references(() => siteConfigs.id, { onDelete: "cascade" }).notNull(),
  /** UUID of the verified platform user who shared — NULL for anonymous shares. */
  referrerUserId: varchar("referrer_user_id"),
  /** Social platform or channel: 'facebook' | 'twitter' | 'linkedin' | 'whatsapp' | 'sms' | 'email' | 'copy' */
  platform: varchar("platform").notNull(),
  sharedAt: timestamp("shared_at").defaultNow().notNull(),
});

export type ShareEvent = typeof shareEvents.$inferSelect;

// ── Storefront categories, reports, images, demo claims ───────────────────────
export const storefrontCategories = pgTable("storefront_categories", {
  slug: varchar("slug").primaryKey(),
  displayName: varchar("display_name").notNull(),
  location: varchar("location").notNull(),
  searchQuery: varchar("search_query").notNull(),
  industryGroup: varchar("industry_group"),
  /** Optional reference/fallback hero image (path or URL). Used when no Flux images exist. */
  heroImageUrl: varchar("hero_image_url"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const storefrontReports = pgTable("storefront_reports", {
  categorySlug: varchar("category_slug").primaryKey().references(() => storefrontCategories.slug, { onDelete: "cascade" }),
  summary: text("summary"),
  whatsWorking: jsonb("whats_working").$type<string[]>().default([]),
  whatsNotWorking: jsonb("whats_not_working").$type<string[]>().default([]),
  rawPlaces: jsonb("raw_places"),
  generatedAt: timestamp("generated_at").defaultNow(),
});

export const storefrontCategoryImages = pgTable(
  "storefront_category_images",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    categorySlug: varchar("category_slug")
      .notNull()
      .references(() => storefrontCategories.slug, { onDelete: "cascade" }),
    imageIndex: integer("image_index").notNull(),
    imageUrl: text("image_url").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [uniqueIndex("storefront_category_images_slug_idx").on(t.categorySlug, t.imageIndex)]
);

export const storefrontDemoClaims = pgTable("storefront_demo_claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: varchar("phone").notNull(),
  siteConfigId: varchar("site_config_id")
    .notNull()
    .references(() => siteConfigs.id, { onDelete: "cascade" }),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type StorefrontCategory = typeof storefrontCategories.$inferSelect;
export type StorefrontReport = typeof storefrontReports.$inferSelect;
export type StorefrontCategoryImage = typeof storefrontCategoryImages.$inferSelect;
export type StorefrontDemoClaim = typeof storefrontDemoClaims.$inferSelect;

// ── Voice Usage Logs – Energy Pool Billing ($0.10/min) ────────────────────────
// One row per completed call. billedMinutes = ceil(rawDurationSeconds / 60).
// amountCents = billedMinutes * ratePerMinuteCents (default 10 cents).
export const voiceUsageLogs = pgTable("voice_usage_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  /** The site/business that was charged for this call */
  siteConfigId: varchar("site_config_id").references(() => siteConfigs.id, { onDelete: "cascade" }).notNull(),
  /** Twilio or internal session identifier */
  callSid: text("call_sid"),
  /** 'phone' = PSTN/Twilio, 'web' = Gemini Live website voice */
  callType: text("call_type").notNull().default("phone"), // 'phone' | 'web'
  /** Raw call duration as reported by Twilio / session timer */
  rawDurationSeconds: integer("raw_duration_seconds").notNull().default(0),
  /** Billed minutes after ceiling rounding: ceil(rawDurationSeconds / 60) */
  billedMinutes: integer("billed_minutes").notNull().default(0),
  /** Rate in cents per minute (default 10 = $0.10/min) */
  ratePerMinuteCents: integer("rate_per_minute_cents").notNull().default(10),
  /** Total charge in cents: billedMinutes * ratePerMinuteCents */
  billedAmountCents: integer("billed_amount_cents").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVoiceUsageLogSchema = createInsertSchema(voiceUsageLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertVoiceUsageLog = z.infer<typeof insertVoiceUsageLogSchema>;
export type VoiceUsageLog = typeof voiceUsageLogs.$inferSelect;

// ── Reseller Commissions ledger ────────────────────────────────────────────────
// One row per commission event.  Amounts in cents to avoid floating-point drift.
// Status lifecycle: pending → paid | cancelled
// Event types: subscription | top_up | manual
export const resellerCommissions = pgTable("reseller_commissions", {
  id:                 varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resellerId:         varchar("reseller_id")
                        .references(() => resellers.id, { onDelete: "cascade" })
                        .notNull(),
  siteConfigId:       varchar("site_config_id")
                        .references(() => siteConfigs.id, { onDelete: "set null" }),
  eventType:          text("event_type").notNull(),   // 'subscription' | 'top_up' | 'manual'
  grossAmountCents:   integer("gross_amount_cents").notNull(),  // revenue that triggered commission
  commissionCents:    integer("commission_cents").notNull(),    // reseller's cut in cents
  status:             text("status").notNull().default("pending"), // 'pending' | 'paid' | 'cancelled'
  stripeTransferId:   text("stripe_transfer_id"),     // set once Stripe transfer fires
  note:               text("note"),                   // optional operator note for manual events
  createdAt:          timestamp("created_at").defaultNow().notNull(),
  paidAt:             timestamp("paid_at"),            // set when status → paid
});

export const insertResellerCommissionSchema = createInsertSchema(resellerCommissions).omit({
  id: true,
  createdAt: true,
  paidAt: true,
  stripeTransferId: true,
});
export type InsertResellerCommission = z.infer<typeof insertResellerCommissionSchema>;
export type ResellerCommission = typeof resellerCommissions.$inferSelect;

// ── Google Workspace Integration ──────────────────────────────────────────────
// Per-site workspace configuration (tied to siteConfigs, not customerAccounts,
// because each site can independently have the $99 Voice plan).
export const workspaceConfigurations = pgTable("workspace_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  siteConfigId: varchar("site_config_id").references(() => siteConfigs.id, { onDelete: "cascade" }).notNull().unique(),

  // Connection method
  setupType: text("setup_type").default("oauth"), // 'oauth' | 'hosted'

  // Customer's OAuth credentials (encrypted at rest recommendation)
  googleEmail: text("google_email"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry"),

  // Per-app enable state stored as JSONB: { gmail: true, calendar: false, ... }
  enabledApps: jsonb("enabled_apps").default({}),

  // Drive folder IDs created by platform
  driveFolderId: text("drive_folder_id"),
  leadTrackingSheetId: text("lead_tracking_sheet_id"),
  calendarId: text("calendar_id"),
  taskListId: text("task_list_id"),

  // Status
  status: text("status").default("disconnected"), // 'disconnected' | 'connected' | 'error'
  statusMessage: text("status_message"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWorkspaceConfigurationSchema = createInsertSchema(workspaceConfigurations).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertWorkspaceConfiguration = z.infer<typeof insertWorkspaceConfigurationSchema>;
export type WorkspaceConfiguration = typeof workspaceConfigurations.$inferSelect;

// Chat logs for web-based AI Biz Bot conversations
export const chatLogs = pgTable("chat_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  siteConfigId: varchar("site_config_id"),
  visitorId: text("visitor_id"),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChatLogSchema = createInsertSchema(chatLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertChatLog = z.infer<typeof insertChatLogSchema>;
export type ChatLog = typeof chatLogs.$inferSelect;

// ── Error Navigator & Recovery Analytics ─────────────────────────────────────
/** Logs ERROR_LANDING, RECOVERY_SUCCESS, VOICE_TIER_INTEREST for bounce/recovery tracking. */
export const analyticsLogs = pgTable("analytics_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  siteConfigId: varchar("site_config_id").references(() => siteConfigs.id),
  eventType: text("event_type").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AnalyticsLog = typeof analyticsLogs.$inferSelect;

// =========================================
// Business Data & Tour Guide (Clear Voice)
// =========================================

/** Cached enriched business data from Google Places + optional intelligence. TTL per row. */
export const businessDataCache = pgTable("business_data_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  placeId: text("place_id").notNull().unique(),
  generalData: jsonb("general_data").notNull(),
  intelligenceData: jsonb("intelligence_data"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type BusinessDataCacheRow = typeof businessDataCache.$inferSelect;

/** Owner-provided business data (custom description, story, offers). */
export const ownerBusinessData = pgTable("owner_business_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  placeId: text("place_id").notNull().unique(),
  ownerId: varchar("owner_id").references(() => customerAccounts.id),
  customDescription: text("custom_description"),
  specialOffers: jsonb("special_offers").$type<string[]>(),
  ownerStory: text("owner_story"),
  customHours: text("custom_hours"),
  contactPreferences: jsonb("contact_preferences"),
  publicAmenities: jsonb("public_amenities").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOwnerBusinessDataSchema = createInsertSchema(ownerBusinessData).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type OwnerBusinessDataRow = typeof ownerBusinessData.$inferSelect;

/** Cached business intelligence reports (SWOT, narrative). */
export const businessIntelligenceCache = pgTable("business_intelligence_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  placeId: text("place_id").notNull(),
  businessName: text("business_name").notNull(),
  report: jsonb("report").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type BusinessIntelligenceCacheRow = typeof businessIntelligenceCache.$inferSelect;

// =========================================
// VoiceLeadMachine - Outbound Lead Generator
// =========================================

export type GoogleReviewData = {
  authorName: string;
  rating: number;
  text: string;
  time: number;
  relativeTimeDescription: string;
};

export type GooglePhotoData = {
  photoReference: string;
  width: number;
  height: number;
  htmlAttributions?: string[];
};

// A2P Use Case definitions (from TCR matrix)
export const A2P_USE_CASES = [
  { value: 'CUSTOMER_CARE', label: 'Customer Care', description: 'Support and service messages' },
  { value: 'MARKETING', label: 'Marketing', description: 'Promotional and marketing content' },
  { value: 'ACCOUNT_NOTIFICATION', label: 'Account Notifications', description: 'Account updates and alerts' },
  { value: 'DELIVERY_NOTIFICATION', label: 'Delivery Notifications', description: 'Shipping and delivery updates' },
  { value: 'FRAUD_ALERT', label: 'Fraud Alerts', description: 'Security and fraud notifications' },
  { value: '2FA', label: 'Two-Factor Authentication', description: 'Login verification codes' },
  { value: 'POLLING_VOTING', label: 'Polling & Voting', description: 'Surveys and voting' },
  { value: 'PUBLIC_SERVICE_ANNOUNCEMENT', label: 'Public Service', description: 'PSA messages' },
  { value: 'MIXED', label: 'Mixed', description: 'Multiple use cases' },
] as const;

export const A2P_VERTICALS = [
  'TECHNOLOGY',
  'HEALTHCARE',
  'RETAIL',
  'FINANCIAL',
  'EDUCATION',
  'ENTERTAINMENT',
  'REAL_ESTATE',
  'HOSPITALITY',
  'PROFESSIONAL_SERVICES',
  'NON_PROFIT',
  'OTHER',
] as const;

export const ogSettings = pgTable("og_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pagePath: text("page_path").notNull().unique(),
  ogTitle: text("og_title").notNull(),
  ogDescription: text("og_description").notNull(),
  ogUrl: text("og_url"),
  ogImage: text("og_image"),
  ogType: text("og_type").default("website"),
  ogSiteName: text("og_site_name"),
  twitterCard: text("twitter_card").default("summary_large_image"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOgSettingsSchema = createInsertSchema(ogSettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertOgSettings = z.infer<typeof insertOgSettingsSchema>;
export type OgSettings = typeof ogSettings.$inferSelect;

// =========================================
// Restaurant Menu & E-Commerce Features
// =========================================

// Menus - Restaurant menu management for businesses
export const menus = pgTable("menus", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  siteConfigId: varchar("site_config_id").references(() => siteConfigs.id).notNull(),
  ownerId: varchar("owner_id").references(() => customerAccounts.id).notNull(),
  
  // Menu Details
  name: text("name").notNull(), // e.g., "Lunch Menu", "Dinner Menu", "Drinks"
  description: text("description"),
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").default(0),
  
  // Availability
  availableDays: text("available_days").array().default(sql`ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']::text[]`),
  availableStartTime: text("available_start_time"), // e.g., "11:00"
  availableEndTime: text("available_end_time"), // e.g., "22:00"
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMenuSchema = createInsertSchema(menus).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMenu = z.infer<typeof insertMenuSchema>;
export type Menu = typeof menus.$inferSelect;

// Menu Categories - Organize menu items into categories
export const menuCategories = pgTable("menu_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  menuId: varchar("menu_id").references(() => menus.id).notNull(),
  
  // Category Details
  name: text("name").notNull(), // e.g., "Appetizers", "Entrees", "Desserts"
  description: text("description"),
  displayOrder: integer("display_order").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMenuCategorySchema = createInsertSchema(menuCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMenuCategory = z.infer<typeof insertMenuCategorySchema>;
export type MenuCategory = typeof menuCategories.$inferSelect;

// Menu Items - Individual items on the menu
export const menuItems = pgTable("menu_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  menuId: varchar("menu_id").references(() => menus.id).notNull(),
  categoryId: varchar("category_id").references(() => menuCategories.id),
  
  // Item Details
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  imageUrl: text("image_url"),
  
  // Availability
  isAvailable: boolean("is_available").default(true),
  displayOrder: integer("display_order").default(0),
  
  // Additional Info
  preparationTime: integer("preparation_time"), // in minutes
  calories: integer("calories"),
  allergens: text("allergens").array().default(sql`ARRAY[]::text[]`),
  dietaryInfo: text("dietary_info").array().default(sql`ARRAY[]::text[]`), // e.g., vegetarian, vegan, gluten-free
  
  // Options & Customization
  customizationOptions: jsonb("customization_options"), // {size: ['small', 'medium', 'large'], toppings: [...]}
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem = typeof menuItems.$inferSelect;

// Orders - Completed purchases
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  siteConfigId: varchar("site_config_id").references(() => siteConfigs.id).notNull(),
  cartId: varchar("cart_id"),
  customerId: varchar("customer_id").references(() => customers.id),
  
  // Order Number
  orderNumber: text("order_number").notNull().unique(),
  
  // Customer Info
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone").notNull(),
  
  // Order Type
  orderType: text("order_type").notNull().default("delivery"), // 'delivery', 'pickup', 'dine-in'
  
  // Delivery Info
  deliveryAddress: text("delivery_address"),
  deliveryInstructions: text("delivery_instructions"),
  
  // Pricing
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: numeric("tax_amount", { precision: 10, scale: 2 }).default("0"),
  deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 }).default("0"),
  tipAmount: numeric("tip_amount", { precision: 10, scale: 2 }).default("0"),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  
  // Payment
  paymentMethod: text("payment_method"), // 'card', 'cash', 'online'
  paymentStatus: text("payment_status").default("pending"), // 'pending', 'paid', 'failed', 'refunded'
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  
  // Order Status
  status: text("status").default("pending"), // 'pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'
  
  // Fulfillment
  estimatedReadyTime: timestamp("estimated_ready_time"),
  estimatedDeliveryTime: timestamp("estimated_delivery_time"),
  actualDeliveryTime: timestamp("actual_delivery_time"),
  
  // Notes
  customerNotes: text("customer_notes"),
  internalNotes: text("internal_notes"),
  
  // Timestamps
  confirmedAt: timestamp("confirmed_at"),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// Order Items - Items in a completed order
export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id).notNull(),
  menuItemId: varchar("menu_item_id").references(() => menuItems.id).notNull(),
  
  // Item Details
  itemName: text("item_name").notNull(), // Snapshot of item name at time of order
  itemDescription: text("item_description"),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
  
  // Customizations
  customizations: jsonb("customizations"), // Selected options and modifications
  specialInstructions: text("special_instructions"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
  createdAt: true,
});

export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

// Inquiries - Contact form submissions and customer inquiries
export const inquiries = pgTable("inquiries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Customer Information
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  
  // Inquiry Details
  subject: text("subject"),
  message: text("message").notNull(),
  source: text("source").default("website"), // 'website', 'chat', 'phone', 'email', 'sms'
  
  // Status & Assignment
  status: text("status").default("new"), // 'new', 'viewed', 'in_progress', 'resolved', 'closed'
  priority: text("priority").default("normal"), // 'low', 'normal', 'high', 'urgent'
  assignedTo: varchar("assigned_to").references(() => users.id),
  
  // Response & Notes
  response: text("response"),
  internalNotes: text("internal_notes"),
  
  // Tracking
  viewedAt: timestamp("viewed_at"),
  respondedAt: timestamp("responded_at"),
  resolvedAt: timestamp("resolved_at"),
  
  // Metadata
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertInquirySchema = createInsertSchema(inquiries, {
  source: z
    .enum(["website", "chat", "phone", "email", "sms"])
    .default("website"),
  status: z
    .enum(["new", "viewed", "in_progress", "resolved", "closed"])
    .default("new"),
  priority: z
    .enum(["low", "normal", "high", "urgent"])
    .default("normal"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInquiry = z.infer<typeof insertInquirySchema>;
export type Inquiry = typeof inquiries.$inferSelect;

// ==========================================
// B2B Travel OS – GRN Connect Hotels & SerpAPI Flights (System of Record)
// ==========================================

/** GRN Connect hotels: hotel_code + google_place_id from Spatial Join for re-fetching live rates */
export const b2bHotels = pgTable("b2b_hotels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hotelCode: text("hotel_code").notNull(), // GRN identifier (H! prefix stripped for API calls)
  googlePlaceId: text("google_place_id"), // Google Places ID linked via Spatial Join / matching
  /** FK to platform_business_map(platform_id). Links GRN hotel to our internal platform identity. */
  platformId: uuid("platform_id"),
  name: text("name"),
  rawResponse: jsonb("raw_response"), // full GRN response for replay/audit
  createdAt: timestamp("created_at").defaultNow().notNull(),
},
(table) => [
  index("idx_b2b_hotels_platform_id").on(table.platformId),
  index("idx_b2b_hotels_hotel_code").on(table.hotelCode),
]);

export const insertB2bHotelSchema = createInsertSchema(b2bHotels).omit({ id: true, createdAt: true });
export type InsertB2bHotel = z.infer<typeof insertB2bHotelSchema>;
export type B2bHotel = typeof b2bHotels.$inferSelect;

/** SerpAPI flights: booking_token + IATA for Continental Handshake (arrival → hotel check-in) */
export const b2bFlights = pgTable("b2b_flights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingToken: text("booking_token").notNull(), // SerpAPI
  departureId: text("departure_id").notNull(), // IATA
  arrivalId: text("arrival_id").notNull(), // IATA
  rawResponse: jsonb("raw_response"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertB2bFlightSchema = createInsertSchema(b2bFlights).omit({ id: true, createdAt: true });
export type InsertB2bFlight = z.infer<typeof insertB2bFlightSchema>;
export type B2bFlight = typeof b2bFlights.$inferSelect;

/** Agent-specific markup rules for AgentMarkupComponent (percentage vs flat fee) */
export const b2bAgentMarkups = pgTable("b2b_agent_markups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").references(() => agents.id),
  agentRef: text("agent_ref"), // name or external id if no agents.id
  type: text("type").notNull(), // 'percentage' | 'flat_fee'
  value: numeric("value", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertB2bAgentMarkupSchema = createInsertSchema(b2bAgentMarkups).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertB2bAgentMarkup = z.infer<typeof insertB2bAgentMarkupSchema>;
export type B2bAgentMarkup = typeof b2bAgentMarkups.$inferSelect;

/** In-progress / completed itineraries per client and Trip Anchor (orchestrator state) */
export const b2bItineraries = pgTable("b2b_itineraries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientRef: text("client_ref").notNull(), // client or session identifier
  tripAnchor: text("trip_anchor"), // e.g. place name or ID for "Continental Handshake"
  status: text("status").notNull().default("in_progress"), // 'in_progress' | 'completed'
  thoughtState: jsonb("thought_state"), // orchestrator thought_signature / selections
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertB2bItinerarySchema = createInsertSchema(b2bItineraries).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertB2bItinerary = z.infer<typeof insertB2bItinerarySchema>;
export type B2bItinerary = typeof b2bItineraries.$inferSelect;

/** Leads (hotel or flight) added to an itinerary; links to b2b_hotels or b2b_flights */
export const b2bItineraryItems = pgTable("b2b_itinerary_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  itineraryId: varchar("itinerary_id").references(() => b2bItineraries.id).notNull(),
  leadType: text("lead_type").notNull(), // 'hotel' | 'flight'
  hotelId: varchar("hotel_id").references(() => b2bHotels.id),
  flightId: varchar("flight_id").references(() => b2bFlights.id),
  markupApplied: numeric("markup_applied", { precision: 10, scale: 2 }),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertB2bItineraryItemSchema = createInsertSchema(b2bItineraryItems).omit({ id: true, createdAt: true });
export type InsertB2bItineraryItem = z.infer<typeof insertB2bItineraryItemSchema>;
export type B2bItineraryItem = typeof b2bItineraryItems.$inferSelect;

/** Curation audit: every drag/add/markup change in Agent Curation Panel (lead scoring for GRN) */
export const b2bCurationEvents = pgTable("b2b_curation_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  itineraryId: varchar("itinerary_id").references(() => b2bItineraries.id),
  leadType: text("lead_type").notNull(),
  leadId: text("lead_id").notNull(), // hotel_id or flight_id
  eventType: text("event_type").notNull(), // 'added' | 'removed' | 'markup_changed'
  agentId: varchar("agent_id").references(() => agents.id),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertB2bCurationEventSchema = createInsertSchema(b2bCurationEvents).omit({ id: true, createdAt: true });
export type InsertB2bCurationEvent = z.infer<typeof insertB2bCurationEventSchema>;
export type B2bCurationEvent = typeof b2bCurationEvents.$inferSelect;

// ============================================================
// Platform Business Map – one row per onboarded platformId.
// Maps a platform's site config to external provider IDs.
// Created by the healing layer (PR #2); enrichment snapshots FK to this.
// ============================================================

/**
 * Maps each site_config to a stable internal platform_id (UUID).
 * External identifiers (Google place_id, CID, SerpApi ID) become attributes
 * that can change over time without affecting internal references.
 */
export const platformBusinessMap = pgTable(
  "platform_business_map",
  {
    /** Stable UUID assigned at onboarding; used as the public platformId. */
    platformId: uuid("platform_id").primaryKey().defaultRandom(),
    /** FK to the site_configs row that owns this platform. One-to-one. */
    siteConfigId: varchar("site_config_id")
      .notNull()
      .unique()
      .references(() => siteConfigs.id, { onDelete: "cascade" }),
    /** Google CID (unique per business). */
    googleCid: text("google_cid").unique(),
    /** Google Place ID (if known). */
    googlePlaceId: text("google_place_id"),
    /** Cached SerpApi data_id for google_maps / google_maps_reviews engines. */
    serpapiDataId: text("serpapi_data_id"),
    /** Normalized business-category slug (e.g. 'restaurant', 'hotel'). */
    categorySlug: text("category_slug"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_platform_map_place_id").on(table.googlePlaceId),
    index("idx_platform_map_serpapi_id").on(table.serpapiDataId),
  ],
);

export const insertPlatformBusinessMapSchema = createInsertSchema(platformBusinessMap).omit({
  platformId: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPlatformBusinessMap = z.infer<typeof insertPlatformBusinessMapSchema>;
export type PlatformBusinessMap = typeof platformBusinessMap.$inferSelect;

// ============================================================
// Platform Business Enrichment Snapshots
// Raw provider payloads stored per platformId.
// Written by the admin-only enrich_business_profile tool; never by voice path.
// ============================================================
export const platformBusinessEnrichmentSnapshots = pgTable(
  "platform_business_enrichment_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** FK to platform_business_map(platform_id). */
    platformId: uuid("platform_id")
      .references(() => platformBusinessMap.platformId, { onDelete: "cascade" })
      .notNull(),
    /**
     * Provider identifier, e.g.:
     *   'serpapi_google_maps_place'
     *   'serpapi_google_maps_reviews_merged'
     */
    provider: text("provider").notNull(),
    /** Optional provider-specific reference key (e.g. SerpApi data_id). */
    providerRef: text("provider_ref"),
    /** Raw provider response or merged payload. */
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_enrichment_snapshots_platform_id").on(table.platformId),
    index("idx_enrichment_snapshots_provider").on(table.provider),
    index("idx_enrichment_snapshots_platform_provider").on(table.platformId, table.provider),
  ],
);

export const insertEnrichmentSnapshotSchema = createInsertSchema(
  platformBusinessEnrichmentSnapshots,
).omit({ id: true, createdAt: true });
export type InsertEnrichmentSnapshot = z.infer<typeof insertEnrichmentSnapshotSchema>;
export type EnrichmentSnapshot = typeof platformBusinessEnrichmentSnapshots.$inferSelect;

// --- SOVEREIGN SMS ROUTER COMPLIANCE TABLES ---

export const smsIntentEnum = pgEnum("sms_intent", [
  "PLATFORM_OTP", "PLATFORM_CARE", "PLATFORM_MKTG",
  "CUSTOMER_OTP", "CUSTOMER_CARE", "CUSTOMER_MKTG"
]);

export const smsOptOuts = pgTable("sms_opt_outs", {
  id: uuid("id").defaultRandom().primaryKey(),
  phoneNumber: text("phone_number").notNull(),
  siteConfigId: varchar("site_config_id").references(() => siteConfigs.id),
  reason: text("reason").notNull().default("STOP keyword received"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const smsLogs = pgTable("sms_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  siteConfigId: varchar("site_config_id").references(() => siteConfigs.id).notNull(),
  twilioMessageSid: text("twilio_message_sid"),
  messagingServiceSid: text("messaging_service_sid").notNull(),
  intent: smsIntentEnum("intent").notNull(),
  toPhoneNumber: text("to_phone_number").notNull(),
  fromPhoneNumber: text("from_phone_number"),
  body: text("body").notNull(),
  status: text("status").notNull().default("queued"),
  segments: integer("segments").default(1).notNull(),
  cost: numeric("cost", { precision: 10, scale: 4 }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// Industry Agent Template Engine
// 8 Business Groups × 6 Archetypes = 48 pre-tuned psychological profiles
// ==========================================

export const INDUSTRY_GROUPS = [
  'food_beverage',
  'health_wellness',
  'home_services',
  'professional_services',
  'hospitality_travel',
  'retail',
  'real_estate',
  'automotive',
  'investor_remodeling',
] as const;

export type IndustryGroup = typeof INDUSTRY_GROUPS[number];

export const AGENT_ARCHETYPES = [
  'concierge',            // High I/S — warm welcome, FAQ, routing
  'booking_coordinator',  // High C/D — calendar ops, commits
  'lead_qualifier',       // High D/I — capture, qualify, prep for human closer
  'retention_empath',     // Max S / High ARCH-A — de-escalation, make it right
  'billing_analyst',      // Max C — invoices, payments, Stripe links
  'gatekeeper',           // High S/C mid-D — triage, protect, route main line
] as const;

export type AgentArchetype = typeof AGENT_ARCHETYPES[number];

/**
 * Pre-tuned agent personality templates — one per (industryGroup × archetype).
 * On business signup, all 6 archetypes for the detected industry are cloned into the
 * site's agent roster. The owner sees a fully configured team on day one.
 */
export const industryAgentTemplates = pgTable("industry_agent_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Categorization
  industryGroup: text("industry_group").notNull(),   // IndustryGroup
  roleType: text("role_type").notNull(),             // AgentArchetype

  // Identity
  defaultName: text("default_name").notNull(),        // e.g. "Sarah (Intake Specialist)"
  voiceId: text("voice_id").default("Kore"),          // Gemini voice character
  voiceName: text("voice_name").default("Kore - Calm & Professional"),
  avatarId: text("avatar_id").default("avatar1"),

  // Character Architecture — Layer 1
  shortTermMemoryTemplate: text("short_term_memory_template"),
  longTermCoreTemplate: text("long_term_core_template"),
  primaryIntent: text("primary_intent"),
  worldView: text("world_view"),
  unbreakableRule: text("unbreakable_rule"),

  // Layer 2: Pre-tuned DISC Psychology (0-100)
  dominance: integer("dominance").notNull().default(50),
  influence: integer("influence").notNull().default(50),
  steadiness: integer("steadiness").notNull().default(50),
  conscientiousness: integer("conscientiousness").notNull().default(50),

  // Layer 3: ARCH Conversation Mechanics (0-100)
  archAcknowledge: integer("arch_acknowledge").notNull().default(60),
  archReflect: integer("arch_reflect").notNull().default(50),
  archContext: integer("arch_context").notNull().default(60),
  archHandoff: integer("arch_handoff").notNull().default(50),

  // Default Tools & Config
  defaultTools: jsonb("default_tools").default([]),
  defaultSystemPrompt: text("default_system_prompt"),

  // Meta
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertIndustryAgentTemplateSchema = createInsertSchema(industryAgentTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertIndustryAgentTemplate = z.infer<typeof insertIndustryAgentTemplateSchema>;
export type IndustryAgentTemplate = typeof industryAgentTemplates.$inferSelect;

// Google Places types → Industry Group mapping
export const PLACES_TYPE_TO_INDUSTRY: Record<string, IndustryGroup> = {
  // Food & Beverage
  restaurant: 'food_beverage', cafe: 'food_beverage', bar: 'food_beverage',
  bakery: 'food_beverage', meal_takeaway: 'food_beverage', meal_delivery: 'food_beverage',
  food: 'food_beverage', night_club: 'food_beverage',
  // Health & Wellness
  beauty_salon: 'health_wellness', hair_care: 'health_wellness', spa: 'health_wellness',
  gym: 'health_wellness', physiotherapist: 'health_wellness', dentist: 'health_wellness',
  doctor: 'health_wellness', health: 'health_wellness',
  // Home Services
  plumber: 'home_services', electrician: 'home_services', painter: 'home_services',
  roofing_contractor: 'home_services', general_contractor: 'home_services',
  home_goods_store: 'home_services', locksmith: 'home_services',
  // Professional Services
  lawyer: 'professional_services', accounting: 'professional_services',
  insurance_agency: 'professional_services', finance: 'professional_services',
  real_estate_agency: 'real_estate',
  // Hospitality & Travel
  lodging: 'hospitality_travel', hotel: 'hospitality_travel', motel: 'hospitality_travel',
  travel_agency: 'hospitality_travel', tourist_attraction: 'hospitality_travel',
  // Retail
  store: 'retail', clothing_store: 'retail', shoe_store: 'retail',
  jewelry_store: 'retail', book_store: 'retail', electronics_store: 'retail',
  furniture_store: 'retail', shopping_mall: 'retail',
  // Real Estate
  real_estate: 'real_estate', moving_company: 'real_estate',
  // Automotive
  car_dealer: 'automotive', car_repair: 'automotive', car_wash: 'automotive',
  gas_station: 'automotive', parking: 'automotive',
};

// Tier-2 CMO: review signals and marketing artifacts
export const reviewSignals = pgTable("review_signals", {
  signalId: uuid("signal_id").defaultRandom().primaryKey(),
  reviewId: text("review_id").notNull(),
  dataId: text("data_id").notNull(),
  topic: text("topic").notNull(),
  aspect: text("aspect").notNull(),
  sentiment: text("sentiment").notNull(),
  emotion: text("emotion").notNull(),
  keyPhrases: jsonb("key_phrases").$type<string[]>().default([]).notNull(),
  frictionPhrases: jsonb("friction_phrases").$type<string[]>().default([]).notNull(),
  differentiatorPhrases: jsonb("differentiator_phrases").$type<string[]>().default([]).notNull(),
  context: jsonb("context").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reviewArtifacts = pgTable("review_artifacts", {
  artifactId: uuid("artifact_id").defaultRandom().primaryKey(),
  artifactType: text("artifact_type").notNull(),
  tenantId: text("tenant_id").notNull(),
  generatedBy: text("generated_by").notNull(),
  evidenceReviewIds: jsonb("evidence_review_ids").$type<string[]>().default([]).notNull(),
  evidenceSignalIds: jsonb("evidence_signal_ids").$type<string[]>().default([]).notNull(),
  evidenceSummary: text("evidence_summary").notNull(),
  targetMetric: text("target_metric").notNull(),
  metricSource: text("metric_source").notNull(),
  status: text("status").notNull(),
  frontmatter: jsonb("frontmatter").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Onboarding Sessions — 5-step AI Biz Bot business onboarding flow ──────────
export const onboardingSessions = pgTable("onboarding_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  siteConfigId: varchar("site_config_id").references(() => siteConfigs.id, { onDelete: "cascade" }).notNull(),
  currentStep: integer("current_step").default(1).notNull(),
  collectedData: jsonb("collected_data").$type<Record<string, unknown>>().default({}).notNull(),
  status: text("status").default("in_progress").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type OnboardingSession = typeof onboardingSessions.$inferSelect;
export type InsertOnboardingSession = typeof onboardingSessions.$inferInsert;

// ── Visitor Sessions (Buyer Journey Payload Node) ─────────────────────────────
/** Cross-session visitor context accumulating buyer phase, pain points, and signals. */
export const visitorSessions = pgTable("visitor_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  visitorId: text("visitor_id").notNull(),
  siteConfigId: varchar("site_config_id").references(() => siteConfigs.id, { onDelete: "cascade" }).notNull(),
  firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  channel: text("channel").default("web").notNull(),
  /** Accumulated buyer journey state (BuyerJourney shape from conversationGrounding.ts). */
  buyerJourney: jsonb("buyer_journey").$type<Record<string, unknown>>().default({}).notNull(),
  /**
   * Security classification for this visitor session.
   * anonymous  — no identity verification performed
   * phone_verified — OTP confirmed via Twilio Verify
   * admin       — admin_users row matched + auth session created
   */
  securityLevel: text("security_level").default("anonymous").notNull(),
  /** Phone number if verified, null for anonymous visitors */
  verifiedPhone: text("verified_phone"),
});

export type VisitorSession = typeof visitorSessions.$inferSelect;
export type InsertVisitorSession = typeof visitorSessions.$inferInsert;
