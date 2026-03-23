# Clear Voice AI OS — Getting Started Guide

> **Status:** Authoritative onboarding document. Source: `user_uploads/new/new_3_14/start/deployment_guide.md` + system wiring annotations.
> Surfaced in the AI OS as the `Getting Started` manager menu view (`viewId: getting-started-view`).

---

## Introduction

Clear Voice AI OS is not a chatbot platform.

It is a governed AI operating system designed to safely deploy AI agents inside real businesses.

Unlike traditional AI assistants that attempt to answer everything, Clear Voice AI agents operate within defined knowledge, permissions, and actions.

This prevents hallucination and ensures reliable outcomes.

The system introduces a structured deployment process where every AI agent must pass a readiness flight check before going live.

---

## Why Voice AI Is Different

Most AI interfaces rely on text input and loosely structured conversations.

Voice AI introduces new challenges:

- Real-time interaction
- Higher expectation of accuracy
- Task execution rather than information retrieval

Because of this, Clear Voice AI operates inside a governed runtime environment where:

- Actions are defined
- Menus are structured
- Knowledge is verified
- Fallback routes are configured

This ensures the agent always knows what it can do and what it cannot do.

---

## The Clear Voice AI Deployment Model

Every business follows the same structured deployment phases.

```
Phase 1  →  Voice Concierge (Safe Mode)     Free — all accounts
Phase 2  →  Receptionist Agent              $50/mo Voice plan
Phase 3  →  Operational AI Agents           Enterprise
```

---

## Phase 1 — Voice Concierge (Safe Mode)

This is the foundation phase and the most important step.

**The goal is not to show everything the AI can do. The goal is to demonstrate governance and reliability.**

Safe Mode agents operate with narrow guardrails. They only perform clearly defined tasks and redirect users when needed. This allows businesses to understand how the system behaves before expanding capabilities.

### Phase 1 Objectives

Demonstrate:

- Structured AI behavior
- Controlled responses
- Zero hallucination environments
- Proper routing to static resources

Enterprise buyers care less about how much AI can do. **They care about what it will never do wrong.**

### Phase 1 Setup Process

| Step | Action | System Location | Automated |
|---|---|---|---|
| 1 | Create your account | `/agents` signup | Manual |
| 2 | Locate your business | Search by name or address | Manual → auto-sync |
| 3 | Confirm business data | `Brand Governance > Brand Profile` | Owner review |
| 4 | Define routing paths | `Agents > Routing` | Owner input |
| 5 | Configure Voice Concierge persona | `Agents > Identity` | Owner input |
| 6 | Test Safe Mode | Live PTT test in agent canvas | Owner tests |
| 7 | Flight Check + Approve | `Brand Governance > Pre-Flight` | Owner approves |

#### Step 2 — Locate Your Business

Search for your business. If it exists on Google Maps, the system will sync:

- Business name
- Address and phone
- Hours of operation
- Website URL
- Service categories

If not on Google Maps, the platform creates a profile directly.

#### Step 4 — Define Routing Paths (Critical)

Before the AI can assist customers, it must know where to send them for actions it cannot perform directly.

Examples:

- Company website
- Online ordering system
- Booking platform
- Support page
- Online store

These become the **fallback routes** for the AI. If a customer asks "Can I book an appointment?" and the agent does not have calendar access, it says "Let me send you to our booking page" and routes. **This is not a failure — it is the correct governed behavior.**

An agent cannot go live without at least one fallback route defined.

#### Step 5 — Configure Voice Concierge Persona

Choose how the AI behaves:

- Friendly concierge
- Professional receptionist
- Hospitality host
- Customer service assistant

Define tone, style, and greeting behavior via the DISC profile sliders and ARCH communication window settings.

#### Step 6 — Test Safe Mode

The AI concierge will operate within strict governance rules. It will:

- Answer questions about the business
- Guide users through menus
- Route visitors to verified resources

It will **not** invent answers outside its knowledge.

#### Step 7 — AI OS Readiness Score and Flight Check

Before the agent goes live, the system computes a readiness score across four categories:

```
Agent Readiness
---------------
Knowledge:  ___% (business data, hours, service descriptions uploaded)
Routing:    ___% (fallback routes configured)
Brand:      ___% (brand profile fields completed, out of 15)
Tools:      ___% (voice configured; calendar/CRM if applicable)

Overall: [READY / NOT READY]
```

All categories must reach the threshold before "Approve & Go Live" becomes active.

### Why This Matters

Safe Mode demonstrates stability, trust, and reliability. This is the foundation businesses build on.

**This phase is free.** Create an account, complete the steps, test it. No payment required. All enterprise evaluations start here.

---

