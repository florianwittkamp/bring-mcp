#!/usr/bin/env node

import 'dotenv/config';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { BringClient } from './bringClient.js';
import { readPackageVersion } from './packageInfo.js';
import { createBringServer } from './server.js';

export type BringCredentials = {
  email: string;
  password: string;
  usesLegacyNames: boolean;
};

export function resolveCredentials(environment: NodeJS.ProcessEnv = process.env): BringCredentials {
  const email = environment.BRING_EMAIL ?? environment.MAIL;
  const password = environment.BRING_PASSWORD ?? environment.PW;

  if (!email || !password) {
    throw new Error(
      'Missing BRING_EMAIL or BRING_PASSWORD environment variables. Please provide your Bring! credentials through the environment or a .env file.',
    );
  }

  return {
    email,
    password,
    usesLegacyNames: !environment.BRING_EMAIL || !environment.BRING_PASSWORD,
  };
}

export function main(): void {
  const credentials = resolveCredentials();
  if (credentials.usesLegacyNames) {
    console.error(
      'Deprecation warning: MAIL and PW are legacy aliases. Please migrate to BRING_EMAIL and BRING_PASSWORD.',
    );
  }

  const version = readPackageVersion();
  serveStdio(() => createBringServer(new BringClient(credentials.email, credentials.password), version), {
    legacy: 'serve',
    onerror: (error) => console.error('MCP transport error:', error),
  });
  console.error(`MCP server for Bring! API v${version} is running on STDIO`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('Fatal error starting MCP server:', error);
    process.exitCode = 1;
  }
}
