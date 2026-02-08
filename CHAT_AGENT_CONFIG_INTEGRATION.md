# Chat Config ↔ Agent Config Integration

## Overview

This document establishes the bidirectional communication between:
1. **Agent Configs** (created in Agent Dashboard) - Database table `agents`
2. **Site Configs** (website chat configurations) - Database table `site_configs`
3. **SDK Chat Widget** (runtime configuration via OTP admin panel) - Frontend SDK

## Current Schema Structure

### Agents Table
```typescript
// Database: agents table
interface Agent {
  id: string;
  name: string;                    // Agent name
  voiceId: string;                 // Voice identifier
  voiceName: string;               // Voice display name
  status: string;                  // active, paused, inactive
  dominance: number;               // DISC D (0-100)
  influence: number;               // DISC I (0-100)
  steadiness: number;              // DISC S (0-100)
  conscientiousness: number;       // DISC C (0-100)
  avatarId: string;                // Avatar for chat
  systemPrompt: string;            // AI behavior instructions
  phoneNumber: string;             // Telephony number
  phoneSid: string;                // Twilio SID
  aiModelProvider: string;         // moonshot, openai, etc.
  aiModelId: string;               // Specific model
  aiTemperature: number;           // 0-100 (divide by 100)
  aiMaxTokens: number;             // Token limit
  createdAt: Date;
  updatedAt: Date;
}
```

### Site Configs Table
```typescript
// Database: site_configs table
interface SiteConfig {
  id: string;
  ownerId: string;                 // Customer account
  name: string;                    // Site name
  domain: string;                  // Website domain
  placeId: string;                 // Google Places ID
  placeData: object;               // Google Places data
  assignedAgentId: string;         // Links to Agent.id ⭐
  botTemplateId: string;           // Template reference
  systemPromptOverride: string;    // Custom prompt
  modelProvider: string;           // kimi, openai
  modelName: string;               // Model identifier
  chatbotEnabled: boolean;         // Enable chat widget
  voiceConciergeEnabled: boolean;  // Enable voice
  widgetPosition: string;          // bottom-right, etc.
  widgetColor: string;             // Hex color
  greetingMessage: string;         // Chat greeting
  placeholderText: string;         // Input placeholder
  createdAt: Date;
  updatedAt: Date;
}
```

### SDK Chat Widget Config
```typescript
// Frontend: GatewayChatConfig (SDK)
interface GatewayChatConfig {
  botId: string;                   // Maps to SiteConfig.id or Agent.id
  apiBase: string;
  position: string;                // Widget position
  theme: {
    primaryColor: string;          // Brand color
    chatBackground: string;
    headerBackground: string;
    // ... other theme props
  };
  voice: {
    enabled: boolean;
    visualizerStyle: string;
  };
  botName: string;                 // Display name
  greetingMessage: string;
  placeholderText: string;
  botAvatar: string;               // Avatar URL
  width: string;
  height: string;
  // ... other config
}
```

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Dashboard                          │
│  (Create/Edit Agents with DISC, Voice, System Prompt)      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ Save to DB
                      ↓
┌─────────────────────────────────────────────────────────────┐
│              Database: agents table                         │
│  {id, name, voiceId, DISC, systemPrompt, avatarId, ...}   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ Referenced by assignedAgentId
                      ↓
┌─────────────────────────────────────────────────────────────┐
│           Database: site_configs table                      │
│  {id, assignedAgentId, widgetColor, widgetPosition, ...}   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ Loaded by SDK
                      ↓
┌─────────────────────────────────────────────────────────────┐
│              SDK Chat Widget (Frontend)                     │
│  Fetches: GET /api/bots/:botId/public                      │
│  Merges: Agent config + Site config + Local overrides      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ Admin changes via OTP panel
                      ↓
┌─────────────────────────────────────────────────────────────┐
│           Admin Config Panel (OTP Protected)                │
│  User adjusts: colors, size, voice, greeting              │
│  Saves to: localStorage + POST /api/chat/config/save      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ Updates database
                      ↓
┌─────────────────────────────────────────────────────────────┐
│         Database: site_configs table (updated)              │
│  widgetColor, widgetPosition, greetingMessage updated       │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints Required

