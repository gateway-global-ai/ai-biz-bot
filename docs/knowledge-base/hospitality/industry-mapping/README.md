# Industry Solutions - Standardized Templates

## Overview

Industry-specific voice AI solutions created from VapiBlocks examples and mapped to our standards:
- **Global Variables System v2.0** for variable naming
- **Cloudbeds API integration** for hospitality
- **Unified edge functions** for all API calls
- **Variable mapping and validation** for consistency

## Industries

### 🏨 Hospitality
**Location**: `/industry-solutions/hospitality/`

**Templates**:
- `hotel-booking-template.json` - Complete hotel booking assistant
- `check-in-template.json` - Guest check-in assistant (coming soon)
- `concierge-template.json` - Concierge services assistant (coming soon)

**Features**:
- Cloudbeds API integration
- Room availability search
- Rate plan selection
- Reservation creation
- Guest information collection

**Global Variables**:
- `{{reservation.startDate}}`, `{{reservation.endDate}}`
- `{{guest.name}}`, `{{guest.email}}`, `{{guest.phone}}`
- `{{room.roomTypeId}}`, `{{ratePlan.ratePlanId}}`
- `{{hotel.propertyID}}`, `{{hotel.location}}`

**Tools**:
- `getAvailableRooms` → Cloudbeds `/getAvailableRoomTypes`
- `getRatePlans` → Cloudbeds `/getRatePlans`
- `createReservation` → Cloudbeds `/createReservation`

### 🚗 Car Rental
**Location**: `/industry-solutions/car-rental/`

**Templates**:
- `booking-template.json` - Car rental booking assistant
- Based on: `vapiblocks-car-rental-demo`

**Features**:
- Vehicle search by location and dates
- Availability checking
- Reservation creation
- Customer information collection

**Global Variables**:
- `{{reservation.startDate}}`, `{{reservation.endDate}}`
- `{{vehicle.location}}`, `{{vehicle.vehicleId}}`, `{{vehicle.type}}`
- `{{customer.name}}`, `{{customer.email}}`, `{{customer.phone}}`
- `{{reservation.totalAmount}}`, `{{reservation.passengers}}`

**Tools**:
- `searchVehicles` → Vehicle API endpoint
- `createReservation` → Reservation API endpoint

### 🏥 Healthcare (Coming Soon)
**Location**: `/industry-solutions/healthcare/`

**Templates**:
- `appointment-scheduling-template.json` (coming soon)
- `patient-intake-template.json` (coming soon)

**Patterns**:
- Appointment scheduling (similar to booking flow)
- Patient intake forms (similar to reservation forms)

### 🏢 Property Management (Coming Soon)
**Location**: `/industry-solutions/property-management/`

**Templates**:
- `property-listing-template.json` (coming soon)
- `tenant-management-template.json` (coming soon)

**Patterns**:
- Property search (similar to vehicle search)
- Lease management (similar to reservation management)

### 🔧 Auto Service (Coming Soon)
**Location**: `/industry-solutions/auto-service/`

**Templates**:
- `service-scheduling-template.json` (coming soon)
- `customer-intake-template.json` (coming soon)

**Patterns**:
- Service appointment scheduling
- Vehicle inspection intake

## Template Structure

Each template JSON includes:

```json
{
  "name": "Assistant name",
  "description": "Assistant description",
  "industry": "industry-name",
  "assistant": {
    "model": { ... },
    "voice": { ... },
    "transcriber": { ... }
  },
  "variables": {
    "global": { ... }
  },
  "tools": [ ... ],
  "workflow": [ ... ]
}
```

## Using Templates

### 1. Select Industry Template
```bash
cd industry-solutions/hospitality/
cat hotel-booking-template.json
```

### 2. Customize Configuration
- Update assistant prompts
- Adjust tool parameters
- Map to your API endpoints

### 3. Deploy via Edge Function
- Use `/vapi-api` edge function to create assistant
- Map tools to Cloudbeds or other APIs
- Test with voice interface

### 4. Integrate UI Components
- Use VapiBlocks components for voice UI
- Connect to assistant via hooks
- Build dashboard with analytics

## Standards Mapping

All templates follow our Global Variables v2.0 standards:

- **Namespaces**: `reservation`, `guest`, `customer`, `vehicle`, `room`, `hotel`
- **Fields**: `lowerCamelCase` format
- **Interpolation**: `{{namespace.field}}` format
- **Session-scoped**: Variables tied to conversation session
- **Task-bound**: Variables mapped to workflow tasks

## Next Steps

1. ✅ Analyze VapiBlocks examples
2. ✅ Create hospitality template (with Cloudbeds)
3. ✅ Create car rental template
4. ⏳ Create healthcare templates
5. ⏳ Create property management templates
6. ⏳ Create auto service templates
7. ⏳ Build deployment scripts
8. ⏳ Create integration guides

## References

- **VapiBlocks Examples**: `/root/vapiblocks-examples/`
- **Global Variables v2.0**: `/root/dashboard-architecture/GLOBAL_VARIABLES_V2_SPEC.md`
- **Cloudbeds Integration**: `/root/cloudbeds-api-integration/`
- **Vapi API Integration**: `/root/vapi-api-integration/`

