# Cloudbeds Housekeeping Management Guide

## Overview

Housekeeping management is critical for hotel operations. This guide covers how to use Cloudbeds API endpoints for room status, cleaning assignments, and problem detection.

## Housekeeping Endpoints

### 1. `GET /getHousekeepingStatus` - Check Room Status

**Purpose**: Check if a room is clean or dirty.

**Use Cases**:
- Check room cleanliness before guest check-in
- Verify room status for room changes
- Monitor cleaning progress

**Parameters**:
```json
{
  "propertyID": "{{hotel.propertyID}}",
  "roomID": "{{room.roomID}}",
  "roomNumber": "{{room.roomNumber}}"
}
```

**Response**:
```json
{
  "roomID": "123",
  "roomNumber": "101",
  "status": "dirty", // or "clean", "inspection", etc.
  "lastCleanedAt": "2025-01-15T10:00:00Z",
  "assignedTo": "housekeeper_123"
}
```

**Critical Workflow - Check-In**:
```
1. Guest checks in → {{reservation.reservationID}}
2. Get assigned room → {{room.roomID}}
3. Check housekeeping status:
   → getHousekeepingStatus(roomID={{room.roomID}})
4. If status = "dirty":
   → Find clean alternative room
   → Change guest room assignment
   → Notify guest: "I've assigned you to room [new room] as your original room is still being prepared."
5. If status = "clean":
   → Proceed with check-in
```

---

### 2. `POST /postHousekeepingStatus` - Update Room Status

**Purpose**: Update room cleaning status after housekeeping is complete.

**Use Cases**:
- Housekeeper finishes cleaning room
- Update status from "dirty" to "clean"
- Can be triggered via SMS from housekeeper

**Workflow - Housekeeper SMS**:
```
1. Housekeeper texts: "Room 101 is done" or "I'm done with room 101"
2. Virtual GM identifies room number from message
3. Updates status:
   → POST /postHousekeepingStatus
   → Sets status to "clean"
4. Confirms: "Room 101 status updated to clean. Thank you!"
```

**Parameters**:
```json
{
  "propertyID": "{{hotel.propertyID}}",
  "roomID": "{{room.roomID}}",
  "status": "clean",
  "cleanedBy": "{{housekeeper.housekeeperID}}",
  "cleanedAt": "{{time.current}}"
}
```

**Response**:
```json
{
  "success": true,
  "roomID": "123",
  "status": "clean",
  "updatedAt": "2025-01-15T14:30:00Z"
}
```

---

### 3. `GET /getHousekeepers` - List Housekeepers

**Purpose**: Get list of housekeepers in the system.

**Use Cases**:
- Assign rooms to housekeepers
- Track who is cleaning which rooms
- Monitor housekeeper workload

**Parameters**:
```json
{
  "propertyID": "{{hotel.propertyID}}"
}
```

**Response**:
```json
{
  "housekeepers": [
    {
      "housekeeperID": "hk_123",
      "name": "Maria Garcia",
      "phone": "+1234567890",
      "activeAssignments": 3,
      "status": "active"
    }
  ]
}
```

---

### 4. `POST /postHousekeepingAssignment` - Assign Room to Housekeeper

**Purpose**: Assign a room to a housekeeper for cleaning.

**Selection Logic**:
- Select rooms with:
  - Status = "departure" (for that day)
  - Status = "dirty"
- These rooms need to be cleaned before next guest

**Parameters**:
```json
{
  "propertyID": "{{hotel.propertyID}}",
  "roomID": "{{room.roomID}}",
  "housekeeperID": "{{housekeeper.housekeeperID}}",
  "priority": "high", // or "normal", "low"
  "assignedAt": "{{time.current}}"
}
```

**Automated Assignment Workflow**:
```
1. Get rooms needing cleaning:
   → Filter by: status="departure" AND dirty=true AND departureDate=today
2. Get available housekeepers:
   → getHousekeepers()
3. Assign rooms to housekeepers:
   → postHousekeepingAssignment(roomID, housekeeperID)
4. Send SMS to housekeeper:
   → "Room 101 has been assigned to you for cleaning. Guest departure: today."
```

---

## Problem Detection - Overdue Departures

### Problem Scenario

**Conditions**:
- Room is occupied
- Current time is past 12:00 PM (noon)
- Room status = "departure"
- Departure date = today

**This is a problem**: Guest should have checked out but hasn't.

### Virtual GM Monitoring

