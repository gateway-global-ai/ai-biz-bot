To implement the Daily Routing and Logistics layer at an enterprise level, we need to move beyond simple point-to-point lines. We must ground the Transit Mode in reality (specific shuttle names, train lines, or walking paths) and provide the Visual Pathing (polylines) that the Application Integration layer can pass to the mobile app for offline rendering.
1. The Enhanced Daily Route SQL (BigQuery)
This query pulls the day's "Selected" POIs and forces them into the specific chronological sequence you defined.
code
SQL
WITH RawStops AS (
  -- 1. Start: Hotel
  SELECT name, coordinates, poi_time, 'Hotel' as category, 1 as seq FROM `grounded_pois`
  WHERE itinerary_id = @itin_id AND travel_date = @date AND category = 'Hotel' AND status = 'Selected'
  
  UNION ALL
  -- 2. Breakfast
  SELECT name, coordinates, poi_time, 'Breakfast' as category, 2 as seq FROM `grounded_pois`
  WHERE itinerary_id = @itin_id AND travel_date = @date AND sub_category = 'Breakfast' AND status = 'Selected'
  
  UNION ALL
  -- 3. Event
  SELECT name, coordinates, poi_time, 'Event' as category, 3 as seq FROM `grounded_pois`
  WHERE itinerary_id = @itin_id AND travel_date = @date AND category = 'Event' AND status = 'Selected'
  
  UNION ALL
  -- 4. Lunch
  SELECT name, coordinates, poi_time, 'Lunch' as category, 4 as seq FROM `grounded_pois`
  WHERE itinerary_id = @itin_id AND travel_date = @date AND sub_category = 'Lunch' AND status = 'Selected'
  
  UNION ALL
  -- 5. Activity
  SELECT name, coordinates, poi_time, 'Activity' as category, 5 as seq FROM `grounded_pois`
  WHERE itinerary_id = @itin_id AND travel_date = @date AND category = 'Activity' AND status = 'Selected'
  
  UNION ALL
  -- 6. Dinner
  SELECT name, coordinates, poi_time, 'Dinner' as category, 6 as seq FROM `grounded_pois`
  WHERE itinerary_id = @itin_id AND travel_date = @date AND sub_category = 'Dinner' AND status = 'Selected'
  
  UNION ALL
  -- 7. End: Hotel (Return)
  SELECT name, coordinates, '23:59' as poi_time, 'Hotel' as category, 7 as seq FROM `grounded_pois`
  WHERE itinerary_id = @itin_id AND travel_date = @date AND category = 'Hotel' AND status = 'Selected'
)
SELECT name, ST_ASTEXT(coordinates) as geo_point, category, seq 
FROM RawStops ORDER BY seq ASC;
2. Transit Grounding (Vertex AI Task)
Once Application Integration has the list of stops, it sends them to Gemini to determine the Transit Mode.
Prompt for Transit Grounding:
"I have a daily sequence of waypoints for [Event Name]: [List of Waypoints].
Use Google Search to find specific 2026 event transit names (e.g., 'Caltrain Super Bowl Express', 'Olympic Shuttle B').
For each leg (Point A to Point B), provide the Transit Mode and Estimated Duration.
Return a JSON array: {"leg": "1-2", "transit_name": "...", "duration_mins": 15}."
3. Visual Pathing Payload (Application Integration JSON)
The final output sent from Application Integration to the mobile app or BigQuery daily_routes table looks like this. It includes the Polyline (the visual line) and the Step-by-Step instructions.
code
JSON
{
  "route_id": "ROUTE_FEB12_2026",
  "itinerary_id": "MILANO_2026",
  "date": "2026-02-12",
  "visual_pathing": {
    "polyline_encoded": "a~l~Fjk~uOnB_@fD_...[Encoded String from Google Maps API]",
    "points": [
      {"lat": 46.5386, "lng": 10.1358, "label": "Hotel Lac Salin"},
      {"lat": 46.5400, "lng": 10.1400, "label": "Mottolino Snow Park"}
    ]
  },
  "logistics": [
    {
      "sequence": 1,
      "from": "Hotel",
      "to": "Breakfast",
      "transit": "Walking",
      "instruction": "Walk 5 mins east on Via Plan."
    },
    {
      "sequence": 2,
      "from": "Breakfast",
      "to": "Event",
      "transit": "Olympic Shuttle B",
      "instruction": "Board at Stop 14 (Central Square)."
    },
    {
      "sequence": 3,
      "from": "Event",
      "to": "Lunch",
      "transit": "Cable Car",
      "instruction": "Take the Mottolino Gondola to the summit."
    }
  ]
}
4. Implementation in Application Integration
Task 1 (BigQuery): Run the sequence SQL to get the ordered waypoints.
Task 2 (Google Maps REST): Send waypoints to the Routes API to get the polyline and travel_duration.
Task 3 (Vertex AI): Ground the transit names based on the 2026 event context.
Task 4 (Script): Merge the Polyline and the Transit Names into a single JSON object.
Task 5 (BigQuery): Write the final JSON into the daily_routes table for the Offline Sync.
5. Why this works for "Bill" (The User)
Visual Confidence: He sees a professional, curved line on his map following the actual roads/shuttle paths, not just a straight "flight" line.
Contextual Knowledge: Instead of a generic "Take a bus," he sees "Take the Caltrain Super Bowl Express," which matches the signage he will see in the real world.
Offline Safety: Because the polyline_encoded string is small and stored in BigQuery, it is downloaded during the sync, allowing his map to work perfectly in the crowded Levi's Stadium or high-altitude Livigno Alps.