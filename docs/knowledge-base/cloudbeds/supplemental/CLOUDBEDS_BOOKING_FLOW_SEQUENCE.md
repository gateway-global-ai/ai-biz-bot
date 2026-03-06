# CloudBeds API Booking Flow - Sequential Endpoint Sequence

## Overview

This document illustrates the **exact sequential order** in which CloudBeds API endpoints must be called during the booking process. Following this sequence is critical for successful integration.

**Flow Type**: Booking Agent  
**Total Steps**: 12  
**Required Endpoints**: 3  
**Optional Endpoints**: 2  

---

## Booking Flow Sequence Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    BOOKING AGENT FLOW                            │
│              Sequential Endpoint Execution                       │
└─────────────────────────────────────────────────────────────────┘

STEP 0: Optional Inputs (Can be collected anytime during call)
        ↓
STEP 1: Set Defaults
        ↓
STEP 2: Collect startDate (Required)
        ↓
STEP 3: Collect endDate (Required)
        ↓
STEP 4: GET /getAvailableRoomTypes ⚡ API CALL
        ↓
STEP 5: Present Best Available Option (Voice/SMS)
        ↓
STEP 6: Send All Options via SMS/Email
        ↓
STEP 7: Get Room & Rate Selection
        ↓
STEP 8: Webhook → Customer Intake Form
        ↓
STEP 9: Webhook → Customer Details Submission
        ↓
STEP 10: POST /postReservation ⚡ API CALL
        ↓
STEP 11: Send PayByLink to Customer
        ↓
STEP 12: Webhook from CloudBeds (Payment Confirmed)
        ↓
