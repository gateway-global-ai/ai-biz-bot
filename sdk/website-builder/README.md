# Website Builder SDK

**Canonical deployable copy:** The platform uses **`platform/website-builder/`** as the single source for the running app. This directory (`sdk/website-builder/`) is kept for SDK packaging and reference; sync from or to **`platform/website-builder/`** when updating the live builder. See **`platform/README.md`** in the repo root.

AI-powered website generator that creates professional business websites from Google Maps data.

## 🎉 NEW: Advanced Features Integrated (Feb 7, 2026)

The website builder now includes **enterprise-grade chat and e-commerce components**:

- ✅ **Advanced Chat Interface** - Floating, Fixed, and Fullscreen modes
- ✅ **Restaurant Menus** - Full menu system with categories and items
- ✅ **Shopping Cart** - Complete cart with quantity management
- ✅ **Checkout/Cashier** - Payment processing and order completion
- ✅ **OTP Admin** - Secure admin authentication
- ✅ **Voice AI Ready** - Integration with Voice AI SDK

See [Advanced Components Documentation](./components/advanced/README.md) for details.

## Overview

This template creates instant, professional websites for businesses by:
1. Looking up a business on Google Maps
2. Extracting real business data (hours, reviews, photos, location)
3. Using Gemini AI to generate taglines, descriptions, and insights
4. Creating a complete website with AI voice concierge and chat support
5. Admin panel for business owner to customize content

## Features

### Core Website Generation
- **Auto-Generated Content**: AI writes taglines, descriptions, and business insights
- **Real Data**: Hours, reviews, photos pulled from Google Maps
- **Voice Concierge**: Real-time AI voice assistant for customers
- **Nearby Places**: Auto-generates "neighborhood guide" with restaurants and activities

### Advanced Chat & Commerce (NEW)
- **Standardized Chat Interface**: Floating, Fixed, and Fullscreen view modes
- **Multi-Mode Support**: Customer, Owner, and Developer modes with different branding
- **Restaurant Menus**: Complete menu system with categories, items, and dietary badges
- **Shopping Cart**: Full cart with quantity management and price calculations
- **Checkout/Cashier**: Payment processing and order completion
- **OTP Admin Panel**: Secure admin authentication for business owners
- **Voice AI Integration**: Ready to integrate with Voice AI SDK

### Customization
- **Admin Panel**: Business owner can toggle fields, filter reviews, adjust settings
- **AI Biz Bot**: Upsell assistant for integrations (Google Workspace, etc.)
- **Custom Branding**: Configurable colors, logos, and messaging
- **Responsive Design**: Works on desktop, tablet, and mobile

## API Configuration

### Google Maps API Key (Required)
The server must inject the Google Maps key into the window object:

```html
<script>
  window.__GOOGLE_MAPS_KEY__ = 'your-google-maps-api-key';
</script>
```

### Gemini AI Integration (Two Options)

**Option 1: Backend Proxy (Recommended for Production)**
Keep your Gemini API key secure on the server and set the backend URL:

```html
<script>
  window.__BACKEND_API_URL__ = 'https://your-backend.com';
</script>
```

The backend should expose `/api/gemini/enrich-business` and `/api/gemini/chat` endpoints.

**Option 2: Direct Client Calls (Development Only)**
For local development, you can inject the Gemini key directly (NOT recommended for production):

```html
<script>
  window.__GEMINI_API_KEY__ = 'your-gemini-api-key';
</script>
```

⚠️ **Security Warning**: Option 2 exposes your API key to the browser. Only use for development.

## Integration with Gateway Global AI

This template is deployed as a white-label product through Gateway Global AI:

1. **Task Flow**: Customer requests a website via SMS
2. **Business Lookup**: Agent uses Google Maps to find customer's business
3. **Site Generation**: Template is instantiated with customer's business data
4. **Customization**: AI Biz Bot assists with additional integrations
5. **Deployment**: Site is deployed to customer's subdomain

## Upsell Opportunities

The AI Biz Bot can suggest these integrations:
- **Google Workspace** ($99): Professional email, calendar, Drive
- **Square/Shopify** (Custom): E-commerce integration
- **Reservation Systems** (Custom): OpenTable, Resy integration
- **CRM Integration** (Custom): Salesforce, HubSpot connection

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies: `npm install`
2. Update `index.html` with your API keys (for development only):
   ```html
   <script>
     window.__GOOGLE_MAPS_KEY__ = 'your-google-maps-key';
     window.__GEMINI_API_KEY__ = 'your-gemini-api-key'; // Dev only!
   </script>
   ```
