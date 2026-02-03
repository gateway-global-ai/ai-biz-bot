import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
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
  phoneNumber: text("phone_number"),
  phoneSid: text("phone_sid"),
  friendlyName: text("friendly_name").default("AI Agent Trunk"),
  messagingServiceSid: text("messaging_service_sid"),
  voiceUrl: text("voice_url"),
  voiceFallbackUrl: text("voice_fallback_url"),
  statusCallbackUrl: text("status_callback_url"),
  smsUrl: text("sms_url"),
  smsFallbackUrl: text("sms_fallback_url"),
  errorUrl: text("error_url"),
  firewallEnabled: boolean("firewall_enabled").default(true),
  allowedNumbers: text("allowed_numbers").array().default(sql`ARRAY[]::text[]`),
  maxCallDuration: integer("max_call_duration").default(60),
  timeout: integer("timeout").default(30),
  callerIdName: text("caller_id_name"),
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