### 1. Get Bot/Agent Configuration (Public)
```typescript
// GET /api/bots/:botId/public
// Returns merged configuration from agent + site config
app.get('/api/bots/:botId/public', async (req, res) => {
  const { botId } = req.params;
  
  // Try to find as site config first
  let siteConfig = await db.query.siteConfigs.findFirst({
    where: eq(siteConfigs.id, botId)
  });
  
  // If site config exists and has assigned agent, merge them
  if (siteConfig?.assignedAgentId) {
    const agent = await db.query.agents.findFirst({
      where: eq(agents.id, siteConfig.assignedAgentId)
    });
    
    return res.json({
      id: siteConfig.id,
      name: agent?.name || siteConfig.name,
      voiceId: agent?.voiceId,
      voiceName: agent?.voiceName,
      avatarId: agent?.avatarId,
      systemPrompt: siteConfig.systemPromptOverride || agent?.systemPrompt,
      ui_config: {
        primaryColor: siteConfig.widgetColor,
        position: siteConfig.widgetPosition,
        greetingMessage: siteConfig.greetingMessage,
        placeholderText: siteConfig.placeholderText,
        voiceEnabled: siteConfig.voiceConciergeEnabled,
        chatEnabled: siteConfig.chatbotEnabled,
      },
      disc_profile: agent ? {
        dominance: agent.dominance,
        influence: agent.influence,
        steadiness: agent.steadiness,
        conscientiousness: agent.conscientiousness,
      } : null,
      model: {
        provider: siteConfig.modelProvider || agent?.aiModelProvider,
        modelId: siteConfig.modelName || agent?.aiModelId,
        temperature: agent?.aiTemperature / 100 || 0.7,
        maxTokens: agent?.aiMaxTokens || 4096,
      }
    });
  }
  
  // Fallback: try as direct agent lookup
  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, botId)
  });
  
  if (agent) {
    return res.json({
      id: agent.id,
      name: agent.name,
      voiceId: agent.voiceId,
      voiceName: agent.voiceName,
      avatarId: agent.avatarId,
      systemPrompt: agent.systemPrompt,
      ui_config: {
        primaryColor: '#6366f1', // Default
        position: 'bottom-right',
        voiceEnabled: true,
        chatEnabled: true,
      },
      disc_profile: {
        dominance: agent.dominance,
        influence: agent.influence,
        steadiness: agent.steadiness,
        conscientiousness: agent.conscientiousness,
      }
    });
  }
  
  res.status(404).json({ error: 'Bot/Agent not found' });
});
```

### 2. Save Widget Configuration (Admin Only)
```typescript
// POST /api/chat/config/save
// Saves admin changes from OTP panel back to database
app.post('/api/chat/config/save', async (req, res) => {
  const { botId, userId, config, otpToken } = req.body;
  
  // Verify OTP token (production)
  // For dev: accept if token matches session
  
  // Update site config
  const siteConfig = await db.query.siteConfigs.findFirst({
    where: eq(siteConfigs.id, botId)
  });
  
  if (siteConfig) {
    await db.update(siteConfigs)
      .set({
        widgetColor: config.theme?.primaryColor,
        widgetPosition: config.position,
        greetingMessage: config.greetingMessage,
        placeholderText: config.placeholderText,
        voiceConciergeEnabled: config.voice?.enabled,
        updatedAt: new Date(),
      })
      .where(eq(siteConfigs.id, botId));
    
    // If config includes agent-level changes (name, voice, DISC)
    // Update the assigned agent
    if (siteConfig.assignedAgentId && config.agentChanges) {
      await db.update(agents)
        .set({
          name: config.agentChanges.name,
          voiceId: config.agentChanges.voiceId,
          voiceName: config.agentChanges.voiceName,
          dominance: config.agentChanges.dominance,
          influence: config.agentChanges.influence,
          steadiness: config.agentChanges.steadiness,
          conscientiousness: config.agentChanges.conscientiousness,
          updatedAt: new Date(),
        })
        .where(eq(agents.id, siteConfig.assignedAgentId));
    }
    
    return res.json({ success: true, message: 'Configuration saved' });
  }
  
  res.status(404).json({ error: 'Configuration not found' });
});
```