3. Run the app: `npm run dev`

**For production**, configure `window.__BACKEND_API_URL__` instead of exposing the Gemini key.

## File Structure

```
sdk/website-builder/
├── App.tsx              # Main app component
├── types.ts             # TypeScript interfaces
├── types/
│   └── menu.ts          # Menu & cart type definitions (NEW)
├── components/
│   ├── PlaceSearch.tsx  # Google Places autocomplete
│   ├── HeroSection.tsx  # Hero with photos
│   ├── InfoGrid.tsx     # Hours, reviews, contact
│   ├── BlogSection.tsx  # Nearby places guide
│   ├── ChatWidget.tsx   # AI chat interface (basic)
│   ├── VoiceIndicator.tsx # Voice call UI
│   ├── AdminPanel.tsx   # Business owner admin
│   └── advanced/        # Advanced features (NEW)
│       ├── README.md                    # Component documentation
│       ├── StandardizedChatInterface.tsx # Advanced chat (3 modes)
│       ├── FloatingChatWidget.tsx       # Floating FAB widget
│       ├── MenuDisplay.tsx              # Restaurant menus
│       ├── ShoppingCart.tsx             # Shopping cart
│       ├── Checkout.tsx                 # Payment & checkout
│       └── OtpLoginModal.tsx            # OTP authentication
├── services/
│   ├── geminiService.ts # Gemini AI integration
│   └── liveService.ts   # Voice AI service
└── package.json         # Dependencies & scripts
```

## Version History

- **Latest (SDK)**: Production-ready with secure API handling and backend proxy support
- **Feb 7, 2026**: Added advanced chat components (floating/fixed/fullscreen, menus, cart, checkout, OTP)
- **Deprecated**: `website-builder/` (root) - to be removed
- **Deprecated**: `genai-business-site-generator (2)/` - prototype with hardcoded keys

## Using Advanced Features

### Basic Chat (Simple)
The basic ChatWidget component provides simple chat functionality:

```tsx
import ChatWidget from './components/ChatWidget';

<ChatWidget
  chatSession={chatSession}
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
/>
```

### Advanced Chat (Recommended)
For full features including floating/fixed/fullscreen modes:

```tsx
import StandardizedChatInterface from './components/advanced/StandardizedChatInterface';

<StandardizedChatInterface
  mode="customer"  // or "owner" or "developer"
  fullscreen={false}
  botName="AI Biz Bot"
  primaryColor="#6366f1"
  allowModeSwitch={true}
  siteConfigId="your-site-id"
/>
```

### E-Commerce Integration (Restaurants/Retail)
Add menu, cart, and checkout for businesses that sell products:

```tsx
import MenuDisplay from './components/advanced/MenuDisplay';
import ShoppingCart from './components/advanced/ShoppingCart';
import Checkout from './components/advanced/Checkout';

function RestaurantWebsite({ siteConfigId }) {
  const [showCheckout, setShowCheckout] = useState(false);

  return (
    <>
      <MenuDisplay siteConfigId={siteConfigId} />
      <ShoppingCart 
        siteConfigId={siteConfigId}
        onCheckoutClick={() => setShowCheckout(true)}
      />
      {showCheckout && (
        <Checkout
          siteConfigId={siteConfigId}
          onSuccess={() => alert('Order placed!')}
          onBack={() => setShowCheckout(false)}
        />
      )}
    </>
  );
}
```

### Admin Panel with OTP
Secure admin access for business owners:

```tsx
import OtpLoginModal from './components/advanced/OtpLoginModal';

<OtpLoginModal
  isOpen={showLogin}
  onClose={() => setShowLogin(false)}
  onSuccess={(token) => {
    // Store token and show admin features
    setAuthToken(token);
  }}
/>
```

See [Advanced Components README](./components/advanced/README.md) for complete documentation.

## Future Enhancements

- [ ] Server-side Google Maps Grounding Lite (no client-side API keys)
- [ ] Database persistence for generated sites
- [ ] Multi-tenant customer accounts
- [ ] Template customization themes
- [ ] Analytics dashboard
- [ ] SEO optimization tools
