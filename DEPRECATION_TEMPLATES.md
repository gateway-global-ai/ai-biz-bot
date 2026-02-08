# Repository Deprecation Notice Templates

These templates should be used to update the README files of deprecated repositories before archiving them.

---

## Template 1: gateway-global-ai-browser-chat

```markdown
# ⚠️ DEPRECATED - Gateway Global AI Browser Chat

## Deprecation Notice

**This repository has been deprecated and is no longer maintained.**

### Migration Path

All functionality from this repository has been consolidated into our primary platform:

**👉 [gateway-global-ai/chat-mvp-merge](https://github.com/gateway-global-ai/chat-mvp-merge)**

The chat-mvp-merge repository includes all features from this project plus:
- Enhanced chat interface with float/fix/expand modes
- Voice AI integration (Kimi-Audio)
- SMS business management
- Google Workspace integration
- VoiceLeadMachine for lead generation
- AI Biz Bot for website management

### Valuable Assets Preserved

The following features from this repository may have value and are being reviewed for integration:
- Travel agent related items
- GRN (Guest Relations Network) features
- Behavioral controls

### What This Means

- ❌ No new features will be added
- ❌ No bug fixes will be made
- ❌ Issues and pull requests are disabled
- ✅ Code remains available for reference
- ✅ Repository is archived for historical purposes

### Get Started with the New Platform

```bash
git clone https://github.com/gateway-global-ai/chat-mvp-merge.git
cd chat-mvp-merge
npm install
npm run dev
```

See the [README](https://github.com/gateway-global-ai/chat-mvp-merge/blob/main/README.md) for complete setup instructions.

### Questions?

- **Product Vision**: See [PRODUCT_VISION.md](https://github.com/gateway-global-ai/chat-mvp-merge/blob/main/PRODUCT_VISION.md)
- **GitHub Strategy**: See [GITHUB_STRATEGY.md](https://github.com/gateway-global-ai/chat-mvp-merge/blob/main/GITHUB_STRATEGY.md)
- **Support**: Create a discussion in [chat-mvp-merge](https://github.com/gateway-global-ai/chat-mvp-merge/discussions)

---

**Deprecated**: February 2026  
**Archived**: [Date]  
**Replaced By**: [chat-mvp-merge](https://github.com/gateway-global-ai/chat-mvp-merge)
```

---

## Template 2: ai-chat

```markdown
# ⚠️ DEPRECATED - AI Chat

## Deprecation Notice

**This repository has been deprecated and is no longer maintained.**

All chat functionality has been moved to:

**👉 [gateway-global-ai/chat-mvp-merge](https://github.com/gateway-global-ai/chat-mvp-merge)**

The new platform includes:
- Revolutionary chat interface (float/fix/expand modes)
- Multi-user types (Customer, Owner, Developer)
- Voice AI integration
- Real-time WebSocket communication
- Google Maps/Places integration
- Twilio telephony
- Much more!

### Migration

This repository is fully replaced by chat-mvp-merge. No migration is needed as this was a development prototype.

### Get Started

Visit [chat-mvp-merge](https://github.com/gateway-global-ai/chat-mvp-merge) for the production-ready platform.

---

**Deprecated**: February 2026  
**Replaced By**: [chat-mvp-merge](https://github.com/gateway-global-ai/chat-mvp-merge)
```

---

## Template 3: ai-task-manager-gateway-global

```markdown
# ⚠️ DEPRECATED - AI Task Manager

## Deprecation Notice

**This repository has been deprecated and is no longer maintained.**

Task management functionality has been integrated into:

**👉 [gateway-global-ai/chat-mvp-merge](https://github.com/gateway-global-ai/chat-mvp-merge)**

The new platform includes comprehensive task management through:
- Google Tasks integration
- AI-powered task creation and tracking
- 24-hour SMS task completion system
- Autonomous agents for task automation
- Customer relationship management

### What Happened?

All task management features have been consolidated into the main Gateway Global AI platform for better integration and user experience.

### Next Steps

Check out [chat-mvp-merge](https://github.com/gateway-global-ai/chat-mvp-merge) for the complete platform.

---

**Deprecated**: February 2026  
**Replaced By**: [chat-mvp-merge](https://github.com/gateway-global-ai/chat-mvp-merge)
```

---

## Template 4: serp-flights-server-gateway-global-ai

```markdown
# ⚠️ DEPRECATED - SERP Flights Server

## Deprecation Notice

**This repository has been deprecated and is no longer maintained.**

Flight search functionality is being redesigned for potential future integration in the travel vertical.

**Main Platform**: [gateway-global-ai/chat-mvp-merge](https://github.com/gateway-global-ai/chat-mvp-merge)

### Future Plans

Travel-related features, including flight search, will be integrated from the [travel-gateway-V1](https://github.com/gateway-global-ai/travel-gateway-V1) repository in Q3 2026.

See our [ROADMAP](https://github.com/gateway-global-ai/chat-mvp-merge/blob/main/ROADMAP.md) for details.

### Archive Status

This code is preserved for reference but is not actively maintained.

---

**Deprecated**: February 2026  
**Future Integration**: Q3 2026 (travel vertical)
```

---

## Template 5: workspace

```markdown
# ⚠️ DEPRECATED - Workspace

## Deprecation Notice

**This repository has been deprecated and is no longer maintained.**

Google Workspace integration has been fully implemented in:

**👉 [gateway-global-ai/chat-mvp-merge](https://github.com/gateway-global-ai/chat-mvp-merge)**

The new platform includes complete Google Workspace integration:
- **Google Drive**: File browser, upload, folder management
- **Google Calendar**: Event listing, creation, deletion
- **Google Tasks**: Task management with completion toggles
- **Google Docs**: Document creation and editing
- **Google Sheets**: Spreadsheet integration

### Better Integration

The workspace features are now deeply integrated with:
- AI Biz Bot for automated document creation
- Chat interface for workspace commands
- Admin dashboard for unified access
- Real-time synchronization

### Get Started

Visit the [Google Workspace Integration docs](https://github.com/gateway-global-ai/chat-mvp-merge/blob/main/docs/GOOGLE_WORKSPACE_INTEGRATION.md) in the main repository.

---

**Deprecated**: February 2026  
**Replaced By**: [chat-mvp-merge](https://github.com/gateway-global-ai/chat-mvp-merge)
```

---

## Archival Checklist

For each deprecated repository:

1. **Update README**
   - [ ] Add deprecation notice using appropriate template
   - [ ] Add archived badge: `[![Archived](https://img.shields.io/badge/status-archived-red)]()`
   - [ ] Link to chat-mvp-merge

2. **Repository Settings**
   - [ ] Disable issues
   - [ ] Disable pull requests
   - [ ] Disable wiki (if applicable)
   - [ ] Update repository description: "⚠️ DEPRECATED - See chat-mvp-merge"
   - [ ] Add topics: `deprecated`, `archived`, `migrated`

3. **GitHub Archive**
   - [ ] Archive repository (Settings → Danger Zone → Archive)
   - [ ] Confirm archival

4. **Documentation**
   - [ ] Update GITHUB_STRATEGY.md to mark as archived
   - [ ] Update organization .github profile

---

**Created**: February 7, 2026  
**Purpose**: Standardize deprecation notices across Gateway Global AI repositories
