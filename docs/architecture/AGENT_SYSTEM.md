# Agent System Documentation

**Chat-first control and KB:** For how agents are controlled from the in-chat menu, how system prompts are compiled from structured controls, and how Knowledge Base artifacts and session keys work, see [CHAT_AND_AGENT_CONTROL.md](./CHAT_AND_AGENT_CONTROL.md).

## Overview

The Gateway Global AI Agent System is a comprehensive framework for managing AI-powered agents across multiple communication channels. The system supports agent swarms, intelligent routing, and automatic business analysis to optimize agent performance.

## Core Concepts

### 1. Agent Templates

Pre-configured agent blueprints optimized for specific communication modals:
- **Voice Inbound** - Handles incoming phone calls
- **Voice Outbound** - Makes outbound calls for lead qualification
- **SMS** - Manages text message conversations
- **Chat** - Powers website chat interactions

### 2. Agent Instances

Deployed agents based on templates, customized for specific businesses.

### 3. Agent Swarms

Groups of agents working together, managed by the AI Biz Bot orchestrator.

### 4. Routing Rules

Logic for directing conversations to the most appropriate agent.

---

## Default Agent Templates

### Voice Inbound Agent

**Purpose:** Handle incoming customer calls with professional service

**Capabilities:**
- Answer questions about products/services
- Schedule appointments
- Collect contact information
- Route to human agents when needed
- Handle voicemail

**Configuration:**
```typescript
{
  modal: 'voice-inbound',
  voiceSettings: {
    provider: 'kimi',
    voice: 'professional-female',
    speed: 1.0,
    language: 'en-US'
  },
  telephonySettings: {
    maxCallDuration: 600, // 10 minutes
    recordCalls: true,
    voicemailEnabled: true
  }
}
```

**Default System Prompt:** Professional customer service agent with warm, helpful demeanor. Focuses on quickly identifying needs and providing accurate information.

---

### Voice Outbound Agent

**Purpose:** Make outbound calls for lead qualification and follow-ups

**Capabilities:**
- Qualify leads with targeted questions
- Schedule appointments/demos
- Handle objections professionally
- Leave effective voicemails
- Update CRM with outcomes

**Configuration:**
```typescript
{
  modal: 'voice-outbound',
  voiceSettings: {
    provider: 'kimi',
    voice: 'professional-male',
    speed: 1.0
  },
  telephonySettings: {
    maxCallDuration: 300, // 5 minutes
    recordCalls: true
  }
}
```

**Default System Prompt:** Professional outbound agent focused on value delivery. Respects prospect's time, asks permission, handles rejection gracefully.

---

### SMS Agent

**Purpose:** Handle text message conversations efficiently

**Capabilities:**
- Quick responses (< 160 characters)
- Keyword detection and auto-response
- Appointment scheduling
- Handle common requests (hours, location, pricing)
- Escalate to phone when needed

**Configuration:**
```typescript
{
  modal: 'sms',
  smsSettings: {
    autoReply: true,
    maxMessageLength: 160,
    keywordTriggers: ['HOURS', 'LOCATION', 'PRICE', 'BOOK', 'HELP', 'STOP']
  }
}
```

**Default System Prompt:** Conversational but professional SMS agent. Keeps messages brief and clear, uses proper grammar, provides immediate value.

---

### Chat Agent

**Purpose:** Power website chat with engaging, helpful responses

**Capabilities:**
- Answer product/service questions
- Collect lead information
- Guide website navigation
- Schedule appointments
- Create support tickets
- Escalate to humans

**Configuration:**
```typescript
{
  modal: 'chat',
  chatSettings: {
    responseDelay: 1000, // 1 second typing simulation
    typingIndicator: true,
    suggestedReplies: true,
    maxHistoryLength: 50
  }
}
```

**Default System Prompt:** Friendly chat assistant with conversational style. Uses formatting for readability, asks one question at a time, guides users effectively.

---

## Agent Swarm Management

### Creating a Swarm

```typescript
// API Call
POST /api/swarms
{
  "businessId": "biz-123",
  "name": "Acme Corp Main Swarm",
  "description": "Primary agent swarm for customer interactions",
  "managerAgentId": "ai-biz-bot-1"
}
```

### Deploying Agents

```typescript
// Deploy chat agent
POST /api/agents/deploy
{
  "templateId": "default-chat",
  "businessId": "biz-123",
  "name": "Acme Chat Agent",
  "customConfiguration": {
    "behaviorSettings": {
      "greeting": "Welcome to Acme Corp! How can I help you today?"
    }
  }
}
```

### Adding Agents to Swarm

```typescript
POST /api/swarms/{swarmId}/agents
{
  "agentId": "agent-123",
  "priority": 10,
  "roles": ["customer-support", "lead-capture"]
}
```

### Setting Up Routing Rules

```typescript
POST /api/swarms/{swarmId}/routing-rules
{
  "condition": "high urgency sales inquiry",
  "targetAgentId": "agent-outbound-1",
  "priority": 100
}
```

### Routing Messages

```typescript
POST /api/swarms/{swarmId}/route
{
  "messageType": "chat",
  "context": {
    "customerIntent": "purchase",
    "urgency": "high",
    "topic": "pricing"
  }
}

// Response: Returns the most appropriate agent
{
  "id": "agent-123",
  "name": "Sales Chat Agent",
  "modal": "chat",
  ...
}
```

---

## Business Research & SWOT Analysis

### Performing Deep Research

The AI Biz Bot performs comprehensive business analysis using Google Places data:

```typescript
POST /api/business-research
{
  "businessId": "biz-123",
  "name": "Acme Corp",
  "industry": "HVAC Services",
  "location": {
    "address": "123 Main St",
    "city": "Austin",
    "state": "TX",
    "zipCode": "78701"
  },
  "googlePlaceId": "ChIJ..."
}
```

