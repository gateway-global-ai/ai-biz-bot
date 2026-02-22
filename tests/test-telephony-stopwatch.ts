/**
 * M3 Telephony Core: Stopwatch & Billing Unit Tests
 *
 * Tests the call-start/call-end stopwatch logic in VoiceSessionManager and
 * the round-up billing calculation in the energy monitor.
 *
 * Run with: node_modules/.bin/tsx tests/test-telephony-stopwatch.ts
 */

import { roundUpToMinute } from '../server/services/energy-monitor.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}`);
    failed++;
  }
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  assert(actual === expected, `${label} (expected ${expected}, got ${actual})`);
}

// ── Test 1: roundUpToMinute ──────────────────────────────────────────────────

console.log('\n⏱  Test 1: roundUpToMinute billing calculation');
assertEqual(roundUpToMinute(0), 0, '0 seconds → 0 minutes');
assertEqual(roundUpToMinute(-5), 0, 'negative seconds → 0 minutes');
assertEqual(roundUpToMinute(1), 1, '1 second → 1 minute (ceiling)');
assertEqual(roundUpToMinute(59), 1, '59 seconds → 1 minute (ceiling)');
assertEqual(roundUpToMinute(60), 1, '60 seconds → 1 minute (exact)');
assertEqual(roundUpToMinute(61), 2, '61 seconds → 2 minutes (ceiling)');
assertEqual(roundUpToMinute(120), 2, '120 seconds → 2 minutes (exact)');
assertEqual(roundUpToMinute(121), 3, '121 seconds → 3 minutes (ceiling)');

// ── Test 2: VoiceSessionManager stopwatch ───────────────────────────────────

console.log('\n⏱  Test 2: VoiceSessionManager stopwatch');

// Use dynamic import because the session manager has side-effects (setInterval)
const { voiceSessionManager } = await import('../server/voiceSession.js');

const testCallSid = `test-${Date.now()}`;
voiceSessionManager.createSession(testCallSid, 'Test Agent', 'helpful', 'site-abc');

const sessionBefore = voiceSessionManager.getSession(testCallSid)!;
assert(sessionBefore.callStart === null, 'callStart is null before startCall()');
assert(sessionBefore.callEnd === null, 'callEnd is null before stopCall()');
assert(sessionBefore.actualSeconds === null, 'actualSeconds is null before stopCall()');
assert(sessionBefore.siteConfigId === 'site-abc', 'siteConfigId stored correctly');

voiceSessionManager.startCall(testCallSid);
const sessionAfterStart = voiceSessionManager.getSession(testCallSid)!;
assert(sessionAfterStart.callStart instanceof Date, 'callStart is a Date after startCall()');
assert(sessionAfterStart.callStart !== null && sessionAfterStart.callStart.getTime() <= Date.now(), 'callStart ≤ now');

// Simulate a brief pause so actualSeconds is non-negative
await new Promise<void>((resolve) => setTimeout(resolve, 50));

const elapsed = voiceSessionManager.stopCall(testCallSid);
const sessionAfterStop = voiceSessionManager.getSession(testCallSid)!;
assert(sessionAfterStop.callEnd instanceof Date, 'callEnd is a Date after stopCall()');
assert(typeof elapsed === 'number' && elapsed >= 0, `stopCall() returns non-negative number (got ${elapsed})`);
assertEqual(sessionAfterStop.actualSeconds, elapsed, 'actualSeconds matches stopCall() return value');
assert(
  sessionAfterStop.callEnd !== null &&
  sessionAfterStop.callStart !== null &&
  sessionAfterStop.callEnd.getTime() >= sessionAfterStop.callStart.getTime(),
  'callEnd >= callStart'
);

// Calling startCall() again on an already-started session should be a no-op
const existingStart = sessionAfterStart.callStart!.getTime();
voiceSessionManager.startCall(testCallSid);
const sessionAfterRestart = voiceSessionManager.getSession(testCallSid)!;
assert(
  sessionAfterRestart.callStart !== null &&
  sessionAfterRestart.callStart.getTime() === existingStart,
  'startCall() is idempotent (does not overwrite existing callStart)'
);

// Cleanup – calling destroy() stops the internal setInterval so the test
// process can exit cleanly without waiting for the next GC tick.
voiceSessionManager.deleteSession(testCallSid);
voiceSessionManager.destroy();

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
