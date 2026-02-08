
import { HotelOffer, FlightSearchParams, FlightOffer, Poi, LocationType } from "../types";

const API_KEY = "prod_5ed5ab54-4a6b-4f50-8d6c-ba362755ef5b";
const BASE_URL = "https://api.liteapi.travel/v3.0";

// Helper to generate random amenities
const AMENITY_POOL = ["Free WiFi", "Spa & Wellness", "Airport Shuttle", "Fitness Center", "Breakfast Included", "Rooftop Bar", "Ski Storage", "Heated Pool", "24/7 Concierge"];

const getRandomAmenities = () => {
  return AMENITY_POOL.sort(() => 0.5 - Math.random()).slice(0, 4);
};

// Mock data for fallback when CORS/API limits prevent real access in demo environment
// Note: Coordinates in mock data are placeholders, they get overwritten by search location context in the function below
const MOCK_HOTELS: HotelOffer[] = [
  {
    hotelId: "mock-1",
    name: "Grand Olympic Hotel",
    starRating: 4,
    price: 245.00,
    currency: "USD",
    thumbnailUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    address: "Via Olimpica 12, Milan",
    amenities: ["Free WiFi", "Fitness Center", "Rooftop Bar", "Airport Shuttle"],
    aiSummary: "A modern 4-star haven perfectly situated for Olympic events. Guests love the high-tech gym and the rooftop aperitivo hour. Ideal for travelers seeking convenience and style.",
    coordinates: { lat: 45.4642, lng: 9.1900 }
  },
  {
    hotelId: "mock-2",
    name: "Alpine Retreat & Spa",
    starRating: 5,
    price: 450.00,
    currency: "USD",
    thumbnailUrl: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    address: "Mountain View Rd, Cortina",
    amenities: ["Spa & Wellness", "Heated Pool", "Ski Storage", "Breakfast Included"],
    aiSummary: "Luxurious alpine escape featuring world-class thermal baths. The proximity to the slopes and the exquisite wood-paneled interiors make it a top pick for relaxation after the games.",
    coordinates: { lat: 46.5405, lng: 12.1357 }
  },
  {
    hotelId: "mock-3",
    name: "City Center Boutique",
    starRating: 3,
    price: 180.50,
    currency: "USD",
    thumbnailUrl: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    address: "Piazza Centrale, Verona",
    amenities: ["Free WiFi", "Breakfast Included", "24/7 Concierge"],
    aiSummary: "Charming boutique accommodation in the heart of the historic center. Known for its personalized service and easy access to the Arena, offering a cozy, authentic Italian stay.",
    coordinates: { lat: 45.4384, lng: 10.9916 }
  }
];

// Simple coordinate lookup for demo purposes
const CITY_COORDS: Record<string, {lat: number, lng: number}> = {
    "milan": { lat: 45.6301, lng: 8.7255 }, // MXP
    "venice": { lat: 45.5051, lng: 12.3519 }, // VCE
    "rome": { lat: 41.8003, lng: 12.2389 }, // FCO
    "florence": { lat: 43.8086, lng: 11.2012 }, // FLR
    "naples": { lat: 40.8844, lng: 14.2908 }, // NAP
    "turin": { lat: 45.2008, lng: 7.6496 }, // TRN
    "new york": { lat: 40.6413, lng: -73.7781 }, // JFK
    "london": { lat: 51.4700, lng: -0.4543 }, // LHR
    "dubai": { lat: 25.2532, lng: 55.3657 }, // DXB
    "paris": { lat: 49.0097, lng: 2.5479 }, // CDG
    "frankfurt": { lat: 50.0379, lng: 8.5622 }, // FRA
    "los angeles": { lat: 33.9416, lng: -118.4085 }, // LAX
    "tokyo": { lat: 35.7719, lng: 140.3929 }, // NRT
};

const getCoordsForCity = (city: string) => {
    const key = Object.keys(CITY_COORDS).find(k => city.toLowerCase().includes(k));
    if (key) return CITY_COORDS[key];
    // Default random coords mostly in US/Europe for fallback visual
    return { lat: 40.7128, lng: -74.0060 }; 
};

// Helper to jitter coordinates slightly so they show up on map near the search location
const jitterCoords = (lat: number, lng: number) => {
    return {
        lat: lat + (Math.random() - 0.5) * 0.015,
        lng: lng + (Math.random() - 0.5) * 0.015
    }
}

