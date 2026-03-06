# Workflow Creation Guide

## Overview

This guide documents the complete process for creating workflows, nodes, functions, and SMS forms in the hotel template system. Use this guide to ensure all components are properly created and the admin area displays correct counts.

## Architecture

### Components Hierarchy

```
Template
├── Nodes (Conversation flows)
├── Functions (API calls)
├── SMS Forms (Text message templates)
└── Workflows (Orchestrated sequences of nodes)
```

### Data Flow

1. **Template** is created first
2. **Nodes** are created (conversation building blocks)
3. **Functions** are created (API integrations)
4. **SMS Forms** are created (message templates)
5. **Workflows** are created (sequences of nodes)

## Step-by-Step Process

### Step 1: Create Template

```sql
INSERT INTO industry_templates (
  industry_name,
  template_name,
  template_version,
  description,
  is_active,
  is_default,
  knowledge_base_template,
  knowledge_base_sources,
  training_data_sources,
  training_instructions
) VALUES (
  'hotel',
  'Hotel Workflow',
  '1.0.0',
  'Complete hotel workflow description...',
  TRUE,
  TRUE,
  'Knowledge base template...',
  '["google_places", "cloudbeds"]'::jsonb,
  '["google_places", "cloudbeds", "customer_reviews"]'::jsonb,
  'Training instructions...'
) ON CONFLICT (industry_name) DO UPDATE SET
  template_name = EXCLUDED.template_name,
  updated_at = NOW();
```

### Step 2: Get Template ID

```sql
SELECT id INTO v_template_id 
FROM industry_templates 
WHERE industry_name = 'hotel' 
  AND template_name = 'Hotel Workflow' 
LIMIT 1;
```

### Step 3: Create Nodes

Nodes are the conversation building blocks. Each node represents a step in the conversation flow.

**Node Types:**
- `entry`: Entry point (greeting)
- `conversation`: Conversation flow
- `data_collection`: Collect user input
- `api_call`: Call external API
- `decision`: Conditional routing
- `exit`: End conversation

**Example: Entry Node**

```sql
INSERT INTO template_nodes (
  template_id,
  node_name,
  node_type,
  display_name,
  description,
  order_index,
  is_public,
  requires_verification,
  system_prompt,
  initial_message,
  next_nodes
) VALUES (
  v_template_id,
  'greeting_intent',
  'entry',
  'Greeting & Intent',
  'Entry point for all calls. Greets caller and determines intent.',
  1,
  TRUE,
  FALSE,
  'You are the voice AI assistant for {{hotel.name}}...',
  'Hi! Thank you for calling {{hotel.name}}...',
  '[{"condition": "booking_intent", "node_name": "booking_check_in_date"}, {"condition": "guest_services_intent", "node_name": "guest_services_verification"}]'::jsonb
);
```

**Example: Data Collection Node**

```sql
INSERT INTO template_nodes (
  template_id,
  node_name,
  node_type,
  display_name,
  description,
  order_index,
  is_public,
  requires_verification,
  system_prompt,
  initial_message,
  data_collection_fields,
  next_nodes
) VALUES (
  v_template_id,
  'booking_check_in_date',
  'data_collection',
  'Collect Check-In Date',
  'Collects the guest check-in date for new reservations.',
  2,
  TRUE,
  FALSE,
  'You are collecting booking information...',
  'Perfect! When would you like to check in?',
  '[{"name": "startDate", "type": "date", "required": true, "validation": "future_date"}]'::jsonb,
  '[{"condition": "date_collected", "node_name": "booking_check_out_date"}]'::jsonb
);
```

**Example: API Call Node**

```sql
INSERT INTO template_nodes (
  template_id,
  node_name,
  node_type,
  display_name,
  description,
  order_index,
  is_public,
  requires_verification,
  system_prompt,
  available_functions,
  next_nodes
) VALUES (
  v_template_id,
  'booking_check_availability',
  'api_call',
  'Check Availability',
  'Calls Cloudbeds API to check room availability and rates.',
  5,
  TRUE,
  FALSE,
  'You are about to check availability...',
  '["getAvailableRoomTypes", "getRooms", "getRatePlans"]'::jsonb,
  '[{"condition": "availability_found", "node_name": "booking_room_selection"}, {"condition": "no_availability", "node_name": "booking_no_availability"}]'::jsonb
);
```

### Step 4: Create Functions

