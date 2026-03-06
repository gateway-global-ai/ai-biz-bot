# Validation Rules for No-Code Platforms

## Quick Reference

**For no-code platforms (Replit, V0, Zapier, etc.)**

### ✅ DO Use

- `{{guest.phone}}` - Guest phone number
- `{{guest.email}}` - Guest email
- `{{guest.name}}` - Guest name
- `{{hotel.propertyid}}` - Property ID
- `{{customer.phone}}` - Caller phone number
- `/api/v1.3/getGuestList` - API endpoint
- `propertyID` - Parameter name

### ❌ DON'T Use

- `{{guestPhone}}` → Use `{{guest.phone}}`
- `{{guestEmail}}` → Use `{{guest.email}}`
- `{{propertyid}}` → Use `{{hotel.propertyid}}`
- `/api/v1.1/getGuestList` → Use `/api/v1.3/...`
- `propertyid` → Use `propertyID`

## Validation API

**Validate before uploading to Vapi:**

```bash
POST https://api.platformeconomics.ai/validate-vapi-config
Content-Type: application/json

{
  "assistant": { /* Vapi assistant config */ },
  "validateOnly": false
}
```

**Response:**
```json
{
  "valid": true,
  "validation": {
    "errors": [],
    "suggestions": []
  }
}
```

## Files

- **`validation-rules.json`** - Complete rules (JSON)
- **`validation-rules.yaml`** - Complete rules (YAML)
- **`schema.json`** - JSON Schema for validation
- **`README.md`** - This file

## Integration

**See**: `/dashboard-architecture/NONCODE_PLATFORM_INTEGRATION.md`

---

**Simple rule**: Always validate before uploading to Vapi!

