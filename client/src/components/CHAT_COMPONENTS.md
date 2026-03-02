# Chat Interface Components

> **⚠️ IMPORTANT**: These are the ONLY approved chat interface components for the platform. Do not create alternative chat implementations. See `/CHAT_ARCHITECTURE.md` for architectural decisions and guidelines.

This directory contains portable chat interface components that can be embedded into any website with full support for TTS voice, real-time conversation, and telephony integration.

## Core Philosophy

StandardizedChatInterface and FloatingChatWidget provide everything needed for chat interactions, from simple customer Q&A to full-screen customer management systems. These components support:
- **Floating mode**: Positioned widget
- **Fixed mode**: Attached to a location
- **Fullscreen mode**: 100vh for dedicated pages with full business management capabilities

## Components

### StandardizedChatInterface

A flexible, full-featured chat interface with three distinct modes:

- **Customer Mode**: Public-facing customer chat
- **Owner Mode**: Business owner portal with settings, customer management, projects, and reports
- **Developer Mode**: Technical management interface for pages, apps, and agent deployment

**Features:**
- 100vh height support with responsive design
- Max width of 600px on desktop for optimal readability
- Mobile-responsive (adapts to phone screens)
- Mode switching capability
- Customizable colors, bot name, and messages
- Real-time chat with WebSocket support

**Usage:**

```tsx
import StandardizedChatInterface from '@/components/StandardizedChatInterface';

function MyPage() {
  return (
    <StandardizedChatInterface
      mode="customer"
      siteConfigId="your-site-id"
      botName="AI Assistant"
      fullscreen={true}
      allowModeSwitch={false}
    />
  );
}
```

**Props:**
- `mode`: "customer" | "owner" | "developer"
- `siteConfigId`: Optional site configuration ID
- `botName`: Name of the bot (default: "AI Biz Bot")
- `greetingMessage`: Custom greeting message
- `placeholderText`: Input placeholder text
- `primaryColor`: Custom primary color (hex)
- `allowModeSwitch`: Enable mode selector dropdown
- `onModeChange`: Callback when mode changes
- `fullscreen`: Enable fullscreen mode (100vh)

### FloatingChatWidget

An embeddable floating chat widget that appears in the bottom-right corner.

**Features:**
- Responsive design (mobile and desktop)
- Customizable appearance
- Auto-focus on open
- Message history
- Loading states

**Usage:**

```tsx
import FloatingChatWidget from '@/components/FloatingChatWidget';

function MyWebsite() {
  return (
    <div>
      {/* Your website content */}
      
      <FloatingChatWidget
        siteConfigId="your-site-id"
        botName="AI Assistant"
        greetingMessage="Hi! How can I help you today?"
        placeholderText="Ask me anything..."
        primaryColor="#6366f1"
      />
    </div>
  );
}
```

**Props:**
- `siteConfigId`: Optional site configuration ID
- `botName`: Name of the bot (default: "AI Assistant")
- `greetingMessage`: Custom greeting message
- `placeholderText`: Input placeholder text
- `primaryColor`: Custom primary color (hex)

## Integration Points

### Already Integrated:
- ✅ Google Maps/Places API - Business location and details lookup
- ✅ Google Workspace - Calendar, Drive, Tasks, Docs integration
- ✅ Twilio Telephony - SMS and voice call support
- ✅ TTS Voice - Gemini 2.5 Flash
- ✅ Real-time Chat - WebSocket-based communication
- ✅ AI Biz Bot - Intelligent assistant with context awareness

## Routes

### Public Routes:
- `/chat-showcase` - Documentation and demo showcase
- `/chat/customer` or `/interface/customer` - Customer chat interface
- `/interface/owner` - Business owner portal (demo)
- `/interface/developer` - Developer interface (demo)

### Protected Routes (Authentication Required):
- `/chat/owner` - Business owner portal (actual use)
- `/chat/developer` - Developer interface (actual use)

## Embedding in HTML

For non-React websites, use the gateway-chat.js SDK:

```html
<!-- Add this to your website -->
<div id="gateway-chat-widget"></div>
<script src="https://your-domain.com/gateway-chat.js"></script>
<script>
  GatewayChat.init({
    containerId: 'gateway-chat-widget',
    siteConfigId: 'your-site-id',
    botName: 'AI Assistant',
    primaryColor: '#6366f1',
    position: 'bottom-right',
  });
</script>
```

## Customization

All components support:
- Custom brand colors
- Custom bot names
- Custom greeting messages
- Custom placeholder text
- Theme customization (dark mode built-in)

## Examples

See `/chat-showcase` for live examples and code snippets.

## Technical Details

### Responsive Behavior:
- **Mobile**: Full width, height: min(100vh - 5rem, 700px)
- **Desktop**: Max width 600px, height: min(100vh - 3rem, 800px)

### Mode-Specific Features:

**Customer Mode:**
- Simple chat interface
- Business inquiries
- Product information
- Customer support

**Owner Mode:**
- Settings management (Google Workspace, Telephony, Billing)
- Customer tracking (Contacts, Inquiries, Orders, Appointments)
- Project management (Projects/Tasks)
- AI-generated reports

**Developer Mode:**
- Technical management
- Create pages and apps
- Deploy agents (Telephony, Task Automation)
- API integrations (Google Maps, Places API, MCP Server)

## API Endpoint

The chat interfaces communicate with:
- `POST /api/website-chat` - Send messages and receive responses

Request payload:
```json
{
  "message": "user message",
  "siteConfigId": "site-id",
  "visitorId": "unique-visitor-id",
  "history": [...],
  "mode": "customer" | "owner" | "developer"
}
```

Response:
```json
{
  "response": "assistant response"
}
```

## License

MIT License
