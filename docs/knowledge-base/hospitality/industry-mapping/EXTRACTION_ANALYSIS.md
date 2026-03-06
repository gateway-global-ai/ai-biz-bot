# Configuration Extraction & Analysis

## Analyzed Repositories

### 1. Car Rental Demo (`vapiblocks-car-rental-demo`)
**Industry**: Car Rental / Transportation

#### Key Components Found:
- **API Route**: `/app/api/vapi/find-car/route.ts`
  - Function: Search for available cars
  - Pattern: Edge function that queries database
  - Uses: Date filtering, location-based search
  
- **Hook**: `/hooks/use-vapi.ts`
  - Standard Vapi hook pattern
  - Handles: Call state, transcripts, volume levels
  
- **Database Actions**: `/db/actions.ts`
  - Car search queries
  - Reservation management
  - Date filtering logic

- **Utilities**: `/app/lib/findCar.ts`
  - Car search logic
  - Filtering by dates, location, features

#### Industry Patterns Identified:
1. **Booking Flow**: Search → Filter → Select → Reserve
2. **Date Management**: Check-in/check-out dates
3. **Location Services**: Map integration, location filtering
4. **Inventory Management**: Car availability, pricing
5. **Payment Processing**: Reservation payments

#### Variables Used:
- `startDate`, `endDate` (rental period)
- `location` (pickup/dropoff)
- `carId`, `carType` (vehicle selection)
- `customerId`, `customerName` (renter info)
- `totalPrice`, `deposit` (pricing)

### 2. Serverless Example (`example-server-serverless-vercel`)
**Industry**: Generic Backend Patterns

#### Key Components Found:
- **Webhook Handler**: `/api/webhook/.assistantRequest.ts`
  - Pattern: Vercel Edge Function
  - Handles: Function calling from Vapi
  - Pattern: Async function execution
  
- **Environment Config**: `/example.env`
  - API keys
  - Database connections
  - Service URLs

#### Industry Patterns Identified:
1. **Function Calling**: Server-side execution of AI tool functions
2. **Webhook Handling**: Event-driven architecture
3. **Edge Functions**: Serverless deployment pattern

### 3. Starter Template (`next-tailwind-vapi-starter`)
**Industry**: Generic Starter

#### Key Components Found:
- **Basic Hook**: Standard `use-vapi.ts`
- **UI Component**: Orb visualizer
- **Minimal Configuration**: Basic assistant setup

#### Industry Patterns Identified:
1. **Simple Integration**: Minimal setup for voice AI
2. **UI Components**: Visual feedback for calls

## Industry Mapping to Our Standards

### Hospitality (Cloudbeds Integration)
**From**: Car rental booking patterns → Hotel booking patterns

**Mapped Variables**:
- Car rental `startDate` → `{{reservation.startDate}}`
- Car rental `endDate` → `{{reservation.endDate}}`
- Car rental `location` → `{{hotel.location}}`
- Car rental `carId` → `{{room.roomId}}`
- Car rental `customerId` → `{{guest.guestID}}`
- Car rental `totalPrice` → `{{reservation.totalAmount}}`

**Tools Needed**:
- `getAvailableRoomTypes` (Cloudbeds)
- `getRatePlans` (Cloudbeds)
- `createReservation` (Cloudbeds)
- `checkIn` (Cloudbeds)
- `checkOut` (Cloudbeds)

### Car Rental (From Demo)
**Mapped to Our Standards**:
- `{{reservation.startDate}}` (rental start)
- `{{reservation.endDate}}` (rental end)
- `{{vehicle.vehicleId}}` (car ID)
- `{{vehicle.location}}` (pickup location)
- `{{vehicle.type}}` (car type)
- `{{customer.customerId}}` (renter ID)
- `{{reservation.totalAmount}}` (rental cost)

**Tools Needed**:
- `searchVehicles`
- `checkAvailability`
- `createReservation`
- `processPayment`

### Healthcare (New Industry)
**Patterns from Examples**:
- Appointment scheduling (similar to booking)
- Patient intake (similar to reservation form)

**Variables**:
- `{{appointment.date}}`
- `{{appointment.time}}`
- `{{patient.patientId}}`
- `{{provider.providerId}}`
- `{{appointment.type}}`

### Property Management (New Industry)
**Patterns from Examples**:
- Property listing (similar to car listing)
- Tenant management (similar to customer management)

**Variables**:
- `{{property.propertyId}}`
- `{{property.location}}`
- `{{tenant.tenantId}}`
- `{{lease.startDate}}`
- `{{lease.endDate}}`

## Next Steps: Template Creation

For each industry, create:
1. **Assistant Configuration**: Standardized Vapi assistant config
2. **Tool Definitions**: Industry-specific tools mapped to APIs
3. **Variable Mappings**: Using Global Variables v2.0 format
4. **UI Components**: Industry-specific dashboard components
5. **Integration Guide**: How to deploy the solution

