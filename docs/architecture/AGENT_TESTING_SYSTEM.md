# Agent Testing & Orchestration System

## Overview

The Agent Testing & Orchestration System provides comprehensive testing, validation, and real-time orchestration visualization for all AI agents in the Gateway Global AI platform.

## Features

### 1. Specialized Agent Registry

All agents are now registered in the system and available for deployment:

#### Default Communication Agents
- **Voice Inbound Agent** - Handles incoming phone calls
- **Voice Outbound Agent** - Makes outbound calls for lead qualification
- **SMS Agent** - Manages text message conversations
- **Chat Agent** - Powers website chat interactions

#### Specialized Business & Technical Agents
- **Google Places SWOT Agent** - 5-minute startup auditor for local businesses
- **Travel Agency Dev Agent** - Developer relations for GRN Connect API
- **GitHub Repo Manager Agent** - Repository management and PR review
- **Google API Analyst Agent** - API optimization and cost analysis
- **AI Biz Bot** - Small business consultant and orchestrator
- **Coding Agent** - Advanced coding assistant
- **Classroom Agent** - Interactive learning assistant
- **Onboarding Agent** - User onboarding and setup guide
- **Task Demo Bot** - Feature demonstration and showcasing

### 2. Agent Testing Framework

Comprehensive validation of agent configurations:

#### What Gets Tested
- ✅ Configuration validity (modal-specific settings)
- ✅ System prompt presence and quality
- ✅ Capabilities definition
- ✅ Modal type validation
- ✅ Registry registration status

#### Test Results Include
- Pass/Fail/Warning status
- Detailed issue reports
- Configuration warnings
- Performance metrics
- Test execution time

### 3. Test Report Generation

Multiple report formats for different use cases:

#### JSON Report (`GET /api/agents/test`)
```json
{
  "summary": {
    "totalAgents": 13,
    "passed": 12,
    "failed": 0,
    "warnings": 1,
    "testDuration": 145
  },
  "results": [...]
}
```

#### Markdown Report (`GET /api/agents/test/report`)
- Human-readable format
- Downloadable for documentation
- Includes summary tables and detailed results

#### Text Report (`GET /api/agents/test/report/text`)
- Plain text format for logs
- Console-friendly output
- ASCII art formatting

### 4. Agent Orchestration Visualization

Real-time view of agent thinking and decision-making:

#### Thought Process Tracking
- **Thinking** - Agent analyzing the situation
- **Action** - Agent taking specific actions
- **Observation** - Agent noting results
- **Decision** - Agent making routing/response decisions

#### Visual Elements
- Active agent display with status badge
- Real-time thought process timeline
- Agent switching notifications
- Performance status indicators

### 5. Chat Preview with Orchestration

Integrated chat interface with live agent orchestration:

#### Features
- Split-screen layout (chat + orchestration)
- Real-time thought process display
- Available agents list
- Agent status monitoring
- Demo simulation controls

## API Endpoints

### Agent Templates
```
GET  /api/agents/templates         # List all agent templates
GET  /api/agents/templates/:id     # Get specific template
```

### Agent Instances
```
POST  /api/agents/deploy           # Deploy new agent
GET   /api/agents/business/:id     # List business agents
GET   /api/agents/:id              # Get agent details
PATCH /api/agents/:id/configuration # Update configuration
PATCH /api/agents/:id/status       # Activate/deactivate
```

### Agent Testing
```
GET /api/agents/test               # Run all tests (JSON)
GET /api/agents/test/report        # Get markdown report
GET /api/agents/test/report/text   # Get text report
GET /api/agents/test/:templateId   # Test specific template
GET /api/agents/:id/test           # Test deployed instance
```

### Agent Swarms
```
POST /api/swarms                   # Create swarm
GET  /api/swarms/business/:id      # List business swarms
POST /api/swarms/:id/agents        # Add agent to swarm
POST /api/swarms/:id/routing-rules # Add routing rule
POST /api/swarms/:id/route         # Route message to agent
```

## UI Pages

