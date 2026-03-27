# Chat Interface Architecture Decision

**Chat-first agent control and KB:** For the in-chat menu, Knowledge overlay, prompt compilation, and KB RBAC, see [CHAT_AND_AGENT_CONTROL.md](./CHAT_AND_AGENT_CONTROL.md).

## Decision

**We are committing to using BOTH the Gateway Chat SDK (`/sdk/chat/`) for embeddable widgets AND `StandardizedChatInterface` for in-app React pages as the ONLY approved chat interface implementations.**

## Context

The platform had multiple inconsistent chat interface implementations. We now have:
1. **Gateway Chat SDK** - Frontend-only embeddable JavaScript widget for external websites
2. **StandardizedChatInterface** - React component for internal app pages

## The Complete Solution

### 1. Gateway Chat SDK (`/sdk/chat/`)
**Purpose:** Frontend-only embeddable chat widget for ANY website (React, vanilla JS, WordPress, etc.)

**The Three Modes:**
- **Floating Mode**: FAB button + popup chat card (bottom-right corner)
- **Fixed Mode**: Embedded widget with constrained dimensions  
- **Fullscreen Mode**: Mobile responsive mode (fills viewport on small screens)

**Key Features:**
- Shadow DOM isolation (no CSS conflicts)
- Pure frontend JavaScript (no backend required)
- Connects to Gateway platform APIs
- Voice visualizer with orb + frequency bars
- Auto-init via script tag or programmatic API
- Customizable colors, names, greetings
- Multiple design patterns (floating, overlay, toolbar, split panel)
- Responsive design (mobile and desktop optimized)
- Mode switching capability
- Customizable colors, greetings, and placeholders
- Real-time chat with WebSocket support
- Max-width constraints (600px) for readability
- Proper height handling for all screen sizes

### 2. FloatingChatWidget
**Purpose:** Embeddable floating widget that appears in the bottom-right corner

**Features:**
- Shadow DOM isolation
- Voice visualizer inside chat body
- Multiple design patterns (see SDK README)
- Auto-init from script tag
- Programmatic JavaScript API

**Usage - Script Tag:**
```html
<script
  src="https://your-gateway.com/sdk/gateway-chat.js"
  data-bot-id="your-bot-id"
  data-color="#6366f1"
  data-bot-name="AI Assistant"
  data-voice="true"
></script>
```

**Usage - Programmatic:**
```javascript
const widget = GatewayChat.init({
  botId: 'your-bot-id',
  apiBase: 'https://your-gateway.com',
  theme: { primaryColor: '#6366f1' },
  voice: { enabled: true },
});
widget.open();
```

### 2. StandardizedChatInterface (`/client/src/components/`)
**Purpose:** React component for in-app chat pages with business management capabilities

**Three Built-in Modes:**
- **Customer Mode**: Public-facing customer chat with simple Q&A
- **Owner Mode**: Business owner portal with tabs for Settings, Customers, Projects, and Reports  
- **Developer Mode**: Technical interface for page creation, app deployment, and agent management

**Features:**
- 100vh fullscreen support for business portals
- Mode switching (Customer/Owner/Developer)
- Responsive design (mobile/desktop)
- Customizable colors and greetings
- Real-time chat with message history
- Max-width constraints (600px) for readability

**Usage:**
```tsx
import StandardizedChatInterface from '@/components/StandardizedChatInterface';

<StandardizedChatInterface
  mode="customer"
  siteConfigId="your-site-id"
  botName="AI Biz Bot"
  fullscreen={true}
/>
```

### 3. FloatingChatWidget (`/client/src/components/`)
**Purpose:** React-based floating widget (superseded by Gateway Chat SDK for most use cases)

**Note:** Use the Gateway Chat SDK (`/sdk/chat/`) instead for new implementations. FloatingChatWidget is maintained for existing React-only integrations.

## Usage Guidelines

### ✅ DO: Use the Right Tool for the Job

**For embedding in external websites (WordPress, static sites, etc.):**
```html
<!-- Use Gateway Chat SDK -->
<script src="https://your-gateway.com/sdk/gateway-chat.js" data-bot-id="xxx"></script>
```

**For React app pages (business portals, customer dashboards):**
**For React app pages (business portals, customer dashboards):**
```tsx
<!-- Use StandardizedChatInterface -->
import StandardizedChatInterface from '@/components/StandardizedChatInterface';

<StandardizedChatInterface mode="owner" fullscreen={true} />
```

