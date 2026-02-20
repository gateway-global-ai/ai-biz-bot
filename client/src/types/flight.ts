/**
 * Flight Visualizer Types
 * 
 * Types for cinematic flight animations and multi-segment flight coordination.
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface FlightOffer {
  id: string;
  airline: string;
  flightNumber: string;
  price: number;
  currency: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  // Core additions for cinematic flight mapping
  departureCoords: Coordinates;
  arrivalCoords: Coordinates;
  layoverCoords?: Coordinates[]; // Array for multi-stop support
  totalDurationMinutes: number; // Used for the flight timer
}

export interface FlightSegment {
  origin: string;
  dest: string;
  type: 'layover' | 'final';
}

export interface FlightCoordination {
  id: string;
  flightNumber: string;
  airline: string;
  segments: FlightSegment[];
  coordinates_map: Record<string, Coordinates>;
  animation?: {
    pause_at_layover?: number; // ms
    show_timer?: boolean;
  };
}