STEP 13: Send SMS Confirmation
```

---

## Detailed Step-by-Step Flow

### STEP 0: Optional Inputs (Can be collected anytime during call)

**When**: Anytime during the conversation  
**Purpose**: Collect preferences that don't block the flow

#### Optional Inputs Accepted:

| Input | Variable | Action |
|-------|----------|--------|
| **Discount Request** | `groupCode` | Set discount code: `LOCAL`, `SENIOR`, or `MILITARY` |
| **Multiple Rooms** | `rooms` | Set total number of rooms requested |
| **Adults Count** | `caller.preference.adults` | Set actual number of adults |
| **Children Count** | `caller.preference.children` | Set actual number of children |
| **Pets** | `caller.preference.pets` | Set to `yes`, apply pet fee as item (SKU: 959293, $10/night) |
| **Bed Preference** | `caller.preference.numberOfBeds` | Set to `1` or `2` |

**Note**: These can be collected at any point and will be used in Step 4 when calling `/getAvailableRoomTypes`.

---

### STEP 1: Set Defaults

**When**: Flow initialization  
**Purpose**: Establish default values before collecting required inputs

**Default Values**:
```javascript
{
  propertyIDs: "315701",  // {{hotel.id}}
  rooms: 1,               // Default: 1 room
  adults: 1,              // Default: 1 adult
  children: 0             // Default: 0 children
}
```

**Action**: Store defaults in conversation state  
**No API Call Required**

---

### STEP 2: Collect startDate (Required Input)

**When**: After defaults are set  
**Purpose**: Get check-in date from caller

**Input Collection**:
- **Voice**: "What date would you like to check in?"
- **SMS**: User provides date in natural language
- **Parsing**: Convert to format `YYYY-MM-DD`

**Date Handling**:
- "tonight" → Current date (if after 11 AM) or previous night (if before 11 AM)
- "tomorrow" → Next day (clarify if between 12 AM - 3 PM)
- "December 1st" → `2025-12-01`
- Early check-in: If before 11 AM, offer early check-in option ($25 fee, SKU: 075051)

**Variable**: `{{caller.startDate}}`  
**Format**: `YYYY-MM-DD`  
**No API Call Required**

---

### STEP 3: Collect endDate (Required Input)

**When**: After startDate is collected  
**Purpose**: Get check-out date from caller

**Input Collection**:
- **Voice**: "How many nights will you be staying?" or "What date would you like to check out?"
- **SMS**: User provides nights or end date
- **Calculation**: If nights provided, calculate `endDate = startDate + nights`

**Variable**: `{{caller.endDate}}`  
**Format**: `YYYY-MM-DD`  
**No API Call Required**

---

### STEP 4: GET /getAvailableRoomTypes ⚡ **API CALL**

**When**: After both startDate and endDate are collected  
**Purpose**: Fetch available rooms and rates

**Endpoint**: `GET /getAvailableRoomTypes`  
**Method**: GET  
**Authentication**: API Key or OAuth 2.0  
**Required Parameters**:
```javascript
{
  propertyIDs: "315701",           // From Step 1
  startDate: "2025-12-01",         // From Step 2
  endDate: "2025-12-03",           // From Step 3
  rooms: 1,                        // From Step 1 or Step 0
  adults: 2,                       // From Step 1 or Step 0
  children: 0,                     // From Step 1 or Step 0
  promoCode: "LOCAL",              // Optional: From Step 0 (if discount requested)
  detailedRates: true,             // Always true for booking
  includeSharedRooms: false        // Default: false
}
```

**Optional Parameters** (from Step 0):
- `promoCode`: `LOCAL`, `SENIOR`, or `MILITARY` (if discount requested)
- `rooms`: Override default if multiple rooms requested
- `adults`: Override default if specified
- `children`: Override default if specified

**Response Structure**:
```json
{
  "success": true,
  "data": [
    {
      "propertyID": "315701",
      "propertyRooms": [
        {
          "roomTypeID": "629879",
          "roomTypeName": "King Suite Interior",
          "roomRate": "89.00",
          "roomsAvailable": 8,
          "maxGuests": 2,
          "roomTypeFeatures": [...],
          "roomTypePhotos": [...]
        }
      ]
    }
  ]
}
```

**Error Handling**:
- If no rooms available: Inform caller and suggest alternative dates
- If API error: Log error and retry with fallback

**Next Step**: Use response data for Steps 5-7

---

### STEP 5: Present Best Available Option

**When**: Immediately after Step 4 API response  
**Purpose**: Show caller the best available room option

**Selection Logic**:
- Sort rooms by price (lowest first)
- Apply discount if `promoCode` was used (10% off for 1-6 nights)
- Select first available room

**Presentation Methods**:

**A. Voice Response**:
```
"I found a great option for you! The King Suite Interior is available 
for $89 per night. That's $178 total for 2 nights. Would you like to 
book this room?"
```

**B. SMS Response**:
```
"Great! I found the perfect room for you. Here are your options: [SMS Link]"
```

**Variables Used**:
- `roomTypeID`: From API response
- `roomTypeName`: From API response
- `roomRate`: From API response (with discount applied if applicable)
- `totalCost`: Calculated (rate × nights + fees)

**No API Call Required**

---

### STEP 6: Send All Options via SMS/Email

**When**: After Step 5 (or if caller requests more options)  
**Purpose**: Provide caller with all available room options

**Action**: Generate SMS link with room availability display

**UI Component**: `room_availability_display`  
**Data Passed**:
```javascript
{
  rooms: [
    {
      roomTypeID: "629879",
      name: "King Suite Interior",
      price: 89.00,
      discountedPrice: 80.10,  // If discount applied
      available: 8,
      description: "...",
      image: "..."
    },
    // ... more rooms
  ],
  startDate: "2025-12-01",
  endDate: "2025-12-03",
  nights: 2,
  selectedDiscount: "LOCAL",  // If applicable
  basePrice: 89.00,
  discountedPrice: 80.10
}
```

**SMS Link**: Short link to room selection UI  
**Webhook**: `/api/sms-links-ui/room-selected` (called when user selects room)

**No API Call Required** (uses data from Step 4)

---

### STEP 7: Get Room & Rate Selection

**When**: After user selects a room (from Step 5 or Step 6)  
**Purpose**: Collect selected room and rate details

**Selection Data**:
```javascript
{
  roomTypeID: "629879",           // Selected room
  ratePlanID: "12345",            // Rate plan ID
  roomRate: 89.00,                // Base rate
  discountedPrice: 80.10,         // If discount applied
  selectedDiscount: "LOCAL",      // If discount selected
  startDate: "2025-12-01",
  endDate: "2025-12-03",
  nights: 2,
  rooms: 1,
  adults: 2,
  children: 0
}
```

**Additional Items** (if applicable):
- Early check-in fee: $25 (SKU: 075051) - if early check-in requested
- Pet fee: $10/night (SKU: 959293) - if `caller.preference.pets = yes`

**Variables Stored**:
- `{{caller.selectedRoom.roomTypeID}}`
- `{{caller.selectedRoom.ratePlanID}}`
- `{{caller.selectedRoom.roomRate}}`
- `{{caller.selectedRoom.discountedPrice}}`

**No API Call Required**

---

### STEP 8: Webhook → Customer Intake Form

**When**: After room selection (Step 7)  
**Purpose**: Collect customer information

**Webhook Endpoint**: `/api/sms-links-ui/room-selected`  
**Webhook Payload**:
```javascript
{
  componentId: "comp_123456",
  action: "select",
  data: {
    roomTypeID: "629879",
    ratePlanID: "12345",
    // ... room selection data
  }
}
```

**Action**: Generate customer intake form UI component

**UI Component**: `booking_form`  
**Form Fields**:
- `guestFirstName` (required)
- `guestLastName` (required)
- `guestPhone` (required, pre-filled from SMS sender, read-only)
- `guestCellPhone` (optional, pre-filled from SMS sender, read-only)
- `guestEmail` (required)

**Pre-population**:
- If guest exists in CloudBeds (from phone lookup): Auto-fill all fields
- Phone number: Always pre-filled and read-only (identity verification)

**Success Page**: Customer intake form  
**No API Call Required** (UI generation only)

---

### STEP 9: Webhook → Customer Details Submission

**When**: After customer submits intake form (Step 8)  
**Purpose**: Receive customer information for reservation creation

**Webhook Endpoint**: `/api/sms-links-ui/booking-form-submitted`  
**Webhook Payload**:
```javascript
{
  componentId: "comp_123456",
  action: "submit",
  data: {
    guestFirstName: "John",
    guestLastName: "Doe",
    guestPhone: "+17025405471",
    guestCellPhone: "+17025405471",
    guestEmail: "john.doe@example.com",
    // ... room selection data from Step 7
  }
}
```

**Action**: Store customer details and prepare for reservation creation

**Variables Stored**:
- `{{caller.guestFirstName}}`
- `{{caller.guestLastName}}`
- `{{caller.guestPhone}}`
- `{{caller.guestEmail}}`

**Next Step**: Proceed to Step 10 (POST reservation)

**No API Call Required** (data collection only)

---

### STEP 10: POST /postReservation ⚡ **API CALL**

**When**: After customer details are collected (Step 9)  
**Purpose**: Create reservation in CloudBeds

**Endpoint**: `POST /postReservation`  
**Method**: POST  
**Authentication**: **OAuth 2.0 Required** ⚠️  
**Content-Type**: `application/x-www-form-urlencoded`

**Required Parameters**:
```javascript
{
  propertyID: "315701",
  email: "john.doe@example.com",        // From Step 9
  firstName: "John",                    // From Step 9
  lastName: "Doe",                      // From Step 9
  startDate: "2025-12-01",              // From Step 2
  endDate: "2025-12-03",                // From Step 3
  roomTypeID: "629879",                 // From Step 7
  ratePlanID: "12345",                  // From Step 7
  adultGuests: 2,                       // From Step 1 or Step 0
  children: [                           // Required array (even if empty)
    {
      roomTypeID: "629879",
      quantity: 0
    }
  ],
  rooms: [                              // Room array
    {
      roomTypeID: "629879",
      quantity: 1
    }
  ]
}
```

**Optional Parameters**:
```javascript
{
  guestPhone: "+17025405471",           // From Step 9
  guestCellPhone: "+17025405471",       // From Step 9
  items: [                              // Additional fees
    {
      itemID: "075051",                 // Early check-in fee (if applicable)
      quantity: 1,
      price: 25.00
    },
    {
      itemID: "959293",                 // Pet fee (if caller.preference.pets = yes)
      quantity: 2,                      // Number of nights
      price: 10.00
    }
  ],
  groupCode: "LOCAL",                   // If discount applied
  sourceID: "your_source_id",           // Your integration source ID
  notes: "Booking via AI Assistant"     // Optional note
}
```

**Response Structure**:
```json
{
  "success": true,
  "data": {
    "reservationID": "123456",
    "status": "not_confirmed",
    "confirmationNumber": "CB-123456",
    "totalAmount": 195.20,
    // ... reservation details
  }
}
```

**Error Handling**:
- If reservation creation fails: Log error, inform caller, offer to retry
- If rate not found: Check roomTypeID and ratePlanID, retry with correct values

**Variables Stored**:
- `{{caller.reservationID}}`
- `{{caller.reservationStatus}}` = "not_confirmed"
- `{{caller.confirmationNumber}}`

**Next Step**: Proceed to Step 11 (Send PayByLink)

---

### STEP 11: Send PayByLink to Customer

**When**: Immediately after reservation is created (Step 10)  
**Purpose**: Provide payment link for reservation confirmation

**Action**: Generate PayByLink from CloudBeds

**CloudBeds PayByLink**:
- Generated automatically by CloudBeds after reservation creation
- Sent via SMS or email to customer
- Link format: `https://pay.cloudbeds.com/...`

