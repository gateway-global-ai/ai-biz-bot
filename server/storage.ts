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
  twilioSubAccounts
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
    const result = await db.delete(agents).where(eq(agents.id, id));
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
    const result = await db.delete(customers).where(eq(customers.id, id));
    return true;
  }

  async getCustomerByPhone(phone: string): Promise<Customer | undefined> {
    // Normalize phone number for comparison (remove spaces, dashes)
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
    const result = await db.delete(twilioSubAccounts).where(eq(twilioSubAccounts.id, id));
    return true;
  }
}

export const storage = new DatabaseStorage();
