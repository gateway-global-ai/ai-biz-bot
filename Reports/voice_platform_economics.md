# voice.PlatformEconomics.ai — Twilio Studio MVP Repo

A ready-to-run skeleton for programmatically creating and publishing Twilio Studio Flows, attaching numbers, and standardizing IVR identity across platforms.

---

## Repository Structure
```
voice-platformeconomics-ai/
├─ README.md
├─ .env.example
├─ package.json
├─ pnpm-lock.yaml (optional)
├─ src/
│  ├─ config/
│  │  ├─ flow.rules.yaml
│  │  ├─ tenants.example.json
│  │  └─ schema/
│  │     ├─ business-profile.schema.json
│  │     └─ studio-definition.schema.json (reference-only link in README)
│  ├─ lib/
│  │  ├─ twilio-client.ts
│  │  ├─ registry.ts
│  │  ├─ flows.ts
│  │  ├─ numbers.ts
│  │  └─ ids.ts
│  ├─ examples/
│  │  ├─ business-profiles/
│  │  │  └─ boardwalk-suites-lafayette.json
│  │  └─ flows/
│  │     ├─ pe-hotel-ivr.json
│  │     ├─ pe-callback-capture.json
│  │     └─ pe-outbound-survey.json
│  ├─ scripts/
│  │  ├─ deploy-flow.ts
│  │  ├─ attach-number.ts
│  │  ├─ trigger-execution.ts
│  │  └─ seed-examples.ts
│  └─ cli.ts
├─ scripts/
│  ├─ deploy.sh
│  └─ verify.sh
└─ LICENSE
```

---

## .env.example
```
# Master account (or set subaccount creds per tenant)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token

# Optional: default caller id (must be a Twilio number in the same account)
DEFAULT_FROM=+12255550123

# Registry storage (local file for MVP)
REGISTRY_PATH=./tenants.registry.json
```

---

## src/config/flow.rules.yaml (authoring guardrails)
```yaml
naming:
  flow_prefix: "PE:"
  widget_prefix: "W_"
  commit_message_prefix: "PE-Deploy"
limits:
  max_widgets: 2000
  max_steps_per_widget: 10
  fail_on_warning: true
variables:
  required:
    - company.name
    - industry
  e164_enforce: true
publishing:
  require_published: true
  block_draft_attach_to_numbers: true
versioning:
  immutable_revisions: true
  tag_format: "ivrr_{ULID}"
safety:
  single_active_execution_per_contact: true
  conflict_policy: "end_then_retry"
```

---

