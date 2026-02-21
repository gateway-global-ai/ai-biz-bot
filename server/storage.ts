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
  type Task,
  type InsertTask,
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
  type KnowledgeTopic,
  type InsertKnowledgeTopic,
  type LessonPlan,
  type InsertLessonPlan,
  type LessonSession,
  type InsertLessonSession,
  type Organization,
  type InsertOrganization,
  type Project,
  type InsertProject,
  type ProjectTask,
  type InsertProjectTask,
  type DemoLead,
  type InsertDemoLead,
  type BotTemplate,
  type InsertBotTemplate,
  type SiteConfig,
  type InsertSiteConfig,
  type ChatLog,
  type InsertChatLog,
  type CustomerAccount,
  type InsertCustomerAccount,
  type CustomerSession,
  type InsertCustomerSession,
  type VlmProspect,
  type InsertVlmProspect,
  type VlmCampaign,
  type InsertVlmCampaign,
  type VlmCallAttempt,
  type InsertVlmCallAttempt,
  type Inquiry,
  type InsertInquiry,
  type PlatformBusinessMap,
  botTemplates,
  telephonyConfigs,
  callLogs,
  users,
  agents,
  customers,
  smsConversations,
  smsMessages,
  tasks,
  adminUsers,
  otpCodes,
  authSessions,
  twilioSubAccounts,
  smsDeliveryStatus,
  a2pBrands,
  a2pCampaigns,
  knowledgeTopics,
  lessonPlans,
  lessonSessions,
  organizations,
  projects,
  projectTasks,
  demoLeads,
  siteConfigs,
  chatLogs,
  customerAccounts,
  customerSessions,
  vlmProspects,
  vlmCampaigns,
  vlmCallAttempts,
  ogSettings,
  inquiries,
  platformBusinessMap,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, ilike, or, lte, isNull, and, gt } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getTelephonyConfig(): Promise<TelephonyConfig | undefined>;
  createTelephonyConfig(config: InsertTelephonyConfig): Promise<TelephonyConfig>;
  updateTelephonyConfig(id: string, updates: Partial<InsertTelephonyConfig>): Promise<TelephonyConfig | undefined>;
  
  getCallLogs(configId?: string, limit?: number): Promise<CallLog[]>;
  createCallLog(log: InsertCallLog): Promise<CallLog>;
  
  // Agent operations
  getAgents(): Promise<Agent[]>;
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
  
  // Task operations (MVP)
  getTask(id: string): Promise<Task | undefined>;
  getTasksByPhone(phone: string): Promise<Task[]>;
  getTasksPendingUpdate(): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, updates: Partial<InsertTask>): Promise<Task | undefined>;
  
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
  
  // Organization operations
  getOrganizations(): Promise<Organization[]>;
  getOrganization(id: string): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(id: string, updates: Partial<InsertOrganization>): Promise<Organization | undefined>;
  deleteOrganization(id: string): Promise<boolean>;
  
  // Project operations
  getProjects(orgId?: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;
  
  // Project Task operations
  getProjectTasks(projectId: string): Promise<ProjectTask[]>;
  getProjectTask(id: string): Promise<ProjectTask | undefined>;
  createProjectTask(task: InsertProjectTask): Promise<ProjectTask>;
  updateProjectTask(id: string, updates: Partial<InsertProjectTask>): Promise<ProjectTask | undefined>;
  deleteProjectTask(id: string): Promise<boolean>;
  
  createDemoLead(lead: InsertDemoLead): Promise<DemoLead>;
  getDemoLead(id: string): Promise<DemoLead | undefined>;
  getDemoLeadByToken(token: string): Promise<DemoLead | undefined>;
  getDemoLeadByPhone(phone: string): Promise<DemoLead | undefined>;
  getAllDemoLeads(): Promise<DemoLead[]>;
  updateDemoLead(id: string, updates: Partial<InsertDemoLead>): Promise<DemoLead | undefined>;
  
  // Bot Template operations
  getBotTemplates(): Promise<BotTemplate[]>;
  getBotTemplate(id: string): Promise<BotTemplate | undefined>;
  createBotTemplate(template: InsertBotTemplate): Promise<BotTemplate>;
  updateBotTemplate(id: string, updates: Partial<InsertBotTemplate>): Promise<BotTemplate | undefined>;
  deleteBotTemplate(id: string): Promise<boolean>;
  
  // Site Config operations
  getSiteConfigs(): Promise<SiteConfig[]>;
  getSiteConfig(id: string): Promise<SiteConfig | undefined>;
  getSiteConfigById(id: string): Promise<SiteConfig | null>;
  getSiteConfigByDomain(domain: string): Promise<SiteConfig | undefined>;
  getSiteConfigByPlaceId(placeId: string): Promise<SiteConfig | undefined>;
  createSiteConfig(config: InsertSiteConfig): Promise<SiteConfig>;
  updateSiteConfig(id: string, updates: Partial<InsertSiteConfig>): Promise<SiteConfig | undefined>;
  deleteSiteConfig(id: string): Promise<boolean>;
  
  // Chat Log operations
  getChatLogs(siteConfigId: string, limit?: number): Promise<ChatLog[]>;
  createChatLog(log: InsertChatLog): Promise<ChatLog>;

  // Customer Account operations
  getCustomerAccountByPhone(phone: string): Promise<CustomerAccount | undefined>;
  getCustomerAccountById(id: string): Promise<CustomerAccount | undefined>;
  createCustomerAccount(account: InsertCustomerAccount): Promise<CustomerAccount>;
  updateCustomerAccount(id: string, updates: Partial<InsertCustomerAccount>): Promise<CustomerAccount | undefined>;
  updateCustomerAccountLastLogin(id: string): Promise<void>;

  // Customer Session operations
  createCustomerSession(session: InsertCustomerSession): Promise<CustomerSession>;
  getValidCustomerSession(token: string): Promise<CustomerSession | undefined>;
  deleteCustomerSession(token: string): Promise<void>;

  // Site Config by owner
  getSiteConfigsByOwner(ownerId: string): Promise<SiteConfig[]>;
  claimUnlinkedSitesByPhone(phone: string, customerAccountId: string): Promise<number>;

  // VLM Prospect operations
  getVlmProspects(options?: { industry?: string; city?: string; status?: string; limit?: number }): Promise<VlmProspect[]>;
  getVlmProspect(id: string): Promise<VlmProspect | undefined>;
  getVlmProspectByPlaceId(placeId: string): Promise<VlmProspect | undefined>;
  createVlmProspect(prospect: InsertVlmProspect): Promise<VlmProspect>;
  createVlmProspects(prospects: InsertVlmProspect[]): Promise<VlmProspect[]>;
  updateVlmProspect(id: string, updates: Partial<InsertVlmProspect>): Promise<VlmProspect | undefined>;
  deleteVlmProspect(id: string): Promise<boolean>;

  // VLM Campaign operations
  getVlmCampaigns(): Promise<VlmCampaign[]>;
  getVlmCampaign(id: string): Promise<VlmCampaign | undefined>;
  createVlmCampaign(campaign: InsertVlmCampaign): Promise<VlmCampaign>;
  updateVlmCampaign(id: string, updates: Partial<InsertVlmCampaign>): Promise<VlmCampaign | undefined>;
  deleteVlmCampaign(id: string): Promise<boolean>;

  // VLM Call Attempt operations
  getVlmCallAttempts(options?: { campaignId?: string; prospectId?: string; limit?: number }): Promise<VlmCallAttempt[]>;
  getVlmCallAttemptByCallSid(callSid: string): Promise<VlmCallAttempt | undefined>;
  createVlmCallAttempt(attempt: InsertVlmCallAttempt): Promise<VlmCallAttempt>;
  updateVlmCallAttempt(id: string, updates: Partial<InsertVlmCallAttempt>): Promise<VlmCallAttempt | undefined>;

  getOgSettingsByPath(pagePath: string): Promise<any | undefined>;
  getAllOgSettings(): Promise<any[]>;
  upsertOgSettings(settings: any): Promise<any>;
  deleteOgSettings(id: string): Promise<boolean>;

  // Platform Identity
  getOrCreatePlatformId(siteConfigId: string): Promise<string>;
  resolvePlatformId(input: { siteConfigId?: string; googlePlaceId?: string }): Promise<PlatformBusinessMap | null>;
  getSiteConfigIdByPlatformId(platformId: string): Promise<string | null>;
}