**Automated Monitoring**:
```
1. Every hour after 12:00 PM:
   → Get all rooms with:
     - status = "departure"
     - departureDate = today
     - currentTime > 12:00 PM
     - occupied = true
2. For each overdue room:
   → Check if guest contacted recently
   → If no contact:
     → Text guest: "Hi, I noticed your reservation shows departure today. Are you planning to extend your stay?"
     → Text staff: "Room 101 is overdue for departure. Guest hasn't checked out."
   → If guest responds:
     → Handle extension or late checkout
```

**Virtual GM Node - Departure Monitoring**:
```json
{
  "node_name": "monitor_departures",
  "node_type": "api_call",
  "system_prompt": "You are monitoring rooms for overdue departures. Check rooms that are occupied, past 12 PM, and have departure status for today.",
  "available_functions": ["getRoomsByStatus", "getHousekeepingStatus"],
  "trigger_conditions": {
    "time": "> 12:00 PM",
    "frequency": "hourly"
  }
}
```

---

## Integration with Hotel Workflows

### 1. Check-In Workflow Enhancement

**Add Room Cleanliness Check**:
```json
{
  "node_name": "check_in_room_status",
  "node_type": "api_call",
  "system_prompt": "Check if the assigned room is clean before allowing check-in. If dirty, find alternative room.",
  "available_functions": ["getHousekeepingStatus", "changeRoomAssignment"],
  "next_nodes": [
    {
      "condition": "room_clean",
      "node_name": "proceed_check_in"
    },
    {
      "condition": "room_dirty",
      "node_name": "find_clean_room"
    }
  ]
}
```

### 2. Virtual GM Workflow - Housekeeping Management

**Nodes to Add**:
1. **Housekeeping Assignment**:
   - Get rooms needing cleaning (departure + dirty)
   - Assign to housekeepers
   - Send SMS assignments

2. **Housekeeping Status Updates**:
   - Listen for SMS from housekeepers
   - Parse room number from message
   - Update status via `postHousekeepingStatus`

3. **Departure Monitoring**:
   - Check for overdue departures (past 12 PM, still occupied)
   - Text guests and staff
   - Handle extensions

### 3. SMS Integration - Housekeeper Communication

**Housekeeper Text Format**:
- "Room 101 done"
- "I'm done with 101"
- "Room 101 is clean"
- "Finished room 101"

**Virtual GM Response**:
- Parse room number from SMS
- Update status to "clean"
- Confirm: "Room 101 status updated to clean. Thank you!"

---

## Best Practices

### 1. Room Assignment Priority

**High Priority**:
- Departure rooms for today (check-in arriving soon)
- VIP guests
- Early check-in requests

**Normal Priority**:
- Departure rooms for tomorrow
- Standard rooms

**Low Priority**:
- Rooms with no upcoming reservation

### 2. Housekeeper Workload

- Balance assignments across housekeepers
- Consider housekeeper capacity
- Monitor active assignments
- Reassign if housekeeper calls out

### 3. Problem Detection

- Monitor hourly after 12 PM
- Check for overdue departures
- Proactively contact guests
- Alert staff to potential issues

### 4. Status Updates

- Update immediately when housekeeper reports completion
- Verify status before assigning to new guest
- Track cleaning times for efficiency

---

## Example Implementation

### Virtual GM Node - Housekeeping Assignment

```json
{
  "node_name": "assign_housekeeping",
  "node_type": "api_call",
  "system_prompt": "You are assigning rooms to housekeepers for cleaning. Select rooms with departure status today that are dirty.",
  "available_functions": ["getRoomsByStatus", "getHousekeepers", "postHousekeepingAssignment"],
  "conversation_flow": {
    "steps": [
      {"type": "get_rooms", "filter": "departure AND dirty AND today"},
      {"type": "get_housekeepers", "filter": "active"},
      {"type": "assign_rooms", "balance": "workload"},
      {"type": "send_assignments", "via": "sms"}
    ]
  }
}
```

### Virtual GM Node - Housekeeping Status Update

```json
{
  "node_name": "update_housekeeping_status",
  "node_type": "api_call",
  "system_prompt": "You are updating room status when housekeeper reports completion via SMS.",
  "available_functions": ["postHousekeepingStatus"],
  "conversation_flow": {
    "steps": [
      {"type": "parse_sms", "extract": "room_number"},
      {"type": "update_status", "status": "clean"},
      {"type": "confirm", "message": "Room {roomNumber} status updated to clean. Thank you!"}
    ]
  }
}
```

---

## Related Documentation

- `CLOUDBEDS_PAYMENT_GUIDE.md` - Payment processing
- `CRITICAL_WORKFLOW_PATTERNS.md` - Core API patterns
- Virtual GM Workflow - Operations management