## src/config/schema/business-profile.schema.json
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://voice.platformeconomics.ai/schema/business-profile.schema.json",
  "title": "BusinessProfile",
  "type": "object",
  "required": ["id", "name", "industry", "timezone", "assistants"],
  "properties": {
    "id": {"type":"string", "pattern":"^ivrpf_"},
    "name": {"type":"string"},
    "industry": {"type":"string"},
    "timezone": {"type":"string"},
    "integrations": {"type":"object", "additionalProperties": true},
    "routing": {"type":"object", "additionalProperties": true},
    "assistants": {
      "type": "array",
      "items": {
        "type":"object",
        "required":["id","role","locale"],
        "properties": {
          "id": {"type":"string", "pattern":"^ivra_"},
          "role": {"type":"string"},
          "locale": {"type":"string"},
          "policies": {"type":"object", "additionalProperties": true}
        }
      }
    }
  }
}
```

---

## src/examples/business-profiles/boardwalk-suites-lafayette.json
```json
{
  "id": "ivrpf_01J0MPEY6EJY6KZQ8B6ZK6VJRT",
  "name": "Boardwalk Suites Lafayette",
  "industry": "hospitality",
  "timezone": "America/Chicago",
  "integrations": {
    "googlePlaces": {"placeId": "ChIJxxxx"},
    "cloudbeds": {"propertyId": "12345"}
  },
  "routing": {
    "sales": "+12255550123",
    "support": "+12255550124",
    "emergencyForward": "+12255550125"
  },
  "assistants": [
    {
      "id": "ivra_01J0MPG6A7J4C0KQ6Q47N4XB9T",
      "role": "Front Desk IVR",
      "locale": "en-US",
      "policies": {"authRequiredFor:PMS": true}
    }
  ]
}
```

---

## src/examples/flows/pe-hotel-ivr.json (Studio Definition)
```json
{
  "description": "PE Base Hotel IVR",
  "states": [
    {
      "name": "Trigger",
      "type": "trigger",
      "transitions": [
        {"event": "incomingCall", "next": "MainMenu"},
        {"event": "incomingMessage", "next": "SmsRouter"},
        {"event": "restApi", "next": "MainMenu"}
      ]
    },
    {
      "name": "MainMenu",
      "type": "gather-input-on-call",
      "properties": {
        "say": "Welcome to {{company.name}}. Press 1 for reservations, 2 for front desk, 3 for billing.",
        "gather_language": "en-US",
        "num_digits": 1
      },
      "transitions": [
        {"event": "keypress", "conditions": [{"friendly_name": "Pressed 1", "arguments": ["1"]}], "next": "Reservations"},
        {"event": "keypress", "conditions": [{"friendly_name": "Pressed 2", "arguments": ["2"]}], "next": "FrontDesk"},
        {"event": "keypress", "conditions": [{"friendly_name": "Pressed 3", "arguments": ["3"]}], "next": "Billing"},
        {"event": "noInput", "next": "Voicemail"}
      ]
    },
    {"name": "Reservations", "type": "connect-call-to", "properties": {"to": "{{company.routing.sales}}"}},
    {"name": "FrontDesk", "type": "connect-call-to", "properties": {"to": "{{company.routing.support}}"}},
    {"name": "Billing", "type": "connect-call-to", "properties": {"to": "+12255550126"}},
    {"name": "Voicemail", "type": "record-voicemail", "properties": {"transcribe": true, "beep": true}},
    {"name": "SmsRouter", "type": "send-message", "properties": {"to": "{{contact.channel.address}}", "body": "Thanks for texting {{company.name}}. Reply 'RES' for reservations or 'HELP' for concierge."}}
  ],
  "initial_state": "Trigger",
  "flags": {"allow_concurrent_calls": true}
}
```

---

## src/examples/flows/pe-callback-capture.json
```json
{
  "description": "PE Callback Capture",
  "states": [
    {"name": "Trigger", "type": "trigger", "transitions": [{"event": "incomingCall", "next": "Gather"}, {"event": "restApi", "next": "Gather"}]},
    {"name": "Gather", "type": "gather-input-on-call", "properties": {"say": "Please enter your 10 digit callback number followed by the pound key.", "finish_on_key": "#", "num_digits": 10}, "transitions": [{"event": "keypress", "next": "Submit"}, {"event": "noInput", "next": "Hangup"}]},
    {"name": "Submit", "type": "make-http-request", "properties": {"method": "POST", "content_type": "application/json", "url": "https://voice.platformeconomics.ai/api/callbacks", "body": "{\"from\":\"{{trigger.call.From}}\",\"entered\":\"{{widgets.Gather.Digits}}\",\"tenant\":\"{{company.name}}\"}"}, "transitions": [{"event": "success", "next": "Confirm"}, {"event": "failed", "next": "Error"}]},
    {"name": "Confirm", "type": "say-play", "properties": {"say": "Thank you. We will call you back shortly."}},
    {"name": "Error", "type": "say-play", "properties": {"say": "Sorry, something went wrong."}},
    {"name": "Hangup", "type": "hang-up"}
  ],
  "initial_state": "Trigger"
}
```

---

## src/examples/flows/pe-outbound-survey.json
```json
{
  "description": "PE Outbound Survey (1-5)",
  "states": [
    {"name": "Trigger", "type": "trigger", "transitions": [{"event": "restApi", "next": "Intro"}]},
    {"name": "Intro", "type": "say-play", "properties": {"say": "We'd like your feedback on your recent stay. Please rate from one to five."}, "transitions": [{"event": "audioComplete", "next": "Gather"}]},
    {"name": "Gather", "type": "gather-input-on-call", "properties": {"num_digits": 1}, "transitions": [{"event": "keypress", "next": "Submit"}, {"event": "noInput", "next": "Hangup"}]},
    {"name": "Submit", "type": "make-http-request", "properties": {"method": "POST", "content_type": "application/json", "url": "https://voice.platformeconomics.ai/api/surveys", "body": "{\"score\":\"{{widgets.Gather.Digits}}\",\"to\":\"{{flow.data.to}}\",\"from\":\"{{flow.data.from}}\"}"}, "transitions": [{"event": "success", "next": "Thanks"}, {"event": "failed", "next": "Error"}]},
    {"name": "Thanks", "type": "say-play", "properties": {"say": "Thanks for your response."}},
    {"name": "Error", "type": "say-play", "properties": {"say": "We couldn't record your response, sorry."}},
    {"name": "Hangup", "type": "hang-up"}
  ],
  "initial_state": "Trigger"
}
```

---

## src/lib/ids.ts (ULID utilities & canonical IDs)
```ts
import { ulid } from "ulid";

