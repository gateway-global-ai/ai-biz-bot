Here is the updated logic and BigQuery structure to support this.
1. Updated BigQuery Table: sentiment_logs
We are adding an alert_status and agent_id to ensure negative feedback is routed to the professional in charge.
code
SQL
CREATE OR REPLACE TABLE `your_project.your_dataset.sentiment_logs` (
  log_id STRING NOT NULL,
  itinerary_id STRING,
  user_id STRING,      -- The Customer
  agent_id STRING,     -- The Professional Travel Agent
  poi_id STRING,       -- Link to the specific event/hotel/meal
  feedback_text STRING,
  sentiment_score FLOAT64, -- -1.0 (Angry) to 1.0 (Delighted)
  sentiment_label STRING,  -- 'POSITIVE', 'NEUTRAL', 'NEGATIVE', 'CRITICAL'
  alert_triggered BOOLEAN DEFAULT FALSE,
  alert_status STRING,     -- 'NONE', 'PENDING_AGENT', 'RESOLVED'
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
2. Refined System Instruction: The "Compassionate Companion"
ROLE:
You are the Gateway Global AI Companion. Your secondary mission is to monitor the user's emotional state and protect the reputation of the Travel Agent by escalating issues before they become "trip-ruiners."
A. The Proactive Check-in (Temporal Trigger):
Logic: 30–60 minutes after a poi_time has ended (Grounded via BigQuery), initiate a friendly chat.
Tone: Informal, empathetic, and curious.
Example: "Hey Bill! I saw the Abbott session just wrapped up. Did the biowearable demo live up to the hype, or was it just a lot of marketing noise?"
B. Sentiment Grading & Thresholds:
Logic: For every response, calculate a sentiment_score.
The "Unhappy" Trigger: If the score is < -0.5 OR the user uses "High-Alert Keywords" (e.g., Dirty, Scam, Rude, Dangerous, Refused, Lost, Stranded):
Acknowledge locally: "I'm so sorry to hear that, Bill. That’s definitely not the experience we wanted for you."
Trigger Escalation: Flag the log as CRITICAL and alert_triggered = TRUE.
Inform the User: "I've just flagged this for your Travel Agent, Sarah. She’s been notified and will look into this immediately."
C. Adaptive Learning (The Memory Loop):
If a user complains about a specific attribute (e.g., "The restaurant was too loud"), immediately update the users.preferences table in BigQuery.
Constraint: For all future grounding in this trip, apply a mandatory negative-filter on that attribute.
3. Application Integration: The Escalation Flow
When the AI detects a "Negative" sentiment, the Application Integration flow executes this logic:
Task: Script (Sentiment Processor)
Identifies if sentiment_score < -0.5.
Extracts the agent_id associated with the itinerary_id.
Task: Notification (Twilio/SendGrid)
To the Travel Agent: "URGENT: Your client Bill (702-540-5471) is unhappy with his current activity: [Activity Name]. Feedback: '[Raw_Text]'. View itinerary to intervene."
Task: BigQuery Update
Writes the log to sentiment_logs with alert_status = 'PENDING_AGENT'.
4. Example Scenario: The "Bad Hotel" Pivot
User: "The hotel is a disaster. There is construction right outside my window and I can't sleep. I'm exhausted."
AI Analysis:
Score: -0.9 (Critical)
Key Issues: Noise, Construction, Fatigue.
AI Response (to User):
"Bill, I am so sorry. That sounds exhausting, especially with the kids. I've just alerted Sarah (your travel agent) so she can look into a room move or a compensation credit for you. In the meantime, I'm adjusting your route for tomorrow to include a later start so you can get some rest."
AI Action (to Agent via Twilio):
"Sarah, Bill is reporting construction noise at Hotel Lac Salin. Sentiment is critical (-0.9). Please contact the front desk."
AI Learning (BigQuery Update):
Update users table: exclude_preferences: ['construction', 'near_main_road'].
5. Why this is vital for your Enterprise build:
Agent Retention: Travel Agents love this because it gives them "Superpowers"—they know their client is unhappy before the client even calls them.
Brand Protection: By escalating "Critical" issues to a human, you ensure the AI doesn't try to "hallucinate" a solution to a real-world problem (like a closed hotel).
Hyper-Personalization: The "Adaptive Learning" ensures the user feels heard. If they complain once about "Long Walks," the agent never suggests a walking route again.