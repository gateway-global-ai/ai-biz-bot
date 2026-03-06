# Cloudbeds Reservation Modification Guide

## Overview

Reservation modifications, especially extensions, require careful handling with payment verification and room block management. This guide covers the proper workflow for extending reservations while ensuring payment is collected.

## Critical Workflow: Extension with Payment Verification

### Standard Extension Flow (Recommended)

**Principle**: Collect payment first, then extend. Never extend without payment unless manager approved.

### 1. Request Extension

**Guest Request**: "I'd like to extend my stay"

**Steps**:
1. Verify guest identity
2. Get current reservation details
3. Confirm new check-out date
4. Calculate additional charges
5. **Place courtesy hold on room** (prevents room from being assigned to others)
6. **Attempt to collect payment**
7. If payment successful → Extend reservation
8. If payment fails → Drop courtesy hold → Require manager approval for extension without payment

---

## Endpoints for Reservation Modification

### 1. `PUT /putReservation` - Modify Reservation

**Purpose**: Update reservation details including check-out date.

**Parameters**:
```json
{
  "propertyID": "{{hotel.propertyID}}",
  "reservationID": "{{reservation.reservationID}}",
  "checkOut": "{{reservation.newCheckOutDate}}",
  "adults": "{{reservation.adults}}",
  "children": "{{reservation.children}}"
}
```

**Response**:
```json
{
  "success": true,
  "reservationID": "123",
  "checkOut": "2025-01-16",
  "updatedAt": "2025-01-15T10:00:00Z"
}
```

---

### 2. Room Blocks / Courtesy Holds

**Purpose**: Hold a room temporarily while processing extension and payment.

**Workflow**:
1. **Place Block**: Reserve the room so it can't be assigned to other guests
2. **Process Payment**: Attempt to collect payment for extension
3. **If Payment Success**: 
   - Extend reservation
   - Remove block (or convert to confirmed reservation)
4. **If Payment Fails**:
   - Drop block immediately
   - Room becomes available again
   - Require manager approval for extension without payment

**Block Management**:
- Create block when extension requested
- Block duration: 24 hours (or until payment received)
- Remove block if payment not received within timeframe
- Convert block to reservation extension if payment successful

---

## Extension Workflow with Payment Verification

### Step-by-Step Process

```
1. Guest requests extension
   → "I'd like to extend my stay"
   
2. Verify guest identity
   → Get reservation details
   → Confirm current check-out date
   
3. Collect new check-out date
   → "When would you like to check out?"
   → Validate new date is after current check-out
   
4. Calculate additional charges
   → Get room rate for extended dates
   → Calculate total additional amount
   → Show guest: "That will be an additional $X for Y nights"
   
5. Place courtesy hold on room
   → Block room to prevent assignment to others
   → Set block expiration (24 hours)
   
6. Attempt to collect payment
   → Check for saved payment method first
   → If saved card: Offer to use it
   → If no saved card: Generate paybylink
   → Send payment link via SMS
   
7. Wait for payment confirmation
   → Monitor payment status
   → If payment received within block timeframe:
     → Extend reservation (PUT /putReservation)
     → Remove room block
     → Confirm: "Your stay has been extended to [date]"
   → If payment not received:
     → Drop room block immediately
     → Room becomes available
     → Offer manager approval option
```

---

## Manager Approval Workflow

### Extension Without Payment

**Scenario**: Guest wants to extend but payment fails or is not available.

**Process**:
1. Payment attempt fails or times out
2. Room block is dropped
3. System offers: "Would you like me to request manager approval for this extension?"
4. If guest accepts:
   - Create manager approval request
   - Notify manager via SMS/email
   - Manager can approve or deny
5. If manager approves:
   - Extend reservation without payment
   - Log manager approval
   - Follow up on payment separately
6. If manager denies:
   - Inform guest
   - Offer alternative solutions (different dates, payment options)

---

## Room Block Management

### Block Endpoints

**Note**: Cloudbeds API may use different terminology. Check for:
- `postRoomBlock`
- `createRoomBlock`
- `holdRoom`
- `reserveRoom`

**Block Parameters**:
```json
{
  "propertyID": "{{hotel.propertyID}}",
  "roomID": "{{room.roomID}}",
  "reservationID": "{{reservation.reservationID}}",
  "blockType": "courtesy_hold",
  "expiresAt": "{{time.current + 24 hours}}",
  "reason": "Extension payment pending"
}
```

**Drop Block**:
```json
{
  "propertyID": "{{hotel.propertyID}}",
  "blockID": "{{block.blockID}}",
  "reason": "Payment not received"
}
```

---

## Implementation in Hotel Template

### Node: Extension Request

```json
{
  "node_name": "reservation_extension_request",
  "node_type": "conversation",
  "system_prompt": "Guest wants to extend their reservation. Collect new check-out date, calculate charges, place courtesy hold, then collect payment before extending.",
  "available_functions": ["getReservationDetails", "calculateExtensionCharges", "createRoomBlock"],
  "next_nodes": [
    {"condition": "extension_requested", "node_name": "collect_extension_date"},
    {"condition": "date_collected", "node_name": "place_room_block"},
    {"condition": "block_placed", "node_name": "extension_payment"}
  ]
}
```

