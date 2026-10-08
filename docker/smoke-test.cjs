// Run inside the production image with --network none; no real credentials are used.
const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const { once } = require('node:events');
const { existsSync } = require('node:fs');
const { createServer } = require('node:http');
const { setTimeout: delay } = require('node:timers/promises');

const tunnelId = 'tunnel_0123456789abcdef0123456789abcdef';
const testEnvironment = {
  ...process.env,
  BRING_EMAIL: 'docker-smoke@example.invalid',
  BRING_PASSWORD: 'dummy-password',
  CONTROL_PLANE_TUNNEL_ID: tunnelId,
  CONTROL_PLANE_API_KEY: 'dummy-runtime-key',
  LOG_LEVEL: 'warn',
};

async function main() {
  assert.notEqual(process.getuid(), 0, 'The container must run without root privileges');
  assert.equal(existsSync('/app/.env'), false, 'The image must not contain .env');
  assert.equal(existsSync('/app/build/tests'), false, 'The runtime must not contain compiled tests');

  for (const name of ['BRING_EMAIL', 'BRING_PASSWORD', 'CONTROL_PLANE_TUNNEL_ID', 'CONTROL_PLANE_API_KEY']) {
    const environment = { ...testEnvironment };
    delete environment[name];
    const result = spawnSync('bring-tunnel', ['run'], { env: environment, encoding: 'utf8', timeout: 5000 });
    assert.notEqual(result.status, 0, `Missing ${name} must stop startup`);
    assert.match(result.stderr, new RegExp(`${name} fehlt`));
  }

  const queued = [];
  const awaitingResponse = new Map();
  let sequence = 0;
  let serverFailure;
  const controlPlane = createServer(async (request, response) => {
    try {
      assert.equal(request.headers.authorization, 'Bearer dummy-runtime-key');
      const url = new URL(request.url, 'http://localhost');
      if (request.method === 'GET' && url.pathname === `/v1/tunnels/${tunnelId}`) {
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ id: tunnelId, name: 'Docker smoke test' }));
        return;
      }
      if (request.method === 'GET' && url.pathname === `/v1/tunnels/${tunnelId}/poll`) {
        const command = queued.shift();
        if (command) {
          response.writeHead(200, { 'Content-Type': 'application/json' });
          response.end(JSON.stringify({ commands: [command] }));
        } else {
          await delay(50);
          response.writeHead(204).end();
        }
        return;
      }
      assert.equal(request.method, 'POST', `Unexpected control-plane request: ${request.method} ${url.pathname}`);
      assert.equal(url.pathname, `/v1/tunnels/${tunnelId}/response`);
      assert.equal(request.headers['x-tunnel-shard-token'], 'dummy-shard-token');
      let body = '';
      for await (const chunk of request) body += chunk;
      const envelope = JSON.parse(body);
      assert.equal(envelope.channel, 'main');
      response.writeHead(200, { 'Content-Type': 'application/json' }).end('{}');
      if (envelope.resp_type !== 'jsonrpc_notify') {
        const waiter = awaitingResponse.get(envelope.request_id);
        assert.ok(waiter, `Unexpected response ${envelope.request_id}`);
        awaitingResponse.delete(envelope.request_id);
        waiter(envelope);
      }
    } catch (error) {
      serverFailure = error;
      response.writeHead(500).end();
    }
  });
  controlPlane.listen(0, '127.0.0.1');
  await once(controlPlane, 'listening');

  const client = spawn('bring-tunnel', ['run', '--control-plane.api-key=env:CONTROL_PLANE_API_KEY'], {
    env: {
      ...testEnvironment,
      CONTROL_PLANE_BASE_URL: `http://127.0.0.1:${controlPlane.address().port}`,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const exited = once(client, 'exit');
  let logs = '';
  for (const stream of [client.stdout, client.stderr]) {
    stream.on('data', (chunk) => {
      logs = (logs + chunk).slice(-12000);
    });
  }

  async function send(jsonrpc) {
    const requestId = `smoke-${++sequence}`;
    let timeout;
    try {
      const response = await new Promise((resolve, reject) => {
        timeout = setTimeout(() => reject(serverFailure ?? new Error(`Timed out: ${jsonrpc.method}\n${logs}`)), 10000);
        awaitingResponse.set(requestId, resolve);
        queued.push({
          request_id: requestId,
          shard_token: 'dummy-shard-token',
          command_type: 'jsonrpc',
          channel: 'main',
          created_at: new Date().toISOString(),
          response_timeout: '10s',
          jsonrpc: { jsonrpc: '2.0', ...jsonrpc },
        });
      });
      assert.equal(response.resp_code, 200);
      assert.equal(response.resp_json?.error, undefined);
      if (jsonrpc.id !== undefined) assert.equal(response.resp_json.id, jsonrpc.id);
      return response;
    } finally {
      clearTimeout(timeout);
      awaitingResponse.delete(requestId);
    }
  }

  try {
    const initialized = await send({
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-11-25',
        capabilities: {},
        clientInfo: { name: 'docker-smoke', version: '1.0.0' },
      },
    });
    assert.equal(initialized.resp_json.result.serverInfo.name, 'bring-mcp');
    assert.equal(initialized.resp_json.result.protocolVersion, '2025-11-25');
    const notification = await send({ method: 'notifications/initialized' });
    assert.equal(notification.resp_type, 'notify_ack');
    const discovery = await send({ id: 2, method: 'tools/list', params: {} });
    const tools = discovery.resp_json.result.tools;
    assert.equal(tools.length, 16);
    for (const name of ['loadLists', 'getItems', 'saveItem', 'getDefaultList']) {
      assert.ok(
        tools.some((tool) => tool.name === name),
        `Missing Bring! tool ${name}`,
      );
    }
    await send({ id: 3, method: 'ping' });

    for (const endpoint of ['healthz', 'readyz', 'ui']) {
      const response = await fetch(`http://127.0.0.1:8080/${endpoint}`, { signal: AbortSignal.timeout(3000) });
      assert.equal(response.status, 200, `${endpoint} must be available`);
      await response.arrayBuffer();
    }
    const healthcheck = spawnSync('node', ['/app/docker/healthcheck.cjs'], { timeout: 5000 });
    assert.equal(healthcheck.status, 0, 'The image healthcheck must report readiness');
    assert.equal(serverFailure, undefined);
    console.log(
      'PASS: configuration validation, real STDIO discovery of 16 tools, tunnel forwarding, and health endpoints',
    );
  } finally {
    client.kill('SIGTERM');
    let shutdownTimeout;
    try {
      const [code, signal] = await Promise.race([
        exited,
        new Promise((_, reject) => {
          shutdownTimeout = setTimeout(() => {
            client.kill('SIGKILL');
            reject(new Error(`Tunnel did not stop cleanly\n${logs}`));
          }, 5000);
        }),
      ]);
      assert.equal(code, 0, `Tunnel exit code: ${code}, signal: ${signal}\n${logs}`);
      console.log('PASS: graceful SIGTERM shutdown');
    } finally {
      clearTimeout(shutdownTimeout);
      controlPlane.closeAllConnections();
      await new Promise((resolve) => controlPlane.close(resolve));
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
