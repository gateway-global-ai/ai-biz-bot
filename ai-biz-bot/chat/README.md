# Gateway Chat SDK

**Frontend-only SDK for embedding AI-powered chat widgets.** All backend logic is handled by the Gateway Global AI platform APIs. The SDK is purely client-side JavaScript.

---

## Design Philosophy

> *"How many phone designs exist today? Not many. They all look the same. An iPhone has thousands of apps, but manages everything with one button."*

This SDK follows the **iPhone Principle**: manage infinite complexity through minimal controls.

### Core Patterns

| Pattern | Description | Controls |
|---------|-------------|----------|
| **Floating Widget** | FAB button + popup chat card | 1 button |
| **Multi-Path Overlay** | Icon nav + category grid + content area | 1 button to open |
| **Icon Toolbar** | Compact header icons that swap panel content | Icon row |
| **Split Panel** | Chat + functional sidebar (DISC, sliders, DNA) | Sidebar toggle |
| **Toggle Panel** | Grid of on/off switches for features | Toggle switches |
| **Category Grid** | Icon cards for quick action selection | Grid tap |
| **Voice Visualizer** | Animated orb + frequency bars inside chat body | Mic button |
| **Tab Navigation** | Horizontal tabs within panels | Tab row |

### Key Principles

1. **One Button, Many Paths** - A single button opens an overlay with all options. No cluttered toolbars.
2. **Overlays as Intermediate Steps** - Click to open, make a selection, view content. Multi-path, not single-path.
3. **Voice Inside Chat** - Voice visualizer replaces the message body, not the entire UI. Chat frame stays.
4. **Toggle Everything** - Features are on/off. No complex settings. Toggle switches everywhere.
5. **Chat Headers Can Be Rich** - Headers aren't thin bars. They can hold icon toolbars, voice controls, status indicators.

---

## Quick Start

### Script Tag (Simplest)

```html
<script
  src="https://your-gateway.com/sdk/gateway-chat.js"
  data-bot-id="your-bot-id"
  data-color="#6366f1"
  data-bot-name="Aria"
  data-voice="true"
></script>
```

### NPM Package

```bash
npm install @gateway-global/chat-sdk
```

```javascript
import { GatewayChat } from '@gateway-global/chat-sdk';

const widget = GatewayChat.init({
  botId: 'your-bot-id',
  apiBase: 'https://your-gateway.com',
  theme: { primaryColor: '#6366f1' },
  voice: { enabled: true },
  botName: 'Aria',
  greetingMessage: 'Hey! How can I help?',
});

widget.open();
```

---

## Configuration

### `GatewayChatConfig`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `botId` | `string` | *required* | Bot ID from Gateway platform |
| `apiBase` | `string` | auto-detect | Gateway platform API base URL |
| `position` | `string` | `'bottom-right'` | Widget position: `bottom-right`, `bottom-left`, `top-right`, `top-left` |
| `theme` | `ThemeConfig` | — | Theme customization (see below) |
| `voice` | `VoiceConfig` | — | Voice input configuration |
| `greetingMessage` | `string` | server config | Initial greeting message |
| `placeholderText` | `string` | `'Type a message...'` | Input placeholder |
| `botName` | `string` | server config | Display name for the bot |
| `botAvatar` | `string` | — | URL for bot avatar image |
| `headerSubtitle` | `string` | `'Online'` | Subtitle under bot name |
| `width` | `string` | `'360px'` | Widget width |
| `height` | `string` | `'500px'` | Widget height |
| `zIndex` | `number` | `2147483647` | CSS z-index |
| `autoOpen` | `boolean` | `false` | Open on page load |
| `onOpen` | `function` | — | Called when chat opens |
| `onClose` | `function` | — | Called when chat closes |
| `onMessage` | `function` | — | Called on send/receive |
| `onError` | `function` | — | Called on errors |

### `ThemeConfig`

