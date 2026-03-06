# CloudBeds API Endpoint Mapping by Virtual Agent Role
## Complete Endpoint Reference for Boardwalk Suites Lafayette

**API Version**: v1.3 (OpenAPI 3.0)  
**Total Endpoints**: 115  
**Last Updated**: 2025-01-XX

---

## Overview

This document maps all CloudBeds API v1.3 endpoints to the four virtual agent roles in the Boardwalk Suites Lafayette AI Voice Assistant system. Each role has access to endpoints based on their operational responsibilities and security permissions.

---

## Endpoint Counts by Role

| Role | Endpoints | Access Level |
|------|-----------|--------------|
| **Concierge** | 52 | Read hotel info, rooms, rates; basic guest/reservation lookup; limited write operations |
| **Booking Agent** | 85 | Full booking capabilities; reservations, payments, rates, room blocks |
| **Customer Experience** | 67 | Guest services; reservation management; housekeeping coordination |
| **Employee Ops** | 115 | Full access (all endpoints) |

---

## Role Permission Mappings

### Concierge Role

**Primary Function**: Information provider, initial guest contact

**Permissions**:
- `read:hotel` - Hotel information
- `read:room` - Room types and availability
- `read:rate` - Rate information
- `read:guest` - Guest lookup
- `read:reservation` - Reservation lookup
- `read:roomblock` - Room block information
- `read:appPropertySettings` - App settings
- `read:user` - User information
- `write:guest` - Create/update guest records
- `write:room` - Room assignments
- `write:roomblock` - Room block management
- `write:appPropertySettings` - App settings

**Key Endpoints**:
- `GET /getHotelDetails` - Hotel information
- `GET /getAvailableRoomTypes` - Room availability
- `GET /getRoomTypes` - Room type details
- `GET /getGuest` - Guest lookup
- `GET /getReservations` - Reservation lookup
- `GET /getRooms` - Room information

**CSV File**: `Concierge_Endpoints__from_pms-v1_3-openapi_yaml_.csv` (52 endpoints)

---

### Booking Agent Role

**Primary Function**: Handle new reservations, manage bookings

**Permissions**:
- All Concierge permissions, plus:
- `write:reservation` - Create/modify reservations
- `write:payment` - Process payments
- `read:payment` - Payment information
- `read:allotmentBlock` / `write:allotmentBlock` - Allotment management
- `read:group` / `write:group` - Group bookings
- `read:item` / `write:item` - Inventory items
- `write:rate` - Rate management

**Key Endpoints**:
- `GET /getAvailableRoomTypes` - Check availability
- `POST /postReservation` - Create reservation
- `GET /getRatePlans` - Rate plan information
- `POST /postPayment` - Process payment
- `GET /getReservations` - Reservation lookup
- `PUT /putReservation` - Modify reservation

**CSV File**: `Booking_Agent_Endpoints__from_pms-v1_3-openapi_yaml_.csv` (85 endpoints)

---

### Customer Experience Role

**Primary Function**: Guest services, issue resolution, reservation modifications

**Permissions**:
- `read:guest` / `write:guest` - Guest management
- `read:reservation` / `write:reservation` - Reservation management
- `read:room` / `write:room` - Room operations
- `read:payment` / `write:payment` - Payment processing
- `read:group` / `write:group` - Group management
- `read:housekeeping` / `write:housekeeping` - Housekeeping coordination
- `read:roomblock` / `write:roomblock` / `delete:roomblock` - Room block management

**Key Endpoints**:
- `GET /getReservations` - Look up reservations
- `GET /getGuestsByFilter` - Guest verification
- `PUT /putReservation` - Modify reservation
- `GET /getReservation` - Reservation details
- `POST /postHousekeepingStatus` - Housekeeping requests
- `POST /postCharge` - Process charges
- `POST /postPayment` - Process payments

**CSV File**: `Customer_Experience_Endpoints__from_pms-v1_3-openapi_yaml_.csv` (67 endpoints)

