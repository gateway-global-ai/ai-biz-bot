# Google Workspace Integration - AI Biz Bot

## Overview

This integration provides a revolutionary approach to business automation by combining:
- **Self-serve research** using Google Places API
- **AI-powered SWOT analysis**
- **Conversational customization** with AI Biz Bot
- **Personalized Google Workspace setup** (no generic templates)

## Philosophy

Traditional business software forces you into one-size-fits-all templates. We do the opposite:

1. **Research Your Business**: Automatically gather data from Google Places
2. **Analyze Your Needs**: AI performs comprehensive SWOT analysis
3. **Have a Conversation**: AI Biz Bot speaks with you to understand YOUR specific workflow
4. **Build Custom Tools**: Generate personalized workspace, tools, and automations based on the conversation

Every business is unique. Every solution should be too.

## Workflow

### 1. SWOT Analysis Completion
When a business completes their SWOT analysis (via Google Places data or manual input):

```
POST /api/workspace/onboarding/swot-complete
{
  "businessId": "uuid",
  "swotAnalysisId": "uuid"
}
```

This triggers the workspace onboarding orchestrator.

### 2. Email Setup Decision Tree

The orchestrator presents two options:

**Option A: Hosted Email (@gatewayglobal.ai)**
- Creates professional email instantly
- Includes Google Workspace (Starter $8.40 or Standard $16.80/mo)
- Gateway Global handles setup and integration
- Perfect for businesses without existing email

**Option B: Integrated Email (Existing Account)**
- Connect your existing Google Workspace or Gmail
- OAuth-based secure permission granting
- Respects existing data and structure
- Perfect for established businesses

### 3. AI Biz Bot Consultation

After email setup, AI Biz Bot initiates a personalized consultation:

```
POST /api/workspace/consultation/start
{
  "businessId": "uuid",
  "businessName": "Your Business",
  "swotAnalysisId": "uuid",
  "workspaceConfigId": "uuid"
}
```

**Sample Conversation:**

```
AI Biz Bot: "Hi! I've completed your SWOT analysis and see that customer 
service is your strength. How do you currently track customer interactions?"

Owner: "We use a notebook and sometimes forget to follow up."

AI Biz Bot: "I can create a custom customer tracking spreadsheet with 
automated reminders. What information do you need to track for each customer?"

Owner: "Name, phone, service needed, follow-up date, and status."

AI Biz Bot: "Perfect! I'll also set up a task automation that creates 
follow-up tasks automatically. Your SWOT showed opportunity in digital 
marketing - do you have a process for tracking leads from different sources?"

Owner: "Not really, they just call or walk in."

AI Biz Bot: "Let me create a lead source tracker with Google Forms integration. 
When someone contacts you, you can quickly log where they found you. This will 
help you understand which marketing works best..."
```

### 4. Customization Analysis

When the conversation is complete (3-5 meaningful exchanges), analyze and apply:

```
POST /api/workspace/consultation/analyze
{
  "businessId": "uuid",
  "businessName": "Your Business",
  "swotAnalysisId": "uuid",
  "workspaceConfigId": "uuid",
  "conversationHistory": [
    { "role": "assistant", "content": "..." },
    { "role": "user", "content": "..." },
    ...
  ]
}
```

**AI generates:**
- Custom folder structure
- Business-specific spreadsheets
- Tailored task lists
- Automated workflows
- Gmail templates
- Calendar appointment types

### 5. Workspace Finalization

The system automatically creates:

**Custom Drive Structure:**
```
📁 Your Business - Business Files/
  📁 Customers/
  📁 Operations/
  📁 Marketing/
  📁 Service Requests/  ← Custom based on conversation
  📁 Follow-ups/        ← Custom based on conversation
```

**Custom Spreadsheets:**
- Customer Tracker (Name, Phone, Service, Follow-up Date, Status, Notes)
- Lead Source Tracker (Date, Source, Contact Info, Converted)
- Service Log (specific to their industry)

**Custom Tasks:**
- "Set up customer follow-up system"
- "Configure lead source tracking"
- "Create service request templates"

**Gmail Automations:**
- Email templates for common responses
- Draft automations for follow-ups
- Signature setup with business branding

## API Endpoints

### Onboarding Status
```
GET /api/workspace/onboarding/status/:businessId
```

Returns current onboarding progress and setup state.

### Initiate Onboarding
```
POST /api/workspace/onboarding/initiate
{
  "businessId": "uuid",
  "swotAnalysisId": "uuid"
}
```

Starts the onboarding process after SWOT completion.

### Setup Hosted Email
```
POST /api/workspace/onboarding/hosted-email
{
  "workspaceConfigId": "uuid",
  "businessName": "Your Business",
  "firstName": "John",
  "lastName": "Doe",
  "preferredUsername": "john",
  "workspacePlan": "starter" | "standard"
}
```

Creates Google Workspace account at john@gatewayglobal.ai.

### Get OAuth URL
```
GET /api/workspace/onboarding/auth-url/:businessId
```

Returns OAuth URL for integrated email setup.

### Setup Integrated Email
```
POST /api/workspace/onboarding/integrated-email
{
  "workspaceConfigId": "uuid",
  "email": "owner@business.com",
  "authCode": "oauth_code_from_callback"
}
```

