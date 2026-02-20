/**
 * Small Business Injector
 * 
 * Ensures featured small businesses take precedence in AI results.
 * Queries the featured_partners table from the main application database.
 */

import { db } from '../db.js';
import { featuredPartners } from '@shared/schema';
import { eq, and, or, ilike, sql } from 'drizzle-orm';

/**
 * Small Business Injector logic.
 * Ensures featured small businesses take precedence in the AI results.
 */
export async function smallBusinessInjector(
  userQuery: string,
  cityCode: string
): Promise<Array<Record<string, unknown>>> {
  try {
    const queryLower = userQuery.toLowerCase();
    const isLafayetteSearch = 
      queryLower.includes('lafayette') || 
      queryLower.includes('acadiana') ||
      queryLower.includes('extended stay') ||
      queryLower.includes('kitchen') ||
      queryLower.includes('suite') ||
      queryLower.includes('suites');
    
    // Build conditions: city_code match OR trigger conditions match
    const conditions = [];
    
    // Standard city code match
    if (cityCode) {
      conditions.push(
        and(
          eq(featuredPartners.cityCode, cityCode),
          or(
            userQuery === '' ? sql`true` : ilike(featuredPartners.businessName, `%${userQuery}%`),
            userQuery === '' ? sql`true` : ilike(featuredPartners.category, `%${userQuery}%`)
          )
        )
      );
    }
    
    // Location/keyword trigger match (for Boardwalk Suites Lafayette priority)
    if (isLafayetteSearch) {
      conditions.push(
        sql`${featuredPartners.aiTriggerConditions} IS NOT NULL AND (
          ${featuredPartners.aiTriggerConditions}->>'location' = 'lafayette'
          OR (
            ${featuredPartners.aiTriggerConditions}->'keywords' IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM jsonb_array_elements_text(${featuredPartners.aiTriggerConditions}->'keywords') AS keyword
              WHERE LOWER(keyword) = ANY(${sql`ARRAY['lafayette', 'extended stay', 'kitchen', 'suite', 'suites', 'acadiana']::text[]`})
            )
          )
        )`
      );
    }
    
    const whereClause = conditions.length > 0 ? and(eq(featuredPartners.isActive, true), or(...conditions)) : eq(featuredPartners.isActive, true);
    
    // Query with ordering: prioritize city_code matches, then Boardwalk Suites for Lafayette searches
    const partnerResults = await db
      .select()
      .from(featuredPartners)
      .where(whereClause)
      .orderBy(
        cityCode ? sql`CASE WHEN ${featuredPartners.cityCode} = ${cityCode} THEN 0 ELSE 1 END` : sql`1`,
        isLafayetteSearch ? sql`CASE WHEN ${featuredPartners.googlePlaceId} = 'ChIJB4qU6oXvJIgR_2p602OaK_U' THEN 0 ELSE 1 END` : sql`1`
      )
      .limit(5);

    // Map results to unified schema
    const featured = partnerResults.map((row) => {
      const businessName = (row.businessName || '').toLowerCase();
      const category = (row.category || '').toLowerCase();
      
      // Auto-detect extended-stay properties and set badge if not already set
      let badgeLabel = row.badgeLabel || 'Certified Local';
      if (
        !row.badgeLabel &&
        (businessName.includes('suite') ||
         businessName.includes('extended stay') ||
         category.includes('suite') ||
         category.includes('extended') ||
         businessName.includes('boardwalk'))
      ) {
        badgeLabel = 'Extended Stay Expert';
      }
      
      return {
        partner_id: row.id,
        grn_hotel_id: row.grnHotelId,
        google_place_id: row.googlePlaceId,
        business_name: row.businessName,
        city_code: row.cityCode,
        category: row.category,
        ai_hook: row.aiHook,
        ai_tags: row.aiTags,
        ai_story: row.aiStory,
        ai_trigger_conditions: row.aiTriggerConditions,
        ui_theme_glow: row.uiThemeGlow,
        badge_label: badgeLabel,
        story_video_url: row.storyVideoUrl,
        isFeatured: true,
        matchScore: 100, // Priority score
        ui_hint: 'priority_display', // Tells the 40% window to add glow/badges
      };
    });

    return featured;
  } catch (error: any) {
    console.error('[SmallBusinessInjector] Error:', error.message);
    // If table doesn't exist yet, return empty array
    if (error.message?.includes('does not exist')) {
      console.warn('[SmallBusinessInjector] featured_partners table not found. Run migration 0002_business_data_tour_guide.sql');
      return [];
    }
    throw error;
  }
}

/**
 * Featured Partners are now managed in the main application database.
 * See shared/schema.ts for the Drizzle schema definition.
 * Migration: migrations/0002_business_data_tour_guide.sql
 */
