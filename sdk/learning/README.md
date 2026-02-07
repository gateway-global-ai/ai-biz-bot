# Gateway Learning SDK

**AI-powered immersive virtual classroom for micro-learning experiences.**

An innovative SDK that brings interactive, voice-enabled learning experiences directly into your application. The first learning SDK integrated into a business platform, designed specifically for small business owners to learn about Google Business APIs, Gateway SDKs, and business automation tools.

![Gateway Learning SDK](https://img.shields.io/badge/Learning-SDK-blue)
![AI Powered](https://img.shields.io/badge/AI-Powered-green)
![Voice Enabled](https://img.shields.io/badge/Voice-Enabled-orange)

---

## 🌟 Why This Is Innovative

This is the **first immersive learning SDK** built into a business platform. It combines:

- 🎓 **AI-Generated Curriculum** - Lessons created dynamically by Gemini AI
- 🎙️ **Voice-Interactive Learning** - Natural conversation with AI instructor
- 🎯 **Knowledge Base Integration** - Pre-built lessons from Gateway's knowledge library
- 📊 **Interactive Quizzes** - Test comprehension with AI-generated questions
- 🎨 **Cinematic UI** - Futuristic, immersive classroom environment
- 📱 **Micro-Learning Focus** - Bite-sized lessons for busy entrepreneurs

Perfect for creating immersive educational experiences about:
- Google Business APIs (Places, Maps, Business Profile)
- Gateway SDKs (Chat, Voice AI, Learning)
- Small business automation and tools
- Any custom topic you want to teach

---

## 🚀 Quick Start

### Script Tag (Simplest)

```html
<script
  src="https://your-gateway.com/sdk/gateway-learning.js"
  data-api-key="your-gemini-api-key"
  data-topic="google-business"
  data-auto-start="true"
></script>
```

### NPM Package

```bash
npm install @gateway-global/learning-sdk
```

```typescript
import { GatewayLearning } from '@gateway-global/learning-sdk';

const classroom = GatewayLearning.init({
  apiKey: 'your-gemini-api-key',
  topic: 'google-business',
  container: document.getElementById('app'),
  onLessonStart: (plan) => console.log('Started:', plan.topic),
  onLessonComplete: () => console.log('Completed!')
});
```

---

## 📚 Pre-Built Knowledge Topics

The SDK includes pre-built lessons integrated with Gateway's knowledge base:

### Available Topics

| Topic ID | Name | Description |
|----------|------|-------------|
| `google-business` | Google Business APIs | Master Places, Business Profile, and Maps APIs |
| `google-workspace` | Google Workspace Integration | Learn Gmail, Calendar, Drive, and Docs integration |
| `ai-chatbots` | AI Chatbots for Business | Build AI-powered customer service bots |
| `voice-ai` | Voice AI and Telephony | Implement voice assistants and phone automation |
| `website-generation` | 30-Second AI Websites | Create professional websites instantly |
| `gateway-sdk` | Gateway Global AI SDK | Master the Chat, Voice AI, and Learning SDKs |

### Learning Paths

**Getting Started Path**
```typescript
const path = GatewayLearning.getLearningPaths()['getting-started'];
// Topics: Website Generation → AI Chatbots → Gateway SDK
```

**Google Integration Path**
```typescript
const path = GatewayLearning.getLearningPaths()['google-integration'];
// Topics: Google Business → Google Workspace
```

**Voice Automation Path**
```typescript
const path = GatewayLearning.getLearningPaths()['voice-automation'];
// Topics: Voice AI → AI Chatbots
```

---

## 🎯 Usage Examples

### 1. Start with a Knowledge Topic

```typescript
import { GatewayLearning } from '@gateway-global/learning-sdk';

// Initialize with Google Business APIs topic
const classroom = GatewayLearning.init({
  apiKey: process.env.GEMINI_API_KEY,
  topic: 'google-business',
  autoStart: true
});
```

### 2. Create Custom Lessons

```typescript
const classroom = GatewayLearning.init({
  apiKey: process.env.GEMINI_API_KEY,
  customTopic: 'How to integrate Stripe payments for small businesses',
  autoStart: true
});
```

### 3. Let Users Choose Topics

```typescript
// Show chat interface for user to request topics
const classroom = GatewayLearning.init({
  apiKey: process.env.GEMINI_API_KEY,
  autoStart: false  // Shows chat interface first
});

// User types: "Teach me about Google Places API"
// AI generates and launches lesson automatically
```

### 4. Programmatic Control

```typescript
const classroom = GatewayLearning.init({
  apiKey: process.env.GEMINI_API_KEY,
  container: document.getElementById('classroom'),
  onLessonStart: (plan) => {
    console.log('Starting:', plan.topic);
    analytics.track('lesson_started', { topic: plan.topic });
  },
  onLessonComplete: () => {
    console.log('Lesson completed!');
    showCertificate();
  }
});

// Start a specific topic
await classroom.startKnowledgeTopic('gateway-sdk');

// Or create custom lesson
await classroom.createLesson('Advanced Google Workspace automation');

// Get current lesson
const current = classroom.getCurrentLesson();

// End lesson
classroom.endLesson();
```

---

## 🎨 Features

### Immersive Classroom Interface

- **Futuristic UI**: Cinematic tech-inspired design with animated backgrounds
- **Dynamic Slides**: AI-generated content with code examples, diagrams, and images
- **Table of Contents**: Track progress through the syllabus
- **Visual Aids**: AI-generated images and diagrams for each concept

### Voice-Interactive Learning

- **AI Instructor Voice**: Natural conversation with Gemini Live
- **Voice Navigation**: Control slides with voice commands
- **Audio Visualizer**: Real-time visualization of instructor speech
- **Narration Mode**: Read slide content aloud

### Interactive Quizzes

- **AI-Generated Questions**: 5 multiple-choice questions per lesson
- **Instant Feedback**: Explanations for correct and incorrect answers
- **Progress Tracking**: Track quiz performance

### Knowledge Base Integration

- **Pre-Built Lessons**: Curated content about Google APIs and Gateway tools
- **Learning Paths**: Structured multi-lesson journeys
- **Real-World Examples**: Practical use cases for small businesses
- **Best Practices**: Industry-standard recommendations

---

## 📖 API Reference

### `GatewayLearning.init(config)`

Initialize the learning SDK.

**Config Options:**

```typescript
interface GatewayLearningConfig {
  apiKey: string;              // Required: Gemini API key
  container?: HTMLElement;     // Optional: Container (default: creates fullscreen)
  topic?: string;              // Optional: Pre-built topic ID
  customTopic?: string;        // Optional: Custom lesson topic
  autoStart?: boolean;         // Optional: Start immediately (default: false)
  theme?: {
    primaryColor?: string;     // Optional: Brand color
    accentColor?: string;      // Optional: Accent color
  };
  onLessonStart?: (plan: LessonPlan) => void;
  onLessonComplete?: () => void;
  onError?: (error: Error) => void;
}
```

### Instance Methods

```typescript
// Show chat interface for topic selection
classroom.showChatInterface();

// Start a knowledge base topic
await classroom.startKnowledgeTopic(topicId: string);

// Create custom lesson
await classroom.createLesson(topic: string);

// End current lesson
classroom.endLesson();

// Get current lesson plan
const plan = classroom.getCurrentLesson();

// Cleanup
classroom.destroy();
```

### Static Methods

```typescript
// Get available knowledge topics
const topics = GatewayLearning.getAvailableTopics();

// Get learning paths
const paths = GatewayLearning.getLearningPaths();
```

---

## 🎓 Lesson Structure

Each lesson follows the proven "5 Ws + Summary" structure:

1. **Why** - The Hook: Real-world utility and value proposition
2. **Who** - Key Players: Important entities, tools, or services
3. **What** - Core Concepts: Fundamental mechanics and features
4. **Where** - Applications: Context and use cases
5. **When** - Implementation: Timing and strategy
6. **Conclusion** - Summary: Recap and next steps

Plus:
- **Interactive Quiz**: 5 multiple-choice questions
- **Visual Aids**: AI-generated images and diagrams
- **Code Examples**: Real implementation snippets
- **Best Practices**: Industry recommendations

---

## 🌐 Integration with Knowledge Base

The SDK integrates directly with Gateway's knowledge base API:

```typescript
// The SDK automatically fetches content from:
GET /api/knowledge?category=google_api&tags=places,pricing

// Transforms it into interactive lessons
// No manual content creation needed!
```

### Adding Custom Knowledge

```typescript
// In your Gateway platform, add knowledge entries:
POST /api/knowledge
{
  "category": "business_tools",
  "subcategory": "automation",
  "title": "Zapier Integration Guide",
  "content": "...",
  "tags": ["automation", "zapier", "integration"]
}

// Then create a lesson:
classroom.createLesson("How to automate my business with Zapier");
// AI pulls from knowledge base automatically!
```

---

## 🎯 Use Cases

### 1. Customer Education Platform

```typescript
// Teach customers how to use your product
const classroom = GatewayLearning.init({
  apiKey: GEMINI_KEY,
  customTopic: 'Getting started with our CRM platform',
  container: document.getElementById('help-center')
});
```

### 2. Employee Onboarding

```typescript
// Train new hires on company tools
const topics = [
  'google-workspace',  // How we use Google Workspace
  'ai-chatbots',       // Our customer service tools
  'voice-ai'           // Phone system training
];

for (const topic of topics) {
  await classroom.startKnowledgeTopic(topic);
}
```

### 3. Sales Training

```typescript
// Teach sales team about new features
classroom.createLesson('New AI features in our platform');
```

### 4. Documentation Replacement

```typescript
// Replace boring docs with interactive lessons
<script
  src="gateway-learning.js"
  data-api-key="key"
  data-topic="gateway-sdk"
></script>
```

---

## 🔧 Advanced Usage

### Custom Theming

```typescript
const classroom = GatewayLearning.init({
  apiKey: GEMINI_KEY,
  theme: {
    primaryColor: '#6366f1',  // Indigo
    accentColor: '#22d3ee'    // Cyan
  }
});
```

### Tracking Progress

```typescript
const classroom = GatewayLearning.init({
  apiKey: GEMINI_KEY,
  onLessonStart: (plan) => {
    // Save to database
    await db.learningProgress.create({
      userId: currentUser.id,
      topic: plan.topic,
      startedAt: new Date()
    });
  },
  onLessonComplete: () => {
    // Award certificate
    await db.certificates.create({
      userId: currentUser.id,
      topic: classroom.getCurrentLesson()?.topic
    });
  }
});
```

### Multi-Lesson Workflows

```typescript
async function learningPath(topics: string[]) {
  for (const topic of topics) {
    await new Promise(resolve => {
      const classroom = GatewayLearning.init({
        apiKey: GEMINI_KEY,
        topic,
        autoStart: true,
        onLessonComplete: resolve
      });
    });
  }
  console.log('Learning path completed!');
}

learningPath(['google-business', 'google-workspace', 'ai-chatbots']);
```

---

## 🎬 Demo

Visit the [live demo](https://your-gateway.com/sdk/learning/demo) to see the SDK in action.

---

## 🎙️ Audio Quality & Configuration

The Learning SDK uses Google's Gemini Live API for high-quality, real-time voice interaction:

### Audio Specifications
- **AI Instructor Voice**: 24kHz PCM16 mono (~384 kbps)
- **Student Microphone**: 16kHz PCM16 mono (~256 kbps)
- **Latency**: <200ms typical end-to-end
- **Processing**: Echo cancellation, noise suppression, auto-gain control

### Browser Requirements
- Modern browser with Web Audio API support
- Microphone access for voice interaction
- Stable internet connection (recommended: >1 Mbps)

### Audio Features
- ✅ Crystal-clear AI instructor voice
- ✅ Real-time voice visualization
- ✅ Background noise reduction
- ✅ Automatic gain control
- ✅ Echo cancellation
- ✅ Low-latency streaming

For detailed audio configuration and troubleshooting, see [AUDIO_CONFIG.md](./AUDIO_CONFIG.md).

---

## 📦 What's Included

```
sdk/learning/
├── src/
│   ├── components/
│   │   ├── ClassroomInterface.tsx    # Main classroom UI
│   │   ├── ChatInterface.tsx         # Lesson selection chat
│   │   ├── QuizView.tsx              # Interactive quiz
│   │   └── AudioVisualizer.tsx       # Voice visualization
│   ├── services/
│   │   ├── geminiService.ts          # AI lesson generation
│   │   ├── knowledgeAdapter.ts       # Knowledge base integration
│   │   └── audioUtils.ts             # Audio processing
│   ├── types/
│   │   └── index.ts                  # TypeScript definitions
│   └── index.ts                      # Main SDK export
├── examples/
│   ├── basic.html                    # Simple script tag usage
│   ├── react.tsx                     # React integration
│   └── advanced.tsx                  # Advanced features
├── AUDIO_CONFIG.md                   # Audio configuration docs
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🤝 Contributing

We welcome contributions! This SDK is part of the Gateway Global AI platform.

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

---

## 📄 License

MIT License - See [LICENSE](../../LICENSE) for details.

---

## 🔗 Related SDKs

- **[Chat SDK](../chat)** - Embeddable AI chatbot widget
- **[Voice AI SDK](../voice-ai)** - Multi-provider voice integration

---

## 📞 Support

- **Documentation**: [docs.gateway-global.ai](https://docs.gateway-global.ai)
- **Issues**: [GitHub Issues](https://github.com/gateway-global-ai/chat-mvp-merge/issues)
- **Email**: support@gateway-global.ai

---

**Built with ❤️ by Gateway Global AI**

*Removing all friction from getting online with the latest AI tools.*
