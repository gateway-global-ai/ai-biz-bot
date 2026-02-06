# Chat Interface Architecture Decision

## Decision

**We are committing to `StandardizedChatInterface` and `FloatingChatWidget` as the ONLY base chat interface components for all customer-facing and business-facing chat interactions.**

## Context

The platform previously had multiple inconsistent chat interface implementations across different pages. This led to:
- Duplicated code
- Inconsistent user experiences
- Difficult maintenance
- Feature disparity between different chat interfaces

## The Solution

We have implemented two core chat components that support ALL chat use cases:

### 1. StandardizedChatInterface
**Purpose:** Full-featured chat interface with support for:
- **Floating mode** (can be positioned as needed)
- **Fixed mode** (attached to a specific location)
- **Fullscreen mode** (100vh, optimal for dedicated chat pages)

**Three Built-in Modes:**
- **Customer Mode**: Public-facing customer chat with simple Q&A
- **Owner Mode**: Business owner portal with tabs for Settings, Customers, Projects, and Reports
- **Developer Mode**: Technical interface for page creation, app deployment, and agent management

**Key Features:**
- Responsive design (mobile and desktop optimized)
- Mode switching capability
- Customizable colors, greetings, and placeholders
- Real-time chat with WebSocket support
- Max-width constraints (600px) for readability
- Proper height handling for all screen sizes

### 2. FloatingChatWidget
**Purpose:** Embeddable floating widget that appears in the bottom-right corner

**Features:**
- Lightweight and portable
- Easy integration into any website
- Responsive design
- Auto-focus on open
- Message history
- Loading states

## Usage Guidelines

### ✅ DO: Use StandardizedChatInterface or FloatingChatWidget

**For customer-facing chat:**
```tsx
import StandardizedChatInterface from '@/components/StandardizedChatInterface';

<StandardizedChatInterface
  mode="customer"
  siteConfigId="your-site-id"
  botName="AI Assistant"
  fullscreen={true}
/>
```

**For floating widget:**
```tsx
import FloatingChatWidget from '@/components/FloatingChatWidget';

<FloatingChatWidget
  siteConfigId="your-site-id"
  botName="AI Assistant"
  primaryColor="#6366f1"
/>
```

**For business owner portal:**
```tsx
<StandardizedChatInterface
  mode="owner"
  siteConfigId="owner-portal"
  fullscreen={true}
  allowModeSwitch={true}
/>
```

### ❌ DO NOT: Create new custom chat interfaces

Do NOT create new chat interface components from scratch. If you need custom functionality:

1. **First, try to use props** - `StandardizedChatInterface` supports extensive customization through props
2. **If props aren't enough**, extend the component through composition (wrap it)
3. **Only as a last resort**, propose adding new props to the base component

### Special Cases

There are exactly TWO specialized chat implementations that serve specific admin/agent purposes:

1. **AgentChat** (`/chat/:agentId`)
   - Purpose: Direct chat with a specific AI agent (with avatar, voice, sharing)
   - Use case: Public shareable links to individual agents
   - Not for general use - internal admin tool

2. **CommandChat** (`/command-chat`)
   - Purpose: Admin command interface with agent selection and quick actions
   - Use case: Business operators managing multiple agents
   - Not for general use - internal admin tool

These are acceptable because they serve DISTINCT purposes and are not customer-facing chat interfaces.

## Migration Path

If you find yourself maintaining or updating an old chat interface:

1. **Evaluate**: Can this be replaced with `StandardizedChatInterface`?
2. **Refactor**: If yes, migrate to use the standardized component
3. **Document**: If no (truly special case), document WHY it needs custom implementation
4. **Review**: Get architectural review before creating any new chat interface

## Benefits of This Decision

1. **Consistency**: All customer chats look and feel the same
2. **Maintainability**: Bug fixes and features added once benefit all interfaces
3. **Portability**: Easy to embed chat anywhere with consistent behavior
4. **Scalability**: Can expand from simple chatbot to full customer management system
5. **Developer Experience**: Clear pattern to follow, less decision fatigue

## Implementation Status

### ✅ Using StandardizedChatInterface
- `/chat/customer` - CustomerChatInterface
- `/chat/owner` - OwnerChatInterface  
- `/chat/developer` - DeveloperChatInterface
- `/interface/customer` - CustomerChatInterface (alt route)
- `/interface/owner` - OwnerChatInterface (alt route)
- `/interface/developer` - DeveloperChatInterface (alt route)
- `/chat-showcase` - ChatEmbedShowcase (documentation)

### ✅ Using FloatingChatWidget
- Available for embedding in any website
- Documented in `/chat-showcase`

### ⚠️ Specialized (Not for General Use)
- `/chat/:agentId` - AgentChat (agent-specific features)
- `/command-chat` - CommandChat (admin interface)

### 🎓 Domain-Specific (Different Purpose)
- `/classroom/*` - ImmersiveClassroom (educational tool, not chat)

## Future Considerations

If new requirements emerge that can't be met by the current components:

1. **Evaluate**: Does this truly need a new component, or can we extend the existing ones?
2. **Propose**: Create an ADR (Architecture Decision Record) explaining the need
3. **Discuss**: Team review before implementation
4. **Implement**: If approved, update this document

## Conclusion

**StandardizedChatInterface and FloatingChatWidget are sufficient for all customer-facing and business-facing chat needs. No new chat interface implementations should be created without architectural review and explicit justification.**

This architectural decision transforms our chatbot from a simple Q&A tool into a platform that can expand to handle full customer management systems through the fullscreen Owner and Developer modes.
