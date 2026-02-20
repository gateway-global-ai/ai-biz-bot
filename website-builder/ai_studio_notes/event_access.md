1. The Access Logic Definition
We will classify events into three "Access Tiers" to ensure the user knows exactly how to enter:
PAID: Requires a financial transaction. Attributes: ticket_url, price_min, price_max.
FREE_REG: No cost, but capacity is limited. Attributes: registration_url, ticket_type: QR_CODE.
OPEN: No cost, no tickets, just show up. Attributes: classification: OPEN_PUBLIC.
2. Updated BigQuery Table: grounded_pois
Run this SQL to update your table with the new "Free vs. Paid" logic columns.
code
SQL
CREATE OR REPLACE TABLE `your_project.your_dataset.grounded_pois` (
  poi_id STRING NOT NULL,
  itinerary_id STRING,
  category STRING, -- 'Event', 'Hotel', 'Restaurant', 'Activity'
  
  -- Access & Ticket Logic --
  is_free BOOLEAN, 
  access_tier STRING, -- 'PAID', 'FREE_REG', 'OPEN'
  price_min FLOAT64,
  price_max FLOAT64,
  currency STRING DEFAULT 'USD',
  booking_url STRING, -- General URL
  registration_url STRING, -- Specific to Free Events
  ticketing_url STRING, -- Specific to Paid Events
  ticket_status STRING, -- 'Available', 'Waitlist', 'Sold Out', 'No Tickets Needed'
  
  -- Core Metadata --
  name STRING,
  description STRING,
  coordinates GEOGRAPHY,
  travel_date DATE,
  poi_time STRING,
  status STRING, -- 'Available' or 'Selected'
  star_rating FLOAT64
);
3. Application Integration Logic: "The Free Search"
When Bill asks, "What free events are going on for the Super Bowl?" the Application Integration script task uses this logic to filter results:
code
JavaScript
// Logic for identifying Free vs Paid from AI Grounded Response
let groundedData = JSON.parse(ai_response);

let processedEvents = groundedData.map(event => {
    let accessTier = "PAID";
    let isFree = false;
    
    if (event.price == 0 || event.price_label.toLowerCase().includes("free")) {
        isFree = true;
        // Check if a registration link exists
        accessTier = event.registration_link ? "FREE_REG" : "OPEN";
    }

    return {
        ...event,
        "is_free": isFree,
        "access_tier": accessTier,
        "ticket_status": isFree && !event.registration_link ? "No Tickets Needed" : "Available"
    };
});
4. Example: Super Bowl LX (San Francisco 2026)
User: "I'm in SF for the Super Bowl. Show me some free things to do with the kids."
Agent Grounding:
Event 1 (PAID): The Big Game (Levi's Stadium). is_free: false, price_min: 2500, ticketing_url: ...
Event 2 (FREE_REG): NFL Play 60 Clinic. is_free: true, access_tier: FREE_REG, registration_url: ...
Event 3 (OPEN): Super Bowl City Fireworks (Embarcadero). is_free: true, access_tier: OPEN, ticket_status: No Tickets Needed.
Agent Response:
"Bill, I've found 3 free events for Super Bowl week!
Super Bowl City (Embarcadero): This is Open to the Public—no tickets required. Great for the kids to see the fireworks!
NFL Play 60 Clinic: This is Free, but you must Register via the link I’ve pinned to your profile to get a QR code for the kids.
The Lombardi Trophy Display: Free viewing at the Moscone Center (Open Public).
I've filtered out the paid galas and gameday tickets based on your 'Free Event' request."
5. Why this is important for "Bill" (The User Profile)
By distinguishing between registration_url and ticketing_url, the Booking Helper we built earlier becomes much smarter:
If it's a Paid event, the button says "Buy Tickets".
If it's a Free event with a link, the button says "Register for Free".
If it's an Open event, the button says "Show on Map" (because there is nothing to buy/register for).