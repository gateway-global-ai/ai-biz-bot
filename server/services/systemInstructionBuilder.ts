/**
 * System Instruction Builder
 *
 * Builds comprehensive system instructions for Gemini voice AI by combining:
 * - Business context (general + owner-specific)
 * - Business intelligence (SWOT, narrative hooks)
 * - Agent configuration (role, personality, objectives)
 * - Featured partner data (if applicable)
 *
 * Used by geminiVoice.ts and client-side GeminiStreamingClient to provide
 * rich context so the AI can answer detailed business questions.
 */

import { BusinessContext, AgentConfig } from '../../client/src/types/voice.js';
import {
  enrichBusinessData,
  mergeBusinessContext,
  EnrichedBusinessData,
} from './businessDataService.js';

export interface RichSystemInstructionOptions {
  includeIntelligence?: boolean;
  includeOwnerData?: boolean;
  includeTourNarrative?: boolean;
  tourMode?: boolean;
}

/**
 * Builds a rich system instruction string for Gemini.
 */
export async function buildRichSystemInstruction(
  business: BusinessContext,
  agent: AgentConfig,
  options: RichSystemInstructionOptions = {}
): Promise<string> {
  let instruction = `### IDENTITY\n`;
  instruction += `You are ${agent.role} for "${business.name}".\n\n`;

  instruction += `### PERSONALITY\n`;
  instruction += `${agent.personality}\n\n`;

  // Fetch enriched business data
  let enrichedData: EnrichedBusinessData | null = null;
  try {
    enrichedData = await enrichBusinessData(business.placeId, {
      includeIntelligence: options.includeIntelligence,
      includeOwnerData: options.includeOwnerData,
      businessName: business.name,
    });
  } catch (error) {
    console.warn('[SystemInstructionBuilder] Failed to enrich data:', error);
  }

  // Core business context
  instruction += `### BUSINESS CONTEXT\n`;
  if (enrichedData) {
    instruction += mergeBusinessContext(enrichedData.general, enrichedData.owner);
  } else {
    // Fallback to basic context
    instruction += `Business: ${business.name}\n`;
    instruction += `Address: ${business.address}\n`;
    if (business.hours) {
      instruction += `Hours: ${business.hours}\n`;
    }
    if (business.services && business.services.length > 0) {
      instruction += `Services: ${business.services.join(', ')}\n`;
    }
  }

  // Business intelligence insights
  if (enrichedData?.intelligence && options.includeIntelligence) {
    instruction += `\n### BUSINESS INTELLIGENCE\n`;
    instruction += `Executive Summary: ${enrichedData.intelligence.executive_summary}\n\n`;
    
    // Amenities from review data (SerpAPI + Gemini), not GMP. Use owner public selection or full list.
    const amenitiesToShow = enrichedData.owner?.publicAmenities && enrichedData.owner.publicAmenities.length > 0
      ? enrichedData.owner.publicAmenities
      : enrichedData.intelligence.amenity_list;
    instruction += `Key Amenities: ${amenitiesToShow.join(', ')}\n\n`;
    
    instruction += `Strengths: ${enrichedData.intelligence.owner_insights.strengths.join('; ')}\n`;
    if (enrichedData.intelligence.owner_insights.blind_spots.length > 0) {
      instruction += `Areas for Improvement: ${enrichedData.intelligence.owner_insights.blind_spots.join('; ')}\n`;
    }
  }

  // Tour narrative hooks (for tour guide mode)
  if (enrichedData?.intelligence?.cinematic_narrative && options.includeTourNarrative) {
    instruction += `\n### TOUR NARRATIVE HOOKS\n`;
    instruction += `Take-off: ${enrichedData.intelligence.cinematic_narrative.take_off}\n`;
    instruction += `Cruise: ${enrichedData.intelligence.cinematic_narrative.cruise}\n`;
    instruction += `Landing: ${enrichedData.intelligence.cinematic_narrative.landing}\n`;
    
    // Tour mode instructions
    if (options.tourMode) {
      instruction += `\n### TOUR MODE ACTIVE\n`;
      instruction += `You are currently narrating during a cinematic map tour. Prioritize the Landing hook for the current segment and keep your spoken output aligned with the map animation. Do not invent generic facts or repeat place details already visible on the map.\n`;
    } else {
      instruction += `\n### TOUR NARRATION GUIDELINES\n`;
      instruction += `When narrating during a map tour (e.g. after the user asks to 'tell me about [business]' or 'start the tour'), use ONLY the Tour Narrative Hooks above. Do not invent generic facts or repeat place details already shown on the map.\n`;
    }
  }

  // Agent objectives and constraints
  instruction += `\n### CORE GOALS\n`;
  instruction += agent.objectives.map((obj) => `- ${obj}`).join('\n');
  instruction += `\n\n### CONSTRAINTS\n`;
  instruction += agent.constraints.map((constraint) => `- ${constraint}`).join('\n');

  // Operational rules
  instruction += `\n### OPERATIONAL RULES\n`;
  instruction += `1. Use the get_business_details tool if you need current place information.\n`;
  instruction += `2. Use get_business_reviews if asked about customer feedback or ratings.\n`;
  instruction += `3. Use get_business_intelligence for detailed SWOT analysis or tour narratives.\n`;
  instruction += `4. Keep responses natural, concise, and helpful.\n`;
  instruction += `5. Reference specific business details when relevant.\n`;

  return instruction;
}

/**
 * Builds a basic system instruction (fallback when enrichment fails).
 */
export function buildBasicSystemInstruction(
  business: BusinessContext,
  agent: AgentConfig
): string {
  return `
    Identity: You are ${agent.role} for "${business.name}".
    Personality: ${agent.personality}.
    
    BUSINESS CONTEXT:
    - Name: ${business.name}
    - Address: ${business.address}
    ${business.hours ? `- Hours: ${business.hours}` : ''}
    ${business.services ? `- Services: ${business.services.join(', ')}` : ''}

    CORE GOAL:
    ${agent.objectives.join(' ')}
    
    CONSTRAINTS:
    ${agent.constraints.join(' ')}
    
    Keep responses natural and concise.
  `;
}