export const newPlatformId = () => `ivrpf_${ulid()}`;
export const newAssistantId = () => `ivra_${ulid()}`;
export const newFlowId = () => `ivrf_${ulid()}`;
export const newNumberId = () => `ivrn_${ulid()}`;
export const newRevisionId = () => `ivrr_${ulid()}`;
```

---

## src/lib/twilio-client.ts
```ts
import twilio from "twilio";

export const createTwilioClient = (accountSid?: string, authToken?: string) => {
  const sid = accountSid || process.env.TWILIO_ACCOUNT_SID!;
  const token = authToken || process.env.TWILIO_AUTH_TOKEN!;
  return twilio(sid, token);
};
```

---

## src/lib/registry.ts (simple JSON file registry for MVP)
```ts
import fs from "node:fs";

const path = process.env.REGISTRY_PATH || "./tenants.registry.json";

type Entry = Record<string, any>;

export function readRegistry(): Entry {
  if (!fs.existsSync(path)) return {};
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

export function writeRegistry(data: Entry) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

export function upsert(pathKeys: string[], value: any) {
  const reg = readRegistry();
  let ref: any = reg;
  while (pathKeys.length > 1) {
    const k = pathKeys.shift()!;
    if (!ref[k]) ref[k] = {};
    ref = ref[k];
  }
  ref[pathKeys[0]] = value;
  writeRegistry(reg);
}
```

---

## src/lib/flows.ts (create / update / publish)
```ts
import { createTwilioClient } from "./twilio-client";

export async function upsertFlow({
  accountSid,
  authToken,
  friendlyName,
  definition,
  commitMessage = "PE-Deploy",
  status = "published"
}: {
  accountSid?: string;
  authToken?: string;
  friendlyName: string;
  definition: object;
  commitMessage?: string;
  status?: "draft" | "published";
}) {
  const client = createTwilioClient(accountSid, authToken);
  // Try to find an existing flow by friendlyName
  const found = await client.studio.v2.flows.list({
    limit: 20
  });
  const existing = found.find(f => f.friendlyName === friendlyName);

  if (!existing) {
    const created = await client.studio.v2.flows.create({
      friendlyName,
      status,
      definition,
      commitMessage
    });
    return created;
  }

  const updated = await client.studio.v2.flows(existing.sid).update({
    status,
    definition,
    commitMessage
  });
  return updated;
}
```

---

## src/lib/numbers.ts (attach number → flow webhook URL)
```ts
import { createTwilioClient } from "./twilio-client";

export async function setNumberVoiceUrl({
  accountSid,
  authToken,
  phoneNumberSid,
  voiceUrl
}: {
  accountSid?: string;
  authToken?: string;
  phoneNumberSid: string;
  voiceUrl: string;
}) {
  const client = createTwilioClient(accountSid, authToken);
  return client.incomingPhoneNumbers(phoneNumberSid).update({ voiceUrl });
}
```

---

## src/scripts/deploy-flow.ts
```ts
#!/usr/bin/env ts-node
import fs from "node:fs";
import path from "node:path";
import { upsertFlow } from "../lib/flows";

async function main() {
  const [,, flowPath, friendlyName = "PE: Flow"] = process.argv;
  if (!flowPath) throw new Error("Usage: deploy-flow <definition.json> [friendlyName]");
  const def = JSON.parse(fs.readFileSync(path.resolve(flowPath), "utf8"));
  const res = await upsertFlow({ friendlyName, definition: def, status: "published", commitMessage: `PE-Deploy: ${path.basename(flowPath)}` });
  console.log(JSON.stringify({ sid: res.sid, revision: res.revision, webhook: res.webhookUrl }, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
```

---

## src/scripts/attach-number.ts
```ts
#!/usr/bin/env ts-node
import { setNumberVoiceUrl } from "../lib/numbers";

async function main() {
  const [,, phoneSid, flowWebhookUrl] = process.argv;
  if (!phoneSid || !flowWebhookUrl) throw new Error("Usage: attach-number <PN_SID> <FLOW_WEBHOOK_URL>");
  const res = await setNumberVoiceUrl({ phoneNumberSid: phoneSid, voiceUrl: flowWebhookUrl });
  console.log(JSON.stringify({ phoneSid: res.sid, voiceUrl: res.voiceUrl }, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
```

---

## src/scripts/trigger-execution.ts
```ts
#!/usr/bin/env ts-node
import { createTwilioClient } from "../lib/twilio-client";

async function main() {
  const [,, flowSid, to, from] = process.argv;
  if (!flowSid || !to || !from) throw new Error("Usage: trigger-execution <FW_SID> <TO_E164> <FROM_E164>");
  const client = createTwilioClient();
  try {
    const exec = await client.studio.v2.flows(flowSid).executions.create({ to, from });
    console.log(JSON.stringify({ executionSid: exec.sid, status: exec.status }, null, 2));
  } catch (e: any) {
    if (e.status === 409) {
      console.error("Conflict: Existing active execution. End it, then retry.");
    }
    throw e;
  }
}

main().catch(err => { console.error(err); process.exit(1); });
```

---

## scripts/deploy.sh (bash one-liners using REST/CLI)
```bash
#!/usr/bin/env bash
set -euo pipefail

FLOW_JSON=${1:-"src/examples/flows/pe-hotel-ivr.json"}
FRIENDLY_NAME=${2:-"PE: Hotel IVR"}

# Create/Update & publish via REST (curl)
FLOW_RESP=$(curl -s -X POST "https://studio.twilio.com/v2/Flows" \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
  --data-urlencode "FriendlyName=$FRIENDLY_NAME" \
  --data-urlencode "Status=published" \
  --data-urlencode "Definition=$(cat "$FLOW_JSON")" || true)

# If already exists, update instead (fallback via CLI)
if echo "$FLOW_RESP" | grep -q 'already exists'; then
  SID=$(twilio api:studio:v2:flows:list --limit 50 | awk -v n="$FRIENDLY_NAME" '$0 ~ n {print $1; exit}')
  twilio api:studio:v2:flows:update --sid "$SID" --status published --definition @"$FLOW_JSON" --commit-message "PE-Deploy: $(basename "$FLOW_JSON")"
  echo "Updated Flow $SID"
else
  echo "$FLOW_RESP"
fi
```

---

## scripts/verify.sh (lint/check fast-fail)
```bash
#!/usr/bin/env bash
set -euo pipefail

jq empty src/examples/flows/*.json
jq empty src/examples/business-profiles/*.json

# simple schema spot-checks could be added with ajv / spectrums
```

---

## src/cli.ts (single entrypoint for ops)
```ts
#!/usr/bin/env ts-node
import { hideBin } from "yargs/helpers";
import yargs from "yargs";
import { upsertFlow } from "./lib/flows";
import { setNumberVoiceUrl } from "./lib/numbers";

const cli = yargs(hideBin(process.argv));

cli
  .command('deploy <json> [name]', 'Deploy & publish a Studio Flow', (y) => y
    .positional('json', { type: 'string', demandOption: true })
    .positional('name', { type: 'string', default: 'PE: Flow' }),
  async (argv) => {
    const def = require(require('path').resolve(String(argv.json)));
    const res = await upsertFlow({ friendlyName: String(argv.name), definition: def, status: 'published', commitMessage: `PE-Deploy: ${argv.json}` });
    console.log({ sid: res.sid, revision: res.revision, webhook: (res as any).webhookUrl });
  })
  .command('attach <pn> <webhook>', 'Attach phone number to Flow webhook', (y) => y
    .positional('pn', { type: 'string', demandOption: true })
    .positional('webhook', { type: 'string', demandOption: true }),
  async (argv) => {
    const res = await setNumberVoiceUrl({ phoneNumberSid: String(argv.pn), voiceUrl: String(argv.webhook) });
    console.log({ pn: res.sid, voiceUrl: res.voiceUrl });
  })
  .command('exec <flow> <to> <from>', 'Trigger an outbound execution', (y) => y
    .positional('flow', { type: 'string', demandOption: true })
    .positional('to', { type: 'string', demandOption: true })
    .positional('from', { type: 'string', demandOption: true }),
  async (argv) => {
    const client = require('./lib/twilio-client').createTwilioClient();
    const exec = await client.studio.v2.flows(String(argv.flow)).executions.create({ to: String(argv.to), from: String(argv.from) });
    console.log({ executionSid: exec.sid, status: exec.status });
  })
  .demandCommand(1)
  .strict()
  .help()
  .parse();
```

---

## README.md (how to run)
```md
# voice.PlatformEconomics.ai — Twilio Studio MVP

## Quick Start

1. **Install deps**
```bash
pnpm i
# or npm i / yarn
```

2. **Env**
```bash
cp .env.example .env
# fill TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, DEFAULT_FROM
```

3. **Deploy an example Flow**
```bash
pnpm ts-node src/scripts/deploy-flow.ts src/examples/flows/pe-hotel-ivr.json "PE: Hotel IVR"
# output includes Flow SID & webhook URL
```

4. **Attach a number**
```bash
# Replace with your PN SID & webhook URL from previous step
pnpm ts-node src/scripts/attach-number.ts PNXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX https://webhooks.twilio.com/v1/Accounts/AC…/Flows/FW…
```

5. **Trigger an outbound execution (optional)**
```bash
pnpm ts-node src/scripts/trigger-execution.ts FWXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX +12255551212 $DEFAULT_FROM
```

## Tenants & IDs
- Canonical IDs: `ivrpf_` (platform), `ivra_` (assistant), `ivrf_` (flow), `ivrn_` (number), `ivrr_` (revision)
- Maintain a registry mapping your IDs ↔ Twilio SIDs per environment (dev/stage/prod).

## Authoring Rules
- See `src/config/flow.rules.yaml` for guardrails (publish-only in prod, E.164, commit messages, etc.).

## White-Label Editing
- Fetch Flow `definition` via API, present a JSON editor/UI, validate against schema, then publish with a `commitMessage`. Update number voice URLs programmatically.

## Notes
- Always use E.164 for phone numbers.
- Handle 409 conflicts on executions by ending the prior execution, then retrying.
```

---

## package.json (minimal)
```json
{
  "name": "voice-platformeconomics-ai",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "deploy": "ts-node src/scripts/deploy-flow.ts",
    "attach": "ts-node src/scripts/attach-number.ts",
    "exec": "ts-node src/scripts/trigger-execution.ts",
    "cli": "ts-node src/cli.ts"
  },
  "dependencies": {
    "twilio": "^5.2.0",
    "ulid": "^2.3.0",
    "yargs": "^17.7.2"
  },
  "devDependencies": {
    "ts-node": "^10.9.2",
    "typescript": "^5.6.3"
  }
}
```

---

## Next Steps
- [ ] Drop in your real `business-profiles/*.json` per tenant.
- [ ] Extend `flows.ts` to embed `ivrr_*` in `commitMessage`, persist returned `revision` into your registry.
- [ ] Add AJV validation against `business-profile.schema.json` and Twilio’s Studio Definition schema.
- [ ] Wire your MCP server to compile higher-level YAML spec → Studio `definition` JSON.
- [ ] Add a small React editor for white-label Flow editing (optional for MVP).

