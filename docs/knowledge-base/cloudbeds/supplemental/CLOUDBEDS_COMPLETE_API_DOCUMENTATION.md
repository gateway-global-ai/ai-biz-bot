# CloudBeds API Integration - Complete Documentation

**Version**: 1.3  
**Last Updated**: 2025-11-14  
**Property ID**: 315701 (Boardwalk Suites Lafayette)

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Endpoint Access by Role](#endpoint-access-by-role)
4. [API Client Location](#api-client-location)
5. [How to Access Endpoints](#how-to-access-endpoints)
6. [Complete Endpoint List](#complete-endpoint-list)
7. [Implementation Examples](#implementation-examples)
8. [Deployment Guide](#deployment-guide)

---

## Overview

This CloudBeds API integration provides a complete Node.js client for CloudBeds PMS API v1.3 with:

- ✅ **OAuth 2.0 Authentication** - Full support for authorization code flow
- ✅ **API Key Authentication** - Fallback for read-only operations
- ✅ **Role-Based Access Control** - Endpoints mapped to specific roles
- ✅ **Automatic Token Refresh** - Handles token expiration automatically
- ✅ **Database-Backed Token Storage** - Persistent OAuth token management
- ✅ **Type-Safe API Client** - Complete function wrappers for all endpoints

**Base URL**: `https://api.cloudbeds.com/api/v1.3`

---

## Authentication

### OAuth 2.0 (Recommended)

**Required for**: Write operations, user management, app settings

**Setup**:
1. Register OAuth app in CloudBeds Integration Portal
2. Get `CLOUDBEDS_CLIENT_ID` and `CLOUDBEDS_CLIENT_SECRET`
3. Configure redirect URI: `https://your-domain.com/api/cloudbeds/oauth/callback`
4. Complete OAuth flow to get access token

**Environment Variables**:
```bash
CLOUDBEDS_CLIENT_ID=live1_315701_5ymHrKGTgjaBWl1oX2YDzAvF
CLOUDBEDS_CLIENT_SECRET=your_client_secret
CLOUDBEDS_REDIRECT_URI=https://your-domain.com/api/cloudbeds/oauth/callback
CLOUDBEDS_PROPERTY_ID=315701
```

**OAuth Flow**:
1. **Authorization**: `GET /api/cloudbeds/oauth/authorize` - Generates authorization URL
2. **Callback**: `GET /api/cloudbeds/oauth/callback?code=...` - Exchanges code for tokens
3. **Token Storage**: Tokens stored in `cloudbeds_oauth_tokens` table (Supabase)
4. **Auto-Refresh**: Access tokens automatically refreshed when expired

### API Key (Fallback)

**Works for**: Most read operations

**Environment Variable**:
```bash
CLOUDBEDS_API_KEY=cbat_vDiI4LTiiBEa5n4OFx1F7lwbfrzKCTnq
```

**Usage**: Automatically used when OAuth tokens are not available

---

## Endpoint Access by Role

### 1. Concierge (52 Endpoints)

**Purpose**: Information and guest assistance

**Key Endpoints**:
- `GET /getHotelDetails` - Hotel information
- `GET /getRoomTypes` - Room type information
- `GET /getAvailableRoomTypes` - Check availability
- `GET /getGuest` - Guest information
- `GET /getGuestList` - Search guests
- `GET /getReservations` - Reservation lookup

**Full List**: See `Concierge_Endpoints__from_pms-v1_3-openapi_yaml_.csv`

**Access**: Read-only operations, guest information, hotel details

---

### 2. Booking Agent (85 Endpoints)

**Purpose**: Reservation creation and management

**Key Endpoints**:
- `GET /getAvailableRoomTypes` - Check availability
- `POST /postReservation` - Create reservation ⚠️ Requires OAuth
- `GET /getReservations` - View reservations
- `GET /getRatePlans` - Get rate plans
- `GET /getRate` - Get rates
- `POST /postGuest` - Create guest profile
- `PUT /putGuest` - Update guest profile
- `GET /getPaymentMethods` - Payment options
- `POST /postPayment` - Process payment

**Full List**: See `Booking_Agent_Endpoints__from_pms-v1_3-openapi_yaml_.csv`

**Access**: Read/write operations for reservations, guests, payments

---

### 3. Front Desk / Customer Experience Agent (67 Endpoints)

**Purpose**: Guest services and check-in/check-out

**Key Endpoints**:
- `POST /postRoomCheckIn` - Check-in guest ⚠️ Requires OAuth
- `POST /postRoomCheckOut` - Check-out guest ⚠️ Requires OAuth
- `POST /postRoomAssign` - Assign room ⚠️ Requires OAuth
- `GET /getReservations` - View reservations
- `GET /getGuest` - Guest information
- `POST /postGuestNote` - Add guest note
- `GET /getHousekeepingStatus` - Room status
- `POST /postHousekeepingStatus` - Update room status
- `POST /postPayment` - Process payment
- `POST /postCharge` - Add charge

**Full List**: See `Customer_Experience_Endpoints__from_pms-v1_3-openapi_yaml_.csv`

**Access**: Guest services, room management, payments, housekeeping

---

### 4. General Manager / Employee Ops (115 Endpoints)

**Purpose**: Full system access

**Key Endpoints**:
- All endpoints from other roles
- `POST /createAllotmentBlock` - Manage allotments
- `POST /putRate` - Update rates
- `POST /patchRate` - Modify rates
- `GET /getDashboard` - Dashboard data
- `GET /getUsers` - User management ⚠️ Requires OAuth
- `GET /userinfo` - User information ⚠️ Requires OAuth
- `POST /postAppSettings` - App configuration
- `GET /getAppState` - App state ⚠️ Requires OAuth
- `POST /postWebhook` - Webhook management

**Full List**: See `Employee_Ops_Endpoints__from_pms-v1_3-openapi_yaml_.csv`

**Access**: Full read/write access to all endpoints

---

## API Client Location

### Main Client File

**Path**: `/lib/cloudbeds-api-client.js`

**Exports**:
```javascript
import {
  // Core Functions
  getAvailableRoomTypes,
  getHotelDetails,
  postReservation,
  getReservations,
  getGuestList,
  getGuestsByFilter,
  putReservation,
  getUsers,
  getUserInfo,
  getPaymentMethods,
  
  // OAuth Functions
  requestTokenWithAuthCode,
  refreshToken,
  setOAuthTokens,
  getOAuthTokenStatus,
  
  // Health Checks
  healthCheck,
  healthCheckAPIKey,
  healthCheckOAuth2
} from './lib/cloudbeds-api-client.js';
```

### OAuth Routes

**Path**: `/routes/cloudbeds-oauth.js`

**Endpoints**:
- `GET /api/cloudbeds/oauth/authorize` - Generate OAuth URL
- `GET /api/cloudbeds/oauth/callback` - Handle OAuth callback
- `GET /api/cloudbeds/oauth/status` - Check token status
- `POST /api/cloudbeds/oauth/refresh` - Manually refresh token

---

## How to Access Endpoints

### Method 1: Using the API Client (Recommended)

```javascript
import { getAvailableRoomTypes, postReservation } from './lib/cloudbeds-api-client.js';

// Check availability
const availability = await getAvailableRoomTypes({
  propertyIDs: '315701',
  startDate: '2025-12-01',
  endDate: '2025-12-03',
  rooms: 1,
  adults: 2,
  children: 0
});

// Create reservation (requires OAuth)
const reservation = await postReservation({
  propertyID: '315701',
  email: 'guest@example.com',
  firstName: 'John',
  lastName: 'Doe',
  startDate: '2025-12-01',
  endDate: '2025-12-03',
  roomTypeID: '629879',
  ratePlanID: '12345',
  adultGuests: 2,
  // ... other required fields
});
```

### Method 2: Direct API Request

```javascript
import { apiRequest } from './lib/cloudbeds-api-client.js';

// The apiRequest function handles authentication automatically
const result = await apiRequest('GET', '/getHotelDetails', {
  propertyID: '315701'
});
```

### Method 3: Using Fetch (Manual)

```javascript
// OAuth Token (from database or cache)
const accessToken = 'your_access_token';

const response = await fetch('https://api.cloudbeds.com/api/v1.3/getHotelDetails?propertyID=315701', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'accept': 'application/json'
  }
});

const data = await response.json();
```

---

## Complete Endpoint List

### Authentication Endpoints

| Method | Endpoint | Role | Auth | Description |
|--------|----------|------|------|-------------|
| GET | `/oauth/metadata` | All | None | OAuth metadata |
| POST | `/access_token` | All | None | Exchange code for token |
| GET | `/userinfo` | GM | OAuth | User information |

### Hotel Endpoints

| Method | Endpoint | Role | Auth | Description |
|--------|----------|------|------|-------------|
| GET | `/getHotels` | All | API Key/OAuth | List hotels |
| GET | `/getHotelDetails` | All | API Key/OAuth | Hotel details |

### Room Endpoints

| Method | Endpoint | Role | Auth | Description |
|--------|----------|------|------|-------------|
| GET | `/getRoomTypes` | All | API Key/OAuth | List room types |
| GET | `/getAvailableRoomTypes` | All | API Key/OAuth | Check availability |
| GET | `/getRooms` | All | API Key/OAuth | List rooms |
| GET | `/getRoomsUnassigned` | All | API Key/OAuth | Unassigned rooms |
| POST | `/postRoomAssign` | FD | OAuth | Assign room |
| POST | `/postRoomCheckIn` | FD | OAuth | Check-in |
| POST | `/postRoomCheckOut` | FD | OAuth | Check-out |

### Reservation Endpoints

| Method | Endpoint | Role | Auth | Description |
|--------|----------|------|------|-------------|
| GET | `/getReservations` | All | API Key/OAuth | List reservations |
| GET | `/getReservation` | All | API Key/OAuth | Get reservation |
| POST | `/postReservation` | BA | OAuth | Create reservation |
| PUT | `/putReservation` | BA/FD | OAuth | Update reservation |
| GET | `/getReservationAssignments` | All | API Key/OAuth | Room assignments |
| GET | `/getReservationNotes` | All | API Key/OAuth | Reservation notes |
| POST | `/postReservationNote` | All | OAuth | Add note |

### Guest Endpoints

| Method | Endpoint | Role | Auth | Description |
|--------|----------|------|------|-------------|
| GET | `/getGuest` | All | API Key/OAuth | Get guest |
| GET | `/getGuestList` | All | API Key/OAuth | Search guests |
| GET | `/getGuestsByFilter` | All | API Key/OAuth | Filter guests |
| GET | `/getGuestsByStatus` | All | API Key/OAuth | Guests by status |
| POST | `/postGuest` | BA/FD | OAuth | Create guest |
| PUT | `/putGuest` | BA/FD | OAuth | Update guest |
| GET | `/getGuestNotes` | All | API Key/OAuth | Guest notes |
| POST | `/postGuestNote` | All | OAuth | Add note |

### Rate Endpoints

| Method | Endpoint | Role | Auth | Description |
|--------|----------|------|------|-------------|
| GET | `/getRate` | All | API Key/OAuth | Get rate |
| GET | `/getRatePlans` | All | API Key/OAuth | List rate plans |
| POST | `/putRate` | GM | OAuth | Update rate |
| POST | `/patchRate` | GM | OAuth | Modify rate |

### Payment Endpoints

| Method | Endpoint | Role | Auth | Description |
|--------|----------|------|------|-------------|
| GET | `/getPaymentMethods` | All | API Key/OAuth | Payment methods |
| POST | `/postPayment` | BA/FD | OAuth | Process payment |
| POST | `/postCharge` | FD | OAuth | Add charge |
| POST | `/postCreditCard` | BA/FD | OAuth | Store card |
| POST | `/postVoidPayment` | FD | OAuth | Void payment |

### Housekeeping Endpoints

| Method | Endpoint | Role | Auth | Description |
|--------|----------|------|------|-------------|
| GET | `/getHousekeepingStatus` | FD | API Key/OAuth | Room status |
| POST | `/postHousekeepingStatus` | FD | OAuth | Update status |
| GET | `/getHousekeepers` | FD | API Key/OAuth | List housekeepers |
| POST | `/postHousekeeper` | FD | OAuth | Create housekeeper |

### Group Endpoints

| Method | Endpoint | Role | Auth | Description |
|--------|----------|------|------|-------------|
| GET | `/getGroups` | BA/GM | API Key/OAuth | List groups |
| GET | `/getGroupNotes` | BA/GM | API Key/OAuth | Group notes |
| POST | `/putGroup` | BA/GM | OAuth | Update group |

### Allotment Block Endpoints

| Method | Endpoint | Role | Auth | Description |
|--------|----------|------|------|-------------|
| GET | `/getAllotmentBlocks` | BA/GM | API Key/OAuth | List blocks |
| POST | `/createAllotmentBlock` | GM | OAuth | Create block |
| POST | `/updateAllotmentBlock` | GM | OAuth | Update block |
| POST | `/deleteAllotmentBlock` | GM | OAuth | Delete block |

### Item Endpoints

| Method | Endpoint | Role | Auth | Description |
|--------|----------|------|------|-------------|
| GET | `/getItems` | FD | API Key/OAuth | List items |
| GET | `/getItemCategories` | FD | API Key/OAuth | Item categories |
| POST | `/postItem` | FD | OAuth | Create item |
| POST | `/postCustomItem` | FD | OAuth | Custom item |

### Integration Endpoints

| Method | Endpoint | Role | Auth | Description |
|--------|----------|------|------|-------------|
| GET | `/getAppState` | GM | OAuth | App state |
| POST | `/postAppState` | GM | OAuth | Update state |
| GET | `/getAppSettings` | GM | OAuth | App settings |
| POST | `/postWebhook` | GM | OAuth | Create webhook |
| GET | `/getWebhooks` | GM | OAuth | List webhooks |
| DELETE | `/deleteWebhook` | GM | OAuth | Delete webhook |

---

## Implementation Examples

### Example 1: Check Room Availability (Concierge)

```javascript
import { getAvailableRoomTypes } from './lib/cloudbeds-api-client.js';

async function checkAvailability(startDate, endDate, guests) {
  const result = await getAvailableRoomTypes({
    propertyIDs: process.env.CLOUDBEDS_PROPERTY_ID,
    startDate: startDate,
    endDate: endDate,
    rooms: 1,
    adults: guests.adults || 2,
    children: guests.children || 0,
    detailedRates: true
  });
  
  if (result.success && result.data) {
    return result.data[0].propertyRooms || [];
  }
  
  return [];
}
```

### Example 2: Create Reservation (Booking Agent)

```javascript
import { postReservation } from './lib/cloudbeds-api-client.js';

async function createReservation(guestInfo, roomSelection, dates) {
  const reservationData = {
    propertyID: process.env.CLOUDBEDS_PROPERTY_ID,
    email: guestInfo.email,
    firstName: guestInfo.firstName,
    lastName: guestInfo.lastName,
    startDate: dates.startDate,
    endDate: dates.endDate,
    roomTypeID: roomSelection.roomTypeID,
    ratePlanID: roomSelection.ratePlanID,
    adultGuests: guestInfo.adults || 2,
    children: guestInfo.children || 0,
    // ... other required fields
  };
  
  const result = await postReservation(reservationData);
  
  if (result.success) {
    return result.data;
  }
  
  throw new Error(result.error || 'Reservation creation failed');
}
```

### Example 3: Check-In Guest (Front Desk)

```javascript
import { postRoomCheckIn } from './lib/cloudbeds-api-client.js';

async function checkInGuest(reservationID, roomID) {
  const result = await apiRequest('POST', '/postRoomCheckIn', {
    propertyID: process.env.CLOUDBEDS_PROPERTY_ID,
    reservationID: reservationID,
    roomID: roomID
  });
  
  return result.success;
}
```

### Example 4: Guest Lookup (All Roles)

```javascript
import { getGuestsByFilter } from './lib/cloudbeds-api-client.js';

async function findGuestByPhone(phoneNumber) {
  const result = await getGuestsByFilter({
    propertyIDs: process.env.CLOUDBEDS_PROPERTY_ID,
    guestPhone: phoneNumber
  });
  
  if (result.success && result.data && result.data.length > 0) {
    return result.data[0];
  }
  
  return null;
}
```

---

## Deployment Guide

### Prerequisites

1. **Node.js** 18+ installed
2. **Supabase** account (for OAuth token storage)
3. **CloudBeds** account with API access
4. **OAuth App** registered in CloudBeds

### Step 1: Install Dependencies

```bash
npm install @supabase/supabase-js dotenv
```

### Step 2: Configure Environment Variables

Create `.env` file:

```bash
# CloudBeds Configuration
CLOUDBEDS_PROPERTY_ID=315701
CLOUDBEDS_CLIENT_ID=your_client_id
CLOUDBEDS_CLIENT_SECRET=your_client_secret
CLOUDBEDS_API_KEY=your_api_key
CLOUDBEDS_REDIRECT_URI=https://your-domain.com/api/cloudbeds/oauth/callback

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# API Base URL
CLOUDBEDS_API_BASE_URL=https://api.cloudbeds.com/api/v1.3
```

### Step 3: Deploy Database Schema

Run the SQL schema in Supabase:

```sql
-- See: docs/CLOUDBEDS_OAUTH_SCHEMA.sql
CREATE TABLE cloudbeds_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id VARCHAR(50) UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  token_type VARCHAR(20) DEFAULT 'Bearer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Step 4: Complete OAuth Flow

1. Visit: `https://your-domain.com/api/cloudbeds/oauth/authorize`
2. Authorize the app in CloudBeds
3. Tokens will be automatically stored

### Step 5: Use the API Client

```javascript
import { getAvailableRoomTypes, postReservation } from './lib/cloudbeds-api-client.js';

// Start using the API
const rooms = await getAvailableRoomTypes({ ... });
```

---

## File Locations

### Source Files

- **API Client**: `/lib/cloudbeds-api-client.js`
- **OAuth Routes**: `/routes/cloudbeds-oauth.js`
- **Database Schema**: `/docs/CLOUDBEDS_OAUTH_SCHEMA.sql`

### Documentation Files

- **This File**: `/docs/CLOUDBEDS_COMPLETE_API_DOCUMENTATION.md`
- **Authentication Guide**: `/docs/CLOUDBEDS_AUTHENTICATION_GUIDE.md`
- **Integration Guide**: `/docs/CLOUDBEDS_API_INTEGRATION_GUIDE.md`

### Endpoint CSV Files

- **Concierge**: `/user_input_files/cloudbeds-integration/Concierge_Endpoints__from_pms-v1_3-openapi_yaml_.csv`
- **Booking Agent**: `/user_input_files/cloudbeds-integration/Booking_Agent_Endpoints__from_pms-v1_3-openapi_yaml_.csv`
- **Customer Experience**: `/user_input_files/cloudbeds-integration/Customer_Experience_Endpoints__from_pms-v1_3-openapi_yaml_.csv`
- **Employee Ops**: `/user_input_files/cloudbeds-integration/Employee_Ops_Endpoints__from_pms-v1_3-openapi_yaml_.csv`

### OpenAPI Specification

- **YAML**: `/user_input_files/cloudbeds-integration/pms-v1.3-openapi.yaml`

---

## Support

For issues or questions:
1. Check the documentation files in `/docs/`
2. Review the OpenAPI specification
3. Check endpoint CSV files for role-based access
4. Verify OAuth token status: `GET /api/cloudbeds/oauth/status`

---

**Last Updated**: 2025-11-14  
**Maintained By**: Platform Economics AI Team

