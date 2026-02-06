/**
 * Workspace Onboarding Orchestrator
 * 
 * Manages the business onboarding process after SWOT analysis completion.
 * Provides decision tree for email setup and automates workspace structure creation.
 */

import { GoogleWorkspaceService, GoogleWorkspaceCredentials } from '../mcp/googleWorkspace';
import { db } from '../db';
import { workspaceConfigurations, swotAnalyses, customerAccounts } from '@shared/schema';
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
  async initiateOnboarding(businessId: string, swotAnalysisId: string): Promise<WorkspaceSetupResult> {
    try {
      // Check if workspace already exists
      const existing = await db.query.workspaceConfigurations.findFirst({
        where: eq(workspaceConfigurations.businessId, businessId),
      });

      if (existing && existing.setupStatus === 'completed') {
        return {
          success: false,
          error: 'Workspace already configured for this business',
        };
      }

      // Create or update workspace configuration
      const [config] = await db
        .insert(workspaceConfigurations)
        .values({
          businessId,
          swotAnalysisId,
          setupType: 'hosted', // Default, will be updated based on user choice
          setupStatus: 'pending',
          setupStep: 'email_decision',
        })
        .onConflictDoUpdate({
          target: workspaceConfigurations.businessId,
          set: {
            swotAnalysisId,
            setupStatus: 'pending',
            setupStep: 'email_decision',
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

      // Update configuration status
      await db
        .update(workspaceConfigurations)
        .set({
          setupType: 'hosted',
          hostedEmail: email,
          workspacePlan: params.workspacePlan,
          setupStatus: 'in_progress',
          setupStep: 'creating_user',
          updatedAt: new Date(),
        })
        .where(eq(workspaceConfigurations.id, workspaceConfigId));

      // Create Google Workspace user via Admin API
      const inviteResult = await this.workspaceService.sendUserInvitation(
        email,
        params.firstName,
        params.lastName
      );

      if (!inviteResult.success) {
        await db
          .update(workspaceConfigurations)
          .set({
            setupStatus: 'failed',
            setupError: inviteResult.error,
            updatedAt: new Date(),
          })
          .where(eq(workspaceConfigurations.id, workspaceConfigId));

        return {
          success: false,
          error: `Failed to create user: ${inviteResult.error}`,
        };
      }

      // Update with user ID
      await db
        .update(workspaceConfigurations)
        .set({
          hostedUserId: inviteResult.data.id,
          setupStep: 'creating_structure',
          updatedAt: new Date(),
        })
        .where(eq(workspaceConfigurations.id, workspaceConfigId));

      // Get business info for structure creation
      const business = await db.query.customerAccounts.findFirst({
        where: eq(customerAccounts.id, config.businessId),
      });

      // Create workspace structure
      const structureResult = await this.createWorkspaceStructure(
        workspaceConfigId,
        params.businessName,
        business?.name || 'Business'
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

      // Update configuration
      await db
        .update(workspaceConfigurations)
        .set({
          setupType: 'integrated',
          integratedEmail: params.email,
          accessToken: credentials.accessToken,
          refreshToken: credentials.refreshToken,
          tokenExpiry: credentials.expiryDate ? new Date(credentials.expiryDate) : null,
          setupStatus: 'in_progress',
          setupStep: 'creating_structure',
          updatedAt: new Date(),
        })
        .where(eq(workspaceConfigurations.id, workspaceConfigId));

      // Set credentials for workspace service
      this.workspaceService.setCredentials(credentials);

      // Get business info
      const business = await db.query.customerAccounts.findFirst({
        where: eq(customerAccounts.id, config.businessId),
      });

      // Create workspace structure
      const structureResult = await this.createWorkspaceStructure(
        workspaceConfigId,
        business?.name || 'Business',
        'Business' // business type
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
          setupStatus: 'failed',
          setupError: error.message,
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

      let swotData = null;
      if (config?.swotAnalysisId) {
        swotData = await db.query.swotAnalyses.findFirst({
          where: eq(swotAnalyses.id, config.swotAnalysisId),
        });
      }

      // Create basic structure - AI Biz Bot will customize further based on conversation
      const result = await this.workspaceService.createWorkspaceStructure({
        businessName,
        businessType,
      });

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Update configuration with structure IDs
      // Mark as 'awaiting_customization' instead of 'completed'
      // AI Biz Bot will complete setup after consultation
      await db
        .update(workspaceConfigurations)
        .set({
          driveFolderId: result.data.folders.root?.id,
          clientsFolderId: result.data.folders.clients?.id,
          operationsFolderId: result.data.folders.operations?.id,
          marketingFolderId: result.data.folders.marketing?.id,
          leadTrackingSheetId: result.data.sheets.leadTracking?.id,
          setupStatus: 'awaiting_customization',
          setupStep: 'ai_consultation',
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
          setupStatus: 'failed',
          setupError: error.message,
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

      // Mark as completed
      await db
        .update(workspaceConfigurations)
        .set({
          setupStatus: 'completed',
          setupStep: 'completed',
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
  async getOnboardingStatus(businessId: string): Promise<any> {
    const config = await db.query.workspaceConfigurations.findFirst({
      where: eq(workspaceConfigurations.businessId, businessId),
    });

    if (!config) {
      return {
        status: 'not_started',
        message: 'Onboarding not initiated',
      };
    }

    return {
      status: config.setupStatus,
      step: config.setupStep,
      setupType: config.setupType,
      email: config.hostedEmail || config.integratedEmail,
      error: config.setupError,
      workspaceConfigId: config.id,
    };
  }

  /**
   * Generate OAuth URL for integrated email setup
   */
  getAuthUrl(businessId: string): string {
    return this.workspaceService.getAuthUrl(businessId);
  }

  /**
   * Trigger orchestrator after SWOT completion
   */
  async onSwotComplete(businessId: string, swotAnalysisId: string): Promise<WorkspaceSetupResult> {
    // Mark SWOT as completed in workspace config
    const existing = await db.query.workspaceConfigurations.findFirst({
      where: eq(workspaceConfigurations.businessId, businessId),
    });

    if (existing) {
      await db
        .update(workspaceConfigurations)
        .set({
          swotAnalysisId,
          swotCompletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(workspaceConfigurations.id, existing.id));
    }

    // Initiate onboarding
    return this.initiateOnboarding(businessId, swotAnalysisId);
  }
}

export const workspaceOrchestrator = new WorkspaceOrchestrator();
