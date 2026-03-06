# Hotel AI Voice Agent - Complete Developer Documentation

## Overview

The Hotel AI Voice Agent system provides complete automation for hotel operations including booking, guest services, and operations management. This system integrates with Cloudbeds API to provide seamless hotel operations automation through voice, SMS, and web interfaces.

**Version**: 1.0.0  
**Last Updated**: 2025-01-XX  
**Status**: Production Ready

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Roles and Responsibilities](#roles-and-responsibilities)
3. [Workflow Outcomes](#workflow-outcomes)
4. [Features](#features)
5. [Functionality](#functionality)
6. [API Endpoints](#api-endpoints)
7. [Data Structures](#data-structures)
8. [Field Mappings](#field-mappings)
9. [Best Practices](#best-practices)
10. [Implementation Guide](#implementation-guide)
11. [Troubleshooting](#troubleshooting)

---

## System Overview

### Architecture

The Hotel AI Voice Agent system consists of three main agent types, each handling specific aspects of hotel operations:

1. **Booking Agent** - Handles new reservations
2. **Customer Experience Agent** - Handles existing reservations and guest services
3. **Virtual General Manager** - Monitors and manages hotel operations

### Integration Points

- **Cloudbeds API v1.3** - Hotel operations and reservation management
- **Google Places API** - Business information and location data
- **Google Business Profile API** - Business profile management
- **ElevenLabs Conversational AI** - Voice agent platform
- **SMS Integration** - Forms and cards for data collection
- **Payment Processing** - Paybylink and saved card support

### Communication Channels

- **Voice** - Natural voice conversation via phone
- **SMS** - Forms, cards, and confirmations via text message
- **Web** - UI components for room selection and data collection

---

## Roles and Responsibilities

### 1. Guest

**Definition**: A customer who interacts with the hotel system to make reservations, check status, or request services.

**Characteristics**:
- May be new (no previous reservations) or returning (has guestID)
- Interacts via voice, SMS, or web interface
- Requires identity verification for sensitive operations
- Cannot access administrative functions

**Primary Goals**:
- Book a room
- Check reservation status
- Modify existing reservation
- Request services
- Make payments

**Permissions**:
- ✅ View own reservation (after identity verification)
- ✅ Modify own reservation (after identity verification)
- ✅ Cancel own reservation (subject to cancellation policy)
- ✅ Make payment (via paybylink or saved card)
- ✅ View room availability (public information)
- ✅ Request services (after identity verification)
- ❌ Access admin functions
- ❌ View other guests' data
- ❌ Modify room status

---

### 2. Booking Agent

**Definition**: An AI agent that handles new reservations and booking inquiries. Acts as a virtual front desk agent for booking operations.

**Primary Responsibilities**:
- Greet potential guests warmly
- Collect booking requirements (dates, guests, preferences)
- Check availability and rates
- Present room options with pricing
- Collect guest information
- Create new reservations
- Process payments (new guests: paybylink, existing guests: saved card or paybylink)
- Send confirmation emails

**Key Characteristics**:
- Focuses on **NEW reservations**
- Handles both new and returning guests
- Requires identity verification for returning guests
- Uses graphical UI for room selection
- Uses forms for guest data collection
- Always sends confirmation emails

**Workflow Type**: **Inbound** (Guest → Hotel) for new bookings

**Permissions**:
- ✅ Create new reservations (primary function)
- ✅ Check availability (for all dates)
- ✅ View room types and rates (public information)
- ✅ Collect guest information (via forms)
- ✅ Process payments (paybylink or saved card)
- ✅ Send confirmations (always required)
- ✅ Verify guest identity (for returning guests)
- ✅ View existing reservations (for returning guests)
- ⚠️ Modify existing reservations (only during booking process)
- ❌ Cancel reservations (refer to Customer Experience Agent)
- ❌ Access admin functions
- ❌ View housekeeping status

**Workflow Steps**:
1. Pre-Loading (hotel details, Google Places)
2. Greeting & Intent
3. Collect Check-In Date
4. Collect Check-Out Date
5. Collect Number of Guests
6. Check Availability & Rates (with `detailedRates=true`)
7. Present Room Options (UI)
8. Collect Guest Information (Form)
9. Lookup Supporting Data (sourceID, paymentMethodID)
10. Create Reservation
11. Check Payment Methods
12. Process Payment (saved card or paybylink)
13. Confirmation

---

### 3. Customer Experience Agent

**Definition**: An AI agent that handles existing reservations and guest service requests. Acts as a virtual concierge for current and past guests.

**Primary Responsibilities**:
- Verify guest identity (phone/email lookup)
- Retrieve existing reservation details
- Check reservation status (confirmed, checked_in, checked_out, cancelled)
- Modify reservations (extend stay, change dates, add services)
- Handle service requests
- Process payments for existing reservations
- Answer questions about current stay
- Handle check-in and check-out processes

**Key Characteristics**:
- Focuses on **EXISTING reservations**
- Requires identity verification (phone/email)
- Can check guests by status (in house, checked out)
- Handles reservation modifications
- Uses saved payment methods for returning guests
- Provides personalized service based on reservation history

**Workflow Type**: **Inbound** (Guest → Hotel) for existing reservations

**Permissions**:
- ✅ View existing reservations (after identity verification)
- ✅ Modify existing reservations (extend, change dates, add services)
- ✅ Cancel reservations (subject to cancellation policy)
- ✅ Check guest status (in house, checked out, etc.)
- ✅ Process payments (saved card or paybylink)
- ✅ Handle service requests (concierge services)
- ✅ Check-in guests (update status to checked_in)
- ✅ Check-out guests (update status to checked_out)
- ✅ View guest history (previous reservations)
- ⚠️ Create new reservations (refer to Booking Agent)
- ❌ Access admin functions

**Workflow Steps**:
1. Pre-Loading (hotel details, Google Places)
2. Greeting & Identity Verification
3. Get Reservation Details
4. Determine Intent
5. Handle Request (status, extend, modify, payment, check-in, check-out)
6. Confirmation

---

### 4. Virtual General Manager

**Definition**: An AI agent that oversees hotel operations, monitors performance, and manages staff workflows. Acts as an administrative assistant for hotel management.

**Primary Responsibilities**:
- Monitor hotel dashboard (occupancy, revenue, arrivals, departures)
- Track housekeeping status and assignments
- Monitor payment status and outstanding balances
- Monitor guest status (in house, checked out, arrivals, departures)
- Generate reports
- Alert on issues (overdue payments, housekeeping delays, etc.)
- Manage room status
- Coordinate staff workflows

**Key Characteristics**:
- Administrative access to all data
- No guest interaction (internal use only)
- Monitors multiple aspects of operations
- Generates alerts and reports
- Can access all endpoints (read-only for most, write for status updates)

**Workflow Type**: **Internal** (Hotel → Hotel) for operations management

**Permissions**:
- ✅ View all reservations (full access)
- ✅ View all guests (full access)
- ✅ View housekeeping status (full access)
- ✅ View payment status (full access)
- ✅ View dashboard metrics (full access)
- ✅ Update room status (for operations)
- ✅ Generate reports (all report types)
- ✅ View guest status by filter (in house, checked out, etc.)
- ✅ Monitor operations (all aspects)
- ⚠️ Create reservations (only for special cases)
- ⚠️ Modify reservations (only for special cases)
- ⚠️ Process payments (only for special cases)

**Workflow Steps**:
1. Dashboard Overview
2. Housekeeping Management
3. Payment Monitoring
4. Guest Status Monitoring
5. Reports

---

## Workflow Outcomes

### Booking Agent Workflow

**Outcome**: Book a hotel reservation

**Description**: Complete new reservation from initial contact through confirmation

**Success Criteria**:
- ✅ Reservation created with all required information
- ✅ Payment processed (saved card or paybylink)
- ✅ Confirmation email sent to guest
- ✅ Guest information collected and stored
- ✅ Room selected and assigned
- ✅ All dates and guest count validated

**Key Metrics**:
- Booking completion rate
- Average booking time
- Payment success rate
- Guest satisfaction score

**Failure Points**:
- Availability not found for requested dates
- Payment processing failure
- Guest information incomplete
- API errors during reservation creation

---

### Customer Experience Agent Workflow

**Outcome**: Handle existing reservations and guest services

**Description**: Manage existing reservations, modifications, and guest service requests

**Success Criteria**:
- ✅ Identity verified successfully
- ✅ Reservation retrieved and displayed
- ✅ Request handled (modify, extend, cancel, etc.)
- ✅ Confirmation provided to guest
- ✅ Payment processed if needed
- ✅ Status updated correctly

**Key Metrics**:
- Identity verification success rate
- Request handling time
- Guest satisfaction score
- Payment processing success rate

**Failure Points**:
- Identity verification failure
- Reservation not found
- Modification conflicts (dates, availability)
- Payment processing failure

---

### Virtual General Manager Workflow

**Outcome**: Monitor and manage hotel operations

**Description**: Oversee operations, track performance, and generate reports

**Success Criteria**:
- ✅ Dashboard displayed with current metrics
- ✅ Operations monitored in real-time
- ✅ Reports generated successfully
- ✅ Alerts triggered for issues
- ✅ Housekeeping status tracked
- ✅ Payment status monitored

**Key Metrics**:
- Occupancy rate
- Revenue (today, week, month)
- Arrivals/departures today
- In house guests count
- Available rooms count
- Housekeeping completion rate
- Payment collection rate

**Failure Points**:
- API errors retrieving data
- Dashboard data incomplete
- Reports generation failure
- Alert system not working

---

## Features

### 1. Identity Verification

**Description**: Verify guest identity using verified phone or email lookup

**Methods**:
- **Phone Lookup**: Match verified `{{customer.phone}}` to `guestPhone` OR `guestCellPhone`
- **Email Lookup**: Match verified `{{customer.email}}` to `guestEmail`
- **Combined Verification**: Check both phone and email for higher confidence

**Endpoints**:
- `GET /getGuestList` with `includeGuestInfo=true` (CRITICAL: Must be true)
- `GET /getReservationsWithRateDetails` with `includeGuestsDetails=true` (to get reservation status)

**Process**:
1. Set verified contact information from Vapi:
   - Set `{{guest.verifiedPhone}}` = `{{customer.phone}}` (if phone available from Vapi)
   - Set `{{guest.verifiedEmail}}` = `{{customer.email}}` (if email available from Vapi)
2. Use `{{guest.verifiedPhone}}` or `{{guest.verifiedEmail}}` to search for records
3. Call `getGuestList` with verified phone or email:
   - `getGuestList(guestPhone={{guest.verifiedPhone}}, includeGuestInfo=true)`
   - OR `getGuestList(guestEmail={{guest.verifiedEmail}}, includeGuestInfo=true)`
4. If match found, get `guestID` and `reservationID` (if exists)
5. If `reservationID` exists, call `getReservationsWithRateDetails` to get reservation status
6. Set `{{guest.status}}` = reservation status (from reservation, NOT from guest record)
7. Set `{{customer.verified}}` = true after successful verification

**Global Variables**:
- `{{guest.verifiedPhone}}` - Verified guest phone number from Vapi (used to search)
- `{{guest.verifiedEmail}}` - Verified guest email address from Vapi (used to search)
- `{{customer.verified}}` - Identity verification flag (true/false)

**Critical Notes**:
- `{{guest.verifiedPhone}}` and `{{guest.verifiedEmail}}` are set from verified `{{customer.phone}}` or `{{customer.email}}` from Vapi
- We use `{{guest.verifiedPhone}}` or `{{guest.verifiedEmail}}` to search for records
- `{{guest.status}}` is **ALWAYS** pulled from the reservation they are talking about (if they have one)
- If no reservation found, guest has no status
- Status values: `"confirmed"`, `"checked_in"`, `"checked_out"`, `"cancelled"`, `"no_show"`

**Use Cases**:
- Customer Experience Agent (verify identity for existing reservations)
- Booking Agent (check if returning guest)

**Best Practices**:
- Always use `includeGuestInfo=true` for complete guest data
- Always use `includeGuestsDetails=true` when getting reservation details
- Check both phone and email for higher confidence
- Set `{{customer.verified}}` flag after verification
- Get reservation status from `getReservationsWithRateDetails`, not from `getGuestList`
- Pre-fill forms for returning guests

---

### 2. Status Checks

**Description**: Check guest status (in house, checked out, etc.) from reservation

**Methods**:
- **From Reservation** (PRIMARY): `getReservationsWithRateDetails` with `includeGuestsDetails=true`
  - Use verified `{{guest.phone}}` or `{{guest.email}}` to find guest
  - Get reservation details to get status
  - `{{guest.status}}` = reservation status
- **By Status Filter**: `getGuestsByStatus` with status parameter
  - Returns guests filtered by reservation status
  - Status comes from their reservations, not directly from guest record
- **Recently Modified**: `getGuestsModified` for recent changes

**Status Values** (from reservation):
- `confirmed` - Reservation confirmed but not checked in
- `checked_in` - Currently checked in (in house)
- `checked_out` - Has checked out
- `cancelled` - Reservation cancelled
- `no_show` - Guest did not show up

**Endpoints**:
- `GET /getReservationsWithRateDetails` - Get reservation status (PRIMARY method)
- `GET /getGuestsByStatus` - Filter by status (status comes from reservations)
- `GET /getGuestsModified` - Get recently modified guests

**Process**:
1. Use verified `{{guest.verifiedPhone}}` or `{{guest.verifiedEmail}}` to search for guest
2. Call `getGuestList` with verified phone or email:
   - `getGuestList(guestPhone={{guest.verifiedPhone}}, includeGuestInfo=true)`
   - OR `getGuestList(guestEmail={{guest.verifiedEmail}}, includeGuestInfo=true)`
3. Get `guestID` from `getGuestList`
4. Call `getReservationsWithRateDetails` with `guestID` and `includeGuestsDetails=true`
5. Get `{{guest.status}}` from reservation status (NOT from guest record)
6. If multiple reservations, use most recent (with `sortByRecent=true`)

**Use Cases**:
- Virtual GM (monitor in house guests)
- Customer Experience Agent (check if guest is in house)
- Housekeeping (check room status)

**Best Practices**:
- **ALWAYS** get `{{guest.status}}` from reservation, NOT from guest record
- Always use `includeGuestsDetails=true` for complete reservation data
- Always use `sortByRecent=true` when using `guestID` (returns most recent first)
- Use verified `{{guest.verifiedPhone}}` or `{{guest.verifiedEmail}}` to search for records
- Set `{{guest.verifiedPhone}}` and `{{guest.verifiedEmail}}` from verified `{{customer.phone}}` or `{{customer.email}}` from Vapi
- Check status before allowing modifications

---

### 3. Room Selection UI

**Description**: Graphical UI for selecting rooms with photos, features, and rates

**Type**: `room_availability_display`

**Features**:
- Room photos gallery with lightbox
- Room features list
- Multiple rate plans (default, promotional)
- Best available rates highlighted
- Daily rate breakdown
- Savings calculations
- "Select Room" button

**Data Structure**:
```json
{
  "type": "room_availability_display",
  "data": {
    "propertyName": "{{hotel.propertyName}}",
    "propertyImage": "{{hotel.propertyImage}}",
    "propertyCurrency": {
      "currencyCode": "USD",
      "currencySymbol": "$",
      "currencyPosition": "before"
    },
    "propertyRooms": [
      {
        "roomTypeID": "629879",
        "roomTypeName": "King Suite Level 1",
        "roomTypeDescription": "Description",
        "maxGuests": "2",
        "roomRate": 573,
        "ratePlanNamePublic": "default",
        "roomsAvailable": 7,
        "roomTypePhotos": [
          {"thumb": "url", "image": "url"}
        ],
        "roomTypeFeatures": ["Feature 1", "Feature 2"],
        "roomRateDetailed": [
          {
            "date": "2025-11-10",
            "rate": 79,
            "base_rate": 79
          }
        ],
        "individualRooms": [
          {"roomID": "629879-1", "roomName": "101"}
        ]
      }
    ]
  }
}
```

**Used In**: Booking Agent workflow (Step 7: Present Room Options)

**Best Practices**:
- Always use `detailedRates=true` when checking availability
- Display multiple rate plans for comparison
- Highlight best available rates
- Show daily breakdown for transparency
- Include photos and features for better decision-making

---

### 4. Guest Information Forms

**Description**: Forms for collecting guest information for new reservations

**Type**: `guest_information_form`

**Form Fields**:
- First Name (required, text)
- Last Name (required, text)
- Email (required, email)
- Phone (required, phone)
- Address (optional, text)
- City (optional, text)
- State (optional, text)
- Zip (optional, text)
- Country (default: US, select)
- Birth Date (optional, date)
- ID Document Type (optional, select)
- ID Document Number (optional, text)

**Pre-fill Logic**:
- If returning guest (has `guestID`), pre-fill with existing data from `getGuestList`
- If new guest, all fields empty

**Validation**:
- Required fields must be filled
- Email must be valid format
- Phone must be valid format
- Dates must be valid format

**Used In**: Booking Agent workflow (Step 8: Collect Guest Information)

**Best Practices**:
- Check if returning guest before showing form
- Pre-fill form for returning guests
- Validate all required fields
- Provide clear instructions
- Use appropriate input types (email, phone, date)

---

### 5. Payment Processing

**Description**: Handle payments for reservations

**Methods**:
- **Saved Card** (Existing Guests Only): Use saved payment method from `getPaymentMethods`
- **Payment Link** (New Guests or No Saved Card): Generate `paybylink` for manual card entry
- **Stripe Integration** (External Gateway): Use `cardToken` and `paymentAuthorizationCode`

**Decision Tree**:
```
Guest needs to make payment
    │
    ├─ Is existing guest? (has guestID)
    │   │
    │   ├─ Yes → Check getPaymentMethods(guestID)
    │   │   │
    │   │   ├─ Has saved card? → Offer to use saved card
    │   │   │   │
    │   │   │   ├─ Guest confirms → Process payment with saved card
    │   │   │   │
    │   │   │   └─ Guest declines → Generate paybylink
    │   │   │
    │   │   └─ No saved card? → Generate paybylink
    │   │
    │   └─ No (new guest) → Generate paybylink
    │
    └─ Generate paybylink
```

**Endpoints**:
- `GET /getPaymentMethods` - Get saved payment methods
- `POST /paybylink` - Generate payment link

**Use Cases**:
- Booking Agent (new reservations)
- Customer Experience Agent (existing reservations)

**Best Practices**:
- Always check for saved card first (existing guests)
- Use paybylink for new guests or no saved card
- Send payment link via SMS
- Verify payment status after processing
- Send confirmation when payment processed

**Critical Notes**:
- Cannot accept credit card information directly via API (PCI compliance)
- Must use `paybylink` for manual card entry
- Saved cards only available for existing guests with `guestID`

---

### 6. Confirmation Emails

**Description**: Automatic confirmation emails sent after reservation creation

**Trigger**: `sendEmailConfirmation=true` in `postReservation` (CRITICAL: Must be true)

**Content**:
- Reservation details (reservationID, dates, room type)
- Total cost and payment information
- Check-in and check-out times
- Property information and policies
- Contact information

**Endpoints**:
- `POST /postReservation` with `sendEmailConfirmation=true`

**Use Cases**:
- Booking Agent (new reservations)
- Customer Experience Agent (reservation modifications)

**Best Practices**:
- Always set `sendEmailConfirmation=true` in `postReservation`
- Verify email was sent successfully
- Provide confirmation details in conversation
- Include reservationID for reference

---

## Functionality

### 1. Voice Interaction

**Description**: Natural voice conversation with guests

**Capabilities**:
- Speech recognition
- Natural language understanding
- Text-to-speech
- Conversation management

**Platform**: ElevenLabs Conversational AI

**Features**:
- Real-time voice conversation
- Natural language processing
- Context awareness
- Multi-turn conversations
- Interruption handling

**Use Cases**:
- Booking Agent (voice booking)
- Customer Experience Agent (voice support)
- All workflows (primary interaction method)

---

### 2. SMS Integration

**Description**: SMS forms and cards for data collection and room selection

**Capabilities**:
- SMS forms for structured data collection
- SMS cards for room selection
- Payment links via SMS
- Confirmations via SMS

**Types**:
- **Forms**: Structured data collection (guest information)
- **Cards**: Visual selection (room selection)
- **Links**: Payment links, confirmations

**Use Cases**:
- Booking Agent (room selection, guest information)
- Customer Experience Agent (modifications, confirmations)
- Payment processing (payment links)

**Best Practices**:
- Use forms for structured data
- Use cards for visual selections
- Send links via SMS for payments
- Provide clear instructions
- Validate input before submission

---

### 3. API Integration

**Description**: Integration with Cloudbeds API for hotel operations

**Capabilities**:
- Availability checks
- Reservation management
- Guest management
- Payment processing

**API Version**: Cloudbeds API v1.3

**Endpoints Used**:
- `GET /getAvailableRoomTypes` - Check availability and rates
- `POST /postReservation` - Create reservation
- `GET /getReservationsWithRateDetails` - Get reservation details
- `PUT /putReservation` - Modify reservation
- `GET /getGuestList` - Lookup guest information
- `GET /getGuestsByStatus` - Get guests by status
- `GET /getPaymentMethods` - Get saved payment methods
- `POST /paybylink` - Generate payment link
- `GET /getHotelDetails` - Get property information

**Best Practices**:
- Always use `detailedRates=true` for `getAvailableRoomTypes`
- Always use `includeGuestInfo=true` for `getGuestList`
- Always use `includeGuestsDetails=true` for `getReservationsWithRateDetails`
- Always use `sortByRecent=true` when using `guestID`
- Always set `sendEmailConfirmation=true` in `postReservation`

---

### 4. UI Components

**Description**: Graphical UI components for enhanced user experience

**Capabilities**:
- Room selection UI
- Forms for data collection
- Dashboards for operations
- Reports for management

**Types**:
- **Room Availability Display**: Room selection with photos, features, rates
- **Guest Information Form**: Guest data collection
- **Reservation Modification Form**: Modification data collection
- **Hotel Dashboard**: Operations metrics
- **Housekeeping Dashboard**: Housekeeping status
- **Payment Monitoring Dashboard**: Payment status
- **Guest Status Dashboard**: Guest status monitoring

**Use Cases**:
- Booking Agent (room selection, guest information)
- Customer Experience Agent (modifications)
- Virtual GM (dashboards, reports)

**Best Practices**:
- Use UI components for complex selections
- Use forms for structured data
- Use dashboards for operations monitoring
- Provide clear visual feedback
- Ensure responsive design

---

### 5. Identity Verification

**Description**: Automatic identity verification for returning guests

**Capabilities**:
- Phone lookup
- Email lookup
- Combined verification
- Guest matching

**Methods**:
- **Phone Lookup**: `getGuestList` with `guestPhone` or `guestCellPhone`
- **Email Lookup**: `getGuestList` with `guestEmail`
- **Combined**: Check both phone and email for higher confidence

**Use Cases**:
- Booking Agent (check if returning guest)
- Customer Experience Agent (verify identity)

**Best Practices**:
- Check both phone and email for higher confidence
- Use `includeGuestInfo=true` for complete guest data
- Set `{{customer.verified}}` flag after verification
- Pre-fill forms for returning guests

---

### 6. Status Management

**Description**: Real-time status tracking and management

**Capabilities**:
- Guest status tracking
- Reservation status tracking
- Room status tracking
- Payment status tracking

**Status Values**:
- **Guest Status**: `in_house`, `checked_out`, `not_checked_in`, `cancelled`
- **Reservation Status**: `confirmed`, `checked_in`, `checked_out`, `cancelled`
- **Room Status**: `clean`, `dirty`, `inspected`, `out_of_order`
- **Payment Status**: `pending`, `processed`, `failed`

**Use Cases**:
- Virtual GM (monitor all statuses)
- Customer Experience Agent (check guest/reservation status)
- Housekeeping (check room status)
- Payment processing (check payment status)

**Best Practices**:
- Use `getGuestsByStatus` for filtering by status
- Use `getReservationsWithRateDetails` for reservation status
- Use `sortByRecent=true` when using `guestID`
- Check status before allowing modifications

---

## API Endpoints

### Category 1: Availability & Rates

#### `GET /getAvailableRoomTypes`

**Purpose**: Check availability and rates

**Critical Parameter**: `detailedRates=true` (MUST BE TRUE)

**Required Parameters**:
- `propertyIDs` - Property ID
- `startDate` - Check-in date (YYYY-MM-DD)
- `endDate` - Check-out date (YYYY-MM-DD)
- `adults` - Number of adults
- `detailedRates` - Must be `true`

**Optional Parameters**:
- `rooms` - Number of rooms (default: 1)
- `children` - Number of children (default: 0)

**Returns**:
- Complete room data with photos, features, descriptions
- Multiple rate plans (default, promotional)
- Best available rates
- Real-time availability
- Daily rate breakdown (`roomRateDetailed`)
- Individual rooms (`individualRooms`)

**Why This is the BEST Endpoint**:
- Returns the MOST COMPLETE set of data
- Includes rooms, rates, availability, photos, features, best available rates
- Replaces multiple calls (`getRooms`, `getRates`, `getTaxesAndFees`)
- Most efficient - single call for complete data

**Example Request**:
```json
{
  "propertyIDs": "{{hotel.propertyID}}",
  "startDate": "{{customer.reservation.startDate}}",
  "endDate": "{{customer.reservation.endDate}}",
  "rooms": 1,
  "adults": "{{customer.reservation.numberOfGuests}}",
  "children": "{{customer.reservation.children ?? 0}}",
  "detailedRates": true
}
```

**Best Practice**: ALWAYS use `detailedRates=true` for complete data

---

### Category 2: Reservation Management

#### `POST /postReservation`

**Purpose**: Create new reservation

**Critical Parameter**: `sendEmailConfirmation=true` (MUST BE TRUE)

**Required Parameters**:
- `propertyID` - Property ID
- `sourceID` - Booking source (from `getSources`)
- `startDate` - Check-in date (YYYY-MM-DD)
- `endDate` - Check-out date (YYYY-MM-DD)
- `rooms` - Array of room objects
- `adults` - Array of adult objects
- `children` - Array of children objects
- `guestFirstName` - Guest first name
- `guestLastName` - Guest last name
- `guestEmail` - Guest email
- `guestPhone` - Guest phone
- `sendEmailConfirmation` - Must be `true`

**Optional Parameters**:
- `estimatedArrivalTime` - Estimated arrival time
- `guestRequirements` - Special requests
- `promoCode` - Promotional code (requires `groupCode`)
- `groupCode` - Group code (required with `promoCode`)
- `paymentMethod` - Payment method (if processing payment)
- `cardToken` - Stripe Customer ID (if using Stripe)
- `paymentAuthorizationCode` - Stripe Charge ID (if using Stripe)

**Rooms Array Structure**:
```json
[
  {
    "roomTypeID": "629879",
    "roomRateID": "2260273",
    "quantity": 1,
    "roomID": "629879-1"  // Optional
  }
]
```

**Adults/Children Array Structure**:
```json
[
  {
    "roomTypeID": "629879",
    "quantity": 2
  }
]
```

**Example Request**:
```json
{
  "propertyID": "{{hotel.propertyID}}",
  "sourceID": "{{booking.sourceID}}",
  "startDate": "{{customer.reservation.startDate}}",
  "endDate": "{{customer.reservation.endDate}}",
  "rooms": [
    {
      "roomTypeID": "{{booking.selectedRoomTypeID}}",
      "roomRateID": "{{booking.selectedRateID}}",
      "quantity": 1
    }
  ],
  "adults": [
    {
      "roomTypeID": "{{booking.selectedRoomTypeID}}",
      "quantity": {{customer.reservation.numberOfGuests}}
    }
  ],
  "children": [
    {
      "roomTypeID": "{{booking.selectedRoomTypeID}}",
      "quantity": {{customer.reservation.children ?? 0}}
    }
  ],
  "guestFirstName": "{{customer.guest.firstName}}",
  "guestLastName": "{{customer.guest.lastName}}",
  "guestEmail": "{{customer.guest.email}}",
  "guestPhone": "{{customer.guest.phone}}",
  "sendEmailConfirmation": true
}
```

**Critical Notes**:
- All field names use **camelCase** (propertyID, startDate, guestFirstName, etc.) - NOT snake_case
- `rooms`, `adults`, and `children` are **arrays of objects**, NOT simple values
- `sourceID` is **required** - must be obtained from `/getSources` endpoint
- `sendEmailConfirmation` must be `true` (boolean, not string)
- `quantity` in adults/children arrays is a **number**, not a string

**Best Practice**: ALWAYS set `sendEmailConfirmation=true` or guest won't get confirmation

---

#### `GET /getReservationsWithRateDetails`

**Purpose**: Get reservation details

**Critical Parameters**: 
- `includeGuestsDetails=true` (MUST BE TRUE)
- `sortByRecent=true` (MUST BE TRUE when using `guestID`)

**Required Parameters**:
- `propertyID` - Property ID

**Optional Parameters**:
- `reservationID` - Specific reservation ID
- `guestID` - Guest ID (returns all reservations for guest)
- `includeGuestsDetails` - Must be `true` for complete data
- `sortByRecent` - Must be `true` when using `guestID` (returns most recent first)

**Returns**:
- Complete reservation data
- Guest details (if `includeGuestsDetails=true`)
- Rate breakdown
- Room details
- Payment information

**Example Request**:
```json
{
  "propertyID": "{{hotel.propertyID}}",
  "guestID": "{{guest.guestID}}",
  "includeGuestsDetails": true,
  "sortByRecent": true
}
```

**Best Practices**:
- ALWAYS use `includeGuestsDetails=true` for complete reservation data
- ALWAYS use `sortByRecent=true` when using `guestID` (returns most recent first)
- Use first result (most recent) when multiple reservations exist

---

#### `PUT /putReservation`

**Purpose**: Modify existing reservation

**Required Parameters**:
- `propertyID` - Property ID
- `reservationID` - Reservation ID

**Optional Parameters**:
- `checkOut` - New check-out date
- `status` - New status (`confirmed`, `checked_in`, `checked_out`, `cancelled`, `no_show`)
- `adults` - Updated adults count
- `children` - Updated children count
- Guest contact fields (if updating guest info)

**Example Request**:
```json
{
  "propertyID": "{{hotel.propertyID}}",
  "reservationID": "{{reservation.reservationID}}",
  "checkOut": "{{customer.reservation.newCheckOutDate}}",
  "status": "checked_in"
}
```

**Use Cases**:
- Customer Experience Agent (extend stay, modify dates)
- Customer Experience Agent (check-in, check-out)
- Virtual GM (status updates)

---

### Category 3: Guest Management

#### `GET /getGuestList`

**Purpose**: Lookup guest information

**Critical Parameter**: `includeGuestInfo=true` (MUST BE TRUE)

**Required Parameters**:
- `propertyIDs` - Property ID

**Optional Parameters**:
- `guestPhone` - Guest phone number
- `guestCellPhone` - Guest cell phone
- `guestEmail` - Guest email
- `guestName` - Guest name
- `includeGuestInfo` - Must be `true` for complete guest data

**Returns**:
- Complete guest information (if `includeGuestInfo=true`)
- Guest ID
- Guest name, email, phone
- Guest address
- Guest status
- Reservation ID (if exists)

**Example Request**:
```json
{
  "propertyIDs": "{{hotel.propertyID}}",
  "guestPhone": "{{customer.phone}}",
  "guestCellPhone": "{{customer.phone}}",
  "guestEmail": "{{customer.email}}",
  "includeGuestInfo": true
}
```

**Use Cases**:
- Identity verification (phone/email lookup)
- Returning guest check
- Guest information retrieval

**Best Practices**:
- ALWAYS use `includeGuestInfo=true` for complete guest data
- Check both `guestPhone` and `guestCellPhone` for phone lookup
- Check `guestEmail` for email lookup
- Use combined verification (phone + email) for higher confidence

---

#### `GET /getGuestsByStatus`

**Purpose**: Get guests by status

**Required Parameters**:
- `propertyIDs` - Property ID
- `status` - Status filter (`in_house`, `checked_out`, `not_checked_in`, `cancelled`)

**Optional Parameters**:
- `startDate` - Start date for filter
- `endDate` - End date for filter

**Status Values**:
- `in_house` - Currently checked in
- `checked_out` - Has checked out
- `not_checked_in` - Confirmed but not checked in
- `cancelled` - Reservation cancelled

**Example Request**:
```json
{
  "propertyIDs": "{{hotel.propertyID}}",
  "status": "in_house",
  "startDate": "2025-01-15",
  "endDate": "2025-01-17"
}
```

**Use Cases**:
- Virtual GM (monitor in house guests)
- Customer Experience Agent (check if guest is in house)
- Housekeeping (check room status)

---

### Category 4: Payment Processing

#### `GET /getPaymentMethods`

**Purpose**: Get saved payment methods for guest

**Required Parameters**:
- `propertyID` - Property ID
- `guestID` - Guest ID (existing guest only)

**Returns**:
- List of saved payment methods
- Payment method ID
- Card type, last 4 digits
- Expiration date
- Default payment method

**Example Request**:
```json
{
  "propertyID": "{{hotel.propertyID}}",
  "guestID": "{{guest.guestID}}"
}
```

**Use Cases**:
- Check if existing guest has saved card
- Offer to use saved card for payment
- Quick payment for returning guests

**Best Practices**:
- Only available for existing guests with `guestID`
- Check before offering saved card option
- Show last 4 digits and card brand
- Require guest confirmation to use saved card

---

#### `POST /paybylink`

**Purpose**: Generate payment link for new guests or guests without saved card

**Required Parameters**:
- `propertyID` - Property ID
- `reservationID` - Reservation ID
- `amount` - Payment amount
- `currency` - Currency code
- `description` - Payment description

**Returns**:
- `paymentLink` - Payment link URL
- `expiresAt` - Link expiration time

**Example Request**:
```json
{
  "propertyID": "{{hotel.propertyID}}",
  "reservationID": "{{reservation.reservationID}}",
  "amount": "{{reservation.totalAmount}}",
  "currency": "{{hotel.currencyCode}}",
  "description": "Payment for reservation {{reservation.reservationID}}"
}
```

**Use Cases**:
- New guests without saved card
- Existing guests without saved card
- Guests who want to use different card

**Best Practices**:
- Send payment link via SMS
- Explain that guest needs to enter card information
- Check link expiration before sending
- Verify payment status after link sent

**Critical Notes**:
- Cannot accept credit card information directly via API (PCI compliance)
- Must use `paybylink` for manual card entry
- Links expire after set time

---

### Category 5: Property Information

#### `GET /getHotelDetails`

**Purpose**: Get property information

**Required Parameters**:
- `propertyID` - Property ID

**Returns**:
- Property name, address, phone, email
- Property description
- Property amenities
- Property policies (check-in, check-out)
- Property currency
- Property photos

**Example Request**:
```json
{
  "propertyID": "{{hotel.propertyID}}"
}
```

**Use Cases**:
- Pre-loading hotel context
- Displaying property information
- Providing property details to guests

**Best Practices**:
- Pre-load before workflow starts
- Use for property context in conversations
- Display in UI components

---

### Category 6: Supporting Endpoints

#### `GET /getSources`

**Purpose**: Get available booking sources

**Required Parameters**:
- `propertyID` - Property ID

**Returns**:
- List of available sources
- Source ID and name (e.g., "s-2" for "Walk-In")

**Use Cases**:
- Get `sourceID` for `postReservation`
- Track booking sources
- Reporting and analytics

**Best Practices**:
- Lookup before creating reservation
- Use appropriate source (e.g., "Direct/Website", "Walk-In", "Phone")
- Required for `postReservation`

---

## Data Structures

### Reservation Object

**Properties**:
- `reservationID` - Reservation identifier
- `status` - Reservation status (`confirmed`, `checked_in`, `checked_out`, `cancelled`)
- `checkIn` - Check-in date (YYYY-MM-DD)
- `checkOut` - Check-out date (YYYY-MM-DD)
- `guestID` - Guest identifier
- `propertyID` - Property identifier
- `total` - Total cost
- `balance` - Outstanding balance
- `rooms` - Array of room objects
- `guestList` - Object of guest information

**Relationships**:
- Guest (via `guestID`)
- Room (via `roomID`, `roomTypeID`)
- Payment (via `reservationID`)

**Example**:
```json
{
  "reservationID": "3055319293136",
  "status": "checked_out",
  "checkIn": "2024-08-05",
  "checkOut": "2024-08-07",
  "guestID": "111928033",
  "propertyID": "315701",
  "total": 4.5,
  "balance": 4.5,
  "rooms": [
    {
      "roomTypeID": "629879",
      "roomTypeName": "King Suite Level 1",
      "roomID": "629879-0",
      "roomName": "100"
    }
  ]
}
```

---

### Guest Object

**Properties**:
- `guestID` - Guest identifier
- `firstName` - Guest first name
- `lastName` - Guest last name
- `email` - Guest email
- `phone` - Guest phone
- `cellPhone` - Guest cell phone
- `address` - Guest address
- `city` - Guest city
- `state` - Guest state
- `zip` - Guest zip
- `country` - Guest country
- `status` - Guest status (`in_house`, `checked_out`, etc.)
- `reservationID` - Current reservation ID (if exists)

**Relationships**:
- Reservation (via `guestID`)

**Example**:
```json
{
  "guestID": "111928033",
  "firstName": "Jason",
  "lastName": "Trindade",
  "email": "jason@proximitycapital.us",
  "phone": "702-540-5471",
  "status": "checked_out",
  "reservationID": "3055319293136"
}
```

---

### Room Object

**Properties**:
- `roomID` - Room identifier
- `roomTypeID` - Room type identifier
- `roomName` - Room number/name
- `roomTypeName` - Room type name
- `rateID` - Rate identifier
- `rateName` - Rate plan name
- `roomStatus` - Room status (`clean`, `dirty`, `inspected`, `out_of_order`)

**Relationships**:
- Reservation (via `roomID`, `roomTypeID`)

**Example**:
```json
{
  "roomID": "629879-1",
  "roomTypeID": "629879",
  "roomName": "101",
  "roomTypeName": "King Suite Level 1",
  "rateID": "2260273",
  "rateName": "default",
  "roomStatus": "clean"
}
```

---

### Availability Object

**Properties**:
- `roomTypeID` - Room type identifier
- `roomTypeName` - Room type name
- `roomRateID` - Rate identifier
- `roomRate` - Total rate for stay
- `ratePlanNamePublic` - Public rate plan name
- `roomsAvailable` - Number of rooms available
- `roomRateDetailed` - Array of daily rates
- `individualRooms` - Array of available rooms

**Relationships**:
- Room (via `roomTypeID`)

**Example**:
```json
{
  "roomTypeID": "629879",
  "roomTypeName": "King Suite Level 1",
  "roomRateID": "2260273",
  "roomRate": 573,
  "ratePlanNamePublic": "default",
  "roomsAvailable": 7,
  "roomRateDetailed": [
    {
      "date": "2025-11-10",
      "rate": 79,
      "base_rate": 79
    }
  ],
  "individualRooms": [
    {
      "roomID": "629879-1",
      "roomName": "101"
    }
  ]
}
```

---

### Payment Object

**Properties**:
- `paymentID` - Payment identifier
- `reservationID` - Reservation identifier
- `amount` - Payment amount
- `method` - Payment method (`credit`, `cash`, `ebanking`, `pay_pal`)
- `status` - Payment status (`pending`, `processed`, `failed`)
- `paymentLink` - Payment link URL (if using paybylink)
- `expiresAt` - Link expiration time (if using paybylink)

**Relationships**:
- Reservation (via `reservationID`)

**Example**:
```json
{
  "paymentID": "pm_123",
  "reservationID": "3055319293136",
  "amount": 4.5,
  "method": "credit",
  "status": "processed",
  "paymentLink": "https://payments.cloudbeds.com/pay/abc123",
  "expiresAt": "2025-01-15T23:59:59Z"
}
```

---

## Field Mappings

### User Input → API Field

| User Input | API Field | Notes |
|------------|-----------|-------|
| `{{hotel.propertyID}}` | `propertyID` | Property ID (camelCase, NOT property_id) |
| `{{booking.sourceID}}` | `sourceID` | Booking source ID from getSources (required) |
| `{{customer.reservation.startDate}}` | `startDate` | Check-in date (YYYY-MM-DD, NOT check_in) |
| `{{customer.reservation.endDate}}` | `endDate` | Check-out date (YYYY-MM-DD, NOT check_out) |
| `{{booking.selectedRoomTypeID}}` | `rooms[0].roomTypeID` | Selected room type ID |
| `{{booking.selectedRateID}}` | `rooms[0].roomRateID` | Selected rate plan ID |
| `{{customer.reservation.numberOfGuests}}` | `adults[0].quantity` | Number of adults (number, NOT string) |
| `{{customer.reservation.children ?? 0}}` | `children[0].quantity` | Number of children (number, default: 0) |
| `{{customer.guest.firstName}}` | `guestFirstName` | Guest first name (camelCase, NOT guest_first_name) |
| `{{customer.guest.lastName}}` | `guestLastName` | Guest last name (camelCase, NOT guest_last_name) |
| `{{customer.guest.email}}` | `guestEmail` | Guest email (camelCase, NOT guest_email) |
| `{{customer.guest.phone}}` | `guestPhone` | Guest phone (camelCase, NOT guest_phone) |

---

### System Data → API Field

| System Data | API Field | Notes |
|-------------|-----------|-------|
| `{{hotel.propertyID}}` | `propertyID` | Property identifier (camelCase, required) |
| `{{hotel.primary.sourceID}}` | `sourceID` | Primary booking source ID for AI Booking Assistant (required) |
| `{{booking.selectedRoomTypeID}}` | `rooms[0].roomTypeID` | Selected room type ID (required) |
| `{{booking.selectedRateID}}` | `rooms[0].roomRateID` | Selected rate plan ID (required) |
| `{{booking.selectedRoomID}}` | `rooms[0].roomID` | Selected room ID (optional, hard-assigns room) |
| `{{guest.preferredPaymentMethod}}` | `paymentMethod` | Guest preferred payment method (if processing payment) |
| `{{booking.cardToken}}` | `cardToken` | Stripe Customer ID (if using Stripe) |
| `{{booking.paymentAuthorizationCode}}` | `paymentAuthorizationCode` | Stripe Charge ID (if using Stripe) |

---

### API Response → Global Variables

| API Response | Global Variable | Notes |
|--------------|-----------------|-------|
| `data.reservationID` | `{{reservation.reservationID}}` | Reservation identifier |
| `data.status` | `{{reservation.status}}` | Reservation status |
| `data.status` | `{{guest.status}}` | **Guest status from reservation** (CRITICAL: Always from reservation, not guest record) |
| `data.total` | `{{reservation.total}}` | Total cost |
| `data.balance` | `{{reservation.balance}}` | Outstanding balance |
| `data.guestList[0].guestID` | `{{guest.guestID}}` | Guest identifier (from reservation) |
| `data.guestList[0].guestName` | `{{guest.guestName}}` | Guest name (from reservation) |
| `data.propertyRooms` | `{{availability.rooms}}` | Available rooms |
| `data.paymentLink` | `{{payment.paymentLink}}` | Payment link URL |

**Critical Note**: `{{guest.status}}` is **ALWAYS** pulled from the reservation they are talking about (if they have one). We use verified `{{guest.phone}}` or verified `{{guest.email}}` to search for records.

---

## Best Practices

### API Calls

1. **Always use `detailedRates=true` for `getAvailableRoomTypes`**
   - Returns complete room data, rates, availability, photos, features
   - Replaces multiple calls (`getRooms`, `getRates`, `getTaxesAndFees`)
   - Most efficient - single call for complete data

2. **Always use `includeGuestInfo=true` for `getGuestList`**
   - Returns complete guest information
   - Required for identity verification
   - Provides all guest data needed

3. **Always use `includeGuestsDetails=true` for `getReservationsWithRateDetails`**
   - Returns complete reservation with guest details
   - Provides rate breakdown and room details
   - Required for complete reservation information

4. **Always use `sortByRecent=true` when using `guestID` in `getReservationsWithRateDetails`**
   - Returns most recently modified reservation first
   - Critical when guest has multiple reservations
   - Use first result (most recent) for current reservation

5. **Always set `sendEmailConfirmation=true` in `postReservation`**
   - Sends automatic confirmation email to guest
   - Required for guest confirmation
   - Must be set or guest won't get confirmation

---

### Identity Verification

1. **Set verified contact information from Vapi**
   - Set `{{guest.verifiedPhone}}` = `{{customer.phone}}` (if phone available from Vapi)
   - Set `{{guest.verifiedEmail}}` = `{{customer.email}}` (if email available from Vapi)
   - These are the verified contact methods from Vapi

2. **Use verified phone or email to search for records**
   - Use `{{guest.verifiedPhone}}` to search `getGuestList(guestPhone={{guest.verifiedPhone}}, includeGuestInfo=true)`
   - Use `{{guest.verifiedEmail}}` to search `getGuestList(guestEmail={{guest.verifiedEmail}}, includeGuestInfo=true)`
   - Try phone first (most common)
   - If no match, try email
   - If both match → High confidence
   - If one matches → Medium confidence

3. **Get guest status from reservation, NOT from guest record**
   - `{{guest.status}}` is **ALWAYS** pulled from the reservation they are talking about (if they have one)
   - After finding guest with `getGuestList`, get reservation with `getReservationsWithRateDetails`
   - Set `{{guest.status}}` = reservation status
   - If no reservation found, guest has no status

4. **Use `includeGuestInfo=true` for complete guest data**
   - Returns all guest information needed
   - Required for identity verification
   - Provides `guestID` and `reservationID` (if exists)
   - Does NOT provide status (status comes from reservation)

5. **Use `includeGuestsDetails=true` when getting reservation details**
   - Returns complete reservation with guest details
   - Provides reservation status (which becomes `{{guest.status}}`)
   - Required to get guest status

6. **Set `{{customer.verified}}` flag after verification**
   - Use flag in workflow logic
   - Pre-fill forms for returning guests
   - Skip identity verification if already verified

7. **Pre-fill forms for returning guests**
   - Use existing guest data from `getGuestList`
   - Get reservation status from `getReservationsWithRateDetails`
   - Reduce data entry for returning guests
   - Improve user experience

---

### Payment Processing

1. **Check hotel payment preferences first**
   - Check `{{hotel.PaymentOption1}}` through `{{hotel.PaymentOption4}}` for available payment methods
   - Check `{{hotel.PaymentAICredit}}` - If No, Booking Agent will not require payment for credit card
   - Check `{{hotel.PaymentAIStripe}}` - If Yes and Stripe is configured, offer Stripe payments
   - Check `{{hotel.PaymentOnArrivalCash}}` and `{{hotel.PaymentOnArrivalCredit}}` for on-arrival options

2. **Check guest preferred payment method**
   - Check `{{guest.preferredPaymentMethod}}` (collected by booking agent or intake form)
   - If guest has preference, offer that method first
   - If no preference, use hotel's primary payment method (`{{hotel.PaymentOption1}}`)

3. **Check for saved card first (existing guests)**
   - Call `getPaymentMethods` with `guestID` and `lang=en`
   - If saved card found → Offer to use saved card (if `{{hotel.PaymentAICredit}}` is Yes)
   - If no saved card → Use hotel's payment options

4. **Use paybylink for new guests or no saved card**
   - Generate payment link via `paybylink` endpoint (if `{{hotel.PaymentOption1}}` includes PaybyLink)
   - Send link via SMS
   - Explain that guest needs to enter card information

5. **Offer on-arrival payment options**
   - If `{{hotel.PaymentOnArrivalCash}}` is Yes, offer cash payment at hotel
   - If `{{hotel.PaymentOnArrivalCredit}}` is Yes, offer credit card payment at hotel
   - Only offer if guest prefers these methods or if no online payment is available

6. **Always send payment link via SMS (if using PaybyLink)**
   - Provide clear instructions
   - Include link expiration time
   - Verify payment status after link sent

7. **Verify payment status after processing**
   - Check payment status after link sent
   - Send confirmation when payment processed
   - Handle payment failures gracefully

---

### Data Collection

1. **Use forms for structured data collection**
   - Guest information form
   - Reservation modification form
   - Validate required fields
   - Provide clear instructions

2. **Validate required fields**
   - Check all required fields are filled
   - Validate email format
   - Validate phone format
   - Validate date format

3. **Provide clear instructions**
   - Explain what information is needed
   - Show examples if helpful
   - Provide error messages if validation fails

4. **Use UI components for complex selections**
   - Room selection UI
   - Date pickers
   - Dropdowns for selections
   - Visual feedback for selections

---

### Error Handling

1. **Handle API errors gracefully**
   - Catch and handle API errors
   - Provide clear error messages
   - Offer alternative paths
   - Log errors for debugging

2. **Provide clear error messages**
   - Explain what went wrong
   - Suggest solutions
   - Offer to retry or contact support

3. **Offer alternative paths**
   - If availability not found, suggest alternative dates
   - If payment fails, offer to retry or use different method
   - If reservation creation fails, offer to contact support

4. **Log errors for debugging**
   - Log all API errors
   - Include error details
   - Track error frequency
   - Monitor for patterns

---

## Implementation Guide

### Step 1: Setup

1. **Configure Cloudbeds API**
   - Get API key and property ID
   - Configure OAuth if needed
   - Test API connection

2. **Configure ElevenLabs**
   - Create agent in ElevenLabs UI
   - Configure MCP server if using custom functions
   - Test voice conversation

3. **Configure SMS Integration**
   - Set up SMS provider
   - Configure SMS forms and cards
   - Test SMS delivery

4. **Configure Payment Processing**
   - Set up payment provider (if using Stripe)
   - Configure paybylink
   - Test payment processing

---

### Step 2: Create Workflows

1. **Booking Agent Workflow**
   - Create all nodes in proper order
   - Configure API calls with correct parameters
   - Set up UI components for room selection
   - Set up forms for guest information
   - Configure payment processing
   - Test complete workflow

2. **Customer Experience Agent Workflow**
   - Create identity verification node
   - Create reservation retrieval node
   - Create modification nodes
   - Create payment processing nodes
   - Test complete workflow

3. **Virtual General Manager Workflow**
   - Create dashboard node
   - Create monitoring nodes
   - Create report nodes
   - Test complete workflow

---

### Step 3: Test

1. **Test Happy Path**
   - Test complete booking flow
   - Test reservation modification
   - Test payment processing
   - Test confirmation emails

2. **Test Error Cases**
   - Test API errors
   - Test validation errors
   - Test payment failures
   - Test identity verification failures

3. **Test Edge Cases**
   - Test multiple reservations
   - Test returning guests
   - Test no availability
   - Test payment link expiration

---

### Step 4: Deploy

1. **Deploy to Production**
   - Configure production API keys
   - Deploy workflows
   - Test in production
   - Monitor for errors

2. **Monitor Performance**
   - Track booking completion rate
   - Monitor API response times
   - Track error rates
   - Monitor guest satisfaction

3. **Iterate and Improve**
   - Collect feedback
   - Identify improvements
   - Update workflows
   - Test improvements

---

## Troubleshooting

### Common Issues

#### 1. Identity Verification Failing

**Problem**: Guest identity verification not working

**Solutions**:
- Check that `includeGuestInfo=true` is set
- Verify phone/email format matches database
- Check both `guestPhone` and `guestCellPhone`
- Try email lookup if phone fails

**Debug Steps**:
1. Check API response for guest data
2. Verify phone/email format
3. Check database for matching records
4. Test with known guest data

---

#### 2. Availability Not Found

**Problem**: No availability found for requested dates

**Solutions**:
- Verify dates are in correct format (YYYY-MM-DD)
- Check that `detailedRates=true` is set
- Verify property ID is correct
- Check for date range issues

**Debug Steps**:
1. Check API request parameters
2. Verify date format
3. Test with different dates
4. Check property availability in Cloudbeds

---

#### 3. Payment Processing Failure

**Problem**: Payment not processing successfully

**Solutions**:
- Check payment link expiration
- Verify payment amount
- Check payment method configuration
- Verify guest has valid payment method

**Debug Steps**:
1. Check payment link status
2. Verify payment amount
3. Test payment link manually
4. Check payment provider logs

---

#### 4. Reservation Creation Failure

**Problem**: Reservation not creating successfully

**Solutions**:
- Verify all required fields are provided
- Check that `sendEmailConfirmation=true` is set
- Verify room availability
- Check API response for errors

**Debug Steps**:
1. Check API request payload
2. Verify all required fields
3. Check API response for errors
4. Test with minimal required fields

---

#### 5. Confirmation Email Not Sent

**Problem**: Confirmation email not received by guest

**Solutions**:
- Verify `sendEmailConfirmation=true` is set in `postReservation`
- Check email address format
- Verify email delivery in Cloudbeds
- Check spam folder

**Debug Steps**:
1. Check API request for `sendEmailConfirmation`
2. Verify email address format
3. Check Cloudbeds email logs
4. Test with different email address

---

## Additional Resources

### Documentation

- `COMPLETE_AI_AGENT_SYSTEM.md` - Complete AI agent system documentation
- `RESERVATION_BOOKING_ANALYSIS.md` - Detailed booking analysis
- `GETAVAILABILITY_PARAMETERS.md` - Availability parameters guide
- `CLOUDBEDS_PAYMENT_GUIDE.md` - Payment processing guide
- `CRITICAL_WORKFLOW_PATTERNS.md` - Critical API patterns
- `WORKFLOW_ANALYSIS_SYSTEM_PROMPT.md` - Workflow analysis process
- `PAYMENT_SETTINGS_AND_GLOBAL_VARIABLES.md` - Payment settings and global variables configuration
- `GLOBAL_VARIABLE_MAPPING_VERIFICATION.md` - Global variable mapping verification

### API Documentation

- Cloudbeds API v1.3 Documentation
- Google Places API Documentation
- Google Business Profile API Documentation
- ElevenLabs Conversational AI Documentation

### Support

- Cloudbeds API Support
- ElevenLabs Support
- Internal Development Team

---

## Version History

### Version 1.0.0 (2025-01-XX)

**Initial Release**:
- Complete Booking Agent Workflow
- Complete Customer Experience Agent Workflow
- Complete Virtual General Manager Workflow
- Identity Verification System
- Status Check System
- Payment Processing System
- UI Components and Forms
- Comprehensive Documentation

---

## License

This documentation is proprietary and confidential. Unauthorized distribution is prohibited.

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0.0  
**Status**: Production Ready

