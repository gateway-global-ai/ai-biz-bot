# Voice AI Unified SDK

A comprehensive SDK for integrating AI voice capabilities (TTS, STT, Real-time voice) with multiple providers through a unified interface. Includes Twilio integration for phone-based voice agents and an MCP server for deployment management.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Features

- **Unified Interface:** Single API for multiple voice AI providers
- **Cost Optimization:** Built-in cost calculator to find the best provider for your use case
- **Streaming Support:** Real-time audio streaming via WebSocket
- **Twilio Integration:** Complete phone call handling with AI voice agents
- **MCP Server:** Deploy and manage voice AI resources via Model Context Protocol
- **TypeScript:** Full type safety and IntelliSense support

## Supported Providers

| Provider | TTS | STT | Realtime | Voice Cloning |
|----------|-----|-----|----------|---------------|
| OpenAI | ✅ | ✅ | ✅ | ❌ |
| Google Gemini | ✅ | ✅ | ✅ | ❌ |
| KIMI/Moonshot | ❌* | ❌* | ✅ | ❌ |
| ElevenLabs | ✅ | ✅ | ❌ | ✅ |
| Deepgram | ✅ | ✅ | ✅ | ❌ |
| Inworld AI | ✅ | ❌ | ❌ | ✅ |

*KIMI doesn't have native TTS/STT - use hybrid approach with external providers

## Installation

```bash
npm install voice-ai-unified-sdk
```

## Quick Start

```typescript
import { VoiceAI } from 'voice-ai-unified-sdk';

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

## Cost Comparison

The SDK includes a built-in cost calculator to help you choose the most cost-effective provider:

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

### Current Pricing (February 2026)

| Provider | TTS (per 1M chars) | STT (per minute) | Quality (ELO) |
|----------|-------------------|------------------|---------------|
| **Inworld** | **$10** (#1 value) | N/A | **1160** |
| OpenAI | $15 | $0.006 | 1105 |
| Deepgram | $30 | $0.0077 | Good |
| ElevenLabs | $206 | $0.008 | 1108 |
| Cartesia | $47 | N/A | 1054 |

**Potential savings:** Switching from ElevenLabs to Inworld can save **95%** on TTS costs!

## Twilio Integration

Build phone-based AI voice agents:

```typescript
import { TwilioVoiceServer } from 'voice-ai-unified-sdk/twilio-server';

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

## MCP Server

Deploy and manage voice AI resources using the Model Context Protocol:

```bash
npm run start:mcp
```

Available tools:
- `deploy_voice_agent` - Deploy a new voice agent
- `estimate_costs` - Estimate monthly costs
- `compare_providers` - Compare provider pricing
- `clone_voice` - Clone a voice from audio samples

## Examples

See the `examples/` directory for complete working examples:

- `basic-usage.ts` - SDK fundamentals
- `streaming-tts.ts` - Real-time audio streaming
- `realtime-voice.ts` - Bidirectional voice conversations
- `twilio-integration.ts` - Phone call handling
- `hybrid-kimi-tts.ts` - Using KIMI with external TTS
- `cost-comparison.ts` - Comprehensive cost analysis

Run examples:

```bash
# Copy environment variables
cp .env.example .env
# Edit .env with your API keys

# Run an example
npx ts-node examples/basic-usage.ts
```

## Architecture

### Best-of-Breed Hybrid (Recommended)

```
Phone Call → Twilio → Deepgram STT → KIMI LLM → Inworld TTS → Twilio
```

**Cost:** ~$300/month for 10k minutes  
**Quality:** Best-in-class at each step

### OpenAI Realtime (Simplest)

```
Phone Call → Twilio ↔ OpenAI Realtime API
```

**Cost:** ~$1500/month for 10k minutes  
**Quality:** Good, lowest latency

## Environment Variables

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

## Documentation

- [Research Report](docs/RESEARCH_REPORT.md) - Comprehensive provider analysis
- [API Reference](docs/API.md) - Detailed SDK documentation
- [Examples](examples/) - Working code samples

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For questions or issues:
- Open an issue on GitHub
- Check the [Research Report](docs/RESEARCH_REPORT.md) for detailed analysis

---

**Built with ❤️ for the voice AI community**