Functions are API integration points. Each function represents an external API call.

**Example: Cloudbeds Function**

```sql
INSERT INTO template_functions (
  template_id,
  function_name,
  function_description,
  function_type,
  api_endpoint,
  api_method,
  api_headers,
  api_body_template,
  parameters,
  response_mapping,
  available_in_nodes
) VALUES (
  v_template_id,
  'get_available_room_types',
  'Get available room types and rates from Cloudbeds. Includes detailed rates for all rate plans.',
  'api_call',
  'https://api.cloudbeds.com/api/v1.3/getAvailableRoomTypes',
  'POST',
  '{"Content-Type": "application/json", "Authorization": "Bearer {{cloudbeds.access_token}}", "X-API-Key": "{{cloudbeds.api_key}}"}'::jsonb,
  '{"propertyID": "{{hotel.cloudbeds_property_id}}", "startDate": "{{customer.reservation.startDate}}", "endDate": "{{customer.reservation.endDate}}", "rooms": 1, "detailedRates": true}'::jsonb,
  '[{"name": "startDate", "type": "date", "required": true}, {"name": "endDate", "type": "date", "required": true}]'::jsonb,
  '{"rooms": "data.rooms", "rates": "data.rates", "availability": "data.availability"}'::jsonb,
  '["booking_check_availability"]'::jsonb
);
```

**Example: Google Sheets Function**

```sql
INSERT INTO template_functions (
  template_id,
  function_name,
  function_description,
  function_type,
  api_endpoint,
  api_method,
  api_headers,
  api_body_template,
  parameters,
  response_mapping,
  available_in_nodes
) VALUES (
  v_template_id,
  'add_customer_to_sheets',
  'Add a new customer record to Google Sheets customer database.',
  'api_call',
  'https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/Customers!A:Z:append',
  'POST',
  '{"Authorization": "Bearer {{google.sheets.access_token}}", "Content-Type": "application/json", "X-GOOG-API-FORMAT-VERSION": "2"}'::jsonb,
  '{"values": [[{{customer.id}}, "{{customer.firstName}}", "{{customer.lastName}}", "{{customer.email}}", "{{customer.phone}}", "{{customer.company}}", "{{customer.address}}", "{{customer.city}}", "{{customer.state}}", "{{customer.zip}}", "{{customer.country}}", "{{customer.source}}", "{{customer.status}}", "{{time.current}}", "{{time.current}}", "{{customer.notes}}", "{{customer.tags}}", "", "", ""]], "majorDimension": "ROWS", "valueInputOption": "USER_ENTERED"}'::jsonb,
  '[{"name": "spreadsheetId", "type": "string", "required": true}, {"name": "customerData", "type": "object", "required": true}]'::jsonb,
  '{"success": "true", "updatedRange": "data.updates.updatedRange", "updatedRows": "data.updates.updatedRows"}'::jsonb,
  '["booking_check_in_date", "guest_services_assistance"]'::jsonb
);
```

### Step 5: Create SMS Forms

SMS Forms are text message templates sent to users.

**Example: Booking Confirmation SMS**

```sql
INSERT INTO template_sms_forms (
  template_id,
  form_name,
  form_type,
  description,
  sms_template,
  trigger_conditions,
  variable_mappings
) VALUES (
  v_template_id,
  'booking_confirmation',
  'notification',
  'Sends booking confirmation to guests after reservation is created',
  'Hi {{customer.firstName}}, your reservation at {{hotel.name}} is confirmed! Check-in: {{customer.reservation.startDate}}, Check-out: {{customer.reservation.endDate}}. Confirmation #: {{customer.reservation.id}}. We look forward to hosting you!',
  '[{"trigger": "reservation_created", "node": "booking_confirmation"}]'::jsonb,
  '["{{customer.firstName}}", "{{hotel.name}}", "{{customer.reservation.startDate}}", "{{customer.reservation.endDate}}", "{{customer.reservation.id}}"]'::jsonb
);
```

### Step 6: Create Workflows

Workflows orchestrate sequences of nodes. They define the complete flow from start to finish.

**Workflow Types:**
- `inbound_*`: Customer/Employee → Company (incoming calls)
- `outbound_*`: Company → Customer (outgoing calls)

**Example: Inbound Booking Workflow**

