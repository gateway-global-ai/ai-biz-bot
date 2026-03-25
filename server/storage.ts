import { 
  type User, 
  type InsertUser, 
  type TelephonyConfig, 
  type InsertTelephonyConfig,
  type CallLog,
  type InsertCallLog,
  type Agent,
  type InsertAgent,
  type Customer,
  type InsertCustomer,
  type SmsConversation,
  type InsertSmsConversation,
  type SmsMessage,
  type InsertSmsMessage,
  type AdminUser,
  type InsertAdminUser,
  type OtpCode,
  type InsertOtpCode,
  type AuthSession,
  type InsertAuthSession,
  type TwilioSubAccount,
  type InsertTwilioSubAccount,
  type SmsDeliveryStatus,
  type InsertSmsDeliveryStatus,
  type A2pBrand,
  type InsertA2pBrand,
  type A2pCampaign,
  type InsertA2pCampaign,
  type DemoLead,
  type InsertDemoLead,
  type AffiliateSignup,
  type InsertAffiliateSignup,
  type SiteConfig,
  type InsertSiteConfig,
  type ChatLog,
  type InsertChatLog,
  type CustomerAccount,
  type InsertCustomerAccount,
  type CustomerSession,
  type InsertCustomerSession,
  type Inquiry,
  type InsertInquiry,
  type PlatformBusinessMap,
  type VoiceUsageLog,
  type InsertVoiceUsageLog,
  voiceUsageLogs,
  telephonyConfigs,
  callLogs,
  users,
  agents,
  customers,
  smsConversations,
  smsMessages,
  adminUsers,
  otpCodes,
  authSessions,
  twilioSubAccounts,
  smsDeliveryStatus,
  a2pBrands,
  a2pCampaigns,
  demoLeads,
  affiliateSignups,
  siteConfigs,
  chatLogs,
  customerAccounts,
  customerSessions,
  ogSettings,
  inquiries,
  platformBusinessMap,
  resellers,
  resellerCommissions,
  investorReportViews,
  investorReportSessions,
  pitchDecks,
  type InvestorReportView,
  type InsertInvestorReportView,
  type InvestorReportSession,
  type InsertInvestorReportSession,
  type PitchDeck,
  type InsertPitchDeck,
  shareEvents,
  analyticsLogs,
  menus,
  menuCategories,
  menuItems,
  orders,
  orderItems,
  smsLogs,
  smsOptOuts,
  knowledgeArtifacts,
  knowledgeCertificationOverrides,
  secureVaultRefs,
  artifactSessionActivations,
  type KnowledgeArtifact,
  type KnowledgeCertificationOverride,
  type ArtifactSessionActivation,
  type InsertKnowledgeArtifact,
  qrRoutes,
  qrFirewall,
  qrAccess,
  type QrRoute,
  type InsertQrRoute,
  type QrFirewallRule,
  type InsertQrFirewallRule,
  type QrAccessLog,
  type InsertQrAccessLog,
  slugLandings,
  type InsertSlugLanding,
  conversationEvents,
  type InsertConversationEvent,
} from "@shared/schema";
import type { Reseller } from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, ilike, or, isNull, isNotNull, and, gt, inArray, sql, type InferInsertModel } from "drizzle-orm";
import {
  redactSensitiveMetadata,
  redactSensitiveText,
} from "./services/sensitiveInputGuard";
import {
  type FrontDeskSession,
  frontDeskAssistModeSchema,
  frontDeskEntrySourceSchema,
  frontDeskOutcomeTypeSchema,
  frontDeskVerificationStateSchema,
  frontDeskWorkflowStateSchema,
} from "./contracts/frontDeskSessionContract";

// Placeholder for a future validation service (UPA).
const UPAValidator = {
  validate: async (prompt: string) => ({ isValid: true as const, reason: "" }),
};

