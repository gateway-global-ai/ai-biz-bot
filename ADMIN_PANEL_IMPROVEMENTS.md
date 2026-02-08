# Admin Panel Improvements - Website Control & Image Generation

## Overview

The admin panel has been significantly enhanced with three distinct view modes, better website controls, AI Biz Bot integration, and image generation capabilities for the hero section.

## Three View Modes

### 1. Admin Mode (Developer/Technical)
**Purpose:** Technical configuration and content management

**Tabs:**
- **Business Data** - Toggle which fields appear on website
- **Reviews** - Manage Google reviews visibility with rating filters
- **AI Biz Bot** - Integration chat with upsell functionality
- **Agent Settings** - Configure agent identity, DISC profile, system prompts

### 2. AI Business Mode (Owner/Manager)
**Purpose:** Business operations and metrics

**Tabs:**
- **Chat** - Same AI Biz Bot integration
- **Contacts** - Customer and lead contact management
- **Leads** - Sales pipeline with deal values and stages
- **Tasks** - To-do list with priorities and due dates
- **Reports** - Revenue metrics and analytics visualizations

### 3. Google Workspace Mode
**Purpose:** Manage connected Google apps

**Features:**
- Status indicator (Connected & Active)
- 9 Google app integrations:
  - Gmail, Calendar, Drive, Meet, Chat
  - Sheets, Docs, Tasks, My Business
- Toggle each app on/off for data syncing
- Per-app configuration options

## Mode Switching

**Toggle Buttons in Header:**
```
[G] Google Workspace Toggle (Green when active)
[AI] AI Business Mode Toggle (Blue when active)
```