```sql
INSERT INTO template_workflows (
  template_id,
  workflow_name,
  workflow_type,
  description,
  entry_node_id,
  workflow_steps,
  is_primary,
  success_node_id
) VALUES (
  v_template_id,
  'Booking Agent Workflow',
  'inbound_booking',
  'Complete booking workflow from greeting to confirmation. Handles new reservations. Call Direction: INBOUND (Guest → Hotel).',
  v_entry_node_id,
  jsonb_build_array(
    jsonb_build_object('node_id', v_entry_node_id::text, 'order', 1, 'name', 'greeting_intent'),
    jsonb_build_object('node_id', v_booking_node_id::text, 'order', 2, 'name', 'booking_check_in_date'),
    jsonb_build_object('node_id', v_confirmation_node_id::text, 'order', 9, 'name', 'booking_confirmation')
  ),
  TRUE,
  v_confirmation_node_id
);
```

**Example: Outbound Customer Experience Workflow**

```sql
INSERT INTO template_workflows (
  template_id,
  workflow_name,
  workflow_type,
  description,
  entry_node_id,
  workflow_steps,
  is_primary,
  success_node_id
) VALUES (
  v_template_id,
  'Customer Experience Workflow',
  'outbound_customer_experience',
  'Customer experience workflow. Conducts checkout surveys, manages Google reviews, analyzes sentiment, and posts approved responses. Call Direction: OUTBOUND (Hotel → Guest). Call Source: {{hotel.name}}, Recipient: {{customer.guest.name}}.',
  v_checkout_experience_node_id,
  jsonb_build_array(
    jsonb_build_object('node_id', v_checkout_experience_node_id::text, 'order', 1, 'name', 'checkout_experience_survey'),
    jsonb_build_object('node_id', v_google_review_check_node_id::text, 'order', 2, 'name', 'google_review_check'),
    jsonb_build_object('node_id', v_review_management_node_id::text, 'order', 3, 'name', 'review_management')
  ),
  FALSE,
  NULL
);
```

## Required Nodes for Hotel Workflows

### Inbound Workflows

**Booking Agent Workflow:**
- `greeting_intent` (entry)
- `booking_check_in_date` (data_collection)
- `booking_check_out_date` (data_collection)
- `booking_guests` (data_collection)
- `booking_check_availability` (api_call)
- `booking_room_selection` (conversation)
- `booking_collect_guest_info` (data_collection)
- `booking_create_reservation` (api_call)
- `booking_confirmation` (exit)

**Guest Experience Agent Workflow:**
- `guest_services_verification` (verification)
- `guest_services_assistance` (conversation)

**Virtual General Manager Workflow:**
- `operations_verification` (verification)
- `virtual_gm` (conversation)

**Verification Workflow:**
- `guest_services_verification` (verification)
- `operations_verification` (verification)

### Outbound Workflows

**Customer Experience Workflow:**
- `checkout_experience_survey` (conversation)
- `google_review_check` (api_call)
- `review_management` (conversation)

**Pre-Check-in Notification Workflow:**
- `pre_checkin_notification` (conversation)
- `pre_checkin_id_upload` (data_collection)
- `pre_checkin_registration` (data_collection)
- `pre_checkin_payment` (api_call)

## Validation Checklist

Before considering workflows complete, verify:

### Nodes
- [ ] All required nodes exist
- [ ] Node names match workflow step references
- [ ] Node order_index is correct
- [ ] Node next_nodes point to valid nodes
- [ ] Node available_functions list valid functions

### Functions
- [ ] All required functions exist
- [ ] Function parameters match API requirements
- [ ] Function response_mapping is correct
- [ ] Function available_in_nodes list valid nodes

### SMS Forms
- [ ] All required SMS forms exist
- [ ] SMS template variables are valid
- [ ] SMS trigger_conditions are correct

### Workflows
- [ ] All 6 workflows exist:
  - [ ] Booking Agent Workflow (inbound_booking)
  - [ ] Guest Experience Agent Workflow (inbound_guest_services)
  - [ ] Virtual General Manager Workflow (inbound_operations)
  - [ ] Verification Workflow (inbound_verification)
  - [ ] Customer Experience Workflow (outbound_customer_experience)
  - [ ] Pre-Check-in Notification Workflow (outbound_pre_checkin)
- [ ] Workflow entry_node_id exists
- [ ] Workflow workflow_steps reference valid nodes
- [ ] Workflow workflow_type includes direction (inbound_/outbound_)