**SMS Message**:
```
"Your reservation has been created! Confirmation: CB-123456
Total: $195.20

To confirm your reservation, please complete payment:
[PayByLink URL]

Your reservation will be confirmed once payment is received."
```

**Email** (if email provided):
- CloudBeds automatically sends confirmation email with PayByLink

**Variables Used**:
- `{{caller.confirmationNumber}}`
- `{{caller.reservationID}}`
- `{{caller.totalAmount}}`

**No API Call Required** (CloudBeds handles PayByLink generation)

---

### STEP 12: Webhook from CloudBeds (Payment Confirmed)

**When**: When customer completes payment via PayByLink  
**Purpose**: Receive notification that reservation is confirmed

**Webhook Endpoint**: `/api/cloudbeds/webhook` (configured in CloudBeds)  
**Webhook Event**: `reservation.payment_confirmed` or `reservation.status_changed`

**Webhook Payload** (example):
```json
{
  "event": "reservation.status_changed",
  "reservationID": "123456",
  "status": "confirmed",
  "propertyID": "315701",
  "timestamp": "2025-12-01T10:30:00Z"
}
```

**Action**: Update reservation status in system

**Variables Updated**:
- `{{caller.reservationStatus}}` = "confirmed"

**Next Step**: Proceed to Step 13 (Send confirmation)