---

### Employee Ops Role (General Manager)

**Primary Function**: Full system access, administrative operations

**Permissions**: All permissions (full access)

**Key Endpoints**: All 115 endpoints

**CSV File**: `Employee_Ops_Endpoints__from_pms-v1_3-openapi_yaml_.csv` (115 endpoints)

---

## Endpoint Categories

### Authentication Endpoints
- `GET /oauth/metadata` - OAuth metadata
- `POST /access_token` - Get access token
- `GET /userinfo` - User information

**Available to**: All roles

---

### Hotel Information Endpoints
- `GET /getHotelDetails` - Hotel details
- `GET /getHotels` - Hotel list

**Available to**: Concierge, Booking Agent, Employee Ops

---

### Room & Availability Endpoints
- `GET /getAvailableRoomTypes` - Check availability
- `GET /getRoomTypes` - Room type information
- `GET /getRooms` - Room details
- `GET /getRoomsFeesAndTaxes` - Fees and taxes
- `GET /getRoomsUnassigned` - Unassigned rooms
- `GET /getReservationRoomDetails` - Reservation room details

**Available to**: Concierge, Booking Agent, Customer Experience, Employee Ops

---

### Reservation Endpoints
- `GET /getReservations` - List reservations
- `GET /getReservation` - Reservation details
- `GET /getReservationsWithRateDetails` - Reservations with rates
- `GET /getReservationAssignments` - Room assignments
- `GET /getReservationNotes` - Reservation notes
- `POST /postReservation` - Create reservation
- `PUT /putReservation` - Update reservation
- `POST /postReservationNote` - Add note
- `PUT /putReservationNote` - Update note
- `DELETE /deleteReservationNote` - Delete note
- `POST /postReservationDocument` - Add document

**Available to**: 
- Read: Concierge, Booking Agent, Customer Experience, Employee Ops
- Write: Booking Agent, Customer Experience, Employee Ops

---

### Guest Endpoints
- `GET /getGuest` - Guest details
- `GET /getGuestList` - Guest list
- `GET /getGuestsByFilter` - Filter guests
- `GET /getGuestsByStatus` - Guests by status
- `GET /getGuestsModified` - Modified guests
- `GET /getGuestNotes` - Guest notes
- `POST /postGuest` - Create guest
- `PUT /putGuest` - Update guest
- `POST /postGuestNote` - Add note
- `PUT /putGuestNote` - Update note
- `DELETE /deleteGuestNote` - Delete note
- `POST /postGuestDocument` - Add document
- `POST /postGuestPhoto` - Add photo
- `POST /postGuestsToRoom` - Assign guests to room

**Available to**: 
- Read: Concierge, Booking Agent, Customer Experience, Employee Ops
- Write: Concierge, Booking Agent, Customer Experience, Employee Ops

---

### Payment Endpoints
- `GET /getPaymentMethods` - Payment methods
- `GET /getPaymentsCapabilities` - Payment capabilities
- `POST /postPayment` - Process payment
- `POST /postCharge` - Process charge
- `POST /postCustomPaymentMethod` - Custom payment method
- `POST /postVoidPayment` - Void payment

**Available to**: Booking Agent, Customer Experience, Employee Ops

---

### Rate Endpoints
- `GET /getRate` - Get rate
- `GET /getRatePlans` - Rate plans
- `GET /getRateJobs` - Rate jobs
- `POST /putRate` - Update rate
- `POST /patchRate` - Patch rate

**Available to**: Booking Agent, Employee Ops

---

### Housekeeping Endpoints
- `GET /getHousekeepers` - Housekeeper list
- `GET /getHousekeepingStatus` - Room status
- `POST /postHousekeeper` - Create housekeeper
- `POST /postHousekeepingAssignment` - Assign housekeeper
- `POST /postHousekeepingStatus` - Update status
- `PUT /putHousekeeper` - Update housekeeper

**Available to**: Customer Experience, Employee Ops

