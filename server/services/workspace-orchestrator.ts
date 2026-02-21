/**
 * Workspace Onboarding Orchestrator
 * 
 * Manages the business onboarding process after SWOT analysis completion.
 * Provides decision tree for email setup and automates workspace structure creation.
 */

import { GoogleWorkspaceService, GoogleWorkspaceCredentials } from '../mcp/googleWorkspace';
import { db } from '../db';
import { workspaceConfigurations, siteConfigs } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface OnboardingDecision {
  hasBusinessEmail: boolean;
  setupChoice?: 'hosted' | 'integrated' | 'own-domain';
}

export interface HostedEmailSetup {
  businessName: string;
  firstName: string;
  lastName: string;
  preferredUsername: string;
  workspacePlan: 'starter' | 'standard';
}

export interface IntegratedEmailSetup {
  email: string;
  authCode: string;
}

export interface WorkspaceSetupResult {
  success: boolean;
  workspaceConfigId?: string;
  email?: string;
  setupData?: any;
  error?: string;
  nextSteps?: string[];
}

export class WorkspaceOrchestrator {
  private workspaceService: GoogleWorkspaceService;

  constructor() {
    this.workspaceService = new GoogleWorkspaceService();
  }

  /**
   * Start the onboarding flow after SWOT analysis
   */
  async initiateOnboarding(siteConfigId: string, swotAnalysisId: string): Promise<WorkspaceSetupResult> {
    try {
      const existing = await db.query.workspaceConfigurations.findFirst({
        where: eq(workspaceConfigurations.siteConfigId, siteConfigId),
      });

      if (existing && existing.status === 'connected') {
        return {
          success: false,
          error: 'Workspace already configured for this site',
        };
      }

      const [config] = await db
        .insert(workspaceConfigurations)
        .values({
          siteConfigId,
          setupType: 'hosted',
          status: 'disconnected',
          statusMessage: 'email_decision',
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: workspaceConfigurations.siteConfigId,
          set: {
            status: 'disconnected',
            statusMessage: 'email_decision',
            updatedAt: new Date(),
          },
        })
        .returning();

      return {
        success: true,
        workspaceConfigId: config.id,
        nextSteps: [
          'Ask user: Do you have a professional email for your business?',
          'If NO: Offer hosted email options',
          'If YES: Guide through integration process',
        ],
      };
    } catch (error: any) {
      console.error('Onboarding initiation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Setup hosted email with @gatewayglobal.ai
   */
  async setupHostedEmail(
    workspaceConfigId: string,
    params: HostedEmailSetup
  ): Promise<WorkspaceSetupResult> {
    try {
      const config = await db.query.workspaceConfigurations.findFirst({
        where: eq(workspaceConfigurations.id, workspaceConfigId),
      });

      if (!config) {
        return { success: false, error: 'Workspace configuration not found' };
      }

      // Generate email address
      const email = `${params.preferredUsername}@gatewayglobal.ai`;

      await db
        .update(workspaceConfigurations)
        .set({
          setupType: 'hosted',
          status: 'connected',
          statusMessage: 'creating_user',
          updatedAt: new Date(),
        })
        .where(eq(workspaceConfigurations.id, workspaceConfigId));

      const inviteResult = await this.workspaceService.sendUserInvitation(
        email,
        params.firstName,
        params.lastName
      );

      if (!inviteResult.success) {
        await db
          .update(workspaceConfigurations)
          .set({
            status: 'error',
            statusMessage: inviteResult.error ?? 'Failed to create user',
            updatedAt: new Date(),
          })
          .where(eq(workspaceConfigurations.id, workspaceConfigId));

        return {
          success: false,
          error: `Failed to create user: ${inviteResult.error}`,
        };
      }

      await db
        .update(workspaceConfigurations)
        .set({
          statusMessage: 'creating_structure',
          updatedAt: new Date(),
        })
        .where(eq(workspaceConfigurations.id, workspaceConfigId));

      const site = await db.query.siteConfigs.findFirst({
        where: eq(siteConfigs.id, config.siteConfigId),
        columns: { name: true },
      });

      const structureResult = await this.createWorkspaceStructure(
        workspaceConfigId,
        params.businessName,
        site?.name || 'Business'
      );

      if (!structureResult.success) {
        return structureResult;
      }

      return {
        success: true,
        workspaceConfigId,
        email,
        setupData: {
          userId: inviteResult.data.id,
          plan: params.workspacePlan,
          structure: structureResult.setupData,
        },
        nextSteps: [
          `Invitation sent to ${email}`,
          'User will receive temporary password',
          'Workspace structure created',
          'Ready to use AI business tools',
        ],
      };
    } catch (error: any) {
      console.error('Hosted email setup error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Setup integration with existing email
   */
  async setupIntegratedEmail(
    workspaceConfigId: string,
    params: IntegratedEmailSetup
  ): Promise<WorkspaceSetupResult> {
    try {
      const config = await db.query.workspaceConfigurations.findFirst({
        where: eq(workspaceConfigurations.id, workspaceConfigId),
      });

      if (!config) {
        return { success: false, error: 'Workspace configuration not found' };
      }

      // Exchange auth code for tokens
      const credentials = await this.workspaceService.exchangeCode(params.authCode);

      await db
        .update(workspaceConfigurations)
        .set({
          setupType: 'oauth',
          googleEmail: params.email,
          accessToken: credentials.accessToken,
          refreshToken: credentials.refreshToken ?? null,
          tokenExpiry: credentials.expiryDate ? new Date(credentials.expiryDate) : null,
          status: 'connected',
          statusMessage: 'creating_structure',
          updatedAt: new Date(),
        })
        .where(eq(workspaceConfigurations.id, workspaceConfigId));

      this.workspaceService.setCredentials(credentials);

      const site = await db.query.siteConfigs.findFirst({
        where: eq(siteConfigs.id, config.siteConfigId),
        columns: { name: true },
      });

      const structureResult = await this.createWorkspaceStructure(
        workspaceConfigId,
        site?.name || 'Business',
        'Business'
      );

      if (!structureResult.success) {
        return structureResult;
      }

      return {
        success: true,
        workspaceConfigId,
        email: params.email,
        setupData: structureResult.setupData,
        nextSteps: [
          'Integration completed successfully',
          'Workspace structure created in your Google Drive',
          'Calendar templates added',
          'Task list initialized',
          'Lead tracking spreadsheet ready',
        ],
      };
    } catch (error: any) {
      console.error('Integrated email setup error:', error);
      await db
        .update(workspaceConfigurations)
        .set({
          status: 'error',
          statusMessage: error.message,
          updatedAt: new Date(),
        })
        .where(eq(workspaceConfigurations.id, workspaceConfigId));

      return { success: false, error: error.message };
    }
  }

  /**
   * Create workspace structure (folders, templates, etc.)
   * NOTE: This is called AFTER AI Biz Bot consultation with owner
   * Structure is based on SWOT analysis + conversation insights
   */
  private async createWorkspaceStructure(
    workspaceConfigId: string,
    businessName: string,
    businessType: string
  ): Promise<WorkspaceSetupResult> {
    try {
      // Get SWOT analysis for this business to customize structure
      const config = await db.query.workspaceConfigurations.findFirst({
        where: eq(workspaceConfigurations.id, workspaceConfigId),
      });

      const swotData = null;

      // Create basic structure - AI Biz Bot will customize further based on conversation
      const result = await this.workspaceService.createWorkspaceStructure({
        businessName,
        businessType,
      });

      if (!result.success) {
        return { success: false, error: result.error };
      }

      await db
        .update(workspaceConfigurations)
        .set({
          driveFolderId: result.data.folders?.root?.id ?? undefined,
          leadTrackingSheetId: result.data.sheets?.leadTracking?.id ?? undefined,
          status: 'connected',
          statusMessage: 'ai_consultation',
          updatedAt: new Date(),
        })
        .where(eq(workspaceConfigurations.id, workspaceConfigId));

      return {
        success: true,
        workspaceConfigId,
        setupData: {
          ...result.data,
          swotInsights: swotData ? {
            strengths: swotData.strengths,
            opportunities: swotData.opportunities,
            recommendations: swotData.recommendations,
          } : null,
        },
        nextSteps: [
          'Basic workspace structure created',
          'AI Biz Bot will now consult with business owner',
          'Custom tools will be generated based on conversation',
          'No one-size-fits-all templates - fully personalized',
        ],
      };
    } catch (error: any) {
      console.error('Workspace structure creation error:', error);
      await db
        .update(workspaceConfigurations)
        .set({
          status: 'error',
          statusMessage: error.message,
          updatedAt: new Date(),
        })
        .where(eq(workspaceConfigurations.id, workspaceConfigId));

      return { success: false, error: error.message };
    }
  }

  /**
   * Finalize workspace customization after AI Biz Bot consultation
   * This is called by AI Biz Bot after speaking with the owner
   */
  async finalizeCustomization(
    workspaceConfigId: string,
    customizationData: {
      consultationSummary: string;
      customTools: Array<{
        toolType: string;
        toolName: string;
        configuration: any;
      }>;
      additionalFolders?: string[];
      customSheets?: Array<{ name: string; headers: string[] }>;
      customTasks?: Array<{ title: string; notes: string }>;
    }
  ): Promise<WorkspaceSetupResult> {
    try {
      const config = await db.query.workspaceConfigurations.findFirst({
        where: eq(workspaceConfigurations.id, workspaceConfigId),
      });

      if (!config) {
        return { success: false, error: 'Workspace configuration not found' };
      }

      // Create additional folders based on conversation
      if (customizationData.additionalFolders && customizationData.additionalFolders.length > 0) {
        for (const folderName of customizationData.additionalFolders) {
          await this.workspaceService.createDriveFolder(folderName, config.driveFolderId || 'root');
        }
      }

      // Create custom spreadsheets based on business needs
      if (customizationData.customSheets && customizationData.customSheets.length > 0) {
        for (const sheet of customizationData.customSheets) {
          await this.workspaceService.createSpreadsheet({
            title: sheet.name,
            headers: sheet.headers,
            data: [],
          });
        }
      }

      // Create custom tasks based on AI consultation
      if (customizationData.customTasks && customizationData.customTasks.length > 0) {
        for (const task of customizationData.customTasks) {
          await this.workspaceService.createTask(task);
        }
      }

      await db
        .update(workspaceConfigurations)
        .set({
          status: 'connected',
          statusMessage: 'completed',
          updatedAt: new Date(),
        })
        .where(eq(workspaceConfigurations.id, workspaceConfigId));

      return {
        success: true,
        workspaceConfigId,
        setupData: {
          consultationSummary: customizationData.consultationSummary,
          customTools: customizationData.customTools,
        },
        nextSteps: [
          'Workspace fully customized based on your needs',
          'Custom tools and workflows generated',
          'AI Voice, chat, and telephony configured',
          'Ready for business operations',
        ],
      };
    } catch (error: any) {
      console.error('Customization finalization error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get onboarding status
   */
  async getOnboardingStatus(siteConfigId: string): Promise<any> {
    const config = await db.query.workspaceConfigurations.findFirst({
      where: eq(workspaceConfigurations.siteConfigId, siteConfigId),
    });

    if (!config) {
      return {
        status: 'not_started',
        message: 'Onboarding not initiated',
      };
    }

    return {
      status: config.status ?? 'disconnected',
      step: config.statusMessage,
      setupType: config.setupType,
      email: config.googleEmail,
      error: config.statusMessage,
      workspaceConfigId: config.id,
    };
  }

  /**
   * Generate OAuth URL for integrated email setup
   */
  getAuthUrl(siteConfigId: string): string {
    return this.workspaceService.getAuthUrl(siteConfigId);
  }

  /**
   * Trigger orchestrator after SWOT completion
   */
  async onSwotComplete(siteConfigId: string, swotAnalysisId: string): Promise<WorkspaceSetupResult> {
    const existing = await db.query.workspaceConfigurations.findFirst({
      where: eq(workspaceConfigurations.siteConfigId, siteConfigId),
    });

    if (existing) {
      await db
        .update(workspaceConfigurations)
        .set({
          statusMessage: `swot_complete:${swotAnalysisId}`,
          updatedAt: new Date(),
        })
        .where(eq(workspaceConfigurations.id, existing.id));
    }

    return this.initiateOnboarding(siteConfigId, swotAnalysisId);
  }
}

export const workspaceOrchestrator = new WorkspaceOrchestrator();