### 3. Create Site Config with Agent Assignment
```typescript
// POST /api/site-configs
// Create a new site config and optionally create/assign an agent
app.post('/api/site-configs', async (req, res) => {
  const {
    name,
    domain,
    placeId,
    createAgent, // Boolean: should we create a new agent?
    agentConfig, // Agent configuration if createAgent=true
    assignExistingAgentId, // Or assign existing agent
    widgetConfig, // Widget appearance settings
  } = req.body;
  
  let assignedAgentId = assignExistingAgentId;
  
  // Create new agent if requested
  if (createAgent && agentConfig) {
    const [newAgent] = await db.insert(agents).values({
      name: agentConfig.name,
      voiceId: agentConfig.voiceId,
      voiceName: agentConfig.voiceName,
      dominance: agentConfig.disc.dominance,
      influence: agentConfig.disc.influence,
      steadiness: agentConfig.disc.steadiness,
      conscientiousness: agentConfig.disc.conscientiousness,
      systemPrompt: agentConfig.systemPrompt,
      status: 'active',
    }).returning();
    
    assignedAgentId = newAgent.id;
  }
  
  // Create site config
  const [siteConfig] = await db.insert(siteConfigs).values({
    ownerId: req.user?.id,
    name,
    domain,
    placeId,
    assignedAgentId,
    widgetColor: widgetConfig?.color || '#6366f1',
    widgetPosition: widgetConfig?.position || 'bottom-right',
    greetingMessage: widgetConfig?.greeting,
    placeholderText: widgetConfig?.placeholder || 'Type a message...',
    chatbotEnabled: true,
    voiceConciergeEnabled: widgetConfig?.voiceEnabled ?? true,
  }).returning();
  
  res.json({
    siteConfig,
    embedCode: generateEmbedCode(siteConfig.id),
  });
});

function generateEmbedCode(siteConfigId: string) {
  return `<script
  src="${process.env.PUBLIC_URL}/sdk/gateway-chat.js"
  data-bot-id="${siteConfigId}"
  data-color="#6366f1"
></script>`;
}
```

## SDK Integration Changes

### Update SDK to Respect Agent Configuration

```javascript
// In gateway-chat.js
function fetchBotConfig() {
  return fetch(apiBase + '/api/bots/' + botId + '/public')
    .then(function (r) { return r.ok ? r.json() : Promise.reject(r); })
    .then(function (data) {
      serverConfig = data;
      
      // Merge server config into local config
      // Server config takes precedence unless locally overridden
      if (!config.theme && data.ui_config) {
        config.theme = {
          primaryColor: data.ui_config.primaryColor
        };
      }
      
      if (!config.botName && data.name) {
        config.botName = data.name;
      }
      
      if (!config.greetingMessage && data.ui_config?.greetingMessage) {
        config.greetingMessage = data.ui_config.greetingMessage;
      }
      
      if (!config.placeholderText && data.ui_config?.placeholderText) {
        config.placeholderText = data.ui_config.placeholderText;
      }
      
      if (!config.position && data.ui_config?.position) {
        config.position = data.ui_config.position;
      }
      
      if (!config.voice?.enabled && data.ui_config?.voiceEnabled) {
        config.voice = { enabled: data.ui_config.voiceEnabled };
      }
      
      // Store DISC profile for advanced features
      if (data.disc_profile) {
        config.discProfile = data.disc_profile;
      }
      
      // Apply theme immediately
      applyTheme(hostEl, config.theme);
      
      return data;
    })
    .catch(function (err) {
      console.warn('Failed to fetch bot config:', err);
      serverConfig = { name: 'Assistant', ui_config: {} };
      return serverConfig;
    });
}
```

### Admin Panel Save Integration

```javascript
// In admin settings panel save handler
function saveSettings(newConfig) {
  // Determine what's changed
  const changes = {
    theme: {
      primaryColor: newConfig.theme?.primaryColor
    },
    position: newConfig.position,
    greetingMessage: newConfig.greetingMessage,
    placeholderText: newConfig.placeholderText,
    voice: {
      enabled: newConfig.voice?.enabled,
      visualizerStyle: newConfig.voice?.visualizerStyle
    },
    width: newConfig.width,
    height: newConfig.height,
  };
  
  // Save to server
  fetch(apiBase + '/api/chat/config/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      botId: config.botId,
      config: changes,
      otpToken: currentOTPToken, // From successful OTP verification
    })
  })
  .then(function(r) {
    if (!r.ok) throw new Error('Failed to save');
    return r.json();
  })
  .then(function(data) {
    // Update local config
    Object.assign(config, newConfig);
    
    // Save to localStorage as backup
    try {
      localStorage.setItem('gw-config-' + config.botId, JSON.stringify(changes));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
    
    // Apply theme changes
    applyTheme(hostEl, config.theme);
    if (config.width) hostEl.style.setProperty('--gw-width', config.width);
    if (config.height) hostEl.style.setProperty('--gw-height', config.height);
    
    // Return to customer view
    backToCustomer();
    
    alert('Settings saved successfully!');
  })
  .catch(function(err) {
    console.error('Failed to save settings:', err);
    alert('Failed to save settings. Changes saved locally only.');
    
    // Still apply locally even if server save failed
    Object.assign(config, newConfig);
    applyTheme(hostEl, config.theme);
    backToCustomer();
  });
}
```

