import { sql } from "drizzle-orm";
import { pgTable, text, varchar, numeric, boolean, timestamp, jsonb, serial, integer } from "drizzle-orm/pg-core";
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

// Rate overrides for guests with special negotiated rates
export const rateOverrides = pgTable("rate_overrides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reservationId: text("reservation_id").notNull().unique(),
  guestId: text("guest_id"),
  guestName: text("guest_name"),
  baseNightlyRate: numeric("base_nightly_rate", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRateOverrideSchema = createInsertSchema(rateOverrides).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRateOverride = z.infer<typeof insertRateOverrideSchema>;
export type RateOverride = typeof rateOverrides.$inferSelect;

// Business rules for flexible policy configuration
export const businessRules = pgTable("business_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  label: text("label").notNull(),
  category: text("category").notNull(), // 'tax', 'rate', 'policy'
  payload: jsonb("payload").notNull(), // flexible config data
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBusinessRuleSchema = createInsertSchema(businessRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBusinessRule = z.infer<typeof insertBusinessRuleSchema>;
export type BusinessRule = typeof businessRules.$inferSelect;

// Internal Room Manager - separate from Cloudbeds
export const internalRooms = pgTable("internal_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  unitNumber: text("unit_number").notNull().unique(),
  unitDescription: text("unit_description"),
  condition: text("condition").default("good"), // good, fair, poor, offline
  isOffline: boolean("is_offline").default(false), // rooms not in Cloudbeds
  offlineReason: text("offline_reason"), // why the room is offline
  notes: text("notes"),
  media: jsonb("media").$type<{ type: string; url: string; caption?: string }[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInternalRoomSchema = createInsertSchema(internalRooms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInternalRoom = z.infer<typeof insertInternalRoomSchema>;
export type InternalRoom = typeof internalRooms.$inferSelect;

// Room Tasks for maintenance and assignments
export const roomTasks = pgTable("room_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull().references(() => internalRooms.id),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").default("normal"), // low, normal, high, urgent
  status: text("status").default("pending"), // pending, in_progress, completed, cancelled
  assignedTo: text("assigned_to"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRoomTaskSchema = createInsertSchema(roomTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export type InsertRoomTask = z.infer<typeof insertRoomTaskSchema>;
export type RoomTask = typeof roomTasks.$inferSelect;

// Reservation requests queue for async processing
export const reservationRequests = pgTable("reservation_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  status: text("status").notNull().default("pending"), // pending, processing, confirmed, failed
  // Guest info
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  // Booking details
  roomTypeId: text("room_type_id").notNull(),
  roomTypeName: text("room_type_name").notNull(),
  roomRateId: text("room_rate_id").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  adults: text("adults").default("2"),
  children: text("children").default("0"),
  // Pricing
  baseNightlyRate: numeric("base_nightly_rate", { precision: 10, scale: 2 }),
  baseTotal: numeric("base_total", { precision: 10, scale: 2 }),
  discountDetails: jsonb("discount_details").$type<string[]>().default([]),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }),
  taxRate: numeric("tax_rate", { precision: 5, scale: 4 }),
  taxAmount: numeric("tax_amount", { precision: 10, scale: 2 }),
  grandTotal: numeric("grand_total", { precision: 10, scale: 2 }).notNull(),
  specialRequests: text("special_requests"),
  // Cloudbeds response
  cloudbedsReservationId: text("cloudbeds_reservation_id"),
  cloudbedsConfirmationCode: text("cloudbeds_confirmation_code"),
  payByLinkUrl: text("pay_by_link_url"),
  // Error tracking
  errorMessage: text("error_message"),
  retryCount: text("retry_count").default("0"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

export const insertReservationRequestSchema = createInsertSchema(reservationRequests).omit({
  id: true,
  status: true,
  cloudbedsReservationId: true,
  cloudbedsConfirmationCode: true,
  payByLinkUrl: true,
  errorMessage: true,
  retryCount: true,
  createdAt: true,
  updatedAt: true,
  processedAt: true,
});

export type InsertReservationRequest = z.infer<typeof insertReservationRequestSchema>;
export type ReservationRequest = typeof reservationRequests.$inferSelect;

// Investor Portal whitelist - users allowed to access investor portal
export const investorUsers = pgTable("investor_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  mailingAddress: text("mailing_address"),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInvestorUserSchema = createInsertSchema(investorUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInvestorUser = z.infer<typeof insertInvestorUserSchema>;
export type InvestorUser = typeof investorUsers.$inferSelect;

// Magic link tokens for investor portal access
export const magicTokens = pgTable("magic_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(),
  investorUserId: varchar("investor_user_id").notNull(),
  email: text("email").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type MagicToken = typeof magicTokens.$inferSelect;

// Employee users - staff members with portal access
export const employeeUsers = pgTable("employee_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  role: text("role").default("staff"), // staff, manager, admin
  department: text("department"), // front_desk, housekeeping, maintenance, etc.
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEmployeeUserSchema = createInsertSchema(employeeUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeeUser = z.infer<typeof insertEmployeeUserSchema>;
export type EmployeeUser = typeof employeeUsers.$inferSelect;

// Investor investments - capital contributions
export const investorInvestments = pgTable("investor_investments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  investorUserId: varchar("investor_user_id").notNull().references(() => investorUsers.id),
  investmentDate: timestamp("investment_date").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInvestorInvestmentSchema = createInsertSchema(investorInvestments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInvestorInvestment = z.infer<typeof insertInvestorInvestmentSchema>;
export type InvestorInvestment = typeof investorInvestments.$inferSelect;

// Investor loans - financing arrangements
export const investorLoans = pgTable("investor_loans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  investorUserId: varchar("investor_user_id").notNull().references(() => investorUsers.id),
  loanDate: timestamp("loan_date").notNull(),
  loanAmount: numeric("loan_amount", { precision: 12, scale: 2 }).notNull(),
  interestRate: numeric("interest_rate", { precision: 5, scale: 2 }).notNull(), // as percentage, e.g. 5.50 for 5.5%
  monthlyPayment: numeric("monthly_payment", { precision: 10, scale: 2 }).notNull(),
  maturityDate: timestamp("maturity_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInvestorLoanSchema = createInsertSchema(investorLoans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInvestorLoan = z.infer<typeof insertInvestorLoanSchema>;
export type InvestorLoan = typeof investorLoans.$inferSelect;

// Chat conversations for AI chatbot
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
