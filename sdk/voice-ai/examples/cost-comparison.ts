/**
 * Comprehensive Cost Comparison Example
 * Compares all voice AI providers across different usage scenarios
 */

import { CostCalculator } from '../src/utils/cost-calculator';

interface Scenario {
  name: string;
  description: string;
  dailySessions: number;
  avgSessionMinutes: number;
  userTalkRatio: number;
  agentTalkRatio: number;
}

const scenarios: Scenario[] = [
  {
    name: 'Small Business',
    description: 'Small customer support team',
    dailySessions: 50,
    avgSessionMinutes: 5,
    userTalkRatio: 0.5,
    agentTalkRatio: 0.4
  },
  {
    name: 'Growing Startup',
    description: 'Medium volume support',
    dailySessions: 200,
    avgSessionMinutes: 8,
    userTalkRatio: 0.5,
    agentTalkRatio: 0.4
  },
  {
    name: 'Enterprise',
    description: 'High volume call center',
    dailySessions: 1000,
    avgSessionMinutes: 10,
    userTalkRatio: 0.5,
    agentTalkRatio: 0.4
  },
  {
    name: 'AI Companion App',
    description: 'Long-form conversations',
    dailySessions: 500,
    avgSessionMinutes: 30,
    userTalkRatio: 0.5,
    agentTalkRatio: 0.45
  }
];

function formatCurrency(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return `$${amount.toFixed(2)}`;
}

