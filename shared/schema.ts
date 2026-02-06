import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, jsonb, timestamp, numeric } from "drizzle-orm/pg-core";
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
  timestamp: timestamp("timestamp").defaultNow(),
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
