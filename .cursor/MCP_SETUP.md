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

## 4. Other MCP servers (Google Workspace, Maps, etc.)

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

## 5. Verify

1. **Cursor:** Settings → MCP (or Features → MCP) and confirm your servers are listed and not in an error state.
2. In the agent/chat, try a Twilio-related request (e.g. “List my Twilio phone numbers”) and confirm the Twilio tool is offered and runs.

If a server still shows “No server info found,” check:

- The credential string in `args` is correct (Account SID / API Key SID : API Key Secret).
- Node/npx is on your PATH so `npx -y @twilio-alpha/mcp ...` can run.
- No typo in server name or `mcp.json` syntax (valid JSON, no trailing commas).

## 6. References

- [Cursor MCP docs](https://docs.cursor.com/context/mcp)
- [Twilio Alpha MCP](https://github.com/twilio-labs/mcp) — use `@twilio-alpha/mcp` and the credential format above
- [Twilio API keys](https://www.twilio.com/docs/iam/api-keys)
- [Deploy Key](./DEPLOY_KEY.md) — SSH deploy key for cursor agent GitHub access
- [Deploy Keys Reference](../docs/deployment/DEPLOY_KEYS.md) — Complete deploy keys documentation
