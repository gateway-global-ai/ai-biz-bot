
export enum LocationType {
  HOTEL = 'HOTEL',
  EVENT = 'EVENT',
  DINING = 'DINING',
  TRANSPORT = 'TRANSPORT',
  SIGHTSEEING = 'SIGHTSEEING',
  FLIGHT_START = 'FLIGHT_START',
  FLIGHT_END = 'FLIGHT_END',
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Poi {
  id: string;
  name: string;
  type: LocationType;
  description: string;
  coordinates: Coordinates;
  link?: string;
  rating?: string;
  reviews?: number; // Number of reviews
  imageUrl?: string; // URL for the POI image
  summary?: string; // A longer business summary
  time?: string; // e.g. "19:00" or "Check-in: 15:00"
  duration?: string; // e.g. "2h" or "3 Nights"
  price?: number; // Estimated cost
  currency?: string; // e.g. "USD", "EUR"
}

export interface DayItinerary {
  dayNumber: number;
  date: string;
  title: string;
  description: string;
  pois: Poi[];
  hackTip?: string;
}

export interface TravelPackage {
  id: string;
  name: string;
  tagline: string;
  description: string;
  duration: string;
  days: DayItinerary[];
  primaryColor: string;
}

export interface HotelOffer {
  hotelId: string;
  name: string;
  starRating: number;
  price: number;
  currency: string;
  thumbnailUrl: string;
  address?: string;
  amenities: string[];
  aiSummary: string;
  coordinates: Coordinates;
}

export interface FlightSearchParams {
  departureCity: string;
  arrivalCity: string;
  departureDate: string;
  returnDate?: string; // Optional if one-way
  tripType: 'round-trip' | 'one-way';
  passengers: number;
  bags: number;
  cabinClass: 'Economy' | 'Business' | 'First';
}

export interface FlightOffer {
  id: string;
  airline: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  price: number;
  currency: string;
  stops: number;
  logoUrl: string;
  departureCoords: Coordinates;
  arrivalCoords: Coordinates;
  waypointCoords?: Coordinates; // For stops
  departureCity: string;
  arrivalCity: string;
}