**Visual Feedback:**
- Header color changes per mode
- Admin: Dark slate (#1e293b)
- Workspace: Google green (#0f9d58)
- AI Mode: Shows animated pulse indicator

## Key Features

### 1. Business Data Management (Admin Tab)

**Field-Level Control:**
```tsx
// Toggle which data fields appear on the website
<table>
  <thead>
    <tr>
      <th>Include</th>
      <th>Field Name</th>
      <th>Value Preview</th>
    </tr>
  </thead>
  <tbody>
    {fields.map(field => (
      <tr className={!ignoredFields.has(field) ? '' : 'opacity-50 grayscale'}>
        <td>
          <ToggleSwitch 
            checked={!ignoredFields.has(field)}
            onChange={() => onToggleField(field)}
          />
        </td>
        <td>{field}</td>
        <td>{formatValue(data[field])}</td>
      </tr>
    ))}
  </tbody>
</table>
```

**Benefits:**
- Visual control over what data appears on website
- Live preview of field values
- Toggle on/off without code changes
- Greyed out when disabled

### 2. Review Management (Admin Tab)

**Minimum Rating Filter:**
- Slider from 1 to 5 stars (0.5 increments)
- Auto-hides reviews below threshold
- Manual override per review available

**Individual Review Control:**
```tsx
{reviews.map((review, idx) => {
  const isHidden = hiddenReviews.has(idx);
  const isBelowThreshold = review.rating < minRating;
  const isVisibleOnSite = !isHidden && !isBelowThreshold;
  
  return (
    <div className={isVisibleOnSite ? 'border-green-200' : 'opacity-70'}>
      {/* Review display */}
      <ToggleSwitch 
        checked={!isHidden}
        onChange={() => onToggleReview(idx)}
      />
    </div>
  );
})}
```

**Features:**
- Visual indication of which reviews appear on site (green border)
- Author photo, name, timestamp
- Star rating display
- Manual show/hide override

### 3. AI Biz Bot Integration (Admin & AI Mode)

**Chat Interface:**
- Start chat button with animated loading
- Real-time message streaming
- Typing indicators with animated dots
- Function calling for upsells

**Upsell Cards:**
```tsx
// AI can trigger upsell cards in conversation
if (call.name === 'suggestIntegration') {
  setChatMessages(prev => [...prev, {
    role: 'model',
    text: "Integration details...",
    isUpsell: true,
    upsellData: {
      title: "Google Workspace Integration",
      price: "$99",
      description: "Professional email and collaboration",
      features: [
        "Professional Email (@yourbusiness.com)",
        "Appointment Booking & Calendar",
        "Drive Storage & Docs",
        "24/7 Priority Support"
      ],
      cta: "Add Integration"
    }
  }]);
}
```

**Upsell Card UI:**
- Gradient header with pricing badge
- Feature list with checkmarks
- Install button with loading state
- Success confirmation message

**Installation Flow:**
1. User asks about integration (e.g., "How do I get business email?")
2. AI recognizes need → triggers function call
3. Upsell card appears in chat
4. User clicks "Add Integration"
5. Simulated 2-second API call
6. Success message in chat
7. Configuration email notification

### 4. Agent Settings (Admin Tab)

**Identity & Role Configuration:**
```tsx
<input 
  label="Agent Name"
  value={agentConfig.name}
  onChange={(e) => onUpdateAgentConfig({...agentConfig, name: e.target.value})}
  placeholder="e.g. Zephyr"
/>

<input 
  label="Role Title"
  value={agentConfig.role}
  onChange={(e) => onUpdateAgentConfig({...agentConfig, role: e.target.value})}
  placeholder="e.g. Concierge"
/>

<input 
  label="DISC Profile / Personality"
  value={agentConfig.discProfile}
  onChange={(e) => onUpdateAgentConfig({...agentConfig, discProfile: e.target.value})}
  placeholder="e.g. High I (Influence), Low D. Friendly and Enthusiastic."
/>
```

**System Prompt Editor:**
- Large textarea (h-64) for detailed instructions
- Monospace font for code/structured text
- Real-time updates
- Saves to agent configuration

**Agent Config Structure:**
```typescript
interface AgentConfig {
  name: string;              // "Zephyr"
  role: string;              // "Concierge"
  discProfile: string;       // "High I (Influence)..."
  basePrompt: string;        // Full system prompt
}
```

### 5. Google Workspace Integration

**App Management:**
```tsx
const MOCK_WORKSPACE_APPS = [
  { 
    id: 'gmail', 
    name: 'Gmail', 
    icon: 'M', 
    description: 'Business email integration', 
    status: true,
    color: 'text-red-500',
    bg: 'bg-red-50'
  },
  // ... 8 more apps
];

// Toggle app status
const toggleWorkspaceApp = (id: string) => {
  setWorkspaceApps(prev => prev.map(app => 
    app.id === id ? { ...app, status: !app.status } : app
  ));
};
```

**App Card UI:**
- Icon with brand color
- App name and description
- Status toggle switch
- "Syncing Active" / "Disconnected" badge
- Configure button when active

**Connection Status:**
- Animated pulse indicator
- "Connected & Active" message
- Full integration notice

### 6. Business Metrics (AI Mode)

**Contacts Tab:**
```tsx
const MOCK_CONTACTS = [
  { 
    name: 'Alice Johnson', 
    email: 'alice@example.com', 
    type: 'Customer',
    lastActive: '2 hrs ago',
    status: 'Active'
  },
  // ...
];
```

**Leads Tab:**
- Company name and contact
- Deal value ($5,000)
- Stage (Negotiation, Qualified, Discovery)
- Probability percentage (80%, 40%, 20%)
- Color-coded by probability (green >50%, amber ≤50%)

**Tasks Tab:**
- Checkbox for completion
- Task title
- Priority (High/Medium/Low with color coding)
- Due date (Today, Tomorrow, Fri, Mon)
- Type badge (Sales, Finance, Admin, Marketing)

**Reports Tab:**
- Revenue card: $24,500, ↑12% growth
- Leads card: 18 new, ↑4 this week
- Chart visualization placeholder

## Image Generator for Hero Section

### Feature Description

**Purpose:** Generate hero images for the website header/banner section

**Integration Points:**
1. Admin panel UI control
2. AI-powered image generation (Flux via Replicate)
3. Real-time preview
4. One-click deployment to hero section

### Expected UI

```tsx
// Hero Image Generator Section (New Tab in Admin Mode)
<div className="bg-white p-6 rounded-xl border border-slate-200">
  <h3 className="font-semibold text-slate-900 mb-4">Hero Section Image</h3>
  
  {/* Current Hero Image */}
  <div className="mb-6">
    <label className="text-sm text-slate-500 mb-2 block">Current Hero Image</label>
    <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden">
      {currentHeroImage ? (
        <img src={currentHeroImage} alt="Current hero" className="w-full h-full object-cover" />
      ) : (
        <div className="flex items-center justify-center h-full text-slate-400">
          No hero image set
        </div>
      )}
    </div>
  </div>
  
  {/* Image Generation */}
  <div className="space-y-4">
    <div>
      <label className="text-sm font-medium text-slate-700 mb-2 block">
        Describe Your Desired Hero Image
      </label>
      <textarea 
        value={heroPrompt}
        onChange={(e) => setHeroPrompt(e.target.value)}
        className="w-full px-4 py-3 border border-slate-200 rounded-lg"
        rows={3}
        placeholder="e.g., A modern coffee shop interior with warm lighting, customers chatting, barista at work, cinematic photography"
      />
    </div>
    
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-sm font-medium text-slate-700 mb-2 block">
          Style
        </label>
        <select 
          value={heroStyle}
          onChange={(e) => setHeroStyle(e.target.value)}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        >
          <option value="photographic">Photographic</option>
          <option value="illustration">Illustration</option>
          <option value="3d-render">3D Render</option>
          <option value="minimalist">Minimalist</option>
          <option value="watercolor">Watercolor</option>
        </select>
      </div>
      
      <div>
        <label className="text-sm font-medium text-slate-700 mb-2 block">
          Aspect Ratio
        </label>
        <select 
          value={heroAspectRatio}
          onChange={(e) => setHeroAspectRatio(e.target.value)}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        >
          <option value="16:9">16:9 (Wide)</option>
          <option value="21:9">21:9 (Ultra Wide)</option>
          <option value="4:3">4:3 (Standard)</option>
          <option value="1:1">1:1 (Square)</option>
        </select>
      </div>
    </div>
    
    <button 
      onClick={handleGenerateHeroImage}
      disabled={isGenerating || !heroPrompt.trim()}
      className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {isGenerating ? (
        <>
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Generate Hero Image
        </>
      )}
    </button>
  </div>
  
  {/* Generated Image Preview */}
  {generatedHeroImage && (
    <div className="mt-6 space-y-4">
      <label className="text-sm text-slate-500 block">Generated Image</label>
      <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden border-2 border-purple-200">
        <img src={generatedHeroImage} alt="Generated hero" className="w-full h-full object-cover" />
      </div>
      
      <div className="flex gap-3">
        <button 
          onClick={handleApplyHeroImage}
          className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Apply to Hero Section
        </button>
        
        <button 
          onClick={handleRegenerate}
          className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50"
        >
          Regenerate
        </button>
      </div>
    </div>
  )}
</div>
```

### Implementation

```typescript
// Hero Image Generation Handler
const handleGenerateHeroImage = async () => {
  setIsGenerating(true);
  
  try {
    // Construct full prompt with style
    const fullPrompt = `${heroPrompt}, ${heroStyle} style, ${heroAspectRatio} aspect ratio, professional, high quality, hero banner image`;
    
    // Call Flux image generation API
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: fullPrompt,
        aspectRatio: heroAspectRatio,
        style: heroStyle,
        model: 'flux-schnell', // Fast Flux model
      })
    });
    
    const data = await response.json();
    
    if (data.imageUrl) {
      setGeneratedHeroImage(data.imageUrl);
    } else {
      throw new Error('No image generated');
    }
  } catch (error) {
    console.error('Hero image generation failed:', error);
    alert('Failed to generate image. Please try again.');
  } finally {
    setIsGenerating(false);
  }
};

// Apply Generated Image to Hero Section
const handleApplyHeroImage = async () => {
  try {
    // Update site configuration
    const response = await fetch('/api/site-config/hero-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteConfigId: currentSiteId,
        heroImageUrl: generatedHeroImage,
      })
    });
    
    if (response.ok) {
      setCurrentHeroImage(generatedHeroImage);
      alert('Hero image updated successfully!');
      
      // Trigger website rebuild/refresh
      await fetch('/api/site-config/rebuild', {
        method: 'POST',
        body: JSON.stringify({ siteConfigId: currentSiteId })
      });
    }
  } catch (error) {
    console.error('Failed to apply hero image:', error);
    alert('Failed to update hero image.');
  }
};
```

### Backend API Endpoints

```typescript
// POST /api/generate-image
// Generate image using Flux via Replicate
app.post('/api/generate-image', async (req, res) => {
  const { prompt, aspectRatio, style, model = 'flux-schnell' } = req.body;
  
  try {
    const output = await replicate.run(
      "black-forest-labs/flux-schnell",
      {
        input: {
          prompt: prompt,
          aspect_ratio: aspectRatio || '16:9',
          output_format: 'webp',
          output_quality: 90,
        }
      }
    );
    
    // Upload to storage and return URL
    const imageUrl = output[0]; // Replicate returns array
    
    res.json({ imageUrl });
  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ error: 'Image generation failed' });
  }
});

// POST /api/site-config/hero-image
// Update hero image in site configuration
app.post('/api/site-config/hero-image', async (req, res) => {
  const { siteConfigId, heroImageUrl } = req.body;
  
  await db.update(siteConfigs)
    .set({ 
      heroImageUrl,
      updatedAt: new Date()
    })
    .where(eq(siteConfigs.id, siteConfigId));
  
  res.json({ success: true });
});
```

## Database Schema Updates

```typescript
// Add to site_configs table
export const siteConfigs = pgTable("site_configs", {
  // ... existing fields
  heroImageUrl: text("hero_image_url"),
  heroImagePrompt: text("hero_image_prompt"), // Save prompt for regeneration
  heroImageStyle: text("hero_image_style"),
  // ...
});
```

## Integration with Chat Config

**Flow:**
1. Admin opens admin panel (gear icon in chat or separate button)
2. Switches to desired mode (Admin/AI/Workspace)
3. Makes changes (toggle fields, adjust reviews, configure agent)
4. Changes auto-save to database
5. Website updates reflect immediately
6. Chat widget pulls latest config on reload

**Data Sync:**
```
Admin Panel Changes
       ↓
Database (site_configs, agents)
       ↓
SDK Widget Config Fetch
       ↓
Live Website Updates
```

## Key Benefits

1. **No-Code Control** - Business owners manage everything via UI
2. **Real-Time Updates** - Changes reflect immediately
3. **Multi-Mode Interface** - Technical, Business, and Integration views
4. **AI-Powered Upsells** - Conversational upgrade path
5. **Visual Content Control** - Toggle fields and reviews with preview
6. **Agent Customization** - Full control over AI personality
7. **Image Generation** - Professional hero images without designers
8. **Google Integration** - Per-app control of data syncing

## Implementation Checklist

- [x] Review admin panel component
- [x] Document three view modes
- [x] Document field/review management
- [x] Document AI Biz Bot integration with upsells
- [x] Document agent configuration panel
- [x] Document Google Workspace integration
- [x] Design hero image generator UI
- [ ] Implement hero image generator backend
- [ ] Add hero image upload to site config
- [ ] Create image generation API endpoint
- [ ] Test Flux integration
- [ ] Add hero image preview to website
- [ ] Integrate with admin panel
- [ ] Test all mode transitions
- [ ] Verify data persistence

## Conclusion

The admin panel now provides comprehensive website control through an intuitive UI with three specialized modes. Combined with AI-powered image generation for the hero section, business owners can manage their entire web presence without touching code or hiring designers.
