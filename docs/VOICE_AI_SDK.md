# Voice AI Unified SDK

> **Critical Documentation**: This SDK directly affects voice quality, performance, and cost for all voice-based services. Essential for building MCP servers and avoiding common streaming mistakes.

A comprehensive SDK for integrating AI voice capabilities (TTS, STT, Real-time voice) with multiple providers through a unified interface. Includes Twilio integration for phone-based voice agents and an MCP server for deployment management.

## 📍 Location

The Voice AI SDK is located at: [`/sdk/voice-ai/`](/sdk/voice-ai/)

## 🎯 Key Benefits

- **Unified Interface:** Single API for multiple voice AI providers
- **Cost Optimization:** Built-in cost calculator - save up to **95%** on TTS costs
- **Streaming Support:** Real-time audio streaming via WebSocket
- **Twilio Integration:** Complete phone call handling with AI voice agents
- **MCP Server:** Deploy and manage voice AI resources via Model Context Protocol
- **TypeScript:** Full type safety and IntelliSense support
- **Examples Library:** Working code samples for all common use cases

## 💰 Cost Savings Opportunity

Switching from ElevenLabs to Inworld for TTS can reduce costs by **95%** while maintaining higher quality:

| Scenario | ElevenLabs | Inworld | Monthly Savings | Annual Savings |
|----------|------------|---------|-----------------|----------------|
| 10M chars/month | $2,060 | $100 | $1,960 | $23,520 |

## 🔧 Supported Providers

| Provider | TTS | STT | Realtime | Voice Cloning | Cost Efficiency |
|----------|-----|-----|----------|---------------|-----------------|
| **Inworld AI** | ✅ | ❌ | ❌ | ✅ | ⭐⭐⭐⭐⭐ Best TTS value |
| OpenAI | ✅ | ✅ | ✅ | ❌ | ⭐⭐⭐⭐ Good all-around |
| Google Gemini | ✅ | ✅ | ✅ | ❌ | ⭐⭐⭐ Mid-range |
| KIMI/Moonshot | ❌* | ❌* | ✅ | ❌ | ⭐⭐⭐⭐ Use hybrid |
| ElevenLabs | ✅ | ✅ | ❌ | ✅ | ⭐ Premium pricing |
| Deepgram | ✅ | ✅ | ✅ | ❌ | ⭐⭐⭐⭐ Best STT |

*KIMI doesn't have native TTS/STT - use hybrid approach with external providers

## 📊 Current Pricing (February 2026)

