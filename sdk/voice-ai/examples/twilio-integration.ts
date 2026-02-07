/**
 * Twilio Voice Integration Example
 * Shows how to set up a complete voice agent with Twilio
 */

import { TwilioVoiceServer } from '../twilio-server';

/**
 * Environment variables needed:
 * - TWILIO_ACCOUNT_SID
 * - TWILIO_AUTH_TOKEN
 * - TWILIO_PHONE_NUMBER
 * - TWILIO_WEBHOOK_URL (your public URL, e.g., from ngrok)
 * - AI_PROVIDER (openai, gemini, etc.)
 * - AI_API_KEY
 * - AI_MODEL (optional)
 * - AI_VOICE (optional)
 */

async function main() {
  console.log('=== Twilio Voice AI Integration ===\n');

  // Validate environment
  const requiredEnv = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER',
    'AI_API_KEY'
  ];

  const missing = requiredEnv.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error('Missing required environment variables:');
    missing.forEach(key => console.error(`  - ${key}`));
    console.error('\nPlease set these variables and try again.');
    process.exit(1);
  }

  // Create and start server
  const server = new TwilioVoiceServer({
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID!,
      authToken: process.env.TWILIO_AUTH_TOKEN!,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER!,
      webhookUrl: process.env.TWILIO_WEBHOOK_URL || `http://localhost:${process.env.PORT || 3000}`
    },
    ai: {
      provider: (process.env.AI_PROVIDER as any) || 'openai',
      apiKey: process.env.AI_API_KEY!,
      model: process.env.AI_MODEL,
      voice: process.env.AI_VOICE
    }
  });

  const PORT = parseInt(process.env.PORT || '3000');
  
  console.log('Starting server...');
  console.log(`Provider: ${process.env.AI_PROVIDER || 'openai'}`);
  console.log(`Port: ${PORT}\n`);

  await server.start(PORT);

  console.log('\nServer is running!');
  console.log(`Webhook URL: ${process.env.TWILIO_WEBHOOK_URL || `http://localhost:${PORT}`}`);
  console.log('\nTo test:');
  console.log('1. Configure your Twilio phone number webhook to point to:');
  console.log(`   ${process.env.TWILIO_WEBHOOK_URL || `http://localhost:${PORT}`}/voice/incoming`);
  console.log('2. Call your Twilio number');
  console.log('3. Speak with the AI assistant!\n');

  console.log('Press Ctrl+C to stop\n');

  // Keep process alive
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await server.stop();
    process.exit(0);
  });
}

main().catch(console.error);
