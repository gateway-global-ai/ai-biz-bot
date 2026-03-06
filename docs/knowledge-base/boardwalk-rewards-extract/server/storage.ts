import { 
  type User, type InsertUser, 
  type RateOverride, type InsertRateOverride, 
  type BusinessRule, type InsertBusinessRule,
  type InternalRoom, type InsertInternalRoom,
  type RoomTask, type InsertRoomTask,
  type ReservationRequest, type InsertReservationRequest,
  type InvestorUser, type InsertInvestorUser,
  type MagicToken,
  type EmployeeUser, type InsertEmployeeUser,
  type InvestorInvestment, type InsertInvestorInvestment,
  type InvestorLoan, type InsertInvestorLoan,
  users, rateOverrides, businessRules, internalRooms, roomTasks, reservationRequests, 
  investorUsers, magicTokens, employeeUsers, investorInvestments, investorLoans
} from "@shared/schema";
import { db } from "./db";
import { eq, and, lt } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getRateOverride(reservationId: string): Promise<RateOverride | undefined>;
  getRateOverrides(): Promise<RateOverride[]>;
  createRateOverride(override: InsertRateOverride): Promise<RateOverride>;
  updateRateOverride(reservationId: string, override: Partial<InsertRateOverride>): Promise<RateOverride | undefined>;
  deleteRateOverride(reservationId: string): Promise<boolean>;
  
  getBusinessRules(): Promise<BusinessRule[]>;
  getBusinessRule(code: string): Promise<BusinessRule | undefined>;
  createBusinessRule(rule: InsertBusinessRule): Promise<BusinessRule>;
  updateBusinessRule(code: string, rule: Partial<InsertBusinessRule>): Promise<BusinessRule | undefined>;
  
  // Internal Room Manager
  getInternalRooms(): Promise<InternalRoom[]>;
  getInternalRoom(id: string): Promise<InternalRoom | undefined>;
  getInternalRoomByUnit(unitNumber: string): Promise<InternalRoom | undefined>;
  getOfflineRooms(): Promise<InternalRoom[]>;
  createInternalRoom(room: InsertInternalRoom): Promise<InternalRoom>;
  updateInternalRoom(id: string, room: Partial<InsertInternalRoom>): Promise<InternalRoom | undefined>;
  deleteInternalRoom(id: string): Promise<boolean>;
  
  // Room Tasks
  getRoomTasks(roomId: string): Promise<RoomTask[]>;
  getAllTasks(): Promise<RoomTask[]>;
  getTask(id: string): Promise<RoomTask | undefined>;
  createTask(task: InsertRoomTask): Promise<RoomTask>;
  updateTask(id: string, task: Partial<InsertRoomTask>): Promise<RoomTask | undefined>;
  deleteTask(id: string): Promise<boolean>;
  
  // Reservation Requests (async booking queue)
  createReservationRequest(request: InsertReservationRequest): Promise<ReservationRequest>;
  getReservationRequest(id: string): Promise<ReservationRequest | undefined>;
  getPendingReservationRequests(): Promise<ReservationRequest[]>;
  updateReservationRequest(id: string, updates: Partial<ReservationRequest>): Promise<ReservationRequest | undefined>;
  
  // Investor Users (whitelist)
  getInvestorUsers(): Promise<InvestorUser[]>;
  getInvestorUser(id: string): Promise<InvestorUser | undefined>;
  getInvestorUserByPhone(phone: string): Promise<InvestorUser | undefined>;
  getInvestorUserByEmail(email: string): Promise<InvestorUser | undefined>;
  createInvestorUser(user: InsertInvestorUser): Promise<InvestorUser>;
  updateInvestorUser(id: string, user: Partial<InsertInvestorUser>): Promise<InvestorUser | undefined>;
  deleteInvestorUser(id: string): Promise<boolean>;
  
  // Magic Tokens for investor portal access
  createMagicToken(token: string, investorUserId: string, email: string, expiresAt: Date): Promise<MagicToken>;
  getMagicToken(token: string): Promise<MagicToken | undefined>;
  markMagicTokenUsed(token: string): Promise<MagicToken | undefined>;
  deleteExpiredMagicTokens(): Promise<number>;
  
  // Employee Users
  getEmployeeUsers(): Promise<EmployeeUser[]>;
  getEmployeeUser(id: string): Promise<EmployeeUser | undefined>;
  createEmployeeUser(user: InsertEmployeeUser): Promise<EmployeeUser>;
  updateEmployeeUser(id: string, user: Partial<InsertEmployeeUser>): Promise<EmployeeUser | undefined>;
  deleteEmployeeUser(id: string): Promise<boolean>;
  
  // Investor Investments
  getInvestorInvestments(investorUserId: string): Promise<InvestorInvestment[]>;
  getInvestorInvestment(id: string): Promise<InvestorInvestment | undefined>;
  createInvestorInvestment(investment: InsertInvestorInvestment): Promise<InvestorInvestment>;
  updateInvestorInvestment(id: string, investment: Partial<InsertInvestorInvestment>): Promise<InvestorInvestment | undefined>;
  deleteInvestorInvestment(id: string): Promise<boolean>;
  
  // Investor Loans
  getInvestorLoans(investorUserId: string): Promise<InvestorLoan[]>;
  getInvestorLoan(id: string): Promise<InvestorLoan | undefined>;
  createInvestorLoan(loan: InsertInvestorLoan): Promise<InvestorLoan>;
  updateInvestorLoan(id: string, loan: Partial<InsertInvestorLoan>): Promise<InvestorLoan | undefined>;
  deleteInvestorLoan(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async getRateOverride(reservationId: string): Promise<RateOverride | undefined> {
    const result = await db.select().from(rateOverrides)
      .where(eq(rateOverrides.reservationId, reservationId));
    return result[0];
  }

  async getRateOverrides(): Promise<RateOverride[]> {
    return await db.select().from(rateOverrides);
  }

  async createRateOverride(override: InsertRateOverride): Promise<RateOverride> {
    const result = await db.insert(rateOverrides).values(override).returning();
    return result[0];
  }

  async updateRateOverride(reservationId: string, override: Partial<InsertRateOverride>): Promise<RateOverride | undefined> {
    const result = await db.update(rateOverrides)
      .set({ ...override, updatedAt: new Date() })
      .where(eq(rateOverrides.reservationId, reservationId))
      .returning();
    return result[0];
  }

  async deleteRateOverride(reservationId: string): Promise<boolean> {
    const result = await db.delete(rateOverrides)
      .where(eq(rateOverrides.reservationId, reservationId))
      .returning();
    return result.length > 0;
  }

  async getBusinessRules(): Promise<BusinessRule[]> {
    return await db.select().from(businessRules);
  }

  async getBusinessRule(code: string): Promise<BusinessRule | undefined> {
    const result = await db.select().from(businessRules)
      .where(eq(businessRules.code, code));
    return result[0];
  }

  async createBusinessRule(rule: InsertBusinessRule): Promise<BusinessRule> {
    const result = await db.insert(businessRules).values(rule).returning();
    return result[0];
  }

  async updateBusinessRule(code: string, rule: Partial<InsertBusinessRule>): Promise<BusinessRule | undefined> {
    const result = await db.update(businessRules)
      .set({ ...rule, updatedAt: new Date() })
      .where(eq(businessRules.code, code))
      .returning();
    return result[0];
  }

  // Internal Room Manager
  async getInternalRooms(): Promise<InternalRoom[]> {
    return await db.select().from(internalRooms);
  }

  async getInternalRoom(id: string): Promise<InternalRoom | undefined> {
    const result = await db.select().from(internalRooms).where(eq(internalRooms.id, id));
    return result[0];
  }

  async getInternalRoomByUnit(unitNumber: string): Promise<InternalRoom | undefined> {
    const result = await db.select().from(internalRooms).where(eq(internalRooms.unitNumber, unitNumber));
    return result[0];
  }

  async getOfflineRooms(): Promise<InternalRoom[]> {
    return await db.select().from(internalRooms).where(eq(internalRooms.isOffline, true));
  }

  async createInternalRoom(room: InsertInternalRoom): Promise<InternalRoom> {
    const insertData = {
      ...room,
      media: room.media as any
    };
    const result = await db.insert(internalRooms).values(insertData).returning();
    return result[0];
  }

  async updateInternalRoom(id: string, room: Partial<InsertInternalRoom>): Promise<InternalRoom | undefined> {
    const updateData: any = { ...room, updatedAt: new Date() };
    const result = await db.update(internalRooms)
      .set(updateData)
      .where(eq(internalRooms.id, id))
      .returning();
    return result[0];
  }

  async deleteInternalRoom(id: string): Promise<boolean> {
    // Also delete associated tasks
    await db.delete(roomTasks).where(eq(roomTasks.roomId, id));
    const result = await db.delete(internalRooms).where(eq(internalRooms.id, id)).returning();
    return result.length > 0;
  }

  // Room Tasks
  async getRoomTasks(roomId: string): Promise<RoomTask[]> {
    return await db.select().from(roomTasks).where(eq(roomTasks.roomId, roomId));
  }

  async getAllTasks(): Promise<RoomTask[]> {
    return await db.select().from(roomTasks);
  }

  async getTask(id: string): Promise<RoomTask | undefined> {
    const result = await db.select().from(roomTasks).where(eq(roomTasks.id, id));
    return result[0];
  }

  async createTask(task: InsertRoomTask): Promise<RoomTask> {
    const result = await db.insert(roomTasks).values(task).returning();
    return result[0];
  }

  async updateTask(id: string, task: Partial<InsertRoomTask>): Promise<RoomTask | undefined> {
    const updateData: any = { ...task, updatedAt: new Date() };
    if (task.status === "completed") {
      updateData.completedAt = new Date();
    }
    const result = await db.update(roomTasks)
      .set(updateData)
      .where(eq(roomTasks.id, id))
      .returning();
    return result[0];
  }

  async deleteTask(id: string): Promise<boolean> {
    const result = await db.delete(roomTasks).where(eq(roomTasks.id, id)).returning();
    return result.length > 0;
  }

  // Reservation Requests
  async createReservationRequest(request: InsertReservationRequest): Promise<ReservationRequest> {
    const insertData = {
      ...request,
      discountDetails: request.discountDetails as any
    };
    const result = await db.insert(reservationRequests).values(insertData).returning();
    return result[0];
  }

  async getReservationRequest(id: string): Promise<ReservationRequest | undefined> {
    const result = await db.select().from(reservationRequests).where(eq(reservationRequests.id, id));
    return result[0];
  }

  async getPendingReservationRequests(): Promise<ReservationRequest[]> {
    return await db.select().from(reservationRequests).where(eq(reservationRequests.status, "pending"));
  }

  async updateReservationRequest(id: string, updates: Partial<ReservationRequest>): Promise<ReservationRequest | undefined> {
    const updateData: any = { ...updates, updatedAt: new Date() };
    const result = await db.update(reservationRequests)
      .set(updateData)
      .where(eq(reservationRequests.id, id))
      .returning();
    return result[0];
  }

  // Investor Users (whitelist)
  async getInvestorUsers(): Promise<InvestorUser[]> {
    return await db.select().from(investorUsers);
  }

  async getInvestorUser(id: string): Promise<InvestorUser | undefined> {
    const result = await db.select().from(investorUsers).where(eq(investorUsers.id, id));
    return result[0];
  }

  async getInvestorUserByPhone(phone: string): Promise<InvestorUser | undefined> {
    const result = await db.select().from(investorUsers).where(eq(investorUsers.phone, phone));
    return result[0];
  }

  async createInvestorUser(user: InsertInvestorUser): Promise<InvestorUser> {
    const result = await db.insert(investorUsers).values(user).returning();
    return result[0];
  }

  async updateInvestorUser(id: string, user: Partial<InsertInvestorUser>): Promise<InvestorUser | undefined> {
    const result = await db.update(investorUsers)
      .set({ ...user, updatedAt: new Date() })
      .where(eq(investorUsers.id, id))
      .returning();
    return result[0];
  }

  async deleteInvestorUser(id: string): Promise<boolean> {
    const result = await db.delete(investorUsers)
      .where(eq(investorUsers.id, id))
      .returning();
    return result.length > 0;
  }

  async getInvestorUserByEmail(email: string): Promise<InvestorUser | undefined> {
    const result = await db.select().from(investorUsers)
      .where(eq(investorUsers.email, email));
    return result[0];
  }

  // Magic Token methods
  async createMagicToken(token: string, investorUserId: string, email: string, expiresAt: Date): Promise<MagicToken> {
    const result = await db.insert(magicTokens).values({
      token,
      investorUserId,
      email,
      expiresAt,
    }).returning();
    return result[0];
  }

  async getMagicToken(token: string): Promise<MagicToken | undefined> {
    const result = await db.select().from(magicTokens)
      .where(eq(magicTokens.token, token));
    return result[0];
  }

  async markMagicTokenUsed(token: string): Promise<MagicToken | undefined> {
    const result = await db.update(magicTokens)
      .set({ usedAt: new Date() })
      .where(eq(magicTokens.token, token))
      .returning();
    return result[0];
  }

  async deleteExpiredMagicTokens(): Promise<number> {
    const result = await db.delete(magicTokens)
      .where(lt(magicTokens.expiresAt, new Date()))
      .returning();
    return result.length;
  }

  // Employee Users
  async getEmployeeUsers(): Promise<EmployeeUser[]> {
    return await db.select().from(employeeUsers);
  }

  async getEmployeeUser(id: string): Promise<EmployeeUser | undefined> {
    const result = await db.select().from(employeeUsers).where(eq(employeeUsers.id, id));
    return result[0];
  }

  async createEmployeeUser(user: InsertEmployeeUser): Promise<EmployeeUser> {
    const result = await db.insert(employeeUsers).values(user).returning();
    return result[0];
  }

  async updateEmployeeUser(id: string, user: Partial<InsertEmployeeUser>): Promise<EmployeeUser | undefined> {
    const result = await db.update(employeeUsers)
      .set({ ...user, updatedAt: new Date() })
      .where(eq(employeeUsers.id, id))
      .returning();
    return result[0];
  }

  async deleteEmployeeUser(id: string): Promise<boolean> {
    const result = await db.delete(employeeUsers).where(eq(employeeUsers.id, id)).returning();
    return result.length > 0;
  }

  // Investor Investments
  async getInvestorInvestments(investorUserId: string): Promise<InvestorInvestment[]> {
    return await db.select().from(investorInvestments)
      .where(eq(investorInvestments.investorUserId, investorUserId));
  }

  async getInvestorInvestment(id: string): Promise<InvestorInvestment | undefined> {
    const result = await db.select().from(investorInvestments).where(eq(investorInvestments.id, id));
    return result[0];
  }

  async createInvestorInvestment(investment: InsertInvestorInvestment): Promise<InvestorInvestment> {
    const result = await db.insert(investorInvestments).values(investment).returning();
    return result[0];
  }

  async updateInvestorInvestment(id: string, investment: Partial<InsertInvestorInvestment>): Promise<InvestorInvestment | undefined> {
    const result = await db.update(investorInvestments)
      .set({ ...investment, updatedAt: new Date() })
      .where(eq(investorInvestments.id, id))
      .returning();
    return result[0];
  }

  async deleteInvestorInvestment(id: string): Promise<boolean> {
    const result = await db.delete(investorInvestments).where(eq(investorInvestments.id, id)).returning();
    return result.length > 0;
  }

  // Investor Loans
  async getInvestorLoans(investorUserId: string): Promise<InvestorLoan[]> {
    return await db.select().from(investorLoans)
      .where(eq(investorLoans.investorUserId, investorUserId));
  }

  async getInvestorLoan(id: string): Promise<InvestorLoan | undefined> {
    const result = await db.select().from(investorLoans).where(eq(investorLoans.id, id));
    return result[0];
  }

  async createInvestorLoan(loan: InsertInvestorLoan): Promise<InvestorLoan> {
    const result = await db.insert(investorLoans).values(loan).returning();
    return result[0];
  }

  async updateInvestorLoan(id: string, loan: Partial<InsertInvestorLoan>): Promise<InvestorLoan | undefined> {
    const result = await db.update(investorLoans)
      .set({ ...loan, updatedAt: new Date() })
      .where(eq(investorLoans.id, id))
      .returning();
    return result[0];
  }

  async deleteInvestorLoan(id: string): Promise<boolean> {
    const result = await db.delete(investorLoans).where(eq(investorLoans.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();

// Initialize default business rules
async function initializeDefaultRules() {
  const existingRules = await storage.getBusinessRules();
  
  if (existingRules.length === 0) {
    console.log("Initializing default business rules...");
    
    await storage.createBusinessRule({
      code: "NO_TAX_AFTER_30_DAYS",
      label: "No Tax After 30 Days",
      category: "tax",
      payload: {
        thresholdNights: 30,
        taxRate: 0,
        description: "Guests staying 30+ consecutive days are exempt from lodging tax"
      },
      isActive: true,
    });
    
    await storage.createBusinessRule({
      code: "DEFAULT_TAX_RATE",
      label: "Default Tax Rate",
      category: "tax",
      payload: {
        taxRate: 0.12,
        description: "12% lodging tax on stays under 30 days"
      },
      isActive: true,
    });
    
    await storage.createBusinessRule({
      code: "WEEKLY_DISCOUNT",
      label: "Weekly Stay Discount",
      category: "rate",
      payload: {
        discountPercent: 10,
        minNights: 7,
        description: "10% discount for weekly stays (7+ nights)"
      },
      isActive: true,
    });
    
    await storage.createBusinessRule({
      code: "MONTHLY_DISCOUNT",
      label: "Monthly Stay Discount",
      category: "rate",
      payload: {
        discountPercent: 20,
        minNights: 30,
        description: "20% discount for monthly stays (30+ nights)"
      },
      isActive: true,
    });
    
    console.log("Default business rules created.");
  }
}

initializeDefaultRules().catch(console.error);
