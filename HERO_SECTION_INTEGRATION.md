# Hero Section - Dynamic Voice & Chat Interface

## Overview

The HeroSection component is a centerpiece of the website, featuring dynamic background images, voice visualizer, and dual concierge options (voice and chat). It seamlessly integrates with the AI-generated hero images from the admin panel.

## Component Features

### Dynamic Background Image

```typescript
const bgImage = data.images.length > 0 
  ? data.images[0]  // Uses first image from business data
  : 'https://picsum.photos/1600/900?grayscale&blur=2'; // Fallback
```

**Image Effects:**
- Zoom on hover (scale-105 → scale-110)
- 2-second smooth transition
- 60% opacity for readability
- Gradient overlay (slate-900 with varying opacity)
- Rounded bottom corners (rounded-b-[4rem])

**Integration with Admin Panel:**
When admin generates hero image via Flux:
1. Image uploaded to storage
2. Saved to `site_configs.heroImageUrl`
3. Added to `data.images[0]`
4. Hero section automatically uses it
5. Smooth transition on next page load

### Two States: Normal vs Voice Active

**Normal State:**
- Full business information visible
- Tagline badge with green dot
- Large heading with business name
- Description text
- Two action buttons (Voice & Chat Concierge)

**Voice Active State:**
- Dark overlay with backdrop blur (bg-black/80 backdrop-blur-md)
- Text content scales down to 95% and blurs
- Large voice visualizer appears
- Stop button replaces action buttons
- "Concierge is Listening" status indicator

### Voice Visualizer

**Real-Time Volume Response:**
```typescript
const scale = 1 + (Math.min(voiceVolume, 1) * 1.5);

// Applied to:
// 1. Outer glow (pulsing gradient sphere)
// 2. Ripple rings (concentric circles)
// 3. All scale simultaneously with voice input
```

**Visual Elements:**
1. **Outer Glow** - Blue/purple gradient blur, scales with volume
2. **Ripple Ring** - White/20% opacity border, scale × 1.1
3. **Inner Ring** - White/40% opacity border, scale × 0.95
4. **Stop Button** - Red circular button with square icon
5. **Status Badge** - "Concierge is Listening" with pulsing green dot

**Animation Timeline:**
- Voice starts → 300ms zoom-in fade-in animation
- Volume detected → rings pulse in real-time (75ms transitions)
- User speaks → outer glow expands/contracts
- Stop clicked → 700ms fade-out, content scales back

### Action Buttons

**Voice Concierge Button:**
```tsx
<button onClick={onVoiceToggle}>
  <MicrophoneIcon className="text-blue-600" />
  Voice Concierge
</button>
```

**Styling:**
- White background with slate-900 text
- Blue microphone icon
- Hover: scale-105 with white glow shadow
- Active: scale-95 for tactile feedback
- Smooth transitions (hover:scale-105)

**Chat Concierge Button:**
```tsx
<button onClick={onChatClick}>
  Chat Concierge
  <ChatBubbleIcon />
</button>
```

**Styling:**
- Semi-transparent (bg-white/5)
- White text
- Border with subtle glow
- Backdrop blur
- Hover: bg-white/10, border-white/20

### Responsive Design

**Breakpoints:**
- Base: text-5xl, single column buttons
- MD (768px): text-7xl, button row
- LG (1024px+): text-8xl

**Mobile Optimizations:**
- Minimum height: 600px
- Actual height: 85vh
- Stacked buttons on small screens
- Touch-friendly button sizes (px-8 py-4)

### Tagline Badge

```tsx
<div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-white/10">
  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
  {data.tagline}
</div>
```

**Features:**
- Green pulsing dot (indicating "online")
- Glassmorphic background (white/10 with backdrop-blur)
- Border glow (border-white/20)
- Slide-in from top animation (700ms)

### Content Hierarchy

```
1. Tagline Badge (top) - Green dot + text
   ↓
2. Business Name (h1) - Large bold heading
   ↓
3. Description (p) - Readable body text
   ↓
4. Action Buttons (CTAs) - Voice & Chat options
```

### Animation Sequence