## Admin Area Counts

The admin area displays counts from these queries:

### Workflows Count
```sql
SELECT COUNT(*) 
FROM template_workflows 
WHERE template_id = v_template_id;
```
**Expected: 6**

### Functions Count
```sql
SELECT COUNT(*) 
FROM template_functions 
WHERE template_id = v_template_id;
```
**Expected: 24+** (includes Cloudbeds, Google Sheets, Google Business Profile)

### SMS Forms Count
```sql
SELECT COUNT(*) 
FROM template_sms_forms 
WHERE template_id = v_template_id;
```
**Expected: 10**

## Troubleshooting

### Only 2 Workflows Showing

**Problem**: Only 2 workflows appear in admin area.

**Possible Causes:**
1. Missing nodes required for workflows
2. Workflow insertion conditions failed (node IDs were NULL)
3. Workflows were created but not linked to template

**Solution:**
1. Check node existence:
```sql
SELECT node_name, id 
FROM template_nodes 
WHERE template_id = v_template_id 
ORDER BY order_index;
```

2. Check workflow existence:
```sql
SELECT workflow_name, workflow_type, entry_node_id 
FROM template_workflows 
WHERE template_id = v_template_id;
```

3. Run migration `037_ensure_all_hotel_template_data.sql` which:
   - Finds all required nodes
   - Creates all 6 workflows
   - Reports missing nodes

### Missing Nodes

**Problem**: Workflows require nodes that don't exist.

**Solution**: Create missing nodes first, then create workflows.

### Incorrect Counts

**Problem**: Admin area shows incorrect counts.

**Solution**: 
1. Verify data exists in database
2. Check template_id matches
3. Clear cache and refresh
4. Run validation queries from checklist

## Best Practices

1. **Create in Order**: Template → Nodes → Functions → SMS Forms → Workflows
2. **Use Node IDs**: Always use `SELECT id INTO` to get node IDs before creating workflows
3. **Validate Dependencies**: Check that all referenced nodes/functions exist before creating workflows
4. **Test Each Step**: Verify each component is created before moving to the next
5. **Document Changes**: Keep track of what was created and why
6. **Use Transactions**: Wrap creation in transactions for rollback capability

## Migration Pattern

Use this pattern for creating complete workflows:

```sql
DO $$
DECLARE
  v_template_id UUID;
  v_node_id UUID;
  -- ... other node IDs
BEGIN
  -- 1. Get template ID
  SELECT id INTO v_template_id FROM industry_templates WHERE industry_name = 'hotel' LIMIT 1;
  
  -- 2. Get/create node IDs
  SELECT id INTO v_node_id FROM template_nodes WHERE template_id = v_template_id AND node_name = 'node_name' LIMIT 1;
  
  -- 3. Create workflow
  DELETE FROM template_workflows WHERE template_id = v_template_id AND workflow_name = 'Workflow Name';
  INSERT INTO template_workflows (...) VALUES (...);
  
  -- 4. Validate
  RAISE NOTICE 'Created workflow with % nodes', v_workflow_count;
END $$;
```

## Reference

- **Template**: `industry_templates` table
- **Nodes**: `template_nodes` table
- **Functions**: `template_functions` table
- **SMS Forms**: `template_sms_forms` table
- **Workflows**: `template_workflows` table

## Admin Area Population

### How Admin Area Gets Counts

The admin templates page (`/admin/templates`) displays counts from these queries:

**Workflows Tab:**
```sql
SELECT COUNT(*) 
FROM template_workflows 
WHERE template_id = v_template_id;
```
Displayed as: `Workflows ({workflows.length})`

**Functions Tab:**
```sql
SELECT COUNT(*) 
FROM template_functions 
WHERE template_id = v_template_id;
```
Displayed as: `Functions ({functions.length})`

**SMS Forms Tab:**
```sql
SELECT COUNT(*) 
FROM template_sms_forms 
WHERE template_id = v_template_id;
```
Displayed as: `SMS Forms ({smsForms.length})`

### Ensuring Correct Counts

1. **Verify Template ID Matches**: The template ID used in queries must match the template being viewed
2. **Check Data Exists**: Run validation queries to verify data exists
3. **Clear Cache**: Clear browser cache and refresh
4. **Check API Response**: Verify the API endpoint returns correct data

### Validation Queries

Run these queries to verify counts:

