# Nova Verify UI Reference

## Original reference location

The **original Nova Verify UI reference** (AI Studio app export) is stored at:

```
_legacy_archive/novaverify (1)/
```

**Important:** Per project rules, we **do not import from or modify** anything inside `_legacy_archive/`. This folder is **read-only reference** for design and UX patterns. Implementation lives in the active codebase.

### Contents of the reference

| Item | Description |
|------|-------------|
| `App.tsx` | Full IDV flow: Welcome, Verification Hub (card grid), OTP, Magic Link, Biometric, ID Upload, Signature, SuccessSplash; light theme, font-outfit, blue/indigo gradients |
| `components/Layout.tsx` | Header with icon box (w-10 h-10 bg-blue-600 rounded-xl), "NOVA" + "Security" label, progress bar (h-1 w-24 bg-slate-100, fill bg-blue-600), main area with `glass rounded-[3rem]`, footer "Live Protocol" / "Node: Alpha-9" |
| `components/ShoppingCart.tsx` | Billing Summary drawer: **Software** (e.g. Small Business Router $49), **Services** (e.g. AI Communication Bundle $50), **Overages** (voice/SMS/chat table); section labels `text-xs font-black text-slate-400 uppercase tracking-[0.3em]` |
| `components/SignaturePad.tsx` | E-signature capture |
| `components/IPhoneSimulation.tsx` | OTP / device simulation UI |

### Legacy UI patterns (for reference)

- **Header:** Icon in rounded box + title + small uppercase label (e.g. `text-[8px] font-black text-blue-600 tracking-[0.3em] uppercase`).
- **Progress:** Thin bar `h-1 w-24 bg-slate-100 rounded-full`, fill `bg-blue-600`.
- **Cards:** `glass rounded-[3rem]` (light theme), or in our app we use **dark sovereign** glass: `rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl`.
- **Section labels:** Uppercase, tight tracking, muted (e.g. `text-xs font-black text-slate-400 uppercase tracking-[0.3em]`).
- **Billing:** Three sections — Software, Services, Overages — with clear hierarchy and totals.

## Where we implement these patterns (active codebase)

| Pattern | Current implementation |
|--------|------------------------|
| **Nova-style IDV + billing** | [client/src/pages/account/NovaVerifyPage.tsx](client/src/pages/account/NovaVerifyPage.tsx) — session state, progress, billing summary (platform fee, voice by agent, overages); sovereign glass, `rounded-sui`, indigo accents |
| **Sovereign / Jason Standard** | [.cursor/rules/jason-standard.mdc](.cursor/rules/jason-standard.mdc) — glass card, `rounded-sui`, palette, typography (data-chip, badge-insight), motion |
| **PTT interface (Gateway Global AI)** | [client/src/components/chat/ConciergePanel.tsx](client/src/components/chat/ConciergePanel.tsx) — **default** `variant="sovereign"`: Nova Verify–style glass, header icon box, uppercase labels, motion, docked footer. This is the canonical PTT UI that represents Gateway Global AI everywhere (home page, WebsitePreview, SDK widget). |
| **Billing summary (Software / Services / Overages)** | [client/src/pages/account/MyAccount.tsx](client/src/pages/account/MyAccount.tsx) (Billing card) and NovaVerifyPage (billing summary panel); data from `GET /api/customer/current-bill` |

## Theme note

The legacy reference uses a **light** theme (`bg-[#fcfdfe]`, `text-slate-900`, `bg-blue-600`). The platform’s **live** UI follows the **Jason Standard** **dark sovereign** theme (`bg-slate-950`, `bg-slate-900/40`, `border-indigo-500/20`, `text-white` / `text-slate-400`) for consistency with the rest of the product. The structural patterns (icon box, progress bar, section labels, three-part billing) are preserved and adapted to the dark palette.
