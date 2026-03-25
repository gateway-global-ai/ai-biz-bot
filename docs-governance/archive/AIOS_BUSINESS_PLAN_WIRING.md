# AI OS business plan — implementation wiring

Version: 1.1  
Status: Traceability (source: [`user_uploads/new/AIOS_BUSINESS_PLAN.md`](../user_uploads/new/AIOS_BUSINESS_PLAN.md) — working notes; this governance doc is the wiring map)

## Purpose

The business plan describes **agents**, **Safe Mode**, **phased rollout**, and **dynamic menu generation** at a strategic level. This document maps those concepts to **governed repo artifacts** and lists **gaps** so engineering work is explicit—not “lost in uploads.”

## Synergy with intent-driven menus

Do **not** treat “dynamic menu tree” and “intent-first canvas” as competing UX.

| Layer | Role |
|-------|------|
| **Intent-first chrome** | [INTENT_DRIVEN_CANVAS_SPEC.md](./INTENT_DRIVEN_CANVAS_SPEC.md) — welcome + prompt **above** the menu so the system asks *why* the user is there before they hunt categories. |
| **OS menu (same surface)** | [`useOSMenu`](../client/src/hooks/useOSMenu.ts) → [`OSMenuList`](../client/src/components/os/OSMenuList.tsx) — actionable intents; today **code templates**, tomorrow **merged from `menuTree` + policies**. |
| **Presentation rules** | [`menuPresentationRules.ts`](../shared/menuPresentationRules.ts) — caps list length for UI/voice once menus are data-driven (split, top-N for TTS). |

Together: **intent frames the moment; menus execute routing; rules keep lists speakable.** Implementation order matches §Recommended wiring order below (persist tree → apply rules → policy).

---

## Traceability matrix

| Business plan concept | Where it lives in product / code | Gap / next wiring |
|----------------------|----------------------------------|-------------------|
| **Agent manifest** (capabilities, permissions, tools) | [`docs-governance/AGENT_POLICY_REGISTRY.md`](./AGENT_POLICY_REGISTRY.md), agent rows + `structured_controls` / skills on `site_configs` | No single JSON “manifest file” per agent in DB; policy is split across schema + YAML. **Optional:** manifest export/import for review. |
| **Safe Mode / Phase 1 Concierge** | [`docs-governance/SAFE_MODE_CONTRACT.md`](./SAFE_MODE_CONTRACT.md), [`server/config/operationalModes.ts`](../server/config/operationalModes.ts) | Flight-check items in plan §4 align with demo checklists; **automated** readiness score not wired. |
| **Phased rollout** (Concierge → Receptionist → Operational) | Operational modes + agent roles; onboarding steps in [`VIEW_REGISTRY.md`](./VIEW_REGISTRY.md) | **Explicit phase** flag on `site_configs` or workspace state for GTM reporting—verify vs `workspaceState`. |
| **Multi-level menu tree** (L0–L3) | Onboarding `step_4_menu_tree` contract in [`VIEW_REGISTRY.md`](./VIEW_REGISTRY.md); e-commerce menus in [`server/routes/menu-routes.ts`](../server/routes/menu-routes.ts) (food/menu **catalog**) | **OS customer menu** (`useOSMenu`) is **static templates** + skill flags—not yet generated from owner-built `menuTree` JSON. |
| **Dynamic menu rules** (>5 split, top 3 for voice, “More”) | [`shared/menuPresentationRules.ts`](../shared/menuPresentationRules.ts) — presentation constants + helpers | **Wire** `useOSMenu` / voice prompt builder to call `takeTopNForVoicePrompt` / `splitTopLevelIfNeeded` when menu is sourced from DB. |
| **Intent-first idle** (QR → welcome → intent) | [`INTENT_DRIVEN_CANVAS_SPEC.md`](./INTENT_DRIVEN_CANVAS_SPEC.md), `IntentFirstIdleChrome` — **paired** with `OSMenuList`, not replaced | **Returning vs new** user signals still session-level; not full Nova coupling in idle. |
| **Logical route menu** | [`os-core/.../resolveMenu.ts`](../os-core/src/os-core/control-plane/menu-resolver/resolveMenu.ts), [`LOGICAL_ROUTE_REGISTRY.md`](./LOGICAL_ROUTE_REGISTRY.md) | OS-core resolver is **route-based**; business plan **vertical templates** (restaurant vs retail) are not merged into `useOSMenu`. |
| **GPT Actions / external API** | [`docs-governance/GPT_ACTIONS_BUSINESS_RESONANCE.md`](./GPT_ACTIONS_BUSINESS_RESONANCE.md), `GET /openapi/business-resonance-gpt.json` | Custom GPT calls **you**; not reverse. |

---

## Recommended wiring order

1. **Persisted menu tree → runtime** — When onboarding produces `menuTree` (Step 4), persist and expose a **read API** for the client; map nodes to `OSMenuItem` shape (label, icon, `viewId` / `action`).
2. **Presentation rules** — Apply [`menuPresentationRules`](../shared/menuPresentationRules.ts) when rendering lists or TTS prompts so “top 3 + More” is consistent.
3. **Safe Mode enforcement** — Keep mutations behind policy; align flight-checks in the plan with [`SAFE_MODE_CONTRACT.md`](./SAFE_MODE_CONTRACT.md) checks in chat/tool paths.
4. **Phase label** — Single field or metadata key for “Phase 1/2/3” for support and analytics (no change to voice hot path).

---

## Related

- [INTENT_DRIVEN_CANVAS_SPEC.md](./INTENT_DRIVEN_CANVAS_SPEC.md)  
- [VIEW_REGISTRY.md](./VIEW_REGISTRY.md) — `intent_entry`, onboarding menu tree  
- [SKILL_REGISTRY.md](./SKILL_REGISTRY.md) — capability gates for menu items  
