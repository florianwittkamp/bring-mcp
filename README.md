# MCP Server for Bring! Shopping

Implements a Model Context Protocol (MCP) server in TypeScript exposing the Bring! shopping list API. Now supports **both stdio (Claude Desktop)** and **Streamable HTTP (Grok remote MCP)**.

## Key Changes in v0.10.0
- Added HTTP transport using `StreamableHTTPServerTransport` + Express
- Auto-detects HTTP mode via `--http` flag or `PORT`/`MCP_PORT` env var
- Stateless per-request server creation for HTTP (safe with shared BringClient)
- Endpoint: `POST /mcp`

## Usage

### STDIO (default, for Claude)
```bash
node build/src/index.js
# or via npx in claude_desktop_config.json (see previous instructions)
```

### HTTP (for Grok)
```bash
node build/src/index.js --http
# or with port
PORT=3000 node build/src/index.js --http
```

Server logs: `MCP server for Bring! API is running on HTTP port XXX`

**For Grok Remote MCP**:
- Deploy server publicly (Railway/Render/etc) with `MAIL` + `PW` env vars
- server_url: `https://your-app.com`
- server_label: `bring`
- Grok will expose tools like `bring__loadLists`, `bring__saveItem` etc.

**Security**: Protect your deployed endpoint (private deploy, tunnel, or add auth middleware).

## Env Vars
- `MAIL`, `PW` (required)
- `PORT`, `MCP_PORT`, `HTTP_PORT` (optional, enable HTTP mode)

Full original stdio instructions and tool list preserved from v0.9.x. See git history or previous README for details.

MIT License
