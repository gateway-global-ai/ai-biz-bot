# 06 — Knowledge & Skills

The Knowledge Library and Skills registry are the **intelligence layer** of an agent. Knowledge is what the agent *knows*. Skills are what the agent can *do*. Together they determine how accurately and usefully the agent can respond.

An agent without knowledge is a personality with nothing to say.  
An agent without skills is knowledgeable but can't act.

---

## Part 1: The Knowledge Library

### What it is
The Knowledge Library is a scoped repository of documents, FAQs, policies, menus, price lists, team bios, and any other reference material the agent should be able to draw from. It is indexed per site (`siteConfigId`) and searched at runtime when the agent needs to answer a specific question.

### How it works
1. The owner uploads files or ingests a business profile
2. Documents are indexed and chunked for semantic search
3. When a user asks a question, the `query_knowledge_library` tool retrieves the most relevant snippets
4. The agent uses those snippets to answer accurately — without hallucinating

### The golden rule
**The agent should not know more than what's in its library.** For customer-facing agents, the knowledge base is the authoritative source. If something isn't in the library, the agent should say so and route the caller rather than guess.

---

### What to upload — by category

#### Identity & Profile
- Business name, tagline, mission
- Owner/founder bio
- Brand values and positioning
- "About us" content

#### Services & Products
- Full service menu with descriptions and prices
- Product catalog
- Packages, bundles, and add-ons
- Seasonal offerings or specials

#### Policies & Procedures
- Cancellation and rescheduling policy
- Return and exchange policy
- Payment methods accepted
- Privacy policy summary
- Emergency or safety procedures

#### Hours & Location
- Business hours (including holidays)
- Physical address and parking information
- Multiple location details if applicable
- Virtual or delivery service information

#### Team & Expertise
- Staff bios and specialties
- Certifications and credentials
- Who handles what

#### FAQs
- Top 10–20 questions customers actually ask
- Answers written the way the agent should speak them
- Include "I don't know" fallbacks for edge cases

#### Integrations reference
- Booking system instructions (how to schedule)
- Loyalty program details
- Referral or membership program

---

### Knowledge Library best practices

**Write for voice, not print.** The agent reads snippets and speaks them. Short, direct sentences work better than long paragraphs. Instead of: *"Our cancellation policy requires 24 hours advance notice for all appointments to avoid a fee,"* write: *"Cancellations need at least 24 hours notice. Same-day cancellations may be charged a fee."*

**One topic per document.** Don't mix the cancellation policy with the price list. Separate documents improve retrieval accuracy.

**Use the business's real voice.** If the brand is warm and informal, write the FAQs that way. If it's formal and professional, match that. The agent will speak in the same register as the knowledge it draws from.

**Keep it current.** Outdated hours, prices, or policies erode trust immediately. Schedule a quarterly review.

**Mark private knowledge.** Documents can be flagged as private (owner-only) or public (accessible to customer-facing agents). Sensitive business data should be private.

---

### Business profile ingestion

The platform can auto-populate the knowledge base using the Google Places business profile. This ingests:
- Business name and category
- Address, phone, website
- Hours of operation
- Customer reviews and ratings
- Place photos

This is the fastest starting point for any business that exists on Google Maps. After ingestion, the owner adds the deeper knowledge (services, policies, team) that Google doesn't have.

---

## Part 2: Skills (Tools)

Skills are the executable capabilities the agent can use mid-conversation. They are the bridge between knowledge and action.

### Available skills

| Skill name | What it does | Mode availability |
|------------|-------------|-------------------|
| `query_knowledge_library` | Searches the knowledge base for relevant snippets | RECEPTIONIST, SALES, SUPPORT, MANAGER, RESEARCH |
| `get_business_details` | Returns the business profile (name, address, hours, contact) | CONCIERGE+ |
| `get_booking_and_pricing_info` | Returns the business website URL for live pricing or booking | RECEPTIONIST+ |
| `search_local_business` | Finds and displays nearby businesses on an interactive map | SALES, RESEARCH |
| `request_manual_input` | Opens a form in the canvas for high-accuracy data entry (addresses, emails) | CONCIERGE+ |
| `confirm_location_selection` | Confirms a location the user picked from the UI | CONCIERGE+ |
| `get_business_reviews` | Fetches customer review data and ratings | MANAGER, RESEARCH |
| `get_business_intelligence` | Returns business intelligence and analytics data | MANAGER, RESEARCH |
| `get_place_ui_data` | Returns minimal place metadata for the map/UI widget | RESEARCH+ |
| `generate_quote` | Creates a quote or estimate from the product catalog | SALES |
| `apply_discount` | Validates and applies a discount code | SALES |
| `stripe_checkout` | Provides a secure payment link | CASHIER |
| `send_onboarding_email` | Sends a welcome or onboarding email to a new customer | CASHIER |
| `show_canvas` | Pushes structured UI content to the shared canvas | All modes (agent-initiated) |
| `search_crm` | Silently identifies returning customers | RECEPTIONIST+ |

---

### The `show_canvas` skill — the shared canvas tool

`show_canvas` is unique — it allows the agent to push content to the visual canvas that the caller is looking at. This creates a synchronized voice + visual experience.

**Use cases:**
- Show a map when giving directions
- Display a menu when describing food options
- Show a booking form when scheduling
- Present a QR code when routing to payment
- Display an image or product card during sales

**When the agent should use it:**
- When the verbal answer is too complex (a full menu, an address, a multi-step process)
- When a visual would genuinely help (directions, product visuals, forms)
- As a handoff: "I've pulled up the booking form on screen — you can fill in your details there."

**What you tell owners:** _"Show Canvas is how the agent controls the screen while you're in a voice conversation. Instead of reading out a long list, the agent can say 'I've pulled that up for you' and display it visually. It makes the experience feel much more like talking to a real human concierge."_

---

### Skills vs. Knowledge

| Question | Use knowledge library | Use a skill |
|----------|----------------------|-------------|
| "What are your hours?" | ✓ | — |
| "How much is a haircut?" | ✓ | — |
| "Book me an appointment" | — | `get_booking_and_pricing_info` or intake form |
| "What's nearby?" | — | `search_local_business` |
| "I want to pay" | — | `stripe_checkout` |
| "I need to type my address" | — | `request_manual_input` |

---

### How to guide knowledge setup in a session

Walk the owner through this sequence:

1. *"Let's start with what your agent absolutely needs to know. What do customers ask you most often?"* → This builds the FAQ foundation.
2. *"Do you have a service menu or price list? Even a rough one?"* → Upload or dictate it.
3. *"What are your business hours and cancellation policy?"* → Capture these exactly.
4. *"Is there anything the agent should never tell a customer — sensitive business information, trade secrets?"* → Flag these as private.

After the knowledge base is populated, confirm which skills are active and whether they match the Operational Mode.

---

### Common knowledge library mistakes to catch

- Empty knowledge base + customer-facing agent → The agent will hallucinate or say "I don't know" to everything. Upload the basics before go-live.
- Price list is outdated → Agent will quote wrong prices. Build in a quarterly review habit.
- Missing cancellation policy → One of the top 3 most-asked questions for service businesses. Always add it.
- Public and private not distinguished → Sensitive business data may be served to customers. Review visibility settings.
- No FAQ document → Knowledge works best when you anticipate the questions. Don't rely on the agent to infer.
