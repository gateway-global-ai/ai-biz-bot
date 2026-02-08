
const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY || '';

export interface GooglePlaceDetails {
  id: string;
  displayName: { text: string };
  formattedAddress: string;
  rating?: number;
  userRatingCount?: number;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  regularOpeningHours?: { openNow: boolean };
  editorialSummary?: { text: string };
  photos?: Array<{ name: string }>;
  types: string[];
}

export const fetchPlaceDetailsByName = async (name: string): Promise<GooglePlaceDetails | null> => {
  console.log(`Searching for POI: ${name}`);
  try {
    // Step 1: Search for the place to get its ID
    const searchResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': PLACES_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName'
      },
      body: JSON.stringify({ 
        textQuery: `${name}, Las Vegas`,
        locationBias: {
          circle: {
            center: { latitude: 36.1147, longitude: -115.1728 },
            radius: 5000.0
          }
        }
      })
    });

    if (!searchResponse.ok) {
      console.error('Search API error:', await searchResponse.text());
      return null;
    }

    const searchData = await searchResponse.json();
    console.log('Search Data result:', searchData);
    
    const placeId = searchData.places?.[0]?.id;

    if (!placeId) {
      console.warn(`No place ID found for ${name}`);
      return null;
    }

    // Step 2: Get full details for that place ID
    const detailsResponse = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': PLACES_API_KEY,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,rating,userRatingCount,nationalPhoneNumber,websiteUri,regularOpeningHours,editorialSummary,photos,types'
      }
    });

    if (!detailsResponse.ok) {
      console.error('Details API error:', await detailsResponse.text());
      return null;
    }

    const details = await detailsResponse.json();
    console.log('Fetched place details:', details);
    return details;
  } catch (error) {
    console.error('Error fetching Google Places data:', error);
    return null;
  }
};

export const getPhotoUrl = (photoName: string, maxWidth = 800): string => {
  return `https://places.googleapis.com/v1/${photoName}/media?key=${PLACES_API_KEY}&maxWidthPx=${maxWidth}`;
};
