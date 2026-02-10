LOGIC: MEAL-SPECIFIC DINING MODULE

The agent must never apply a "one-size-fits-all" search for food. It must maintain three distinct preference profiles for every day of the itinerary to match the typical rhythm of a traveler.
1. MEAL-SPECIFIC GROUNDING CRITERIA
☕ BREAKFAST: The "Efficient Start"
Proximity Anchor: Must be within 500 meters to 1km of the Grounded Hotel.
Style Focus: Prioritize "Quick Service," "Bakery," "Cafe," and "Coffee Shop" styles.
Logic: The goal is to get the user fed and toward their first event of the day without a long commute.
🍔 LUNCH: The "Event Midpoint"
Proximity Anchor: Must be within 1km of the Current Daily Event Location (e.g., the specific hall at CES or the stadium at the Super Bowl).
Style Focus: Prioritize "Casual," "Fast-Casual," or "Venue-Adjacent" dining.
Logic: Minimize time away from the event; focus on convenience and speed.
🍷 DINNER: The "Atmospheric Finale"
Proximity Anchor: Flexible (within 5km of the Hotel or Event), but prioritize the Atmosphere.
Style Focus: Prioritize "Highest Rated," "Traditional," "Fine Dining," and "Atmospheric" styles.
Logic: Focus on the experience. Use grounding to find "Traditional Valtellinese" (Olympics) or "Steakhouse/Fine Italian" (CES/Vegas).
2. BUDGETARY & RATING CONTROLS (THE "GATES")
For every dining search, regardless of the meal type, the agent MUST honor the filters established in the BigQuery users table:
Max Price Filter: Automatically exclude any restaurant where the grounded price_level exceeds the user's max_dining_price.
Min Star Rating: Automatically exclude any restaurant with a verified rating lower than the user's min_star_rating (e.g., if the user set a 4-star minimum, 3.5-star "quick" breakfasts are hidden).
3. DATA OUTPUT SCHEMA (JSON FOR BIGQUERY)
The AI must return the following structure to the Application Integration Data Mapping task:
code
JSON
{
  "itinerary_id": "CES_2026",
  "meal_type": "Lunch",
  "anchor_poi": "LVCC North Hall",
  "restaurants": [
    {
      "name": "The Daily Grill",
      "style": "Fast-Casual",
      "rating": 4.2,
      "price_level": "$$",
      "latitude": 36.1312,
      "longitude": -115.1510,
      "description": "Grounded as a high-speed lunch spot 400m from the North Hall.",
      "reservation_link": "https://..."
    }
  ]
}
4. EXAMPLE AGENT DIALOGUE (CES 2026)
User: "Where should I eat tomorrow?"
Agent: "I’ve mapped out three distinct options for your day at CES on Jan 8th:
Breakfast: Since you're at the Marriott Marquis, I found a Quick Bakery called The Roasted Bean just 200m away.
Lunch: While you're at the Abbott Booth, I recommend Central Plaza Tacos. It’s the highest-rated casual spot within 500m of the North Hall.
Dinner: For your evening, I’ve applied your 4-star minimum and 
$ budget filters. I found Amalfi by Bobby Flay. It’s grounded as a Traditional Atmospheric Italian spot in the Caesars cluster, perfect for finishing your day.
Would you like me to create a reservation for dinner, or should I add all three to your Daily Route?"