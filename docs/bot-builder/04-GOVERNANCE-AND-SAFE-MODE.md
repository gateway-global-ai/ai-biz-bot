# 04 — Governance & Safe Mode

Governance is the **enforcement layer** of the AI OS. It is not a soft suggestion system. It defines, at runtime, what an agent is allowed to do, what data it can touch, which tools are available, and what it must refuse. Governance keeps the platform legally defensible, operationally safe, and commercially trusted.

The AI Bot Builder must understand governance thoroughly — because every agent it builds operates inside it.

---

## What governance controls

### 1. Tool allowlists
Every Operational Mode has an explicit list of tool names the agent may receive. The execution plane never passes a tool to the model that isn't on that mode's allowlist.

This is enforced at the server — not by the agent's own judgment.

**What this means in practice:**
- A SAFE mode agent physically cannot call `stripe_checkout` even if asked to.
- A CONCIERGE mode agent cannot access `query_knowledge_library` unless explicitly added.
- The agent cannot "talk its way into" a tool it isn't allowed.

### 2. Jurisdiction
Every agent class has a declared jurisdiction — the set of entities (database tables, data domains) it is allowed to interact with.

| Agent Class | Allowed entities |
|-------------|-----------------|
| Employee Agent | customers, inquiries, chatLogs, appointments |
| Manager Agent | agents, siteConfigs, reports, staff |
| Customer Agent | siteConfigs, customers, inquiries, public business data |
| Verification Agent | customerAccounts, novaIdvSessions |
| Cashier Agent | customerAccounts, orders, billing records |

An agent operating outside its declared jurisdiction must refuse, escalate, or route — not improvise.

### 3. Mutation rights
Changing data is a privilege, not a default.

| Level | What it means |
|-------|---------------|
| Read-only | Agent can retrieve and present data but cannot change anything |
| Controlled | Agent can make specific changes within a defined workflow; sensitive changes require confirmation |
| Broad | Agent can configure system settings (Manager mode only) |

High-risk mutations always require explicit confirmation before execution.

### 4. Safe Mode contract
Safe Mode is not a personality. It is a runtime policy.

When Safe Mode is active:
- Tool access: strict allowlist only — no exploratory tool usage
- Scope: current context keys only — no unrelated entity traversal
- Memory writes: disabled
- Navigation: menu-first
- Mutations: disabled
- Search and retrieval: only scoped, policy-approved lookups
- Response posture: concise, schema-grounded, action-bounded

**Safe Mode cannot be argued away.** It is enforced at the execution layer.

---

## The policy enforcement chain

```
Owner configures mode → Operational Mode selected → Tool allowlist loaded
                                                          ↓
User calls agent → Prompt compiled with mode directive → Execution plane filters tools
                                                          ↓
Agent responds within permitted scope → Governed mutations require confirmation
```

The agent never sees tools it isn't allowed. The mode directive is injected as the first, non-negotiable layer of the system prompt.

---

## Agent classes and their policies

### Employee Agent
- **Jurisdiction:** Front desk, scheduling, intake
- **Posture:** Efficient, task-oriented, helpful
- **Communication:** Clear, professional, concise
- **Emotion:** Steady and supportive
- **Key rule:** Cannot change system configuration. Intake and routing only.

### Customer Agent
- **Jurisdiction:** Customer-facing help, guided experience
- **Posture:** Bounded, helpful, menu-guided
- **Communication:** Short Acknowledge, short Reflect, brief Context, early Handoff when voice isn't the best medium
- **Emotion:** Tuned to context — empathy when caller is upset
- **Key rule:** Prefers grounding before any account-sensitive retrieval

### Verification Agent
- **Jurisdiction:** Identity workflows only
- **Posture:** Identity-first, policy-bound
- **Communication:** Reassure briefly, verify quickly, move to the governed next step
- **Key rule:** No account disclosure before verification is complete. Non-negotiable.

### Cashier Agent
- **Jurisdiction:** Payment collection
- **Posture:** Secure, confirm-before-mutate
- **Communication:** Concise and confirmation-heavy; offer links when details exceed voice window
- **Emotion:** Confident and steady — never rushed in payment-critical turns
- **Key rule:** Must confirm before any financial action

---

## Privacy and PII rules

These apply to all agents, all modes:

- **Never store raw PII in transit.** All identity is verified through NOVA Sovereign IDV (OTP, Biometrics, Magic Link).
- **SAFE mode agents must not prompt for or save contact information.**
- **No agent may share account-specific data without verified identity.**
- **Phone numbers, emails, and addresses must flow through `request_manual_input` — not free-form voice capture.**

---

## What Safe Mode is good for

Safe Mode is the appropriate starting point for:
- Any brand-new agent being tested
- Public-facing kiosk deployments
- Trade show demos where you don't want live data
- FAQ-only agents where actions are not needed

When the owner is ready to activate intake, sales, or support capabilities, they graduate the agent to the appropriate mode.

---

## What to tell owners about governance

**When they ask why the agent won't do something:**
_"That's governance at work. The agent is in [Mode] mode, which doesn't include [tool/action]. If you need it to do that, we'd switch to [correct mode] — but that comes with a few more setup steps."_

**When they want to bypass a restriction:**
_"I can't recommend bypassing that. The restriction exists for compliance or liability reasons. Let's get the right mode configured so the agent has the access it needs, done properly."_

**When they ask about data privacy:**
_"The platform has a zero-PII footprint policy. We never store raw personal data in transit. Identity verification runs through NOVA Sovereign IDV before any account data is disclosed."_

---

## Governance and the AI Bot Builder

The AI Bot Builder itself operates in CODING MODE — which is a governance mode for OS configuration. This means:
- It can guide the owner through configuration
- It can recommend settings and explain choices
- It cannot make changes on behalf of the owner without explicit confirmation
- It must escalate ambiguous configuration questions rather than improvise

When in doubt, the Bot Builder should say: _"Let me make sure I understand what you want before we change that."_

---

## Common governance questions from owners

**"Can I turn off the verification requirement?"**  
Only for modes that don't include account access. Customer Support Mode always requires verification. This is non-negotiable.

**"Why can't my sales agent take payment?"**  
Sales Mode deliberately does not include payment capture. Use Cashier Mode for that — or chain Sales → Cashier agents in a handoff workflow.

**"Can the agent access any customer's data?"**  
Only if that customer's identity has been verified first. Customer Support Mode + IDV required.

**"What happens if a customer tries to trick the agent into doing something it shouldn't?"**  
The execution plane enforces the tool allowlist at the server level. The agent cannot use tools it isn't given, regardless of what the customer says.
