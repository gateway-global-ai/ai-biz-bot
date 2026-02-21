/**
 * Workspace Onboarding API Routes
 * 
 * Handles the business onboarding flow for Google Workspace integration
 */

import type { Express, Request, Response } from "express";
import { workspaceOrchestrator } from "../services/workspace-orchestrator";
import { aiBizBotConsultant } from "../agents/ai-bizbot-consultant";
import { z } from "zod";

export function registerWorkspaceOnboardingRoutes(app: Express) {
  
  /**
   * Get onboarding status for a site (by siteConfigId)
   */
  app.get("/api/workspace/onboarding/status/:siteConfigId", async (req: Request, res: Response) => {
    try {
      const siteConfigId = req.params.siteConfigId as string;
      const status = await workspaceOrchestrator.getOnboardingStatus(siteConfigId);
      res.json(status);
    } catch (error: any) {
      console.error('Onboarding status error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Initiate onboarding after SWOT analysis
   */
  app.post("/api/workspace/onboarding/initiate", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        siteConfigId: z.string(),
        swotAnalysisId: z.string(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const result = await workspaceOrchestrator.initiateOnboarding(
        parsed.data.siteConfigId,
        parsed.data.swotAnalysisId
      );

      res.json(result);
    } catch (error: any) {
      console.error('Onboarding initiation error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Setup hosted email (@gatewayglobal.ai)
   */
  app.post("/api/workspace/onboarding/hosted-email", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        workspaceConfigId: z.string(),
        businessName: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        preferredUsername: z.string(),
        workspacePlan: z.enum(['starter', 'standard']),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const result = await workspaceOrchestrator.setupHostedEmail(
        parsed.data.workspaceConfigId,
        {
          businessName: parsed.data.businessName,
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          preferredUsername: parsed.data.preferredUsername,
          workspacePlan: parsed.data.workspacePlan,
        }
      );

      res.json(result);
    } catch (error: any) {
      console.error('Hosted email setup error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get OAuth URL for integrated email setup
   */
  app.get("/api/workspace/onboarding/auth-url/:siteConfigId", async (req: Request, res: Response) => {
    try {
      const siteConfigId = req.params.siteConfigId as string;
      const authUrl = workspaceOrchestrator.getAuthUrl(siteConfigId);
      res.json({ authUrl });
    } catch (error: any) {
      console.error('Auth URL generation error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Complete integrated email setup with OAuth code
   */
  app.post("/api/workspace/onboarding/integrated-email", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        workspaceConfigId: z.string(),
        email: z.string().email(),
        authCode: z.string(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const result = await workspaceOrchestrator.setupIntegratedEmail(
        parsed.data.workspaceConfigId,
        {
          email: parsed.data.email,
          authCode: parsed.data.authCode,
        }
      );

      res.json(result);
    } catch (error: any) {
      console.error('Integrated email setup error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * OAuth callback handler
   */
  app.get("/api/workspace/onboarding/callback", async (req: Request, res: Response) => {
    try {
      const { code, state } = req.query;
      
      if (!code || !state) {
        return res.status(400).json({ error: 'Missing code or state parameter' });
      }

      // The state parameter contains the siteConfigId
      const siteConfigId = state as string;

      // Return a success page with the auth code
      // In production, this would redirect to the frontend with the code
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authorization Successful</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 3rem;
              border-radius: 1rem;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              text-align: center;
              max-width: 500px;
            }
            h1 { color: #2d3748; margin-bottom: 1rem; }
            p { color: #4a5568; margin-bottom: 1.5rem; }
            .code {
              background: #f7fafc;
              padding: 1rem;
              border-radius: 0.5rem;
              font-family: monospace;
              word-break: break-all;
              margin: 1rem 0;
            }
            .btn {
              background: #667eea;
              color: white;
              padding: 0.75rem 1.5rem;
              border-radius: 0.5rem;
              text-decoration: none;
              display: inline-block;
              margin-top: 1rem;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✓ Authorization Successful</h1>
            <p>Your Google Workspace account has been connected successfully!</p>
            <p>Site Config ID: <strong>${siteConfigId}</strong></p>
            <div class="code">Auth Code: ${code}</div>
            <p>You can now close this window and return to the application to complete setup.</p>
            <a href="/" class="btn">Return to Dashboard</a>
          </div>
        </body>
        </html>
      `);
    } catch (error: any) {
      console.error('OAuth callback error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Trigger orchestrator when SWOT analysis is complete
   */
  app.post("/api/workspace/onboarding/swot-complete", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        siteConfigId: z.string(),
        swotAnalysisId: z.string(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const result = await workspaceOrchestrator.onSwotComplete(
        parsed.data.siteConfigId,
        parsed.data.swotAnalysisId
      );

      res.json(result);
    } catch (error: any) {
      console.error('SWOT completion handler error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Finalize workspace customization after AI Biz Bot consultation
   * Called by AI Biz Bot after speaking with business owner
   */
  app.post("/api/workspace/onboarding/finalize-customization", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        workspaceConfigId: z.string(),
        consultationSummary: z.string(),
        customTools: z.array(z.object({
          toolType: z.string(),
          toolName: z.string(),
          configuration: z.any(),
        })),
        additionalFolders: z.array(z.string()).optional(),
        customSheets: z.array(z.object({
          name: z.string(),
          headers: z.array(z.string()),
        })).optional(),
        customTasks: z.array(z.object({
          title: z.string(),
          notes: z.string(),
        })).optional(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const result = await workspaceOrchestrator.finalizeCustomization(
        parsed.data.workspaceConfigId,
        {
          consultationSummary: parsed.data.consultationSummary,
          customTools: parsed.data.customTools,
          additionalFolders: parsed.data.additionalFolders,
          customSheets: parsed.data.customSheets,
          customTasks: parsed.data.customTasks,
        }
      );

      res.json(result);
    } catch (error: any) {
      console.error('Customization finalization error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Start AI Biz Bot consultation
   * Returns initial consultation prompt and context
   */
  app.post("/api/workspace/consultation/start", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        siteConfigId: z.string(),
        businessName: z.string(),
        swotAnalysisId: z.string(),
        workspaceConfigId: z.string(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const consultationPrompt = await aiBizBotConsultant.getConsultationPrompt({
        businessId: parsed.data.siteConfigId,
        businessName: parsed.data.businessName,
        swotAnalysis: parsed.data.swotAnalysisId,
        workspaceConfigId: parsed.data.workspaceConfigId,
      });

      res.json({
        success: true,
        greeting: `Hi! I'm AI Biz Bot, and I've completed a comprehensive analysis of ${parsed.data.businessName}. I'd love to learn more about your specific needs so I can create a personalized workspace setup just for you. This won't be a generic template - it'll be customized based on how YOUR business actually operates. Ready to get started?`,
        consultationPrompt,
      });
    } catch (error: any) {
      console.error('Consultation start error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Process consultation message
   * Handle conversation with business owner
   */
  app.post("/api/workspace/consultation/message", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        siteConfigId: z.string(),
        businessName: z.string(),
        swotAnalysisId: z.string(),
        workspaceConfigId: z.string(),
        userMessage: z.string(),
        conversationHistory: z.array(z.object({
          role: z.string(),
          content: z.string(),
        })),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const result = await aiBizBotConsultant.processConsultationMessage(
        {
          businessId: parsed.data.siteConfigId,
          businessName: parsed.data.businessName,
          swotAnalysis: parsed.data.swotAnalysisId,
          workspaceConfigId: parsed.data.workspaceConfigId,
        },
        parsed.data.userMessage,
        parsed.data.conversationHistory
      );

      res.json({
        success: true,
        response: result.response,
        shouldFinalize: result.shouldFinalize,
      });
    } catch (error: any) {
      console.error('Consultation message error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Analyze consultation and generate customization
   * Called when consultation is complete
   */
  app.post("/api/workspace/consultation/analyze", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        siteConfigId: z.string(),
        businessName: z.string(),
        swotAnalysisId: z.string(),
        workspaceConfigId: z.string(),
        conversationHistory: z.array(z.object({
          role: z.string(),
          content: z.string(),
        })),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const customization = await aiBizBotConsultant.analyzeConsultation(
        {
          businessId: parsed.data.siteConfigId,
          businessName: parsed.data.businessName,
          swotAnalysis: parsed.data.swotAnalysisId,
          workspaceConfigId: parsed.data.workspaceConfigId,
        },
        parsed.data.conversationHistory
      );

      // Automatically finalize customization
      const finalizeResult = await workspaceOrchestrator.finalizeCustomization(
        parsed.data.workspaceConfigId,
        customization
      );

      res.json({
        success: true,
        customization,
        finalizeResult,
      });
    } catch (error: any) {
      console.error('Consultation analysis error:', error);
      res.status(500).json({ error: error.message });
    }
  });
}
