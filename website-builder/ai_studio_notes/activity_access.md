1. The Activity Access Logic
We will categorize activities into four tiers to help Bill manage his family's expectations and gear:
OPEN (Free): Public trails, beaches, parks. No cost, no booking. (e.g., Hiking Runyon Canyon).
FREE_REG: Community-led activities. No cost, but requires a signup. (e.g., Guided Tidepool Tour).
PAID (Booking): Guided tours or entry fees. (e.g., Guided Whale Watching).
RENTAL: Paid use of equipment. Attributes: rental_url, hourly_rate. (e.g., Jet Ski Rental).
2. Updated BigQuery Table: grounded_pois
We will add activity-specific columns to track equipment and duration.
code
SQL
ALTER TABLE `your_project.your_dataset.grounded_pois`
ADD COLUMN activity_type STRING, -- 'Outdoor', 'Water', 'Culture', 'Extreme'
ADD COLUMN equipment_provided BOOLEAN, 
ADD COLUMN equipment_needed STRING, -- 'Hiking boots', 'Swimsuit'
ADD COLUMN duration_est_minutes INT64, 
ADD COLUMN is_weather_dependent BOOLEAN,
ADD COLUMN rental_url STRING; -- Specific for Jet Skis, Bikes, etc.
3. Application Integration Logic: "The Activity Classifier"
This script distinguishes between a "Walk in the Park" and a "Jet Ski Rental" to ensure the Booking Helper shows the right button.
code
JavaScript
// Logic for Activity Classification
let groundedActivities = JSON.parse(ai_response);

let processedActivities = groundedActivities.map(act => {
    let accessTier = "OPEN";
    let isFree = (act.price === 0);
    
    // Logic: If the name or description mentions "Rent" or "Per Hour"
    if (act.description.toLowerCase().includes("rental") || act.price_label.includes("hour")) {
        accessTier = "RENTAL";
        isFree = false;
    } else if (act.price > 0) {
        accessTier = "PAID";
    }

    return {
        ...act,
        "is_free": isFree,
        "access_tier": accessTier,
        "equipment_needed": act.category === "Hiking" ? "Comfortable shoes, Water" : "Swimwear",
        "action_button_text": accessTier === "RENTAL" ? "Reserve Equipment" : (isFree ? "View Route" : "Book Activity")
    };
});
4. Example: World Cup 2026 (Los Angeles Hub)
User: "I want to do something active today. Maybe a hike or some water sports with the kids."
Agent Grounding (The "Bill" Dashboard):
Activity Name	Access Tier	Cost	Note
Hollywood Sign Hike	OPEN	$0	Equipment: Water, Sunscreen. 2-hour loop.
Marina del Rey Jet Skis	RENTAL	$120/hr	Equipment: Life vest provided. Requires ID.
Echo Park Swan Boats	RENTAL	$11/hr	Free_Reg Option: Some hours are free for kids.
Agent Response:
"Bill, I've found two great options for the family today:
Hollywood Sign (Bronson Canyon): This is an Open Activity. It’s free and offers the best views of the city. I've pinned the trailhead coordinates to your map.
Marina del Rey Jet Skiing: This is a Rental Activity. It costs $120/hour, and they provide life vests for the kids. I’ve included the Rental Link to reserve your 2:00 PM slot.
Weather Alert: It's currently 78°F and sunny—perfect for the water, but if you hike, make sure the kids have hats!"
5. Why this is important for the "Offline Sync"
When Bill is out on a jet ski or deep in a canyon, he likely has zero cell service.
For the Hike: The offline package includes the Topo Map and Trailhead GPS so he doesn't get lost.
For the Jet Ski: The offline package stores his Rental Confirmation QR Code and the Rental Office Phone Number, so he can prove his reservation even without a 5G connection.
