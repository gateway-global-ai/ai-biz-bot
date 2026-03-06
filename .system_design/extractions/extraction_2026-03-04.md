# Clean Room Extraction Report — 2026-03-04

**Source:** `_legacy_archive/presentation/gateway-global-ai-_-technical-performance-report.zip`  
**Quarantine:** `/tmp/_quarantine_extraction` (incinerated after report)  
**Purpose:** Investor demonstration UI framework; documentation only. No merge of routing, WebSocket, or Gemini Live logic.

---

## 1. TypeScript Interfaces

### SectionProps / Laureate (types.ts)

```ts
export interface SectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export interface Laureate {
  name: string;
  image: string;
  role: string;
  desc: string;
}
```

### Message (DemoAgent – document only; do not merge API calls)

```ts
interface Message {
  id: number;
  role: 'user' | 'agent';
  content: string;
  reasoning?: string[];
  sources?: { title: string; url: string }[];
}
```

---

## 2. UI Blueprint

### Tailwind / Theme (from index.html inline config)

| Token | Value | Usage |
|-------|--------|--------|
| `gateway.dark` | `#0B1120` | Deep navy background |
| `gateway.primary` | `#3B82F6` | Primary blue (align with indigo-500 for Sovereign) |
| `gateway.light` | `#EFF6FF` | Light blue/white |
| `gateway.accent` | `#0EA5E9` | Sky blue |
| `gateway.text` | `#1E293B` | Slate text |
| `font-display` | Outfit | Headings |
| `font-sans` | Inter | Body |

**Sovereign mapping for rebuild:** Use `rounded-sui` (24px) for primary containers; `bg-slate-950` / `bg-[#0F172A]` for primary background; `border-indigo-500/20`, `backdrop-blur-xl` for glass cards. Replace `rounded-2xl` with `rounded-sui` on outer wrappers.

### Layout Patterns (App.tsx)

- **Nav:** Fixed top; `scrolled ? 'bg-white/90 backdrop-blur-md' : 'bg-transparent'`; logo + anchor links; mobile hamburger.
- **Hero:** Full viewport; dark bg (`bg-slate-900`); centered title + subtitle; badge “Prepared for: Pathos Communications plc”; CTA scroll to section.
- **Section:** `py-24`, `container mx-auto px-6`; two-column grid `grid-cols-1 lg:grid-cols-2 gap-16` where used.
- **Concept cards:** `bg-slate-50 rounded-2xl p-8 border border-slate-200` → rebuild as glass: `rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl`.

### Animation

- `framer-motion`: `initial={{ opacity: 0, y: 8 }}`, `animate={{ opacity: 1, y: 0 }}`, `transition={{ duration: 0.3, ease: "easeOut" }}`.
- Scroll-triggered bars: `whileInView={{ width: '95%' }}`, `transition={{ duration: 1, delay: 0.2 }}`.
- Smooth scroll: `scroll-behavior: smooth`, `scroll-padding-top: 100px`.

---

## 3. Component Inventory (Structure Only)

### Diagrams.tsx

- **ParadigmShiftChart:** Progress bars (Compliance vs Care/Loyalty); “From Workflows to Being.”
- **AgentStackDiagram:** 4-layer stack (Perception, Reasoning, Action, Learning) with icons.
- **TechArchitectureDiagram:** 2x2 grid (PostgreSQL, Vertex AI, MCP Orchestrator, Twilio MCP).
- **TrainingFocusChart:** List of shifts (Compliance→Loyalty, etc.) with arrows.
- **RoadmapDiagram:** Vertical timeline (Phase 1–3) with numbered circles.
- **ValueFrameworkChart:** Horizontal bars (Loyalty, Transparency, Proactivity).

**Use:** Reuse layout and copy patterns for Provisioning Matrix and S4 slides; do not import from quarantine (rebuild in app with Sovereign tokens).

### QuantumScene.tsx

- **NetworkScene:** Three.js Canvas; floating nodes + connection lines; fog `#0B1120`; blue palette. Optional for hero background.
- **CoreScene:** Icosahedron wireframe + solid; Stars. Optional for architecture section.

**Note:** Depends on `@react-three/fiber`, `@react-three/drei`, `three`. If not in main app, use CSS gradient or static visual instead.

### DemoAgent.tsx

- **Layout:** Header (logo, title “Nexus-7 Agent”, mode badge); scrollable chat area; message bubbles (user right, agent left); “Transparency Trace” expandable; grounding sources; text input + Send.
- **Logic:** Uses `@google/genai` and `process.env.API_KEY` with hardcoded model. **Do not merge.** Rebuild Boardwalk Suites demo using platform’s existing chat/voice proxy and `GET /api/site-configs/:id` for config.

---

## 4. Mock Data / Copy

- Hero subtitle: “Technical Architecture & Performance Benchmark Report — Independent Technical Review | 2026”.
- Badge: “Prepared for: Pathos Communications plc”.
- CTA: “VIEW EXECUTIVE SUMMARY” with arrow.
- Training shifts (TrainingFocusChart): Compliance→Loyalty, Opacity→Transparency, Reactivity→Proactivity, Static Knowledge→Learning, Efficiency→Values.

---

## 5. Security Flags

- **DemoAgent:** `process.env.API_KEY` (client-side). Forbidden in main app; all AI via server proxy.
- **DemoAgent:** Hardcoded model `gemini-3-flash-preview`. Forbidden; use `process.env.GEMINI_MODEL_ID` server-side only.
- **.env.local** in ZIP: Do not copy; credentials stay in Doppler/Secret Manager.

---

## 6. Build Notes

- Template uses CDN Tailwind + import maps (AI Studio). Main app uses Vite + Tailwind config; use existing setup.
- No `package.json` / `vite.config` / routing from quarantine merged; Investor Demo is a new page in `client/src/pages/showcase/InvestorDemo/` with route `/investor-demo`.
- QuantumScene optional; if Three.js not desired, replace with CSS gradient or SVG.

---

*Quarry has been burned. Context window secure.*
