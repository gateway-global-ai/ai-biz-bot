# Gateway Global AI - GitHub Repository Strategy

## Overview
This document outlines the GitHub repository organization strategy for Gateway Global AI as we prepare for our MVP launch. Our goal is to maintain a focused, maintainable codebase while establishing a foundation for future SDK development and community engagement.

## Repository Status

### Active Repositories

#### Primary Development Repository
**[chat-mvp-merge](https://github.com/gateway-global-ai/chat-mvp-merge)** - PRIMARY REPOSITORY
- **Status**: Active Development
- **Purpose**: Main platform for AI-powered business websites with integrated chat, voice AI, and autonomous agents
- **Key Features**:
  - AI website generation in 30 seconds
  - Voice AI and SMS integration via Twilio
  - Google Workspace integration (Drive, Calendar, Tasks, Docs, Sheets)
  - AI Biz Bot for website management and upselling
  - Outbound campaign tool for lead generation
  - Innovative chat interface (float, fix, expand modes)
  - DISC and ARCH agent controls
  - VoiceLeadMachine for automated outbound campaigns
- **Target Users**: Small business owners
- **Next Steps**: MVP launch preparation, documentation refinement, community engagement

#### Integration Pending
**[twilio-telephony-voice-ai](https://github.com/gateway-global-ai/twilio-telephony-voice-ai)**
- **Status**: Needs Integration
- **Purpose**: Twilio telephony integration for voice AI
- **Action Required**: Integrate with chat-mvp-merge and AI Biz Bot
- **Timeline**: Q1 2026

**[identity-verification-mcp-gateway-gobal-ai](https://github.com/gateway-global-ai/identity-verification-mcp-gateway-gobal-ai)**
- **Status**: Needs Integration
- **Purpose**: Authentication MCP server
- **Description**: Amazing MCP for authentication and identity verification
- **Action Required**: Integration planning and implementation
- **Timeline**: Q2 2026

**[travel-gateway-V1](https://github.com/gateway-global-ai/travel-gateway-V1)**
- **Status**: On Hold
- **Purpose**: Travel agent integration features
- **Action Required**: Hold for future travel integration capabilities
- **Timeline**: Post-MVP (Q3 2026+)

#### Organizational Repository
**[.github](https://github.com/gateway-global-ai/.github)**
- **Status**: Needs Update
- **Purpose**: Organization-wide GitHub profile and templates
- **Action Required**: Update with current MVP focus and branding
- **Timeline**: Immediate (Q1 2026)

### Deprecated Repositories

The following repositories have been marked as deprecated and will not be used in future development:

1. **[gateway-global-ai-browser-chat](https://github.com/gateway-global-ai/gateway-global-ai-browser-chat)**
   - **Status**: Deprecated
   - **Reason**: Functionality consolidated into chat-mvp-merge
   - **Potential Value**: Travel agent features, GRN, behavioral controls
   - **Action**: Archive repository, update README with deprecation notice

2. **[ai-chat](https://github.com/gateway-global-ai/ai-chat)**
   - **Status**: Deprecated
   - **Reason**: Replaced by chat-mvp-merge
   - **Action**: Archive repository, update README with deprecation notice

3. **[ai-task-manager-gateway-global](https://github.com/gateway-global-ai/ai-task-manager-gateway-global)**
   - **Status**: Deprecated
   - **Reason**: Task management consolidated into main platform
   - **Action**: Archive repository, update README with deprecation notice

4. **[serp-flights-server-gateway-global-ai](https://github.com/gateway-global-ai/serp-flights-server-gateway-global-ai)**
   - **Status**: Deprecated
   - **Reason**: Functionality no longer needed
   - **Action**: Archive repository, update README with deprecation notice

5. **[workspace](https://github.com/gateway-global-ai/workspace)**
   - **Status**: Deprecated
   - **Reason**: Google Workspace integration moved to chat-mvp-merge
   - **Action**: Archive repository, update README with deprecation notice

## Future SDK Strategy

### Developer Community Engagement
As we approach MVP launch, we will establish a clear SDK development roadmap to enable the developer community to build on our platform.

#### Planned SDKs

1. **JavaScript/TypeScript SDK** (Q2 2026)
   - Purpose: Frontend integration for chat interfaces
   - Features: Embeddable chat widgets, voice controls, customization
   - Target: Web developers building AI-powered websites
   - Repository: `gateway-global-ai/sdk-javascript` (to be created)

2. **REST API SDK** (Q2 2026)
   - Purpose: Backend integration for business logic
   - Features: Agent management, telephony, Google Workspace integration
   - Documentation: OpenAPI/Swagger specification
   - Repository: `gateway-global-ai/sdk-rest-api` (to be created)

3. **Python SDK** (Q3 2026)
   - Purpose: AI agent development and automation
   - Features: Custom agent creation, workflow automation, data analysis
   - Target: Data scientists and AI developers
   - Repository: `gateway-global-ai/sdk-python` (to be created)

4. **Mobile SDKs** (Q4 2026)
   - iOS SDK: Swift package for native iOS integration
   - Android SDK: Kotlin/Java library for Android apps
   - Purpose: Native mobile chat and voice experiences
   - Repositories: `gateway-global-ai/sdk-ios`, `gateway-global-ai/sdk-android`

### SDK Development Principles

1. **Open Source First**: All SDKs will be open source (MIT License)
2. **Documentation Driven**: Comprehensive docs before code
3. **Developer Experience**: Focus on ease of use and quick integration
4. **Backwards Compatibility**: Semantic versioning and deprecation notices
5. **Community Engagement**: Accept contributions, maintain public roadmap

## Repository Naming Conventions

### Current Standard
- Primary platform: `chat-mvp-merge`
- Feature-specific: `feature-name` (e.g., `twilio-telephony-voice-ai`)
- SDK repositories: `sdk-language` (e.g., `sdk-javascript`, `sdk-python`)
- MCP servers: `functionality-mcp-gateway-global-ai`

### Future Conventions
Going forward, new repositories should follow these patterns:
- SDKs: `sdk-{language}` or `sdk-{platform}`
- Tools: `{tool-name}-{platform}` (e.g., `cli-tools`, `dev-tools`)
- Examples: `examples-{sdk-name}` (e.g., `examples-javascript`)
- Documentation: `docs-{topic}` (e.g., `docs-api-reference`)

## Branch Strategy

### Main Repository (chat-mvp-merge)
- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - Feature development branches
- `hotfix/*` - Production bug fixes
- `copilot/*` - AI-assisted development branches

See [BRANCH_GUIDE.md](./BRANCH_GUIDE.md) for detailed workflow.

## Archival Process

For deprecated repositories:
1. Update README with deprecation notice and link to replacement
2. Add archived badge to README
3. Disable issues and pull requests
4. Archive repository on GitHub
5. Update organization .github profile to reflect changes

## Communication Plan

### Internal Team
- Weekly sync on repository status
- Monthly review of integration roadmap
- Quarterly strategic planning for SDK releases

### Developer Community
- Launch announcement with SDK roadmap
- Monthly developer updates via GitHub Discussions
- Quarterly developer surveys for feedback
- Annual developer conference (post-launch)

## Success Metrics

### Repository Health
- Code coverage >80% for all SDKs
- Response time <24 hours for issues
- Pull request review time <48 hours
- Documentation completeness score >90%

### Community Engagement
- GitHub stars growth rate
- SDK download/usage statistics
- Community contributions (PRs, issues)
- Developer satisfaction scores

## Next Steps

### Immediate (Q1 2026)
1. ✅ Update chat-mvp-merge README with MVP focus
2. ✅ Create GITHUB_STRATEGY.md (this document)
3. ✅ Create PRODUCT_VISION.md
4. [ ] Update .github repository with new branding
5. [ ] Create deprecation READMEs for archived repos
6. [ ] Archive deprecated repositories

### Short-term (Q2 2026)
1. [ ] Launch MVP platform
2. [ ] Create JavaScript/TypeScript SDK
3. [ ] Publish REST API documentation
4. [ ] Set up GitHub Discussions for community
5. [ ] Create developer onboarding guide

### Medium-term (Q3 2026)
1. [ ] Release Python SDK
2. [ ] Integrate travel-gateway-V1 features
3. [ ] Launch developer portal
4. [ ] Host first developer webinar

### Long-term (Q4 2026+)
1. [ ] Release mobile SDKs
2. [ ] Expand MCP server ecosystem
3. [ ] Launch developer marketplace
4. [ ] First annual developer conference

---

**Last Updated**: February 7, 2026  
**Document Owner**: Gateway Global AI Team  
**Review Cycle**: Monthly
