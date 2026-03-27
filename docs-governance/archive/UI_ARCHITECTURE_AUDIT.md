# UI Architecture Audit — Gateway Global AI / ClearVoice

**Purpose:** Governed inventory of the React frontend stack, classification of components, and the **ClearVoice UI contract**: wrap vendors for consistency; keep shell/canvas invariants; avoid rebuilding mature primitives from scratch.

**Related:** [APP_SHELL_CONTRACT.md](./APP_SHELL_CONTRACT.md), [VIEW_REGISTRY.md](./VIEW_REGISTRY.md), [UI_SDK_MATRIX.md](./UI_SDK_MATRIX.md) (full classification: shell, canvas, communications, compliance), [client/src/config/brand.ts](../client/src/config/brand.ts).

---

## 1. UI stack inventory (evidence-based)

### 1.1 Dependencies (`package.json`)

| Area | Library / package |
|------|-------------------|
| Primitives | Radix UI (accordion, dialog, dropdown, tabs, toast, slider, …) + `client/src/components/ui/` (shadcn-style) |
| Styling | Tailwind 3, `class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss-animate` |
| Charts | **Recharts**; `client/src/components/ui/chart.tsx` exposes `ChartContainer` + themed Recharts (no app files use `ChartContainer` yet — charts mostly import Recharts directly) |
| Forms | `react-hook-form`, `@hookform/resolvers`, `zod`, `components/ui/form.tsx` |
| Date/time | `date-fns`, `react-day-picker` + `components/ui/calendar.tsx` |
| OTP | `input-otp` + `components/ui/input-otp.tsx` |
| Overlays | Radix dialog/alert-dialog; **Vaul** `drawer.tsx`; Radix toast + `toaster.tsx` |
| Command | `cmdk` → `components/ui/command.tsx` |
| Data | `@tanstack/react-query` |
| Motion | `framer-motion` |
| Icons | `lucide-react` (primary) |
| Dead / verify | `react-icons` — **not imported** in `client/src` (only legacy KB extract under `docs/`). Candidate for removal from root `package.json` after confirm. |
| Maps | `@react-google-maps/api`, `@vis.gl/react-google-maps`, `@googlemaps/extended-component-library` |
| 3D / hero | `three`, `@react-three/fiber`, `@react-three/drei`, `vanta` — not part of core form/chart kit |
| Tables | **No** `@tanstack/react-table` — `components/ui/table.tsx` + hand-built rows |

### 1.2 Import map (approximate counts, `client/src`)

| Pattern | Notes |
|---------|--------|
| `@/components/ui/*` | **~100+ files** reference shadcn primitives (wide adoption) |
| `from 'recharts'` | **Centralized in** `client/src/ui/charts/*` for product charts; remaining direct imports in showcases (`OnboardingFlow`, `MockConversation`, `DiscVisualizer`, `DiscAssessment`) — migrate incrementally; `components/ui/chart.tsx` exposes `ChartContainer` (unused in features yet) |
| `ChartContainer` / `ui/chart` | **Only** `components/ui/chart.tsx` (no feature usage yet) |
| `useToast` | **~40 files** |
| `Dialog` / `Sheet` / `Drawer` | Dialog-heavy admin; Sheet in sidebar/command; Drawer in fewer places (grep subset ~12 files for dialog/sheet/drawer combined) |

### 1.3 Top-level `client/src/components/` buckets

| Bucket | Role |
|--------|------|
| `ui/` | Vendor + shadcn primitive layer |
| `chat/` | Concierge shell integration |
| `voice/` | Voice tools, maps, PTT-adjacent UI |
| `os/` | OS menu, brand governance |
| `biz/` | Business landing / hero |
| `nova/` | Nova gate |
| `agent-charts/` | **Legacy barrel** — re-exports platform charts from `@/ui/charts` |
| `account/`, `admin/`, `billing/`, `dashboard/`, `reseller/`, `storefront/`, `showcase/`, etc. | Feature domains |

### 1.4 Duplication hotspots

| Issue | Locations |
|-------|-----------|
| DISC sliders | Native `<input type="range">` in `OnboardingFlow.tsx` vs Radix `Slider` in showcases / `MockConversation` |
| ARCH / DISC colors | `config/brand.ts` (source of truth), former `agentChartColors.ts` (removed — re-export from brand), inline `ARCH_COLORS` in `AgentManager.tsx` (removed for charts — use `ARCH_COLORS` from brand) |
| `ArchBreakdown` / `DiscRadar` | Duplicated in `AgentManager.tsx`, `MockConversation.tsx`, `DiscVisualizer.tsx`; **canonical** implementations live in `@/ui/charts` |
| Style rule tension | Jason Standard / sovereign-ui-lockdown favor dark glass cards; **brand-tokens** mandate **white canvas** for concierge content. Resolve by **surface class** (see §3). |

---

## 2. Component classification (framework)

For each element: **Status** (Keep / Wrap / Refactor / Replace / Deprecate), **Owner** (Foundation / Shell / Canvas / Communications / Marketplace / Shared), **Source** (Internal / shadcn / Recharts / Other).

### 2.1 Decision table — major primitives

