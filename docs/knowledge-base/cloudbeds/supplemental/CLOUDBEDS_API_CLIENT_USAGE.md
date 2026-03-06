# CloudBeds API Client Usage Guide
## How to Use the Complete API Client

**API Version**: v1.3  
**Last Updated**: 2025-01-XX

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.cloudbeds.example` to `.env` and fill in your values:

```bash
cp .env.cloudbeds.example .env
```

### 3. Test Authentication

```bash
# Health check
curl http://localhost:3004/api/cloudbeds/health/text
```

---

## Using the API Client

### Basic Usage

```javascript
import CloudBedsAPI from './lib/cloudbeds-api-client.js';

// Get hotel details (uses API key)
const hotelData = await CloudBedsAPI.getHotelDetails('315701');

// Check availability (uses API key)
const availability = await CloudBedsAPI.getAvailableRoomTypes({
  propertyIDs: '315701',
  startDate: '2025-12-01',
  endDate: '2025-12-02',
  rooms: 1,
  adults: 2,
  children: 0,
  detailedRates: true
});

// Create reservation (uses API key)
const reservation = await CloudBedsAPI.postReservation({
  propertyID: '315701',
  email: 'guest@example.com',
  firstName: 'John',
  lastName: 'Doe',
  startDate: '2025-12-01',
  endDate: '2025-12-02',
  roomTypeID: '629879',
  ratePlanID: '2260273',
  rooms: 1,
  adultGuests: 2,
  childGuests: 0
});
```

---

## OAuth 2.0 Flow

### Step 1: Start OAuth Flow

```javascript
import { getAuthorizationURL } from './lib/cloudbeds-oauth-handler.js';

// Get authorization URL
const authURL = getAuthorizationURL();
console.log('Visit this URL to authorize:', authURL);

// Or use HTTP endpoint
// GET /api/cloudbeds/oauth/authorize
```

### Step 2: Handle Callback

```javascript
import { handleOAuthCallback } from './lib/cloudbeds-oauth-handler.js';

// After user authorizes, CloudBeds redirects to:
// /cloudbeds/oauth/callback?code={AUTHORIZATION_CODE}

const result = await handleOAuthCallback(code, 'authorization_code');
if (result.success) {
  console.log('OAuth tokens stored successfully');
}
```

### Step 3: Use OAuth-Protected Endpoints

```javascript
// getUsers requires OAuth 2.0
const users = await CloudBedsAPI.getUsers('315701');

// userinfo requires OAuth 2.0
const userInfo = await CloudBedsAPI.getUserInfo('315701', true);
```

---

## Health Check

### Programmatic Health Check

```javascript
import { performHealthCheck, formatHealthCheckResults } from './lib/cloudbeds-health-check.js';

const results = await performHealthCheck();
console.log(formatHealthCheckResults(results));
```

### HTTP Health Check Endpoints

```bash
# Comprehensive check (JSON)
GET /api/cloudbeds/health

# Text format (human-readable)
GET /api/cloudbeds/health/text

