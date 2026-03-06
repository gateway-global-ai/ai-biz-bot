# Critical Workflow Patterns

## Overview

These are the three critical Cloudbeds API patterns that power the voice AI concierge system. Each requires specific parameters to return complete data.

## Critical Workflows

### 1. Checking Rates and Availability

**Endpoint**: `/getAvailableRoomTypes`  
**Tool Adapter**: `cloudbeds.getAvailabilityAndRates`  
**Critical Parameter**: `detailedRates=true`

**Why Critical**:
- Without `detailedRates=true`, you only get basic availability
- Cannot determine the best available option without detailed rates
- Need all rate plans to make recommendations
- **This single endpoint replaces multiple calls**: Instead of calling `getRooms`, `getRates`, and `getTaxesAndFees` separately, use `getAvailableRoomTypes` with `detailedRates=true` to get all room data, rates, taxes, and fees in one efficient call

**Parameters**:
```json
{
  "propertyIDs": "{{hotel.propertyID}}",
  "startDate": "{{reservation.startDate}}",
  "endDate": "{{reservation.endDate}}",
  "rooms": "{{reservation.rooms ?? 1}}",
  "adults": "{{reservation.adults}}",
  "children": "{{reservation.children ?? 0}}",
  "detailedRates": true  // ← CRITICAL: Must be true - Returns rooms, rates, taxes, and fees
}
```

**What This Replaces**:
- ❌ `GET /getRooms` - Room information is included in response
- ❌ `GET /getRates` - Rate information is included with `detailedRates=true`
- ❌ `GET /getTaxesAndFees` - Taxes and fees are included in the response

**Use Case**: Voice assistant checking availability during booking flow. Always use this endpoint instead of multiple separate calls.

---

### 2. Pulling Detailed Guest Record

**Endpoint**: `/getGuestList`  
**Tool Adapter**: `cloudbeds.getGuestList`  
**Critical Parameter**: `detailed=true` OR `includeGuestInfo=true`

**Why Critical**:
- Without `detailed=true` or `includeGuestInfo=true`, you only get basic guest list data
- Need full guest info (phone, email, status, reservation ID, etc.) for identity verification
- Required for matching caller to guest record
- **Note**: Different endpoints may use `detailed=true` or `includeGuestInfo=true` - check the parameter name in the database

**Parameters**:
```json
{
  "propertyID": "{{hotel.propertyID}}",
  "detailed": true,  // ← CRITICAL: Must be true (or use includeGuestInfo=true if available)
  "guestPhone": "{{customer.phone}}",
  "guestCellPhone": "{{customer.phone}}",  // Check both phone fields
  "guestEmail": "{{customer.email}}"
}
```

**Matching Logic**:
- Match `{{customer.phone}}` to `guestPhone` OR `guestCellPhone`
- Match `{{customer.email}}` to `guestEmail`
- Note: `getGuestList` is sorted by name, not modification date

**Use Case**: Identity verification during voice call to match caller to guest record.

---

### 3. Getting Reservation Details by Status

**Endpoint**: `/getReservationsWithRateDetails`  
**Tool Adapter**: `cloudbeds.getReservationsWithRateDetails`  
**Critical Parameter**: `includeGuestsDetails=true`

**Why Critical**:
- Without `includeGuestsDetails=true`, you only get basic reservation data
- Need full guest details (phone, email, status, etc.) and rate information
- Required for reservation status checks during voice calls

**Parameters**:
```json
{
  "propertyID": "{{hotel.propertyID}}",
  "includeGuestsDetails": true,  // ← CRITICAL: Must be true
  "reservationID": "{{reservation.reservationID}}",
  "guestID": "{{guest.guestID}}",
  "sortByRecent": true  // Most recently modified first
}
```

**Multiple Reservations Logic**:
- This endpoint returns multiple reservations when filtered by `guestID`
- **Sort by `sortByRecent=true` to get most recently modified reservation first**
- The most recently modified reservation is the one most likely to be current
- Check `status` from the first result (most recent reservation) for current state
- Match `reservationID` from voice chat global variables to reservation data

**Use Case**: 
- Status checks during voice calls
- Reservation lookup when guest mentions reservation ID
- Getting current reservation status when multiple reservations exist

---

## Global Variables Workflow

### Voice Chat Variables

