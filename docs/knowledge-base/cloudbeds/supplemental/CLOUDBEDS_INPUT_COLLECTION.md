# CloudBeds Natural Language Input Collection
## Branching Logic and Date Parsing

**Status**: ✅ **COMPLETE**  
**Date**: 2025-11-13

---

## Overview

This module provides natural language input collection and parsing for the CloudBeds booking flow. It handles date parsing, room preference extraction, and generates natural language prompts for missing required fields.

---

## Date Parsing (`parseDateRequest`)

### Branching Logic Rules

When checking rates and availability:

1. **If guest requests "tonight"**:
   - Set `startDate` = `{{NOW}}` (today)
   - If "tonight for 1 night" → `endDate` = `{{NOW}} + 1 day`
   - If "tonight for 1 week" → `endDate` = `{{NOW}} + 7 days`

2. **If guest requests "tomorrow"**:
   - Set `startDate` = `{{NOW}} + 1 day`
   - Default: 1 night stay
   - Can include duration: "tomorrow for 3 nights"

3. **If guest has not supplied startDate**:
   - Ask: "What date are you looking to check in?"
   - Set `startDate` based on response

4. **Duration parsing**:
   - "for 1 week" → 7 nights
   - "for 7 days" → 7 nights
   - "for 3 nights" → 3 nights
   - "1 night" → 1 night

### Supported Date Formats

- **Natural language**: "tonight", "tomorrow", "November 13"
- **Numeric**: "11/13/2025", "11/13" (assumes current year)
- **With duration**: "tonight for 1 week", "tomorrow for 3 nights"

### Example Usage

```javascript
import { parseDateRequest } from './lib/cloudbeds-booking-input.js';

// Parse "tonight"
const result1 = parseDateRequest('tonight');
// { startDate: '2025-11-13', endDate: '2025-11-14', nights: 1, parsed: true }

// Parse "tonight for 1 week"
const result2 = parseDateRequest('tonight for 1 week');
// { startDate: '2025-11-13', endDate: '2025-11-20', nights: 7, parsed: true }

// Parse "tomorrow"
const result3 = parseDateRequest('tomorrow');
// { startDate: '2025-11-14', endDate: '2025-11-15', nights: 1, parsed: true }
```

---

## Room Preference Extraction (`extractRoomPreferences`)

### Supported Preferences

1. **Bed Type**:
   - "one bed", "1 bed", "single bed", "king bed" → `bedType: 'single'` (maxGuests: 2)
   - "two beds", "2 beds", "double beds", "twin beds" → `bedType: 'double'` (maxGuests: 4)

2. **Floor**:
   - "first floor", "1st floor", "ground floor", "level 1" → `floor: 'first'`
   - "second floor", "2nd floor", "level 2" → `floor: 'second'`

3. **Location**:
   - "interior" → `location: 'interior'` (filters for "Interior" in roomTypeName)
   - "exterior" → `location: 'exterior'` (filters for "Exterior" in roomTypeName)

### Example Usage

```javascript
import { extractRoomPreferences } from './lib/cloudbeds-booking-input.js';

const prefs = extractRoomPreferences('I want a king bed on the first floor');
// { bedType: 'single', floor: 'first', location: null }

const prefs2 = extractRoomPreferences('I need two beds in an interior room');
// { bedType: 'double', floor: null, location: 'interior' }
```

---

## Room Filtering (`filterRoomsByPreferences`)

Filters available rooms based on guest preferences:

- **Bed type**: Filters by `maxGuests` (single ≤ 2, double ≥ 4)
- **Floor**: Filters by "Level 1" or "Level 2" in `roomTypeName`
- **Location**: Filters by "Interior" or "Exterior" in `roomTypeName`

### Example Usage

```javascript
import { filterRoomsByPreferences } from './lib/cloudbeds-booking-input.js';

const preferences = {
  bedType: 'single',    // 1 bed (maxGuests: 2)
  floor: 'first',      // Level 1
  location: 'interior'  // Interior rooms
};

const filteredRooms = filterRoomsByPreferences(availableRooms, preferences);
// Returns only rooms matching: maxGuests ≤ 2, contains "Level 1", contains "Interior"
```

---

## Required Field Prompts (`getNextRequiredFieldPrompt`)

Generates natural language prompts for missing required fields based on CloudBeds `PostReservationRequest` schema.

### Field Order

1. **startDate** → "What date are you looking to check in?"
2. **endDate** → "And what date will you be checking out?" or "How many nights are you planning to stay?"
3. **adults** → "How many guests will be staying?"
4. **roomTypeID** (after availability check) → "Which room option would you like to book?"
5. **guestFirstName** → "May I have the first name for the reservation?"
6. **guestLastName** → "And your last name?"
7. **guestEmail** → "What email address should I send the confirmation to?"
8. **guestPhone** → "And what's the best phone number to reach you?"
9. **guestCountry** → "What country are you from?"
10. **guestZip** → "And what's your zip code?"

### Example Usage

```javascript
import { getNextRequiredFieldPrompt } from './lib/cloudbeds-booking-input.js';

const state1 = {};
const prompt1 = getNextRequiredFieldPrompt(state1);
// "What date are you looking to check in?"

const state2 = { startDate: '2025-11-13', endDate: '2025-11-14', adults: 2 };
const prompt2 = getNextRequiredFieldPrompt(state2);
// "Which room option would you like to book?"

const state3 = { /* all fields filled */ };
const prompt3 = getNextRequiredFieldPrompt(state3);
// null (all required fields collected)
```

---

## SMS Link Generation (`generateRoomSelectionSMSLink`)

