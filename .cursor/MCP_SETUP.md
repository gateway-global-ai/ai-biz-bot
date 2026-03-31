# Cursor MCP (Model Context Protocol) setup

This project uses MCP servers in Cursor (e.g. Twilio telephony). The errors **"No server info found"** and **"Server not yet created"** mean the MCP config is missing or the server failed to start (often due to missing credentials).

## 1. Where Cursor reads MCP config

- **Project (this repo):** `./.cursor/mcp.json` — used when you open this project in Cursor.
- **Global (all projects):**  
  - **macOS:** `~/.cursor/mcp.json`  
  - **Windows:** `%USERPROFILE%\.cursor\mcp.json`  
  - **Linux:** `~/.cursor/mcp.json`

Use **project** config so this repo’s MCPs are consistent for everyone; put secrets only in a config you don’t commit (see below).

## 2. Configure MCP (Twilio and others)

1. **Copy the example config (do not commit real credentials):**
   ```bash
   cp .cursor/mcp.example.json .cursor/mcp.json
   ```
2. **Edit `.cursor/mcp.json`** and replace placeholders with your values (see below).
3. **Restart Cursor** (or reload the window) so it picks up the new MCP config.

**Important:** `.cursor/mcp.json` is in `.gitignore`. Never commit real API keys or secrets. Use the example file as a template only.

## 3. Twilio MCP (fixing “No server info found” for user-twilio-telephony)

The Twilio Alpha MCP server must be started with a **credential string** in the third argument.

### Get credentials

1. **Account SID:** Twilio Console → Account Info → Account SID.
2. **API Key + Secret (recommended for MCP):**  
   Twilio Console → Account → API keys & tokens → Create API Key. You get a **SID** (key) and **Secret** (only shown once).

Format for the `args` entry:

```text
ACCOUNT_SID/API_KEY_SID:API_KEY_SECRET
```

Example (fake values):

```text
AC1234567890abcdef/SK1234567890abcdef:your_api_secret_here
```

### Option A: One Twilio server (full API)

In `.cursor/mcp.json`, under `mcpServers`, use one entry and put your credential string in the third element of `args`:

```json
"twilio": {
  "command": "npx",
  "args": [
    "-y",
    "@twilio-alpha/mcp",
    "ACxxxxxxxx/SKxxxxxxxx:your_api_secret"
  ]
}
```

### Option B: Scoped server (e.g. phone numbers only) – “user-twilio-telephony”

To limit tools (and avoid context overload), use `--services` and `--tags` and name the server e.g. `user-twilio-telephony`:

```json
"user-twilio-telephony": {
  "command": "npx",
  "args": [
    "-y",
    "@twilio-alpha/mcp",
    "ACxxxxxxxx/SKxxxxxxxx:your_api_secret",
    "--services",
    "twilio_api_v2010",
    "--tags",
    "Api20100401IncomingPhoneNumber"
  ]
}
```

Replace `ACxxxxxxxx/SKxxxxxxxx:your_api_secret` with your real credential string. After saving and restarting Cursor, the Twilio MCP should start and “No server info found” for that server should stop.

### Using environment variables for the credential

Cursor’s `mcp.json` does not expand environment variables inside `args`. To avoid pasting secrets into the file:

1. **Global config with env:** Put the Twilio server in `~/.cursor/mcp.json` and use the `env` block for other vars; the credential string itself still has to be in `args` in that file, or
2. **Wrapper script:** Create a small script that reads `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY`, `TWILIO_API_SECRET` from the environment, builds the string, and runs `npx -y @twilio-alpha/mcp "$CREDENTIAL_STRING"`. In `mcp.json`, set `command` to that script and no args with secrets.

## 4. SerpApi MCP (hosted remote server)

SerpApi provides a hosted MCP server at `https://mcp.serpapi.com/` that exposes Google Search, Maps, and other SerpApi endpoints as tools for Cursor agents.

### Prerequisites