| Provider | TTS (per 1M chars) | STT (per minute) | Quality (ELO) |
|----------|-------------------|------------------|---------------|
| **Inworld** | **$10** (#1 value) | N/A | **1160** ⭐ |
| OpenAI | $15 | $0.006 | 1105 |
| Deepgram | $30 | $0.0077 | Good |
| ElevenLabs | $206 | $0.008 | 1108 |
| Cartesia | $47 | N/A | 1054 |

## 🚀 Quick Start

### Installation

```bash
cd sdk/voice-ai
npm install
```

### Basic Usage

```typescript
import { VoiceAI } from './sdk/voice-ai/src';

const voiceAI = new VoiceAI({
  defaultProvider: 'inworld',
  providers: {
    inworld: {
      provider: 'inworld',
      apiKey: process.env.INWORLD_API_KEY
    },
    deepgram: {
      provider: 'deepgram',
      apiKey: process.env.DEEPGRAM_API_KEY
    }
  }
});

await voiceAI.initialize();

// Synthesize speech
const result = await voiceAI.synthesize({
  text: 'Hello, world!'
});

// Save audio
fs.writeFileSync('output.mp3', result.audio);
```

### Cost Comparison

```typescript
// Compare TTS costs
const costs = voiceAI.compareCosts('tts', 10000); // 10k characters
console.log(costs);
// [
//   { provider: 'inworld', estimatedCost: 0.10 },
//   { provider: 'openai', estimatedCost: 0.15 },
//   { provider: 'elevenlabs', estimatedCost: 2.06 }
// ]

// Get most cost-effective provider
const cheapest = voiceAI.getMostCostEffective('tts', 10000);
console.log(cheapest.provider); // 'inworld'
```

## 📞 Twilio Integration

Build phone-based AI voice agents:

```typescript
import { TwilioVoiceServer } from './sdk/voice-ai/twilio-server';

const server = new TwilioVoiceServer({
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    webhookUrl: process.env.TWILIO_WEBHOOK_URL
  },
  ai: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o-realtime-preview-2024-12-17',
    voice: 'alloy'
  }
});

await server.start(3000);
```

## 🔌 MCP Server

Deploy and manage voice AI resources using the Model Context Protocol:

```bash
cd sdk/voice-ai
npm run start:mcp
```

**Available tools:**
- `deploy_voice_agent` - Deploy a new voice agent
- `estimate_costs` - Estimate monthly costs
- `compare_providers` - Compare provider pricing
- `clone_voice` - Clone a voice from audio samples

## 📚 Examples

Complete working examples are available in [`/sdk/voice-ai/examples/`](/sdk/voice-ai/examples/):

### Available Examples

1. **`basic-usage.ts`** - SDK fundamentals and initialization
2. **`streaming-tts.ts`** - Real-time audio streaming (critical for avoiding common mistakes)
3. **`realtime-voice.ts`** - Bidirectional voice conversations
4. **`twilio-integration.ts`** - Phone call handling
5. **`hybrid-kimi-tts.ts`** - Using KIMI with external TTS providers
6. **`cost-comparison.ts`** - Comprehensive cost analysis

### Running Examples

```bash
cd sdk/voice-ai

# Copy environment variables
cp .env.example .env
# Edit .env with your API keys

# Run an example
npx ts-node examples/basic-usage.ts
```

## 🏗️ Architecture Patterns

### Best-of-Breed Hybrid (Recommended)

```
Phone Call → Twilio → Deepgram STT → KIMI LLM → Inworld TTS → Twilio
```

**Cost:** ~$300/month for 10k minutes  
**Quality:** Best-in-class at each step  
**Best for:** Production deployments prioritizing quality and cost

### OpenAI Realtime (Simplest)

```
Phone Call → Twilio ↔ OpenAI Realtime API
```

**Cost:** ~$1500/month for 10k minutes  
**Quality:** Good, lowest latency  
**Best for:** Rapid prototyping, teams using OpenAI ecosystem

### Gemini Live (Google Stack)

```
Phone Call → Twilio ↔ Google Gemini Live API
```

**Cost:** ~$4000/month for 10k minutes  
**Quality:** Good, improving  
**Best for:** Teams heavily invested in Google Cloud

## ⚙️ Environment Variables

```bash
# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WEBHOOK_URL=https://your-url.ngrok.io

# AI Providers (add the ones you use)
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
KIMI_API_KEY=...
ELEVENLABS_API_KEY=...
DEEPGRAM_API_KEY=...
INWORLD_API_KEY=...
ASSEMBLYAI_API_KEY=...
```

## 📖 Additional Documentation

- **[Voice AI Research Report](VOICE_AI_RESEARCH.md)** - Comprehensive 582-line provider analysis with:
  - Detailed cost comparisons across 15+ providers
  - Quality benchmarks from independent testing
  - Integration patterns for Twilio and WebSocket streaming
  - Common mistakes and how to avoid them
  - SDK implementation details

- **[SDK README](/sdk/voice-ai/README.md)** - Complete SDK documentation

- **[Examples](/sdk/voice-ai/examples/)** - Working code samples

## ⚠️ Common Mistakes to Avoid

The examples in this SDK demonstrate best practices for:

1. **Streaming Audio** - Proper WebSocket handling and buffering
2. **Error Recovery** - Handling provider failures gracefully
3. **Cost Management** - Avoiding expensive providers when cheaper alternatives exist
4. **Latency Optimization** - Choosing the right architecture for your use case
5. **Voice Quality** - Selecting providers based on real ELO benchmarks

## 🎓 Learning Path

1. **Start here:** Read the [Voice AI Research Report](VOICE_AI_RESEARCH.md)
2. **Understand costs:** Review pricing tables and run `cost-comparison.ts`
3. **Basic implementation:** Try `basic-usage.ts`
4. **Streaming:** Study `streaming-tts.ts` to avoid common mistakes
5. **Production:** Review architecture patterns and choose one
6. **Deploy:** Use the MCP server for production deployment

## 🔗 Integration with Platform

This Voice AI SDK integrates with the Gateway Global AI Platform:

- **AI Biz Bot:** Powers voice interactions in SMS and web chat
- **Voice Concierge:** Provides TTS for website voice assistants  
- **VoiceLeadMachine:** Enables outbound calling campaigns
- **Twilio Telephony:** Handles all phone-based interactions

## 📝 Notes

- **Quality Benchmarks:** Based on Artificial Analysis Speech Arena (Feb 2026)
- **Pricing:** Current as of February 2026, verify before production use
- **Streaming Best Practices:** Examples include critical patterns for production
- **MCP Server:** Essential for deployment management and cost tracking

## 🆘 Support

For questions or issues:
- Review the comprehensive [Research Report](VOICE_AI_RESEARCH.md)
- Check the [examples](/sdk/voice-ai/examples/)
- Open an issue on GitHub

---

**Built with ❤️ for the voice AI community**
