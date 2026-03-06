# Property Parameter Guide - propertyID vs propertyIDs

## The Issue

Some Cloudbeds API endpoints use `propertyID` (singular) and others use `propertyIDs` (plural). 

**Common Error**: If you use the wrong parameter name, you'll get:
```
"you don't have access to this property"
```

This happens because:
- ✅ Endpoint expects `propertyID` → You pass `propertyIDs` → ❌ Fails
- ✅ Endpoint expects `propertyIDs` → You pass `propertyID` → ❌ Fails

## The Solution

### Use `{{hotel.propertyid}}` Alias

Use **`{{hotel.propertyid}}`** as a global variable that automatically maps to the correct parameter name based on the endpoint.

**Benefits:**
- ✅ One variable name to remember
- ✅ Auto-maps to `propertyID` or `propertyIDs` based on endpoint
- ✅ Prevents "access denied" errors
- ✅ Works in prompts, tools, and all contexts

## How It Works

### Automatic Mapping

The Edge Function automatically:

1. **Detects** if endpoint uses `propertyID` or `propertyIDs`
2. **Maps** `{{hotel.propertyid}}` → correct parameter name
3. **Fixes** common mistakes: `propertyid`, `property_id`, etc.

### Example Usage

**In Vapi Prompt:**
```
I need to check reservations for {{hotel.propertyid}}
```

**In Edge Function Request:**
```json
{
  "propertyID": "315701",  // or propertyIDs, based on endpoint
  "endpoint": "/getGuestList"
}
```

**Automatically Fixed:**
- If endpoint uses `propertyID` → Uses `propertyID`
- If endpoint uses `propertyIDs` → Uses `propertyIDs`

## Parameter Casing Fixes

### Input Variations (All Accepted)
- `{{hotel.propertyid}}` ✅
- `{{hotel.propertyID}}` ✅
- `hotelPropertyID` ✅
- `hotel_property_id` ✅
- `propertyid` ✅
- `property_id` ✅
- `propertyID` ✅
- `propertyIDs` ✅

### Output (Automatically Corrected)
- Endpoints using singular → `propertyID`
- Endpoints using plural → `propertyIDs`

## Endpoint Analysis

### Endpoints Using `propertyID` (Singular)
Most endpoints use `propertyID`:
- `/getGuestList`
- `/getReservationsWithRateDetails`
- `/getHotelDetails`
- Most other endpoints...

### Endpoints Using `propertyIDs` (Plural)
Some endpoints require `propertyIDs`:
- (Will be identified from OpenAPI spec)

### How to Find Out

Run analysis:
```bash
node scripts/analyze-property-parameters.js
```

This will show:
- Which endpoints use `propertyID`
- Which endpoints use `propertyIDs`
- Examples of each

## Implementation

### Edge Function Protection

The Edge Function automatically:

1. **Checks endpoint metadata** from database
2. **Determines** which parameter name is needed
3. **Maps** `{{hotel.propertyid}}` to correct name
4. **Fixes** common casing mistakes

### Code Location

**Edge Function**: `supabase/functions/cloudbeds-api/index.ts`
- `fixPropertyParameter()` - Maps hotel.propertyid alias
- `getEndpointMetadata()` - Queries database for endpoint requirements

**Utility**: `src/utils/property-parameter-mapper.js`
- `mapPropertyParameter()` - Maps alias to correct parameter
- `getPropertyParameterName()` - Determines correct name for endpoint

## Global Variable Definition

### In Database

```sql
-- Global variable: hotel.propertyid
-- Maps to: propertyID or propertyIDs (based on endpoint)
INSERT INTO global_variables (
  key,
  value,
  source_system,
  category,
  type,
  description
) VALUES (
  'hotel.propertyid',
  '{{hotel.propertyid}}',
  'standard',
  'property',
  'identifier',
  'Property ID alias that maps to propertyID or propertyIDs based on endpoint'
);
```

### In Vapi Prompts

```liquid
-- Use in prompts:
I need to access data for property {{hotel.propertyid}}

-- Automatically works for:
- Endpoints requiring propertyID
- Endpoints requiring propertyIDs
```

## Testing

### Test Property Parameter Mapping

```bash
# Test with propertyID endpoint
curl -X POST https://your-function-url \
  -d '{
    "propertyID": "315701",
    "endpoint": "/getGuestList",
    "hotel.propertyid": "315701"
  }'

# Should use propertyID (singular)

# Test with propertyIDs endpoint
curl -X POST https://your-function-url \
  -d '{
    "propertyID": "315701",
    "endpoint": "/someEndpoint",
    "hotel.propertyid": "315701"
  }'

# Should use propertyIDs (plural) if endpoint requires it
```

## Best Practices

1. **Always use `{{hotel.propertyid}}`** in prompts and templates
2. **Don't hardcode** `propertyID` or `propertyIDs` in code
3. **Let Edge Function** handle the mapping automatically
4. **Use validation** to catch mistakes before deployment

## Summary

✅ **Problem**: propertyID vs propertyIDs causes "access denied" errors

✅ **Solution**: Use `{{hotel.propertyid}}` alias that auto-maps

✅ **Protection**: Edge Function automatically uses correct parameter name

✅ **Result**: No more "access denied" errors from wrong parameter name!

---

**Status**: Implemented ✅  
**Protection**: Active ✅  
**Alias**: `{{hotel.propertyid}}` ✅