**Page Load:**
1. 0ms: Background image fades in
2. 0ms: Tagline badge slides in from top (700ms duration)
3. 100ms: Action buttons slide in from bottom (700ms duration)
4. Stagger creates polished entrance

**Voice Toggle:**
1. Buttons fade out (500ms)
2. Text content scales down and blurs (500ms)
3. Dark overlay fades in (700ms)
4. Voice visualizer zooms in (300ms)
5. Status badge appears

**Voice End:**
1. Visualizer fades out (300ms)
2. Dark overlay fades out (700ms)
3. Text content scales back up (500ms)
4. Buttons slide back in (700ms delay-100)

## Integration Points

### 1. Business Data

```typescript
interface BusinessData {
  name: string;           // "The Local Cafe"
  tagline: string;        // "Open Now"
  description: string;    // "Cozy neighborhood cafe..."
  images: string[];       // [heroImageUrl, ...]
}
```

### 2. Voice System

```typescript
interface VoiceProps {
  isVoiceActive: boolean;   // Toggle visualizer
  voiceVolume: number;      // 0-1 range for scaling
  onVoiceToggle: () => void; // Start/stop handler
}
```

**Voice Volume Flow:**
```
Microphone Input
       ↓
Audio Analysis (Web Audio API)
       ↓
Volume Calculation (0-1)
       ↓
voiceVolume prop
       ↓
scale = 1 + (volume * 1.5)
       ↓
Visual rings pulse
```

### 3. Chat Integration

```typescript
onChatClick: () => void; // Opens chat widget/modal
```

**Chat Flow:**
1. User clicks "Chat Concierge"
2. Handler opens StandardizedChatInterface or FloatingChatWidget
3. Modal/sidebar appears
4. Hero section remains visible (background)

### 4. Image Generator Connection

**Complete Flow:**
```
Admin Panel
       ↓
Generate Hero Image (Flux)
       ↓
Upload to Storage
       ↓
Save to site_configs.heroImageUrl
       ↓
Update data.images[0]
       ↓
Hero Section displays new image
       ↓
Smooth background transition
```

**Database:**
```sql
UPDATE site_configs 
SET hero_image_url = 'https://storage.../generated-hero.webp',
    hero_image_prompt = 'Modern coffee shop interior...',
    hero_image_style = 'photographic'
WHERE id = 'site-123';
```

**Frontend:**
```typescript
// Fetch site config
const siteConfig = await fetch('/api/site-configs/site-123').then(r => r.json());

// Populate business data
const businessData = {
  name: siteConfig.name,
  tagline: siteConfig.tagline,
  description: siteConfig.description,
  images: [siteConfig.heroImageUrl, ...siteConfig.otherImages]
};

// Render hero section
<HeroSection data={businessData} ... />
```

## CSS Classes Deep Dive

### Container
```css
h-[85vh]           /* 85% viewport height */
min-h-[600px]      /* Minimum 600px */
rounded-b-[4rem]   /* Large bottom border radius */
overflow-hidden    /* Clip children */
group              /* Hover parent */
```

### Background Image
```css
scale-105           /* Default 105% zoom */
group-hover:scale-110  /* 110% on hover */
transition-transform duration-[2s]  /* 2-second smooth zoom */
opacity-60          /* Readable overlay */
```

### Overlay (Voice Mode)
```css
bg-black/80         /* 80% black */
backdrop-blur-md    /* Medium blur */
opacity-0           /* Hidden by default */
opacity-100         /* When voice active */
transition-opacity duration-700
```

### Text Content
```css
/* Normal state */
scale-100 opacity-100

/* Voice active */
scale-95 opacity-50 blur-[2px]

/* Smooth transition */
transition-all duration-500 ease-out
```

### Voice Visualizer Rings
```css
/* Outer glow */
w-40 h-40 bg-gradient-to-tr from-blue-500/30 to-purple-500/30
blur-3xl
transition-all duration-75  /* Fast for real-time feedback */

/* Ripple rings */
border-2 border-white/20
rounded-full
transition-all duration-75
```

## Accessibility

**Keyboard Navigation:**
- Tab through buttons
- Enter/Space to activate
- Escape to close voice mode

