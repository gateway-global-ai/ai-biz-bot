/**
 * Owner Data Service
 *
 * Reads and writes owner-specific business data (owner_business_data table).
 * Used by businessDataService to merge owner context into enriched data and system instructions.
 */

import { eq } from 'drizzle-orm';
import { db } from '../db.js';
import { ownerBusinessData } from '@shared/schema';

export interface OwnerSpecificData {
  customDescription?: string;
  specialOffers?: string[];
  ownerStory?: string;
  customHours?: string;
  contactPreferences?: Record<string, unknown>;
  publicAmenities?: string[];
}

/**
 * Get owner-specific data by place ID.
 */
export async function getOwnerDataByPlaceId(placeId: string): Promise<OwnerSpecificData | null> {
  const rows = await db
    .select()
    .from(ownerBusinessData)
    .where(eq(ownerBusinessData.placeId, placeId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    customDescription: row.customDescription ?? undefined,
    specialOffers: Array.isArray(row.specialOffers) ? (row.specialOffers as string[]) : undefined,
    ownerStory: row.ownerStory ?? undefined,
    customHours: row.customHours ?? undefined,
    contactPreferences: (row.contactPreferences as Record<string, unknown>) ?? undefined,
    publicAmenities: Array.isArray(row.publicAmenities) ? (row.publicAmenities as string[]) : undefined,
  };
}

/**
 * Upsert owner data for a place. Creates or updates the row.
 */
export async function upsertOwnerData(
  placeId: string,
  data: Partial<OwnerSpecificData>,
  ownerId?: string
): Promise<void> {
  const existing = await db
    .select()
    .from(ownerBusinessData)
    .where(eq(ownerBusinessData.placeId, placeId))
    .limit(1);

  const payload = {
    placeId,
    ownerId: ownerId ?? existing[0]?.ownerId ?? null,
    customDescription: data.customDescription ?? existing[0]?.customDescription ?? null,
    specialOffers: data.specialOffers ?? existing[0]?.specialOffers ?? null,
    ownerStory: data.ownerStory ?? existing[0]?.ownerStory ?? null,
    customHours: data.customHours ?? existing[0]?.customHours ?? null,
    contactPreferences: data.contactPreferences ?? existing[0]?.contactPreferences ?? null,
    publicAmenities: data.publicAmenities ?? existing[0]?.publicAmenities ?? null,
    updatedAt: new Date(),
  };

  if (existing.length === 0) {
    await db.insert(ownerBusinessData).values({
      placeId: payload.placeId,
      ownerId: payload.ownerId,
      customDescription: payload.customDescription,
      specialOffers: payload.specialOffers,
      ownerStory: payload.ownerStory,
      customHours: payload.customHours,
      contactPreferences: payload.contactPreferences,
      publicAmenities: payload.publicAmenities,
    });
  } else {
    await db
      .update(ownerBusinessData)
      .set({
        ownerId: payload.ownerId,
        customDescription: payload.customDescription,
        specialOffers: payload.specialOffers,
        ownerStory: payload.ownerStory,
        customHours: payload.customHours,
        contactPreferences: payload.contactPreferences,
        publicAmenities: payload.publicAmenities,
        updatedAt: payload.updatedAt,
      })
      .where(eq(ownerBusinessData.placeId, placeId));
  }
}
