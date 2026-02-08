/**
 * Hybrid KIMI + External TTS Example
 * Demonstrates using KIMI for LLM with external TTS providers
 * This is the recommended approach since KIMI doesn't have native TTS
 */

import { KimiVoiceProvider } from '../src/providers/kimi-provider';
import { OpenAIVoiceProvider } from '../src/providers/openai-provider';
import { InworldProvider } from '../src/providers/inworld-provider';
import { VoiceConfig } from '../src/types';

/**
 * Hybrid Voice Agent using KIMI for LLM + External TTS
 * 
 * Architecture:
 * 1. User speech → STT (Deepgram/AssemblyAI)
 * 2. Transcript → KIMI LLM
 * 3. LLM response → TTS (Inworld/OpenAI)
 * 4. Audio → User
 */
class HybridKimiVoiceAgent {
  private kimi: KimiVoiceProvider;
  private ttsProvider: OpenAIVoiceProvider | InworldProvider;
  private conversationHistory: Array<{role: 'user' | 'assistant'; content: string}> = [];

  constructor(
    kimiConfig: VoiceConfig,
    ttsConfig: VoiceConfig
  ) {
    this.kimi = new KimiVoiceProvider();
    
    if (ttsConfig.provider === 'openai') {
      this.ttsProvider = new OpenAIVoiceProvider();
    } else if (ttsConfig.provider === 'inworld') {
      this.ttsProvider = new InworldProvider();
    } else {
      throw new Error(`Unsupported TTS provider: ${ttsConfig.provider}`);
    }
  }

  async initialize(): Promise<void> {
    await this.kimi.initialize(this.kimi.config);
    await this.ttsProvider.initialize(this.ttsProvider.config);
  }

  /**
   * Process user input and generate voice response
   */
  async processInput(
    userText: string,
    onAudioChunk: (chunk: Buffer) => void
  ): Promise<void> {
    // Add user message to history
    this.conversationHistory.push({ role: 'user', content: userText });

    // Get LLM response from KIMI (streaming)
    let fullResponse = '';
    
    console.log('[KIMI] Generating response...');
    
    await this.kimi.generateTextStreaming(
      [
        { role: 'system', content: 'You are a helpful assistant. Keep responses concise.' },
        ...this.conversationHistory
      ],
      (chunk) => {
        fullResponse += chunk;
        process.stdout.write(chunk);
      }
    );

    console.log('\n');

    // Add assistant response to history
    this.conversationHistory.push({ role: 'assistant', content: fullResponse });

    // Stream TTS response
    console.log('[TTS] Synthesizing speech...');
    
    await this.ttsProvider.synthesizeStreaming({
      text: fullResponse,
      onAudioChunk,
      onComplete: () => {
        console.log('[TTS] Complete');
      },
      onError: (error) => {
        console.error('[TTS] Error:', error.message);
      }
    });
  }

  /**
   * Estimate cost for a session
   */
  estimateSessionCost(sessionMinutes: number): {
    kimi: number;
    tts: number;
    total: number;
  } {
    // KIMI: ~$0.60/M input tokens, $2.50/M output tokens
    // Assume 500 tokens/min
    const kimiCost = (sessionMinutes * 500 / 1000000) * (0.60 + 2.50);

    // TTS: varies by provider
    const charsPerMinute = 750 * 0.4; // Agent talks 40% of time
    const ttsCost = sessionMinutes * charsPerMinute * 0.00001; // Inworld rate

    return {
      kimi: Math.round(kimiCost * 100) / 100,
      tts: Math.round(ttsCost * 100) / 100,
      total: Math.round((kimiCost + ttsCost) * 100) / 100
    };
  }

  async dispose(): Promise<void> {
    await this.kimi.dispose();
    await this.ttsProvider.dispose();
  }
}

async function main() {
  console.log('=== Hybrid KIMI + External TTS Example ===\n');

  // Check environment variables
  if (!process.env.KIMI_API_KEY) {
    console.error('Please set KIMI_API_KEY environment variable');
    process.exit(1);
  }

  if (!process.env.INWORLD_API_KEY && !process.env.OPENAI_API_KEY) {
    console.error('Please set INWORLD_API_KEY or OPENAI_API_KEY environment variable');
    process.exit(1);
  }

  // Create hybrid agent
  const agent = new HybridKimiVoiceAgent(
    {
      provider: 'kimi',
      apiKey: process.env.KIMI_API_KEY,
      model: 'kimi-k2-0905'
    },
    {
      provider: process.env.INWORLD_API_KEY ? 'inworld' : 'openai',
      apiKey: process.env.INWORLD_API_KEY || process.env.OPENAI_API_KEY!,
      model: process.env.INWORLD_API_KEY ? 'tts-1.5-max' : 'tts-1'
    }
  );

  await agent.initialize();

  console.log('Hybrid agent initialized!');
  console.log(`TTS Provider: ${process.env.INWORLD_API_KEY ? 'Inworld' : 'OpenAI'}`);
  
  // Show cost estimate
  const cost = agent.estimateSessionCost(10); // 10 minute session
  console.log('\nEstimated cost for 10-minute session:');
  console.log(`  KIMI LLM: $${cost.kimi}`);
  console.log(`  TTS: $${cost.tts}`);
  console.log(`  Total: $${cost.total}\n`);

  // Simulate conversation
  const testInputs = [
    'Hello! Can you tell me about yourself?',
    'What can you help me with?',
    'Thank you, goodbye!'
  ];

  for (const input of testInputs) {
    console.log(`\n[User] ${input}`);
    
    const audioChunks: Buffer[] = [];
    
    await agent.processInput(input, (chunk) => {
      audioChunks.push(chunk);
    });

    console.log(`[System] Received ${audioChunks.length} audio chunks (${Buffer.concat(audioChunks).length} bytes)`);
  }

  await agent.dispose();
  console.log('\nDone!');
}

main().catch(console.error);
