# CloudBeds Booking Flow Guide
## Complete Reservation Creation Process

**Date**: 2025-11-13  
**API Version**: v1.3  
**Based on**: OpenAPI Specification (`pms-v1.3-openapi.yaml`)

---

## Overview

This guide documents the complete booking flow for creating reservations in CloudBeds. The flow follows a specific sequence:

1. **Get Available Room Types** - Check availability for dates and guest count
2. **Select Room** - Choose a room type from available options
3. **Collect Guest Information** - Gather required guest details
4. **Create Reservation** - Submit reservation with all required data

---

## Step 1: Get Available Room Types

**Endpoint**: `GET /getAvailableRoomTypes`  
**Authentication**: API Key or OAuth 2.0

### Required Parameters

- `propertyIDs` - Property ID (e.g., "315701")
- `startDate` - Check-in date (YYYY-MM-DD format)
- `endDate` - Check-out date (YYYY-MM-DD format)

### Optional Parameters

- `rooms` - Number of rooms (default: 1)
- `adults` - Number of adults (default: 1)
- `children` - Number of children (default: 0)
- `promoCode` - Promo code for discounts (AARP, MILITARY, LOCAL) - 10% discount for 1-6 night stays
- `detailedRates` - Include detailed rate breakdown (default: false)

### Example Request

```javascript
const availability = await getAvailableRoomTypes({
  propertyIDs: '315701',
  startDate: '2025-12-01',
  endDate: '2025-12-02',
  rooms: 1,
  adults: 2,
  children: 0,
  detailedRates: true
});
```

### Response Structure

```json
{
  "success": true,
  "data": [
    {
      "propertyID": "315701",
      "propertyRooms": [
        {
          "roomTypeID": "629879",
          "roomTypeName": "King Suite Level 1",
          "roomRate": 79,
          "roomRateID": "2260273",
          "ratePlanNamePublic": "default",
          "roomsAvailable": 9
        }
      ]
    }
  ]
}
```

### Key Fields to Extract

- `roomTypeID` - Required for reservation
- `roomRateID` - Recommended for reservation (specific rate)
- `roomTypeName` - For display to user
- `roomRate` - Price per night (may vary by stay duration)
- `roomsAvailable` - Number of available rooms
- `roomRateDetailed` - Array of rates by stay duration (for weekly/monthly rates)

### Rate Plan Identification

The system automatically identifies the best rate plan based on stay duration:

- **Discount Rates** (AARP, MILITARY, LOCAL): 10% discount for 1-6 night stays
- **Daily Rate**: Default rate for 1-6 night stays (if no promo code)
- **Weekly Rate**: Available for 7+ night stays (if configured)
- **Monthly Rate**: Available for 30+ night stays (if configured)

The `findBestRatePlan()` function prioritizes:
1. Discount rates (if promo code matches and stay is 1-6 nights)
2. Monthly rates (30+ nights)
3. Weekly rates (7-29 nights)
4. Daily rates (1-6 nights)

This ensures guests always get the best available rate for their stay duration.

### Promo Codes

Special discount promo codes provide 10% off for 1-6 night stays:

- **AARP**: AARP member discount
- **MILITARY**: Military discount
- **LOCAL**: Local resident discount

**Usage**: Pass `promoCode` parameter to `getAvailableRoomTypes()`:
```javascript
const availability = await getAvailableRoomTypes({
  propertyIDs: '315701',
  startDate: '2025-12-01',
  endDate: '2025-12-02',
  promoCode: 'LOCAL',  // or 'AARP' or 'MILITARY'
  detailedRates: true
});
```

**Response**: Rooms will have:
- `ratePlanNamePublic`: "Locals", "AARP", or "Military"
- `ratePlanNamePrivate`: "LOCAL", "AARP", or "MILITARY"
- `derivedType`: "percentage"
- `derivedValue`: "-10.00"
- `roomRateDetailed[0].base_rate`: Original rate before discount
- `roomRate`: Discounted rate (10% off)

---

## Step 2: Select Room

From the availability response, select a room type. You need:

- `roomTypeID` - The selected room type ID
- `roomRateID` - The specific rate ID (optional but recommended)
- `ratePlanNamePublic` - Rate plan name

**Note**: The `roomRateID` ensures you're booking at the exact rate shown in availability.

---

## Step 3: Collect Guest Information

**Required Guest Fields** (from `PostReservationRequest` schema):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `guestFirstName` | string | ✅ Yes | First name of the guest |
| `guestLastName` | string | ✅ Yes | Last name of the guest |
| `guestEmail` | string | ✅ Yes | Guest email address |
| `guestCountry` | string | ✅ Yes | 2-character ISO country code (e.g., "US") |
| `guestZip` | string | ✅ Yes | ZIP/Postal code |
| `guestPhone` | string | ⚠️ Optional | Guest phone number (nullable) |
| `guestGender` | string | ⚠️ Optional | M, F, or N/A (nullable) |

### Example Guest Data