**No API Call Required** (webhook receiver only)

---

### STEP 13: Send SMS Confirmation

**When**: After payment confirmation webhook received (Step 12)  
**Purpose**: Confirm reservation completion to customer

**SMS Message**:
```
"🎉 Your reservation is confirmed!

Confirmation: CB-123456
Check-in: December 1, 2025 at 3:00 PM
Check-out: December 3, 2025 at 11:00 AM
Room: King Suite Interior

We look forward to hosting you at Boardwalk Suites Lafayette!"
```

**Variables Used**:
- `{{caller.confirmationNumber}}`
- `{{caller.startDate}}`
- `{{caller.endDate}}`
- `{{caller.selectedRoom.roomTypeName}}`

**No API Call Required**

---

## Endpoint Summary

### Required API Calls (2)

| Step | Endpoint | Method | Auth | Purpose |
|------|----------|--------|------|---------|
| **4** | `/getAvailableRoomTypes` | GET | API Key/OAuth | Get available rooms |
| **10** | `/postReservation` | POST | **OAuth 2.0** ⚠️ | Create reservation |

### Optional API Calls (2)

| Step | Endpoint | Method | Auth | Purpose |
|------|----------|--------|------|---------|
| **Pre-0** | `/getGuestList` or `/getGuestsByFilter` | GET | API Key/OAuth | Lookup existing guest |
| **Pre-0** | `/getHotelDetails` | GET | API Key/OAuth | Get hotel details (check-in/out times) |