In voice chat, we have global variables like:
- `{{customer.phone}}` - Caller's phone number (from Vapi)
- `{{customer.email}}` - Caller's email (if provided)
- `{{reservation.status}}` - Reservation status (from conversation context)
- `{{reservation.reservationID}}` - Reservation ID (if mentioned)

### Matching Process

1. **Match Caller to Guest**:
   ```
   customer.phone → getGuestList(guestPhone OR guestCellPhone)
   customer.email → getGuestList(guestEmail)
   → Returns guest.guestID, guest.name, guest.status, guest.reservation_ID[]
   ```

2. **Get Current Reservation**:
   ```
   If reservation.reservationID provided:
     → getReservationsWithRateDetails(reservationID)
   
   Else if multiple reservations:
     → getReservationsWithRateDetails(guestID, sortByRecent=true)
     → Select first result (most recently modified)
   
   → Returns reservation.reservationID, reservation.status, reservation.details
   ```

3. **Update Status**:
   ```
   reservation.status → Match to most recent reservation
   reservation.reservationID → Use ID from most recent reservation
   ```

---

## Tool Adapter Configuration

### getGuestList - Identity Verification

```sql
INSERT INTO tool_adapters (tool_name, adapter_type, parameter_mapping, enabled) VALUES
('cloudbeds.getGuestList', 'cloudbeds',
 '{
   "propertyID": "{{hotel.propertyID}}",
   "includeGuestInfo": true,  // CRITICAL
   "guestPhone": "{{customer.phone}}",
   "guestCellPhone": "{{customer.phone}}",  // Check both phone fields
   "guestEmail": "{{customer.email}}"
 }'::jsonb,
 TRUE)
```

**Note**: `getGuestList` is sorted by name, not modification date. The modification date sorting is only relevant for `getReservationsWithRateDetails` when multiple reservations exist.

### getReservationsWithRateDetails - Status Lookup

```sql
INSERT INTO tool_adapters (tool_name, adapter_type, parameter_mapping, enabled) VALUES
('cloudbeds.getReservationsWithRateDetails', 'cloudbeds',
 '{
   "propertyID": "{{hotel.propertyID}}",
   "includeGuestsDetails": true,  // CRITICAL
   "reservationID": "{{reservation.reservationID}}",
   "guestID": "{{guest.guestID}}",
   "sortByRecent": true  // Most recent first (CRITICAL for multiple reservations)
 }'::jsonb,
 TRUE)
```

---

## Validation Rules

All three critical parameters are validated by `validate-tool-parameters.js`:

1. ✅ `detailedRates=true` for `/getAvailableRoomTypes`
2. ✅ `includeGuestInfo=true` for `/getGuestList`
3. ✅ `includeGuestsDetails=true` for `/getReservationsWithRateDetails`
4. ⏳ `sortByRecent=true` for `/getReservationsWithRateDetails` (should be added)

---

## Implementation Notes

### Multiple Reservations Handling

When a guest has multiple reservations:

1. **Always sort by most recent modification**
   - Use `sortByRecent=true` in `/getReservationsWithRateDetails`
   - First result = most recently modified reservation

2. **Status comes from most recent reservation**
   - `{{reservation.status}}` should match most recent reservation
   - Use most recent `reservationID` for context

3. **Global variables update**
   - `{{reservation.reservationID}}` → Set to most recent reservation ID
   - `{{reservation.status}}` → Set to most recent reservation status
   - `{{guest.status}}` → May differ from reservation status

### Identity Verification Flow

```
1. Call comes in → {{customer.phone}} available
2. Call getGuestList(guestPhone={{customer.phone}}, includeGuestInfo=true)
3. Match found → Get guest.guestID, guest.reservation_ID[]
4. If multiple reservations:
   → Call getReservationsWithRateDetails(guestID, sortByRecent=true)
   → Select first result (most recent)
   → Set {{reservation.reservationID}} and {{reservation.status}}
5. Verify identity → Match phone/email
6. Set {{customer.verified}}=yes if match found
```

---

## Related Files

- **Tool Adapters**: `supabase/migrations/005_example_tasks_and_adapters.sql`
- **Validation Script**: `scripts/validate-tool-parameters.js`
- **Process Documentation**: `docs/TOOL_VALIDATION_PROCESS.md`
- **Global Variables Spec**: `dashboard-architecture/GLOBAL_VARIABLES_V2_SPEC.md`

