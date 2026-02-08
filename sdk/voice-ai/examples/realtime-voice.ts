/**
 * Real-time Voice Conversation Example
 * Demonstrates bidirectional audio streaming with AI
 */

import { VoiceAI } from '../src/voice-ai-sdk';
import * as readline from 'readline';

async function main() {
  const voiceAI = new VoiceAI({
    defaultProvider: 'openai',
    providers: {
      openai: {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY || '',
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'alloy'
      },
      gemini: {
        provider: 'gemini',
        apiKey: process.env.GEMINI_API_KEY || '',
        model: 'gemini-2.5-flash-native-audio-preview'
      }
    }
  });

  await voiceAI.initialize();

  console.log('=== Real-time Voice Conversation ===\n');
  console.log('This example demonstrates a text-based simulation of real-time voice.');
  console.log('In production, you would stream actual audio data.\n');

  // Connect to OpenAI Realtime API
  console.log('Connecting to OpenAI Realtime API...');
  
  const connection = await voiceAI.connectRealtime({
    provider: 'openai',
    systemPrompt: 'You are a helpful voice assistant. Keep responses concise and conversational.',
    voice: 'alloy',
    onConnect: () => {
      console.log('Connected! You can now send messages.\n');
    },
    onUserTranscript: (text) => {
      console.log(`\n[You] ${text}`);
    },
    onAgentTranscript: (text) => {
      process.stdout.write(`[AI] ${text}`);
    },
    onAudioChunk: (chunk) => {
      // In production, this would play audio
      // For demo, we just count bytes
      process.stdout.write('.');
    },
    onError: (error) => {
      console.error('\n[Error]', error.message);
    },
    onDisconnect: () => {
      console.log('\n[Disconnected]');
    },
    tools: [
      {
        name: 'get_weather',
        description: 'Get the current weather for a location',
        parameters: {
          type: 'object',
          properties: {
            location: { type: 'string', description: 'City name' }
          },
          required: ['location']
        },
        handler: async (params) => {
          // Mock weather data
          return {
            location: params.location,
            temperature: 72,
            condition: 'sunny',
            unit: 'F'
          };
        }
      }
    ]
  });

  // Simple CLI interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('Type messages and press Enter. Type "exit" to quit.\n');

  const askQuestion = () => {
    rl.question('> ', async (input) => {
      if (input.toLowerCase() === 'exit') {
        await connection.disconnect();
        rl.close();
        await voiceAI.dispose();
        return;
      }

      // Send text message (in production, this would be transcribed speech)
      await connection.sendText(input);
      
      // Wait a bit for response (in production, audio would stream in real-time)
      setTimeout(askQuestion, 2000);
    });
  };

  askQuestion();
}

main().catch(console.error);
