# Learning SDK Integration Guide

## Overview

This guide explains how the Gateway Learning SDK integrates with the Gateway Global AI platform's knowledge base to create immersive, AI-powered learning experiences for small business topics.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Gateway Platform                          │
│                                                              │
│  ┌──────────────┐      ┌──────────────┐    ┌─────────────┐ │
│  │  Knowledge   │      │   Learning   │    │   Gemini    │ │
│  │     Base     │◄────►│     SDK      │◄───┤     AI      │ │
│  │   Database   │      │              │    │   (Live)    │ │
│  └──────────────┘      └──────────────┘    └─────────────┘ │
│         │                      │                            │
│         │                      │                            │
│         ▼                      ▼                            │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │  API Routes  │      │ Voice System │                    │
│  │ /api/knowledge│      │  (Audio I/O) │                    │
│  └──────────────┘      └──────────────┘                    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │  Customer Site  │
                  │  (Embedded SDK) │
                  └─────────────────┘
```

---

## Knowledge Base Integration

### 1. How Knowledge Flows into Lessons

**Step 1: Knowledge Storage**
```typescript
// Platform stores knowledge entries
POST /api/knowledge
{
  "category": "google_api",
  "subcategory": "places_api",
  "title": "Google Places API Pricing",
  "content": "Detailed pricing breakdown...",
  "tags": ["google", "places", "pricing"],
  "metadata": { "lastVerified": "2026-02-07" }
}
```

**Step 2: Knowledge Retrieval**
```typescript
// Learning SDK queries knowledge base
GET /api/knowledge?category=google_api&tags=places,pricing

// Response includes multiple related entries
[
  { title: "Places API Pricing", content: "..." },
  { title: "Cost Optimization Tips", content: "..." },
  { title: "Free Tier Usage", content: "..." }
]
```

**Step 3: Lesson Generation**
```typescript
// SDK transforms knowledge into structured lesson
const lessonPlan = await generateLessonFromKnowledge('google-business');

// Gemini AI enhances with:
// - Engaging narrative structure
// - Visual prompts for images
// - Interactive quiz questions
// - Real-world examples
```

### 2. Pre-Built Topic Templates

The SDK includes curated templates for common topics:

```typescript
// templates/google-business.ts
export const GOOGLE_BUSINESS_TEMPLATE = {
  topic: 'Google Business APIs for Small Business Success',
  syllabus: [
    { id: 'why', title: 'Why Google Business APIs Matter', ... },
    { id: 'who', title: 'Key APIs and Services', ... },
    { id: 'what', title: 'Core Capabilities', ... },
    { id: 'where', title: 'Use Cases and Applications', ... },
    { id: 'when', title: 'Implementation Strategy', ... },
    { id: 'conclusion', title: 'Next Steps', ... }
  ],
  content: {
    overview: '...',
    keyPoints: [...],
    examples: [...],
    bestPractices: [...]
  },
  quizQuestions: [...]
};
```

### 3. Dynamic Content Updates

When knowledge base is updated, lessons automatically reflect changes:

```typescript
// Update pricing information
PUT /api/knowledge/places-api-pricing
{
  "content": "Updated pricing as of Feb 2026..."
}

// Next lesson generation pulls fresh data
const lesson = await generateLessonFromKnowledge('google-business');
// ✓ Contains latest pricing information
```

---

## Learning Paths

### Available Paths

**1. Getting Started with Gateway AI**
```typescript
{
  title: 'Getting Started with Gateway AI',
  topics: [
    'website-generation',  // 30-Second AI Websites
    'ai-chatbots',         // AI Chatbots for Business
    'gateway-sdk'          // Gateway SDK Usage
  ],
  duration: '45 minutes',
  level: 'beginner'
}
```

**2. Master Google Business Tools**
```typescript
{
  title: 'Master Google Business Tools',
  topics: [
    'google-business',     // Google Business APIs
    'google-workspace'     // Workspace Integration
  ],
  duration: '60 minutes',
  level: 'intermediate'
}
```

**3. Voice AI and Automation**
```typescript
{
  title: 'Voice AI and Automation',
  topics: [
    'voice-ai',           // Voice AI & Telephony
    'ai-chatbots'         // AI Chatbots
  ],
  duration: '50 minutes',
  level: 'advanced'
}
```

### Creating Custom Paths

```typescript
// In knowledge base
POST /api/knowledge/learning-paths
{
  "pathId": "stripe-integration",
  "title": "Master Stripe Payments",
  "topics": [
    "payment-basics",
    "stripe-setup",
    "subscription-billing",
    "webhook-handling"
  ]
}

// SDK automatically makes it available
const paths = GatewayLearning.getLearningPaths();
// Now includes 'stripe-integration'
```

---

## Voice-Interactive Learning

### How Voice Works

```typescript
// 1. User speaks: "Can you explain Places API pricing?"

// 2. Gemini Live (Real-time voice API) processes speech
const response = await geminiLive.processVoice(audioBuffer);

// 3. AI instructor responds with voice
// Audio is streamed back through AudioContext
playAudioBuffer(response.audioBuffer);

// 4. Slide updates with relevant content
updateSlide({
  title: "Places API Pricing",
  content: response.text,
  imagePrompt: "Pricing tiers visualization"
});
```

### Voice Commands

Students can control the classroom with voice:

- **"Next slide"** - Advance to next topic
- **"Previous slide"** - Go back
- **"Repeat that"** - Re-narrate current slide
- **"Show quiz"** - Start the quiz
- **"Explain [concept]"** - Deep dive on specific topic
- **"Give me an example"** - Request practical example

---

## Quiz System

### AI-Generated Questions

```typescript
// Gemini generates quiz from lesson content
const quiz = await ai.generateQuiz({
  topic: lessonPlan.topic,
  content: lessonPlan.syllabus,
  difficulty: 'medium',
  count: 5
});