Connects existing Google account.

### Start Consultation
```
POST /api/workspace/consultation/start
{
  "businessId": "uuid",
  "businessName": "Your Business",
  "swotAnalysisId": "uuid",
  "workspaceConfigId": "uuid"
}
```

Initiates AI Biz Bot consultation conversation.

### Consultation Message
```
POST /api/workspace/consultation/message
{
  "businessId": "uuid",
  "businessName": "Your Business",
  "swotAnalysisId": "uuid",
  "workspaceConfigId": "uuid",
  "userMessage": "We track customers in a notebook",
  "conversationHistory": [...]
}
```

Processes conversation and returns AI response.

### Analyze Consultation
```
POST /api/workspace/consultation/analyze
{
  "businessId": "uuid",
  "businessName": "Your Business",
  "swotAnalysisId": "uuid",
  "workspaceConfigId": "uuid",
  "conversationHistory": [...]
}
```

Analyzes conversation and generates customization, then applies it.

## Database Schema

### workspace_configurations
Tracks workspace setup for each business.

```sql
- id (uuid, primary key)
- business_id (references customer_accounts)
- setup_type ('hosted' | 'integrated')
- hosted_email (text)
- hosted_user_id (text)
- workspace_plan ('starter' | 'standard')
- integrated_email (text)
- access_token (encrypted)
- refresh_token (encrypted)
- token_expiry (timestamp)
- drive_folder_id (text)
- clients_folder_id (text)
- operations_folder_id (text)
- marketing_folder_id (text)
- lead_tracking_sheet_id (text)
- task_list_id (text)
- calendar_id (text)
- setup_status ('pending' | 'in_progress' | 'awaiting_customization' | 'completed' | 'failed')
- setup_step (text)
- setup_error (text)
- swot_analysis_id (references swot_analyses)
- swot_completed_at (timestamp)
```

### swot_analyses
Stores SWOT analysis results.

```sql
- id (uuid, primary key)
- business_id (references customer_accounts)
- strengths (jsonb)
- weaknesses (jsonb)
- opportunities (jsonb)
- threats (jsonb)
- recommendations (jsonb)
- agent_training_data (jsonb)
- analysis_source ('google_places' | 'manual' | 'ai_generated')
- confidence (integer 0-100)
```

### consultations
Tracks AI Biz Bot consultation conversations.

```sql
- id (uuid, primary key)
- business_id (references customer_accounts)
- workspace_config_id (references workspace_configurations)
- swot_analysis_id (references swot_analyses)
- conversation_history (jsonb)
- consultation_summary (text)
- insights (jsonb)
- custom_tools (jsonb)
- customization_applied (boolean)
- status ('in_progress' | 'completed' | 'abandoned')
```

## Google Workspace Service

Extended capabilities:

### Gmail
- `sendEmail()` - Send emails
- `createDraft()` - Create draft emails
- `listEmails()` - List inbox messages

### Calendar
- `createCalendarEvent()` - Schedule appointments
- `listCalendarEvents()` - View upcoming events
- `updateCalendarEvent()` - Modify events
- `deleteCalendarEvent()` - Remove events

### Tasks
- `createTask()` - Add tasks
- `listTasks()` - View task list
- `updateTask()` - Modify tasks
- `deleteTask()` - Remove tasks

### Docs & Sheets
- `createDocument()` - Generate Google Docs
- `createSpreadsheet()` - Create custom spreadsheets

### Drive
- `createDriveFolder()` - Create folders
- `listDriveFiles()` - Browse files
- `uploadDriveFile()` - Upload files
- `deleteDriveFile()` - Remove files

### Admin (Hosted Email Only)
- `createUser()` - Provision new user
- `sendUserInvitation()` - Send welcome email with credentials

### Workspace Structure
- `createWorkspaceStructure()` - Generate complete folder/file structure

## Environment Variables

Required for Google Workspace integration:

```env
# Google OAuth (for integrated email)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/workspace/onboarding/callback

# Google Admin API (for hosted email - requires domain admin)
GOOGLE_ADMIN_EMAIL=admin@gatewayglobal.ai
GOOGLE_ADMIN_CREDENTIALS=service_account_json
```

## Benefits

### For Business Owners
- **No learning curve**: AI Bot asks questions in plain English
- **Truly personalized**: Built for YOUR workflow, not a template
- **Affordable**: Workspace Starter at $8.40/mo or Standard at $16.80/mo
- **No coding required**: Everything configured through conversation
- **AI-powered**: Voice, chat, and telephony included

### For Gateway Global
- **Differentiation**: No competitor offers conversational customization
- **Scalability**: AI handles customization, not manual setup
- **Revenue**: Workspace plans + premium features
- **Retention**: Personalized solutions create stickiness
- **Data**: Learn what businesses actually need

## Next Steps

1. **Test Database Migration**: Run `npm run db:push` to create tables
2. **Test Onboarding Flow**: Create test business and run through workflow
3. **Integrate with Frontend**: Build UI for consultation chat
4. **Voice Integration**: Add voice-based consultation option
5. **Template Library**: Build library of customization patterns based on conversations

## Support

For issues or questions:
- Email: support@gatewayglobal.ai
- Docs: https://docs.gatewayglobal.ai
- API: https://api.gatewayglobal.ai/docs
