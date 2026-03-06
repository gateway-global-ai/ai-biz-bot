# Global Variables Reference

## Overview

This document provides a comprehensive reference of all global variables available in the system. Global variables are organized by namespace and can be used throughout workflows, API calls, and system prompts.

**Format**: Variables are referenced using double curly braces: `{{namespace.fieldName}}`

---

## Table of Contents

1. [Core Namespaces](#core-namespaces)
2. [Hotel Industry Pack](#hotel-industry-pack)
3. [Google Places Variables](#google-places-variables)
4. [Payment Settings Variables](#payment-settings-variables)
5. [Identity Verification Variables](#identity-verification-variables)
6. [System Variables](#system-variables)

---

## Core Namespaces

### Company Namespace

| Variable | Type | Description | Required |
|----------|------|-------------|----------|
| `{{company.id}}` | string | Company unique identifier | Yes |
| `{{company.name}}` | string | Company name | Yes |
| `{{company.phone}}` | string | Company phone number | No |
| `{{company.email}}` | string | Company email address | No |
| `{{company.address}}` | string | Company address | No |
| `{{company.website}}` | string | Company website URL | No |
| `{{company.hours}}` | array | Business hours | No |
| `{{company.policies}}` | array | Company policies | No |

---

### Customer Namespace

| Variable | Type | Description | Required |
|----------|------|-------------|----------|
| `{{customer.id}}` | string | Customer unique identifier | Yes |
| `{{customer.firstName}}` | string | Customer first name | No |
| `{{customer.lastName}}` | string | Customer last name | No |
| `{{customer.phone}}` | string | Customer phone number | No |
| `{{customer.email}}` | string | Customer email address | No |
| `{{customer.preferredChannel}}` | string | Preferred communication channel | No |
| `{{customer.verified}}` | boolean | Customer verification status | No |
| `{{customer.tags}}` | array | Customer tags | No |

**Sub-namespaces**:
- `{{customer.guest.*}}` - Guest information (see Hotel Industry Pack)
- `{{customer.reservation.*}}` - Reservation information (see Reservation Namespace)

---

### Employee Namespace

| Variable | Type | Description | Required |
|----------|------|-------------|----------|
| `{{employee.id}}` | string | Employee unique identifier | Yes |
| `{{employee.firstName}}` | string | Employee first name | No |
| `{{employee.lastName}}` | string | Employee last name | No |
| `{{employee.role}}` | string | Employee role | No |
| `{{employee.phone}}` | string | Employee phone number | No |
| `{{employee.email}}` | string | Employee email address | No |
| `{{employee.permissions}}` | array | Employee permissions | No |

---

### Vendor Namespace

| Variable | Type | Description | Required |
|----------|------|-------------|----------|
| `{{vendor.id}}` | string | Vendor unique identifier | Yes |
| `{{vendor.name}}` | string | Vendor name | Yes |
| `{{vendor.phone}}` | string | Vendor phone number | No |
| `{{vendor.email}}` | string | Vendor email address | No |
| `{{vendor.services}}` | array | Vendor services | No |
| `{{vendor.accountNo}}` | string | Vendor account number | No |

---

### Reservation Namespace

| Variable | Type | Description | Required |
|----------|------|-------------|----------|
| `{{reservation.id}}` | string | Reservation unique identifier | Yes |
| `{{reservation.startDate}}` | date | Reservation start date | Yes |
| `{{reservation.endDate}}` | date | Reservation end date | Yes |
| `{{reservation.adults}}` | number | Number of adults | No |
| `{{reservation.children}}` | number | Number of children | No |
| `{{reservation.notes}}` | string | Reservation notes | No |
| `{{reservation.status}}` | string | Reservation status | No |
| `{{reservation.source}}` | string | Reservation source | No |

**Note**: Also accessible via `{{customer.reservation.*}}` for customer-specific reservations.

---

### Invoice Namespace

| Variable | Type | Description | Required |
|----------|------|-------------|----------|
| `{{invoice.id}}` | string | Invoice unique identifier | Yes |
| `{{invoice.total}}` | number | Invoice total amount | Yes |
| `{{invoice.currency}}` | string | Invoice currency | Yes |
| `{{invoice.status}}` | string | Invoice status | No |
| `{{invoice.balanceDue}}` | number | Balance due amount | No |
| `{{invoice.dueDate}}` | date | Invoice due date | No |
| `{{invoice.lineItems}}` | array | Invoice line items | No |

---

## Hotel Industry Pack

### Guest Namespace

| Variable | Type | Description | Required |
|----------|------|-------------|----------|
| `{{guest.id}}` | string | Guest unique identifier | Yes |
| `{{guest.firstName}}` | string | Guest first name | No |
| `{{guest.lastName}}` | string | Guest last name | No |
| `{{guest.phone}}` | string | Guest phone number | No |
| `{{guest.email}}` | string | Guest email address | No |
| `{{guest.loyaltyId}}` | string | Guest loyalty program ID | No |
| `{{guest.preferences}}` | array | Guest preferences | No |
| `{{guest.verified}}` | boolean | Guest verification status | No |
| `{{guest.status}}` | string | Guest status (from reservation) | No |
| `{{guest.verifiedPhone}}` | string | Verified guest phone number | No |
| `{{guest.verifiedEmail}}` | string | Verified guest email address | No |
| `{{guest.preferredPaymentMethod}}` | string | Guest preferred payment method | No |

**Status Values**:
- `"confirmed"` - Reservation confirmed but not checked in
- `"checked_in"` - Currently checked in (in house)
- `"checked_out"` - Has checked out
- `"cancelled"` - Reservation cancelled
- `"no_show"` - Guest did not show up

**Important Notes**:
- `{{guest.status}}` is **ALWAYS** pulled from the reservation, NOT from the guest record
- `{{guest.verifiedPhone}}` and `{{guest.verifiedEmail}}` are set after identity verification
- Use `{{guest.verifiedPhone}}` or `{{guest.verifiedEmail}}` to search for guest records

---

### Hotel Namespace

| Variable | Type | Description | Required |
|----------|------|-------------|----------|
| `{{hotel.id}}` | string | Hotel unique identifier | Yes |
| `{{hotel.propertyID}}` | string | Cloudbeds property ID | Yes |
| `{{hotel.name}}` | string | Hotel name | Yes |
| `{{hotel.phone}}` | string | Hotel phone number | No |
| `{{hotel.email}}` | string | Hotel email address | No |
| `{{hotel.address}}` | string | Hotel address | No |
| `{{hotel.policies}}` | array | Hotel policies | No |
| `{{hotel.amenities}}` | array | Hotel amenities | No |
| `{{hotel.timezone}}` | string | Hotel timezone | No |
| `{{hotel.primary.sourceID}}` | string | Primary booking source ID (AI Booking Assistant) | Yes |

**Payment Settings** (see [Payment Settings Variables](#payment-settings-variables)):
- `{{hotel.PaymentOption1}}` through `{{hotel.PaymentOption4}}`
- `{{hotel.PaymentAICredit}}`
- `{{hotel.PaymentAIStripe}}`
- `{{hotel.PaymentOnArrivalCash}}`
- `{{hotel.PaymentOnArrivalCredit}}`

---

### Room Namespace

| Variable | Type | Description | Required |
|----------|------|-------------|----------|
| `{{room.id}}` | string | Room unique identifier | Yes |
| `{{room.number}}` | string | Room number | Yes |
| `{{room.typeId}}` | string | Room type ID | No |
| `{{room.typeName}}` | string | Room type name | No |
| `{{room.features}}` | array | Room features | No |
| `{{room.maxOccupancy}}` | number | Maximum occupancy | No |
| `{{room.status}}` | string | Room status | No |

---

### RatePlan Namespace

| Variable | Type | Description | Required |
|----------|------|-------------|----------|
| `{{ratePlan.id}}` | string | Rate plan unique identifier | Yes |
| `{{ratePlan.name}}` | string | Rate plan name | Yes |
| `{{ratePlan.cancellationPolicy}}` | string | Cancellation policy | No |
| `{{ratePlan.mealPlan}}` | string | Meal plan included | No |
| `{{ratePlan.inclusions}}` | array | Rate plan inclusions | No |

---

### Folio Namespace

| Variable | Type | Description | Required |
|----------|------|-------------|----------|
| `{{folio.id}}` | string | Folio unique identifier | Yes |
| `{{folio.currency}}` | string | Folio currency | Yes |
| `{{folio.charges}}` | array | Folio charges | No |
| `{{folio.payments}}` | array | Folio payments | No |
| `{{folio.balance}}` | number | Folio balance | No |
| `{{folio.status}}` | string | Folio status | No |

---

## Google Places Variables

### Places Company Namespace

| Variable | Type | Description | Required |
|----------|------|-------------|----------|
| `{{places.company.name}}` | string | Business/place name from Google Places | Yes |
| `{{places.company.place_id}}` | string | Google Place ID (unique identifier) | Yes |
| `{{places.company.primary_type}}` | string | Primary place type (restaurant, hair_salon, etc.) | Yes |
| `{{places.company.types}}` | array | Array of place types from Google | No |
| `{{places.company.formatted_address}}` | string | Full formatted address | Yes |
| `{{places.company.address_components.street_number}}` | string | Street number from address | No |
| `{{places.company.address_components.route}}` | string | Street name from address | No |
| `{{places.company.address_components.city}}` | string | City from address | No |
| `{{places.company.address_components.state}}` | string | State abbreviation | No |
| `{{places.company.address_components.postal_code}}` | string | Postal/ZIP code | No |
| `{{places.company.address_components.country}}` | string | Country code | No |
| `{{places.company.phone_number}}` | string | National phone number | No |
| `{{places.company.international_phone_number}}` | string | International format phone number | No |
| `{{places.company.website}}` | string | Business website URL | No |
| `{{places.company.rating}}` | number | Average rating (0-5) | No |
| `{{places.company.user_ratings_total}}` | number | Number of user ratings | No |
| `{{places.company.price_level}}` | number | Price level (0-4) | No |
| `{{places.company.business_status}}` | string | OPERATIONAL, CLOSED_TEMPORARILY, etc. | No |
| `{{places.company.location.lat}}` | number | Place latitude | No |
| `{{places.company.location.lng}}` | number | Place longitude | No |
| `{{places.company.plus_code}}` | string | Google Plus Code | No |
| `{{places.company.opening_hours}}` | object | Current opening hours object | No |
| `{{places.company.photos}}` | array | Array of photo references | No |
| `{{places.company.reviews}}` | array | Array of review objects | No |
| `{{places.company.editorial_summary}}` | string | Google editorial summary text | No |

---

## Payment Settings Variables

### Hotel Payment Options

| Variable | Type | Description | Default | Options |
|----------|------|-------------|---------|---------|
| `{{hotel.PaymentOption1}}` | string | Primary payment method available to guests | `"PaybyLink"` | Credit Card On File, PaybyLink, Credit Card (Pay At Hotel), Cash (Pay At Hotel) |
| `{{hotel.PaymentOption2}}` | string | Secondary payment method available to guests | `"Credit Card (Pay At Hotel)"` | Same as PaymentOption1 |
| `{{hotel.PaymentOption3}}` | string | Third payment method available to guests | `"Cash (Pay At Hotel)"` | Same as PaymentOption1 |
| `{{hotel.PaymentOption4}}` | string | Fourth payment method available to guests | `null` | Same as PaymentOption1 |

### Hotel Payment AI Settings

| Variable | Type | Description | Default | Options |
|----------|------|-------------|---------|---------|
| `{{hotel.PaymentAICredit}}` | boolean | Booking Agent accepts credit card payments via Cloudbeds | `false` | `true`, `false` |
| `{{hotel.PaymentAIStripe}}` | boolean | Booking Agent accepts Stripe payments | `false` | `true`, `false` |

**Note**: `{{hotel.PaymentAICredit}}` is set to `false` per Cloudbeds policy. If set to `false`, Booking Agent will not require payment for credit card.

### Hotel Payment On Arrival Settings

| Variable | Type | Description | Default | Options |
|----------|------|-------------|---------|---------|
| `{{hotel.PaymentOnArrivalCash}}` | boolean | Accept cash payments at hotel on arrival | `true` | `true`, `false` |
| `{{hotel.PaymentOnArrivalCredit}}` | boolean | Accept credit card payments at hotel on arrival | `true` | `true`, `false` |

### Guest Payment Preferences

| Variable | Type | Description | Default | Options |
|----------|------|-------------|---------|---------|
| `{{guest.preferredPaymentMethod}}` | string | Guest preferred payment method | `null` | Credit Card On File, PaybyLink, Credit Card (Pay At Hotel), Cash (Pay At Hotel) |

**Note**: This is collected by booking agent or on customer intake form.

---

## Identity Verification Variables

### Verified Contact Information

| Variable | Type | Description | Required | Source |
|----------|------|-------------|----------|--------|
| `{{guest.verifiedPhone}}` | string | Verified guest phone number from Vapi | No | Set after identity verification |
| `{{guest.verifiedEmail}}` | string | Verified guest email address from Vapi | No | Set after identity verification |
| `{{customer.verified}}` | boolean | Identity verification flag | No | Set to `true` after successful verification |

**Usage**:
- `{{guest.verifiedPhone}}` and `{{guest.verifiedEmail}}` are set from verified `{{customer.phone}}` or `{{customer.email}}` from Vapi
- Use `{{guest.verifiedPhone}}` or `{{guest.verifiedEmail}}` to search for guest records via `getGuestList`
- Set `{{customer.verified}}` to `true` after successful identity verification

**Important**: Always use verified phone or email to search for records to ensure data accuracy.

---

## System Variables

### System/Time Namespace

| Variable | Type | Description | Vapi Equivalent |
|----------|------|-------------|-----------------|
| `{{sys.now}}` | string | Current date and time in UTC | `{{now}}` |
| `{{sys.date}}` | string | Current date in UTC | `{{date}}` |
| `{{sys.time}}` | string | Current time in UTC | `{{time}}` |
| `{{sys.month}}` | string | Current month in UTC | `{{month}}` |
| `{{sys.day}}` | string | Current day of month in UTC | `{{day}}` |
| `{{sys.year}}` | string | Current year in UTC | `{{year}}` |

**Note**: These variables are automatically populated by the system and correspond to Vapi's built-in time variables.

---

## Variable Usage Examples

### Example 1: Creating a Reservation

```json
{
  "propertyID": "{{hotel.propertyID}}",
  "sourceID": "{{hotel.primary.sourceID}}",
  "startDate": "{{customer.reservation.startDate}}",
  "endDate": "{{customer.reservation.endDate}}",
  "guestFirstName": "{{customer.guest.firstName}}",
  "guestLastName": "{{customer.guest.lastName}}",
  "guestEmail": "{{customer.guest.email}}",
  "guestPhone": "{{customer.guest.phone}}",
  "rooms": [{
    "roomTypeID": "{{booking.selectedRoomTypeID}}",
    "roomRateID": "{{booking.selectedRateID}}",
    "quantity": 1
  }],
  "adults": [{
    "roomTypeID": "{{booking.selectedRoomTypeID}}",
    "quantity": "{{customer.reservation.numberOfGuests}}"
  }],
  "children": [{
    "roomTypeID": "{{booking.selectedRoomTypeID}}",
    "quantity": "{{customer.reservation.children ?? 0}}"
  }],
  "sendEmailConfirmation": true
}
```

### Example 2: Searching for a Guest

```json
{
  "propertyIDs": "{{hotel.propertyID}}",
  "guestPhone": "{{guest.verifiedPhone}}",
  "includeGuestInfo": true,
  "includeGuestRequirements": true
}
```

### Example 3: Using Payment Settings

```
If {{hotel.PaymentAICredit}} is true:
  Offer credit card payment via Cloudbeds
Else if {{hotel.PaymentAIStripe}} is true:
  Offer Stripe payment
Else if {{guest.preferredPaymentMethod}} is set:
  Offer {{guest.preferredPaymentMethod}}
Else:
  Offer {{hotel.PaymentOption1}}
```

---

## Best Practices

1. **Always use verified contact information** when searching for guest records
2. **Get guest status from reservation**, not from guest record
3. **Check hotel payment preferences** before offering payment methods
4. **Use camelCase naming** to match Cloudbeds API conventions
5. **Validate required variables** before making API calls
6. **Use default values** when optional variables are not set
7. **Document variable sources** in workflow documentation

---

## Related Documentation

- [Hotel Workflow Developer Documentation](./HOTEL_WORKFLOW_DEVELOPER_DOCUMENTATION.md)
- [Payment Settings and Global Variables](./PAYMENT_SETTINGS_AND_GLOBAL_VARIABLES.md)
- [Global Variable Mapping Verification](./GLOBAL_VARIABLE_MAPPING_VERIFICATION.md)
- [Cloudbeds API Best Practice Endpoints](./HOTEL_CLOUDBEDS_BEST_PRACTICE_ENDPOINTS.md)

---

## Version History

- **v2.0.0** (2024-10-19): Initial comprehensive documentation
  - Added core namespaces
  - Added hotel industry pack
  - Added Google Places variables
  - Added payment settings variables
  - Added identity verification variables
  - Added system variables

---

## Support

For questions or issues regarding global variables, please refer to the [Hotel Workflow Developer Documentation](./HOTEL_WORKFLOW_DEVELOPER_DOCUMENTATION.md) or contact the development team.