```javascript
const guestInfo = {
  guestFirstName: 'John',
  guestLastName: 'Doe',
  guestEmail: 'john.doe@example.com',
  guestPhone: '+1234567890',
  guestCountry: 'US',
  guestZip: '70506',
  guestGender: 'N/A'
};
```

---

## Step 4: Create Reservation

**Endpoint**: `POST /postReservation`  
**Authentication**: API Key or OAuth 2.0  
**Content-Type**: `application/x-www-form-urlencoded` (or `application/json`)

### Required Fields

Based on the `PostReservationRequest` schema:

#### 1. Dates
- `startDate` - Check-in date (YYYY-MM-DD)
- `endDate` - Check-out date (YYYY-MM-DD)

#### 2. Guest Information
- `guestFirstName` - Required
- `guestLastName` - Required
- `guestEmail` - Required
- `guestCountry` - Required (2-character ISO code)
- `guestZip` - Required
- `guestPhone` - Optional (nullable)
- `guestGender` - Optional (M, F, or N/A)

#### 3. Rooms Array
```javascript
rooms: [
  {
    roomTypeID: "629879",      // Required
    quantity: 1,                // Required
    roomRateID: "2260273",      // Optional but recommended
    roomID: null                // Optional (for specific room assignment)
  }
]
```

#### 4. Adults Array
```javascript
adults: [
  {
    roomTypeID: "629879",      // Required
    quantity: 2,                // Required
    roomID: null               // Optional
  }
]
```

#### 5. Children Array
```javascript
children: []  // Required array (can be empty)
// OR
children: [
  {
    roomTypeID: "629879",      // Required if children > 0
    quantity: 1,                // Required if children > 0
    roomID: null                // Optional
  }
]
```

### Complete Reservation Payload Example

```javascript
const reservationData = {
  propertyID: '315701',
  startDate: '2025-12-01',
  endDate: '2025-12-02',
  
  // Guest information
  guestFirstName: 'John',
  guestLastName: 'Doe',
  guestEmail: 'john.doe@example.com',
  guestPhone: '+1234567890',
  guestCountry: 'US',
  guestZip: '70506',
  guestGender: 'N/A',
  
  // Rooms
  rooms: [
    {
      roomTypeID: '629879',
      quantity: 1,
      roomRateID: '2260273'
    }
  ],
  
  // Adults
  adults: [
    {
      roomTypeID: '629879',
      quantity: 2
    }
  ],
  
  // Children (empty array if no children)
  children: []
};
```

### Optional Fields

- `sourceID` - Third-party source ID
- `thirdPartyIdentifier` - Booking channel identifier
- `estimatedArrivalTime` - 24-hour format (e.g., "14:00")
- `guestRequirements` - Array of guest requirement objects
- `promoCode` - Promotional code
- `allotmentBlockCode` - Allotment block code
- `groupCode` - Aggregate allotment block code
- `sendEmailConfirmation` - Boolean (default: true)
- `customFields` - Array of custom field objects

### Example Request

```javascript
const result = await postReservation(reservationData);
```

### Response Structure

```json
{
  "success": true,
  "reservationID": "12345678",
  "status": "confirmed",
  "guestID": "98765432",
  "guestFirstName": "John",
  "guestLastName": "Doe",
  "guestEmail": "john.doe@example.com",
  "startDate": "2025-12-01",
  "endDate": "2025-12-02"
}
```

---

## Complete Flow Example

```javascript
import {
  getAvailableRoomTypes,
  postReservation
} from './lib/cloudbeds-api-client.js';

// Step 1: Get availability
const availability = await getAvailableRoomTypes({
  propertyIDs: '315701',
  startDate: '2025-12-01',
  endDate: '2025-12-02',
  rooms: 1,
  adults: 2,
  children: 0,
  detailedRates: true
});

// Step 2: Select room (first available)
const selectedRoom = availability.data[0].propertyRooms[0];

// Step 3: Prepare guest information
const guestInfo = {
  guestFirstName: 'John',
  guestLastName: 'Doe',
  guestEmail: 'john.doe@example.com',
  guestPhone: '+1234567890',
  guestCountry: 'US',
  guestZip: '70506',
  guestGender: 'N/A'
};

// Step 4: Create reservation
const reservationData = {
  propertyID: '315701',
  startDate: '2025-12-01',
  endDate: '2025-12-02',
  ...guestInfo,
  rooms: [
    {
      roomTypeID: selectedRoom.roomTypeID,
      quantity: 1,
      roomRateID: selectedRoom.roomRateID
    }
  ],
  adults: [
    {
      roomTypeID: selectedRoom.roomTypeID,
      quantity: 2
    }
  ],
  children: []
};

const result = await postReservation(reservationData);
console.log('Reservation created:', result.reservationID);
```

---

## Testing

### Using the Test Script

