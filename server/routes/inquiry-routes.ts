import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { insertInquirySchema } from "@shared/schema";
import { z } from "zod";

export function registerInquiryRoutes(app: Express) {
  // Get all inquiries with optional filters
  app.get("/api/inquiries", async (req: Request, res: Response) => {
    try {
      const { status, priority, source, assignedTo, limit } = req.query;
      
      const inquiries = await storage.getInquiries({
        status: status as string,
        priority: priority as string,
        source: source as string,
        assignedTo: assignedTo as string,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      
      res.json(inquiries);
    } catch (error: any) {
      console.error("[Inquiries] Error fetching inquiries:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Get a single inquiry by ID
  app.get("/api/inquiries/:id", async (req: Request, res: Response) => {
    try {
      const inquiry = await storage.getInquiry(req.params.id);
      
      if (!inquiry) {
        return res.status(404).json({ error: "Inquiry not found" });
      }
      
      // Mark as viewed if not already viewed
      if (!inquiry.viewedAt) {
        await storage.updateInquiry(inquiry.id, {
          status: inquiry.status === 'new' ? 'viewed' : inquiry.status,
          viewedAt: new Date(),
        });
      }
      
      res.json(inquiry);
    } catch (error: any) {
      console.error("[Inquiries] Error fetching inquiry:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Create a new inquiry
  app.post("/api/inquiries", async (req: Request, res: Response) => {
    try {
      const parsed = insertInquirySchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      
      // Add IP address and user agent for tracking
      const inquiryData = {
        ...parsed.data,
        ipAddress: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        referrer: req.headers.referer || req.headers.referrer as string,
      };
      
      const inquiry = await storage.createInquiry(inquiryData);
      
      res.status(201).json(inquiry);
    } catch (error: any) {
      console.error("[Inquiries] Error creating inquiry:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Update an inquiry
  app.patch("/api/inquiries/:id", async (req: Request, res: Response) => {
    try {
      const updateSchema = z.object({
        status: z.enum(['new', 'viewed', 'in_progress', 'resolved', 'closed']).optional(),
        priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
        assignedTo: z.string().optional(),
        response: z.string().optional(),
        internalNotes: z.string().optional(),
      });
      
      const parsed = updateSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      
      const updates: any = { ...parsed.data };
      
      // Set timestamps based on status changes
      if (parsed.data.response && !updates.respondedAt) {
        updates.respondedAt = new Date();
      }
      
      if (parsed.data.status === 'resolved' && !updates.resolvedAt) {
        updates.resolvedAt = new Date();
      }
      
      const inquiry = await storage.updateInquiry(req.params.id, updates);
      
      if (!inquiry) {
        return res.status(404).json({ error: "Inquiry not found" });
      }
      
      res.json(inquiry);
    } catch (error: any) {
      console.error("[Inquiries] Error updating inquiry:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete an inquiry
  app.delete("/api/inquiries/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteInquiry(req.params.id);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Inquiries] Error deleting inquiry:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Get inquiry statistics
  app.get("/api/inquiries/stats", async (req: Request, res: Response) => {
    try {
      const all = await storage.getInquiries({ limit: 1000 });
      
      const stats = {
        total: all.length,
        new: all.filter(i => i.status === 'new').length,
        viewed: all.filter(i => i.status === 'viewed').length,
        inProgress: all.filter(i => i.status === 'in_progress').length,
        resolved: all.filter(i => i.status === 'resolved').length,
        closed: all.filter(i => i.status === 'closed').length,
        bySource: {
          website: all.filter(i => i.source === 'website').length,
          chat: all.filter(i => i.source === 'chat').length,
          phone: all.filter(i => i.source === 'phone').length,
          email: all.filter(i => i.source === 'email').length,
          sms: all.filter(i => i.source === 'sms').length,
        },
        byPriority: {
          low: all.filter(i => i.priority === 'low').length,
          normal: all.filter(i => i.priority === 'normal').length,
          high: all.filter(i => i.priority === 'high').length,
          urgent: all.filter(i => i.priority === 'urgent').length,
        },
      };
      
      res.json(stats);
    } catch (error: any) {
      console.error("[Inquiries] Error fetching stats:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
}
