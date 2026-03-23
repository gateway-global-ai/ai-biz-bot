# ClearVoice Developer UI Kit

## Purpose

Interactive, Shadcn-style **examples** (runnable in the app) for the ClearVoice UI contract: platform wrappers under `@/ui` and curated primitives under `@/components/ui`. If components are not discoverable here, they effectively do not exist for integrators.

### Terminology (avoid confusion with LiveKit)

**LiveKit** is a third-party real-time / WebRTC SDK. **We do not use it** for ClearVoice, and this route is **not** a “LiveKit” integration.

Use **Developer UI Kit**, **UI catalog**, or **interactive preview** for `/dev/ui-kit`. Do **not** call this surface “live kit” in docs or Slack — that phrasing reads like the LiveKit product.

## Browser path

- **`/dev/ui-kit`** — registered in [`client/src/App.tsx`](../client/src/App.tsx) as a **public** route (no login). This avoids redirecting developers to `/login` (OTP) when opening the kit directly.

## Access gate

The **full interactive kit** renders only when:

- `import.meta.env.DEV` is true, **or**
- `VITE_UI_KIT=1` (or `true`) is set in the environment at build time.

Otherwise the user sees a short explanation. This avoids exposing internal component galleries in production builds by default.

## Source files

| File | Role |
|------|------|
| [`client/src/pages/developer/ui-kit/index.tsx`](../client/src/pages/developer/ui-kit/index.tsx) | Main page: sections and examples |
| [`client/src/pages/developer/ui-kit/UIKitLayout.tsx`](../client/src/pages/developer/ui-kit/UIKitLayout.tsx) | Sidebar + scroll content |
| [`client/src/pages/developer/ui-kit/UIKitSection.tsx`](../client/src/pages/developer/ui-kit/UIKitSection.tsx) | Preview + code block |
| [`client/src/pages/developer/ui-kit/CodeBlock.tsx`](../client/src/pages/developer/ui-kit/CodeBlock.tsx) | Copy-to-clipboard snippets |
| [`client/src/lib/uiKitGate.ts`](../client/src/lib/uiKitGate.ts) | `isUiKitEnabled()` |

## Contribution rule

When adding a **new** platform wrapper under `client/src/ui/`, add a **UIKitSection** (or placeholder) on this page and update [UI_COMPONENT_REGISTRY.md](./UI_COMPONENT_REGISTRY.md).

## Related

- [UI_SDK_MATRIX.md](./UI_SDK_MATRIX.md) — full SDK classification (foundation vs wrapped vs vendor; OS menu, PTT, QR, compliance)
- [UI_ARCHITECTURE_AUDIT.md](./UI_ARCHITECTURE_AUDIT.md)
- [UI_COMPONENT_REGISTRY.md](./UI_COMPONENT_REGISTRY.md)
- [LOGICAL_ROUTE_REGISTRY.md](./LOGICAL_ROUTE_REGISTRY.md) (`dev.ui_kit`)
