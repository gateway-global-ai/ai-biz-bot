import { 
  type User, 
  type InsertUser, 
  type TelephonyConfig, 
  type InsertTelephonyConfig,
  type CallLog,
  type InsertCallLog,
  telephonyConfigs,
  callLogs,
  users
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getTelephonyConfig(): Promise<TelephonyConfig | undefined>;
  createTelephonyConfig(config: InsertTelephonyConfig): Promise<TelephonyConfig>;
  updateTelephonyConfig(id: string, updates: Partial<InsertTelephonyConfig>): Promise<TelephonyConfig | undefined>;
  
  getCallLogs(configId?: string, limit?: number): Promise<CallLog[]>;
  createCallLog(log: InsertCallLog): Promise<CallLog>;
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
}

export const storage = new DatabaseStorage();