| Property | Default | Description |
|----------|---------|-------------|
| `primaryColor` | `'#2563eb'` | Brand color |
| `chatBackground` | `'#f8fafc'` | Message area background |
| `headerBackground` | primaryColor | Header background |
| `headerText` | `'#ffffff'` | Header text color |
| `userBubbleColor` | primaryColor | User message bubble |
| `userBubbleText` | `'#ffffff'` | User message text |
| `assistantBubbleColor` | `'#ffffff'` | Bot message bubble |
| `assistantBubbleText` | `'#1e293b'` | Bot message text |
| `fontFamily` | `system-ui` | Font family |
| `borderRadius` | `'24px'` | Widget border radius |
| `fabSize` | `'56px'` | FAB button size |

### `VoiceConfig`

| Property | Default | Description |
|----------|---------|-------------|
| `enabled` | `false` | Show mic button |
| `visualizerStyle` | `'bars'` | Animation: `bars`, `orb`, `waveform` |
| `listeningText` | `'Listening...'` | Status text while recording |
| `processingText` | `'Processing...'` | Status text while processing |

---

## API Methods

```javascript
const widget = GatewayChat.init({ botId: '...' });

widget.open();                    // Open chat window
widget.close();                   // Close chat window
widget.toggle();                  // Toggle open/closed
widget.destroy();                 // Remove from page
widget.sendMessage('Hello!');     // Send message programmatically
widget.getMessages();             // Get conversation history
widget.setVoiceMode(true);        // Toggle voice visualizer
widget.isOpen();                  // Check if open
widget.isVoiceActive();           // Check if voice is active
```

---

## Data Attributes (Auto-Init)

When using the script tag, configure via `data-*` attributes:

| Attribute | Maps to |
|-----------|---------|
| `data-bot-id` | `botId` |
| `data-api-base` | `apiBase` |
| `data-position` | `position` |
| `data-color` | `theme.primaryColor` |
| `data-bot-name` | `botName` |
| `data-greeting` | `greetingMessage` |
| `data-voice` | `voice.enabled` (set to `"true"`) |
| `data-auto-open` | `autoOpen` (set to `"true"`) |

---

## Architecture

```
Developer's Website          Gateway Platform
┌─────────────────┐          ┌──────────────────┐
│                 │          │                  │
│  gateway-chat.js│ ──API──> │  /api/website-chat│
│  (Shadow DOM)   │          │  /api/bots/:id   │
│                 │          │                  │
│  No backend     │          │  AI Engine       │
│  No server      │          │  (Kimi / Gemini) │
│  Pure frontend  │          │                  │
└─────────────────┘          └──────────────────┘
```

The SDK is **frontend-only**. All AI processing, conversation history, and bot configuration are handled by the Gateway platform APIs. The widget makes two API calls:

1. `GET /api/bots/:botId/public` — Fetch bot config (name, theme, greeting)
2. `POST /api/website-chat` — Send/receive messages

---

## Component Catalog

These are the battle-tested chat interface patterns available in the SDK, refined over 2+ years of production use.

### Floating Widget
The classic embed pattern. Shadow DOM isolates CSS. One script tag, zero setup.

### Multi-Path Overlay
One button opens a full-screen overlay with icon navigation (Chat, Browser, Map, Settings) and category cards (Hotels, Dining, Flights). Users choose their path, then dive in.

### Icon Toolbar + Tab Panels
A compact header toolbar where each icon opens a different panel. Combined with horizontal tabs for sub-navigation. The Voice button switches to an immersive speaking mode with animated orb and frequency bars.

### Split Panel (Chat + Sidebar)
Chat on one side, functional content on the other. The sidebar holds DISC profile visualizations, brand awareness sliders, and communication model controls. Sidebar collapses for full-width chat.

### Toggle Panel
A settings overlay with a grid of toggle switches. Each service shows status (Active/Disconnected), a description, and an on/off toggle. One "Done" button closes everything.

### Category Grid
A grid of icon+label cards for quick action selection. Tapping a card selects it and loads its panel. Like iPhone app icons in composable format.

### Voice Visualizer
The voice button opens a visualizer **inside** the chat body (not a separate page). Animated orb with pulse rings, frequency bars, status text, and an "End Conversation" button. The chat frame stays visible.

---

## Live Demo

Visit `/sdk` on your Gateway Global AI instance to see all patterns as interactive demos.

---

## License

MIT
