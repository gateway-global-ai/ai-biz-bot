# Cloudbeds API Database Query Guide

## Overview

The parsed Cloudbeds API database contains all endpoints, parameters, field descriptions, and definitions. This guide shows how to query it effectively for hotel workflow integration.

## Database Tables

### 1. `openapi_endpoints`
Stores all Cloudbeds API endpoints with metadata:
- `operation_id` - Unique operation identifier
- `path` - API endpoint path (e.g., `/getGuestList`)
- `method` - HTTP method (GET, POST, PUT, DELETE)
- `supports_guest_id` - Boolean flag if endpoint accepts guestID
- `supports_reservation_id` - Boolean flag if endpoint accepts reservationID
- `supports_room_id` - Boolean flag if endpoint accepts roomID
- `tags` - Array of tags (e.g., ["Guest", "Reservation"])

### 2. `openapi_parameters`
Stores all parameters for each endpoint:
- `endpoint_id` - References openapi_endpoints
- `name` - Parameter name (e.g., "guestID", "detailed", "sortByRecent")
- `required` - Boolean if parameter is required
- `schema_type` - Type (string, integer, boolean, array, object)
- `description` - Parameter description
- `is_identifier` - Boolean if parameter is an identifier (guestID, reservationID, etc.)
- `identifier_type` - Type of identifier (guestID, reservationID, roomID, propertyID)

## Query Examples

### Find All Endpoints That Accept `guestID`

```sql
SELECT 
  e.operation_id,
  e.path,
  e.method,
  e.summary,
  e.description,
  p.name as parameter_name,
  p.required,
  p.description as parameter_description
FROM openapi_endpoints e
JOIN openapi_parameters p ON e.id = p.endpoint_id
WHERE p.identifier_type = 'guestID'
  OR p.name ILIKE '%guestID%'
ORDER BY e.path, p.name;
```

### Find All Endpoints That Accept `reservationID`

```sql
SELECT 
  e.operation_id,
  e.path,
  e.method,
  e.summary,
  p.name as parameter_name,
  p.required,
  p.description as parameter_description
FROM openapi_endpoints e
JOIN openapi_parameters p ON e.id = p.endpoint_id
WHERE p.identifier_type = 'reservationID'
  OR p.name ILIKE '%reservationID%'
ORDER BY e.path, p.name;
```

### Find Endpoints with `detailed` Parameter

Many Cloudbeds endpoints require `detailed=true` to get full records:

```sql
SELECT 
  e.operation_id,
  e.path,
  e.method,
  e.summary,
  p.name as parameter_name,
  p.description as parameter_description,
  p.default_value,
  p.example_value
FROM openapi_endpoints e
JOIN openapi_parameters p ON e.id = p.endpoint_id
WHERE p.name ILIKE '%detailed%'
  OR p.name ILIKE '%detail%'
ORDER BY e.path;
```

### Get Full Parameter Details for Specific Endpoint

```sql
SELECT 
  e.operation_id,
  e.path,
  e.method,
  e.summary,
  e.description,
  p.name as parameter_name,
  p.location,
  p.required,
  p.schema_type,
  p.description as parameter_description,
  p.default_value,
  p.example_value,
  p.enum_values,
  p.validation
FROM openapi_endpoints e
JOIN openapi_parameters p ON e.id = p.endpoint_id
WHERE e.path = '/getGuestList'
ORDER BY p.required DESC, p.name;
```

### Find Critical Parameters for Hotel Workflow

```sql
-- Find all endpoints and their critical parameters
SELECT 
  e.path,
  e.method,
  e.summary,
  p.name as parameter_name,
  p.required,
  p.description as parameter_description
FROM openapi_endpoints e
JOIN openapi_parameters p ON e.id = p.endpoint_id
WHERE 
  (p.name ILIKE '%detailed%' AND p.required = false)
  OR p.name ILIKE '%includeGuestInfo%'
  OR p.name ILIKE '%includeGuestsDetails%'
  OR p.name ILIKE '%detailedRates%'
  OR p.name ILIKE '%sortByRecent%'
ORDER BY e.path, p.name;
```

## Critical Parameters for Hotel Workflow

### 1. `/getGuestList` - Requires `detailed=true` or `includeGuestInfo=true`

**Why Critical**: Without this parameter, you only get basic guest list data. You need full guest info (phone, email, status, reservation ID) for identity verification.

```sql
SELECT 
  p.name,
  p.required,
  p.description,
  p.default_value,
  p.example_value
FROM openapi_endpoints e
JOIN openapi_parameters p ON e.id = p.endpoint_id
WHERE e.path = '/getGuestList'
  AND (p.name ILIKE '%detailed%' OR p.name ILIKE '%includeGuestInfo%');
```

