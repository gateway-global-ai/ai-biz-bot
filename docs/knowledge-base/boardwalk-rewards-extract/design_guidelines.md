# Design Guidelines: Boardwalk Suites Lafayette

## Design Approach
**Reference-Based: Hospitality Industry Leaders**
Drawing inspiration from Airbnb's clean card aesthetics, Booking.com's trust-building elements, and modern hotel brands' sophisticated presentation. The design prioritizes visual storytelling, trust signals, and seamless booking flows while maintaining professional hospitality standards.

## Typography System
**Font Families:**
- Headings: Inter (weights: 600, 700) - modern, professional
- Body: Inter (weights: 400, 500) - excellent readability
- Accents: Playfair Display (weight: 600) - luxury touch for hero and section headings

**Hierarchy:**
- Hero Heading: text-5xl md:text-6xl lg:text-7xl font-bold
- Section Headings: text-3xl md:text-4xl font-semibold
- Card Titles: text-xl md:text-2xl font-semibold
- Body Text: text-base md:text-lg
- UI Labels: text-sm font-medium uppercase tracking-wide

## Layout System
**Spacing Primitives:** Consistent use of Tailwind units 2, 4, 6, 8, 12, 16, 20, 24
- Section padding: py-16 md:py-24 lg:py-32
- Component spacing: gap-6 md:gap-8
- Card padding: p-6 md:p-8
- Container max-width: max-w-7xl

**Grid Strategy:**
- Room cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Feature sections: Two-column layouts (text + image/form)
- Staff dashboards: Dense multi-column data tables with responsive stacking

## Component Library

### Public Website Components

**Hero Section:**
- Full viewport height (h-screen) with high-quality hotel exterior/interior image
- Centered content overlay with semi-transparent backdrop (backdrop-blur-md bg-black/30)
- Large hero heading with Playfair Display
- Integrated search widget (dates, guests, rooms) with rounded-2xl border-2 inputs
- Primary CTA button with blurred background (backdrop-blur-sm bg-white/90)

**Rewards Program Banner:**
- Prominent placement directly after hero
- Eye-catching badge design showing "10% OFF" prominently
- Clear membership benefits list with checkmark icons
- Immediate enrollment CTA with contrasting accent treatment
- Trust signals: "Join 5,000+ members saving on stays"

**Room Cards:**
- Large image (aspect-ratio-4/3) with hover zoom effect
- Room type, bed configuration, and capacity badges
- Price per night prominently displayed
- Floor and view indicators (interior/exterior)
- "Check Availability" button with arrow icon

**Search & Filter Widget:**
- Fixed or sticky positioning when scrolling
- Date pickers with calendar overlays
- Guest count steppers (adults/children)
- Floor and room type filters with checkbox groups
- "Search Rooms" primary action button

**Group Booking Section:**
- Split layout: form (left) + benefits list (right)
- Auto-complete group code input
- Trust elements: "Special rates for groups of 10+"
- Testimonial from previous group booking

**Promotion Page (Amazon Employees):**
- Hero section explaining 1-week free offer
- Eligibility checklist with verification badges
- Multi-step application form with progress indicator
- Upload fields for employment verification
- Success confirmation with next steps

### Guest Portal Components

**Dashboard Cards:**
- Upcoming reservations with countdown timer
- Quick actions: Modify, Cancel, Request Services
- Reservation details accordion
- Rewards points balance display with progress bar toward next reward tier

**Reservation List:**
- Timeline view showing upcoming/past stays
- Status badges (Confirmed, Checked In, Completed)
- Room thumbnail images
- Download confirmation PDF button

**Feedback Form:**
- Star rating component (1-5 stars, large touch targets)
- Category-specific ratings: Cleanliness, Service, Amenities, Value
- Text area for comments
- Photo upload for additional feedback

### Staff Portal Components

**Booking Agent Interface:**
- Guest search with auto-complete
- Side-by-side: availability calendar (left) + room selection (right)
- Group code application field with validation
- Payment status indicators
- Quick-create reservation wizard

**Front Desk Interface:**
- Today's arrivals/departures split view
- Guest lookup with instant results
- Check-in checklist workflow
- Room assignment drag-and-drop
- Key card print integration button

**Checkout Agent Interface:**
- Departure list with check-out time indicators
- Billing summary review
- Integrated feedback collection
- Late checkout request handling
- Departure confirmation print

**General Manager Dashboard:**
- KPI cards: Occupancy %, Revenue, Average Rate
- Arrivals/Departures timeline
- Housekeeping status grid (color-coded room states)
- Real-time updates notification system
- Export reports functionality

**Admin Whitelist Management:**
- Employee table with search/filter
- Role assignment dropdown
- Active/Inactive toggle
- Bulk import CSV functionality
- Audit log of changes

### Navigation & Layout

**Fixed Header:**
- Transparent on hero, solid white on scroll
- Logo (left), navigation links (center), Rewards badge + Login/Account (right)
- Mobile: Hamburger menu with full-screen overlay
- Sticky search bar appears on scroll down

**Footer:**
- Four-column layout: About, Quick Links, Contact, Newsletter
- Social media icons
- Trust badges (AAA, Better Business Bureau)
- Payment method icons
- Copyright and legal links

## Images

**Required Images:**
1. **Hero Image:** Stunning hotel exterior at dusk/dawn with warm lighting, professional architectural photography showing building facade and landscaping
2. **Room Types:** High-quality interior shots for each room category (8-10 images) - bed, bathroom, amenities detail shots
3. **Amenities:** Pool, fitness center, lobby, meeting rooms (6-8 images)
4. **Location:** Lafayette area attractions and hotel exterior context shots (4-5 images)
5. **Staff Portal:** Placeholder avatars for employee profiles
6. **Rewards Program:** Visual icon/badge for membership tier illustrations

**Image Treatment:**
- Aspect ratios: 16:9 for hero, 4:3 for room cards, 1:1 for thumbnails
- Subtle vignette on hero image for text legibility
- Rounded corners: rounded-xl for cards, rounded-2xl for feature sections

## Interaction Patterns
- Form inputs: Focus state with ring-2 ring-offset-2
- Buttons: Subtle scale on hover (scale-105), no complex animations
- Cards: Gentle shadow elevation on hover
- Modals: Backdrop blur with slide-up animation
- Loading states: Skeleton screens matching content layout
- Toast notifications: Slide from top-right for confirmations

## Responsive Breakpoints
- Mobile-first approach
- Key breakpoints: md:768px, lg:1024px, xl:1280px
- Hero reduces from h-screen to h-[60vh] on mobile
- Multi-column grids collapse to single column below md:

## Rewards Program Specific Elements
- Membership tier badges: Bronze, Silver, Gold with visual distinction
- Points counter with animated increment
- "Save 10%" tags on all room prices
- Exclusive perks carousel in member dashboard
- Referral program section with unique code generation

This design creates a sophisticated, trustworthy hotel booking experience that balances visual appeal with functional clarity across all user types.