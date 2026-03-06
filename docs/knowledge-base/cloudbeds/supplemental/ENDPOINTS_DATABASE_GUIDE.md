# CloudBeds API Endpoints Database Guide

## Overview

The `cloudbeds_api_endpoints` table stores all 115 CloudBeds API v1.3 endpoints with metadata extracted from the OpenAPI YAML specification. This database enables programmatic access to endpoint information, parameter requirements, and role-based access control.

## Database Schema

### Table: `cloudbeds_api_endpoints`

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `method` | VARCHAR(10) | HTTP method (GET, POST, PUT, DELETE, PATCH) |
| `path` | VARCHAR(255) | API path (e.g., `/getHotelDetails`) |
| `operation_id` | VARCHAR(255) | Operation ID (e.g., `getHotelDetails`) |
| `summary` | TEXT | Endpoint description |
| `params` | JSONB | Array of parameter names |
| `params_text` | TEXT | Original params string for full-text search |
| `security` | JSONB | Security requirements (api_key, OAuth2) |
| `requires_oauth` | BOOLEAN | Quick flag for OAuth requirement |
| `requires_api_key` | BOOLEAN | Quick flag for API key support |
| `tag` | VARCHAR(100) | Category (Guest, Reservation, Room, etc.) |
| `role_access` | JSONB | Array of roles that can access |
| `requires_property_id` | BOOLEAN | Requires `propertyID` (singular) |
| `requires_property_ids` | BOOLEAN | Requires `propertyIDs` (plural) |
| `requires_guest_id` | BOOLEAN | Requires `guestID` |
| `requires_reservation_id` | BOOLEAN | Requires `reservationID` |
| `requires_room_id` | BOOLEAN | Requires `roomID` |
| `requires_room_type_id` | BOOLEAN | Requires `roomTypeID` |
| `requires_rate_plan_id` | BOOLEAN | Requires `ratePlanID` |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

## Common Queries

### 1. Find Endpoints by Parameter Requirement

#### Endpoints requiring `propertyID` (singular)
```sql
SELECT method, path, operation_id, tag
FROM cloudbeds_api_endpoints
WHERE requires_property_id = true
ORDER BY tag, method, path;
```

**Example Results**:
- `GET /getHotelDetails` (Hotel)
- `GET /getGuest` (Guest)
- `GET /getReservation` (Reservation)

#### Endpoints requiring `propertyIDs` (plural)
```sql
SELECT method, path, operation_id, tag
FROM cloudbeds_api_endpoints
WHERE requires_property_ids = true
ORDER BY tag, method, path;
```

**Example Results**:
- `GET /getHotels` (Hotel)
- `GET /getGuestList` (Guest)
- `GET /getAvailableRoomTypes` (Room)

#### Endpoints requiring `guestID`
```sql
SELECT method, path, operation_id, tag
FROM cloudbeds_api_endpoints
WHERE requires_guest_id = true
ORDER BY tag, method, path;
```

**Example Results**:
- `GET /getGuest` (Guest)
- `GET /getGuestNotes` (Guest)
- `PUT /putGuest` (Guest)

#### Endpoints requiring `reservationID`
```sql
SELECT method, path, operation_id, tag
FROM cloudbeds_api_endpoints
WHERE requires_reservation_id = true
ORDER BY tag, method, path;
```

**Example Results**:
- `GET /getReservation` (Reservation)
- `GET /getReservationNotes` (Reservation)
- `PUT /putReservation` (Reservation)

### 2. Find Endpoints by Role

#### Endpoints accessible by Concierge
```sql
SELECT method, path, operation_id, tag
FROM cloudbeds_api_endpoints
WHERE role_access @> '["concierge"]'::jsonb
ORDER BY tag, method, path;
```

#### Endpoints accessible by Booking Agent
```sql
SELECT method, path, operation_id, tag
FROM cloudbeds_api_endpoints
WHERE role_access @> '["booking_agent"]'::jsonb
ORDER BY tag, method, path;
```

#### Endpoints accessible by Front Desk
```sql
SELECT method, path, operation_id, tag
FROM cloudbeds_api_endpoints
WHERE role_access @> '["front_desk"]'::jsonb
ORDER BY tag, method, path;
```

#### Endpoints accessible by General Manager
```sql
SELECT method, path, operation_id, tag
FROM cloudbeds_api_endpoints
WHERE role_access @> '["general_manager"]'::jsonb
ORDER BY tag, method, path;
```

### 3. Find Endpoints by Authentication Requirement

#### Endpoints requiring OAuth 2.0
```sql
SELECT method, path, operation_id, tag, requires_oauth
FROM cloudbeds_api_endpoints
WHERE requires_oauth = true
ORDER BY tag, method, path;
```

#### Endpoints that work with API Key
```sql
SELECT method, path, operation_id, tag
FROM cloudbeds_api_endpoints
WHERE requires_api_key = true
ORDER BY tag, method, path;
```

### 4. Find Endpoints by Category (Tag)

#### All Guest endpoints
```sql
SELECT method, path, operation_id, summary
FROM cloudbeds_api_endpoints
WHERE tag = 'Guest'
ORDER BY method, path;
```

#### All Reservation endpoints
```sql
SELECT method, path, operation_id, summary
FROM cloudbeds_api_endpoints
WHERE tag = 'Reservation'
ORDER BY method, path;
```

### 5. Complex Queries

#### Find all POST endpoints that require OAuth and propertyID
```sql
SELECT method, path, operation_id, tag
FROM cloudbeds_api_endpoints
WHERE method = 'POST'
  AND requires_oauth = true
  AND requires_property_id = true
ORDER BY tag, path;
```

