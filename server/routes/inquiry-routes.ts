import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { insertInquirySchema } from "@shared/schema";
import { z } from "zod";

export function registerInquiryRoutes(app: Express) {
  // Get all inquiries with optional filters
  app.get("/api/inquiries", async (req: Request, res: Response) => {
    try {
      const { status, priority, source, assignedTo, limit } = req.query;
      
      const MAX_LIMIT = 100;
      let validatedLimit: number | undefined = undefined;
      if (typeof limit === "string") {
        const parsed = parseInt(limit, 10);
        if (!Number.isNaN(parsed) && parsed > 0) {
          validatedLimit = Math.min(parsed, MAX_LIMIT);
        }
      }
      
      const inquiries = await storage.getInquiries({
        status: status as string,
        priority: priority as string,
        source: source as string,
        assignedTo: assignedTo as string,
        limit: validatedLimit,
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
      
      let updatedInquiry = inquiry;
      // Mark as viewed if not already viewed
      if (!inquiry.viewedAt) {
        updatedInquiry = await storage.updateInquiry(inquiry.id, {
          status: inquiry.status === 'new' ? 'viewed' : inquiry.status,
          viewedAt: new Date(),
        });
      }
      
      res.json(updatedInquiry);
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
      
      // Fetch existing inquiry so timestamps can be set only once
      const existingInquiry = await storage.getInquiry(req.params.id);
      
      const updates: any = { ...parsed.data };
      
      // Set timestamps based on status changes, only if not already set
      if (parsed.data.response && existingInquiry && !existingInquiry.respondedAt) {
        updates.respondedAt = new Date();
      }
      
      if (parsed.data.status === 'resolved' && existingInquiry && !existingInquiry.resolvedAt) {
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
      // Fetch all inquiries to ensure stats are computed over the full dataset
      const all = await storage.getInquiries({});

      const stats = {
        total: all.length,
        new: 0,
        viewed: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
        bySource: {
          website: 0,
          chat: 0,
          phone: 0,
          email: 0,
          sms: 0,
        },
        byPriority: {
          low: 0,
          normal: 0,
          high: 0,
          urgent: 0,
        },
      };

      for (const i of all) {
        // Status counts
        switch (i.status) {
          case "new":
            stats.new++;
            break;
          case "viewed":
            stats.viewed++;
            break;
          case "in_progress":
            stats.inProgress++;
            break;
          case "resolved":
            stats.resolved++;
            break;
          case "closed":
            stats.closed++;
            break;
        }

        // Source counts
        switch (i.source) {
          case "website":
            stats.bySource.website++;
            break;
          case "chat":
            stats.bySource.chat++;
            break;
          case "phone":
            stats.bySource.phone++;
            break;
          case "email":
            stats.bySource.email++;
            break;
          case "sms":
            stats.bySource.sms++;
            break;
        }

        // Priority counts
        switch (i.priority) {
          case "low":
            stats.byPriority.low++;
            break;
          case "normal":
            stats.byPriority.normal++;
            break;
          case "high":
            stats.byPriority.high++;
            break;
          case "urgent":
            stats.byPriority.urgent++;
            break;
        }
      }
      res.json(stats);
    } catch (error: any) {
      console.error("[Inquiries] Error fetching stats:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
}