### Node: Extension Payment

```json
{
  "node_name": "extension_payment",
  "node_type": "api_call",
  "system_prompt": "Collect payment for extension. If payment successful, extend reservation. If fails, drop block and offer manager approval.",
  "available_functions": ["getPaymentMethods", "paybylink", "extendReservation"],
  "next_nodes": [
    {"condition": "payment_success", "node_name": "extend_reservation"},
    {"condition": "payment_failed", "node_name": "drop_block_offer_approval"}
  ]
}
```

### Node: Extend Reservation

```json
{
  "node_name": "extend_reservation",
  "node_type": "api_call",
  "system_prompt": "Extend reservation with new check-out date. Remove room block after successful extension.",
  "available_functions": ["putReservation", "removeRoomBlock"],
  "next_nodes": [
    {"condition": "extension_complete", "node_name": "extension_confirmation"}
  ]
}
```

### Node: Drop Block & Manager Approval

```json
{
  "node_name": "drop_block_offer_approval",
  "node_type": "api_call",
  "system_prompt": "Drop room block immediately. Offer manager approval for extension without payment.",
  "available_functions": ["removeRoomBlock", "createManagerApprovalRequest"],
  "next_nodes": [
    {"condition": "block_dropped", "node_name": "offer_manager_approval"},
    {"condition": "approval_requested", "node_name": "wait_for_approval"}
  ]
}
```

---

## Payment Verification Before Extension

### Critical Rules

1. **Always collect payment first** (unless manager approves)
2. **Place room block** before attempting payment
3. **Drop block immediately** if payment fails
4. **Never extend without payment** unless manager approved
5. **Set block expiration** (24 hours default)
6. **Monitor payment status** actively

### Payment Flow

```
Extension Requested
    │
    ├─ Calculate charges
    │
    ├─ Place room block (courtesy hold)
    │
    ├─ Check for saved payment method
    │   │
    │   ├─ Has saved card? → Use saved card
    │   │
    │   └─ No saved card? → Generate paybylink
    │
    ├─ Wait for payment
    │   │
    │   ├─ Payment received? → Extend reservation → Remove block
    │   │
    │   └─ Payment failed/timeout? → Drop block → Offer manager approval
    │
    └─ Confirmation
```

---

## Manager Approval Process

### Approval Request

**Create Request**:
```json
{
  "type": "extension_without_payment",
  "reservationID": "{{reservation.reservationID}}",
  "currentCheckOut": "{{reservation.checkOutDate}}",
  "requestedCheckOut": "{{reservation.newCheckOutDate}}",
  "additionalNights": 2,
  "additionalAmount": 178.00,
  "reason": "Payment failed, guest requesting extension",
  "requestedBy": "{{guest.guestID}}",
  "requestedAt": "{{time.current}}"
}
```

### Manager Response

**Approve**:
- Extend reservation without payment
- Log approval
- Create follow-up task for payment collection
- Notify guest: "Your extension has been approved. We'll follow up on payment separately."

**Deny**:
- Keep original check-out date
- Notify guest: "I'm sorry, but we couldn't approve the extension without payment. Your check-out date remains [date]."
- Offer alternatives (different dates, payment plans)

---

## Best Practices

### 1. Room Block Management

- **Always place block** before payment attempt
- **Set reasonable expiration** (24 hours)
- **Monitor block status** actively
- **Drop immediately** if payment fails
- **Convert to reservation** when payment succeeds

### 2. Payment Verification

- **Check saved methods first** (faster for returning guests)
- **Generate paybylink** if no saved card
- **Set payment timeout** (match block expiration)
- **Follow up** if payment pending

### 3. Manager Approval

- **Only when payment fails** or not available
- **Provide full context** to manager
- **Log all approvals** for audit
- **Follow up on payment** after approval

### 4. Guest Communication

- **Be transparent** about process
- **Explain room hold** ("I'm holding your room while we process payment")
- **Set expectations** ("You have 24 hours to complete payment")
- **Provide alternatives** if payment fails

---

## Example Conversation Flow

```
Guest: "I'd like to extend my stay"

Agent: "I'd be happy to help you extend your stay! When would you like your new check-out date to be?"

Guest: "January 20th"

Agent: "Perfect! That's an additional 2 nights. The additional charge will be $178. Let me hold your room while we process payment. I'm checking if you have a saved payment method..."

[Checks for saved card]
[If found: "I see you have a card ending in 4242 on file. Use that?"]
[If not: "I'm sending you a secure payment link via text. Please click it and enter your payment information."]

[Payment received]
Agent: "Great! Payment received. I've extended your reservation to January 20th. You'll receive a confirmation email shortly."

[Payment failed]
Agent: "I'm sorry, but we couldn't process the payment. I've released the room hold. Would you like me to request manager approval for this extension? It may take a few hours for approval."
```

---

## Related Documentation

- `CLOUDBEDS_PAYMENT_GUIDE.md` - Payment processing details
- `CLOUDBEDS_HOUSEKEEPING_GUIDE.md` - Room management
- `CRITICAL_WORKFLOW_PATTERNS.md` - Core API patterns