function printComparisonTable(scenario: Scenario): void {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Scenario: ${scenario.name}`);
  console.log(`Description: ${scenario.description}`);
  console.log(`Usage: ${scenario.dailySessions} sessions/day, ${scenario.avgSessionMinutes} min avg`);
  console.log('='.repeat(80)});

  const workingDays = 22;
  const dailyMinutes = scenario.dailySessions * scenario.avgSessionMinutes;
  const monthlyMinutes = dailyMinutes * workingDays;
  
  const userTalkMinutes = monthlyMinutes * scenario.userTalkRatio;
  const agentTalkMinutes = monthlyMinutes * scenario.agentTalkRatio;
  const agentChars = agentTalkMinutes * 750; // ~750 chars/minute

  console.log(`\nMonthly Usage:`);
  console.log(`  Total minutes: ${monthlyMinutes.toLocaleString()}`);
  console.log(`  User speech: ${userTalkMinutes.toLocaleString()} minutes`);
  console.log(`  Agent speech: ${agentTalkMinutes.toLocaleString()} minutes (${agentChars.toLocaleString()} chars)`);

  // STT Comparison
  console.log(`\n--- STT Costs (per month) ---`);
  const sttProviders = ['deepgram', 'assemblyai', 'openai'] as const;
  const sttCosts = sttProviders.map(provider => {
    const estimate = CostCalculator.calculateSTTCost(provider, userTalkMinutes);
    return { provider, cost: estimate.estimatedCost };
  }).sort((a, b) => a.cost - b.cost);

  sttCosts.forEach(({ provider, cost }, i) => {
    const marker = i === 0 ? '★ BEST' : '';
    console.log(`  ${provider.padEnd(12)} ${formatCurrency(cost).padStart(8)}/mo ${marker}`);
  });

  // TTS Comparison
  console.log(`\n--- TTS Costs (per month) ---`);
  const ttsProviders = ['inworld', 'openai', 'deepgram', 'elevenlabs', 'cartesia'] as const;
  const ttsCosts = ttsProviders.map(provider => {
    try {
      const estimate = CostCalculator.calculateTTSCost(provider, agentChars);
      return { provider, cost: estimate.estimatedCost };
    } catch {
      return { provider, cost: Infinity };
    }
  }).sort((a, b) => a.cost - b.cost);

  ttsCosts.forEach(({ provider, cost }, i) => {
    if (cost === Infinity) return;
    const marker = i === 0 ? '★ BEST' : '';
    console.log(`  ${provider.padEnd(12)} ${formatCurrency(cost).padStart(8)}/mo ${marker}`);
  });

  // Recommended combinations
  console.log(`\n--- Recommended Combinations ---`);
  const bestSTT = sttCosts[0];
  const bestTTS = ttsCosts[0];
  const premiumTTS = ttsCosts.find(t => t.provider === 'elevenlabs') || ttsCosts[1];

  console.log(`  Budget (Best STT + Best TTS):`);
  console.log(`    ${bestSTT.provider} STT + ${bestTTS.provider} TTS = ${formatCurrency(bestSTT.cost + bestTTS.cost)}/mo`);

  console.log(`  Premium (Best STT + ElevenLabs):`);
  console.log(`    ${bestSTT.provider} STT + ${premiumTTS.provider} TTS = ${formatCurrency(bestSTT.cost + premiumTTS.cost)}/mo`);

  // LLM costs (rough estimate)
  const llmCost = (monthlyMinutes * 500 / 1000000) * 4; // ~$4 per 1M tokens
  console.log(`\n  Estimated LLM cost: ${formatCurrency(llmCost)}/mo`);
  console.log(`  Total estimated (Budget): ${formatCurrency(bestSTT.cost + bestTTS.cost + llmCost)}/mo`);
}

function printRealtimeComparison(): void {
  console.log(`\n${'='.repeat(80)}`);
  console.log('Real-time Voice API Comparison');
  console.log('='.repeat(80));

  const minutes = 1000; // 1000 minutes of conversation

  console.log(`\nCost for ${minutes} minutes of bidirectional audio:`);
  console.log('(Assuming 50% user speech, 50% agent speech)\n');

  const providers = [
    { name: 'openai', audioInRate: 0.06, audioOutRate: 0.24 },
    { name: 'gemini', audioInRate: 0.18, audioOutRate: 0.72 }
  ];

  providers.forEach(({ name, audioInRate, audioOutRate }) => {
    const audioInCost = (minutes * 0.5) * audioInRate;
    const audioOutCost = (minutes * 0.5) * audioOutRate;
    const total = audioInCost + audioOutCost;
    
    console.log(`  ${name.padEnd(10)} Audio In: ${formatCurrency(audioInCost)} | Audio Out: ${formatCurrency(audioOutCost)} | Total: ${formatCurrency(total)}`);
  });
}

function printSavingsAnalysis(): void {
  console.log(`\n${'='.repeat(80)}`);
  console.log('Potential Savings Analysis');
  console.log('='.repeat(80));

  // Compare expensive vs optimized setup
  const monthlyChars = 10000000; // 10M characters
  const monthlyMinutes = 10000;  // ~10k minutes of speech

  const expensiveTTS = CostCalculator.calculateTTSCost('elevenlabs', monthlyChars);
  const optimizedTTS = CostCalculator.calculateTTSCost('inworld', monthlyChars);
  
  const expensiveSTT = CostCalculator.calculateSTTCost('openai', monthlyMinutes);
  const optimizedSTT = CostCalculator.calculateSTTCost('assemblyai', monthlyMinutes);

  console.log(`\nMonthly usage: 10M TTS chars, 10k STT minutes\n`);

  console.log('TTS:');
  console.log(`  ElevenLabs: ${formatCurrency(expensiveTTS.estimatedCost)}`);
  console.log(`  Inworld:    ${formatCurrency(optimizedTTS.estimatedCost)}`);
  console.log(`  Savings:    ${formatCurrency(expensiveTTS.estimatedCost - optimizedTTS.estimatedCost)} (${((1 - optimizedTTS.estimatedCost / expensiveTTS.estimatedCost) * 100).toFixed(0)}%)`);

  console.log('\nSTT:');
  console.log(`  OpenAI:    ${formatCurrency(expensiveSTT.estimatedCost)}`);
  console.log(`  AssemblyAI: ${formatCurrency(optimizedSTT.estimatedCost)}`);
  console.log(`  Savings:    ${formatCurrency(expensiveSTT.estimatedCost - optimizedSTT.estimatedCost)} (${((1 - optimizedSTT.estimatedCost / expensiveSTT.estimatedCost) * 100).toFixed(0)}%)`);

  const totalExpensive = expensiveTTS.estimatedCost + expensiveSTT.estimatedCost;
  const totalOptimized = optimizedTTS.estimatedCost + optimizedSTT.estimatedCost;
  
  console.log('\nTotal Monthly:');
  console.log(`  Expensive setup: ${formatCurrency(totalExpensive)}`);
  console.log(`  Optimized setup: ${formatCurrency(totalOptimized)}`);
  console.log(`  Monthly savings: ${formatCurrency(totalExpensive - totalOptimized)}`);
  console.log(`  Annual savings:  ${formatCurrency((totalExpensive - totalOptimized) * 12)}`);
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║           VOICE AI PROVIDER COST COMPARISON (February 2026)                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

  // Print scenario comparisons
  for (const scenario of scenarios) {
    printComparisonTable(scenario);
  }

  // Print realtime comparison
  printRealtimeComparison();

  // Print savings analysis
  printSavingsAnalysis();

  // Summary recommendations
  console.log(`\n${'='.repeat(80)}`);
  console.log('Summary Recommendations');
  console.log('='.repeat(80));
  console.log(`
1. BEST OVERALL VALUE: Inworld TTS + Deepgram STT
   - Inworld: #1 quality ranking at $10/M chars (20x cheaper than ElevenLabs)
   - Deepgram: Best accuracy at $0.0077/min streaming

2. BEST FOR REAL-TIME: OpenAI Realtime API
   - End-to-end voice at $0.06/min in, $0.24/min out
   - Simpler architecture, no separate STT/TTS needed

3. BEST FOR VOICE CLONING: ElevenLabs
   - Best voice cloning quality
   - Use only if voice cloning is critical (20x more expensive)

4. BEST FOR GOOGLE ECOSYSTEM: Gemini Live API
   - Native audio I/O
   - Higher cost but integrates well with GCP

5. BUDGET OPTION: Deepgram (unified STT+TTS)
   - Single provider for both
   - Good quality at reasonable price
`);

  console.log('Data sources: Official provider pricing, Artificial Analysis Speech Arena (Jan 2026)');
  console.log('Note: Prices may vary. Always check latest pricing before making decisions.\n');
}

main().catch(console.error);