**Example Query**:
```json
{
  "propertyID": "{{hotel.propertyID}}",
  "detailed": true,  // OR "includeGuestInfo": true
  "guestPhone": "{{customer.phone}}",
  "guestCellPhone": "{{customer.phone}}",
  "guestEmail": "{{customer.email}}"
}
```

### 2. `/getAvailableRoomTypes` - Requires `detailedRates=true`

**Why Critical**: 
- Without `detailedRates=true`, you only get basic availability. Cannot determine best available option without detailed rates.
- **This endpoint replaces multiple endpoints**: Instead of calling `getRooms`, `getRates`, and `getTaxesAndFees` separately, use `getAvailableRoomTypes` with `detailedRates=true` to get all room data, rates, and fees in a single call.

```sql
SELECT 
  p.name,
  p.required,
  p.description,
  p.default_value
FROM openapi_endpoints e
JOIN openapi_parameters p ON e.id = p.endpoint_id
WHERE e.path = '/getAvailableRoomTypes'
  AND p.name ILIKE '%detailedRates%';
```

**Example Query**:
```json
{
  "propertyIDs": "{{hotel.propertyID}}",
  "startDate": "{{reservation.startDate}}",
  "endDate": "{{reservation.endDate}}",
  "rooms": 1,
  "adults": "{{reservation.adults}}",
  "detailedRates": true  // CRITICAL - Returns rooms, rates, and fees in one call
}
```

**What This Replaces**:
- ❌ `GET /getRooms` - Room information is included
- ❌ `GET /getRates` - Rate information is included with `detailedRates=true`
- ❌ `GET /getTaxesAndFees` - Taxes and fees are included in the response

**Always use `getAvailableRoomTypes` with `detailedRates=true` for booking workflows** - it's more efficient and provides complete data in a single API call.

### 3. `/getReservationsWithRateDetails` - Requires `includeGuestsDetails=true`

**Why Critical**: Without `includeGuestsDetails=true`, you only get basic reservation data. Need full guest details and rate information.

```sql
SELECT 
  p.name,
  p.required,
  p.description
FROM openapi_endpoints e
JOIN openapi_parameters p ON e.id = p.endpoint_id
WHERE e.path = '/getReservationsWithRateDetails'
  AND p.name ILIKE '%includeGuestsDetails%';
```

**Example Query**:
```json
{
  "propertyID": "{{hotel.propertyID}}",
  "includeGuestsDetails": true,  // CRITICAL
  "reservationID": "{{reservation.reservationID}}",
  "guestID": "{{guest.guestID}}",
  "sortByRecent": true  // When guestID returns multiple reservations
}
```

### 4. Multiple Reservations - Requires `sortByRecent=true`

When querying by `guestID` (without `reservationID`), the endpoint returns multiple reservations. Use `sortByRecent=true` to get the most recently modified reservation first.

```sql
SELECT 
  p.name,
  p.description,
  p.default_value
FROM openapi_endpoints e
JOIN openapi_parameters p ON e.id = p.endpoint_id
WHERE e.path = '/getReservationsWithRateDetails'
  AND p.name ILIKE '%sortByRecent%';
```

## Common Query Patterns

### Find All Guest Management Endpoints

```sql
SELECT 
  e.path,
  e.method,
  e.summary,
  e.supports_guest_id,
  e.supports_reservation_id
FROM openapi_endpoints e
WHERE 'Guest' = ANY(e.tags)
ORDER BY e.path;
```

### Find All Reservation Management Endpoints

```sql
SELECT 
  e.path,
  e.method,
  e.summary,
  e.supports_reservation_id
FROM openapi_endpoints e
WHERE 'Reservation' = ANY(e.tags)
  OR e.path ILIKE '%reservation%'
ORDER BY e.path;
```

### Find Endpoints That Need Both guestID and reservationID

```sql
SELECT 
  e.path,
  e.method,
  e.summary
FROM openapi_endpoints e
WHERE e.supports_guest_id = true
  AND e.supports_reservation_id = true
ORDER BY e.path;
```

## Tips for Hotel Workflow Integration

1. **Always check for `detailed` parameters**: Many endpoints require `detailed=true` or similar to get full records
2. **Query by identifier type**: Use `identifier_type` to find all endpoints that accept `guestID` or `reservationID`
3. **Check parameter descriptions**: The `description` field often contains critical information about when parameters are required
4. **Look for required vs optional**: Some critical parameters are optional but required for full functionality
5. **Multiple reservations**: When using `guestID` without `reservationID`, always use `sortByRecent=true` to get the most recent reservation first

## Related Documentation

- `CRITICAL_WORKFLOW_PATTERNS.md` - Critical parameters for common workflows
- `MULTIPLE_RESERVATIONS_HANDLING.md` - How to handle multiple reservations
- `endpoint-filters-comprehensive.json` - JSON file with all endpoints organized by identifier