/** Explicit site_configs column map (includes granular resource ledger so dashboard 4-card and plan work). */
const siteConfigsColumns = {
  id: siteConfigs.id,
  ownerId: siteConfigs.ownerId,
  name: siteConfigs.name,
  domain: siteConfigs.domain,
  placeId: siteConfigs.placeId,
  placeData: siteConfigs.placeData,
  assignedAgentId: siteConfigs.assignedAgentId,
  botTemplateId: siteConfigs.botTemplateId,
  systemPromptOverride: siteConfigs.systemPromptOverride,
  modelProvider: siteConfigs.modelProvider,
  modelName: siteConfigs.modelName,
  chatbotEnabled: siteConfigs.chatbotEnabled,
  voiceConciergeEnabled: siteConfigs.voiceConciergeEnabled,
  widgetPosition: siteConfigs.widgetPosition,
  widgetColor: siteConfigs.widgetColor,
  greetingMessage: siteConfigs.greetingMessage,
  placeholderText: siteConfigs.placeholderText,
  knowledgeLibrary: siteConfigs.knowledgeLibrary,
  plan: siteConfigs.plan,
  heroImageUrl: siteConfigs.heroImageUrl,
  heroImagePrompt: siteConfigs.heroImagePrompt,
  agentConfig: siteConfigs.agentConfig,
  voiceConfig: siteConfigs.voiceConfig,
  themeConfig: siteConfigs.themeConfig,
  voicePhoneAiMinutes: siteConfigs.voicePhoneAiMinutes,
  voiceWebAiMinutes: siteConfigs.voiceWebAiMinutes,
  smsMessages: siteConfigs.smsMessages,
  chatBotMessages: siteConfigs.chatBotMessages,
  slug: siteConfigs.slug,
  qrCodeUrl: siteConfigs.qrCodeUrl,
  shareCount: siteConfigs.shareCount,
  socialSharing: siteConfigs.socialSharing,
  /** Required for public /agent/:slug — drives claim banner + platform marketing flags in ConciergePanel */
  workspaceState: siteConfigs.workspaceState,
  claimStatus: siteConfigs.claimStatus,
  metadata: siteConfigs.metadata,
  communicationGovernance: siteConfigs.communicationGovernance,
  platformLicenseSku: siteConfigs.platformLicenseSku,
  platformLicenseActivatedAt: siteConfigs.platformLicenseActivatedAt,
  createdAt: siteConfigs.createdAt,
  updatedAt: siteConfigs.updatedAt,
};
export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getTelephonyConfig(): Promise<TelephonyConfig | undefined>;
  createTelephonyConfig(config: InsertTelephonyConfig): Promise<TelephonyConfig>;
  updateTelephonyConfig(id: string, updates: Partial<InsertTelephonyConfig>): Promise<TelephonyConfig | undefined>;
  
  getCallLogs(configId?: string, limit?: number): Promise<CallLog[]>;
  createCallLog(log: InsertCallLog): Promise<CallLog>;
  updateCallLogBySid(callSid: string, updates: Partial<InsertCallLog>): Promise<number>;
  
  // Agent operations
  getAgents(): Promise<Agent[]>;
  getAgentsBySiteConfigId(siteConfigId: string): Promise<Agent[]>;
  getAgent(id: string): Promise<Agent | undefined>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgent(id: string, updates: Partial<InsertAgent>): Promise<Agent | undefined>;
  deleteAgent(id: string): Promise<boolean>;
  
  // Customer operations
  getCustomers(search?: string): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomerByPhone(phone: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, updates: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<boolean>;
  
  // SMS Conversation operations
  getConversationByPhone(phoneNumber: string): Promise<SmsConversation | undefined>;
  getConversation(id: string): Promise<SmsConversation | undefined>;
  createConversation(conversation: InsertSmsConversation): Promise<SmsConversation>;
  updateConversation(id: string, updates: Partial<InsertSmsConversation>): Promise<SmsConversation | undefined>;
  
  // SMS Message operations
  getMessagesByConversation(conversationId: string, limit?: number): Promise<SmsMessage[]>;
  createMessage(message: InsertSmsMessage): Promise<SmsMessage>;
  
  // Twilio Sub-Accounts operations
  getTwilioSubAccounts(): Promise<TwilioSubAccount[]>;
  getTwilioSubAccount(id: string): Promise<TwilioSubAccount | undefined>;
  createTwilioSubAccount(account: InsertTwilioSubAccount): Promise<TwilioSubAccount>;
  updateTwilioSubAccount(id: string, updates: Partial<InsertTwilioSubAccount>): Promise<TwilioSubAccount | undefined>;
  deleteTwilioSubAccount(id: string): Promise<boolean>;
  
  // SMS Delivery Status operations
  createSmsDeliveryStatus(status: InsertSmsDeliveryStatus): Promise<SmsDeliveryStatus>;
  getSmsDeliveryStatus(messageSid: string): Promise<SmsDeliveryStatus | undefined>;
  getFailedSmsDeliveries(limit?: number): Promise<SmsDeliveryStatus[]>;
  getRecentSmsDeliveries(limit?: number): Promise<SmsDeliveryStatus[]>;
  updateSmsDeliveryStatus(messageSid: string, updates: Partial<InsertSmsDeliveryStatus>): Promise<SmsDeliveryStatus | undefined>;
  
  // A2P Compliance operations
  getA2pBrands(): Promise<A2pBrand[]>;
  getA2pBrand(id: string): Promise<A2pBrand | undefined>;
  getA2pBrandByCustomer(customerId: string): Promise<A2pBrand | undefined>;
  createA2pBrand(brand: InsertA2pBrand): Promise<A2pBrand>;
  updateA2pBrand(id: string, updates: Partial<InsertA2pBrand>): Promise<A2pBrand | undefined>;
  
  getA2pCampaigns(brandId?: string): Promise<A2pCampaign[]>;
  getA2pCampaign(id: string): Promise<A2pCampaign | undefined>;
  createA2pCampaign(campaign: InsertA2pCampaign): Promise<A2pCampaign>;
  updateA2pCampaign(id: string, updates: Partial<InsertA2pCampaign>): Promise<A2pCampaign | undefined>;
  
  createDemoLead(lead: InsertDemoLead): Promise<DemoLead>;
  getDemoLead(id: string): Promise<DemoLead | undefined>;
  getDemoLeadByToken(token: string): Promise<DemoLead | undefined>;
  getDemoLeadByPhone(phone: string): Promise<DemoLead | undefined>;
  getAllDemoLeads(): Promise<DemoLead[]>;
  updateDemoLead(id: string, updates: Partial<InsertDemoLead>): Promise<DemoLead | undefined>;
  
  // Site Config operations
  getSiteConfigs(): Promise<SiteConfig[]>;
  getSiteConfig(id: string): Promise<SiteConfig | undefined>;
  getSiteConfigById(id: string): Promise<SiteConfig | null>;
  getSiteConfigByDomain(domain: string): Promise<SiteConfig | undefined>;
  getSiteConfigByPlaceId(placeId: string): Promise<SiteConfig | undefined>;
  /** Create-or-return safety: only return unclaimed demo/provisioned workspace for this placeId. */
  getUnclaimedSiteConfigByPlaceId(placeId: string): Promise<SiteConfig | undefined>;
  createSiteConfig(config: InsertSiteConfig): Promise<SiteConfig>;
  updateSiteConfig(id: string, updates: Partial<InsertSiteConfig>): Promise<SiteConfig | undefined>;
  deleteSiteConfig(id: string): Promise<boolean>;
  /** Search a site's knowledge library by query; returns ranked docs with snippets (category, topic, documentDate indexed). */
  searchKnowledgeLibrary(siteConfigId: string, query: string, limit?: number): Promise<{ title: string; contentSnippet: string; category?: string; topic?: string; documentDate?: string }[]>;
  
  // Chat Log operations
  getChatLogs(siteConfigId: string, limit?: number): Promise<ChatLog[]>;
  createChatLog(log: InsertChatLog): Promise<ChatLog>;

  // Knowledge Artifacts (RBAC + session activation)
  listKnowledgeArtifactsForContext(options: { siteConfigId?: string; ownerId?: string; visibility?: "public" | "private" }): Promise<KnowledgeArtifact[]>;
  getKnowledgeArtifactByKey(agentAccessKey: string): Promise<KnowledgeArtifact | undefined>;
  getKnowledgeArtifactById(id: string): Promise<KnowledgeArtifact | undefined>;
  createKnowledgeArtifact(data: InsertKnowledgeArtifact): Promise<KnowledgeArtifact>;
  deleteKnowledgeArtifact(id: string): Promise<void>;
  /** Non-expired overrides for gap analysis and tool gates (Phase 5E). */
  listActiveKnowledgeCertificationOverrides(siteConfigId: string): Promise<KnowledgeCertificationOverride[]>;
  upsertKnowledgeCertificationOverride(row: {
    siteConfigId: string;
    dimensionId: string;
    overrideScore: number;
    reasonText: string;
    createdByAdminUserId: string;
    expiresAt: Date;
    reviewRequired?: boolean;
    auditDetail?: Record<string, unknown>;
  }): Promise<KnowledgeCertificationOverride>;
  /** All overrides for a site (admin / Sentinel), newest expiry first. */
  listKnowledgeCertificationOverridesForSite(siteConfigId: string): Promise<KnowledgeCertificationOverride[]>;
  /** Zero-LLM vault: idempotent on idempotency_key; same key must target same site. */
  upsertSecureVaultRef(input: {
    siteConfigId: string;
    category: string;
    opaqueReference: string;
    idempotencyKey: string;
    attestedAt: Date;
    createdByAdminUserId: string;
  }): Promise<{ id: string; category: string }>;
  activateArtifactForSession(sessionId: string, agentAccessKey: string, siteConfigId?: string): Promise<void>;
  deactivateArtifactForSession(sessionId: string, agentAccessKey: string): Promise<void>;
  getActiveArtifactKeysForSession(sessionId: string): Promise<string[]>;

  // Customer Account operations
  getCustomerAccountByPhone(phone: string): Promise<CustomerAccount | undefined>;
  getCustomerAccountById(id: string): Promise<CustomerAccount | undefined>;
  /** Resolve a customer account by id, phone, or email (first match in that order). Email match is case-insensitive. */
  findCustomerAccount(criteria: {
    id?: string;
    phone?: string;
    email?: string;
  }): Promise<CustomerAccount | undefined>;
  createCustomerAccount(account: InsertCustomerAccount): Promise<CustomerAccount>;
  updateCustomerAccount(id: string, updates: Partial<InsertCustomerAccount>): Promise<CustomerAccount | undefined>;
  updateCustomerAccountLastLogin(id: string): Promise<void>;

  // Customer Session operations
  createCustomerSession(session: InsertCustomerSession): Promise<CustomerSession>;
  getValidCustomerSession(token: string): Promise<CustomerSession | undefined>;
  deleteCustomerSession(token: string): Promise<void>;

  // Site Config by owner
  getSiteConfigsByOwner(ownerId: string): Promise<SiteConfig[]>;
  getSiteConfigBySlug(slug: string): Promise<SiteConfig | undefined>;
  searchSiteConfigsWithSlug(query: string, limit?: number): Promise<SiteConfig[]>;
  claimUnlinkedSitesByPhone(phone: string, customerAccountId: string): Promise<number>;

  getOgSettingsByPath(pagePath: string): Promise<any | undefined>;
  getAllOgSettings(): Promise<any[]>;
  upsertOgSettings(settings: any): Promise<any>;
  deleteOgSettings(id: string): Promise<boolean>;

  // Platform Identity
  getOrCreatePlatformId(siteConfigId: string): Promise<string>;
  resolvePlatformId(input: { siteConfigId?: string; googlePlaceId?: string }): Promise<PlatformBusinessMap | null>;
  getSiteConfigIdByPlatformId(platformId: string): Promise<string | null>;

  // Voice Usage Log operations
  createVoiceUsageLog(log: InsertVoiceUsageLog): Promise<VoiceUsageLog>;
  getVoiceUsageLogs(siteConfigId: string, limit?: number): Promise<VoiceUsageLog[]>;

  // QR Routes (shadow telecom); optional siteConfigId filters to routes for that site
  getQrRoutes(page?: number, limit?: number, search?: string, siteConfigId?: string | null): Promise<{ routes: QrRoute[]; total: number }>;
  getQrRoute(id: number): Promise<QrRoute | undefined>;
  createQrRoute(data: Partial<InsertQrRoute>): Promise<QrRoute>;
  updateQrRoute(id: number, updates: Partial<InsertQrRoute>): Promise<QrRoute | undefined>;
  deleteQrRoute(id: number): Promise<boolean>;
  getQrFirewallRules(routeId?: number): Promise<QrFirewallRule[]>;
  createQrFirewallRule(data: InsertQrFirewallRule): Promise<QrFirewallRule>;
  deleteQrFirewallRule(id: number): Promise<boolean>;
  getQrAccessLog(routeId: number, page?: number, limit?: number): Promise<{ logs: QrAccessLog[]; total: number }>;
  logQrAccess(data: InsertQrAccessLog): Promise<QrAccessLog>;
  incrementQrScanCount(id: number): Promise<void>;
  getQrScanStatsBySite(siteConfigId: string): Promise<{ totalScans: number; byRoute: { routeId: number; label: string | null; scans: number }[]; last7Days: number; last30Days: number }>;
  recordSlugLanding(siteConfigId: string, source: string): Promise<void>;
  logConversationEvent(data: { siteConfigId: string; callSid?: string | null; sessionId?: string | null; eventType: string; metadata?: Record<string, unknown> }): Promise<void>;
  getSessionEventSiteConfigId(sessionId: string): Promise<string | null>;
  getFrontDeskSessions(
    siteConfigId: string,
    opts?: { includeResolved?: boolean; limit?: number }
  ): Promise<{
    sessions: FrontDeskSession[];
    updatedAt: string;
    projectionVersion: number;
  }>;
  getConversationEvents(siteConfigId: string, opts?: { page?: number; limit?: number; from?: Date; to?: Date; eventType?: string }): Promise<{ events: { id: number; siteConfigId: string; callSid: string | null; sessionId: string | null; eventType: string; occurredAt: Date; metadata: Record<string, unknown> | null }[]; total: number }>;
  getConversationEventsSummary(siteConfigId: string, opts?: { from?: Date; to?: Date }): Promise<{ byEventType: { eventType: string; count: number }[] }>;
  getOutcomeSummary(siteConfigId: string, opts?: { from?: Date; to?: Date }): Promise<{
    totalResolved: number;
    bookings: number;
    leads: number;
    tasks: number;
    escalations: number;
    resolvedNoAction: number;
    operatorJoinedCount: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  private extractTranscriptSnippet(metadata: Record<string, unknown>): string | null {
    const candidates = [
      metadata.transcriptPreview,
      metadata.summary,
      metadata.message,
      metadata.content,
      metadata.lastUtterance,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim().replace(/\s+/g, " ");
      }
    }
    return null;
  }

  private formatTranscriptPreview(snippets: string[]): string | undefined {
    if (!snippets.length) return undefined;
    const merged = snippets.slice(-2).join(" | ");
    return merged.length > 140 ? `${merged.slice(0, 137)}...` : merged;
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getTelephonyConfig(): Promise<TelephonyConfig | undefined> {
    const [config] = await db.select().from(telephonyConfigs).limit(1);
    return config;
  }

  async createTelephonyConfig(config: InsertTelephonyConfig): Promise<TelephonyConfig> {
    const [created] = await db.insert(telephonyConfigs).values(config).returning();
    return created;
  }

  async updateTelephonyConfig(id: string, updates: Partial<InsertTelephonyConfig>): Promise<TelephonyConfig | undefined> {
    const [updated] = await db
      .update(telephonyConfigs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(telephonyConfigs.id, id))
      .returning();
    return updated;
  }

  async getCallLogs(configId?: string, limit: number = 50): Promise<CallLog[]> {
    if (configId) {
      return db
        .select()
        .from(callLogs)
        .where(eq(callLogs.configId, configId))
        .orderBy(desc(callLogs.timestamp))
        .limit(limit);
    }
    return db
      .select()
      .from(callLogs)
      .orderBy(desc(callLogs.timestamp))
      .limit(limit);
  }

  async createCallLog(log: InsertCallLog): Promise<CallLog> {
    const [created] = await db.insert(callLogs).values(log).returning();
    return created;
  }

  async updateCallLogBySid(callSid: string, updates: Partial<InsertCallLog>): Promise<number> {
    if (!callSid) return 0;
    const result = await db
      .update(callLogs)
      .set(updates)
      .where(eq(callLogs.callSid, callSid));
    return result.rowCount ?? 0;
  }

  async getCallLog(id: string): Promise<CallLog | undefined> {
    const [log] = await db.select().from(callLogs).where(eq(callLogs.id, id));
    return log;
  }

  async updateCallLog(id: string, updates: Partial<InsertCallLog>): Promise<CallLog | undefined> {
    const [updated] = await db.update(callLogs)
      .set(updates)
      .where(eq(callLogs.id, id))
      .returning();
    return updated;
  }

  // Agent operations
  async getAgents(): Promise<Agent[]> {
    return db.select().from(agents).orderBy(desc(agents.createdAt));
  }

  async getAgentsBySiteConfigId(siteConfigId: string): Promise<Agent[]> {
    return db
      .select()
      .from(agents)
      .where(eq(agents.siteConfigId, siteConfigId))
      // Stable roster ordering: 1) roleType (if present), 2) createdAt
      .orderBy(asc(agents.roleType), asc(agents.createdAt));
  }

  async getAgent(id: string): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.id, id));
    return agent;
  }

  async createAgent(agent: InsertAgent): Promise<Agent> {
    const [created] = await db.insert(agents).values(agent).returning();
    return created;
  }

  async updateAgent(id: string, updates: Partial<InsertAgent>): Promise<Agent | undefined> {
    const [updated] = await db
      .update(agents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(agents.id, id))
      .returning();
    return updated;
  }

  async deleteAgent(id: string): Promise<boolean> {
    await db.delete(agents).where(eq(agents.id, id));
    return true;
  }

  // Customer operations
  async getCustomers(search?: string): Promise<Customer[]> {
    if (search) {
      const searchPattern = `%${search}%`;
      return db.select().from(customers).where(
        or(
          ilike(customers.name, searchPattern),
          ilike(customers.email, searchPattern),
          ilike(customers.company, searchPattern),
          ilike(customers.phone, searchPattern)
        )
      ).orderBy(desc(customers.createdAt));
    }
    return db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [created] = await db.insert(customers).values(customer).returning();
    return created;
  }

  async updateCustomer(id: string, updates: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [updated] = await db
      .update(customers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return updated;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    await db.delete(customers).where(eq(customers.id, id));
    return true;
  }

  async getCustomerByPhone(phone: string): Promise<Customer | undefined> {
    if (!phone) return undefined;
    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');
    const [customer] = await db.select().from(customers).where(
      ilike(customers.phone, `%${normalizedPhone.slice(-10)}%`)
    );
    return customer;
  }

  // SMS Conversation operations
  async getConversationByPhone(phoneNumber: string): Promise<SmsConversation | undefined> {
    const [conversation] = await db.select().from(smsConversations)
      .where(eq(smsConversations.phoneNumber, phoneNumber));
    return conversation;
  }

  async getConversation(id: string): Promise<SmsConversation | undefined> {
    const [conversation] = await db.select().from(smsConversations)
      .where(eq(smsConversations.id, id));
    return conversation;
  }

  async createConversation(conversation: InsertSmsConversation): Promise<SmsConversation> {
    const [created] = await db.insert(smsConversations).values(conversation).returning();
    return created;
  }

  async updateConversation(id: string, updates: Partial<InsertSmsConversation>): Promise<SmsConversation | undefined> {
    const [updated] = await db
      .update(smsConversations)
      .set(updates)
      .where(eq(smsConversations.id, id))
      .returning();
    return updated;
  }

  // SMS Message operations
  async getMessagesByConversation(conversationId: string, limit: number = 100): Promise<SmsMessage[]> {
    return db.select().from(smsMessages)
      .where(eq(smsMessages.conversationId, conversationId))
      .orderBy(desc(smsMessages.timestamp))
      .limit(limit);
  }

  async createMessage(message: InsertSmsMessage): Promise<SmsMessage> {
    const [created] = await db.insert(smsMessages).values(message).returning();
    return created;
  }

  // Admin User operations
  async getAdminUserByPhone(phone: string): Promise<AdminUser | undefined> {
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.phone, phone));
    return user;
  }

  async getAdminUserById(id: string): Promise<AdminUser | undefined> {
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
    return user;
  }

  async createAdminUser(user: InsertAdminUser): Promise<AdminUser> {
    const [created] = await db.insert(adminUsers).values(user).returning();
    return created;
  }

  async updateAdminUserLastLogin(id: string): Promise<void> {
    await db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, id));
  }

  async updateAdminUser(id: string, updates: Partial<{ resellerId: string | null; name: string | null; role: string }>): Promise<AdminUser | undefined> {
    const [updated] = await db.update(adminUsers).set(updates).where(eq(adminUsers.id, id)).returning();
    return updated;
  }

  async createReseller(data: { name?: string; email?: string; phone?: string }): Promise<Reseller> {
    const [created] = await db.insert(resellers).values(data).returning();
    return created;
  }

  async getResellerById(id: string): Promise<Reseller | undefined> {
    const [r] = await db.select().from(resellers).where(eq(resellers.id, id));
    return r;
  }

  async updateReseller(id: string, updates: Partial<{ stripeAccountId: string | null; name: string | null; email: string | null; phone: string | null }>): Promise<Reseller | undefined> {
    const [updated] = await db.update(resellers).set({ ...updates, updatedAt: new Date() }).where(eq(resellers.id, id)).returning();
    return updated;
  }

  // OTP Code operations
  async createOtpCode(otp: InsertOtpCode): Promise<OtpCode> {
    const [created] = await db.insert(otpCodes).values(otp).returning();
    return created;
  }

  async getValidOtpCode(phone: string, code: string): Promise<OtpCode | undefined> {
    const now = new Date();
    const [otp] = await db.select().from(otpCodes)
      .where(
        and(
          eq(otpCodes.phone, phone),
          eq(otpCodes.code, code),
          eq(otpCodes.used, false),
          gt(otpCodes.expiresAt, now)
        )
      );
    return otp;
  }

  async markOtpUsed(id: string): Promise<void> {
    await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, id));
  }

  // Investor report access (SMS-gated view tracking)
  async createInvestorReportView(view: InsertInvestorReportView): Promise<InvestorReportView> {
    const [row] = await db.insert(investorReportViews).values(view).returning();
    return row;
  }

  async createInvestorReportSession(session: InsertInvestorReportSession): Promise<InvestorReportSession> {
    const [row] = await db.insert(investorReportSessions).values(session).returning();
    return row;
  }

  async getValidInvestorReportSession(token: string): Promise<InvestorReportSession | undefined> {
    const now = new Date();
    const [row] = await db
      .select()
      .from(investorReportSessions)
      .where(and(eq(investorReportSessions.token, token), gt(investorReportSessions.expiresAt, now)));
    return row;
  }

  async listInvestorReportViews(limit = 100): Promise<InvestorReportView[]> {
    return db.select().from(investorReportViews).orderBy(desc(investorReportViews.viewedAt)).limit(limit);
  }

  async createPitchDeck(deck: InsertPitchDeck): Promise<PitchDeck> {
    const [row] = await db.insert(pitchDecks).values({ ...deck, updatedAt: new Date() }).returning();
    return row;
  }

  async getPitchDeckBySlug(slug: string): Promise<PitchDeck | undefined> {
    const [row] = await db.select().from(pitchDecks).where(eq(pitchDecks.slug, slug));
    return row;
  }

  async listPitchDecks(opts?: { category?: string; industry?: string }): Promise<PitchDeck[]> {
    const conditions = [];
    if (opts?.category) conditions.push(eq(pitchDecks.category, opts.category));
    if (opts?.industry) conditions.push(eq(pitchDecks.industry, opts.industry));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    return whereClause
      ? db.select().from(pitchDecks).where(whereClause).orderBy(desc(pitchDecks.createdAt))
      : db.select().from(pitchDecks).orderBy(desc(pitchDecks.createdAt));
  }

  async updatePitchDeck(id: string, updates: Partial<InsertPitchDeck>): Promise<PitchDeck | undefined> {
    const [row] = await db.update(pitchDecks).set({ ...updates, updatedAt: new Date() }).where(eq(pitchDecks.id, id)).returning();
    return row;
  }

  // Auth Session operations
  async createAuthSession(session: InsertAuthSession): Promise<AuthSession> {
    const [created] = await db.insert(authSessions).values(session).returning();
    return created;
  }

  async getValidAuthSession(token: string): Promise<AuthSession | undefined> {
    const now = new Date();
    const [session] = await db.select().from(authSessions)
      .where(
        and(
          eq(authSessions.token, token),
          gt(authSessions.expiresAt, now)
        )
      );
    return session;
  }

  async deleteAuthSession(token: string): Promise<void> {
    await db.delete(authSessions).where(eq(authSessions.token, token));
  }

  // Twilio Sub-Accounts operations
  async getTwilioSubAccounts(): Promise<TwilioSubAccount[]> {
    return await db.select().from(twilioSubAccounts).orderBy(desc(twilioSubAccounts.createdAt));
  }

  async getTwilioSubAccount(id: string): Promise<TwilioSubAccount | undefined> {
    const [account] = await db.select().from(twilioSubAccounts).where(eq(twilioSubAccounts.id, id));
    return account;
  }

  async createTwilioSubAccount(account: InsertTwilioSubAccount): Promise<TwilioSubAccount> {
    const [newAccount] = await db.insert(twilioSubAccounts).values(account).returning();
    return newAccount;
  }

  async updateTwilioSubAccount(id: string, updates: Partial<InsertTwilioSubAccount>): Promise<TwilioSubAccount | undefined> {
    const [updated] = await db.update(twilioSubAccounts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(twilioSubAccounts.id, id))
      .returning();
    return updated;
  }

  async deleteTwilioSubAccount(id: string): Promise<boolean> {
    await db.delete(twilioSubAccounts).where(eq(twilioSubAccounts.id, id));
    return true;
  }

  // SMS Delivery Status operations
  async createSmsDeliveryStatus(status: InsertSmsDeliveryStatus): Promise<SmsDeliveryStatus> {
    const [created] = await db.insert(smsDeliveryStatus).values(status).returning();
    return created;
  }

  async getSmsDeliveryStatus(messageSid: string): Promise<SmsDeliveryStatus | undefined> {
    const [status] = await db.select().from(smsDeliveryStatus)
      .where(eq(smsDeliveryStatus.messageSid, messageSid))
      .orderBy(desc(smsDeliveryStatus.createdAt))
      .limit(1);
    return status;
  }

  async getFailedSmsDeliveries(limit: number = 50): Promise<SmsDeliveryStatus[]> {
    return await db.select().from(smsDeliveryStatus)
      .where(or(
        eq(smsDeliveryStatus.status, 'failed'),
        eq(smsDeliveryStatus.status, 'undelivered')
      ))
      .orderBy(desc(smsDeliveryStatus.createdAt))
      .limit(limit);
  }

  async getRecentSmsDeliveries(limit: number = 50): Promise<SmsDeliveryStatus[]> {
    return await db.select().from(smsDeliveryStatus)
      .orderBy(desc(smsDeliveryStatus.createdAt))
      .limit(limit);
  }

  async updateSmsDeliveryStatus(messageSid: string, updates: Partial<InsertSmsDeliveryStatus>): Promise<SmsDeliveryStatus | undefined> {
    const [updated] = await db.update(smsDeliveryStatus)
      .set(updates)
      .where(eq(smsDeliveryStatus.messageSid, messageSid))
      .returning();
    return updated;
  }

  // A2P Compliance operations
  async getA2pBrands(): Promise<A2pBrand[]> {
    return await db.select().from(a2pBrands).orderBy(desc(a2pBrands.createdAt));
  }

  async getA2pBrand(id: string): Promise<A2pBrand | undefined> {
    const [brand] = await db.select().from(a2pBrands).where(eq(a2pBrands.id, id));
    return brand;
  }

  async getA2pBrandByCustomer(customerId: string): Promise<A2pBrand | undefined> {
    const [brand] = await db.select().from(a2pBrands)
      .where(eq(a2pBrands.customerId, customerId))
      .orderBy(desc(a2pBrands.createdAt))
      .limit(1);
    return brand;
  }

  async createA2pBrand(brand: InsertA2pBrand): Promise<A2pBrand> {
    const [created] = await db.insert(a2pBrands).values(brand).returning();
    return created;
  }

  async updateA2pBrand(id: string, updates: Partial<InsertA2pBrand>): Promise<A2pBrand | undefined> {
    const [updated] = await db.update(a2pBrands)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(a2pBrands.id, id))
      .returning();
    return updated;
  }

  async getA2pCampaigns(brandId?: string): Promise<A2pCampaign[]> {
    if (brandId) {
      return await db.select().from(a2pCampaigns)
        .where(eq(a2pCampaigns.brandId, brandId))
        .orderBy(desc(a2pCampaigns.createdAt));
    }
    return await db.select().from(a2pCampaigns).orderBy(desc(a2pCampaigns.createdAt));
  }

  async getA2pCampaign(id: string): Promise<A2pCampaign | undefined> {
    const [campaign] = await db.select().from(a2pCampaigns).where(eq(a2pCampaigns.id, id));
    return campaign;
  }

  async createA2pCampaign(campaign: InsertA2pCampaign): Promise<A2pCampaign> {
    const [created] = await db.insert(a2pCampaigns).values(campaign).returning();
    return created;
  }

  async updateA2pCampaign(id: string, updates: Partial<InsertA2pCampaign>): Promise<A2pCampaign | undefined> {
    const [updated] = await db.update(a2pCampaigns)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(a2pCampaigns.id, id))
      .returning();
    return updated;
  }

  async createDemoLead(lead: InsertDemoLead): Promise<DemoLead> {
    const [created] = await db.insert(demoLeads).values(lead).returning();
    return created;
  }

  async getDemoLead(id: string): Promise<DemoLead | undefined> {
    const [lead] = await db.select().from(demoLeads).where(eq(demoLeads.id, id));
    return lead;
  }

  async getDemoLeadByToken(token: string): Promise<DemoLead | undefined> {
    const [lead] = await db.select().from(demoLeads).where(eq(demoLeads.magicToken, token));
    return lead;
  }

  async getDemoLeadByPhone(phone: string): Promise<DemoLead | undefined> {
    const [lead] = await db.select().from(demoLeads)
      .where(eq(demoLeads.phone, phone))
      .orderBy(desc(demoLeads.createdAt))
      .limit(1);
    return lead;
  }

  async getAllDemoLeads(): Promise<DemoLead[]> {
    return db.select().from(demoLeads).orderBy(desc(demoLeads.createdAt));
  }

  async updateDemoLead(id: string, updates: Partial<InsertDemoLead>): Promise<DemoLead | undefined> {
    const [updated] = await db.update(demoLeads).set(updates).where(eq(demoLeads.id, id)).returning();
    return updated;
  }

  async createAffiliateSignup(signup: InsertAffiliateSignup): Promise<AffiliateSignup> {
    const [created] = await db.insert(affiliateSignups).values(signup).returning();
    return created;
  }

  async getSiteConfigs(): Promise<SiteConfig[]> {
    return db.select().from(siteConfigs).orderBy(desc(siteConfigs.createdAt));
  }

  async getSiteConfig(id: string): Promise<SiteConfig | undefined> {
    const [config] = await db.select().from(siteConfigs).where(eq(siteConfigs.id, id));
    return config;
  }

  async getSiteConfigById(id: string): Promise<SiteConfig | null> {
    if (!id || id === 'undefined') {
      console.warn('[Storage] Attempted to fetch site config with null, undefined, or "undefined" string ID');
      return null;
    }
    try {
      const [config] = await db.select().from(siteConfigs).where(eq(siteConfigs.id, id));
      return config ?? null;
    } catch (error) {
      console.error(`[Storage] Error fetching site config for ID ${id}:`, error);
      throw new Error('Database query for site configuration failed.');
    }
  }

  async getSiteConfigByDomain(domain: string): Promise<SiteConfig | undefined> {
    const [config] = await db.select().from(siteConfigs).where(eq(siteConfigs.domain, domain));
    return config;
  }

  async getSiteConfigByPlaceId(placeId: string): Promise<SiteConfig | undefined> {
    const [config] = await db.select().from(siteConfigs).where(eq(siteConfigs.placeId, placeId));
    return config;
  }

  async getUnclaimedSiteConfigByPlaceId(placeId: string): Promise<SiteConfig | undefined> {
    const [config] = await db
      .select()
      .from(siteConfigs)
      .where(
        and(
          eq(siteConfigs.placeId, placeId),
          isNull(siteConfigs.ownerId),
          inArray(siteConfigs.workspaceState, ["demo", "provisioned"])
        )
      )
      .orderBy(desc(siteConfigs.createdAt))
      .limit(1);
    return config;
  }

  async createSiteConfig(config: InsertSiteConfig): Promise<SiteConfig> {
    const [created] = await db
      .insert(siteConfigs)
      .values(config as InferInsertModel<typeof siteConfigs>)
      .returning();
    return created;
  }

  async updateSiteConfig(id: string, updates: Partial<InsertSiteConfig>): Promise<SiteConfig | undefined> {
    const [updated] = await db.update(siteConfigs)
      .set({ ...updates, updatedAt: new Date() } as Partial<InferInsertModel<typeof siteConfigs>>)
      .where(eq(siteConfigs.id, id))
      .returning();
    return updated;
  }

  async searchKnowledgeLibrary(
    siteConfigId: string,
    query: string,
    limit = 5
  ): Promise<{ title: string; contentSnippet: string; category?: string; topic?: string; documentDate?: string }[]> {
    const site = await this.getSiteConfigById(siteConfigId);
    if (!site) return [];
    const lib = (site as any).knowledgeLibrary;
    const docs = Array.isArray(lib) ? lib as Array<{ id?: string; title?: string; content?: string; category?: string; topic?: string; documentDate?: string }> : [];
    if (docs.length === 0 || !query?.trim()) return [];
    const words = query
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1);
    if (words.length === 0) return docs.slice(0, limit).map((d) => ({
      title: d.title ?? "Untitled",
      contentSnippet: (d.content ?? "").slice(0, 400),
      category: d.category,
      topic: d.topic,
      documentDate: d.documentDate,
    }));
    const scored = docs.map((d) => {
      const title = (d.title ?? "").toLowerCase();
      const content = (d.content ?? "").toLowerCase();
      const category = (d.category ?? "").toLowerCase();
      const topic = (d.topic ?? "").toLowerCase();
      let score = 0;
      for (const w of words) {
        if (title.includes(w)) score += 3;
        if (content.includes(w)) score += 2;
        if (category.includes(w) || topic.includes(w)) score += 2;
      }
      return { doc: d, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const top = scored.filter((s) => s.score > 0).slice(0, limit);
    if (top.length === 0) return docs.slice(0, limit).map((d) => ({
      title: d.title ?? "Untitled",
      contentSnippet: (d.content ?? "").slice(0, 400),
      category: d.category,
      topic: d.topic,
      documentDate: d.documentDate,
    }));
    const SNIPPET_LEN = 400;
    return top.map(({ doc }) => {
      const content = doc.content ?? "";
      const snippet = content.length <= SNIPPET_LEN ? content : content.slice(0, SNIPPET_LEN) + "…";
      return {
        title: doc.title ?? "Untitled",
        contentSnippet: snippet,
        category: doc.category,
        topic: doc.topic,
        documentDate: doc.documentDate,
      };
    });
  }

  async deleteSiteConfig(id: string): Promise<boolean> {
    // Pre-delete child rows that lack ON DELETE CASCADE to avoid FK violations.
    // 1. orderItems → orders (orders.siteConfigId has no cascade)
    const orderRows = await db.select({ id: orders.id }).from(orders).where(eq(orders.siteConfigId, id));
    if (orderRows.length > 0) {
      const orderIds = orderRows.map(o => o.id);
      await db.delete(orderItems).where(inArray(orderItems.orderId, orderIds));
    }
    await db.delete(orders).where(eq(orders.siteConfigId, id));
    // 2. menuItems + menuCategories → menus (menus.siteConfigId has no cascade)
    const menuRows = await db.select({ id: menus.id }).from(menus).where(eq(menus.siteConfigId, id));
    if (menuRows.length > 0) {
      const menuIds = menuRows.map(m => m.id);
      await db.delete(orderItems).where(inArray(orderItems.menuItemId,
        db.select({ id: menuItems.id }).from(menuItems).where(inArray(menuItems.menuId, menuIds)) as any
      ));
      await db.delete(menuItems).where(inArray(menuItems.menuId, menuIds));
      await db.delete(menuCategories).where(inArray(menuCategories.menuId, menuIds));
    }
    await db.delete(menus).where(eq(menus.siteConfigId, id));
    // 3. analytics_logs, sms_logs, sms_opt_outs
    await db.delete(analyticsLogs).where(eq(analyticsLogs.siteConfigId, id));
    await db.delete(smsLogs).where(eq(smsLogs.siteConfigId, id));
    await db.delete(smsOptOuts).where(eq(smsOptOuts.siteConfigId, id));
    // 4. Finally delete the site config (share_events cascade automatically)
    await db.delete(siteConfigs).where(eq(siteConfigs.id, id));
    return true;
  }

  async getSiteConfigBySlug(slug: string): Promise<SiteConfig | undefined> {
    const [config] = await db.select(siteConfigsColumns).from(siteConfigs)
      .where(eq(siteConfigs.slug, slug))
      .limit(1);
    return config as SiteConfig | undefined;
  }

  /** Search businesses by name or slug (for QR code lookup). Returns only configs that have a slug. */
  async searchSiteConfigsWithSlug(query: string, limit = 50): Promise<SiteConfig[]> {
    if (!query || query.trim().length === 0) {
      return db.select().from(siteConfigs)
        .where(isNotNull(siteConfigs.slug))
        .orderBy(desc(siteConfigs.updatedAt))
        .limit(limit);
    }
    const pattern = `%${query.trim().replace(/%/g, "\\%")}%`;
    return db.select().from(siteConfigs)
      .where(
        and(
          isNotNull(siteConfigs.slug),
          or(ilike(siteConfigs.name, pattern), ilike(siteConfigs.slug, pattern))
        )
      )
      .orderBy(desc(siteConfigs.updatedAt))
      .limit(limit);
  }

  async recordShareEvent(siteConfigId: string, platform: string, referrerUserId?: string): Promise<number> {
    await db.insert(shareEvents).values({
      siteConfigId,
      platform,
      referrerUserId: referrerUserId ?? null,
    } as any);
    const [updated] = await db
      .update(siteConfigs)
      .set({ shareCount: sql`${siteConfigs.shareCount} + 1` } as any)
      .where(eq(siteConfigs.id, siteConfigId))
      .returning({ shareCount: siteConfigs.shareCount });
    return updated?.shareCount ?? 0;
  }

  async getChatLogs(siteConfigId: string, limit = 50): Promise<ChatLog[]> {
    return db.select().from(chatLogs)
      .where(eq(chatLogs.siteConfigId, siteConfigId))
      .orderBy(desc(chatLogs.createdAt))
      .limit(limit);
  }

  async createChatLog(log: InsertChatLog): Promise<ChatLog> {
    const [created] = await db
      .insert(chatLogs)
      .values({
        ...log,
        content: redactSensitiveText(String(log.content ?? "")),
      })
      .returning();
    return created;
  }

  async listKnowledgeArtifactsForContext(options: { siteConfigId?: string; ownerId?: string; visibility?: "public" | "private" }): Promise<KnowledgeArtifact[]> {
    const conditions = [];
    if (options.siteConfigId) conditions.push(eq(knowledgeArtifacts.siteConfigId, options.siteConfigId));
    if (options.ownerId) conditions.push(eq(knowledgeArtifacts.ownerId, options.ownerId));
    if (options.visibility) conditions.push(eq(knowledgeArtifacts.visibility, options.visibility));
    if (conditions.length === 0) {
      return db.select().from(knowledgeArtifacts).orderBy(asc(knowledgeArtifacts.title));
    }
    return db.select().from(knowledgeArtifacts).where(and(...conditions)).orderBy(asc(knowledgeArtifacts.title));
  }

  async getKnowledgeArtifactByKey(agentAccessKey: string): Promise<KnowledgeArtifact | undefined> {
    const [row] = await db.select().from(knowledgeArtifacts).where(eq(knowledgeArtifacts.agentAccessKey, agentAccessKey));
    return row;
  }

  async getKnowledgeArtifactById(id: string): Promise<KnowledgeArtifact | undefined> {
    const [row] = await db.select().from(knowledgeArtifacts).where(eq(knowledgeArtifacts.id, id));
    return row;
  }

  async createKnowledgeArtifact(data: InsertKnowledgeArtifact): Promise<KnowledgeArtifact> {
    const [row] = await db.insert(knowledgeArtifacts).values(data).returning();
    return row;
  }

  async deleteKnowledgeArtifact(id: string): Promise<void> {
    await db.delete(knowledgeArtifacts).where(eq(knowledgeArtifacts.id, id));
  }

  async listActiveKnowledgeCertificationOverrides(siteConfigId: string): Promise<KnowledgeCertificationOverride[]> {
    return db
      .select()
      .from(knowledgeCertificationOverrides)
      .where(
        and(
          eq(knowledgeCertificationOverrides.siteConfigId, siteConfigId),
          gt(knowledgeCertificationOverrides.expiresAt, new Date()),
        ),
      );
  }

  async upsertKnowledgeCertificationOverride(row: {
    siteConfigId: string;
    dimensionId: string;
    overrideScore: number;
    reasonText: string;
    createdByAdminUserId: string;
    expiresAt: Date;
    reviewRequired?: boolean;
    auditDetail?: Record<string, unknown>;
  }): Promise<KnowledgeCertificationOverride> {
    const reviewRequired = row.reviewRequired ?? false;
    const auditDetail = row.auditDetail ?? {};
    const [out] = await db
      .insert(knowledgeCertificationOverrides)
      .values({
        siteConfigId: row.siteConfigId,
        dimensionId: row.dimensionId,
        overrideScore: row.overrideScore,
        reasonText: row.reasonText,
        createdByAdminUserId: row.createdByAdminUserId,
        expiresAt: row.expiresAt,
        reviewRequired,
        auditDetail,
      })
      .onConflictDoUpdate({
        target: [knowledgeCertificationOverrides.siteConfigId, knowledgeCertificationOverrides.dimensionId],
        set: {
          overrideScore: row.overrideScore,
          reasonText: row.reasonText,
          createdByAdminUserId: row.createdByAdminUserId,
          expiresAt: row.expiresAt,
          reviewRequired,
          auditDetail,
          createdAt: new Date(),
        },
      })
      .returning();
    return out;
  }

  async listKnowledgeCertificationOverridesForSite(siteConfigId: string): Promise<KnowledgeCertificationOverride[]> {
    return db
      .select()
      .from(knowledgeCertificationOverrides)
      .where(eq(knowledgeCertificationOverrides.siteConfigId, siteConfigId))
      .orderBy(desc(knowledgeCertificationOverrides.expiresAt));
  }

  async upsertSecureVaultRef(input: {
    siteConfigId: string;
    category: string;
    opaqueReference: string;
    idempotencyKey: string;
    attestedAt: Date;
    createdByAdminUserId: string;
  }): Promise<{ id: string; category: string }> {
    const [existing] = await db
      .select()
      .from(secureVaultRefs)
      .where(eq(secureVaultRefs.idempotencyKey, input.idempotencyKey))
      .limit(1);
    if (existing) {
      if (existing.siteConfigId !== input.siteConfigId) {
        throw new Error("IDEMPOTENCY_KEY_CONFLICT");
      }
      return { id: existing.id, category: existing.category };
    }
    const [row] = await db
      .insert(secureVaultRefs)
      .values({
        siteConfigId: input.siteConfigId,
        category: input.category,
        opaqueReference: input.opaqueReference,
        idempotencyKey: input.idempotencyKey,
        attestedAt: input.attestedAt,
        createdByAdminUserId: input.createdByAdminUserId,
      })
      .returning({ id: secureVaultRefs.id, category: secureVaultRefs.category });
    if (!row) {
      throw new Error("SECURE_VAULT_INSERT_FAILED");
    }
    return row;
  }

  async activateArtifactForSession(sessionId: string, agentAccessKey: string, siteConfigId?: string): Promise<void> {
    await db.insert(artifactSessionActivations).values({
      sessionId,
      agentAccessKey,
      siteConfigId: siteConfigId ?? null,
    }).onConflictDoUpdate({
      target: [artifactSessionActivations.sessionId, artifactSessionActivations.agentAccessKey],
      set: { activatedAt: new Date(), siteConfigId: siteConfigId ?? undefined },
    });
  }

  async deactivateArtifactForSession(sessionId: string, agentAccessKey: string): Promise<void> {
    await db.delete(artifactSessionActivations).where(
      and(
        eq(artifactSessionActivations.sessionId, sessionId),
        eq(artifactSessionActivations.agentAccessKey, agentAccessKey)
      )
    );
  }

  async getActiveArtifactKeysForSession(sessionId: string): Promise<string[]> {
    const rows = await db.select({ agentAccessKey: artifactSessionActivations.agentAccessKey })
      .from(artifactSessionActivations)
      .where(eq(artifactSessionActivations.sessionId, sessionId));
    return rows.map((r) => r.agentAccessKey);
  }

  async getCustomerAccountByPhone(phone: string): Promise<CustomerAccount | undefined> {
    const [account] = await db.select().from(customerAccounts).where(eq(customerAccounts.phone, phone));
    return account;
  }

  async getCustomerAccountById(id: string): Promise<CustomerAccount | undefined> {
    const [account] = await db.select().from(customerAccounts).where(eq(customerAccounts.id, id));
    return account;
  }

  async findCustomerAccount(criteria: {
    id?: string;
    phone?: string;
    email?: string;
  }): Promise<CustomerAccount | undefined> {
    const id = criteria.id?.trim();
    if (id) {
      const byId = await this.getCustomerAccountById(id);
      if (byId) return byId;
    }
    const phone = criteria.phone?.trim();
    if (phone) {
      const byPhone = await this.getCustomerAccountByPhone(phone);
      if (byPhone) return byPhone;
    }
    const emailRaw = criteria.email?.trim();
    if (emailRaw) {
      const normalized = emailRaw.toLowerCase();
      const [byEmail] = await db
        .select()
        .from(customerAccounts)
        .where(sql`lower(${customerAccounts.email}) = ${normalized}`)
        .limit(1);
      if (byEmail) return byEmail;
    }
    return undefined;
  }

  async createCustomerAccount(account: InsertCustomerAccount): Promise<CustomerAccount> {
    const [created] = await db.insert(customerAccounts).values(account).returning();
    return created;
  }

  async updateCustomerAccount(id: string, updates: Partial<InsertCustomerAccount>): Promise<CustomerAccount | undefined> {
    const [updated] = await db.update(customerAccounts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(customerAccounts.id, id))
      .returning();
    return updated;
  }

  async updateCustomerAccountLastLogin(id: string): Promise<void> {
    await db.update(customerAccounts)
      .set({ lastLoginAt: new Date() })
      .where(eq(customerAccounts.id, id));
  }

  async createCustomerSession(session: InsertCustomerSession): Promise<CustomerSession> {
    const [created] = await db.insert(customerSessions).values(session).returning();
    return created;
  }

  async getValidCustomerSession(token: string): Promise<CustomerSession | undefined> {
    const [session] = await db.select().from(customerSessions)
      .where(
        and(
          eq(customerSessions.token, token),
          gt(customerSessions.expiresAt, new Date())
        )
      );
    return session;
  }

  async deleteCustomerSession(token: string): Promise<void> {
    await db.delete(customerSessions).where(eq(customerSessions.token, token));
  }

  async getSiteConfigsByOwner(ownerId: string): Promise<SiteConfig[]> {
    return db.select().from(siteConfigs)
      .where(eq(siteConfigs.ownerId, ownerId))
      .orderBy(desc(siteConfigs.createdAt));
  }

  async claimUnlinkedSitesByPhone(phone: string, customerAccountId: string): Promise<number> {
    const leads = await db.select().from(demoLeads).where(eq(demoLeads.phone, phone));
    let claimed = 0;
    for (const lead of leads) {
      if (lead.placeId) {
        const site = await this.getSiteConfigByPlaceId(lead.placeId);
        if (site && !site.ownerId) {
          await this.updateSiteConfig(site.id, { ownerId: customerAccountId });
          claimed++;
        }
      }
    }
    return claimed;
  }

  async getOgSettingsByPath(pagePath: string): Promise<any | undefined> {
    const [settings] = await db.select().from(ogSettings).where(eq(ogSettings.pagePath, pagePath));
    return settings;
  }

  async getAllOgSettings(): Promise<any[]> {
    return db.select().from(ogSettings).orderBy(ogSettings.pagePath);
  }

  async upsertOgSettings(settings: any): Promise<any> {
    const existing = await this.getOgSettingsByPath(settings.pagePath);
    if (existing) {
      const [updated] = await db.update(ogSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(ogSettings.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(ogSettings).values(settings).returning();
    return created;
  }

  async deleteOgSettings(id: string): Promise<boolean> {
    await db.delete(ogSettings).where(eq(ogSettings.id, id));
    return true;
  }

  // Inquiry operations
  async getInquiries(filters?: {
    status?: string;
    priority?: string;
    source?: string;
    assignedTo?: string;
    limit?: number;
  }): Promise<Inquiry[]> {
    let query = db.select().from(inquiries);
    
    const conditions = [];
    if (filters?.status) conditions.push(eq(inquiries.status, filters.status));
    if (filters?.priority) conditions.push(eq(inquiries.priority, filters.priority));
    if (filters?.source) conditions.push(eq(inquiries.source, filters.source));
    if (filters?.assignedTo) conditions.push(eq(inquiries.assignedTo, filters.assignedTo));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const result = await query.orderBy(desc(inquiries.createdAt)).limit(filters?.limit || 100);
    return result;
  }

  async getInquiry(id: string): Promise<Inquiry | undefined> {
    const [inq] = await db.select().from(inquiries).where(eq(inquiries.id, id));
    return inq;
  }

  async createInquiry(inq: InsertInquiry): Promise<Inquiry> {
    const [created] = await db.insert(inquiries).values(inq).returning();
    return created;
  }

  async updateInquiry(id: string, updates: Partial<InsertInquiry>): Promise<Inquiry | undefined> {
    const [updated] = await db.update(inquiries)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(inquiries.id, id))
      .returning();
    return updated;
  }

  async deleteInquiry(id: string): Promise<boolean> {
    await db.delete(inquiries).where(eq(inquiries.id, id));
    return true;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Platform Identity – System of Record for stable internal platform_id
  // ──────────────────────────────────────────────────────────────────────────────

  async getOrCreatePlatformId(siteConfigId: string): Promise<string> {
    const [existing] = await db
      .select({ platformId: platformBusinessMap.platformId })
      .from(platformBusinessMap)
      .where(eq(platformBusinessMap.siteConfigId, siteConfigId))
      .limit(1);

    if (existing) {
      return existing.platformId;
    }

    const [siteConfig] = await db
      .select({ placeId: siteConfigs.placeId })
      .from(siteConfigs)
      .where(eq(siteConfigs.id, siteConfigId))
      .limit(1);

    const inserted = await db
      .insert(platformBusinessMap)
      .values({
        siteConfigId,
        googlePlaceId: siteConfig?.placeId ?? null,
      })
      .onConflictDoNothing()
      .returning({ platformId: platformBusinessMap.platformId });

    if (inserted.length > 0) {
      return inserted[0].platformId;
    }

    const [raceRow] = await db
      .select({ platformId: platformBusinessMap.platformId })
      .from(platformBusinessMap)
      .where(eq(platformBusinessMap.siteConfigId, siteConfigId))
      .limit(1);

    if (!raceRow) {
      throw new Error(`[Storage] Failed to resolve platform_id for siteConfigId=${siteConfigId}`);
    }

    return raceRow.platformId;
  }

  async resolvePlatformId(
    input: { siteConfigId?: string; googlePlaceId?: string },
  ): Promise<PlatformBusinessMap | null> {
    if (input.siteConfigId) {
      const [existing] = await db
        .select()
        .from(platformBusinessMap)
        .where(eq(platformBusinessMap.siteConfigId, input.siteConfigId))
        .limit(1);

      if (existing) {
        return existing;
      }

      await this.getOrCreatePlatformId(input.siteConfigId);

      const [row] = await db
        .select()
        .from(platformBusinessMap)
        .where(eq(platformBusinessMap.siteConfigId, input.siteConfigId))
        .limit(1);
      return row ?? null;
    }

    if (input.googlePlaceId) {
      const [row] = await db
        .select()
        .from(platformBusinessMap)
        .where(eq(platformBusinessMap.googlePlaceId, input.googlePlaceId))
        .limit(1);
      return row ?? null;
    }

    return null;
  }

  async getSiteConfigIdByPlatformId(platformId: string): Promise<string | null> {
    const [row] = await db
      .select({ siteConfigId: platformBusinessMap.siteConfigId })
      .from(platformBusinessMap)
      .where(eq(platformBusinessMap.platformId, platformId as any))
      .limit(1);
    return row?.siteConfigId ?? null;
  }

  async createVoiceUsageLog(log: InsertVoiceUsageLog): Promise<VoiceUsageLog> {
    const [created] = await db.insert(voiceUsageLogs).values(log).returning();
    return created;
  }

  async getVoiceUsageLogs(siteConfigId: string, limit = 50): Promise<VoiceUsageLog[]> {
    return db
      .select()
      .from(voiceUsageLogs)
      .where(eq(voiceUsageLogs.siteConfigId, siteConfigId))
      .orderBy(desc(voiceUsageLogs.createdAt))
      .limit(limit);
  }

  // QR Routes (shadow telecom); optional search filters by label, destination, variable (URL/id); siteConfigId filters to that site
  async getQrRoutes(page = 1, limit = 50, search?: string, siteConfigId?: string | null): Promise<{ routes: QrRoute[]; total: number }> {
    const offset = (page - 1) * limit;
    const pattern = search?.trim() ? `%${search.trim().replace(/%/g, "\\%")}%` : null;
    const searchCond = pattern
      ? or(
          ilike(qrRoutes.label, pattern),
          ilike(qrRoutes.destination, pattern),
          ilike(sql`${qrRoutes.variable}::text`, pattern),
          sql`${qrRoutes.id}::text = ${search.trim()}`
        )
      : undefined;
    const siteCond = siteConfigId ? eq(qrRoutes.siteConfigId, siteConfigId) : undefined;
    const conditions =
      searchCond && siteCond
        ? and(searchCond, siteCond)
        : searchCond
          ? searchCond
          : siteCond ?? undefined;
    const countQuery = conditions
      ? db.select({ count: sql<number>`count(*)::int` }).from(qrRoutes).where(conditions)
      : db.select({ count: sql<number>`count(*)::int` }).from(qrRoutes);
    const [countRow] = await countQuery;
    const total = countRow?.count ?? 0;
    const q = db.select().from(qrRoutes).orderBy(asc(qrRoutes.id)).limit(limit).offset(offset);
    const routes = conditions ? await q.where(conditions) : await q;
    return { routes, total };
  }

  async getQrRoute(id: number): Promise<QrRoute | undefined> {
    const [row] = await db.select().from(qrRoutes).where(eq(qrRoutes.id, id)).limit(1);
    return row;
  }

  async createQrRoute(data: Partial<InsertQrRoute>): Promise<QrRoute> {
    const [created] = await db.insert(qrRoutes).values(data as InsertQrRoute).returning();
    return created;
  }

  async updateQrRoute(id: number, updates: Partial<InsertQrRoute>): Promise<QrRoute | undefined> {
    const [updated] = await db
      .update(qrRoutes)
      .set({ ...updates, updatedAt: new Date() } as Partial<InsertQrRoute>)
      .where(eq(qrRoutes.id, id))
      .returning();
    return updated;
  }

  async deleteQrRoute(id: number): Promise<boolean> {
    await db.delete(qrRoutes).where(eq(qrRoutes.id, id));
    return true;
  }

  async getQrFirewallRules(routeId?: number): Promise<QrFirewallRule[]> {
    if (routeId != null) {
      return db.select().from(qrFirewall).where(eq(qrFirewall.qrRouteId, routeId)).orderBy(asc(qrFirewall.id));
    }
    return db.select().from(qrFirewall).orderBy(asc(qrFirewall.id));
  }

  async createQrFirewallRule(data: InsertQrFirewallRule): Promise<QrFirewallRule> {
    const [created] = await db.insert(qrFirewall).values(data).returning();
    return created;
  }

  async deleteQrFirewallRule(id: number): Promise<boolean> {
    await db.delete(qrFirewall).where(eq(qrFirewall.id, id));
    return true;
  }

  async getQrAccessLog(routeId: number, page = 1, limit = 50): Promise<{ logs: QrAccessLog[]; total: number }> {
    const offset = (page - 1) * limit;
    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(qrAccess)
      .where(eq(qrAccess.qrRouteId, routeId));
    const total = countRow?.count ?? 0;
    const logs = await db
      .select()
      .from(qrAccess)
      .where(eq(qrAccess.qrRouteId, routeId))
      .orderBy(desc(qrAccess.accessedAt))
      .limit(limit)
      .offset(offset);
    return { logs, total };
  }

  async logQrAccess(data: InsertQrAccessLog): Promise<QrAccessLog> {
    const [created] = await db.insert(qrAccess).values(data).returning();
    return created;
  }

  async incrementQrScanCount(id: number): Promise<void> {
    await db
      .update(qrRoutes)
      .set({ scanCount: sql`${qrRoutes.scanCount} + 1`, updatedAt: new Date() })
      .where(eq(qrRoutes.id, id));
  }

  async getQrScanStatsBySite(siteConfigId: string): Promise<{ totalScans: number; byRoute: { routeId: number; label: string | null; scans: number }[]; last7Days: number; last30Days: number }> {
    const routes = await db.select({ id: qrRoutes.id, label: qrRoutes.label }).from(qrRoutes).where(eq(qrRoutes.siteConfigId, siteConfigId));
    const byRoute: { routeId: number; label: string | null; scans: number }[] = [];
    let totalScans = 0;
    let last7Days = 0;
    let last30Days = 0;
    for (const r of routes) {
      const [tot] = await db.select({ c: sql<number>`count(*)::int` }).from(qrAccess).where(eq(qrAccess.qrRouteId, r.id));
      const [d7] = await db.select({ c: sql<number>`count(*)::int` }).from(qrAccess).where(and(eq(qrAccess.qrRouteId, r.id), sql`${qrAccess.accessedAt} >= now() - interval '7 days'`));
      const [d30] = await db.select({ c: sql<number>`count(*)::int` }).from(qrAccess).where(and(eq(qrAccess.qrRouteId, r.id), sql`${qrAccess.accessedAt} >= now() - interval '30 days'`));
      const scans = tot?.c ?? 0;
      totalScans += scans;
      last7Days += d7?.c ?? 0;
      last30Days += d30?.c ?? 0;
      byRoute.push({ routeId: r.id, label: r.label, scans });
    }
    return { totalScans, byRoute, last7Days, last30Days };
  }

  async recordSlugLanding(siteConfigId: string, source: string): Promise<void> {
    await db.insert(slugLandings).values({ siteConfigId, source });
  }

  async logConversationEvent(data: { siteConfigId: string; callSid?: string | null; sessionId?: string | null; eventType: string; metadata?: Record<string, unknown> }): Promise<void> {
    await db.insert(conversationEvents).values({
      siteConfigId: data.siteConfigId,
      callSid: data.callSid ?? null,
      sessionId: data.sessionId ?? null,
      eventType: data.eventType,
      metadata: redactSensitiveMetadata(data.metadata) as Record<string, unknown>,
    });
  }

  async getSessionEventSiteConfigId(sessionId: string): Promise<string | null> {
    const [row] = await db
      .select({ siteConfigId: conversationEvents.siteConfigId })
      .from(conversationEvents)
      .where(eq(conversationEvents.sessionId, sessionId))
      .orderBy(desc(conversationEvents.occurredAt))
      .limit(1);
    return row?.siteConfigId ?? null;
  }

  async getFrontDeskSessions(
    siteConfigId: string,
    opts?: { includeResolved?: boolean; limit?: number }
  ): Promise<{
    sessions: FrontDeskSession[];
    updatedAt: string;
    projectionVersion: number;
  }> {
    const includeResolved = opts?.includeResolved ?? true;
    const limit = Math.min(Math.max(opts?.limit ?? 300, 1), 1000);

    const [meta] = await db
      .select({
        projectionVersion: sql<number>`coalesce(max(${conversationEvents.id}), 0)::int`,
        latestOccurredAt: sql<Date | null>`max(${conversationEvents.occurredAt})`,
      })
      .from(conversationEvents)
      .where(
        and(
          eq(conversationEvents.siteConfigId, siteConfigId),
          isNotNull(conversationEvents.sessionId)
        )
      );

    const rowsDesc = await db
      .select({
        sessionId: conversationEvents.sessionId,
        eventType: conversationEvents.eventType,
        occurredAt: conversationEvents.occurredAt,
        metadata: conversationEvents.metadata,
      })
      .from(conversationEvents)
      .where(
        and(
          eq(conversationEvents.siteConfigId, siteConfigId),
          isNotNull(conversationEvents.sessionId)
        )
      )
      .orderBy(desc(conversationEvents.occurredAt))
      .limit(limit);
    const rows = [...rowsDesc].reverse();

    const bySession = new Map<string, FrontDeskSession>();
    const transcriptBySession = new Map<string, string[]>();

    for (const row of rows) {
      const sessionId = row.sessionId?.trim();
      if (!sessionId) continue;
      const metadata = (row.metadata ?? {}) as Record<string, unknown>;
      const occurredAtIso = new Date(row.occurredAt).toISOString();
      const existing = bySession.get(sessionId);
      const snippet = this.extractTranscriptSnippet(metadata);
      if (snippet) {
        const snippets = transcriptBySession.get(sessionId) ?? [];
        snippets.push(snippet);
        transcriptBySession.set(sessionId, snippets.slice(-2));
      }

      const next: FrontDeskSession = existing ?? {
        sessionId,
        siteConfigId,
        entrySource: "web_chat",
        verificationState: "unknown",
        workflowState: "NEW",
        escalationState: "none",
        operatorJoined: false,
        assistMode: "none",
        lastActivityAt: occurredAtIso,
        workflowFlags: {},
      };

      const entrySource = frontDeskEntrySourceSchema.safeParse(metadata.entrySource);
      if (entrySource.success) next.entrySource = entrySource.data;

      const verificationState = frontDeskVerificationStateSchema.safeParse(metadata.verificationState);
      if (verificationState.success) {
        next.verificationState = verificationState.data;
      } else if (typeof metadata.customerVerified === "boolean") {
        next.verificationState = metadata.customerVerified ? "verified" : "unverified";
      }

      const workflowState = frontDeskWorkflowStateSchema.safeParse(metadata.workflowState);
      if (workflowState.success) next.workflowState = workflowState.data;

      const assistMode = frontDeskAssistModeSchema.safeParse(metadata.assistMode);
      if (assistMode.success) next.assistMode = assistMode.data;

      if (typeof metadata.escalationState === "string" && metadata.escalationState.trim()) {
        next.escalationState = metadata.escalationState;
      }

      if (row.eventType === "frontdesk.assist_joined") {
        next.operatorJoined = true;
        if (next.assistMode === "none") next.assistMode = "observe";
        if (next.workflowState !== "RESOLVED") next.workflowState = "OPERATOR_JOINED";
      } else if (row.eventType === "frontdesk.assist_ended") {
        next.operatorJoined = false;
        next.assistMode = "none";
        if (next.workflowState !== "RESOLVED") next.workflowState = "AI_ACTIVE";
      } else if (row.eventType === "frontdesk.outcome_captured") {
        const outcome = frontDeskOutcomeTypeSchema.safeParse(metadata.outcomeType);
        next.outcomeType = outcome.success ? outcome.data : "resolved_no_action";
        next.workflowState = "RESOLVED";
        next.resolvedAt =
          typeof metadata.resolvedAt === "string" && metadata.resolvedAt
            ? metadata.resolvedAt
            : occurredAtIso;
        if (typeof metadata.resolvedBy === "string" && metadata.resolvedBy) {
          next.resolvedBy = metadata.resolvedBy;
        }
      } else if (row.eventType === "intake.secure_status_updated") {
        const flags = next.workflowFlags ?? {};
        const flagKeys = [
          "identityVerified",
          "insuranceCaptured",
          "attorneyCaptured",
          "consentSigned",
          "secureInputCompleted",
        ] as const;
        for (const flagKey of flagKeys) {
          if (typeof metadata[flagKey] === "boolean") {
            (flags as Record<string, boolean>)[flagKey] = metadata[flagKey] as boolean;
          }
        }
        next.workflowFlags = flags;
      } else if (row.eventType === "intake.module_status") {
        const flags = next.workflowFlags ?? {};
        const statusKey = typeof metadata.statusKey === "string" ? metadata.statusKey : undefined;
        const statusValue = typeof metadata.statusValue === "boolean" ? metadata.statusValue : undefined;
        if (statusKey && statusValue !== undefined) {
          (flags as Record<string, boolean>)[statusKey] = statusValue;
          next.workflowFlags = flags;
        }
      } else if (row.eventType.startsWith("verification.")) {
        const stateFromType = row.eventType.replace("verification.", "");
        const state =
          frontDeskVerificationStateSchema.safeParse(metadata.verificationState).success
            ? (metadata.verificationState as string)
            : stateFromType;
        if (
          state === "required" ||
          state === "otp_sent" ||
          state === "verified" ||
          state === "failed" ||
          state === "bypass_allowed"
        ) {
          next.verificationState = state;
          const flags = next.workflowFlags ?? {};
          flags.verificationRequired = state === "required";
          flags.otpSent = state === "otp_sent";
          flags.verificationVerified = state === "verified";
          flags.verificationFailed = state === "failed";
          flags.verificationBypassAllowed = state === "bypass_allowed";
          flags.identityVerified = state === "verified";
          if (typeof metadata.idDocumentVerified === "boolean") {
            flags.idDocumentVerified = metadata.idDocumentVerified;
          }
          if (typeof metadata.selfiePhotoMatchVerified === "boolean") {
            flags.selfiePhotoMatchVerified = metadata.selfiePhotoMatchVerified;
          }
          if (typeof metadata.insuranceCardVerified === "boolean") {
            flags.insuranceCardVerified = metadata.insuranceCardVerified;
          }
          next.workflowFlags = flags;
        }
      }

      next.lastActivityAt = occurredAtIso;
      next.transcriptPreview = this.formatTranscriptPreview(
        transcriptBySession.get(sessionId) ?? []
      );
      bySession.set(sessionId, next);
    }

    const sessions = Array.from(bySession.values())
      .filter((session) => includeResolved || session.workflowState !== "RESOLVED")
      .sort((a, b) => {
        const aResolved = a.workflowState === "RESOLVED";
        const bResolved = b.workflowState === "RESOLVED";
        if (aResolved !== bResolved) return aResolved ? 1 : -1;
        return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
      });

    return {
      sessions,
      updatedAt: meta?.latestOccurredAt
        ? new Date(meta.latestOccurredAt).toISOString()
        : new Date().toISOString(),
      projectionVersion: meta?.projectionVersion ?? 0,
    };
  }

  async getConversationEvents(siteConfigId: string, opts?: { page?: number; limit?: number; from?: Date; to?: Date; eventType?: string }): Promise<{ events: { id: number; siteConfigId: string; callSid: string | null; sessionId: string | null; eventType: string; occurredAt: Date; metadata: Record<string, unknown> | null }[]; total: number }> {
    const page = opts?.page ?? 1;
    const limit = Math.min(opts?.limit ?? 50, 100);
    const offset = (page - 1) * limit;
    const conditions = [eq(conversationEvents.siteConfigId, siteConfigId)];
    if (opts?.from) conditions.push(sql`${conversationEvents.occurredAt} >= ${opts.from}`);
    if (opts?.to) conditions.push(sql`${conversationEvents.occurredAt} <= ${opts.to}`);
    if (opts?.eventType) conditions.push(eq(conversationEvents.eventType, opts.eventType));
    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];
    const [countRow] = await db.select({ count: sql<number>`count(*)::int` }).from(conversationEvents).where(whereClause);
    const total = countRow?.count ?? 0;
    const events = await db.select().from(conversationEvents).where(whereClause).orderBy(desc(conversationEvents.occurredAt)).limit(limit).offset(offset);
    return { events: events as { id: number; siteConfigId: string; callSid: string | null; sessionId: string | null; eventType: string; occurredAt: Date; metadata: Record<string, unknown> | null }[], total };
  }

  async getConversationEventsSummary(siteConfigId: string, opts?: { from?: Date; to?: Date }): Promise<{ byEventType: { eventType: string; count: number }[] }> {
    const conditions = [eq(conversationEvents.siteConfigId, siteConfigId)];
    if (opts?.from) conditions.push(sql`${conversationEvents.occurredAt} >= ${opts.from}`);
    if (opts?.to) conditions.push(sql`${conversationEvents.occurredAt} <= ${opts.to}`);
    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];
    const rows = await db
      .select({ eventType: conversationEvents.eventType, count: sql<number>`count(*)::int` })
      .from(conversationEvents)
      .where(whereClause)
      .groupBy(conversationEvents.eventType);
    return { byEventType: rows.map((r) => ({ eventType: r.eventType, count: r.count })) };
  }

  async getOutcomeSummary(
    siteConfigId: string,
    opts?: { from?: Date; to?: Date }
  ): Promise<{
    totalResolved: number;
    bookings: number;
    leads: number;
    tasks: number;
    escalations: number;
    resolvedNoAction: number;
    operatorJoinedCount: number;
  }> {
    const conditions = [eq(conversationEvents.siteConfigId, siteConfigId)];
    if (opts?.from) conditions.push(sql`${conversationEvents.occurredAt} >= ${opts.from}`);
    if (opts?.to) conditions.push(sql`${conversationEvents.occurredAt} <= ${opts.to}`);
    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const rows = await db
      .select({
        eventType: conversationEvents.eventType,
        metadata: conversationEvents.metadata,
      })
      .from(conversationEvents)
      .where(whereClause);

    const summary = {
      totalResolved: 0,
      bookings: 0,
      leads: 0,
      tasks: 0,
      escalations: 0,
      resolvedNoAction: 0,
      operatorJoinedCount: 0,
    };

    for (const row of rows) {
      if (row.eventType === "frontdesk.assist_joined") {
        summary.operatorJoinedCount += 1;
      }
      if (row.eventType === "frontdesk.outcome_captured") {
        summary.totalResolved += 1;
        const outcomeType = String((row.metadata as Record<string, unknown> | null)?.outcomeType ?? "");
        if (outcomeType === "booking") summary.bookings += 1;
        else if (outcomeType === "lead") summary.leads += 1;
        else if (outcomeType === "task") summary.tasks += 1;
        else if (outcomeType === "escalated") summary.escalations += 1;
        else summary.resolvedNoAction += 1;
      }
    }

    return summary;
  }
}

export const storage = new DatabaseStorage();