### ❌ DO NOT: Create new custom chat interfaces

Do NOT create new chat interface components from scratch. The Gateway Chat SDK and StandardizedChatInterface cover ALL use cases:
- External website embedding → Gateway Chat SDK
- Internal React pages → StandardizedChatInterface  
- Business management → StandardizedChatInterface (owner/developer modes)

## The Three Modes Explained

Both the SDK and StandardizedChatInterface support the three modes described in the requirements:

### 1. Floating Mode
- **SDK Implementation**: FAB button + popup chat card
- **React Implementation**: FloatingChatWidget (deprecated - use SDK instead)
- **Behavior**: Fixed position, collapsible
- **Use case**: Embedded widget for any website

### 2. Fixed Mode
- **SDK Implementation**: Configurable width/height in container
- **React Implementation**: `StandardizedChatInterface` with `fullscreen={false}`
- **Behavior**: Constrained dimensions, embedded in page
- **Use case**: Chat as part of a larger layout

### 3. Fullscreen Mode
- **SDK Implementation**: Mobile responsive (100vh on small screens)
- **React Implementation**: `StandardizedChatInterface` with `fullscreen={true}`
- **Behavior**: 100vh height, full viewport usage
- **Use case**: Dedicated chat pages, business management portals

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Gateway Platform                   │
│                                                     │
│  /api/website-chat  ←  Chat messages               │
│  /api/bots/:id      ←  Bot configuration           │
│  /sdk/gateway-chat.js  →  SDK JavaScript file      │
└─────────────────────────────────────────────────────┘
           ▲                           ▲
           │                           │
   ┌───────┴─────────┐         ┌──────┴────────┐
   │  Gateway Chat   │         │ Standardized  │
   │  SDK (External) │         │ ChatInterface │
   │  /sdk/chat/     │         │ (Internal)    │
   │  Pure JS        │         │ React         │
   └─────────────────┘         └───────────────┘
```

## Benefits of This Dual Approach

1. **Gateway Chat SDK** - Universal embeddability without framework dependencies
2. **StandardizedChatInterface** - Rich React features for internal business portals
3. **Single Backend** - Both use the same Gateway platform APIs
4. **Consistent Experience** - Same AI, same features, different presentation layers
5. **Scalability** - From simple chatbot to full customer management system

## Implementation Status

### ✅ Gateway Chat SDK
- `/sdk/chat/src/gateway-chat.js` - Main SDK file
- `/sdk/chat/examples/` - Example integrations
- `/sdk/chat/reference-apps/` - Complete reference implementations
- Served at `/sdk/*` route
- Used in BusinessPage for floating widget

### ✅ Using StandardizedChatInterface
- `/chat/customer` - Customer chat interface
- `/chat/owner` - Owner business portal (fullscreen with tabs)
- `/chat/developer` - Developer technical interface (fullscreen with tabs)
- `/interface/*` - Public demo routes
- Used in ChatWithAgentPreview for agent visualization

### ⚠️ Specialized (Justified - Not for General Use)
- `/chat/:agentId` - AgentChat (agent-specific features: avatars, voice, sharing)
- `/command-chat` - CommandChat (admin tool: agent selection, DISC metrics, quick commands). **API:** `POST /api/admin/command-chat` — live context is sites / visitors / messages / customers only; **VLM prospect/campaign context was removed for v1** (2026-03-25). **`GET /api/admin/sites/leads` returns 410** (VLM lead merge retired).

## Future Considerations

**For external websites:** Always use Gateway Chat SDK
**For React app pages:** Always use StandardizedChatInterface
**New requirements:** Extend existing components, don't create new ones

## Conclusion

**The Gateway Chat SDK (`/sdk/chat/`) and StandardizedChatInterface (`/client/src/components/`) are the ONLY approved chat implementations. Together they provide:**

- ✅ Floating, fixed, and fullscreen modes
- ✅ External website embeddability (SDK)
- ✅ Internal React app integration (StandardizedChatInterface)
- ✅ Business management capabilities (Owner/Developer modes)
- ✅ Voice interaction with visualizers
- ✅ Consistent backend integration
- ✅ Scalability from chatbot to customer management system

**This is more than enough** - a complete, production-ready foundation that handles all current and future chat needs without requiring alternative implementations.