export class DatabaseStorage implements IStorage {
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

  // Task operations (MVP)
  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async getTasksByPhone(phone: string): Promise<Task[]> {
    return db.select().from(tasks)
      .where(eq(tasks.userPhone, phone))
      .orderBy(desc(tasks.createdAt));
  }

  async getTasksPendingUpdate(): Promise<Task[]> {
    const now = new Date();
    return db.select().from(tasks)
      .where(
        and(
          lte(tasks.nextUpdateAt, now),
          or(
            eq(tasks.status, 'started'),
            eq(tasks.status, 'in_progress')
          )
        )
      );
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [created] = await db.insert(tasks).values(task).returning();
    return created;
  }

  async updateTask(id: string, updates: Partial<InsertTask>): Promise<Task | undefined> {
    const [updated] = await db
      .update(tasks)
      .set(updates)
      .where(eq(tasks.id, id))
      .returning();
    return updated;
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

  // Knowledge Topics methods
  async getKnowledgeTopicByNormalized(normalizedTopic: string): Promise<KnowledgeTopic | undefined> {
    const [topic] = await db.select().from(knowledgeTopics)
      .where(eq(knowledgeTopics.normalizedTopic, normalizedTopic));
    return topic;
  }

  async getKnowledgeTopicById(id: string): Promise<KnowledgeTopic | undefined> {
    const [topic] = await db.select().from(knowledgeTopics)
      .where(eq(knowledgeTopics.id, id));
    return topic;
  }

  async createKnowledgeTopic(topic: InsertKnowledgeTopic): Promise<KnowledgeTopic> {
    const [created] = await db.insert(knowledgeTopics).values(topic).returning();
    return created;
  }

  async incrementTopicRequestCount(id: string): Promise<void> {
    const topic = await this.getKnowledgeTopicById(id);
    if (topic) {
      await db.update(knowledgeTopics)
        .set({ requestCount: (topic.requestCount || 0) + 1, updatedAt: new Date() })
        .where(eq(knowledgeTopics.id, id));
    }
  }

  async updateTopicBestLesson(id: string, lessonId: string): Promise<void> {
    await db.update(knowledgeTopics)
      .set({ bestLessonId: lessonId, updatedAt: new Date() })
      .where(eq(knowledgeTopics.id, id));
  }

  async updateTopicVersion(id: string, version: number, lessonId: string): Promise<void> {
    await db.update(knowledgeTopics)
      .set({ currentVersion: version, bestLessonId: lessonId, updatedAt: new Date() })
      .where(eq(knowledgeTopics.id, id));
  }

  async getPopularKnowledgeTopics(limit: number = 10): Promise<KnowledgeTopic[]> {
    return await db.select().from(knowledgeTopics)
      .orderBy(desc(knowledgeTopics.requestCount))
      .limit(limit);
  }

  // Lesson Plans methods
  async getLessonPlanById(id: string): Promise<LessonPlan | undefined> {
    const [lesson] = await db.select().from(lessonPlans)
      .where(eq(lessonPlans.id, id));
    return lesson;
  }

  async createLessonPlan(lesson: InsertLessonPlan): Promise<LessonPlan> {
    const [created] = await db.insert(lessonPlans).values(lesson).returning();
    return created;
  }

  async incrementLessonCompletionCount(id: string): Promise<void> {
    const lesson = await this.getLessonPlanById(id);
    if (lesson) {
      await db.update(lessonPlans)
        .set({ completionCount: (lesson.completionCount || 0) + 1, updatedAt: new Date() })
        .where(eq(lessonPlans.id, id));
    }
  }

  async updateLessonQuizStats(id: string, newScore: number): Promise<void> {
    const lesson = await this.getLessonPlanById(id);
    if (lesson) {
      const totalAttempts = (lesson.totalQuizAttempts || 0) + 1;
      const currentAvg = lesson.avgQuizScore || 0;
      const newAvg = Math.round(((currentAvg * (totalAttempts - 1)) + newScore) / totalAttempts);
      
      await db.update(lessonPlans)
        .set({ avgQuizScore: newAvg, totalQuizAttempts: totalAttempts, updatedAt: new Date() })
        .where(eq(lessonPlans.id, id));
    }
  }

  // Lesson Sessions methods
  async createLessonSession(session: InsertLessonSession): Promise<LessonSession> {
    const [created] = await db.insert(lessonSessions).values(session).returning();
    return created;
  }

  async getLessonSessionsByLessonId(lessonId: string): Promise<LessonSession[]> {
    return await db.select().from(lessonSessions)
      .where(eq(lessonSessions.lessonPlanId, lessonId))
      .orderBy(desc(lessonSessions.startedAt));
  }

  // Organization operations
  async getOrganizations(): Promise<Organization[]> {
    return db.select().from(organizations).orderBy(desc(organizations.createdAt));
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const [created] = await db.insert(organizations).values(org).returning();
    return created;
  }

  async updateOrganization(id: string, updates: Partial<InsertOrganization>): Promise<Organization | undefined> {
    const [updated] = await db.update(organizations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return updated;
  }

  async deleteOrganization(id: string): Promise<boolean> {
    await db.delete(organizations).where(eq(organizations.id, id));
    return true;
  }

  // Project operations
  async getProjects(orgId?: string): Promise<Project[]> {
    if (orgId) {
      return db.select().from(projects)
        .where(eq(projects.orgId, orgId))
        .orderBy(desc(projects.createdAt));
    }
    return db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [created] = await db.insert(projects).values(project).returning();
    return created;
  }

  async updateProject(id: string, updates: Partial<InsertProject>): Promise<Project | undefined> {
    const [updated] = await db.update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updated;
  }

  async deleteProject(id: string): Promise<boolean> {
    await db.delete(projectTasks).where(eq(projectTasks.projectId, id));
    await db.delete(projects).where(eq(projects.id, id));
    return true;
  }

  // Project Task operations
  async getProjectTasks(projectId: string): Promise<ProjectTask[]> {
    return db.select().from(projectTasks)
      .where(eq(projectTasks.projectId, projectId))
      .orderBy(desc(projectTasks.createdAt));
  }

  async getProjectTask(id: string): Promise<ProjectTask | undefined> {
    const [task] = await db.select().from(projectTasks).where(eq(projectTasks.id, id));
    return task;
  }

  async createProjectTask(task: InsertProjectTask): Promise<ProjectTask> {
    const [created] = await db.insert(projectTasks).values(task).returning();
    return created;
  }

  async updateProjectTask(id: string, updates: Partial<InsertProjectTask>): Promise<ProjectTask | undefined> {
    const [updated] = await db.update(projectTasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projectTasks.id, id))
      .returning();
    return updated;
  }

  async deleteProjectTask(id: string): Promise<boolean> {
    await db.delete(projectTasks).where(eq(projectTasks.id, id));
    return true;
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

  async getBotTemplates(): Promise<BotTemplate[]> {
    return db.select().from(botTemplates).orderBy(desc(botTemplates.createdAt));
  }

  async getBotTemplate(id: string): Promise<BotTemplate | undefined> {
    const [template] = await db.select().from(botTemplates).where(eq(botTemplates.id, id));
    return template;
  }

  async createBotTemplate(template: InsertBotTemplate): Promise<BotTemplate> {
    const [created] = await db.insert(botTemplates).values(template).returning();
    return created;
  }

  async updateBotTemplate(id: string, updates: Partial<InsertBotTemplate>): Promise<BotTemplate | undefined> {
    const [updated] = await db.update(botTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(botTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteBotTemplate(id: string): Promise<boolean> {
    await db.delete(botTemplates).where(eq(botTemplates.id, id));
    return true;
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

  async createSiteConfig(config: InsertSiteConfig): Promise<SiteConfig> {
    const [created] = await db.insert(siteConfigs).values(config).returning();
    return created;
  }

  async updateSiteConfig(id: string, updates: Partial<InsertSiteConfig>): Promise<SiteConfig | undefined> {
    const [updated] = await db.update(siteConfigs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(siteConfigs.id, id))
      .returning();
    return updated;
  }

  async deleteSiteConfig(id: string): Promise<boolean> {
    await db.delete(siteConfigs).where(eq(siteConfigs.id, id));
    return true;
  }

  async getChatLogs(siteConfigId: string, limit = 50): Promise<ChatLog[]> {
    return db.select().from(chatLogs)
      .where(eq(chatLogs.siteConfigId, siteConfigId))
      .orderBy(desc(chatLogs.createdAt))
      .limit(limit);
  }

  async createChatLog(log: InsertChatLog): Promise<ChatLog> {
    const [created] = await db.insert(chatLogs).values(log).returning();
    return created;
  }

  async getCustomerAccountByPhone(phone: string): Promise<CustomerAccount | undefined> {
    const [account] = await db.select().from(customerAccounts).where(eq(customerAccounts.phone, phone));
    return account;
  }

  async getCustomerAccountById(id: string): Promise<CustomerAccount | undefined> {
    const [account] = await db.select().from(customerAccounts).where(eq(customerAccounts.id, id));
    return account;
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

  async getVlmProspects(options?: { industry?: string; city?: string; status?: string; limit?: number }): Promise<VlmProspect[]> {
    const conditions = [];
    if (options?.industry) conditions.push(eq(vlmProspects.industry, options.industry));
    if (options?.city) conditions.push(ilike(vlmProspects.city, `%${options.city}%`));
    if (options?.status) conditions.push(eq(vlmProspects.status, options.status));
    const query = db.select().from(vlmProspects);
    if (conditions.length > 0) {
      return (query as any).where(and(...conditions)).orderBy(desc(vlmProspects.qualityScore)).limit(options?.limit || 500);
    }
    return query.orderBy(desc(vlmProspects.qualityScore)).limit(options?.limit || 500);
  }

  async getVlmProspect(id: string): Promise<VlmProspect | undefined> {
    const [prospect] = await db.select().from(vlmProspects).where(eq(vlmProspects.id, id));
    return prospect;
  }

  async getVlmProspectByPlaceId(placeId: string): Promise<VlmProspect | undefined> {
    const [prospect] = await db.select().from(vlmProspects).where(eq(vlmProspects.googlePlaceId, placeId));
    return prospect;
  }

  async createVlmProspect(prospect: InsertVlmProspect): Promise<VlmProspect> {
    const [created] = await db.insert(vlmProspects).values(prospect).returning();
    return created;
  }

  async createVlmProspects(prospects: InsertVlmProspect[]): Promise<VlmProspect[]> {
    if (prospects.length === 0) return [];
    const created = await db.insert(vlmProspects).values(prospects).onConflictDoNothing({ target: vlmProspects.googlePlaceId }).returning();
    return created;
  }

  async updateVlmProspect(id: string, updates: Partial<InsertVlmProspect>): Promise<VlmProspect | undefined> {
    const [updated] = await db.update(vlmProspects).set(updates).where(eq(vlmProspects.id, id)).returning();
    return updated;
  }

  async deleteVlmProspect(id: string): Promise<boolean> {
    await db.delete(vlmProspects).where(eq(vlmProspects.id, id));
    return true;
  }

  async getVlmCampaigns(): Promise<VlmCampaign[]> {
    return db.select().from(vlmCampaigns).orderBy(desc(vlmCampaigns.createdAt));
  }

  async getVlmCampaign(id: string): Promise<VlmCampaign | undefined> {
    const [campaign] = await db.select().from(vlmCampaigns).where(eq(vlmCampaigns.id, id));
    return campaign;
  }

  async createVlmCampaign(campaign: InsertVlmCampaign): Promise<VlmCampaign> {
    const [created] = await db.insert(vlmCampaigns).values(campaign).returning();
    return created;
  }

  async updateVlmCampaign(id: string, updates: Partial<InsertVlmCampaign>): Promise<VlmCampaign | undefined> {
    const [updated] = await db.update(vlmCampaigns).set(updates).where(eq(vlmCampaigns.id, id)).returning();
    return updated;
  }

  async deleteVlmCampaign(id: string): Promise<boolean> {
    await db.delete(vlmCampaigns).where(eq(vlmCampaigns.id, id));
    return true;
  }

  async getVlmCallAttempts(options?: { campaignId?: string; prospectId?: string; limit?: number }): Promise<VlmCallAttempt[]> {
    const conditions = [];
    if (options?.campaignId) conditions.push(eq(vlmCallAttempts.campaignId, options.campaignId));
    if (options?.prospectId) conditions.push(eq(vlmCallAttempts.prospectId, options.prospectId));
    const query = db.select().from(vlmCallAttempts);
    if (conditions.length > 0) {
      return (query as any).where(and(...conditions)).orderBy(desc(vlmCallAttempts.createdAt)).limit(options?.limit || 200);
    }
    return query.orderBy(desc(vlmCallAttempts.createdAt)).limit(options?.limit || 200);
  }

  async getVlmCallAttemptByCallSid(callSid: string): Promise<VlmCallAttempt | undefined> {
    const [attempt] = await db.select().from(vlmCallAttempts).where(eq(vlmCallAttempts.callSid, callSid));
    return attempt;
  }

  async createVlmCallAttempt(attempt: InsertVlmCallAttempt): Promise<VlmCallAttempt> {
    const [created] = await db.insert(vlmCallAttempts).values(attempt).returning();
    return created;
  }

  async updateVlmCallAttempt(id: string, updates: Partial<InsertVlmCallAttempt>): Promise<VlmCallAttempt | undefined> {
    const [updated] = await db.update(vlmCallAttempts).set(updates).where(eq(vlmCallAttempts.id, id)).returning();
    return updated;
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
}

export const storage = new DatabaseStorage();