## Phase 2 — Receptionist Agent

Once Safe Mode is validated, the next step introduces structured actions.

Unlocked with the **Voice AI plan ($50/month)**.

New capabilities include:

- Scheduling appointments (calendar integrations)
- Answering common questions from a knowledge base
- Routing calls or messages
- Collecting and verifying customer information
- SMS confirmation and reminders
- CRM connections

The difference from Phase 1: **the agent can now take action, not just route.** It can complete a booking, not just send someone to a booking page.

Operational mode: `RECEPTIONIST` — intake and data collection, no complex resolution.

---

## Phase 3 — Operational AI Agents

Advanced agents gain access to business systems.

Examples:

- Booking systems
- Customer databases
- Verification services (Nova IDV)
- Payment systems

These agents perform real operational tasks, not just conversation.

Available modes at this phase:

| Mode | Role | What It Does |
|---|---|---|
| `SALES` | Sales Rep | Product lookup, quotes, cart — no payment capture |
| `CASHIER` | Cashier | Secure payment links, Stripe checkout |
| `CUSTOMER_SUPPORT` | Support Agent | Account access, resolution (requires OTP verification) |
| `MANAGER` | Manager | Reviews/approves decisions, oversight reporting |

Multi-agent swarm available (up to 10 agents per business), each governed independently with its own DISC profile, ARCH communication window, operational mode, and knowledge scope.

---

## The Digital Business Tree

Every AI agent navigates a structured operational map. This map is defined by the business owner in `Brand Governance > Sales Funnels`.

```
Level 0  →  Business Group
Level 1  →  Business Location
Level 2  →  Users / Teams
Level 3  →  Departments
Level 4  →  Actionable Items
```

### Example: Restaurant

```
Group:        Brand (e.g. "Harvest Kitchen")
Location:     Store #102
Departments:  Reservations | Ordering | Support
Actions:      Book table | Place order | Check hours
```

### Dynamic Menu System

Menus are automatically generated from the business tree. The agent presents relevant options based on the user's context and the owner's defined tree.

Example visual menu rendered in the canvas:

```
Reservations        Orders
📅 Book Table       🍔 Order Pickup
👥 Group Booking    🚗 Order Delivery

Information         Support
⏰ Hours            💬 Contact Support
📍 Directions
```

Menus can be customized by the business owner in `Brand Governance > Sales Funnels`.

---

## AI Agent Flight Check — Pre-Launch Validation

Before an AI agent goes live, the system performs a flight check. **The agent cannot activate until all required components are verified.**

### Flight Check Categories

| Category | Checks |
|---|---|
| **Knowledge** | Business details, services, hours, location loaded |
| **Routing** | At least one fallback route configured (website, booking, ordering, support) |
| **Tools** | Required tools for the operational mode are connected |
| **Permissions** | Agent allowed actions match the operational mode |
| **Menu Structure** | Every menu path leads to a valid action or route — no dead ends |
| **Brand** | Brand profile completionScore ≥ 80 (12 of 15 fields) |
| **Testing** | Owner has tested greeting, question handling, and routing behavior |

Once the flight check passes, the agent becomes **Live Mode Enabled**.

---

## Agent Capability Manifest

Every agent has a capability manifest — a governed declaration of what it is allowed to do. This is defined in the agent policy registry and surfaced in `Agents > Identity`.

Example manifest (Voice Concierge, Safe Mode):

```yaml
agent: Voice Concierge
mode: SAFE
permissions:
  - answer_questions
  - route_to_links
  - guide_menus
tools:
  - google_maps_lookup
  - place_data_read
fallback_routes:
  - website
  - booking_page
```

The manifest is reviewed by the owner during Phase 1 setup. It cannot be changed without going through the flight check again.

---

## Why This Model Wins

Most AI tools deploy like this:

> "Turn on chatbot."

Clear Voice AI deploys like this:

> Build a governed AI operating environment.

Which means:

- Safer AI with defined boundaries
- Structured capabilities that scale
- Enterprise trust through transparency
- Auditable interactions logged as revenue events

---

## Next Steps After Getting Started

1. **Complete Brand Governance** — fill out your brand profile, define your offer stack, and set up your sales funnel (`Brand Governance` menu)
2. **Upgrade to Voice AI plan** — unlock Phase 2 capabilities (calendar, CRM, messaging)
3. **Provision additional agents** — each with its own role, DISC profile, and knowledge scope (`Agents` menu)
4. **Generate your Deep Research prompt** — for Enterprise customers, generate a structured ChatGPT analysis of your brand, competitors, and ICP (`Brand Governance > Brand Profile`)

---

*Clear Voice AI OS — Governed AI Infrastructure for Real Businesses.*
