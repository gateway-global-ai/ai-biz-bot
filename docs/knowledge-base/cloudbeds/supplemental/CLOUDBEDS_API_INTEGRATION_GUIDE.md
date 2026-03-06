# CloudBeds API Integration Guide
## For Boardwalk Suites Lafayette AI Voice Assistant

**API Version**: v1.3 (OpenAPI 3.0)  
**Property ID**: 315701  
**Base URL**: `https://api.cloudbeds.com/api/v1.3`

---

## Overview

This guide documents the CloudBeds API integration for the Boardwalk Suites Lafayette AI Voice Assistant. The integration uses CloudBeds PMS API v1.3 with role-based endpoint access.

---

## Reference Files

All CloudBeds API documentation is located in:
```
user_input_files/cloudbeds-integration/
```

### Key Files:

1. **`pms-v1.3-openapi.yaml`**
   - Complete OpenAPI 3.0 specification
   - All 115 endpoints, parameters, and response schemas
   - Use for programmatic API client generation

2. **Role-Based Endpoint CSV Files (Complete Lists):**
   - `Booking_Agent_Endpoints__from_pms-v1_3-openapi_yaml_.csv` - **85 endpoints** (Booking flow)
   - `Concierge_Endpoints__from_pms-v1_3-openapi_yaml_.csv` - **52 endpoints** (Information flow)
   - `Customer_Experience_Endpoints__from_pms-v1_3-openapi_yaml_.csv` - **67 endpoints** (Guest services)
   - `Employee_Ops_Endpoints__from_pms-v1_3-openapi_yaml_.csv` - **115 endpoints** (Full access)

   **Note**: All CSV files have been regenerated with complete endpoint lists extracted from the OpenAPI YAML. Each file contains all endpoints accessible to that role based on security permissions.

3. **Example Files:**
   - `getAvailableRoomTypes-examples` - Example request/response for availability

4. **Documentation:**
   - `CLOUDBEDS_ENDPOINT_MAPPING.md` - Complete endpoint mapping by role
   - `ENDPOINT_SUMMARY.md` - Quick reference summary

---

## Authentication

All API requests require:
- **Header**: `x-api-key: {CLOUDBEDS_API_KEY}`
- **Header**: `accept: application/json`
- **Content-Type**: `application/json` (for POST/PUT requests)

**Environment Variable**: `CLOUDBEDS_API_KEY`

---

## Endpoint Mapping by Flow

### Booking Flow Endpoints

**Primary Endpoints:**
1. **GET `/getAvailableRoomTypes`** (Booking Agent, Concierge)
   - Check room availability and rates
   - Required: `propertyIDs`, `startDate`, `endDate`
   - Optional: `rooms`, `adults`, `children`, `detailedRates`
   - **Used in**: Booking flow - Step 2.3 (Availability Check)

2. **POST `/postReservation`** (Booking Agent)
   - Create new reservation
   - Required: `propertyID`, `email`, `firstName`, `lastName`, `startDate`, `endDate`, `roomTypeID`, `ratePlanID`, `adultGuests`
   - **Used in**: Booking flow - Step 2.5 (Reservation Creation)

**Reference**: `Booking_Agent_Endpoints__from_pms-v1_3-openapi_yaml_.csv`

---

### Information Flow Endpoints

**Primary Endpoints:**
1. **GET `/getHotelDetails`** (Concierge, Booking Agent)
   - Get hotel information (name, address, phone, amenities, policies)
   - Required: `propertyID`
   - **Used in**: Information flow - Hotel data preloading

2. **GET `/getRoomTypes`** (Concierge)
   - Get all room types with descriptions
   - Optional: `propertyIDs`, `roomTypeIDs`, `startDate`, `endDate`
   - **Used in**: Information flow - Room type questions

**Reference**: `Concierge_Endpoints__from_pms-v1_3-openapi_yaml_.csv`

---

### Guest Services Flow Endpoints

**Primary Endpoints:**
1. **GET `/getReservations`** (Customer Experience, Booking Agent)
   - Look up existing reservations
   - Required: `propertyID`
   - Optional: `firstName`, `lastName`, `guestID`, `checkInFrom`, `checkInTo`
   - **Used in**: Guest Services flow - Verification

2. **GET `/getGuestsByFilter`** (Customer Experience, Concierge)
   - Search guests by name, phone, dates
   - Required: `propertyIDs`
   - Optional: `guestName`, `guestPhone`, `checkInFrom`, `checkInTo`
   - **Used in**: Guest Services flow - Verification

3. **PUT `/putReservation`** (Customer Experience, Booking Agent)
   - Modify existing reservation
   - Required: `reservationID`
   - **Used in**: Guest Services flow - Reservation modifications