export const searchHotelsNearby = async (lat: number, lng: number): Promise<HotelOffer[]> => {
  try {
    const url = `${BASE_URL}/data/hotels?latitude=${lat}&longitude=${lng}&radius=5000&limit=5`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
        // Return mocks centered around the requested lat/lng
        return MOCK_HOTELS.map(h => ({
            ...h,
            coordinates: jitterCoords(lat, lng)
        }));
    }

    const data = await response.json();
    if (data && data.data) {
      return data.data.map((hotel: any) => ({
        hotelId: hotel.id,
        name: hotel.name,
        starRating: hotel.star_rating || 4,
        price: Math.floor(Math.random() * 200) + 150, 
        currency: "USD",
        thumbnailUrl: hotel.main_photo || MOCK_HOTELS[0].thumbnailUrl,
        address: hotel.address,
        amenities: getRandomAmenities(),
        aiSummary: `An excellent choice located near ${hotel.address || 'the city center'}. Based on recent data, this hotel offers great value for Olympic travelers looking for comfort.`,
        // If API returns coords use them, otherwise jitter the center
        coordinates: hotel.latitude && hotel.longitude 
            ? { lat: parseFloat(hotel.latitude), lng: parseFloat(hotel.longitude) }
            : jitterCoords(lat, lng)
      }));
    }
    
    return MOCK_HOTELS.map(h => ({
            ...h,
            coordinates: jitterCoords(lat, lng)
    }));
  } catch (error) {
    return MOCK_HOTELS.map(h => ({
            ...h,
            coordinates: jitterCoords(lat, lng)
    }));
  }
};

export const searchFlights = async (params: FlightSearchParams): Promise<FlightOffer[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const basePrice = params.cabinClass === 'First' ? 2500 : params.cabinClass === 'Business' ? 1200 : 450;
            
            const depCoords = getCoordsForCity(params.departureCity);
            const arrCoords = getCoordsForCity(params.arrivalCity);

            // Generate a stopover coordinate roughly in between + jitter for visual variation
            const stopLat = (depCoords.lat + arrCoords.lat) / 2 + (Math.random() * 10 - 5);
            const stopLng = (depCoords.lng + arrCoords.lng) / 2 + (Math.random() * 10 - 5);
            const waypointCoords = { lat: stopLat, lng: stopLng };

            const offers: FlightOffer[] = [
                {
                    id: 'fl-1',
                    airline: 'Delta Airlines',
                    flightNumber: 'DL182',
                    departureTime: '16:30',
                    arrivalTime: '08:15 (+1)',
                    duration: '8h 45m',
                    price: basePrice + 50,
                    currency: 'USD',
                    stops: 0,
                    logoUrl: '',
                    departureCoords: depCoords,
                    arrivalCoords: arrCoords,
                    departureCity: params.departureCity,
                    arrivalCity: params.arrivalCity
                },
                {
                    id: 'fl-2',
                    airline: 'Emirates',
                    flightNumber: 'EK205',
                    departureTime: '14:00',
                    arrivalTime: '07:30 (+1)',
                    duration: '10h 30m',
                    price: basePrice + 120,
                    currency: 'USD',
                    stops: 1,
                    logoUrl: '',
                    departureCoords: depCoords,
                    arrivalCoords: arrCoords,
                    waypointCoords: waypointCoords,
                    departureCity: params.departureCity,
                    arrivalCity: params.arrivalCity
                },
                {
                    id: 'fl-3',
                    airline: 'ITA Airways',
                    flightNumber: 'AZ605',
                    departureTime: '17:45',
                    arrivalTime: '09:00 (+1)',
                    duration: '9h 15m',
                    price: basePrice - 30,
                    currency: 'USD',
                    stops: 0,
                    logoUrl: '',
                    departureCoords: depCoords,
                    arrivalCoords: arrCoords,
                    departureCity: params.departureCity,
                    arrivalCity: params.arrivalCity
                },
            ];
            resolve(offers);
        }, 1500);
    });
};

export const searchPois = async (query: string, type: LocationType): Promise<Poi[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            // Mock Search results based on type
            const isDining = type === LocationType.DINING;
            const results: Poi[] = [];

            const baseImages = isDining ? [
                'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=600&q=80',
                'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
                'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80'
            ] : [
                'https://images.unsplash.com/photo-1522770179533-24471fcdba45?auto=format&fit=crop&w=600&q=80',
                'https://images.unsplash.com/photo-1515703407324-5f753afd8be8?auto=format&fit=crop&w=600&q=80',
                'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=600&q=80'
            ];

            const baseNames = isDining 
                ? [`${query} Trattoria`, `${query} Bistro`, `Ristorante ${query} Plaza`] 
                : [`${query} Experience`, `${query} Tour`, `${query} Arena`];

            for(let i=0; i<3; i++) {
                results.push({
                    id: `new-poi-${Date.now()}-${i}`,
                    name: baseNames[i],
                    type: type,
                    description: isDining ? 'Authentic local flavors in a cozy setting.' : 'An unforgettable activity for your custom trip.',
                    coordinates: jitterCoords(45.4642, 9.1900), // Default to Milan area mock
                    imageUrl: baseImages[i],
                    summary: 'Added via Build Your Own Adventure.',
                    price: Math.floor(Math.random() * 50) + 20,
                    currency: 'EUR',
                    rating: (4 + Math.random()).toFixed(1)
                });
            }
            resolve(results);
        }, 800);
    });
};
