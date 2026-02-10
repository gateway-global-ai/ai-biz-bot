/**
 * SerpAPI Google Flights Integration
 * Provides real-time airfare data for the Master Orchestrator.
 */
export const fetchSerpFlights = async (params: {
  departure_id: string;
  arrival_id: string;
  outbound_date: string;
  return_date?: string;
  currency?: string;
  travel_class?: number;
}) => {
  const SERP_API_URL = 'https://serpapi.com/search.json';
  
  const searchParams = new URLSearchParams({
    engine: 'google_flights',
    departure_id: params.departure_id,
    arrival_id: params.arrival_id,
    outbound_date: params.outbound_date,
    return_date: params.return_date || '',
    currency: params.currency || 'USD',
    travel_class: params.travel_class?.toString() || '1',
    api_key: process.env.SERP_API_KEY || ''
  });

  try {
    const response = await fetch(`${SERP_API_URL}?${searchParams.toString()}`);
    if (!response.ok) throw new Error(`SerpAPI error: ${response.statusText}`);
    
    const data = await response.json();

    // CURATION: Extract the top 5 results for the Orchestrator
    return data.best_flights?.slice(0, 5).map((f: any) => ({
      airline: f.flights[0].airline,
      price: f.price,
      duration: f.total_duration,
      stops: f.flights.length - 1,
      deep_link: f.booking_token // Passed for B2B agent execution
    })) || [];
  } catch (error) {
    console.error("Error fetching SerpAPI flights:", error);
    return [];
  }
};