// Returns structured questions
[
  {
    id: 'q1',
    question: 'What is the primary benefit of Google Places API?',
    options: [
      'It\'s completely free',
      'Provides access to business listings and reviews',
      'Automatically creates websites',
      'Replaces the need for a website'
    ],
    correctAnswerIndex: 1,
    explanation: 'Google Places API provides access to millions...'
  },
  // ... 4 more questions
]
```

### Progress Tracking

```typescript
// Track quiz performance
const results = {
  userId: 'user-123',
  topicId: 'google-business',
  score: 4, // out of 5
  answers: [
    { questionId: 'q1', selectedIndex: 1, correct: true, timeSpent: 12 },
    { questionId: 'q2', selectedIndex: 0, correct: false, timeSpent: 8 },
    // ...
  ],
  completedAt: new Date()
};

// Save to database
await db.quizResults.create(results);

// Award certificate if passed
if (results.score >= 4) {
  await awardCertificate(userId, topicId);
}
```

---

## Embedding the SDK

### Basic Embed (Script Tag)

```html
<!-- Add to your website -->
<script
  src="https://gateway-global.ai/sdk/learning/gateway-learning.js"
  data-api-key="your-gemini-key"
  data-topic="google-business"
  data-auto-start="true"
></script>
```

### React Integration

```tsx
import { GatewayLearning } from '@gateway-global/learning-sdk';

function TrainingPage() {
  return (
    <div className="training">
      <GatewayLearning
        apiKey={process.env.GEMINI_API_KEY}
        topic="google-business"
        onLessonComplete={() => {
          // Award internal certification
          markTrainingComplete('google-business');
        }}
      />
    </div>
  );
}
```

### Customer Education Portal

```tsx
// Allow customers to learn your product
function CustomerEducation() {
  const [topics] = useState([
    { id: 'getting-started', name: 'Getting Started Guide' },
    { id: 'advanced-features', name: 'Advanced Features' },
    { id: 'integrations', name: 'Third-Party Integrations' }
  ]);

  return (
    <div>
      <h1>Learn How to Use Our Platform</h1>
      {topics.map(topic => (
        <button 
          key={topic.id}
          onClick={() => startLesson(topic.id)}
        >
          {topic.name}
        </button>
      ))}
    </div>
  );
}
```

---

## Knowledge Base API Reference

### Endpoints Used by Learning SDK

```typescript
// 1. Search knowledge entries
GET /api/knowledge?query=string&category=string&tags=string[]

// 2. Get by category
GET /api/knowledge/category/:category

// 3. Get popular topics
GET /api/knowledge/popular/:limit

// 4. Generate agent prompt
POST /api/knowledge/generate-prompt
{
  "topics": ["google_api", "places", "pricing"]
}
```

### Adding Custom Knowledge

```typescript
// Platform administrators can add knowledge
POST /api/knowledge
{
  "category": "platform_features",
  "subcategory": "reporting",
  "title": "Advanced Reporting Features",
  "content": "Your platform offers...",
  "tags": ["reports", "analytics", "dashboard"],
  "metadata": {
    "author": "admin",
    "lastUpdated": "2026-02-07",
    "difficulty": "advanced"
  }
}

// Automatically available in SDK
classroom.createLesson("Explain our reporting features");
// ✓ AI pulls from knowledge base
```

---

## Best Practices

### 1. Content Organization

```typescript
// Organize knowledge by hierarchy
knowledge/
  ├── google_api/
  │   ├── places/
  │   │   ├── pricing.md
  │   │   ├── quickstart.md
  │   │   └── best-practices.md
  │   └── workspace/
  │       ├── gmail.md
  │       └── calendar.md
  └── platform/
      ├── getting-started/
      └── advanced-features/
```

### 2. Keep Knowledge Current

```typescript
// Automated verification
async function verifyKnowledge() {
  const entries = await db.knowledge.findAll({
    where: { category: 'google_api' }
  });
  
  for (const entry of entries) {
    const daysSinceUpdate = daysBetween(
      entry.updatedAt, 
      new Date()
    );
    
    if (daysSinceUpdate > 90) {
      await notifyForReview(entry);
    }
  }
}
```

### 3. Track Learning Analytics

```typescript
// Monitor which topics are most valuable
const analytics = await db.learningAnalytics.aggregate({
  group: 'topicId',
  metrics: [
    'completionRate',
    'averageQuizScore',
    'timeToComplete',
    'certificatesAwarded'
  ]
});

// Focus on high-impact topics
// Update low-performing content
```

---

## Future Enhancements

### Planned Features

1. **Multi-Language Support**: Lessons in Spanish, French, etc.
2. **Adaptive Learning**: AI adjusts difficulty based on performance
3. **Collaborative Learning**: Group sessions and discussions
4. **Certificate Blockchain**: Verify certifications on-chain
5. **Custom Branding**: White-label the classroom UI
6. **Offline Mode**: Download lessons for offline learning
7. **Video Integration**: Mix AI-generated content with videos
8. **Gamification**: Points, badges, leaderboards

---

## Support & Resources

- **SDK Documentation**: [sdk/learning/README.md](../sdk/learning/README.md)
- **Knowledge Base Guide**: [docs/knowledge-base/README.md](../docs/knowledge-base/README.md)
- **API Reference**: [docs/API.md](../docs/API.md)
- **Examples**: [sdk/learning/examples/](../sdk/learning/examples/)

---

**Built with ❤️ by Gateway Global AI Team**
