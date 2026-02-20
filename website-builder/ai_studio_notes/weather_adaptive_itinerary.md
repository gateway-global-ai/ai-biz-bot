1. The Weather Grounding Task (Vertex AI)
In Application Integration, create a task that runs 24-48 hours before each travel_date.
Prompt for Weather Grounding:
"Using Google Search, get the detailed weather forecast for [Location GPS] on [Date].
Identify: temp_high, temp_low, precipitation_chance, and weather_condition (e.g., Sunny, Rain, Snow, High Wind).
Determine if this weather is 'Hostile' for the following activity categories: [Outdoor, Water, Extreme].
Return JSON: {"condition": "...", "is_hostile": true/false, "alert_msg": "..."}."
2. The Conflict Detection & Pivot Logic (Script Task)
This JavaScript task inside the integration compares the forecast against Bill's grounded_pois.
code
JavaScript
// Input: weather_json, daily_pois (from BigQuery)
let weather = JSON.parse(weather_json);
let activities = daily_pois.filter(p => p.category === 'Activity');
let routeAdjusted = false;
let alternativeNeeded = false;

activities.forEach(act => {
    // Logic: If it's raining and the activity is 'Water' or 'Outdoor'
    if (weather.is_hostile && (act.activity_type === 'Water' || act.activity_type === 'Outdoor')) {
        act.status = 'Weather_Alert'; // Flag the activity
        alternativeNeeded = true;
        routeAdjusted = true;
    }
});

// Logic: Adjust Transit Mode
let suggestedTransit = "Walking";
if (weather.condition === "Rain" || weather.condition === "Snow") {
    suggestedTransit = "Shuttle / Taxi"; // Pivot from walking to covered transit
}

return { alternativeNeeded, routeAdjusted, suggestedTransit, alert: weather.alert_msg };
3. The "Plan B" Search (Triggered Activity Expansion)
If alternativeNeeded is true, the integration triggers a new Grounding Search for Indoor Activities within 5km of the user's current anchor (Hotel or Event).
Prompt for Plan B:
"The weather for [Event] is [Rain/Snow]. Bill has kids. Find 3 Indoor activities near [Hotel GPS] (e.g., Museums, Indoor Play Centers, Interactive Exhibits).
Provide: Name, GPS, and 'Indoor' classification."
4. BigQuery Update: daily_routes & grounded_pois
The integration updates the tables so the mobile app can refresh the UI.
code
SQL
-- Update the specific day's route with weather notes
UPDATE `your_project.your_dataset.daily_routes`
SET transit_instructions = 'WEATHER ALERT: High chance of rain. Switching walking legs to Shuttle/Taxi.',
    weather_condition = @weather_desc
WHERE itinerary_id = @itin_id AND travel_date = @date;

-- Add the 'Plan B' activities to the POI table
INSERT INTO `your_project.your_dataset.grounded_pois` (name, category, status, ...)
VALUES (@plan_b_name, 'Activity', 'Available_Alternative', ...);
5. The "Bill" Experience: Real-Time Pivot
Scenario: Super Bowl LX (Gameday Morning)
Original Plan: Walk to the Embarcadero for the Outdoor Fan Fest.
The Trigger: Integration detects a 90% chance of heavy rain in San Francisco.
Agent Notification:
"Morning Bill! 🌧️ I’ve updated your route for today. It looks like heavy rain is hitting the Embarcadero this afternoon.
Route Change: I've swapped your '15-min walk' to the Caltrain Express and suggested a Lyft for the final mile to keep the kids dry.
Activity Pivot: Since the Fan Fest is outdoors, I’ve found a 'Plan B' for you: The Exploratorium (Indoor Science Center). It's nearby and has great indoor World Cup exhibits today.
Ticket Update: I’ve pinned the Indoor Registration Link to your dashboard.
Should I swap your 'Outdoor Fan Fest' to 'Exploratorium' in your main itinerary?"
6. Summary of Architecture Benefits
Proactive, Not Reactive: Bill doesn't have to check the weather; the agent tells him it has already found a solution.
Safety: In the Alps (Olympics), high winds can close cable cars. The weather trigger detects this and automatically pivots the "Daily Route" to the mountain bus system.
Data Integrity: By storing "Weather_Alert" status in BigQuery, the Offline Sync will still show the warning even if Bill loses service while heading to the venue.