```bash
# Basic test: 1 night stay (today to tomorrow)
node scripts/test-cloudbeds-booking.js

# Test with specific number of nights
node scripts/test-cloudbeds-booking.js 7  # 7 night stay (weekly rate)
node scripts/test-cloudbeds-booking.js 30 # 30 night stay (monthly rate)

# Test with promo codes (1-6 night stays)
node scripts/test-cloudbeds-booking.js 1 LOCAL    # LOCAL discount
node scripts/test-cloudbeds-booking.js 1 AARP     # AARP discount
node scripts/test-cloudbeds-booking.js 1 MILITARY # MILITARY discount

# Custom test with all parameters
node scripts/test-cloudbeds-booking.js \
  1 \          # nights
  1 \          # rooms
  2 \          # adults
  0 \          # children
  "John" \     # firstName
  "Doe" \      # lastName
  "john@example.com" \  # email
  "+1234567890" \       # phone
  "US" \       # country
  "70506"      # zip
```

### Testing Rate Plans

Test different stay durations to identify available rate plans:

```bash
# Test all rate plans (1, 7, 30 nights)
node scripts/test-booking-rates.js
```

This will test:
- **1 night**: Daily rate (default)
- **7 nights**: Weekly rate (if available)
- **30 nights**: Monthly rate (if available)

The system automatically identifies and uses the best available rate plan for each stay duration.

### Testing Promo Codes

Test discount promo codes (AARP, MILITARY, LOCAL):

```bash
# Test all promo codes with 1 night stay
node scripts/test-promo-codes.js 1

# Test with different stay durations
node scripts/test-promo-codes.js 3  # 3 night stay
node scripts/test-promo-codes.js 6  # 6 night stay (max for promo codes)
```

This will:
- Show baseline rates (no promo code)
- Test each promo code (AARP, MILITARY, LOCAL)
- Verify 10% discount is applied
- Show savings comparison

### Using the Test Module

```javascript
import { testBookingFlow } from './lib/cloudbeds-booking-test.js';

const result = await testBookingFlow({
  propertyID: '315701',
  startDate: '2025-12-01',
  endDate: '2025-12-02',
  rooms: 1,
  adults: 2,
  children: 0,
  guestFirstName: 'John',
  guestLastName: 'Doe',
  guestEmail: 'john@example.com',
  guestPhone: '+1234567890',
  guestCountry: 'US',
  guestZip: '70506'
});

if (result.success) {
  console.log('Reservation ID:', result.step4_reservation.data.reservationID);
}
```

---

## Validation

The system includes validation functions to check reservation data before submission:

```javascript
import { validateReservationData } from './lib/cloudbeds-booking-test.js';

const validation = validateReservationData(reservationData);

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  console.warn('Warnings:', validation.warnings);
}
```

### Validation Checks

- ✅ Required fields present
- ✅ Dates valid (endDate after startDate)
- ✅ Arrays properly formatted (rooms, adults, children)
- ✅ Array items have required fields (roomTypeID, quantity)
- ⚠️ Email format (basic check)
- ⚠️ Country code format (2 characters)

---

## Common Errors

### Missing Required Fields

**Error**: `Missing required field: guestFirstName`

**Solution**: Ensure all required fields are provided:
- `guestFirstName`
- `guestLastName`
- `guestEmail`
- `guestCountry`
- `guestZip`
- `startDate`
- `endDate`
- `rooms` (array)
- `adults` (array)

### Invalid Array Format

**Error**: `rooms must be an array`

**Solution**: Ensure `rooms`, `adults`, and `children` are arrays:
```javascript
rooms: [{ roomTypeID: "...", quantity: 1 }]  // ✅ Correct
rooms: { roomTypeID: "...", quantity: 1 }   // ❌ Wrong
```

### Empty Arrays

**Error**: `rooms array cannot be empty`

**Solution**: Arrays must contain at least one item (except `children` which can be empty):
```javascript
rooms: [{ roomTypeID: "...", quantity: 1 }]  // ✅ Correct
rooms: []                                      // ❌ Wrong
children: []                                   // ✅ Correct (can be empty)
```

### Invalid Date Range

**Error**: `endDate must be after startDate`

**Solution**: Ensure check-out date is after check-in date.

---

## Integration with Booking Flow

This flow integrates with the conversation flow in `server-realtime.js`:

1. **User provides dates** → Call `getAvailableRoomTypes`
2. **User selects room** → Store `roomTypeID` and `roomRateID`
3. **User provides guest info** → Collect all required fields
4. **User confirms booking** → Call `postReservation` with complete data

See `BRANCHING_LOGIC_IMPLEMENTATION_PLAN.md` for integration details.

---

## References

- **OpenAPI Spec**: `user_input_files/cloudbeds-integration/pms-v1.3-openapi.yaml`
- **Schema**: `PostReservationRequest` (line 6381)
- **Endpoint CSV**: `Booking_Agent_Endpoints__from_pms-v1_3-openapi_yaml_.csv`
- **Test Module**: `lib/cloudbeds-booking-test.js`
- **API Client**: `lib/cloudbeds-api-client.js`

---

**Status**: ✅ Complete and Tested  
**Last Updated**: 2025-11-13