### Webhook Endpoints (3)

| Step | Endpoint | Purpose |
|------|----------|---------|
| **8** | `/api/sms-links-ui/room-selected` | Receive room selection |
| **9** | `/api/sms-links-ui/booking-form-submitted` | Receive customer details |
| **12** | `/api/cloudbeds/webhook` | Receive payment confirmation |

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA FLOW                                 │
└─────────────────────────────────────────────────────────────┘

Step 0: Optional Inputs
  ↓
  caller.preference.* → Stored in conversation state

Step 1: Defaults
  ↓
  propertyIDs, rooms, adults, children → Stored

Step 2-3: Required Dates
  ↓
  startDate, endDate → Stored

Step 4: API Call
  ↓
  GET /getAvailableRoomTypes
  ↓
  Response: Available rooms with rates
  ↓
  Stored: roomTypeID, roomRate, availability

Step 5-7: Selection
  ↓
  User selects room
  ↓
  Stored: selectedRoom.roomTypeID, ratePlanID

Step 8-9: Customer Info
  ↓
  Webhook: Customer intake form submission
  ↓
  Stored: guestFirstName, guestLastName, guestEmail, guestPhone

Step 10: API Call
  ↓
  POST /postReservation
  ↓
  Response: reservationID, confirmationNumber, status="not_confirmed"
  ↓
  Stored: reservationID, confirmationNumber

Step 11: PayByLink
  ↓
  CloudBeds generates PayByLink
  ↓
  Sent to customer via SMS/Email

Step 12: Webhook
  ↓
  CloudBeds webhook: Payment confirmed
  ↓
  Updated: reservationStatus="confirmed"

Step 13: Confirmation
  ↓
  SMS sent to customer
```

---

## Critical Dependencies

### Sequential Dependencies

1. **Step 4 depends on Steps 1-3**: Cannot call `/getAvailableRoomTypes` without `startDate` and `endDate`
2. **Step 10 depends on Steps 2-3, 7, 9**: Cannot create reservation without dates, room selection, and customer info
3. **Step 12 depends on Step 10**: Cannot receive payment confirmation without reservation

### Data Dependencies

- `startDate` and `endDate` must be valid dates in `YYYY-MM-DD` format
- `roomTypeID` and `ratePlanID` must match values from Step 4 response
- `guestEmail` must be valid email format
- `guestPhone` must be in E.164 format (e.g., `+17025405471`)

---

## Error Handling

### Step 4 Errors

**No rooms available**:
- Action: Inform caller, suggest alternative dates
- Retry: Ask for new dates and restart from Step 2

**API Error**:
- Action: Log error, retry with exponential backoff
- Fallback: Use cached availability if available

### Step 10 Errors

**"No rate found"**:
- Cause: Invalid `roomTypeID` or `ratePlanID`
- Action: Re-fetch availability (Step 4) and retry

**"Parameter children is required"**:
- Cause: Missing or empty `children` array
- Action: Ensure `children` array includes at least one object with `quantity: 0`

**OAuth Token Expired**:
- Action: Refresh token automatically and retry

---

## Integration Checklist

- [ ] Step 0: Optional inputs collection implemented
- [ ] Step 1: Defaults set correctly
- [ ] Step 2: Date parsing for `startDate` working
- [ ] Step 3: Date calculation for `endDate` working
- [ ] Step 4: `/getAvailableRoomTypes` API call implemented
- [ ] Step 5: Best option presentation working
- [ ] Step 6: SMS link generation for room selection
- [ ] Step 7: Room selection webhook handler
- [ ] Step 8: Customer intake form UI generation
- [ ] Step 9: Customer details webhook handler
- [ ] Step 10: `/postReservation` API call implemented with OAuth
- [ ] Step 11: PayByLink generation/sending
- [ ] Step 12: CloudBeds webhook receiver configured
- [ ] Step 13: SMS confirmation sending

---

## Example Implementation

See `lib/booking-flow-manager.js` for reference implementation.

---

**Last Updated**: 2025-11-14  
**Flow Version**: 1.0