### Research Components

1. **Google Places Data**
   - Business reviews and ratings
   - Photos and attributes
   - Hours and contact info

2. **Review Analysis**
   - Sentiment analysis
   - Common praises/complaints
   - Theme extraction

3. **Competitor Analysis**
   - Market positioning
   - Competitive strengths/weaknesses
   - Differentiators

4. **SWOT Analysis**
   - Strengths to emphasize
   - Weaknesses to address
   - Opportunities to pursue
   - Threats to mitigate

5. **Project Recommendations**
   - Prioritized improvement projects
   - Value opportunities
   - Specific action steps

6. **Agent Training Data**
   - Key messages
   - Common questions/answers
   - Unique selling propositions
   - Customer pain points

### Training Agents with Insights

```typescript
POST /api/business-research/train-agents
{
  "businessInsights": { /* Full insights object */ },
  "agentIds": ["agent-1", "agent-2", "agent-3", "agent-4"]
}
```

This updates each agent's system prompt with business-specific knowledge:
- What makes the business unique
- Common customer questions
- How to position services
- What to emphasize

---

## Quick Setup

Deploy all default agents for a business in one call:

```typescript
POST /api/agents/quick-setup
{
  "businessId": "biz-123",
  "businessName": "Acme Corp"
}

// Response: Full swarm with all 4 agents
{
  "swarm": { /* Swarm details */ },
  "agents": {
    "chat": { /* Chat agent */ },
    "voiceInbound": { /* Inbound agent */ },
    "voiceOutbound": { /* Outbound agent */ },
    "sms": { /* SMS agent */ }
  }
}
```

---

## Integration with Existing Systems

### Telephony (Twilio)

Agents automatically integrate with Twilio for voice and SMS:

```typescript
// Inbound call webhook
POST /api/twilio/voice
// Routes to voice-inbound agent

// SMS webhook  
POST /api/twilio/sms
// Routes to SMS agent
```

### Chat Interface

Use the StandardizedChatInterface component with agent routing:

```tsx
<StandardizedChatInterface
  mode="customer"
  botName="Acme Assistant"
  siteConfigId="acme-corp"
/>
```

The chat automatically routes to the appropriate agent based on context.

---

## Agent Configuration

### Updating Agent Settings

```typescript
PATCH /api/agents/{agentId}/configuration
{
  "configuration": {
    "behaviorSettings": {
      "greeting": "New greeting message",
      "businessHours": {
        "enabled": true,
        "schedule": [...]
      }
    }
  }
}
```

### Activating/Deactivating Agents

```typescript
PATCH /api/agents/{agentId}/status
{
  "isActive": false
}
```

### Updating Performance Metrics

```typescript
PATCH /api/agents/{agentId}/performance
{
  "performance": {
    "totalInteractions": 150,
    "successRate": 0.92,
    "averageResponseTime": 2.5,
    "customerSatisfaction": 4.6
  }
}
```

---

## AI Biz Bot Workflow

1. **Initial Site Build**
   - Deploy default agent swarm
   - Configure basic settings
   - Set up integrations

2. **Deep Research Phase**
   - Analyze Google Places data
   - Generate SWOT analysis
   - Identify opportunities

3. **Agent Training**
   - Update system prompts with insights
   - Configure responses based on business knowledge
   - Fine-tune for industry specifics

4. **Ongoing Management**
   - Monitor agent performance
   - Adjust routing rules
   - Refine based on outcomes

5. **Continuous Improvement**
   - Analyze interaction data
   - Update SWOT based on new info
   - Identify new project opportunities

---

## API Reference

### Agent Templates
- `GET /api/agents/templates` - List all templates
- `GET /api/agents/templates/:id` - Get template details

### Agent Instances
- `POST /api/agents/deploy` - Deploy new agent
- `GET /api/agents/business/:businessId` - List business agents
- `GET /api/agents/:id` - Get agent details
- `PATCH /api/agents/:id/configuration` - Update configuration
- `PATCH /api/agents/:id/status` - Activate/deactivate
- `PATCH /api/agents/:id/performance` - Update metrics

### Agent Swarms
- `POST /api/swarms` - Create swarm
- `GET /api/swarms/business/:businessId` - List business swarms
- `GET /api/swarms/:id` - Get swarm details
- `POST /api/swarms/:id/agents` - Add agent to swarm
- `POST /api/swarms/:id/routing-rules` - Add routing rule
- `POST /api/swarms/:id/route` - Route message to agent

### Business Research
- `POST /api/business-research` - Perform deep research
- `POST /api/business-research/train-agents` - Train agents with insights

### Quick Setup
- `POST /api/agents/quick-setup` - Deploy all default agents

---

## Best Practices

1. **Start with Default Templates**
   - Use provided templates as starting point
   - Customize incrementally based on needs

2. **Perform Business Research Early**
   - Run deep research after initial setup
   - Update agents with insights immediately

3. **Monitor Performance**
   - Track key metrics (response time, satisfaction)
   - Adjust based on real data

4. **Use Routing Rules Strategically**
   - Route high-value interactions to best agents
   - Have fallback rules for edge cases

5. **Keep System Prompts Updated**
   - Refresh with new business info regularly
   - Incorporate feedback from interactions

6. **Test Agent Responses**
   - Simulate various customer scenarios
   - Refine prompts based on outcomes

---

## Next Steps

- See [Widget System Documentation](./WIDGET_SYSTEM.md) for UI components
- See [Telephony Architecture](./TELEPHONY_ARCHITECTURE.md) for voice integration
- Review reference implementations in `/sdk/chat/reference-apps`
