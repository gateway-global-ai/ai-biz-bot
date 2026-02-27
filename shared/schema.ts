import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, jsonb, timestamp, numeric, pgEnum, uuid, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
export type AIModelProvider = "moonshot" | "huggingface" | "openai" | "anthropic";

export interface AIModelSettings {
  provider: AIModelProvider;
  modelId: string;
  temperature: number;
  maxTokens: number;
}

// AI Agents table
export const agents = pgTable("agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  voiceId: text("voice_id").notNull(),
  voiceName: text("voice_name").notNull(),
  status: text("status").notNull().default("active"), // active, paused, inactive
  dominance: integer("dominance").default(50),
  influence: integer("influence").default(50),
  steadiness: integer("steadiness").default(50),
  conscientiousness: integer("conscientiousness").default(50),
  avatarId: text("avatar_id").default("avatar1"), // character avatar for chat backdrop
  systemPrompt: text("system_prompt"),
  // Agent-specific telephony
  phoneNumber: text("phone_number"),
  phoneSid: text("phone_sid"),
  // AI Model Configuration
  aiModelProvider: text("ai_model_provider").default("moonshot"), // moonshot, huggingface, openai, anthropic
  aiModelId: text("ai_model_id").default("moonshot-v1-128k"),
  aiTemperature: integer("ai_temperature").default(60), // Stored as 0-100, divide by 100 for actual value
  aiMaxTokens: integer("ai_max_tokens").default(4096),
  hfToken: text("hf_token"), // User's HuggingFace token (encrypted)
  // Voice AI Configuration (Google Gemini)
  voiceModel: text("voice_model").default("gemini-2.5-flash-native-audio-preview-12-2025"), // Gemini model for voice
  voiceRole: text("voice_role").default("AI Business Assistant"),
  voiceCompanyName: text("voice_company_name").default("AI Biz Bot"),
  voicePersona: text("voice_persona").default("friendly"), // professional, friendly, enthusiastic, calm, authoritative
  // Budget Configuration
  budgetAmountUsd: numeric("budget_amount_usd", { precision: 10, scale: 2 }).default("0"),
  budgetPeriod: text("budget_period").default("monthly"), // daily, weekly, monthly
  budgetSpentUsd: numeric("budget_spent_usd", { precision: 10, scale: 2 }).default("0"),
  budgetResetAt: timestamp("budget_reset_at"),
  // Startup Script
  startupScript: text("startup_script"),
  startupBudgetUsd: numeric("startup_budget_usd", { precision: 10, scale: 2 }).default("0"),
  startupStatus: text("startup_status").default("pending"), // pending, running, completed, failed
  startupResultSummary: text("startup_result_summary"),
  startupLastRunAt: timestamp("startup_last_run_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAgentSchema = createInsertSchema(agents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;

// Customers/Leads table
export const customers = pgTable("customers", {
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
  lastContactAt: timestamp("last_contact_at"),
  followUpAt: timestamp("follow_up_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

// MVP Tasks table - for 24-hour trial tasks
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userName: text("user_name").notNull(),
  userPhone: text("user_phone").notNull(),
  agentName: text("agent_name").notNull(),
  personalityId: text("personality_id").notNull(), // achiever, collaborator, supporter, analyst
  task: text("task").notNull(),
  parsedTask: jsonb("parsed_task"), // Parsed task details from Kimi
  status: text("status").notNull().default("pending"), // pending, started, in_progress, completed, failed
  estimatedHours: integer("estimated_hours").default(24),
  dominance: integer("dominance").default(50),
  influence: integer("influence").default(50),
  steadiness: integer("steadiness").default(50),
  conscientiousness: integer("conscientiousness").default(50),
  result: text("result"), // Final task result
  nextUpdateAt: timestamp("next_update_at"), // When to send next SMS update
  updatesCount: integer("updates_count").default(0), // Number of updates sent
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// Admin users for OTP authentication
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone").notNull().unique(),
  name: text("name"),
  role: text("role").default("admin"), // admin, superadmin
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

// A2P 10-DLC Compliance - Brand Registration
export const a2pBrands = pgTable("a2p_brands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").references(() => customers.id),
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

// Knowledge Topics - Tracks what people want to learn about (defined first for references)
export const knowledgeTopics = pgTable("knowledge_topics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  normalizedTopic: text("normalized_topic").notNull().unique(), // Lowercase, trimmed for matching
  displayTopic: text("display_topic").notNull(), // Original user input
  requestCount: integer("request_count").default(1),
  currentVersion: integer("current_version").default(1),
  bestLessonId: varchar("best_lesson_id"), // Reference to best performing lesson
  tags: text("tags").array().default(sql`ARRAY[]::text[]`), // For topic clustering
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertKnowledgeTopicSchema = createInsertSchema(knowledgeTopics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertKnowledgeTopic = z.infer<typeof insertKnowledgeTopicSchema>;
export type KnowledgeTopic = typeof knowledgeTopics.$inferSelect;

// Micro-Learning Lesson Plans - Self-Improving Knowledge Base
export const lessonPlans = pgTable("lesson_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  topicId: varchar("topic_id").references(() => knowledgeTopics.id),
  version: integer("version").default(1),
  topic: text("topic").notNull(),
  title: text("title").notNull(),
  syllabus: jsonb("syllabus"), // Array of {id, title, description}
  initialContent: jsonb("initial_content"), // BoardContent object
  quiz: jsonb("quiz"), // Array of QuizQuestion
  environmentDescription: text("environment_description"),
  instructorDescription: text("instructor_description"),
  backgroundImageUrl: text("background_image_url"),
  instructorImageUrl: text("instructor_image_url"),
  completionCount: integer("completion_count").default(0),
  avgQuizScore: integer("avg_quiz_score"), // Stored as 0-100
  totalQuizAttempts: integer("total_quiz_attempts").default(0),
  feedback: jsonb("feedback"), // Array of user feedback strings
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLessonPlanSchema = createInsertSchema(lessonPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLessonPlan = z.infer<typeof insertLessonPlanSchema>;
export type LessonPlan = typeof lessonPlans.$inferSelect;

// Lesson Sessions - Tracks each learning session for improvement data
export const lessonSessions = pgTable("lesson_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lessonPlanId: varchar("lesson_plan_id").references(() => lessonPlans.id),
  userPhone: text("user_phone"), // Optional - for SMS-triggered lessons
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  quizScore: integer("quiz_score"), // 0-100
  slidesViewed: integer("slides_viewed").default(0),
  totalSlides: integer("total_slides"),
  feedback: text("feedback"),
  rating: integer("rating"), // 1-5 stars
});

export const insertLessonSessionSchema = createInsertSchema(lessonSessions).omit({
  id: true,
  startedAt: true,
});

export type InsertLessonSession = z.infer<typeof insertLessonSessionSchema>;
export type LessonSession = typeof lessonSessions.$inferSelect;

// Organizations - Top-level grouping for projects (like GitHub orgs)
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;

// Projects - Belong to an organization, have assigned agents
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"), // active, completed, archived
  leadAgentId: varchar("lead_agent_id").references(() => agents.id),
  agentIds: text("agent_ids").array().default(sql`ARRAY[]::text[]`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Project Tasks - Work items within a project
export const projectTasks = pgTable("project_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("todo"), // todo, in_progress, review, done
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  assignedAgentId: varchar("assigned_agent_id").references(() => agents.id),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProjectTaskSchema = createInsertSchema(projectTasks).omit({
  id: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProjectTask = z.infer<typeof insertProjectTaskSchema>;
export type ProjectTask = typeof projectTasks.$inferSelect;

// Bot Templates - pre-configured bot personalities (from Gateway Bot Matrix)
export const botTemplates = pgTable("bot_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").default("custom"),
  defaultSystemPrompt: text("default_system_prompt").notNull(),
  defaultModel: text("default_model").default("kimi"),
  defaultTools: jsonb("default_tools").default({}),
  defaultUiConfig: jsonb("default_ui_config").default({}),
  icon: text("icon").default("Bot"),
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBotTemplateSchema = createInsertSchema(botTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBotTemplate = z.infer<typeof insertBotTemplateSchema>;
export type BotTemplate = typeof botTemplates.$inferSelect;

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
    maxBusinesses: 1,
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
  /** Per-business subscription plan: 'free' | 'pro' | 'voice' | 'enterprise' */
  plan: text("plan").default("free"),
  /** AI-generated or custom hero image URL stored on the platform */
  heroImageUrl: text("hero_image_url"),
  /** Prompt used to generate the hero image (stored for regeneration) */
  heroImagePrompt: text("hero_image_prompt"),
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSiteConfigSchema = createInsertSchema(siteConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSiteConfig = z.infer<typeof insertSiteConfigSchema>;
export type SiteConfig = typeof siteConfigs.$inferSelect;

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

/** Tour specifications (YAML-derived or manual) for featured partners. */
export const tourSpecifications = pgTable("tour_specifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  placeId: text("place_id"),
  partnerId: text("partner_id"),
  tourId: text("tour_id").notNull().unique(),
  spec: jsonb("spec").notNull(), // { segments: TourSegment[] }
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type TourSpecificationRow = typeof tourSpecifications.$inferSelect;

/** Featured Partners - Preferential placement for Clear Voice partners (e.g. Boardwalk Suites). */
export const featuredPartners = pgTable("featured_partners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  grnHotelId: varchar("grn_hotel_id"),
  googlePlaceId: text("google_place_id"),
  businessName: text("business_name").notNull(),
  cityCode: text("city_code").notNull(),
  category: text("category"),
  aiHook: text("ai_hook"),
  aiTags: jsonb("ai_tags").$type<string[]>(),
  aiStory: text("ai_story"),
  aiTriggerConditions: jsonb("ai_trigger_conditions"),
  uiThemeGlow: text("ui_theme_glow"),
  badgeLabel: text("badge_label").default("Certified Local"),
  storyVideoUrl: text("story_video_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export type FeaturedPartnerRow = typeof featuredPartners.$inferSelect;

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

export const vlmProspects = pgTable("vlm_prospects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  industry: text("industry").notNull(),
  businessName: text("business_name").notNull(),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  googlePlaceId: text("google_place_id").unique(),
  sourceUrl: text("source_url"),
  qualityScore: integer("quality_score").default(0).notNull(),
  status: text("status").default("new").notNull(),
  rating: numeric("rating", { precision: 2, scale: 1 }),
  reviewCount: integer("review_count"),
  editorialSummary: text("editorial_summary"),
  generativeSummary: text("generative_summary"),
  reviewSummary: text("review_summary"),
  reviews: jsonb("reviews").$type<GoogleReviewData[]>(),
  photos: jsonb("photos").$type<GooglePhotoData[]>(),
  websiteQualityScore: integer("website_quality_score"),
  websiteQualityReport: jsonb("website_quality_report"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVlmProspectSchema = createInsertSchema(vlmProspects, {
  industry: z.string().min(1),
  businessName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  qualityScore: z.number().int().min(0).max(100).optional(),
  status: z.enum(["new", "queued", "called", "won", "lost"]).optional(),
  rating: z.string().optional(),
  reviewCount: z.number().int().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertVlmProspect = z.infer<typeof insertVlmProspectSchema>;
export type VlmProspect = typeof vlmProspects.$inferSelect;

export const vlmCampaigns = pgTable("vlm_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  industry: text("industry").notNull(),
  city: text("city").notNull(),
  status: text("status").default("draft").notNull(),
  telephonyConfigId: varchar("telephony_config_id").references(() => telephonyConfigs.id),
  callerIdNumber: text("caller_id_number"),
  scriptTemplate: text("script_template"),
  maxCallsPerDay: integer("max_calls_per_day").default(50),
  callsPerHour: integer("calls_per_hour").default(10),
  retryAttempts: integer("retry_attempts").default(3),
  retryDelayHours: integer("retry_delay_hours").default(24),
  totalProspects: integer("total_prospects").default(0),
  totalCalled: integer("total_called").default(0),
  totalConnected: integer("total_connected").default(0),
  totalSales: integer("total_sales").default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVlmCampaignSchema = createInsertSchema(vlmCampaigns, {
  name: z.string().min(1),
  industry: z.string().min(1),
  city: z.string().min(1),
  status: z.enum(["draft", "active", "paused", "completed"]).optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertVlmCampaign = z.infer<typeof insertVlmCampaignSchema>;
export type VlmCampaign = typeof vlmCampaigns.$inferSelect;

export const vlmCallAttempts = pgTable("vlm_call_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").references(() => vlmCampaigns.id),
  prospectId: varchar("prospect_id").references(() => vlmProspects.id).notNull(),
  attemptNumber: integer("attempt_number").default(1).notNull(),
  callSid: text("call_sid"),
  status: text("status").default("pending").notNull(),
  outcome: text("outcome"),
  duration: integer("duration").default(0),
  recordingUrl: text("recording_url"),
  notes: text("notes"),
  calledAt: timestamp("called_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVlmCallAttemptSchema = createInsertSchema(vlmCallAttempts, {
  attemptNumber: z.number().int().min(1).max(10),
  status: z.enum(["pending", "queued", "ringing", "in_progress", "completed", "failed", "no_answer", "busy"]).optional(),
  outcome: z.enum(["connected", "voicemail", "no_answer", "rejected", "sale", "callback"]).optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertVlmCallAttempt = z.infer<typeof insertVlmCallAttemptSchema>;
export type VlmCallAttempt = typeof vlmCallAttempts.$inferSelect;

export type VlmLeadBuilderOptions = {
  city: string;
  industry: string;
  maxResults?: number;
  enrichEmail?: boolean;
};

export type VlmCampaignConfig = {
  name: string;
  industry: string;
  city: string;
  callerIdNumber?: string;
  scriptTemplate?: string;
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

// SWOT Analysis Results (legacy; workspace config is defined above with siteConfigId)
export const swotAnalyses = pgTable("swot_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").references(() => customerAccounts.id).notNull(),
  
  // Analysis Data (stored as JSON)
  strengths: jsonb("strengths").notNull(),
  weaknesses: jsonb("weaknesses").notNull(),
  opportunities: jsonb("opportunities").notNull(),
  threats: jsonb("threats").notNull(),
  
  // Recommendations
  recommendations: jsonb("recommendations"),
  agentTrainingData: jsonb("agent_training_data"),
  
  // Metadata
  analysisSource: text("analysis_source"), // 'google_places' | 'manual' | 'ai_generated'
  confidence: integer("confidence"), // 0-100
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSwotAnalysisSchema = createInsertSchema(swotAnalyses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSwotAnalysis = z.infer<typeof insertSwotAnalysisSchema>;
export type SwotAnalysis = typeof swotAnalyses.$inferSelect;

// AI Biz Bot Consultations
export const consultations = pgTable("consultations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").references(() => customerAccounts.id).notNull(),
  workspaceConfigId: varchar("workspace_config_id").references(() => workspaceConfigurations.id),
  swotAnalysisId: varchar("swot_analysis_id").references(() => swotAnalyses.id),
  
  // Consultation Data
  conversationHistory: jsonb("conversation_history").notNull(), // Array of messages
  consultationSummary: text("consultation_summary"),
  insights: jsonb("insights"), // Extracted insights from conversation
  
  // Customization Results
  customTools: jsonb("custom_tools"),
  customizationApplied: boolean("customization_applied").default(false),
  
  // Status
  status: text("status").default("in_progress"), // 'in_progress' | 'completed' | 'abandoned'
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertConsultationSchema = createInsertSchema(consultations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertConsultation = z.infer<typeof insertConsultationSchema>;
export type Consultation = typeof consultations.$inferSelect;

// Agent Knowledge Base - Research and Documentation Storage
export const agentKnowledgeBase = pgTable("agent_knowledge_base", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Topic/Category
  category: text("category").notNull(), // 'google_api' | 'business_tools' | 'integration' | 'research'
  subcategory: text("subcategory"), // e.g., 'places_api', 'workspace', 'gmail', etc.
  title: text("title").notNull(),
  
  // Content
  content: text("content").notNull(), // Main research/documentation content (markdown)
  summary: text("summary"), // Short summary for quick reference
  metadata: jsonb("metadata"), // Flexible JSON for API details, costs, access info, etc.
  
  // Source Information
  sources: jsonb("sources"), // Array of {url, title, date, credibility}
  researchedBy: text("researched_by"), // Agent or user who created this
  lastVerified: timestamp("last_verified"), // When info was last verified
  
  // Tags and Search
  tags: text("tags").array().default(sql`ARRAY[]::text[]`),
  keywords: text("keywords").array().default(sql`ARRAY[]::text[]`), // For search optimization
  
  // Usage Tracking
  accessCount: integer("access_count").default(0),
  lastAccessed: timestamp("last_accessed"),
  
  // Version Control
  version: integer("version").default(1),
  parentId: varchar("parent_id"), // For tracking document versions
  
  // Status
  status: text("status").default("active"), // 'draft' | 'active' | 'archived' | 'outdated'
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAgentKnowledgeBaseSchema = createInsertSchema(agentKnowledgeBase).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAgentKnowledgeBase = z.infer<typeof insertAgentKnowledgeBaseSchema>;
export type AgentKnowledgeBase = typeof agentKnowledgeBase.$inferSelect;

// API Documentation - Specific to Google Business APIs
export const apiDocumentation = pgTable("api_documentation", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  knowledgeBaseId: varchar("knowledge_base_id").references(() => agentKnowledgeBase.id),
  
  // API Details
  apiName: text("api_name").notNull(), // e.g., "Google Places API", "Google Workspace API"
  apiType: text("api_type").notNull(), // 'rest' | 'graphql' | 'grpc' | 'sdk'
  version: text("version"), // API version
  
  // Access Information
  accessType: text("access_type"), // 'public' | 'private' | 'enterprise' | 'restricted'
  authenticationMethod: text("authentication_method"), // 'api_key' | 'oauth' | 'service_account'
  requiresApproval: boolean("requires_approval").default(false),
  
  // Pricing
  pricingModel: text("pricing_model"), // 'free' | 'pay_per_use' | 'subscription' | 'enterprise'
  pricingDetails: jsonb("pricing_details"), // Detailed pricing tiers and costs
  freeTier: jsonb("free_tier"), // Free tier limits if applicable
  
  // Rate Limits
  rateLimits: jsonb("rate_limits"), // {requests_per_second, daily_limit, etc.}
  quotas: jsonb("quotas"), // Usage quotas and limits
  
  // Documentation Links
  officialDocs: text("official_docs"),
  apiReference: text("api_reference"),
  quickstartGuide: text("quickstart_guide"),
  sdkLinks: jsonb("sdk_links"), // Links to various SDK implementations
  
  // Alternatives Analysis
  canBeMirrored: boolean("can_be_mirrored").default(false),
  alternativeApis: jsonb("alternative_apis"), // Array of alternative solutions
  
  // Integration Status
  currentlyUsed: boolean("currently_used").default(false),
  integrationStatus: text("integration_status"), // 'not_started' | 'in_progress' | 'completed' | 'deprecated'
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertApiDocumentationSchema = createInsertSchema(apiDocumentation).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertApiDocumentation = z.infer<typeof insertApiDocumentationSchema>;
export type ApiDocumentation = typeof apiDocumentation.$inferSelect;

// Research Tasks - Track ongoing research projects
export const researchTasks = pgTable("research_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Task Details
  title: text("title").notNull(),
  description: text("description").notNull(),
  researchType: text("research_type").notNull(), // 'api_analysis' | 'competitor_research' | 'market_analysis' | 'technical_feasibility'
  
  // Assignment
  assignedTo: text("assigned_to"), // Agent or user responsible
  priority: text("priority").default("medium"), // 'low' | 'medium' | 'high' | 'urgent'
  
  // Findings
  findings: jsonb("findings"), // Research results and insights
  relatedKnowledgeIds: text("related_knowledge_ids").array().default(sql`ARRAY[]::text[]`), // Links to knowledge base entries
  
  // Status Tracking
  status: text("status").default("pending"), // 'pending' | 'in_progress' | 'completed' | 'on_hold'
  progress: integer("progress").default(0), // 0-100
  
  // Timeline
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertResearchTaskSchema = createInsertSchema(researchTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertResearchTask = z.infer<typeof insertResearchTaskSchema>;
export type ResearchTask = typeof researchTasks.$inferSelect;

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

// Shopping Cart - Customer shopping carts
export const carts = pgTable("carts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  siteConfigId: varchar("site_config_id").references(() => siteConfigs.id).notNull(),
  
  // Customer Info
  customerId: varchar("customer_id").references(() => customers.id),
  sessionId: text("session_id"), // For anonymous users
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  
  // Cart Status
  status: text("status").default("active"), // 'active', 'abandoned', 'converted', 'expired'
  
  // Delivery Info
  deliveryAddress: text("delivery_address"),
  deliveryInstructions: text("delivery_instructions"),
  
  // Pricing
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).default("0"),
  taxAmount: numeric("tax_amount", { precision: 10, scale: 2 }).default("0"),
  deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 }).default("0"),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).default("0"),
  
  // Timestamps
  lastUpdatedAt: timestamp("last_updated_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // Cart expiration time
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCartSchema = createInsertSchema(carts).omit({
  id: true,
  createdAt: true,
  lastUpdatedAt: true,
});

export type InsertCart = z.infer<typeof insertCartSchema>;
export type Cart = typeof carts.$inferSelect;

// Cart Items - Items in a shopping cart
export const cartItems = pgTable("cart_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cartId: varchar("cart_id").references(() => carts.id).notNull(),
  menuItemId: varchar("menu_item_id").references(() => menuItems.id).notNull(),
  
  // Item Details
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
  
  // Customizations
  customizations: jsonb("customizations"), // Selected options and modifications
  specialInstructions: text("special_instructions"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartItem = typeof cartItems.$inferSelect;

// Orders - Completed purchases
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  siteConfigId: varchar("site_config_id").references(() => siteConfigs.id).notNull(),
  cartId: varchar("cart_id").references(() => carts.id),
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

// ============================================================
// Reseller Hierarchy (migration 0007_resellers_commissions)
// ============================================================

/** One row per reseller partner.  parentResellerId enables multi-level trees. */
export const resellers = pgTable(
  "resellers",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    phone: text("phone"),
    company: text("company"),
    parentResellerId: varchar("parent_reseller_id").references((): any => resellers.id, {
      onDelete: "set null",
    }),
    commissionRate: numeric("commission_rate", { precision: 5, scale: 4 }).notNull().default("0.10"),
    stripeAccountId: text("stripe_account_id"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_resellers_parent_id").on(table.parentResellerId),
    index("idx_resellers_email").on(table.email),
  ],
);

export const insertResellerSchema = createInsertSchema(resellers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertReseller = z.infer<typeof insertResellerSchema>;
export type Reseller = typeof resellers.$inferSelect;

/** One row per commission event (subscription payment, energy top-up, manual credit). */
export const resellerCommissions = pgTable(
  "reseller_commissions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    resellerId: varchar("reseller_id")
      .notNull()
      .references(() => resellers.id, { onDelete: "cascade" }),
    customerAccountId: varchar("customer_account_id").references(
      () => customerAccounts.id,
      { onDelete: "set null" },
    ),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    /** 'subscription' | 'top_up' | 'manual' */
    eventType: text("event_type").notNull(),
    grossAmount: integer("gross_amount").notNull(),     // cents
    commissionAmount: integer("commission_amount").notNull(), // cents
    commissionRate: numeric("commission_rate", { precision: 5, scale: 4 }).notNull(),
    /** 'pending' | 'paid' | 'cancelled' */
    status: text("status").notNull().default("pending"),
    paidAt: timestamp("paid_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_reseller_commissions_reseller_id").on(table.resellerId),
    index("idx_reseller_commissions_customer_id").on(table.customerAccountId),
    index("idx_reseller_commissions_status").on(table.status),
  ],
);

export const insertResellerCommissionSchema = createInsertSchema(resellerCommissions).omit({
  id: true,
  createdAt: true,
});
export type InsertResellerCommission = z.infer<typeof insertResellerCommissionSchema>;
export type ResellerCommission = typeof resellerCommissions.$inferSelect;
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