# Quick check (API key only)
GET /api/cloudbeds/health/simple
```

---

## Available API Functions

All functions are automatically generated from the endpoint CSV files. Core functions include:

### Hotel Information
- `getHotelDetails(propertyID)` - Get hotel information
- `getHotels(params)` - List hotels

### Availability & Rates
- `getAvailableRoomTypes(params)` - Check availability
- `getRoomTypes(params)` - Get room types
- `getRate(params)` - Get rate
- `getRatePlans(params)` - Get rate plans

### Reservations
- `getReservations(params)` - List reservations
- `getReservation(params)` - Get reservation details
- `postReservation(data)` - Create reservation
- `putReservation(reservationID, data)` - Update reservation

### Guests
- `getGuest(params)` - Get guest details
- `getGuestsByFilter(params)` - Search guests
- `postGuest(data)` - Create guest
- `putGuest(data)` - Update guest

### Payments
- `postPayment(data)` - Process payment
- `postCharge(data)` - Process charge
- `getPaymentMethods(params)` - Get payment methods

### OAuth-Only Endpoints
- `getUsers(property_ids)` - Get users (requires OAuth 2.0)
- `getUserInfo(property_id, role_details)` - Get user info (requires OAuth 2.0)

---

## Error Handling

```javascript
try {
  const result = await CloudBedsAPI.getHotelDetails('315701');
  
  if (!result.success) {
    console.error('API Error:', result.error);
    return;
  }
  
  console.log('Hotel:', result.data.propertyName);
} catch (error) {
  console.error('Request failed:', error.message);
}
```

---

## Authentication Method Selection

The API client automatically selects the correct authentication method:

- **API Key**: Used for most endpoints (default)
- **OAuth 2.0**: Automatically used for endpoints that require it

You don't need to specify which method to use - the client handles it automatically.

---

## Token Management

OAuth tokens are automatically refreshed when expired:

```javascript
// Check token status
const status = CloudBedsAPI.getOAuthTokenStatus();
console.log('Token expires at:', status.expires_at);

// Tokens are automatically refreshed on next request if expired
```

---

## Integration with Booking Flow

```javascript
// In booking-flow.js
import CloudBedsAPI from './cloudbeds-api-client.js';

async function handleAvailabilityCheck(state) {
  const availability = await CloudBedsAPI.getAvailableRoomTypes({
    propertyIDs: CLOUDBEDS_PROPERTY_ID,
    startDate: state.booking.checkinDate,
    endDate: state.booking.checkoutDate,
    rooms: 1,
    adults: state.booking.adults,
    children: state.booking.children || 0,
    detailedRates: true
  });
  
  if (!availability || !availability.success) {
    return {
      response: "I'm having trouble checking availability. Would you like to try again?",
      error: true
    };
  }
  
  // Process availability data...
}
```

---

## Testing

### Test API Key Authentication

```bash
curl -X GET "https://api.cloudbeds.com/api/v1.3/getHotelDetails?propertyID=315701" \
  -H "x-api-key: cbat_vDiI4LTiiBEa5n4OFx1F7lwbfrzKCTnq" \
  -H "accept: application/json"
```

### Test Health Check

```bash
# Start server
npm start

# Check health
curl http://localhost:3004/api/cloudbeds/health/text
```

---

## Common Patterns

### Pattern 1: Check Availability

```javascript
const availability = await CloudBedsAPI.getAvailableRoomTypes({
  propertyIDs: '315701',
  startDate: '2025-12-01',
  endDate: '2025-12-02',
  rooms: 1,
  adults: 2,
  detailedRates: true
});
```

### Pattern 2: Create Reservation

```javascript
const reservation = await CloudBedsAPI.postReservation({
  propertyID: '315701',
  email: 'guest@example.com',
  firstName: 'John',
  lastName: 'Doe',
  startDate: '2025-12-01',
  endDate: '2025-12-02',
  roomTypeID: '629879',
  ratePlanID: '2260273',
  rooms: 1,
  adultGuests: 2
});
```

### Pattern 3: Look Up Reservation

```javascript
const reservations = await CloudBedsAPI.getReservations({
  propertyID: '315701',
  firstName: 'John',
  lastName: 'Doe',
  checkInFrom: '2025-12-01'
});
```

---

## Next Steps

1. ✅ **API Client Created** - Complete with dual authentication
2. ✅ **OAuth Handler Created** - Handles all grant types
3. ✅ **Health Check Created** - Tests both auth methods
4. ⚠️ **Test Setup** - Run health check to verify
5. ⚠️ **Complete OAuth Flow** - Authorize app
6. ⚠️ **Integrate into Flows** - Use in booking/information/guest services flows

---

**Status**: ✅ Complete  
**Ready for Integration**: ✅ Yes

