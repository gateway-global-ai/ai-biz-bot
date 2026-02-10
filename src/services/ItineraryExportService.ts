import { DayItinerary, TripFocus } from "../types";

/**
 * Itinerary Export Service
 * Transforms raw transactional data into professional whitelabel proposals.
 * 
 * CRITICAL B2B RULE: 
 * Always use Selling Price (Markup Included). 
 * Original Net Rates from GRN/SerpAPI are strictly obfuscated.
 */
export class ItineraryExportService {
  /**
   * Generates a formatted text proposal for Google Docs integration.
   */
  static generateProposalContent(
    itinerary: { days: DayItinerary[]; focus: TripFocus | null },
    agentBranding: { name: string; contact: string }
  ): string {
    let content = `PROPOSAL: ${itinerary.focus?.name || 'Your Global Journey'}\n`;
    content += `Prepared by: ${agentBranding.name}\n`;
    content += `Contact: ${agentBranding.contact}\n`;
    content += `--------------------------------------------------\n\n`;

    itinerary.days.forEach(day => {
      content += `DAY ${day.dayNumber}: ${day.title}\n`;
      content += `${day.description}\n\n`;

      day.pois.forEach(poi => {
        // WHITELABEL RULE: Display "Selling Price" set in the AgentCurationPanel
        // If no selling price is set, default to 'Included' or 'TBD'
        const displayPrice = poi.sellingPrice 
          ? `${poi.currency} ${poi.sellingPrice.toLocaleString()}` 
          : 'Included in Package';
        
        content += `  • ${poi.name}\n`;
        content += `    ${poi.description}\n`;
        content += `    Price: ${displayPrice}\n\n`;
      });
      
      content += `--------------------------------------------------\n\n`;
    });

    content += `\nThank you for choosing ${agentBranding.name}. We look forward to grounding your journey.`;
    return content;
  }

  /**
   * Placeholder for Google Docs API integration.
   * In production, this calls the Google Workspace service.
   */
  static async exportToGoogleDocs(
    accessToken: string,
    itinerary: any,
    agentBranding: any
  ) {
    const content = this.generateProposalContent(itinerary, agentBranding);
    const title = `Travel Proposal - ${itinerary.focus?.name || 'Client'}`;
    
    console.log(`[EXPORT] Generating Google Doc: ${title}`);
    // return await createGoogleDoc(accessToken, title, content);
    return { success: true, title, content };
  }
}
