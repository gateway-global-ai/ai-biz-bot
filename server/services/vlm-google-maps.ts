import { Client } from "@googlemaps/google-maps-services-js";
import type { InsertVlmProspect, GoogleReviewData, GooglePhotoData } from "@shared/schema";

const client = new Client({});

export interface GooglePlaceResult {
  placeId: string;
  name: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  rating?: number;
  userRatingsTotal?: number;
  googleMapsUrl?: string;
  editorialSummary?: string;
  generativeSummary?: string;
  reviewSummary?: string;
  reviews?: GoogleReviewData[];
  photos?: GooglePhotoData[];
}

export class VlmGoogleMapsService {
  private apiKey: string;
  private requestDelay = 200;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async searchPlaces(options: { city: string; industry: string; maxResults?: number }): Promise<GooglePlaceResult[]> {
    const { city, industry, maxResults = 100 } = options;
    const results: GooglePlaceResult[] = [];
    let nextPageToken: string | undefined;
    let retries = 0;
    const maxRetries = 3;

    try {
      const query = `${industry} in ${city}`;

      do {
        if (!nextPageToken) {
          await this.delay(this.requestDelay);
        }

        try {
          const response = await client.textSearch({
            params: {
              query,
              key: this.apiKey,
              ...(nextPageToken && { pagetoken: nextPageToken }),
            },
          });

          if (response.data.results) {
            for (const place of response.data.results) {
              if (results.length >= maxResults) break;
              results.push({
                placeId: place.place_id || "",
                name: place.name || "",
                address: place.formatted_address,
                rating: place.rating,
                userRatingsTotal: place.user_ratings_total,
              });
            }
          }

          nextPageToken = response.data.next_page_token;
          retries = 0;

          if (nextPageToken && results.length < maxResults) {
            await this.delay(2000);
          }
        } catch (pageError: any) {
          if (nextPageToken && retries < maxRetries) {
            retries++;
            await this.delay(3000);
            continue;
          }
          if (results.length > 0) break;
          throw pageError;
        }
      } while (nextPageToken && results.length < maxResults);

      return results;
    } catch (error: any) {
      if (results.length > 0) return results;
      throw new Error(`Failed to search places: ${error.message}`);
    }
  }

  async getPlaceDetails(placeId: string): Promise<GooglePlaceResult> {
    await this.delay(this.requestDelay);

    // Request all useful fields for prospect enrichment. For AI-powered summaries
    // (generativeSummary, editorialSummary, reviewSummary) the Places API (New) v1
    // is required (Enterprise + Atmosphere SKU). This client uses the legacy endpoint;
    // if you switch to the new API, add: generativeSummary, editorialSummary, reviewSummary.
    const response = await client.placeDetails({
      params: {
        place_id: placeId,
        fields: [
          "name", "formatted_address", "address_components",
          "formatted_phone_number", "international_phone_number",
          "website", "rating", "user_ratings_total", "url",
          "reviews", "photos",
        ],
        key: this.apiKey,
      },
    });

    const place = response.data.result;
    if (!place) throw new Error("Place not found");

    let city = "", state = "", postalCode = "";
    if (place.address_components) {
      for (const component of place.address_components) {
        const types = component.types as string[];
        if (types.includes("locality")) city = component.long_name;
        else if (types.includes("administrative_area_level_1")) state = component.short_name;
        else if (types.includes("postal_code")) postalCode = component.long_name;
      }
    }

    const reviews: GoogleReviewData[] = [];
    if (place.reviews && Array.isArray(place.reviews)) {
      for (const review of place.reviews) {
        reviews.push({
          authorName: review.author_name || "Anonymous",
          rating: typeof review.rating === 'number' ? review.rating : parseInt(String(review.rating || 0)),
          text: review.text || "",
          time: typeof review.time === 'number' ? review.time : parseInt(String(review.time || 0)),
          relativeTimeDescription: review.relative_time_description || "",
        });
      }
    }

    const photos: GooglePhotoData[] = [];
    if (place.photos && Array.isArray(place.photos)) {
      for (const photo of place.photos) {
        if (photo.photo_reference) {
          photos.push({
            photoReference: photo.photo_reference,
            width: photo.width || 400,
            height: photo.height || 400,
            htmlAttributions: photo.html_attributions,
          });
        }
      }
    }

    // AI-powered summaries (Place Details New API v1): editorialSummary, generativeSummary, reviewSummary
    const editorialSummary = (place as any).editorial_summary?.overview ?? (place as any).editorialSummary?.overview;
    const generativeSummary = (place as any).generative_summary?.overview ?? (place as any).generativeSummary?.overview;
    const reviewSummary = (place as any).review_summary?.overview ?? (place as any).reviewSummary?.overview;

    return {
      placeId,
      name: place.name || "",
      phone: place.international_phone_number || place.formatted_phone_number,
      website: place.website,
      address: place.formatted_address,
      city, state, postalCode,
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      googleMapsUrl: place.url,
      editorialSummary: editorialSummary || undefined,
      generativeSummary: generativeSummary || undefined,
      reviewSummary: reviewSummary || undefined,
      reviews,
      photos,
    };
  }

  async enrichProspects(places: GooglePlaceResult[], industry: string): Promise<InsertVlmProspect[]> {
    const prospects: InsertVlmProspect[] = [];

    for (const place of places) {
      try {
        const details = await this.getPlaceDetails(place.placeId);
        prospects.push({
          industry,
          businessName: details.name,
          phone: details.phone,
          website: details.website,
          address: details.address,
          city: details.city,
          state: details.state,
          postalCode: details.postalCode,
          googlePlaceId: details.placeId,
          sourceUrl: details.googleMapsUrl,
          qualityScore: 0,
          status: "new",
          rating: details.rating ? String(details.rating) : undefined,
          reviewCount: details.userRatingsTotal,
          editorialSummary: details.editorialSummary,
          generativeSummary: details.generativeSummary,
          reviewSummary: details.reviewSummary,
          reviews: details.reviews,
          photos: details.photos,
        });
      } catch (error: any) {
        console.error(`Failed to enrich ${place.name}:`, error.message);
      }
    }

    return prospects;
  }
}
