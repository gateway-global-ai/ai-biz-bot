# Platform UI contract (`@/ui`)

This directory is the **Gateway Global AI / ClearVoice** UI layer on top of `client/src/components/ui` (shadcn + Radix).

## Rules

1. **New feature code** should import primitives from `@/ui/foundation`, charts from `@/ui/charts`, etc., where wrappers exist.
2. **Do not** add raw `recharts` imports in product pages — use `@/ui/charts` (showcase demos may temporarily diverge).
3. **Colors:** Zone backgrounds use `client/src/config/brand.ts` (`SHELL`, `CANVAS`, `BRAND`). DISC/ARCH chart colors use `DISC_COLORS` and `ARCH_COLORS` from the same file.
4. **Vendor layer:** `@/components/ui/*` remains the implementation; it is not deprecated, only encapsulated.

See `docs-governance/UI_ARCHITECTURE_AUDIT.md` and `docs-governance/UI_COMPONENT_REGISTRY.md`.

**Developer catalog:** interactive previews of the ClearVoice **Developer UI Kit** at `/dev/ui-kit` (dev or `VITE_UI_KIT=1`) — see `docs-governance/UI_KIT.md`. This is **not** [LiveKit](https://livekit.io/) (a third-party real-time SDK); we do not use that product for this surface.
