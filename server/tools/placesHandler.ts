import axios from 'axios';

/**
 * Basic tier field mask to control Places API cost.
 * Amenities are not included here—they come from review data (SerpAPI + Gemini), not GMP.
 */
const PLACE_DETAILS_FIELD_MASK =
  'id,displayName,formattedAddress,location,rating,userRatingCount,regularOpeningHours,websiteUri,internationalPhoneNumber,photos';

/**
 * Normalize place ID (remove "places/" prefix if present).
 */
function normalizePlaceId(placeId: string): string {
  return placeId.replace(/^places\//i, '');
}

/**
 * Fetch place details by Place ID (for get_business_details / get_place_ui_data tools).
 */
export async function getPlaceDetails(placeId: string) {
  const normalizedId = normalizePlaceId(placeId);
  const { getServerMapsApiKey } = await import("../config/mapsApiKey");
  const API_KEY = getServerMapsApiKey();
  if (!API_KEY) throw new Error('Google Maps/Places API key not configured (set GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_GROUNDING_LITE_API_KEY, or GOOGLE_PLACES_API_KEY)');

  const res = await axios.get(
    `https://places.googleapis.com/v1/places/${normalizedId}`,
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': PLACE_DETAILS_FIELD_MASK,
      },
    }
  );

  const p = res.data;
  return {
    placeId: p.id,
    name: p.displayName?.text ?? p.name ?? '',
    formattedAddress: p.formattedAddress ?? '',
    location: p.location,
    rating: p.rating,
    userRatingCount: p.userRatingCount,
    regularOpeningHours: p.regularOpeningHours,
    websiteUri: p.websiteUri,
    internationalPhoneNumber: p.internationalPhoneNumber,
    photos: p.photos,
  };
}

export async function handlePlacesSearch(query: string, location?: string) {
  const { getServerMapsApiKey } = await import("../config/mapsApiKey");
  const API_KEY = getServerMapsApiKey();
  if (!API_KEY) {
    throw new Error('Google Maps/Places API key not configured (set GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_GROUNDING_LITE_API_KEY, or GOOGLE_PLACES_API_KEY)');
  }
  
  const response = await axios.post(
    'https://places.googleapis.com/v1/places:searchText',
    {
      textQuery: `${query} ${location || ''}`,
      includedType: "business"
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.formattedAddress,places.rating'
      }
    }
  );

  return response.data.places.map((place: any) => ({
    id: place.id,
    title: place.displayName.text,
    position: {
      lat: place.location.latitude,
      lng: place.location.longitude
    },
    address: place.formattedAddress,
    rating: place.rating
  }));
}
