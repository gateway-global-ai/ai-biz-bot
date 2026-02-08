# Advanced Chat Components

This directory contains the latest, most advanced chat interface components with full e-commerce capabilities.

## Components Overview

### 1. StandardizedChatInterface.tsx
**The flagship chat component** with three modes and complete customization.

**Features:**
- ✅ Three modes: Customer, Owner, Developer
- ✅ Floating, Fixed, and Fullscreen views
- ✅ Mode switching with different colors/branding per mode
- ✅ Full API integration with /api/website-chat
- ✅ Message history and conversation state
- ✅ Customizable colors, bot name, greeting

**Usage:**
```tsx
import StandardizedChatInterface from './advanced/StandardizedChatInterface';

<StandardizedChatInterface
  mode="customer"
  fullscreen={false}
  botName="AI Biz Bot"
  primaryColor="#6366f1"
  allowModeSwitch={true}
  siteConfigId="your-site-id"
/>
```

### 2. FloatingChatWidget.tsx
**Floating FAB-style chat widget** for embedding on any page.

**Features:**
- ✅ Fixed bottom-right position
- ✅ Expandable/collapsible
- ✅ Custom branding and colors
- ✅ Smooth animations
- ✅ Message history

**Usage:**
```tsx
import FloatingChatWidget from './advanced/FloatingChatWidget';

<FloatingChatWidget
  siteConfigId="your-site-id"
  botName="AI Assistant"
  primaryColor="#6366f1"
  greetingMessage="Hi! How can I help?"
/>
```

### 3. MenuDisplay.tsx
**Complete restaurant menu system** with categories and items.

**Features:**
- ✅ Multiple menus support
- ✅ Category organization
- ✅ Item images and descriptions
- ✅ Price display
- ✅ Add to cart functionality
- ✅ Quantity management
- ✅ Dietary badges (vegetarian, vegan, etc.)

**Usage:**
```tsx
import MenuDisplay from './advanced/MenuDisplay';

<MenuDisplay
  siteConfigId="your-site-id"
  onCartUpdate={(cart) => console.log(cart)}
/>
```

### 4. ShoppingCart.tsx
**Full-featured shopping cart** with quantity management.

**Features:**
- ✅ Item quantity adjustment (+/-)
- ✅ Remove items
- ✅ Subtotal calculation
- ✅ Tax and total calculation
- ✅ Proceed to checkout
- ✅ Empty cart state

**Usage:**
```tsx
import ShoppingCart from './advanced/ShoppingCart';

<ShoppingCart
  siteConfigId="your-site-id"
  onCheckoutClick={() => setShowCheckout(true)}
  onCartUpdate={(cart) => setCart(cart)}
/>
```

### 5. Checkout.tsx
**Payment processing and order completion** interface.

**Features:**
- ✅ Customer information form
- ✅ Order type (Dine-in, Takeout, Delivery)
- ✅ Payment method selection
- ✅ Special instructions
- ✅ Order summary
- ✅ Submit order API integration
- ✅ Success/error handling

**Usage:**
```tsx
import Checkout from './advanced/Checkout';

<Checkout
  siteConfigId="your-site-id"
  onSuccess={() => router.push('/order-confirmation')}
  onBack={() => setShowCheckout(false)}
/>
```

### 6. OtpLoginModal.tsx
**OTP authentication modal** for admin access.

**Features:**
- ✅ Phone number input with formatting
- ✅ OTP code verification
- ✅ Resend code functionality
- ✅ Loading states
- ✅ Error handling
- ✅ JWT token management

**Usage:**
```tsx
import OtpLoginModal from './advanced/OtpLoginModal';

<OtpLoginModal
  isOpen={showLogin}
  onClose={() => setShowLogin(false)}
  onSuccess={(token) => {
    setAuthToken(token);
    setShowLogin(false);
  }}
/>
```

## Integration with Website Builder

To integrate these components into the website builder:

### 1. Replace Simple ChatWidget

**Old (simple):**
```tsx
import ChatWidget from './components/ChatWidget';
```

**New (advanced):**
```tsx
import FloatingChatWidget from './components/advanced/FloatingChatWidget';
// or
import StandardizedChatInterface from './components/advanced/StandardizedChatInterface';
```

