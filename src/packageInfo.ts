import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type PackageMetadata = {
  version?: unknown;
};

export function readPackageVersion(baseDirectory = __dirname): string {
  const candidates = [resolve(baseDirectory, '../../package.json'), resolve(baseDirectory, '../package.json')];

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    const metadata = JSON.parse(readFileSync(candidate, 'utf8')) as PackageMetadata;
    if (typeof metadata.version === 'string' && metadata.version.length > 0) {
      return metadata.version;
    }
  }

  throw new Error('Unable to determine the bring-mcp package version.');
}
