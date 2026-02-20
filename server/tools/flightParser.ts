/**
 * Flight Coordination Parser
 * 
 * Parses YAML flight coordination specs into FlightOffer objects.
 */

import * as yaml from 'js-yaml';
import { FlightOffer, FlightCoordination, Coordinates } from '../../client/src/types/flight.js';

/**
 * Parse YAML flight coordination spec into FlightOffer[]
 */
export function parseFlightSpec(yamlString: string): FlightOffer[] {
  try {
    const data = yaml.load(yamlString) as { flights?: FlightCoordination[] };
    
    if (!data.flights || !Array.isArray(data.flights)) {
      throw new Error('Invalid YAML format: missing "flights" array');
    }

    return data.flights.map((flight) => {
      const segments = flight.segments || [];
      const coordsMap = flight.coordinates_map || {};
      
      // Extract coordinates for departure and arrival
      const firstSegment = segments[0];
      const lastSegment = segments[segments.length - 1];
      
      const departureCoords = coordsMap[firstSegment?.origin || ''] || { lat: 0, lng: 0 };
      const arrivalCoords = coordsMap[lastSegment?.dest || ''] || { lat: 0, lng: 0 };
      
      // Extract layover coordinates
      const layoverCoords: Coordinates[] = segments
        .slice(0, -1) // All segments except the last
        .map((seg) => coordsMap[seg.dest] || { lat: 0, lng: 0 })
        .filter((coord) => coord.lat !== 0 || coord.lng !== 0);

      return {
        id: flight.id,
        airline: flight.airline,
        flightNumber: flight.flightNumber,
        price: 0, // Not in YAML spec
        currency: 'USD',
        departureTime: '', // Not in YAML spec
        arrivalTime: '', // Not in YAML spec
        duration: '', // Not in YAML spec
        stops: layoverCoords.length,
        departureCoords,
        arrivalCoords,
        layoverCoords: layoverCoords.length > 0 ? layoverCoords : undefined,
        totalDurationMinutes: 0, // Calculate from segments if needed
      };
    });
  } catch (error: any) {
    console.error('[FlightParser] Error parsing YAML:', error.message);
    throw error;
  }
}

/**
 * Parse flight coordination from URL or file path
 */
export async function parseFlightCoordination(
  source: string
): Promise<FlightOffer[]> {
  try {
    // If it's a URL, fetch it
    if (source.startsWith('http://') || source.startsWith('https://')) {
      const response = await fetch(source);
      const yamlText = await response.text();
      return parseFlightSpec(yamlText);
    }
    
    // Otherwise, treat as YAML string
    return parseFlightSpec(source);
  } catch (error: any) {
    console.error('[FlightParser] Error loading coordination:', error.message);
    throw error;
  }
}