Generates an SMS link that allows guests to:
1. View all available room options
2. Select a room
3. Complete customer intake form (first name, last name, phone, email)
4. Trigger webhook notification when room is selected

### Flow

1. **Guest requests availability** → AI checks availability
2. **AI presents best option** → "I have a King Suite available for $79/night..."
3. **If guest wants more options** → AI sends SMS link: "I'm sending you a text with all available options..."
4. **Guest clicks link** → Views all rooms, selects one
5. **Webhook notification** → System receives selection
6. **Customer intake form** → Guest completes required fields
7. **Reservation continues** → AI continues booking flow

### Example Usage

```javascript
import { generateRoomSelectionSMSLink, formatSMSLinkMessage } from './lib/cloudbeds-booking-input.js';

const smsData = generateRoomSelectionSMSLink({
  propertyID: '315701',
  startDate: '2025-11-13',
  endDate: '2025-11-14',
  adults: 2,
  children: 0,
  phone: '+1234567890',
  callSid: 'CA123...'
});

// smsData.url = "https://twilio.platformeconomics.ai/booking/select-room?propertyID=315701&..."
// smsData.message = "Hi! Here are all available room options..."

// Natural language message for AI to say
const aiMessage = formatSMSLinkMessage({ hasMultipleOptions: true });
// "I'm sending you a text message with all available room options..."
```

---

## Integration with Booking Flow

### Step 1: Parse Guest Date Request

```javascript
import { parseDateRequest } from './lib/cloudbeds-booking-input.js';

// Guest says: "I'd like to book a room for tonight"
const dateResult = parseDateRequest('tonight');

if (dateResult) {
  bookingState.startDate = dateResult.startDate;
  bookingState.endDate = dateResult.endDate;
  bookingState.nights = dateResult.nights;
} else {
  // Ask for clarification
  const prompt = askForStartDate(bookingState);
  // "What date are you looking to check in?"
}
```

### Step 2: Extract Room Preferences

```javascript
import { extractRoomPreferences, filterRoomsByPreferences } from './lib/cloudbeds-booking-input.js';

// Guest says: "I want a king bed on the first floor"
const preferences = extractRoomPreferences('I want a king bed on the first floor');

// Get availability
const availability = await getAvailableRoomTypes({
  propertyIDs: '315701',
  startDate: bookingState.startDate,
  endDate: bookingState.endDate,
  adults: bookingState.adults,
  children: bookingState.children || 0
});

// Filter rooms based on preferences
const filteredRooms = filterRoomsByPreferences(
  availability.data[0].propertyRooms,
  preferences
);

// Present best option (or all if filtered)
```

### Step 3: Collect Missing Fields

```javascript
import { getNextRequiredFieldPrompt } from './lib/cloudbeds-booking-input.js';

// After each guest response, check what's missing
const nextPrompt = getNextRequiredFieldPrompt(bookingState);

if (nextPrompt) {
  // Send prompt to OpenAI Realtime API
  openAiWs.send(JSON.stringify({
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'user',
      content: [{ type: 'input_text', text: nextPrompt }]
    }
  }));
}
```

### Step 4: Send SMS Link (Optional)

```javascript
import { generateRoomSelectionSMSLink, formatSMSLinkMessage } from './lib/cloudbeds-booking-input.js';

// If guest wants to see all options
if (guestWantsMoreOptions) {
  const smsData = generateRoomSelectionSMSLink({
    propertyID: '315701',
    startDate: bookingState.startDate,
    endDate: bookingState.endDate,
    adults: bookingState.adults,
    phone: callerPhone,
    callSid: callSid
  });
  
  // Send SMS via Twilio
  await twilioClient.messages.create({
    to: callerPhone,
    from: hotelPhone,
    body: smsData.message
  });
  
  // Tell guest via voice
  const aiMessage = formatSMSLinkMessage({ hasMultipleOptions: true });
  // "I'm sending you a text message with all available room options..."
}
```

---

## Best Available Option Logic

**Rule**: We only present the **best available option** to the caller.

**Best option criteria** (in priority order):
1. Best rate plan (discount > monthly > weekly > daily)
2. Lowest price (if same rate plan type)
3. Matches guest preferences (if specified)

**If guest wants more options**:
- Send SMS link with all available options
- Guest can filter and select on their own
- Webhook notifies system when selection is made
- Customer intake form appears after selection

---

## Testing

```bash
# Test date parsing
node --input-type=module -e "
import { parseDateRequest } from './lib/cloudbeds-booking-input.js';
console.log(parseDateRequest('tonight for 1 week'));
"

# Test preference extraction
node --input-type=module -e "
import { extractRoomPreferences } from './lib/cloudbeds-booking-input.js';
console.log(extractRoomPreferences('I want a king bed on the first floor'));
"

# Test required field prompts
node --input-type=module -e "
import { getNextRequiredFieldPrompt } from './lib/cloudbeds-booking-input.js';
console.log(getNextRequiredFieldPrompt({}));
"
```

---

## Next Steps

1. ✅ **Date Parsing**: Complete
2. ✅ **Preference Extraction**: Complete
3. ✅ **Room Filtering**: Complete
4. ✅ **Required Field Prompts**: Complete
5. ⏭️ **SMS Link Generation**: Complete (needs webhook endpoint)
6. ⏭️ **Integration into server-realtime.js**: Add to booking flow handler
7. ⏭️ **Webhook Endpoint**: Create `/booking/select-room` endpoint
8. ⏭️ **Customer Intake Form**: Create form page

---

**Status**: ✅ **READY FOR INTEGRATION**  
**Last Updated**: 2025-11-13

