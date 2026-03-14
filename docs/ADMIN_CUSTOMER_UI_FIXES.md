# Admin & Customer UI Fixes

Summary of fixes applied from the Customer Interface, Nav, and Backend Review Plan.

## 1. Navigation and AI Biz Bot

- **Business Customers** is the single entry point for the list of businesses (site configs). Route: `/platform/tenants` → `PlatformTenants`.
- **AI Biz Bot** in the platform sidebar now goes to a **landing page** at `/platform/agents` (`PlatformAgentsLanding`) that directs users: “To configure the AI Biz Bot for a business, go to **Business Customers** and click **Manage** for that business.” No duplicate “Your sites” list under platform.
- Config for a site is reached via **Manage** from Business Customers → `/app/aibizbot?site=<id>&single=1` (app route).
- Nav taxonomy: “Platform Agents” parent with “AI Biz Bot” child was replaced by a single **AI Biz Bot** item → `/platform/agents` (landing).

**Files:** `client/src/pages/admin/PlatformAgentsLanding.tsx` (new), `client/src/pages/admin/AdminShell.tsx`, `client/src/config/adminNav.ts`.

## 2. Business Customers Table Thumbnails

- **PlatformTenants** table now has a **thumbnail** column (first column). Each row shows a small image using `heroImageUrl` if set, otherwise the place photo via `/api/places/photo-proxy/${placeId}?maxWidth=120`. On error or missing data, a `Building2` icon placeholder is shown.

**Files:** `client/src/pages/admin/PlatformTenants.tsx` (extended `SiteConfig` with `heroImageUrl`, `placeId`; added `SiteThumbnail` and thumbnail column).

## 3. Customer-Facing Cards (Sovereign Glass)

- **BusinessPage** “Confirm your business” overlay was updated from plain white card to sovereign glass: `bg-slate-900/40 backdrop-blur-xl border border-indigo-500/20`, sovereign palette for text (`text-slate-300`/`text-slate-400`/`text-white`), and glass-style chips/badges. Primary CTA remains `bg-indigo-500`; secondary “Search Again” is outline with indigo border.

**Files:** `client/src/pages/customer/BusinessPage.tsx`.

## 4. ConciergePanel Menu (Flattened)

- The Command Center overlay menu no longer uses drill-down (Admin → back, User → back, Public Agents → back). It now shows a **single scrollable list** with section headers: **Admin** (Voice settings, Admin, Identity Manager, QR codes, Agents — Telephony, Publishing), **Account** (Share, Profile, Compliance, My Businesses, Billing, Referral Program), and **Public Agents** (Manifesto, AI Biz Bot). One screen, no nested back/forward.

**Files:** `client/src/components/chat/ConciergePanel.tsx` (removed `menuDrillDown` state; single list with sections).

## 5. Agent Roster Contrast

- **AgentRosterPanel** contrast improvements: secondary text `text-slate-500` → `text-slate-300`; agent row cards use `bg-slate-800/60` and `border border-slate-600 border-indigo-500/20`; “Assigned” badge uses `text-emerald-300` and stronger background/border; search icon and count use `text-slate-400`; plan section headers use `text-slate-300`; create/edit modals have explicit border for visibility.

**Files:** `client/src/components/admin/AgentRosterPanel.tsx`.

## 6. Logo Size (Clients Page)

- **MyAccount** nav: Gateway Global AI logo height increased from `h-10` to `h-14`, with `object-contain` and `min-h-[2.5rem]`.
- **BusinessPage** chat FAB: desktop size increased from `md:w-24 md:h-24` to `md:w-28 md:h-28` so the logo appears larger.

**Files:** `client/src/pages/account/MyAccount.tsx`, `client/src/pages/customer/BusinessPage.tsx`.

---

## Backend/UI Review Checklist (Future Passes)

- **Contrast:** Admin panels and modals use at least `text-slate-400` for secondary text; borders visible (`border-slate-600` or `border-indigo-500/20`).
- **Glass consistency:** Customer-facing cards use sovereign glass (`rounded-sui`, `bg-slate-900/40`, `backdrop-blur-xl`, `border-indigo-500/20`) instead of `bg-white` or `rounded-xl` on outer wrappers.
- **No duplicate lists:** Business list lives only under Business Customers; AI Biz Bot in platform is config landing only.
- **AiBizBotAdmin single-site bar:** When opened via “Manage” with `single=1`, the top bar is still light (`bg-white`). Optional follow-up: make it dark (`bg-slate-900/80`) when product wants full platform-theme consistency.
