# MCP Server for Bring! Shopping

Implements a Model Context Protocol (MCP) server in TypeScript exposing the Bring! shopping list API.

**Now supports:**
- **STDIO** (default) — for local Claude Desktop / Cursor
- **Streamable HTTP** — for remote clients like **Grok**
- **Optional Scalekit OAuth 2.1 protection** — production-grade authentication for remote deployments

## Quick Start

### STDIO Mode (Claude Desktop - recommended for local)
Use via `npx` in `claude_desktop_config.json` (see previous versions or full history for exact JSON).

Or locally:
```bash
npm run build
node build/src/index.js
```

### HTTP Mode (for Grok / remote)
```bash
node build/src/index.js --http
# or via PORT env (auto-enables HTTP)
PORT=3000 node build/src/index.js
```

MCP endpoint: `POST /mcp`

## Secure Remote Deployment with Scalekit OAuth 2.1 (Recommended)

Exposing an HTTP MCP server publicly requires strong authentication. This server integrates **Scalekit's drop-in OAuth 2.1** solution (the recommended standard for MCP servers).

### Setup Steps

1. **Create a free Scalekit account** at [https://www.scalekit.com](https://www.scalekit.com) or [auth.scalekit.com](https://auth.scalekit.com).

2. **Register your MCP server** in the Scalekit dashboard:
   - Go to **MCP Servers** → Add new server
   - Set **Server URL** to your public base URL (e.g. `https://your-bring-mcp.railway.app/` — include trailing slash if prompted)
   - Save and note the **OAuth Protected Resource Metadata** JSON provided.

3. **Configure environment variables** (in your deploy platform or `.env`):
   ```env
   MAIL=your_bring_email@example.com
   PW=your_bring_password
   PORT=3000   # or whatever your platform provides

   # Scalekit OAuth (copy from dashboard)
   SK_ENV_URL=https://<your-env>.scalekit.com
   SK_CLIENT_ID=sk_...
   SK_CLIENT_SECRET=sk_...
   PROTECTED_RESOURCE_METADATA='{"resource":"https://your-app.com/", ...}'   # Paste the full JSON here
   EXPECTED_AUDIENCE=https://your-app.com/
   ```

4. **Deploy** your server (Railway, Render, Fly.io, etc.). The server auto-enables OAuth when the Scalekit vars are present.

5. **In Grok (or other MCP clients)**:
   - Add Remote MCP server
   - `server_url`: `https://your-app.com` (Grok will discover metadata and use `/mcp`)
   - `server_label`: `bring`
   - The client will handle the OAuth login flow / token acquisition via Scalekit.

### How it works
- Public endpoints: `/.well-known/oauth-protected-resource` (metadata for discovery) and `/health`
- All requests to `POST /mcp` require a valid `Authorization: Bearer <token>` header
- Tokens are validated live against Scalekit using audience check
- On 401, server returns proper `WWW-Authenticate` header pointing to the metadata

This follows the official MCP + OAuth 2.1 spec and Scalekit's Express.js quickstart pattern.

**Security benefit**: Prevents unauthorized access to your Bring! account via the MCP tools when the server is exposed remotely.

## Environment Variables

| Variable                      | Required for | Description                                      |
|-------------------------------|--------------|--------------------------------------------------|
| `MAIL`, `PW`                  | Always       | Bring! credentials                               |
| `PORT` / `MCP_PORT`           | HTTP mode    | Server port (enables HTTP if set)                |
| `SK_ENV_URL`                  | OAuth        | Your Scalekit environment URL                    |
| `SK_CLIENT_ID`, `SK_CLIENT_SECRET` | OAuth   | Scalekit app credentials                         |
| `PROTECTED_RESOURCE_METADATA` | OAuth        | JSON string copied from Scalekit dashboard       |
| `EXPECTED_AUDIENCE`           | OAuth        | Audience for token validation (usually base URL) |

Without Scalekit vars, HTTP mode runs **unprotected** (fine for localhost testing).

## Available Tools
All Bring! tools (`loadLists`, `saveItem`, `getItems`, batch operations, images, users, catalog...) are available in both stdio and HTTP modes.

## Development
```bash
npm install
npm run build
npm test
```

## Credits & License
Original stdio implementation + HTTP transport by André Karrlein.
OAuth 2.1 Scalekit integration added following official Scalekit MCP Express quickstart.

MIT License
