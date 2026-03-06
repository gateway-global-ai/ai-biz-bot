# Cloudbeds Payment Processing Guide

## Overview

Cloudbeds payment processing has specific limitations and workflows that must be followed for hotel booking integrations.

## Payment Endpoints

### 1. `POST /paybylink` - Generate Payment Link

**Purpose**: Generate a payment link that guests can use to enter their credit card information.

**Limitations**:
- ❌ Cannot accept credit card information directly via API
- ✅ Guests must manually enter their card information into the paybylink form
- ✅ Use this for guests who don't have a saved payment method

**Parameters**:
```json
{
  "propertyID": "{{hotel.propertyID}}",
  "reservationID": "{{reservation.reservationID}}",
  "amount": "{{reservation.totalAmount}}",
  "currency": "{{hotel.currency}}",
  "description": "Payment for reservation {{reservation.reservationID}}"
}
```

**Response**:
```json
{
  "paymentLink": "https://payments.cloudbeds.com/pay/abc123",
  "expiresAt": "2025-01-15T23:59:59Z"
}
```

**Use Case**: 
- New guests without saved payment methods
- Guests who want to pay with a different card
- One-time payments for reservations

---

### 2. `GET /getPaymentMethods` - Check Saved Payment Methods

**Purpose**: Retrieve saved payment methods for an existing guest.

**When to Use**:
- ✅ Check if guest has a card on file
- ✅ Allow existing guests to use saved payment method
- ✅ Verify payment options before offering paybylink

**Parameters**:
```json
{
  "propertyID": "{{hotel.propertyID}}",
  "guestID": "{{guest.guestID}}"
}
```

**Response**:
```json
{
  "paymentMethods": [
    {
      "paymentMethodID": "pm_123",
      "type": "card",
      "last4": "4242",
      "brand": "visa",
      "expiryMonth": 12,
      "expiryYear": 2025,
      "isDefault": true
    }
  ]
}
```

**Use Case**:
- Existing guests who want to pay
- Returning customers with saved cards
- Quick payment for repeat guests

---

## Payment Workflow

### For New Guests (No Saved Payment Method)

```
1. Create reservation → {{reservation.reservationID}}
2. Calculate total amount → {{reservation.totalAmount}}
3. Generate paybylink:
   → POST /paybylink
   → Returns: paymentLink
4. Send payment link via SMS/email
5. Guest enters card information on paybylink form
6. Payment processed via Cloudbeds
```

### For Existing Guests (Check Saved Payment Methods First)

```
1. Verify guest identity → {{guest.guestID}}
2. Check for saved payment methods:
   → GET /getPaymentMethods(guestID={{guest.guestID}})
3. If payment methods found:
   → Offer to use saved card
   → Guest confirms
   → Process payment with saved card
4. If no payment methods found:
   → Generate paybylink
   → Send link via SMS/email
   → Guest enters card information
```

### Payment Workflow Decision Tree

```
Guest wants to pay
    │
    ├─ Is existing guest? (has guestID)
    │   │
    │   ├─ Yes → Check getPaymentMethods(guestID)
    │   │   │
    │   │   ├─ Has saved card? → Use saved card
    │   │   │
    │   │   └─ No saved card? → Generate paybylink
    │   │
    │   └─ No → Generate paybylink
    │
    └─ Generate paybylink
```

---

## Integration with Hotel Template Workflow

### Payment Node in Booking Flow

After reservation creation, the workflow should:

1. **Check Guest Status**:
   - If `{{guest.guestID}}` exists → Check for saved payment methods
   - If no `guestID` → Generate paybylink

2. **Payment Options**:
   - **Option A**: Use saved card (if available)
   - **Option B**: Generate paybylink (always available)

3. **Send Payment Link**:
   - Via SMS: "I'm sending you a secure payment link to complete your reservation"
   - Via Email: Include payment link in confirmation email
   - Via Voice: "I'm texting you a secure payment link. Please click it to enter your payment information."

---

## Important Notes

### API Limitations

1. **No Direct Card Processing**: 
   - Cannot accept credit card information via API
   - PCI compliance requires card entry through Cloudbeds secure form
   - Always use `paybylink` for manual card entry

2. **Saved Payment Methods**:
   - Only available for existing guests with `guestID`
   - Must check `getPaymentMethods` before offering saved card option
   - Guest must confirm use of saved card

3. **Payment Link Security**:
   - Links expire after a set time
   - Check `expiresAt` before sending to guest
   - Regenerate if expired

### Best Practices

1. **Always Check for Saved Cards First**:
   - Reduces friction for returning guests
   - Faster checkout for repeat customers
   - Better user experience

2. **Provide Clear Instructions**:
   - Explain payment link purpose
   - Set expectations about entering card information
   - Provide support if guest has issues

3. **Follow Up on Payment**:
   - Verify payment status after link sent
   - Send confirmation when payment processed
   - Handle payment failures gracefully

---

## Example Implementation

### Node: Check Payment Methods (for existing guests)

```json
{
  "node_name": "check_payment_methods",
  "node_type": "api_call",
  "system_prompt": "You are checking if the guest has a saved payment method. If they have a card on file, offer to use it. If not, generate a payment link.",
  "available_functions": ["getPaymentMethods"],
  "next_nodes": [
    {
      "condition": "has_saved_card",
      "node_name": "offer_saved_card"
    },
    {
      "condition": "no_saved_card",
      "node_name": "generate_payment_link"
    }
  ]
}
```

### Node: Generate Payment Link

```json
{
  "node_name": "generate_payment_link",
  "node_type": "api_call",
  "system_prompt": "You are generating a secure payment link for the guest. Send it via SMS and explain they need to enter their card information.",
  "available_functions": ["paybylink"],
  "next_nodes": [
    {
      "condition": "link_generated",
      "node_name": "send_payment_link"
    }
  ]
}
```

### Node: Send Payment Link

```json
{
  "node_name": "send_payment_link",
  "node_type": "conversation",
  "system_prompt": "Inform the guest that you're sending them a secure payment link via SMS. Explain they need to click it and enter their payment information.",
  "initial_message": "I'm sending you a secure payment link via text message. Please click the link and enter your payment information to complete your reservation.",
  "sms_template": "Payment Link: {{payment.paymentLink}}\n\nPlease click this link to enter your payment information and complete your reservation.\n\nThis link expires in 24 hours."
}
```

---

## Related Documentation

- `CRITICAL_WORKFLOW_PATTERNS.md` - Core API patterns
- `CLOUDBEDS_API_QUERY_GUIDE.md` - How to query the API database
- Hotel Template Workflow - Payment integration nodes