4. **GET `/getReservation`** (Customer Experience)
   - Get specific reservation details
   - Required: `propertyID`, `reservationID`
   - **Used in**: Guest Services flow - Reservation lookup

**Reference**: `Customer_Experience_Endpoints__from_pms-v1_3-openapi_yaml_.csv`

---

## Implementation Details

### API Client Module

**File**: `lib/cloudbeds-api.js`

**Key Functions:**
- `getAvailableRoomTypes(params)` - Check availability
- `getHotelDetails(propertyID)` - Get hotel info
- `postReservation(reservationData)` - Create reservation
- `getReservations(params)` - Look up reservations
- `getGuestsByFilter(params)` - Search guests
- `putReservation(reservationID, reservationData)` - Modify reservation

### Error Handling

All functions return:
- `null` on error (network, API error, invalid response)
- `{ success: true, data: {...} }` on success
- Errors are logged to console with details

### Response Structure

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "count": 1,
  "total": 1
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description"
}
```

---

## Example: getAvailableRoomTypes

**Request:**
```bash
GET /api/v1.3/getAvailableRoomTypes?propertyIDs=315701&startDate=2025-12-01&endDate=2025-12-02&rooms=1&adults=1&children=0&detailedRates=true
```

**Response Structure:**
```json
{
  "success": true,
  "data": [
    {
      "propertyID": "315701",
      "propertyCurrency": { ... },
      "propertyRooms": [
        {
          "roomTypeID": "629879",
          "roomTypeName": "King Suite Level 1",
          "roomTypeDescription": "...",
          "maxGuests": "2",
          "roomRate": 79,
          "ratePlanID": "2260273",
          "roomsAvailable": 9,
          "roomRateDetailed": [ ... ],
          "individualRooms": [ ... ]
        }
      ]
    }
  ]
}
```

**See**: `user_input_files/cloudbeds-integration/getAvailableRoomTypes-examples` for complete example

---

## Integration Points

### Booking Flow

1. **Availability Check** (Step 2.3):
   ```javascript
   const availability = await cloudbeds.getAvailableRoomTypes({
     propertyIDs: '315701',
     startDate: state.booking.checkinDate,
     endDate: state.booking.checkoutDate,
     rooms: 1,
     adults: state.booking.adults,
     children: state.booking.children || 0,
     detailedRates: true
   });
   ```

2. **Reservation Creation** (Step 2.5):
   ```javascript
   const reservation = await cloudbeds.postReservation({
     propertyID: '315701',
     email: state.booking.guestEmail,
     firstName: firstName,
     lastName: lastName,
     startDate: state.booking.checkinDate,
     endDate: state.booking.checkoutDate,
     roomTypeID: state.booking.roomTypeId,
     ratePlanID: state.booking.ratePlanId,
     rooms: 1,
     adultGuests: state.booking.adults,
     childGuests: state.booking.children || 0
   });
   ```

### Information Flow

1. **Hotel Data Preloading**:
   ```javascript
   const hotelData = await cloudbeds.getHotelDetails('315701');
   // Cache for use in information responses
   ```

### Guest Services Flow

1. **Guest Verification**:
   ```javascript
   const reservations = await cloudbeds.getReservations({
     propertyID: '315701',
     firstName: guestFirstName,
     lastName: guestLastName,
     checkInFrom: checkInDate
   });
   ```

2. **Reservation Lookup**:
   ```javascript
   const reservation = await cloudbeds.getReservation({
     propertyID: '315701',
     reservationID: reservationId
   });
   ```

---

## Best Practices

1. **Always validate required parameters** before making API calls
2. **Handle null responses** - API functions return `null` on error
3. **Cache hotel details** - `getHotelDetails` doesn't change frequently
4. **Use detailedRates: true** for accurate pricing in availability checks
5. **Log errors** for debugging but don't expose to callers
6. **Retry logic** - Consider retrying transient failures

---

## Security

- **API Key**: Store in environment variable, never commit to code
- **HTTPS Only**: All API calls use HTTPS
- **Input Validation**: Validate all user inputs before API calls
- **Error Messages**: Don't expose internal API errors to callers

---

## Testing

Test each endpoint with:
1. Valid requests
2. Missing required parameters
3. Invalid property IDs
4. Network failures
5. API errors

**Test Property ID**: 315701 (Boardwalk Suites Lafayette)

---

## Next Steps

1. ✅ Review endpoint CSV files for role-based access
2. ✅ Implement API client functions
3. ⚠️ Integrate into booking flow
4. ⚠️ Integrate into information flow
5. ⚠️ Integrate into guest services flow
6. ⚠️ Add error handling and retry logic
7. ⚠️ Add response caching where appropriate

---

**Last Updated**: 2025-01-XX  
**API Version**: v1.3  
**Status**: Documentation Complete, Implementation In Progress

