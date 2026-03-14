# 02 — DISC Character System

DISC is the **personality layer** of an agent. It controls tone, pacing, assertiveness, and emotional warmth. It does not change what the agent is allowed to do — that's the Operational Mode. DISC changes *how* the agent sounds and behaves in every interaction.

Think of it as the difference between hiring two receptionists with the same job description but different personalities.

---

## The four dimensions

Each dimension is a 0–100 slider. They are independent — you can mix and match. The compiled system prompt translates these numbers into internalized behavioral narrative, not a list of rules the agent reads out loud.

### D — Dominance (0–100)
**What it controls:** Assertiveness, directness, decisiveness, pace.

| Range | Behavior |
|-------|----------|
| 0–20 | Hesitant, defers to the customer, avoids conflict, very non-directive |
| 21–40 | Mild assertiveness, comfortable with ambiguity, measured pace |
| 41–60 | Balanced — can lead when needed, comfortable being asked directly |
| 61–80 | Confident, task-oriented, cuts to the point quickly |
| 81–100 | Very direct, drives the conversation, short on pleasantries, results-focused |

**When to go high-D (70+):** Call centers, sales agents, emergency dispatch, fast-paced logistics.  
**When to go low-D (0–30):** Customer care, medical offices, grief or crisis contexts, senior audiences.

**Voice effect:** High-D agents feel efficient and authoritative. Low-D agents feel approachable and safe.

---

### I — Influence (0–100)
**What it controls:** Enthusiasm, warmth, conversational energy, storytelling.

| Range | Behavior |
|-------|----------|
| 0–20 | Flat, matter-of-fact, no energy investment in rapport |
| 21–40 | Polite but professional, minimal small talk |
| 41–60 | Naturally friendly, occasional light conversation |
| 61–80 | Warm and enthusiastic, good at building rapport |
| 81–100 | Very expressive, animated, relationship-first, loves to engage |

**When to go high-I (70+):** Salons, spas, hospitality, retail, wedding venues, lifestyle brands.  
**When to go low-I (0–30):** Legal offices, financial services, compliance-heavy environments.

**Voice effect:** High-I agents feel like a friendly person who's glad you called. Low-I agents feel like a professional who respects your time.

---

### S — Steadiness (0–100)
**What it controls:** Patience, consistency, empathy, resistance to urgency.

| Range | Behavior |
|-------|----------|
| 0–20 | Adapts quickly, moves fast, can feel impatient under volume |
| 21–40 | Responsive but efficient |
| 41–60 | Naturally even-keeled, consistent across interactions |
| 61–80 | Patient, supportive, handles frustrated callers gracefully |
| 81–100 | Very steady, never rushed, absorbs upset without escalating |

**When to go high-S (70+):** Medical, mental health, elder care, customer recovery, children's services.  
**When to go low-S (0–30):** High-urgency environments (emergency services, trading floors, competitive sales).

**Voice effect:** High-S agents feel steady and safe. Low-S agents feel fast and responsive.

---

### C — Conscientiousness (0–100)
**What it controls:** Accuracy, attention to detail, procedural adherence, systematic thinking.

| Range | Behavior |
|-------|----------|
| 0–20 | Casual, moves on gut feeling, not focused on precision |
| 21–40 | Gets the job done without sweating details |
| 41–60 | Checks work, follows procedure when it matters |
| 61–80 | Accuracy-focused, likes confirmation, methodical |
| 81–100 | Very precise, checks and double-checks, protocol-first |

**When to go high-C (70+):** Medical, legal, accounting, compliance, aviation, pharmacies.  
**When to go low-C (0–30):** Casual retail, entertainment, creative services.

**Voice effect:** High-C agents feel reliable and exact. Low-C agents feel relaxed and spontaneous.

---

## DISC profiles in practice

### Profile: The Warm Closer (Sales Agent)
```
D: 65  I: 75  S: 40  C: 35
```
Confident, enthusiastic, pushes toward a decision, but doesn't dwell on details. Great for retail, service upsells, and outbound sales calls.

### Profile: The Steady Receptionist (Medical / Legal)
```
D: 30  I: 45  S: 80  C: 70
```
Patient, accurate, doesn't rush. Callers feel heard and handled carefully. Great for intake at professional service firms.

### Profile: The Efficient Concierge (Airport / Hotel)
```
D: 55  I: 60  S: 65  C: 40
```
Friendly and clear, gets you where you need to go quickly. Doesn't over-explain. Good at handling volume.

### Profile: The Trusted Advisor (Financial / Insurance)
```
D: 50  I: 40  S: 70  C: 85
```
Calm, precise, methodical. Builds trust through accuracy, not enthusiasm.

### Profile: The Energetic Brand Ambassador (Lifestyle / Wellness)
```
D: 40  I: 85  S: 60  C: 30
```
Enthusiastic, relationship-focused, memorable. Great for spas, salons, gyms, and wellness brands.

### Profile: The Safety-First Operator (Emergency / Dispatch)
```
D: 80  I: 20  S: 30  C: 75
```
Direct, precise, no-nonsense. Keeps interactions short and action-oriented. Never wastes a word.

---

## How to recommend DISC values in a session

**Ask the owner three questions:**

1. *"When a customer calls, do you want the agent to feel warm and friendly, or efficient and to-the-point?"* → This maps to the I/D axis.
2. *"Does your business deal with stressed or upset customers regularly?"* → If yes, push S higher.
3. *"Is accuracy more important than speed in your interactions?"* → If yes, push C higher.

**Then translate their answer directly:**

- Warm → `I: 70+`
- Efficient → `D: 60+, I: 30–50`
- Stressed customers → `S: 70+`
- Accuracy-first → `C: 70+`

---

## DISC and voice selection interaction

The eight available voices have natural fits with certain DISC profiles:

| Voice | Gender | Feel | DISC fit |
|-------|--------|------|----------|
| Kore | Female | Warm, professional | High-S, High-I |
| Aoede | Female | Articulate, expressive | High-I, moderate-D |
| Leda | Female | Calm, precise | High-C, High-S |
| Zephyr | Female | Light, energetic | High-I |
| Puck | Male | Friendly, conversational | High-I, moderate-S |
| Charon | Male | Deep, authoritative | High-D |
| Fenrir | Male | Direct, confident | High-D, moderate-C |
| Orus | Male | Steady, measured | High-S, High-C |

Recommend the voice *after* setting DISC so it feels consistent. A high-D profile with a soft voice feels mismatched.

---

## The radar chart

The DISC panel shows a radar chart with four axes. When you describe it to an owner:

- A wide, full chart = high energy, high expressiveness, high everything (rare — usually too much)
- A sharp spike in one direction = a specialist agent with a strong personality
- A balanced, moderate chart = a generalist agent, consistent but not memorable in any particular way

Most business agents should have one or two dominant dimensions that reflect the nature of the work.

---

## Common mistakes to catch

- All sliders at 50 (the default) → Agent feels like nothing. Push the dimensions that match the business.
- Very high-D with very high-S → These are partially in tension. Acceptable, but the agent can feel inconsistent.
- High-I for a legal or medical office → The agent may feel too casual for the context. Lower I, raise C.
- Low-S for customer recovery roles → The agent will feel impatient when callers are upset.
