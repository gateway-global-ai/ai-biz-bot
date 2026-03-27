/**
 * Unit scenarios for Twilio Debugger payload normalization (no HTTP, no DB).
 * Run: npx tsx tests/test-twilio-debugger-normalize.ts
 */

import { normalizeTwilioDebuggerPost } from "../server/services/twilioDebuggerIngest.ts";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function main() {
  const samplePayload = {
    resource_sid: "CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    service_sid: null,
    error_code: "11200",
    more_info: {
      msg: "An attempt to retrieve content from https://example.com returned the HTTP status code 404",
      url: "https://example.com/hook",
    },
    webhook: {
      type: "application/json",
      request: {
        parameters: {
          CallSid: "CAbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          StreamSid: "MZcccccccccccccccccccccccccccccccc",
        },
      },
    },
  };

  const body = {
    AccountSid: "ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    Level: "ERROR",
    ParentAccountSid: "",
    Payload: JSON.stringify(samplePayload),
    PayloadType: "application/json",
    Sid: "NOdddddddddddddddddddddddddddddddd",
    Timestamp: "2020-01-01T23:28:54Z",
  };

  const n = normalizeTwilioDebuggerPost(body as Record<string, unknown>);
  assert(n.kind === "twilio_debugger_event", "kind");
  assert(n.eventSid === "NOdddddddddddddddddddddddddddddddd", "eventSid");
  assert(n.severity === "error", "severity from Level ERROR");
  assert(n.errorCode === "11200", "errorCode");
  assert(n.failureClassId === "webhook_failure", "failureClassId from hints (11200)");
  assert(n.callSid === "CAbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", "callSid from webhook params wins");
  assert(n.streamSid === "MZcccccccccccccccccccccccccccccccc", "streamSid");
  assert(n.summary != null && n.summary.includes("404"), "summary");
  assert(n.payloadWebhookUrl != null && n.payloadWebhookUrl.includes("example.com"), "payloadWebhookUrl");

  const minimal = normalizeTwilioDebuggerPost({});
  assert(minimal.kind === "twilio_debugger_event", "minimal kind");
  assert(minimal.eventSid == null, "minimal sid");
  assert(minimal.severity == null, "minimal severity");
  assert(minimal.failureClassId == null, "minimal failureClassId");

  const caResource = normalizeTwilioDebuggerPost({
    AccountSid: "ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    Level: "WARNING",
    Sid: "NOeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    Timestamp: "2021-01-01T00:00:00Z",
    Payload: JSON.stringify({
      resource_sid: "CAffffffffffffffffffffffffffffffff",
      error_code: "12100",
    }),
  });
  assert(caResource.callSid === "CAffffffffffffffffffffffffffffffff", "CA resource_sid → callSid");
  assert(caResource.severity === "warning", "WARNING → severity warning");
  assert(caResource.failureClassId === "webhook_failure", "12100 → webhook_failure");

  const unknownCode = normalizeTwilioDebuggerPost({
    Sid: "NOzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
    Payload: JSON.stringify({ error_code: "99999" }),
  });
  assert(unknownCode.failureClassId == null, "unmapped error_code → null failureClassId");

  console.log("✅ test-twilio-debugger-normalize: all scenarios passed");
}

main();
