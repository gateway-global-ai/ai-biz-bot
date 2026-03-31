# shadcn.io Canvas Backgrounds (Gateway)

**Skill ID:** `shadcn-canvas-backgrounds`  
**Scope:** Governed Concierge canvas — `CanvasViewId` `canvas_backgrounds`, animated layer + categorized catalog.

## When to use

- Voice or chat intent: user asks to **change the canvas background**, **animated background**, **wallpaper**, or **shadcn backgrounds**.
- Extending the catalog, CLI install URLs, or `CanvasBackgroundLayer` effect profiles.
- **Not** for voice pipeline / Gemini Live / `server/geminiVoice.ts`.

## Runtime (product)

1. **Tier-1 routing** — `server/services/canvasIntentRouter.ts` maps phrases to `canvas_backgrounds`. **Use natural phrases** including *“change the background”* (with “the”) — early patterns only matched *“change background”* without “the”, so Tier-1 missed and Tier-2 (local LLM + admin auth) often failed silently.
2. **Hydration** — `client/src/services/voiceTurnOrchestrator.ts` → `canvas.render` payload with `BackgroundPickerViewModel`.
3. **UI** — `ShadcnBackgroundPickerView` (`client/src/components/canvas/ShadcnBackgroundPickerView.tsx`) shows categories aligned with shadcn.io’s background groups.
4. **Apply** — `canvas_bg_select` / `canvas_bg_default` / `canvas_bg_favorite_saved` handled in `ConciergePanel` → `CanvasBackgroundLayer` (`client/src/components/canvas/CanvasBackgroundLayer.tsx`).

## Design-time (CLI)

Catalog rows include the **documented install line** per shadcn.io:

```bash
npx shadcn@latest add https://shadcn.io/r/<slug>.json
```

Slugs live in `client/src/components/canvas/shadcnBackgroundCatalog.ts` (`cliSlug`). Promotion to additional runtime components follows **SHADCN_MCP_PLANE_BOUNDARY_V1** — MCP is discovery-only; production paths use registry + governed renderers.

## Actions (client)

| Action | Behavior |
|--------|----------|
| `canvas_bg_select` | `{ backgroundId }` — sets animated layer behind the canvas column |
| `canvas_bg_default` | Clears layer (platform default white treatment) |
| `canvas_bg_favorite_saved` | Acknowledgment after “Save to favorites” (persists ids in `localStorage`) |

## Safe Mode (operational mode `SAFE`)

SAFE mode has **no tool calls** (`allowedToolNames: []`), but **voice Tier-1** can still open `canvas_backgrounds` from the user transcript. The compiled SAFE instruction in `server/config/operationalModes.ts` includes an explicit **cosmetic UI exception**: do not refuse background/wallpaper asks solely because of Safe Mode. See [`SAFE_MODE_CONTRACT.md`](../../docs-governance/canonical/SAFE_MODE_CONTRACT.md) § Cosmetic canvas personalization.

## Governance

- **Canvas OS tool** — registered view + syscall path only; no ad-hoc JSX from models.
- **Visual integrity** — background layer uses canvas/SVG/Tailwind; avoid new inline hex in feature code when extending (prefer tokens / shared classes).
- **Plane** — shadcn.io MCP is **not** called at runtime; catalog mirrors public docs.
