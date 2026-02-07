/**
 * Basic Usage Example
 * Demonstrates core SDK functionality
 */

import { VoiceAI } from '../src/voice-ai-sdk';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  // Initialize SDK with multiple providers
  const voiceAI = new VoiceAI({
    defaultProvider: 'openai',
    providers: {
      openai: {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY || '',
        model: 'tts-1',
        voice: 'alloy'
      },
      inworld: {
        provider: 'inworld',
        apiKey: process.env.INWORLD_API_KEY || '',
        model: 'tts-1.5-max'
      },
      deepgram: {
        provider: 'deepgram',
        apiKey: process.env.DEEPGRAM_API_KEY || ''
      }
    }
  });

  await voiceAI.initialize();

  console.log('=== Voice AI SDK Basic Usage ===\n');

  // 1. Text-to-Speech
  console.log('1. Synthesizing speech with OpenAI...');
  const ttsResult = await voiceAI.synthesize({
    text: 'Hello! This is a test of the Voice AI SDK.',
    provider: 'openai',
    voice: 'alloy'
  });

  console.log(`   Audio duration: ${ttsResult.duration?.toFixed(2)}s`);
  console.log(`   Characters: ${ttsResult.charactersUsed}`);
  console.log(`   Cost: $${ttsResult.cost?.toFixed(6)}`);

  // Save audio file
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }
  fs.writeFileSync(path.join(outputDir, 'openai-tts.mp3'), ttsResult.audio);
  console.log('   Saved to: output/openai-tts.mp3\n');

  // 2. Compare TTS costs across providers
  console.log('2. Comparing TTS costs for 10,000 characters:');
  const costComparison = voiceAI.compareCosts('tts', 10000);
  costComparison.slice(0, 5).forEach((estimate, i) => {
    console.log(`   ${i + 1}. ${estimate.provider}: $${estimate.estimatedCost.toFixed(4)}`);
  });
  console.log();

  // 3. Get most cost-effective provider
  console.log('3. Most cost-effective TTS provider:');
  const cheapest = voiceAI.getMostCostEffective('tts', 10000);
  console.log(`   ${cheapest?.provider} at $${cheapest?.estimatedCost.toFixed(4)}\n`);

  // 4. Get provider capabilities
  console.log('4. Provider capabilities:');
  const providers = ['openai', 'inworld', 'deepgram'] as const;
  for (const provider of providers) {
    const caps = voiceAI.getCapabilities(provider);
    console.log(`   ${provider}:`);
    console.log(`     - TTS: ${caps.tts}, STT: ${caps.stt}, Realtime: ${caps.realtime}`);
    console.log(`     - Streaming: ${caps.streaming}, Voice Cloning: ${caps.voiceCloning}`);
    console.log(`     - Languages: ${caps.languages.length}`);
  }
  console.log();

  // 5. Calculate voice agent session cost
  console.log('5. Voice agent session cost estimate:');
  const sessionCost = voiceAI.calculateVoiceAgentSession(
    'deepgram',    // STT provider
    'inworld',     // TTS provider
    60,            // 60 minute session
    0.5,           // User talks 50% of time
    0.4            // Agent talks 40% of time
  );
  console.log(`   STT cost: $${sessionCost.stt.estimatedCost.toFixed(4)}`);
  console.log(`   TTS cost: $${sessionCost.tts.estimatedCost.toFixed(4)}`);
  console.log(`   Total: $${sessionCost.total.toFixed(4)}\n`);

  // 6. Monthly cost projection
  console.log('6. Monthly cost projection:');
  const monthly = voiceAI.projectMonthlyCost(
    100,           // 100 daily sessions
    5,             // 5 minutes average
    'deepgram',    // STT
    'inworld'      // TTS
  );
  console.log(`   Daily: $${monthly.daily}`);
  console.log(`   Monthly: $${monthly.monthly}`);
  console.log(`   Annual: $${monthly.annual}\n`);

  // Cleanup
  await voiceAI.dispose();
  console.log('Done!');
}

main().catch(console.error);