## Configuration Priority (Cascade)

When loading chat widget configuration, the priority order is:

```
1. Local Admin Overrides (OTP panel changes in localStorage)
   ↓
2. Site Config Database Values (site_configs table)
   ↓
3. Assigned Agent Defaults (agents table via assignedAgentId)
   ↓
4. SDK Default Values (hardcoded in gateway-chat.js)
```

Example:
```javascript
function getEffectiveConfig() {
  return {
    // 1. Try localStorage (admin override)
    botName: localStorage.getItem('gw-botName-' + botId) 
      // 2. Try site config
      || siteConfig?.name
      // 3. Try agent config
      || agent?.name
      // 4. Use default
      || 'AI Assistant',
    
    primaryColor: localStorage.getItem('gw-color-' + botId)
      || siteConfig?.widgetColor
      || agent?.brandColor
      || '#6366f1',
      
    // Voice uses agent config primarily
    voiceId: agent?.voiceId || 'default',
    voiceName: agent?.voiceName || 'Assistant Voice',
    
    // DISC comes from agent only
    discProfile: agent ? {
      dominance: agent.dominance,
      influence: agent.influence,
      steadiness: agent.steadiness,
      conscientiousness: agent.conscientiousness,
    } : null,
  };
}
```

## Onboarding Integration

During the onboarding flow, the 6-step process creates both agent and site config:

```javascript
// Step 6: Complete Onboarding
async function completeOnboarding(onboardingData) {
  // Create agent with configured personality
  const agentResponse = await fetch('/api/agents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: onboardingData.agentName,
      voiceId: onboardingData.voiceId,
      voiceName: onboardingData.voiceName,
      dominance: onboardingData.disc.dominance,
      influence: onboardingData.disc.influence,
      steadiness: onboardingData.disc.steadiness,
      conscientiousness: onboardingData.disc.conscientiousness,
      systemPrompt: onboardingData.systemPrompt,
    })
  });
  
  const agent = await agentResponse.json();
  
  // Create site config linked to agent
  const siteConfigResponse = await fetch('/api/site-configs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: onboardingData.businessName,
      domain: onboardingData.domain,
      placeId: onboardingData.placeId,
      assignedAgentId: agent.id, // Link to agent
      widgetColor: onboardingData.selectedColor,
      widgetPosition: 'bottom-right',
      greetingMessage: onboardingData.greeting,
      chatbotEnabled: true,
      voiceConciergeEnabled: onboardingData.voiceEnabled,
    })
  });
  
  const siteConfig = await siteConfigResponse.json();
  
  // Return both IDs for dashboard
  return {
    agentId: agent.id,
    siteConfigId: siteConfig.id,
    embedCode: generateEmbedCode(siteConfig.id),
  };
}
```

## Testing the Integration

### Test Scenario 1: Create Agent → Assign to Site
1. Create agent in Agent Dashboard
2. Configure DISC, voice, system prompt
3. Create site config
4. Assign agent to site
5. Load SDK widget with siteConfigId
6. Verify agent's voice, DISC, and prompt are used

### Test Scenario 2: Admin Config Changes
1. Load chat widget
2. Click gear icon (OTP protected)
3. Enter "000000"
4. Change primary color, greeting message
5. Save changes
6. Verify database updated
7. Reload page - changes persist

### Test Scenario 3: Onboarding Flow
1. Complete 6-step onboarding
2. Creates both agent and site config
3. Loads dashboard with embed code
4. Widget uses all onboarding choices
5. Admin can still customize later

## Implementation Checklist

- [ ] Create `/api/bots/:botId/public` endpoint (merge agent + site)
- [ ] Create `/api/chat/config/save` endpoint (save admin changes)
- [ ] Update SDK `fetchBotConfig()` to merge configs
- [ ] Add config priority cascade logic
- [ ] Implement localStorage backup for admin overrides
- [ ] Add agent assignment to site config creation
- [ ] Update onboarding to create both agent and site
- [ ] Test config changes persist across page reloads
- [ ] Verify DISC profile flows to chat behavior
- [ ] Test voice selection reflects in widget

## Conclusion

This integration ensures that:
✅ Agent configurations (DISC, voice, prompts) flow seamlessly to chat widgets
✅ Site-specific customizations (colors, position) override defaults
✅ Admin can adjust settings without touching code
✅ Changes persist in database and sync across sessions
✅ Clear hierarchy: localStorage > Site Config > Agent Config > Defaults
✅ Onboarding creates fully integrated agent + site setup
