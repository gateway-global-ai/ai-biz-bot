# 03 — ARCH Communication Protocol

ARCH is the **dialogue structure layer** of an agent. Where DISC controls personality, ARCH controls the *shape* of every spoken turn. It determines how the agent opens a response, how much it reflects and contextualizes, and when it passes the turn back to the caller or hands off to a different medium.

ARCH is not a list of rules. It is a set of internalized conversation mechanics compiled into the agent's behavior at runtime.

---

## The four ARCH dimensions

Each dimension is a 0–100 slider. Together they define the agent's conversational DNA for every single response.

### A — Acknowledge (0–100)
**What it controls:** How much the agent validates and recognizes what was said before responding.

| Range | Behavior |
|-------|----------|
| 0–30 | Moves immediately to substance. No preamble. "The hours are 9 to 5." |
| 31–60 | Natural pause of recognition before responding. "Got it — let me pull that up." |
| 61–100 | Strongly validates before responding. "Absolutely, I understand — that's important to get right. Here's what I can tell you..." |

**High Acknowledge (70+) use cases:** Customer care, medical intake, emotional contexts, high-D customers who need to feel heard.  
**Low Acknowledge (0–30) use cases:** High-volume call centers, emergency services, when speed matters more than warmth.

**What you say to the owner:** _"Acknowledge controls how much the agent validates you before answering. Low values feel efficient. High values feel empathetic."_

---

### R — Reflect (0–100)
**What it controls:** How much the agent paraphrases or confirms what it heard before adding its own content.

| Range | Behavior |
|-------|----------|
| 0–30 | Responds directly. Trusts the caller to clarify if misunderstood. |
| 31–60 | Occasionally confirms understanding on complex or ambiguous requests. |
| 61–100 | Consistently paraphrases: "So you're looking for a haircut appointment on Saturday, correct?" |

**High Reflect (70+) use cases:** Complex service bookings, medical intake, anywhere misunderstandings are costly.  
**Low Reflect (0–30) use cases:** Simple FAQ agents, fast routing agents, short-turn interactions.

**Reflect interacts with accuracy.** High Reflect reduces errors in intake and booking. It adds a slight turn length cost but prevents costly do-overs.

---

### C — Context (0–100)
**What it controls:** How much background, reasoning, or "why" the agent provides in its response.

| Range | Behavior |
|-------|----------|
| 0–30 | Concise. Gives the answer only. No explanation. |
| 31–60 | Provides useful context when it helps, without over-explaining. |
| 61–100 | Adds background, meaning, and connection. Explains the "why," not just the "what." |

**High Context (70+) use cases:** Advisory agents (financial, legal, health coaching), complex product explanations, agents where the owner wants customers to understand, not just act.  
**Low Context (0–30) use cases:** Simple routing agents, point-of-sale, any interaction where speed is the primary value.

**Context directly affects response window length.** High Context agents naturally speak longer. Balance this with the Response Window setting.

---

### H — Handoff (0–100)
**What it controls:** How proactively the agent guides toward the next step, question, or medium.

| Range | Behavior |
|-------|----------|
| 0–30 | Lets the caller lead. Responds; does not push. |
| 31–60 | Occasionally offers a next step or question. |
| 61–100 | Always closes each turn with a guiding question, next step, or transition. |

**High Handoff (70+) use cases:** Sales agents (driving toward booking/purchase), intake flows (collecting fields one at a time), any agent with a defined task order.  
**Low Handoff (0–30) use cases:** Information-only agents, agents serving professionals who know what they want.

**Handoff is what prevents dead-end conversations.** Without it, callers often don't know what to do next after the agent answers.

---

## Response Window (5–60 seconds)

The Response Window is the **governance parameter for spoken turn length**. It tells the agent how long it should aim to speak per turn.

| Setting | Use case | Voice feel |
|---------|----------|------------|
| 5s | Emergency dispatch, crisis lines | One sentence per turn — pure efficiency |
| 10s | High-volume call center | Very short, action-oriented |
| 15s | Concierge routing | Quick acknowledgement + direction |
| 20s | Standard business agent (default) | Balanced — answer + brief context |
| 30s | Service advisor, sales | Room for explanation and a closing push |
| 45s | Financial or legal advisor | Full explanation before handoff |
| 60s | Coaching, consulting, onboarding | Deep advisory — use sparingly |

**The Response Window is compiled into the system prompt as a machine-native directive**, not vague guidance. The agent receives explicit instructions like: _"Your spoken responses must target 20 seconds or fewer. Be direct and efficient."_

---

## Preset profiles

The panel offers four preset buttons. Use these as starting points, then fine-tune:

| Preset | A | R | C | H | Window | Best for |
|--------|---|---|---|---|--------|----------|
| Emergency | 20 | 20 | 10 | 80 | 5s | Dispatch, crisis, 911-adjacent |
| Concierge | 70 | 50 | 30 | 80 | 15s | Hotel, airport, lobby routing |
| Standard | 65 | 55 | 50 | 60 | 20s | Most business agents |
| Advisory | 75 | 70 | 80 | 50 | 45s | Financial, legal, coaching |

---

## ARCH and DISC interaction

ARCH and DISC work together. The combination determines the full voice personality.

Examples:
- High-D DISC + Low Acknowledge ARCH → Very direct, no preamble. Feels assertive, efficient.
- High-I DISC + High Acknowledge ARCH → Very warm, validates warmly, feels relationship-driven.
- High-S DISC + High Acknowledge + High Reflect → The steady, empathetic listener. Perfect for care contexts.
- High-C DISC + High Reflect + Low Context → Accurate and concise. Confirms it heard right, gives the answer cleanly.

**Always configure DISC before ARCH.** The character must be established first; the dialogue mechanics layer on top.

---

## Emotion interaction

The ARCH windows interact with emotional tone.

- An **upbeat or energized** emotional profile makes high-Acknowledge feel enthusiastic rather than apologetic.
- When a **caller is upset**, insufficient Acknowledge and Reflect makes the agent seem dismissive — even if the answer is correct.
- A **calm emotional profile** can make a fast Handoff feel supportive rather than rushed.

The recommended compilation order: **Role → Emotion → DISC → ARCH**. Each layer changes how the next is interpreted.

---

## The communication window rule

> If the answer cannot fit cleanly inside the governed Response Window, the agent should:
> 1. Give a short, bounded verbal response
> 2. Briefly explain the switch
> 3. Hand off to a better medium (link, SMS, UI view, another agent)

This is governance by design. ARCH is not about making agents talk more — it is about making them know *when to stop talking* and use the right channel instead.

---

## How to configure ARCH in a session

Ask the owner three questions:

1. *"When a customer calls and explains their situation, should the agent acknowledge what they said before answering, or just answer immediately?"* → Maps to Acknowledge.
2. *"Is it important for the agent to confirm what it heard before acting?"* → Maps to Reflect.
3. *"Should the agent always guide the caller toward the next step, or let them lead?"* → Maps to Handoff.

Then set the Response Window:
- *"How long should the agent typically speak in a single turn? A quick 15-second routing agent? A 30-second sales pitch? A 45-second advisory explanation?"*

---

## Common mistakes to catch

- Very high Context (80+) with a 20s Response Window → The agent will feel rushed or cut off. Increase the window or lower Context.
- Low Handoff on a sales or intake agent → Callers reach the end of an answer and don't know what to do next.
- Low Acknowledge on a customer care or complaint-handling agent → Agent sounds dismissive even when its answers are accurate.
- All ARCH sliders at 50 → Agent has no conversational identity. Pick a profile that fits the business.
