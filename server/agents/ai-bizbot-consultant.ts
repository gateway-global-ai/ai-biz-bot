/**
 * AI Biz Bot Consultation Agent
 * 
 * Manages personalized consultations with business owners after SWOT analysis.
 * Gathers insights to customize Google Workspace integration and tools.
 */

import { chat, KIMI_MODELS } from '../kimi';
import { db } from '../db';
import { swotAnalyses, workspaceConfigurations } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface ConsultationContext {
  businessId: string;
  businessName: string;
  swotAnalysis: any;
  workspaceConfigId: string;
}

export interface ConsultationInsight {
  category: string;
  insight: string;
  toolSuggestion?: string;
}

export interface ConsultationResult {
  consultationSummary: string;
  insights: ConsultationInsight[];
  customTools: Array<{
    toolType: string;
    toolName: string;
    configuration: any;
  }>;
  additionalFolders: string[];
  customSheets: Array<{ name: string; headers: string[] }>;
  customTasks: Array<{ title: string; notes: string }>;
}

export class AIBizBotConsultant {
  
  /**
   * Generate consultation system prompt based on SWOT analysis
   */
  private generateConsultationPrompt(swotAnalysis: any, businessName: string): string {
    return `You are AI Biz Bot, an intelligent business consultant for ${businessName}. 

You've just completed a comprehensive SWOT analysis:

STRENGTHS:
${JSON.stringify(swotAnalysis.strengths, null, 2)}

WEAKNESSES:
${JSON.stringify(swotAnalysis.weaknesses, null, 2)}

OPPORTUNITIES:
${JSON.stringify(swotAnalysis.opportunities, null, 2)}

THREATS:
${JSON.stringify(swotAnalysis.threats, null, 2)}

Your role is to have a natural, conversational consultation with the business owner to:

1. **Understand Their Specific Needs**: Ask about their daily operations, pain points, and goals
2. **Identify Custom Tools**: Determine what specific tools, workflows, or automations would help THEIR business
3. **Personalize Workspace**: Design a Google Workspace structure tailored to how THEY work
4. **No Generic Templates**: Every business is unique - customize based on their actual needs

CONVERSATION GUIDELINES:
- Be warm, professional, and consultative
- Ask open-ended questions to understand their workflow
- Listen for pain points that technology can solve
- Suggest specific tools/automations based on their answers
- Build on the SWOT insights but go deeper
- Focus on practical, actionable solutions

EXAMPLE QUESTIONS:
- "Based on your reviews, customer service is a strength. How do you currently track customer interactions?"
- "Your SWOT shows opportunity in digital presence. What's your biggest challenge with online marketing?"
- "I see you handle appointments. Walk me through your current scheduling process - where does it break down?"
- "What tasks eat up most of your time that you wish could be automated?"

After 3-5 conversational exchanges, summarize their needs and propose a customized solution.

Remember: This is about THEIR business, not a generic template. Every recommendation should be specific to their situation.`;
  }

  /**
   * Analyze consultation conversation and extract customization insights
   */
  async analyzeConsultation(
    context: ConsultationContext,
    conversationHistory: Array<{ role: string; content: string }>
  ): Promise<ConsultationResult> {
    try {
      // Get SWOT analysis
      const swotData = await db.query.swotAnalyses.findFirst({
        where: eq(swotAnalyses.id, context.swotAnalysis),
      });

      if (!swotData) {
        throw new Error('SWOT analysis not found');
      }

      // Create analysis prompt
      const analysisPrompt = `Based on this consultation conversation, analyze the business owner's needs and generate a customized workspace setup.

CONVERSATION:
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n\n')}

SWOT ANALYSIS CONTEXT:
${JSON.stringify({
  strengths: swotData.strengths,
  weaknesses: swotData.weaknesses,
  opportunities: swotData.opportunities,
  threats: swotData.threats,
}, null, 2)}

Generate a JSON response with:
{
  "consultationSummary": "2-3 sentence summary of owner's main needs and goals",
  "insights": [
    {
      "category": "workflow" | "customer_management" | "scheduling" | "marketing" | "operations",
      "insight": "Specific insight from conversation",
      "toolSuggestion": "Recommended tool or automation"
    }
  ],
  "customTools": [
    {
      "toolType": "gmail_automation" | "calendar_template" | "task_workflow" | "sheet_tracker" | "drive_system",
      "toolName": "User-friendly name for this tool",
      "configuration": {
        // Tool-specific configuration based on their needs
      }
    }
  ],
  "additionalFolders": ["Folder names specific to their business"],
  "customSheets": [
    {
      "name": "Sheet name tailored to their process",
      "headers": ["Column headers based on their tracking needs"]
    }
  ],
  "customTasks": [
    {
      "title": "Initial task specific to their setup",
      "notes": "Detailed notes on what to do"
    }
  ]
}

Be specific and personalized. No generic templates.`;

      // Use AI to analyze and generate customization
      const response = await chat({
        messages: [
          {
            role: 'system',
            content: 'You are an expert business analyst specializing in personalized workspace setup. Generate specific, actionable customizations based on business owner conversations.',
          },
          {
            role: 'user',
            content: analysisPrompt,
          },
        ],
        model: KIMI_MODELS['moonshot-v1-128k'],
        temperature: 0.3, // Lower temperature for structured output
      });

      // Parse AI response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse AI analysis response');
      }

      const result: ConsultationResult = JSON.parse(jsonMatch[0]);
      return result;

    } catch (error: any) {
      console.error('Consultation analysis error:', error);
      throw error;
    }
  }

  /**
   * Get consultation prompt for AI Biz Bot
   */
  async getConsultationPrompt(context: ConsultationContext): Promise<string> {
    const swotData = await db.query.swotAnalyses.findFirst({
      where: eq(swotAnalyses.id, context.swotAnalysis),
    });

    if (!swotData) {
      throw new Error('SWOT analysis not found');
    }

    return this.generateConsultationPrompt(swotData, context.businessName);
  }

  /**
   * Process a consultation message
   */
  async processConsultationMessage(
    context: ConsultationContext,
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }>
  ): Promise<{ response: string; shouldFinalize: boolean }> {
    try {
      const swotData = await db.query.swotAnalyses.findFirst({
        where: eq(swotAnalyses.id, context.swotAnalysis),
      });

      if (!swotData) {
        throw new Error('SWOT analysis not found');
      }

      const systemPrompt = this.generateConsultationPrompt(swotData, context.businessName);

      // Add system instruction to decide when to finalize
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'system', content: `After 3-5 meaningful exchanges where you understand their needs, workflow, and pain points, you can finalize the consultation. When you're ready to finalize, start your response with "FINALIZE:" followed by your summary and recommendations.` },
        ...conversationHistory,
        { role: 'user', content: userMessage },
      ];

      const response = await chat({
        messages,
        model: KIMI_MODELS['moonshot-v1-128k'],
        temperature: 0.7,
      });

      // Check if AI wants to finalize
      const shouldFinalize = response.startsWith('FINALIZE:');
      const cleanResponse = shouldFinalize ? response.replace('FINALIZE:', '').trim() : response;

      return {
        response: cleanResponse,
        shouldFinalize,
      };

    } catch (error: any) {
      console.error('Consultation message processing error:', error);
      throw error;
    }
  }
}

export const aiBizBotConsultant = new AIBizBotConsultant();
