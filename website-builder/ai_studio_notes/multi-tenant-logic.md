LOGIC: MULTI-TENANT AND MULTI-SESSION 

1. Updated BigQuery Schema (Multi-Tenant & Multi-Session)
To support Travel Agents managing customers and trip-specific chat memory, your database requires a relational structure.[1]
Table: users (Central Identity)
Column	Type	Description
user_id	STRING	Primary Key (UUID)
account_type	STRING	'AGENT' or 'USER'
phone_number	STRING	For Twilio OTP
email	STRING	For SendGrid OTP
managed_by	STRING	(Optional) The user_id of the Agent if this is a customer account
pref_class	STRING	Business, Economy, etc.
loyalty_programs	JSON	Favorite airlines/hotels
Table: itineraries (Trip Header)
Crucial change: This table is the "Anchor" for all chat context.
| Column | Type | Description |
| :--- | :--- | :--- |
| itinerary_id | STRING | Primary Key |
| owner_id | STRING | Foreign Key to users.user_id |
| creator_id | STRING | The ID of who created it (The Agent or the User) |
| trip_name | STRING | e.g., "Winter Olympics 2026" |
| status | STRING | 'Draft', 'Confirmed', 'Archived' |
Table: chat_history (The "ChatGPT" Memory)
Column	Type	Description
message_id	STRING	Primary Key
itinerary_id	STRING	Foreign Key — Links chat history to a specific trip
role	STRING	'user' or 'assistant'
content	STRING	The message text
timestamp	TIMESTAMP	For chronological retrieval
2. Dual-Channel Authentication Flow (Application Integration)
This logic handles both Phone (Twilio) and Email (SendGrid) verification in a single entry point.
Flowchart Logic:
Trigger: App receives identifier (Phone or Email).[1][2]
Lookup: Check users table. If not found, create a new "Draft" profile.[1]
OTP Generation: Generate 6-digit code. Write to auth_temp with a 5-minute expiry.
Channel Decision:
If identifier contains @: Trigger SendGrid Task (Send email template).[1]
Else: Trigger Twilio Task (Send SMS via Connector).
Verification: User returns OTP. Integration verifies against auth_temp.[1]
Role Check: Integration returns account_type.
If AGENT: Show "Customer List" and "Global Trip Manager."
If USER: Show "My Trips."[3]
3. Multi-Itinerary & Session Management
To ensure the agent doesn't mix context (e.g., suggesting a beach hotel for a ski trip), the Trip ID must be part of every request header.[1]
The "New Trip" Workflow
User/Agent: "Create a new trip for Super Bowl 2026."
System:
Generates new_itinerary_id.[1]
Sets active_session_id = new_itinerary_id.
Clears temporary "Current Context" memory.
Result: Every subsequent grounding call is filtered by WHERE itinerary_id = 'SUPERBOWL_2026'.
The "Context Switching" Workflow
When Bill switches from "CES" to "Winter Olympics":
App: Sends SWITCH_CONTEXT(itinerary_id: 'OLY_2026').
BQ Task: Fetches the last 10 messages from chat_history where itinerary_id = 'OLY_2026'.
Vertex AI Task: The prompt is pre-loaded with: "You are assisting with the Winter Olympics trip. Here is the previous conversation history: [Summary]..."
4. Travel Agent Logic: Managing Customers
Travel Agents have an elevated view.[1] When an agent logs in, their dashboard queries BigQuery differently:
code
SQL
-- Query for Agents to see all their customers' trips
SELECT 
  u.user_name as customer_name, 
  i.trip_name, 
  i.itinerary_id 
FROM `itineraries` i
JOIN `users` u ON i.owner_id = u.user_id
WHERE i.creator_id = @agent_id;
Agent Features:
Impersonation/Collaboration: The agent can "Enter Session" for a customer's trip. Because the chat is tied to the itinerary_id, the agent sees exactly what the AI has already suggested to the customer.
Whitelabel Planning: The agent can set preferences (Class, Loyalty) for the customer, which the grounding API then uses to filter results.[1]
5. Implementation Summary for "Bill"
The Friend-like Conversation:
Agent to Bill: "Hey Bill! I see your agent, Sarah, started a draft for your CES 2026 trip. She selected the Wynn for you. Would you like me to find some dining options nearby that fit your 'Quiet' preference, or should we work on your Winter Olympics itinerary instead?"
Technical Benefits:
Security: OTP via Twilio/SendGrid ensures zero passwords to manage.
Context: By scoping chat memory to the itinerary_id, you eliminate the "hallucination" of mixing different trip details.
Scalability: Travel Agents can manage 100+ customers using the same grounding engine, with each customer having a personalized, high-touch experience.[1]