---

### Room Block Endpoints
- `GET /getRoomBlocks` - Room blocks
- `POST /postRoomBlock` - Create room block
- `PUT /putRoomBlock` - Update room block
- `DELETE /deleteRoomBlock` - Delete room block

**Available to**: Concierge, Booking Agent, Customer Experience, Employee Ops

---

### Allotment Block Endpoints
- `GET /getAllotmentBlocks` - Allotment blocks
- `POST /createAllotmentBlock` - Create allotment
- `POST /updateAllotmentBlock` - Update allotment
- `POST /deleteAllotmentBlock` - Delete allotment
- `GET /listAllotmentBlockNotes` - Allotment notes
- `POST /createAllotmentBlockNotes` - Create note
- `POST /updateAllotmentBlockNotes` - Update note

**Available to**: Booking Agent, Employee Ops

---

### Group Endpoints
- `GET /getGroups` - Group list
- `GET /getGroupNotes` - Group notes
- `POST /postGroupNote` - Add note
- `POST /putGroup` - Update group
- `POST /patchGroup` - Patch group

**Available to**: Booking Agent, Customer Experience, Employee Ops

---

### Room Operations Endpoints
- `POST /postRoomAssign` - Assign room
- `POST /postRoomCheckIn` - Check in
- `POST /postRoomCheckOut` - Check out

**Available to**: Concierge, Booking Agent, Customer Experience, Employee Ops

---

## Implementation Notes

### Using the CSV Files

Each CSV file contains:
- **method**: HTTP method (GET, POST, PUT, DELETE)
- **path**: API endpoint path
- **operationId**: Operation identifier
- **summary**: Endpoint description
- **params**: Query/path parameters
- **security**: Security requirements (permissions)
- **tags**: API category tags

### Programmatic Access

The CSV files can be used to:
1. **Generate API client code** - Automatically create functions for each endpoint
2. **Validate permissions** - Check if a role can access an endpoint
3. **Documentation** - Generate role-specific API documentation
4. **Testing** - Create test suites per role

### Example: Using CSV for Code Generation

```javascript
// Read CSV and generate API functions
import { parse } from 'csv-parse/sync';
import fs from 'fs';

const csv = fs.readFileSync('Booking_Agent_Endpoints__from_pms-v1_3-openapi_yaml_.csv');
const endpoints = parse(csv, { columns: true, skip_empty_lines: true });

endpoints.forEach(endpoint => {
  // Generate function for each endpoint
  console.log(`export async function ${endpoint.operationId}(params) { ... }`);
});
```

---

## File Locations

All endpoint CSV files are located in:
```
user_input_files/cloudbeds-integration/
```

**Files**:
- `Concierge_Endpoints__from_pms-v1_3-openapi_yaml_.csv` (52 endpoints)
- `Booking_Agent_Endpoints__from_pms-v1_3-openapi_yaml_.csv` (85 endpoints)
- `Customer_Experience_Endpoints__from_pms-v1_3-openapi_yaml_.csv` (67 endpoints)
- `Employee_Ops_Endpoints__from_pms-v1_3-openapi_yaml_.csv` (115 endpoints)

**Reference Files**:
- `pms-v1.3-openapi.yaml` - Complete OpenAPI 3.0 specification
- `getAvailableRoomTypes-examples` - Example request/response

---

## Next Steps

1. ✅ **Complete endpoint lists generated** - All 115 endpoints mapped to roles
2. ⚠️ **Implement API client** - Generate functions from CSV files
3. ⚠️ **Add to integration plan** - Update `BRANCHING_LOGIC_IMPLEMENTATION_PLAN.md`
4. ⚠️ **Test endpoint access** - Verify permissions per role
5. ⚠️ **Document usage** - Add examples for each role's key endpoints

---

**Status**: ✅ Complete  
**Last Updated**: 2025-01-XX  
**All Endpoints Mapped**: ✅ Yes (115/115)