### Agent Testing Dashboard (`/agent-testing`)

Complete testing interface with:
- Summary cards (total, passed, failed, warnings)
- Detailed test results for each agent
- Test execution controls
- Download options (MD, TXT)
- Orchestration demo tab

### Chat Preview (`/agent-preview`)

Interactive preview showing:
- Live chat interface
- Real-time orchestration visualization
- Thought process timeline
- Available agents list
- Simulation controls

## Usage Examples

### Running Tests

```typescript
// Run all agent tests
const report = await fetch('/api/agents/test').then(r => r.json());

// Test specific agent
const result = await fetch('/api/agents/test/ai-biz-bot-agent').then(r => r.json());

// Download markdown report
window.open('/api/agents/test/report', '_blank');
```

### Deploying Specialized Agents

```typescript
// Deploy Google Places SWOT Agent
const agent = await apiRequest('POST', '/api/agents/deploy', {
  templateId: 'google-places-swot-agent',
  businessId: 'biz-123',
  name: 'Acme Corp SWOT Analyzer',
});

// Deploy AI Biz Bot
const bizBot = await apiRequest('POST', '/api/agents/deploy', {
  templateId: 'ai-biz-bot-agent',
  businessId: 'biz-123',
  name: 'Acme Corp Business Consultant',
});
```

### Creating Agent Swarm

```typescript
// Create swarm with specialized agents
const swarm = await apiRequest('POST', '/api/swarms', {
  businessId: 'biz-123',
  name: 'Complete Business Suite',
  managerAgentId: 'ai-biz-bot-instance-id',
});

// Add agents to swarm
await apiRequest('POST', `/api/swarms/${swarm.id}/agents`, {
  agentId: 'swot-agent-id',
  priority: 10,
  roles: ['business-analysis', 'swot-generation'],
});
```

## Testing Best Practices

1. **Run Tests Regularly**
   - Before deploying agents
   - After configuration changes
   - During development cycles

2. **Review Warnings**
   - Warnings don't fail tests but indicate potential issues
   - Address warnings to improve agent quality

3. **Monitor Performance**
   - Check test execution time
   - Review agent response patterns
   - Optimize configurations based on results

4. **Document Issues**
   - Save test reports for documentation
   - Track issue resolution over time
   - Share reports with team members

## Orchestration Best Practices

1. **Monitor Thought Process**
   - Review agent decision-making
   - Identify routing patterns
   - Optimize for efficiency

2. **Test Agent Switching**
   - Verify proper routing rules
   - Ensure smooth handoffs
   - Monitor context preservation

3. **Use Demo Controls**
   - Simulate scenarios before deployment
   - Test edge cases
   - Validate agent behavior

## Integration with Chat Interface

The orchestration visualization can be embedded in any chat interface:

```tsx
import ChatWithAgentPreview from '@/pages/ChatWithAgentPreview';

// In your component
<ChatWithAgentPreview 
  agentId="optional-agent-id"
  showThoughtProcess={true}
/>
```

## Future Enhancements

- [ ] Real-time WebSocket updates for thought process
- [ ] Agent performance analytics dashboard
- [ ] A/B testing for agent configurations
- [ ] Automated test scheduling
- [ ] Historical test result tracking
- [ ] Agent optimization recommendations
- [ ] Integration test suites
- [ ] Load testing capabilities

## Troubleshooting

### Tests Failing

1. Check system prompt is present and valid
2. Verify agent is registered in manager
3. Ensure configuration matches modal type
4. Review capability definitions

### Orchestration Not Showing

1. Verify agent is deployed and active
2. Check swarm configuration
3. Review routing rules
3. Ensure WebSocket connections (future)

### Agent Not Routing Correctly

1. Review routing rule priorities
2. Check condition matching logic
3. Verify agent modal types
4. Test with different contexts

## Support

For issues or questions:
- Review test reports for detailed error messages
- Check agent configuration documentation
- Test with the preview interface
- Contact development team for assistance

---

**Built with ❤️ by Gateway Global AI**
