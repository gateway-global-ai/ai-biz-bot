# CloudBeds Payment Methods Configuration

## Overview

The CloudBeds integration supports configurable payment methods for reservations. Hotel owners can set their default payment method in the admin panel, which will be used for all online bookings.

## Current Default: Pay By Link

**Default Payment Method**: `pay_by_link`

This is the current default for all online bookings. Guests will receive a payment link to complete their reservation payment.

## Payment Method Options

According to CloudBeds API, available payment methods include:

- `pay_by_link` - Pay By Link (current default for online bookings)
- `cash` - Cash payment
- `credit` - Credit card payment
- `ebanking` - Electronic banking
- `pay_pal` - PayPal

## Configuration

### Admin Panel Integration

Hotel owners will be able to configure their default payment method in the CloudBeds integration page within the hotel admin panel. This setting will:

1. **Override the default** `pay_by_link` for that specific hotel
2. **Apply to all reservations** created through the voice AI system
3. **Be stored per property** in the integration settings

### Implementation

The payment method is set in the reservation creation payload:

```javascript
const reservationData = {
  // ... other reservation fields
  paymentMethod: hotelSettings.defaultPaymentMethod || 'pay_by_link'
};
```

## API Endpoint

### Get Payment Methods

**Endpoint**: `GET /getPaymentMethods`

**Authentication**: API Key or OAuth 2.0

**Parameters**:
- `propertyID` (required) - Property ID
- `lang` (optional) - Language code (default: 'en')

**Example Request**:
```bash
curl --request GET \
     --url 'https://api.cloudbeds.com/api/v1.3/getPaymentMethods?propertyID=315701&lang=en' \
     --header 'accept: application/json' \
     --header 'x-api-key: YOUR_API_KEY'
```

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "method": "pay_by_link",
      "code": "pay_by_link",
      "name": "Pay By Link"
    },
    {
      "method": "cash",
      "code": "cash",
      "name": "Cash"
    }
  ]
}
```

## Usage in Code

```javascript
import { getPaymentMethods, postReservation } from './lib/cloudbeds-api-client.js';

// Get available payment methods for a property
const paymentMethods = await getPaymentMethods('315701', 'en');

// Create reservation with pay_by_link
const reservation = await postReservation({
  // ... reservation data
  paymentMethod: 'pay_by_link'
});
```

## Future Enhancements

1. **Admin Panel UI**: Add payment method selector in CloudBeds integration settings
2. **Per-Reservation Override**: Allow payment method to be specified per reservation
3. **Payment Link Generation**: Integrate with payment gateway to generate payment links
4. **Payment Status Tracking**: Track payment status for reservations

---

**Last Updated**: 2025-11-13  
**Status**: ✅ Pay By Link implemented as default