### 2. Add E-Commerce Capabilities

For restaurant/retail businesses:

```tsx
import { useState } from 'react';
import MenuDisplay from './components/advanced/MenuDisplay';
import ShoppingCart from './components/advanced/ShoppingCart';
import Checkout from './components/advanced/Checkout';

function BusinessWebsite({ siteConfigId }) {
  const [showCheckout, setShowCheckout] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);

  return (
    <div>
      {/* Main site content */}
      <HeroSection />
      <InfoGrid />
      
      {/* Menu section for restaurants */}
      <MenuDisplay 
        siteConfigId={siteConfigId}
        onCartUpdate={(cart) => setCartItemCount(cart.items.length)}
      />
      
      {/* Shopping cart */}
      <ShoppingCart
        siteConfigId={siteConfigId}
        onCheckoutClick={() => setShowCheckout(true)}
      />
      
      {/* Checkout modal */}
      {showCheckout && (
        <Checkout
          siteConfigId={siteConfigId}
          onSuccess={() => {
            setShowCheckout(false);
            // Show success message
          }}
          onBack={() => setShowCheckout(false)}
        />
      )}
      
      {/* Floating chat widget */}
      <FloatingChatWidget
        siteConfigId={siteConfigId}
        botName="AI Biz Bot"
        primaryColor="#6366f1"
      />
    </div>
  );
}
```

## Dependencies Required

These components require the following dependencies in package.json:

```json
{
  "dependencies": {
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "@google/genai": "^1.39.0",
    "lucide-react": "latest"
  }
}
```

Note: Some components use Shadcn UI components (Button, Card, Badge, etc.). You may need to adapt these to use standard HTML/CSS or include the Shadcn UI library.

## API Endpoints Required

These components expect the following backend endpoints:

1. **Chat**: `POST /api/website-chat`
2. **Menus**: `GET /api/menus/:siteConfigId`
3. **Menu Details**: `GET /api/menus/:siteConfigId/:menuId`
4. **Cart**: `GET /api/cart/:siteConfigId`
5. **Add to Cart**: `POST /api/cart/:siteConfigId/items`
6. **Update Cart Item**: `PUT /api/cart/:siteConfigId/items/:itemId`
7. **Remove from Cart**: `DELETE /api/cart/:siteConfigId/items/:itemId`
8. **Checkout**: `POST /api/checkout/:siteConfigId`
9. **OTP Send**: `POST /api/auth/otp/send`
10. **OTP Verify**: `POST /api/auth/otp/verify`

## Features Comparison

| Feature | Old ChatWidget | Advanced Components |
|---------|---------------|---------------------|
| Floating Widget | ✅ | ✅ |
| Fullscreen Mode | ❌ | ✅ |
| Multiple Modes | ❌ | ✅ (Customer/Owner/Developer) |
| Restaurant Menus | ❌ | ✅ |
| Shopping Cart | ❌ | ✅ |
| Checkout | ❌ | ✅ |
| OTP Admin | ❌ | ✅ |
| Custom Branding | ⚠️ Limited | ✅ Full |
| Voice Integration | ⚠️ Basic | 🔄 SDK Available |

## Next Steps

1. **Update App.tsx** to use advanced components
2. **Add menu management** for restaurants
3. **Integrate voice AI** from sdk/voice-ai
4. **Add admin panel** with OTP authentication
5. **Test all features** end-to-end
6. **Update documentation** with examples

## Voice AI Integration

The Voice AI SDK is available in `/sdk/voice-ai/`. To integrate:

```tsx
import { VoiceAIClient } from '../voice-ai/src/client';

const voiceClient = new VoiceAIClient({
  provider: 'kimi',
  apiKey: process.env.KIMI_API_KEY
});

// Add to chat interface
voiceClient.startConversation();
```

See [Voice AI SDK Documentation](/sdk/voice-ai/README.md) for details.

## Support

For questions or issues with these components, see:
- [Main README](/README.md)
- [Website Builder README](../README.md)
- [SDK Improvements](/SDK_IMPROVEMENTS.md)
