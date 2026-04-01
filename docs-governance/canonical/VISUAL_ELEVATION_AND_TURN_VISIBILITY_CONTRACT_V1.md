# VISUAL_ELEVATION_AND_TURN_VISIBILITY_CONTRACT_V1

> Canonical governance for the visual stacking order (elevation) and turn-scoped visibility model of the Gateway Global AI OS.

## Status

| Field | Value |
|---|---|
| Version | V1 |
| Status | Active |
| Owner | Platform Architecture |
| Enforced by | `client/src/config/brand.ts` (ELEVATION tokens), `client/src/hooks/useTurnVisibility.ts` |

---

## 1. Problem Statement

The AI OS had no formal model for:
- **When UI should exist** — interaction overlays (visualizer, transcript) were permanently mounted, cluttering the idle canvas.
- **What sits on top of what** — z-index values were random inline numbers (`z-[2]`, `z-50`, `z-[48]`, `z-[200]`), making UI stacking impossible to reason about.

## 2. Core Principle

> **Persistent surfaces are for system, content, and control. Transient surfaces are for active interaction only.**

- **Idle canvas = content-first.** No overlays, no visualizer, no transcript.
- **Active turn = interaction overlays appear.** Visualizer, transcript, thinking state — all scoped to the PTT lifecycle.
- **System always wins.** OTP, auth gates, and critical notices sit above everything.

## 3. Elevation Model (6 Planes)

All z-index values are semantic tokens defined in `client/src/config/brand.ts` via `ELEVATION`.

### 3.1 Plane Hierarchy (bottom to top)

| Plane | Tokens | Purpose |
|---|---|---|
| Background | `background: 0` | Ambient background, gradients |
| Canvas Content | `canvasContent: 10`, `activeExperience: 20` | Business content, sections, cards, intent views |
| App/Menu | `menuOverlay: 50`, `menuLoginGate: 52`, `menuSubView: 55`, `signInOverlay: 58` | Operational UI (menus, forms, OTP inside menu) |
| Interaction | `interactionBase: 70`, `interactionVisual: 72`, `interactionUI: 74` | Turn-scoped overlays (visualizer scrim, visualizer, transcript) |
| Agent | `agentIdentity: 80` | Agent name/status — always above apps, below system |
| System | `novaGate: 90`, `systemOverlay: 100`, `splash: 200` | Non-negotiable overlays (IDV, auth, splash) |

### 3.2 Interaction Plane Sub-Layers

The interaction plane is split into three semantic roles:

- **`interactionBase` (70)**: Dim scrim behind the visualizer. Separates interaction from canvas content.
- **`interactionVisual` (72)**: Visualizer rings + AIOS logo. Pure visual feedback, no interactivity.
- **`interactionUI` (74)**: Transcript strip, turn controls. Interactive UI that sits above visual effects.

### 3.3 Rules

1. **No raw z-index values.** All z-index must use `ELEVATION.*` tokens.
2. **No element may exceed its plane.** App UI cannot use `z-[100]` to override system overlays.
3. **Interaction plane elements are transient.** They mount on PTT press and unmount after turn completion.
4. **System plane elements are permanent when active.** OTP gates and auth overlays always win.

---

## 4. Turn Visibility Model

### 4.1 PttUiMode State Machine

```
idle -> recording -> processing -> speaking -> idle
```

| State | Trigger |
|---|---|
| `idle` | Default. No PTT active. |
| `recording` | User presses PTT. Microphone active. |
| `processing` | User releases PTT. Waiting for agent response. |
| `speaking` | Agent begins audio output. |

### 4.2 Visibility Policy Matrix

| State | Visualizer | Live Transcript | Thinking Motion | App Canvas |
|---|---|---|---|---|
| idle | OFF | OFF | OFF | ON |
| recording | ON | ON | OFF | ON |
| processing | ON | ON (frozen) | ON | ON |
| speaking | ON | OFF | OFF | ON |

### 4.3 Linger Debounce

When transitioning from any active state to `idle`, the system enters a **linger period** (800ms) during which `turnActive` remains `true`. This prevents:
- Visualizer flicker on brief pauses
- Abrupt UI removal
- Animation interruption

During linger, the effective mode is `speaking` (fade-out animation).

### 4.4 Implementation

The `useTurnVisibility` hook (`client/src/hooks/useTurnVisibility.ts`) encapsulates:
- Mode derivation from `isRecording`, `isProcessing`, `isAISpeaking`
- Visibility policy computation
- 800ms linger debounce
- `turnActive` flag for mount/unmount gating

---

## 5. Mount/Unmount Rules

### 5.1 Transient Surfaces (interaction plane)

| Surface | Mount Condition | Unmount Condition | Animation |
|---|---|---|---|
| Visualizer + scrim | `turnActive === true` | `turnActive === false` | Fade in 200ms, fade out 400ms |
| Transcript strip | `visibility.liveTranscript === true` | `visibility.liveTranscript === false` | Slide up 150ms, fade out 200ms |
| Thinking indicator | `visibility.thinkingMotion === true` | `visibility.thinkingMotion === false` | Cross-fade 200ms |

### 5.2 Persistent Surfaces

| Surface | Behavior |
|---|---|
| Footer (PTT, status, logo) | Always mounted. Never unmounts. |
| Canvas content area | Always mounted. Visible behind interaction overlays. |
| Agent identity strip | Always mounted when agent is active. |
| Background | Always mounted. Always z-index 0. |

---

## 6. Prohibited Patterns

1. **Always-mounted visualizer.** The visualizer must gate on `turnActive`, not render permanently.
2. **Random z-index values.** Inline `z-[N]` or `z-50` without an ELEVATION token is a governance violation.
3. **Interaction UI outside turn scope.** Transcript, thinking indicators, and visualizer effects must not persist after turn completion.
4. **App UI above interaction/system.** Menu overlays and forms must not use z-index values above `ELEVATION.signInOverlay` (58).

---

## 7. Enforcement

### 7.1 Static Analysis (future)

- Detect raw `z-[` usage in components that should use `ELEVATION.*`
- Detect always-mounted interaction components (no conditional rendering gate)

### 7.2 Code Review Checklist

- [ ] All z-index values use `ELEVATION.*` tokens
- [ ] Interaction surfaces gate on `turnActive` or `visibility.*`
- [ ] No component permanently mounts visualizer or transcript
- [ ] System plane elements are above all other elements
- [ ] Animation durations match this contract

---

## 8. Related Documents

- `client/src/config/brand.ts` — ELEVATION tokens, PttUiMode type, VisibilityPolicy interface
- `client/src/hooks/useTurnVisibility.ts` — Turn state machine hook
- `.cursor/rules/brand-tokens.mdc` — Brand token governance
- `docs-governance/canonical/CANVAS_OS_TOOL_MANDATE_V1.md` — Canvas zone governance
