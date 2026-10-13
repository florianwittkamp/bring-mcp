# Bring! with Docker and OpenAI Secure MCP Tunnel

English | [Deutsch](docker-openai-tunnel.de.md)

This fork runs the locally built Bring! MCP server and the official OpenAI
tunnel client together in a Docker container. The tunnel client starts Bring!
as a STDIO subprocess. No public domain or inbound firewall rules are required.

## 1. Configure the integration

You need Docker with Compose. Node.js and `tunnel-client` are included in the
image and do not need to be installed on the host.

If you have not created `.env` yet, copy the template once:

```bash
cp .env.example .env
chmod 600 .env
```

Fill in these four values in `.env`:

| Variable                  | Value                                                 |
| ------------------------- | ----------------------------------------------------- |
| `BRING_EMAIL`             | Your Bring! account email address                     |
| `BRING_PASSWORD`          | Your Bring! account password                          |
| `CONTROL_PLANE_TUNNEL_ID` | Your OpenAI tunnel ID (`tunnel_…`)                    |
| `CONTROL_PLANE_API_KEY`   | An OpenAI runtime API key with Tunnels **Read + Use** |

Keep the single quotes around the values. This preserves special characters
such as `$` and `#`. If a value contains a single quote, escape it as `\'`
inside the value. Example using a fictitious password:
`BRING_PASSWORD='Example$#with\'Quote'`.

Create the tunnel in
[OpenAI Platform tunnel settings](https://platform.openai.com/settings/organization/tunnels).
Creating a tunnel requires Tunnels **Read + Manage**. The runtime key needs
**Read + Use** to run the client. Also associate the tunnel with the ChatGPT
workspace where you want to use Bring!.

`.env` stays local, is excluded from Git, and is not copied into the Docker
image. Changes to `.env` take effect when you recreate the container.

## 2. Start the container

Run these commands from the project directory:

```bash
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 -f bring-mcp
```

The local status UI is available at
[http://localhost:8090/ui](http://localhost:8090/ui). The published port is
bound to `127.0.0.1`. Change `TUNNEL_UI_PORT` in `.env` if port 8090 is already
in use. For a remote Docker host, you can access the status UI through SSH port
forwarding.

The healthcheck uses `/readyz`: `healthy` means the tunnel is ready. Bring!
authentication is checked when you first call a Bring! tool.

The container starts automatically after a host reboot if Docker is running.
Run only one active instance per tunnel ID. Stop the old instance before
moving the integration to another host.

## 3. Connect in ChatGPT

1. Enable developer mode in ChatGPT under **Settings → Security and login**.
   Your workspace must allow this feature.
2. Open [ChatGPT Plugins](https://chatgpt.com/plugins) and create a developer-mode
   app, for example "Bring! Shopping Lists".
3. Under **Connection**, choose **Tunnel** and select your tunnel or enter
   the `CONTROL_PLANE_TUNNEL_ID`.
4. Create the connection. ChatGPT should discover all 16 Bring! tools.
5. Enable the connection in a new chat and try:
   "Show my Bring! shopping lists."

Keep the container running during setup and use. If the tunnel does not
appear, check its workspace association and the Tunnels permissions in
OpenAI Platform.

## Operation and troubleshooting

After changing `.env`:

```bash
docker compose up -d --force-recreate
```

Check the configuration while the container is running:

```bash
docker compose exec bring-mcp tunnel-client doctor --explain
```

Stop the container:

```bash
docker compose down
```

If startup immediately fails with "… fehlt" (German for "… is missing"), one
of the four required fields is empty. If the container is running but reports
`unhealthy`, check the status UI and logs for an invalid tunnel ID, missing
permissions, or an unreachable OpenAI connection. The Docker host needs
outbound HTTPS access to OpenAI and the Bring! API.

## Image and local validation

The image builds this fork's source code with `npm ci` and starts
`node /app/build/src/index.js`. The tunnel client comes from the official
OpenAI image, version `v0.0.15`, pinned to an image digest. The official images
support Linux `amd64` and `arm64`. The container runs as an unprivileged user
with a read-only filesystem.

To update the tunnel client, check the
[official releases](https://github.com/openai/tunnel-client/releases/latest)
and update `TUNNEL_CLIENT_IMAGE` in the Dockerfile to a published version and
its matching digest. Then rebuild the image.

The following test uses only fictitious credentials and a local control-plane
server inside a container without network access:

```bash
docker compose build
docker run --rm -i --network none --read-only --tmpfs /tmp:mode=1777 \
  --cap-drop ALL --security-opt no-new-privileges:true \
  --entrypoint node bring-mcp:tunnel < docker/smoke-test.cjs
```

It checks real tunnel forwarding to the built STDIO server, discovery of all
16 tools, health endpoints, and graceful shutdown. It does not validate real
Bring! credentials or OpenAI permissions.

For more details, see the
[official Secure MCP Tunnel documentation](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)
and the
[tunnel client's Docker deployment guide](https://github.com/openai/tunnel-client/blob/v0.0.15/docs/deployment/docker.md).