| Element | Current source | Used where | Decision | New wrapper / path | Owner |
|---------|----------------|------------|----------|---------------------|-------|
| Button | shadcn + Radix | Widespread | Wrap | `UIButton` — [`client/src/ui/foundation/UIButton.tsx`](../client/src/ui/foundation/UIButton.tsx) | Foundation |
| Input, Label, Card, Badge, Tabs, Select | shadcn | Widespread | Wrap (incremental) | `UIInput`, `UICard`, … — future `ui/foundation` | Foundation |
| Dialog / AlertDialog | Radix + shadcn | Admin, customer | Keep + wrap later | `AppDialog` (TBD) | Foundation |
| Sheet / Drawer | Radix + Vaul | Sidebar, mobile | Keep + wrap later | `AppSheet`, `AppDrawer` (TBD) | Foundation |
| Table | shadcn | Billing, lists | Keep | `AnalyticsTable` (TBD) for typed analytics | Foundation / App |
| Toast | Radix | Many | Keep | `usePlatformToast` (TBD) optional alias | Foundation |
| Form + RHF + Zod | shadcn + RHF | Onboarding, account | Keep | `UIFormSection` (TBD) | Forms |

### 2.2 Charts

| Element | Current source | Decision | New wrapper | Owner |
|---------|----------------|----------|-------------|-------|
| DISC radar | Recharts | Wrap | `DiscRadarChart` (`@/ui/charts`) | Charts |
| ARCH bars | Recharts | Wrap | `ArchBarChart` (`@/ui/charts`) | Charts |
| Generic line (usage) | Recharts | Wrap | `UsageLineChart` (`@/ui/charts`) | Charts |
| Bar (volume, etc.) | Recharts | Wrap when productized | `CallVolumeBarChart` (TBD) | Charts |

**Rule:** New product charts should import Recharts **only** from `client/src/ui/charts/*` (showcase demos may lag; prefer migrating to wrappers).

### 2.3 AI OS / communications (extract over time)

| Element | Source | Decision |
|---------|--------|----------|
| PTT + footer | `ConciergePanel.tsx` | Refactor-extract → `ui/communications` (incremental) |
| Transcript | Chat components | Wrap → `TranscriptPanel` (TBD) |
| Voice settings mini-charts | `VoiceSettings.tsx` | Import from `@/ui/charts` |
| Telephony admin | Admin pages | Wrap → `TelephonySetupCard` (TBD) |
| QR campaigns | Account / admin | Wrap → `QrCampaignCard` (TBD) |

---

## 3. Shell vs canvas styling matrix

| Surface | Background | Card style | Rules |
|---------|------------|------------|-------|
| **Shell** (header, visualizer, PTT footer) | `SHELL.bg` | N/A (bars are not “cards”) | [APP_SHELL_CONTRACT.md](./APP_SHELL_CONTRACT.md), brand-tokens |
| **Concierge canvas** | `CANVAS.bg` | Light content, borders per brand — **not** dark glass from Jason Standard | White canvas; no slate-900 cards that read as “second shell” |
| **Admin / owner dashboards** | Often dark layout | Glass + `rounded-sui` per Jason Standard where not conflicting with explicit page design | Document per route; prefer tokens from `brand.ts` |
| **Marketing / showcase** | Dark immersive demos | Jason Standard glass cards | Clearly “demo” or marketing — not the embedded customer canvas |

**Culver’s-style reference (patterns only):** persistent header, account list rows, wizard progress, bottom-sheet + map, FAQ accordion density. **Do not** override shell/canvas token contract; voice + visualizer + behavior controls remain the differentiator.

---

## 4. Proposed folder structure (implemented baseline)

```text
client/src/ui/foundation/     # UIButton, future UIInput, UICard
client/src/ui/shell/          # Shell layout helpers (reserved)
client/src/ui/canvas/         # Canvas-safe patterns (reserved)
client/src/ui/communications/ # VoiceDock, etc. (reserved)
client/src/ui/charts/         # DiscRadarChart, ArchBarChart, UsageLineChart, governance
client/src/ui/forms/          # Wizard shell, UIFormSection (reserved)
```

**Import rule:** Prefer `@/ui/...` for new code; `@/components/ui/...` remains the implementation layer for shadcn.

---

## 5. Standardization priorities

1. **Foundation:** `UIButton` + migrate high-traffic pages incrementally.
2. **Charts:** Approved list and wrappers — see [UI_COMPONENT_REGISTRY.md](./UI_COMPONENT_REGISTRY.md) and `client/src/ui/charts/chartGovernance.ts`.
3. **Forms:** Single-column settings, wizard, validation display — wrap incrementally.
4. **Calendar:** Date picker (existing); extend only for shipped flows (business hours, appointments).

---

## 6. Success criteria (from plan)

- Single approved chart vocabulary for product surfaces (enforced by convention + registry).
- DISC/ARCH colors **single-sourced** from `client/src/config/brand.ts`.
- Documentation allows engineers to follow shell/canvas rules without contradicting [APP_SHELL_CONTRACT.md](./APP_SHELL_CONTRACT.md).

---

## 7. Changelog

| Date | Change |
|------|--------|
| 2026-03-22 | Initial audit + `client/src/ui/*` baseline, `@/ui/charts` agent profile charts, `UIButton` pilot. |
