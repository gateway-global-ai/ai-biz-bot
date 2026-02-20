/**
 * Types for Olympic Travel / Itinerary UI (multi-day, POIs, flights).
 */

export enum LocationType {
  HOTEL = "HOTEL",
  EVENT = "EVENT",
  DINING = "DINING",
  TRANSPORT = "TRANSPORT",
  SIGHTSEEING = "SIGHTSEEING",
  FLIGHT_START = "FLIGHT_START",
  FLIGHT_END = "FLIGHT_END",
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
  reviews?: number;
  imageUrl?: string;
  summary?: string;
  time?: string;
  duration?: string;
  price?: number;
  currency?: string;
}

export interface DayItinerary {
  dayNumber: number;
  date: string;
  title: string;
  description: string;
  pois: Poi[];
  hackTip?: string;
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
  waypointCoords?: Coordinates;
  departureCity: string;
  arrivalCity: string;
}

/** When a POI is backed by a B2B itinerary item, use this to show and persist markup. */
export interface B2bPoiBinding {
  itemId: string;
  markupApplied: string;
  netRate: number;
}