**Screen Readers:**
```tsx
<button
  onClick={onVoiceToggle}
  aria-label="Start voice concierge"
  aria-pressed={isVoiceActive}
>
  Voice Concierge
</button>

<button
  onClick={onChatClick}
  aria-label="Open chat concierge"
>
  Chat Concierge
</button>
```

**Visual Indicators:**
- Green dot for "online" status
- Pulsing animation for active states
- Color changes on hover/active
- Clear visual feedback

## Performance Optimizations

**Image Loading:**
- Lazy load background image
- Use webp format from Flux generator
- Optimize dimensions (1600×900 recommended)
- Fallback to placeholder

**Animations:**
- Use `will-change-transform` on frequently changing elements
- GPU-accelerated transforms (scale, translate)
- Debounce voice volume updates to 75ms
- Avoid layout recalculation

**Rendering:**
```typescript
// Only update visualizer scale when voice active
{isVoiceActive && (
  <div style={{ transform: `scale(${scale})` }} />
)}
```

## Testing Checklist

- [ ] Background image loads correctly
- [ ] AI-generated hero image displays
- [ ] Hover zoom effect works smoothly
- [ ] Voice toggle activates visualizer
- [ ] Volume changes scale rings in real-time
- [ ] Stop button ends voice mode
- [ ] Chat button opens chat interface
- [ ] Animations are smooth (60fps)
- [ ] Responsive on mobile, tablet, desktop
- [ ] Keyboard navigation works
- [ ] Screen reader announces buttons
- [ ] Dark overlay blurs background
- [ ] Text scales and blurs during voice mode
- [ ] Status badge shows correct state

## Future Enhancements

**Potential Additions:**
1. Video background support
2. Parallax scrolling effect
3. Multiple hero image carousel
4. Time-based greetings ("Good morning!")
5. Weather integration in tagline
6. Live chat user count
7. Animated particle effects
8. Custom font loading
9. A/B testing different CTAs
10. Hero section A/B variants

## Complete Integration Example

```tsx
import React, { useState, useEffect } from 'react';
import HeroSection from './components/HeroSection';
import StandardizedChatInterface from './components/StandardizedChatInterface';

function App() {
  const [businessData, setBusinessData] = useState(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Load business data with hero image
  useEffect(() => {
    fetch('/api/site-configs/current')
      .then(r => r.json())
      .then(config => {
        setBusinessData({
          name: config.name,
          tagline: config.tagline || 'Open Now',
          description: config.description,
          images: [config.heroImageUrl, ...config.otherImages]
        });
      });
  }, []);

  // Voice handler
  const handleVoiceToggle = () => {
    if (isVoiceActive) {
      // Stop voice
      setIsVoiceActive(false);
      setVoiceVolume(0);
    } else {
      // Start voice
      setIsVoiceActive(true);
      startVoiceDetection();
    }
  };

  // Voice volume detection
  const startVoiceDetection = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const updateVolume = () => {
      if (isVoiceActive) {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setVoiceVolume(average / 255);
        requestAnimationFrame(updateVolume);
      }
    };
    
    updateVolume();
  };

  if (!businessData) return <div>Loading...</div>;

  return (
    <>
      <HeroSection
        data={businessData}
        isVoiceActive={isVoiceActive}
        voiceVolume={voiceVolume}
        onVoiceToggle={handleVoiceToggle}
        onChatClick={() => setIsChatOpen(true)}
      />
      
      {isChatOpen && (
        <StandardizedChatInterface
          mode="customer"
          siteConfigId="current"
          fullscreen={false}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </>
  );
}
```

## Summary

The HeroSection component is the visual centerpiece that:

✅ Displays AI-generated hero images from admin panel
✅ Provides dual concierge options (voice and chat)
✅ Shows real-time voice visualizer with volume feedback
✅ Adapts to voice mode with overlay and blur effects
✅ Animates smoothly between states
✅ Responds to user interactions
✅ Integrates with complete chat/voice system
✅ Scales responsively across devices
✅ Optimized for performance and accessibility

This creates a stunning, interactive entry point that showcases the business while providing immediate access to AI-powered assistance through voice or chat.