- A SerpApi account and API key. Get one at [serpapi.com](https://serpapi.com/).
- Doppler configured for this project (see `docs/DOPPLER_SETUP.md`).

### Step 1 — Store the API key in Doppler

```bash
doppler secrets set SERP_API_KEY="your-serp-api-key-here"
```

Verify:

```bash
doppler secrets get SERP_API_KEY --plain
```

### Step 2 — Generate `.cursor/mcp.json` from Doppler

Run the provided helper script to write `.cursor/mcp.json` with your real API key injected at generation time. The file is gitignored, so no secrets are ever committed.

```bash
npm run mcp:generate
# or directly:
./scripts/gen-cursor-mcp.sh
```

This creates or updates `.cursor/mcp.json`, merging the `"serpapi"` block into any existing `mcpServers` entries (e.g. Twilio) without overwriting them:

```json
{
  "mcpServers": {
    "serpapi": {
      "url": "https://mcp.serpapi.com/mcp?api_key=<your-key-from-doppler>"
    }
  }
}
```

### Step 3 — Reload Cursor

Press `Cmd/Ctrl+Shift+P` → **Reload Window** (or restart Cursor). The SerpApi MCP should appear in **Settings → MCP** as connected.

### Option: manual placeholder (without Doppler)

If you prefer to manage the secret yourself, copy the example and replace the placeholder:

```bash
cp .cursor/mcp.example.json .cursor/mcp.json
# edit .cursor/mcp.json and replace YOUR_SERP_API_KEY with your real key
```

**Never commit the edited `mcp.json`** — it is gitignored for this reason.

## 4.1 — Shadcn MCP (component registries — **use stdio in Cursor**)

**Governance:** Design-time / operator / `ui_agent` only — not the Gemini voice hot path or customer runtime. See [`docs-governance/canonical/SHADCN_MCP_PLANE_BOUNDARY_V1.md`](../docs-governance/canonical/SHADCN_MCP_PLANE_BOUNDARY_V1.md). Runtime canvas uses registered views and `@/ui-core` promotion per `.cursor/skills/shadcn-ui-agent/SKILL.md`.

### Why not the `https://www.shadcn.io/api/mcp` URL?

[shadcn.io’s Cursor guide](https://www.shadcn.io/mcp/cursor) shows an HTTP `url` entry. **Cursor connects to URL-based MCPs with SSE.** That endpoint often responds with **HTTP 405 (Method Not Allowed)** during the SSE handshake, which shows in logs as:

`SSE error: Non-200 status code (405)`

So the remote URL is **not a reliable Cursor transport** today, even though it is documented on shadcn.io. shadcn.io also notes it is **not** affiliated with official [shadcn/ui](https://ui.shadcn.com/).

**Artifact:** scope + npm commands — [`SHADCN_IO_COMMUNITY_MIRROR_V1.md`](../docs-governance/artifacts/SHADCN_IO_COMMUNITY_MIRROR_V1.md). **Point Cursor at the local server:** `npm run cursor:mcp:shadcn-io` (merges the `shadcn-io` stdio block into `.cursor/mcp.json`; requires `jq`) or copy the `shadcn-io` entry from [`mcp.example.json`](mcp.example.json).

### Recommended for **shadcn.io** (this repo): local catalog MCP over **stdio**

The [react-shadcn-components](https://github.com/shadcnio/react-shadcn-components) README is an index of **www.shadcn.io** docs. This repo vendors that index as JSON and exposes it via a **small stdio MCP** (no remote SSE, no ui.shadcn.com dependency).

| Artifact | Purpose |
|----------|---------|
| [`registry-yaml/shadcn-io-catalog/component_index.v1.json`](../registry-yaml/shadcn-io-catalog/component_index.v1.json) | Frozen paths + install hints |
| [`scripts/shadcn-io-catalog-mcp.ts`](../scripts/shadcn-io-catalog-mcp.ts) | MCP server (`shadcn_io_list`, `shadcn_io_search`, `shadcn_io_get`, `shadcn_io_about`) |
| [`scripts/generate-shadcn-io-component-index.mjs`](../scripts/generate-shadcn-io-component-index.mjs) | Regenerate JSON when the upstream README changes |

Add under `mcpServers` (project `.cursor/mcp.json` or global `~/.cursor/mcp.json`):

```json
"shadcn-io": {
  "command": "npx",
  "args": ["tsx", "scripts/shadcn-io-catalog-mcp.ts"]
}
```

**cwd** must be the **repository root** (Cursor default when the MCP is project-scoped). Reload the window; enable **shadcn-io** under **Settings → MCP**.

**Tools:** ask the agent to call `shadcn_io_search` (e.g. query `panel`, `tool`, `conversation`) or `shadcn_io_get` with id `ai:panel`. Each entry includes a conventional `npx shadcn@latest add https://www.shadcn.io/r/<slug>.json` line — **confirm the recipe URL on the doc page** before installing.

### Optional: official [shadcn/ui MCP](https://ui.shadcn.com/docs/mcp) (`npx shadcn@latest mcp`)

Use a **separate** server name (e.g. `"shadcn-ui-official"`) if you also want the default **ui.shadcn.com** registry browser. That path is unrelated to the shadcn.io catalog above.

### If you still have a global `user-shadcn-io` using the HTTP URL

Remove `"url": "https://www.shadcn.io/api/mcp"` (405 / SSE) and use the **tsx** `shadcn-io-catalog-mcp.ts` block above; keep your preferred server name. Reload the window.

## 5. Other MCP servers (Google Workspace, Maps, etc.)

**Governance:** Google Workspace MCP is **operator/dev Google API access**, not product canvas or UI generation — see [`docs-governance/canonical/WORKSPACE_MCP_PLANE_BOUNDARY_V1.md`](../docs-governance/canonical/WORKSPACE_MCP_PLANE_BOUNDARY_V1.md). Do not route it into voice or customer runtime without a separate governed proxy and policy.

If you use more MCPs (e.g. Google Workspace, Maps), add them under `mcpServers` in the same `.cursor/mcp.json`:

```json
"mcpServers": {
  "twilio": { ... },
  "google-workspace": {
    "command": "npx",
    "args": ["-y", "@some/google-mcp-package"],
    "env": {
      "GOOGLE_CREDENTIALS_PATH": "/path/to/creds.json"
    }
  }
}
```

Each server needs a valid `command` and `args` (and `env` if required). If a server is listed but not configured (e.g. missing credentials), Cursor may show “No server info found” or “Server not yet created” for that server.

## 6. Verify

1. **Cursor:** Settings → MCP (or Features → MCP) and confirm your servers are listed and not in an error state.
2. In the agent/chat, try a Twilio-related request (e.g. “List my Twilio phone numbers”) and confirm the Twilio tool is offered and runs.

If a server still shows “No server info found,” check:

- The credential string in `args` is correct (Account SID / API Key SID : API Key Secret).
- Node/npx is on your PATH so `npx -y @twilio-alpha/mcp ...` can run.
- No typo in server name or `mcp.json` syntax (valid JSON, no trailing commas).

## 7. References

- [shadcnio/react-shadcn-components](https://github.com/shadcnio/react-shadcn-components) — README index mirrored in `registry-yaml/shadcn-io-catalog/`
- [shadcn.io MCP for Cursor (HTTP URL)](https://www.shadcn.io/mcp/cursor) — often **405** with Cursor SSE; use §4.1 catalog MCP instead
- [shadcn/ui MCP (official, stdio)](https://ui.shadcn.com/docs/mcp) — optional second server for ui.shadcn.com registry
- [Cursor MCP docs](https://docs.cursor.com/context/mcp)
- [Twilio Alpha MCP](https://github.com/twilio-labs/mcp) — use `@twilio-alpha/mcp` and the credential format above
- [Twilio API keys](https://www.twilio.com/docs/iam/api-keys)
- [SerpApi MCP server](https://mcp.serpapi.com/) — hosted MCP at `https://mcp.serpapi.com/`
- [SerpApi API keys](https://serpapi.com/manage-api-key) — manage your SerpApi key
- [Doppler docs](docs/DOPPLER_SETUP.md) — secrets management for this project
- [Deploy Key](./DEPLOY_KEY.md) — SSH deploy key for cursor agent GitHub access
- [Deploy Keys Reference](../docs/deployment/DEPLOY_KEYS.md) — Complete deploy keys documentation