```sql
-- Get template ID
SELECT id, template_name, industry_name 
FROM industry_templates 
WHERE industry_name = 'hotel' 
ORDER BY created_at DESC 
LIMIT 1;

-- Count workflows
SELECT COUNT(*) as workflow_count
FROM template_workflows 
WHERE template_id = '<template_id>';

-- List workflows
SELECT workflow_name, workflow_type, entry_node_id
FROM template_workflows 
WHERE template_id = '<template_id>'
ORDER BY workflow_name;

-- Count functions
SELECT COUNT(*) as function_count
FROM template_functions 
WHERE template_id = '<template_id>';

-- Count SMS forms
SELECT COUNT(*) as sms_form_count
FROM template_sms_forms 
WHERE template_id = '<template_id>';

-- Count nodes
SELECT COUNT(*) as node_count
FROM template_nodes 
WHERE template_id = '<template_id>';
```

### Troubleshooting Incorrect Counts

**Problem**: Admin area shows 1 workflow but should show 6.

**Diagnosis Steps:**
1. Check workflow existence:
```sql
SELECT workflow_name, workflow_type 
FROM template_workflows 
WHERE template_id = '<template_id>';
```

2. Check node existence:
```sql
SELECT node_name, id 
FROM template_nodes 
WHERE template_id = '<template_id>' 
ORDER BY order_index;
```

3. Check if workflows reference valid nodes:
```sql
SELECT 
  w.workflow_name,
  w.entry_node_id,
  n.node_name as entry_node_name
FROM template_workflows w
LEFT JOIN template_nodes n ON w.entry_node_id = n.id
WHERE w.template_id = '<template_id>';
```

**Solution**: Run migration `037_ensure_all_hotel_template_data.sql` which:
- Creates missing nodes automatically
- Creates all 6 workflows
- Reports what was created/missing

### Migration Execution Order

For proper workflow creation, execute migrations in this order:

1. **033_seed_boardwalk_suites_template.sql** - Creates template, nodes, functions, SMS forms, workflows
2. **034_update_hotel_template_name.sql** - Updates template name
3. **035_ensure_all_hotel_workflows.sql** - Ensures all workflows exist
4. **036_add_google_sheets_customer_database.sql** - Adds Google Sheets customer database functions
5. **037_ensure_all_hotel_template_data.sql** - Creates missing nodes and ensures all workflows exist
6. **038_create_google_sheets_hotel_operations.sql** - Adds Google Sheets hotel operations functions

### Repeating the Process

To repeat the workflow creation process for a new template:

1. **Create Template**: Follow Step 1 from this guide
2. **Create Nodes**: Follow Step 3, create all required nodes
3. **Create Functions**: Follow Step 4, create all required functions
4. **Create SMS Forms**: Follow Step 5, create all required SMS forms
5. **Create Workflows**: Follow Step 6, create all workflows
6. **Verify Counts**: Run validation queries and check admin area
7. **Test Workflows**: Test each workflow end-to-end

### Automated Workflow Creation

Use the migration pattern from `037_ensure_all_hotel_template_data.sql`:

```sql
DO $$
DECLARE
  v_template_id UUID;
  v_node_id UUID;
  -- ... other node IDs
BEGIN
  -- 1. Get template ID
  SELECT id INTO v_template_id FROM industry_templates WHERE industry_name = 'hotel' LIMIT 1;
  
  -- 2. Get/create node IDs
  SELECT id INTO v_node_id FROM template_nodes WHERE template_id = v_template_id AND node_name = 'node_name' LIMIT 1;
  
  -- 3. If node missing, create it
  IF v_node_id IS NULL THEN
    INSERT INTO template_nodes (...) VALUES (...) RETURNING id INTO v_node_id;
  END IF;
  
  -- 4. Create workflow
  DELETE FROM template_workflows WHERE template_id = v_template_id AND workflow_name = 'Workflow Name';
  INSERT INTO template_workflows (...) VALUES (...);
  
  -- 5. Validate
  SELECT COUNT(*) INTO v_workflow_count FROM template_workflows WHERE template_id = v_template_id;
  RAISE NOTICE 'Created % workflows', v_workflow_count;
END $$;
```

## Next Steps

After creating workflows:
1. Verify counts in admin area match expected values
2. Test each workflow end-to-end
3. Verify API integrations work correctly
4. Test SMS form triggers
5. Document any customizations
6. Run validation queries to ensure data integrity