#### Find endpoints that require both guestID and reservationID
```sql
SELECT method, path, operation_id, tag
FROM cloudbeds_api_endpoints
WHERE requires_guest_id = true
  AND requires_reservation_id = true
ORDER BY tag, method, path;
```

#### Find endpoints accessible by Booking Agent that require propertyIDs
```sql
SELECT method, path, operation_id, tag
FROM cloudbeds_api_endpoints
WHERE role_access @> '["booking_agent"]'::jsonb
  AND requires_property_ids = true
ORDER BY tag, method, path;
```

### 6. Full-Text Search on Parameters

#### Search for endpoints with "propertyID" in parameters
```sql
SELECT method, path, operation_id, params_text
FROM cloudbeds_api_endpoints
WHERE to_tsvector('english', params_text) @@ to_tsquery('english', 'propertyID')
ORDER BY tag, method, path;
```

#### Search for endpoints with "guest" in parameters
```sql
SELECT method, path, operation_id, params_text
FROM cloudbeds_api_endpoints
WHERE to_tsvector('english', params_text) @@ to_tsquery('english', 'guest')
ORDER BY tag, method, path;
```

### 7. Get All Parameters for an Endpoint

```sql
SELECT 
  method,
  path,
  operation_id,
  params,
  params_text
FROM cloudbeds_api_endpoints
WHERE path = '/getGuest'
LIMIT 1;
```

**Result**:
```json
{
  "method": "GET",
  "path": "/getGuest",
  "operation_id": "getGuest",
  "params": ["propertyID", "reservationID", "guestID", "includeGuestRequirements"],
  "params_text": "propertyID, reservationID, guestID, includeGuestRequirements"
}
```

## Populating the Database

### From CSV Files

The database can be populated from the CSV files using a script:

```javascript
// Example: populate-endpoints.js
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Read CSV file
const csvContent = fs.readFileSync('Employee_Ops_Endpoints__from_pms-v1_3-openapi_yaml_.csv', 'utf-8');
const records = parse(csvContent, { columns: true, skip_empty_lines: true });

for (const record of records) {
  // Parse params
  const params = record.params ? record.params.split(', ').map(p => p.trim()) : [];
  
  // Determine parameter flags
  const requires_property_id = params.includes('propertyID');
  const requires_property_ids = params.includes('propertyIDs');
  const requires_guest_id = params.some(p => p.includes('guestID'));
  const requires_reservation_id = params.some(p => p.includes('reservationID'));
  const requires_room_id = params.some(p => p.includes('roomID'));
  const requires_room_type_id = params.some(p => p.includes('roomTypeID'));
  const requires_rate_plan_id = params.some(p => p.includes('ratePlanID'));
  
  // Parse security
  const security = JSON.parse(record.security || '[]');
  const requires_oauth = security.some(s => s.OAuth2 && s.OAuth2.length > 0);
  const requires_api_key = security.some(s => s.api_key && s.api_key.length > 0);
  
  // Determine role access (based on which CSV file this came from)
  const role_access = ['general_manager']; // Adjust based on CSV source
  
  // Insert into database
  await supabase.from('cloudbeds_api_endpoints').upsert({
    method: record.method,
    path: record.path,
    operation_id: record.operationId || null,
    summary: record.summary || null,
    params: params,
    params_text: record.params || '',
    security: security,
    requires_oauth: requires_oauth,
    requires_api_key: requires_api_key,
    tag: record.tags || null,
    role_access: role_access,
    requires_property_id: requires_property_id,
    requires_property_ids: requires_property_ids,
    requires_guest_id: requires_guest_id,
    requires_reservation_id: requires_reservation_id,
    requires_room_id: requires_room_id,
    requires_room_type_id: requires_room_type_id,
    requires_rate_plan_id: requires_rate_plan_id
  }, { onConflict: 'method,path' });
}
```

## Programmatic Access

### Using the Database in Node.js

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Find endpoints requiring propertyID
async function getEndpointsRequiringPropertyID() {
  const { data, error } = await supabase
    .from('cloudbeds_api_endpoints')
    .select('method, path, operation_id, tag')
    .eq('requires_property_id', true)
    .order('tag', { ascending: true })
    .order('method', { ascending: true });
  
  return data;
}

// Find endpoints for a specific role
async function getEndpointsForRole(role) {
  const { data, error } = await supabase
    .from('cloudbeds_api_endpoints')
    .select('method, path, operation_id, tag, requires_oauth')
    .contains('role_access', [role])
    .order('tag', { ascending: true });
  
  return data;
}

// Get endpoint details
async function getEndpointDetails(method, path) {
  const { data, error } = await supabase
    .from('cloudbeds_api_endpoints')
    .select('*')
    .eq('method', method)
    .eq('path', path)
    .single();
  
  return data;
}
```

## Summary View

Use the `cloudbeds_endpoints_summary` view for quick lookups:

```sql
SELECT * FROM cloudbeds_endpoints_summary
WHERE requires_property_id = true
LIMIT 10;
```

## Benefits

1. **Programmatic Access**: Query endpoints by any criteria
2. **Parameter Discovery**: Quickly find which endpoints need which parameters
3. **Role-Based Filtering**: Filter endpoints by role access
4. **Authentication Requirements**: Identify OAuth vs API key requirements
5. **Function Generation**: Use database to auto-generate API client functions
6. **Documentation**: Single source of truth for all endpoint metadata

---

**Last Updated**: 2025-11-14  
**Schema Version**: 1.0

